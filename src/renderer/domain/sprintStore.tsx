import React, { createContext, useContext, useMemo, useReducer } from 'react';
import type {
  Epic,
  SprintEvent,
  SprintState,
  Task,
  PersistedSprintDoc,
  SprintConfig,
} from '@/domain/types';
import type { SprintEventV2 } from '@/domain/events/sprintEventV2';
import { applyEventV2 } from '@/domain/events/applyEventV2';

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
  const [state, baseDispatch] = useReducer(reducer, initialState);

  const appendChainRef = React.useRef<Promise<void>>(Promise.resolve());

  const appendEvent = React.useCallback((ev: SprintEventV2) => {
    appendChainRef.current = appendChainRef.current
      .then(async () => {
        await window.compass.sprint.events.append(ev);
      })
      .catch((e) => {
        console.error('[SprintStore] append event failed', e);
        // baocheng notes: don't throw anything, or the chain might break
      });
  }, []);

  /*
    override the dispatch with a wrapper layer: update state first, then append event
  */
  const dispatch = React.useCallback(
    (action: any) => {
      baseDispatch(action);
      if (action?.event) appendEvent(action.event);
    },
    [appendEvent],
  );

  const actions = useMemo(
    () => createActions(state, dispatch),
    [state, dispatch],
  );
  // add debounce
  const debouncedSave = React.useMemo(() => createDebouncer(800), []);
  const didHydrateRef = React.useRef(false);

  /*
    Hydrate: state (optional:: read events by the way)
  */
  const eventsRef = React.useRef<SprintEventV2[]>([]);

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

      baseDispatch({ type: 'HYDRATE', payload: next });
      didHydrateRef.current = true;

      try {
        const evs = await window.compass.sprint.events.read({
          // from: { monthFile, lastEventId }  // pass in cursor if there is any
          // toMonthKey: '2026-02'
        });
        eventsRef.current = Array.isArray(evs) ? evs : [];
      } catch (e) {
        console.warn('[SprintStore] eventsRead failed (ignored)', e);
      }
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
  | { type: 'APPLY_EVENT_V2'; event: SprintEventV2 }
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
    case 'APPLY_EVENT_V2': {
      const next = structuredClone(state);
      applyEventV2(next, a.event);

      // store events in memory for now (later flush to disk)
      next.events.push(a.event);

      return next;
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

  function emitV2<T extends Omit<SprintEventV2, 'v' | 'id' | 'ts'>>(
    base: T,
  ): SprintEventV2 {
    return {
      ...base,
      v: 2,
      id: uid(),
      ts: nowISO(),
    } as unknown as SprintEventV2;
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
      const event = emitV2({
        type: 'EPIC_CREATED',
        epic: epic,
      });
      dispatch({ type: 'APPLY_EVENT_V2', event });
    },

    updateEpic(epicId: string, patch: Partial<Epic>) {
      const prev = state.epics.find((e) => e.id === epicId);
      if (!prev) return;
      const event = emitV2({
        type: 'EPIC_UPDATED',
        epicId: epicId,
        patch: patch,
        from: prev, // optional
      });
      dispatch({ type: 'APPLY_EVENT_V2', event });
    },

    deleteEpic(epicId: string) {
      const removedTaskIds = state.taskOrderByEpic[epicId] ?? [];
      const event = emitV2({
        type: 'EPIC_DELETED',
        epicId: epicId,
        removedTaskIds: removedTaskIds,
      });
      dispatch({ type: 'APPLY_EVENT_V2', event });
    },

    createTask(input: Task) {
      const event = emitV2({
        type: 'TASK_CREATED',
        task: input,
      });
      dispatch({ type: 'APPLY_EVENT_V2', event });
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

      const event = emitV2({
        type: 'TASK_UPDATED',
        taskId: taskId,
        patch: patch,
        from: prev,
        autoCloseBottom: autoCloseBottom,
      });
      dispatch({ type: 'APPLY_EVENT_V2', event });
    },

    deleteTask(taskId: string) {
      const prev = state.tasksById[taskId];
      if (!prev) return;

      const event = emitV2({
        type: 'TASK_DELETED',
        taskId: taskId,
        epicId: prev.epicId,
      });

      dispatch({ type: 'APPLY_EVENT_V2', event });
    },

    moveTask(args: {
      taskId: string;
      fromEpicId: string;
      toEpicId: string;
      toIndex: number;
    }) {
      const event = emitV2({
        type: 'TASK_MOVED',
        taskId: args.taskId,
        fromEpicId: args.fromEpicId,
        toEpicId: args.toEpicId,
        toIndex: args.toIndex,
        reason: 'user-dnd',
      });

      dispatch({ type: 'APPLY_EVENT_V2', event });
    },

    reorderTask(args: {
      taskId: string;
      epicId: string;
      toIndex: number;
      fromIndex: number;
    }) {
      const event = emitV2({
        type: 'TASK_REORDERED',
        taskId: args.taskId,
        epicId: args.epicId,
        fromIndex: args.fromIndex,
        toIndex: args.toIndex,
        reason: 'user-dnd',
      });

      dispatch({ type: 'APPLY_EVENT_V2', event });
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

    updateConfig(patch: Partial<SprintConfig>) {
      const event = emitV2({
        type: 'CONFIG_UPDATED',
        patch: patch,
        from: state.config,
      });

      dispatch({ type: 'APPLY_EVENT_V2', event });
    },
  };
}
