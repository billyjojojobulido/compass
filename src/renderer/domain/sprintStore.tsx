import React, { createContext, useContext, useMemo, useReducer } from 'react';
import type { Epic, SprintEvent, SprintState, Task } from './types';
import { PersistedSprintDoc } from '@/domain/types';

function isPersistedSprintDocV1(x: any): x is PersistedSprintDoc {
  return (
    x && x.schemaVersion === 1 && x.state && typeof x.generatedAt === 'string'
  );
}

function createDebouncer(ms: number) {
  let t: any = null;
  return (fn: () => void) => {
    if (t) clearTimeout(t);
    t = setTimeout(fn, ms);
  };
}

export function nowISO() {
  return new Date().toISOString();
}
function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type Actions = ReturnType<typeof createActions>;

type SprintContextValue = {
  state: SprintState;
  actions: Actions;
};

const SprintContext = createContext<SprintContextValue | null>(null);

export function SprintProvider({
  initialState,
  children,
}: {
  initialState: SprintState;
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const actions = useMemo(() => createActions(state, dispatch), [state]);
  // add debounce
  const debouncedSave = React.useMemo(() => createDebouncer(800), []);
  const didHydrateRef = React.useRef(false);

  React.useEffect(() => {
    // hydrate once
    (async () => {
      const raw = await window.compass.sprint.stateRead();
      if (!raw) {
        didHydrateRef.current = true;
        return;
      }

      if (!isPersistedSprintDocV1(raw)) {
        console.warn(
          '[SprintStore] persisted state has unknown format, ignored.',
        );
        didHydrateRef.current = true;
        return;
      }

      // merge strategy:
      // - keep runtime config as source of truth for now
      // - but allow persisted state to bring epics/tasks/order/etc.
      // can do merge config here, if users are allowed to edit config in future build
      const next: SprintState = {
        ...raw.state,
        config: state.config, // overrdie using runtime-config - stable
      };

      dispatch({ type: 'HYDRATE', payload: next });
      didHydrateRef.current = true;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only once

  React.useEffect(() => {
    // baocheng notes: this is critically important!
    // to avoid override file with default state befroe hydrate
    if (!didHydrateRef.current) return;

    debouncedSave(() => {
      const doc: PersistedSprintDoc = {
        schemaVersion: 1,
        generatedAt: nowISO(),
        state, // incl config
      };

      window.compass.sprint
        .stateWrite(doc)
        .catch((e) => console.error('[SprintStore] save failed', e));
    });
  }, [state, debouncedSave]);

  return (
    <SprintContext.Provider value={{ state, actions }}>
      {children}
    </SprintContext.Provider>
  );
}

export function useSprint() {
  const ctx = useContext(SprintContext);
  if (!ctx) throw new Error('useSprint must be used within SprintProvider');
  return ctx;
}

/** ---------- reducer + action types ---------- */

type DispatchAction =
  | { type: 'EPIC_CREATE'; epic: Epic; event: SprintEvent }
  | {
      type: 'EPIC_UPDATE';
      epicId: string;
      patch: Partial<Epic>;
      event: SprintEvent;
    }
  | { type: 'EPIC_DELETE'; epicId: string; event: SprintEvent }
  | { type: 'TASK_CREATE'; task: Task; event: SprintEvent }
  | {
      type: 'TASK_UPDATE';
      taskId: string;
      patch: Partial<Task>;
      event: SprintEvent;
      meta?: { autoCloseBottom?: boolean };
    }
  | { type: 'TASK_DELETE'; taskId: string; event: SprintEvent }
  | {
      type: 'TASK_MOVE';
      taskId: string;
      fromEpicId: string;
      toEpicId: string;
      toIndex: number;
      event: SprintEvent;
    }
  | {
      type: 'TASK_REORDER';
      taskId: string;
      epicId: string;
      toIndex: number;
      event: SprintEvent;
    }
  | {
      type: 'TASK_PREVIEW_MOVE';
      taskId: string;
      fromEpicId: string;
      toEpicId: string;
      toIndex: number;
    }
  | { type: 'UI_SCROLL_TO_EPIC'; epicId: string | null }
  | { type: 'HYDRATE'; payload: SprintState };

function reducer(state: SprintState, a: DispatchAction): SprintState {
  switch (a.type) {
    case 'EPIC_CREATE': {
      return {
        ...state,
        epics: [...state.epics, a.epic],
        events: [...state.events, a.event],
      };
    }
    case 'EPIC_UPDATE': {
      return {
        ...state,
        epics: state.epics.map((e) =>
          e.id === a.epicId ? { ...e, ...a.patch } : e,
        ),
        events: [...state.events, a.event],
      };
    }
    case 'EPIC_DELETE': {
      const epicId = a.epicId;
      const order = state.taskOrderByEpic[epicId] ?? [];
      const tasksById = { ...state.tasksById };
      for (const tid of order) delete tasksById[tid];

      const taskOrderByEpic = { ...state.taskOrderByEpic };
      delete taskOrderByEpic[epicId];

      return {
        ...state,
        epics: state.epics.filter((e) => e.id !== epicId),
        tasksById,
        taskOrderByEpic,
        events: [...state.events, a.event],
      };
    }
    case 'TASK_CREATE': {
      const t = a.task;
      const list = [...(state.taskOrderByEpic[t.epicId] ?? [])].filter(
        (x) => x !== t.id,
      );
      list.push(t.id);
      return {
        ...state,
        tasksById: { ...state.tasksById, [t.id]: t },
        taskOrderByEpic: { ...state.taskOrderByEpic, [t.epicId]: list },
        events: [...state.events, a.event],
      };
    }
    case 'TASK_UPDATE': {
      const prev = state.tasksById[a.taskId];
      if (!prev) return state;
      const next: Task = { ...prev, ...a.patch };

      let taskOrderByEpic = state.taskOrderByEpic;

      // epic change: remove from old list, append to new list
      if (next.epicId !== prev.epicId) {
        const fromList = [...(taskOrderByEpic[prev.epicId] ?? [])].filter(
          (x) => x !== next.id,
        );
        const toList = [...(taskOrderByEpic[next.epicId] ?? [])].filter(
          (x) => x !== next.id,
        );
        toList.push(next.id);
        taskOrderByEpic = {
          ...taskOrderByEpic,
          [prev.epicId]: fromList,
          [next.epicId]: toList,
        };
      }

      // auto close bottom (optional)
      if (a.meta?.autoCloseBottom) {
        const list = [...(taskOrderByEpic[next.epicId] ?? [])].filter(
          (x) => x !== next.id,
        );
        list.push(next.id);
        taskOrderByEpic = { ...taskOrderByEpic, [next.epicId]: list };
      }

      return {
        ...state,
        tasksById: { ...state.tasksById, [next.id]: next },
        taskOrderByEpic,
        events: [...state.events, a.event],
      };
    }
    case 'TASK_DELETE': {
      const prev = state.tasksById[a.taskId];
      if (!prev) return state;
      const list = [...(state.taskOrderByEpic[prev.epicId] ?? [])].filter(
        (x) => x !== prev.id,
      );
      const tasksById = { ...state.tasksById };
      delete tasksById[prev.id];
      return {
        ...state,
        tasksById,
        taskOrderByEpic: { ...state.taskOrderByEpic, [prev.epicId]: list },
        events: [...state.events, a.event],
      };
    }
    case 'TASK_MOVE': {
      const prev = state.tasksById[a.taskId];
      if (!prev) return state;

      const fromList = [...(state.taskOrderByEpic[a.fromEpicId] ?? [])].filter(
        (x) => x !== a.taskId,
      );
      const toListRaw = [...(state.taskOrderByEpic[a.toEpicId] ?? [])].filter(
        (x) => x !== a.taskId,
      );
      const idx = Math.max(0, Math.min(a.toIndex, toListRaw.length));
      toListRaw.splice(idx, 0, a.taskId);

      return {
        ...state,
        tasksById: {
          ...state.tasksById,
          [a.taskId]: { ...prev, epicId: a.toEpicId },
        },
        taskOrderByEpic: {
          ...state.taskOrderByEpic,
          [a.fromEpicId]: fromList,
          [a.toEpicId]: toListRaw,
        },
        events: [...state.events, a.event],
      };
    }
    case 'TASK_REORDER': {
      const listRaw = [...(state.taskOrderByEpic[a.epicId] ?? [])].filter(
        (x) => x !== a.taskId,
      );
      const idx = Math.max(0, Math.min(a.toIndex, listRaw.length));
      listRaw.splice(idx, 0, a.taskId);
      return {
        ...state,
        taskOrderByEpic: { ...state.taskOrderByEpic, [a.epicId]: listRaw },
        events: [...state.events, a.event],
      };
    }
    case 'TASK_PREVIEW_MOVE': {
      const prev = state.tasksById[a.taskId];
      if (!prev) return state;

      // remove from 'from' list
      const fromList = [...(state.taskOrderByEpic[a.fromEpicId] ?? [])].filter(
        (x) => x !== a.taskId,
      );

      // insert into 'to' list (remove before insert to avoid duplicate)
      const toList = [...(state.taskOrderByEpic[a.toEpicId] ?? [])].filter(
        (x) => x !== a.taskId,
      );

      const idx = Math.max(0, Math.min(a.toIndex, toList.length));
      toList.splice(idx, 0, a.taskId);

      return {
        ...state,
        tasksById: {
          ...state.tasksById,
          [a.taskId]: { ...prev, epicId: a.toEpicId },
        },
        taskOrderByEpic: {
          ...state.taskOrderByEpic,
          [a.fromEpicId]: fromList,
          [a.toEpicId]: toList,
        },
      };
    }
    case 'UI_SCROLL_TO_EPIC':
      return {
        ...state,
        ui: { ...(state.ui ?? {}), scrollToEpicId: a.epicId },
      };
    case 'HYDRATE':
      return a.payload;
    default:
      return state;
  }
}

/** ---------- actions (domain operations) ---------- */

function createActions(
  state: SprintState,
  dispatch: React.Dispatch<DispatchAction>,
) {
  const statusMap = new Map(state.config.statuses.map((s) => [s.id, s]));
  const isClosedStatus = (statusId: string) =>
    statusMap.get(statusId)?.toClose === true;

  function emit(base: Omit<SprintEvent, 'id' | 'ts'>): SprintEvent {
    return { ...base, id: uid(), ts: nowISO() };
  }

  return {
    isClosedStatus,

    createEpic(input: {
      id: string;
      title: string;
      priorityId: string;
      statusId: string;
      pinned?: boolean;
    }) {
      const epic: Epic = {
        id: input.id,
        title: input.title,
        priorityId: input.priorityId,
        statusId: input.statusId,
        pinned: input.pinned,
      };
      const event = emit({
        entity: { type: 'epic', id: epic.id },
        action: 'create',
        diff: { after: epic as any },
      });
      dispatch({ type: 'EPIC_CREATE', epic, event });
    },

    updateEpic(epicId: string, patch: Partial<Epic>) {
      const prev = state.epics.find((e) => e.id === epicId);
      if (!prev) return;
      const after = { ...prev, ...patch };
      const event = emit({
        entity: { type: 'epic', id: epicId },
        action: 'update',
        diff: { before: prev as any, after: after as any },
      });
      dispatch({ type: 'EPIC_UPDATE', epicId, patch, event });
    },

    deleteEpic(epicId: string) {
      const prev = state.epics.find((e) => e.id === epicId);
      const event = emit({
        entity: { type: 'epic', id: epicId },
        action: 'delete',
        diff: { before: prev as any },
        meta: { removedTasks: (state.taskOrderByEpic[epicId] ?? []).length },
      });
      dispatch({ type: 'EPIC_DELETE', epicId, event });
    },

    createTask(input: Task) {
      const event = emit({
        entity: { type: 'task', id: input.id },
        action: 'create',
        diff: { after: input as any },
      });
      dispatch({ type: 'TASK_CREATE', task: input, event });
    },

    updateTask(taskId: string, patch: Partial<Task>) {
      const prev = state.tasksById[taskId];
      if (!prev) return;
      const next = { ...prev, ...patch };

      // if state move to closed
      // auto sinks to bottom:: only do reorder in reducer
      const prevClosed = isClosedStatus(prev.statusId);
      const nextClosed = isClosedStatus(next.statusId);
      const autoCloseBottom = prevClosed !== nextClosed && nextClosed;

      const event = emit({
        entity: { type: 'task', id: taskId },
        action: 'update',
        diff: { before: prev as any, after: next as any },
        meta: autoCloseBottom ? { reason: 'auto-close-bottom' } : undefined,
      });

      dispatch({
        type: 'TASK_UPDATE',
        taskId,
        patch,
        event,
        meta: { autoCloseBottom },
      });
    },

    deleteTask(taskId: string) {
      const prev = state.tasksById[taskId];
      const event = emit({
        entity: { type: 'task', id: taskId },
        action: 'delete',
        diff: { before: prev as any },
      });
      dispatch({ type: 'TASK_DELETE', taskId, event });
    },

    moveTask(args: {
      taskId: string;
      fromEpicId: string;
      toEpicId: string;
      toIndex: number;
    }) {
      const event = emit({
        entity: { type: 'task', id: args.taskId },
        action: 'move',
        meta: { ...args, reason: 'user-dnd' },
      });
      dispatch({ type: 'TASK_MOVE', ...args, event });
    },

    reorderTask(args: {
      taskId: string;
      epicId: string;
      toIndex: number;
      fromIndex?: number;
    }) {
      const event = emit({
        entity: { type: 'task', id: args.taskId },
        action: 'reorder',
        meta: { ...args, reason: 'user-dnd' },
      });
      dispatch({
        type: 'TASK_REORDER',
        taskId: args.taskId,
        epicId: args.epicId,
        toIndex: args.toIndex,
        event,
      });
    },

    previewMoveTask(args: {
      taskId: string;
      fromEpicId: string;
      toEpicId: string;
      toIndex: number;
    }) {
      dispatch({ type: 'TASK_PREVIEW_MOVE', ...args });
    },
    // [priorityView] scroll to epic id
    requestScrollToEpic(epicId: string) {
      dispatch({ type: 'UI_SCROLL_TO_EPIC', epicId });
    },

    clearScrollToEpic() {
      dispatch({ type: 'UI_SCROLL_TO_EPIC', epicId: null });
    },
  };
}
