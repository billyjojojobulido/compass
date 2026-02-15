// src/renderer/domain/applyEventV2.ts
import type { SprintState } from '@/domain/types';
import type { SprintEventV2 } from '@/domain/events/sprintEventV2';

function ensureOrder(state: SprintState, epicId: string) {
  if (!state.taskOrderByEpic[epicId]) state.taskOrderByEpic[epicId] = [];
}

function removeFromList(list: string[], id: string) {
  const idx = list.indexOf(id);
  if (idx >= 0) list.splice(idx, 1);
}

function insertIntoList(list: string[], id: string, index: number) {
  const safeIndex = Math.max(0, Math.min(index, list.length));
  list.splice(safeIndex, 0, id);
}

export function applyEventV2(
  state: SprintState,
  e: SprintEventV2,
): SprintState {
  // (Optional) if you're using immutable reducer style, clone here.
  // If you're using mutable updates inside reducer, you can just mutate and return state.
  switch (e.type) {
    case 'EPIC_CREATED': {
      state.epics.push(e.epic);
      ensureOrder(state, e.epic.id);
      return state;
    }
    case 'EPIC_UPDATED': {
      const idx = state.epics.findIndex((x) => x.id === e.epicId);
      if (idx < 0) return state;
      state.epics[idx] = { ...state.epics[idx], ...e.patch };
      return state;
    }
    case 'EPIC_DELETED': {
      state.epics = state.epics.filter((x) => x.id !== e.epicId);

      const removed = state.taskOrderByEpic[e.epicId] ?? [];
      for (const tid of removed) delete state.tasksById[tid];
      delete state.taskOrderByEpic[e.epicId];

      // also remove tasks that referenced the epic (paranoia)
      for (const [tid, t] of Object.entries(state.tasksById)) {
        if (t.epicId === e.epicId) delete state.tasksById[tid];
      }
      return state;
    }

    case 'TASK_CREATED': {
      const t = e.task;
      state.tasksById[t.id] = t;
      ensureOrder(state, t.epicId);
      const list = state.taskOrderByEpic[t.epicId];
      if (!list.includes(t.id)) list.push(t.id);
      return state;
    }

    case 'TASK_UPDATED': {
      const prev = state.tasksById[e.taskId];
      if (!prev) return state;

      const next = { ...prev, ...e.patch };
      state.tasksById[e.taskId] = next;

      // If epicId changed via update (rare but allowed by your modal)
      if (e.patch.epicId && e.patch.epicId !== prev.epicId) {
        ensureOrder(state, prev.epicId);
        ensureOrder(state, e.patch.epicId);

        removeFromList(state.taskOrderByEpic[prev.epicId], e.taskId);
        // insert end by default; UI can reorder with explicit move/reorder events too
        state.taskOrderByEpic[e.patch.epicId].push(e.taskId);
      }

      return state;
    }

    case 'TASK_DELETED': {
      delete state.tasksById[e.taskId];
      ensureOrder(state, e.epicId);
      removeFromList(state.taskOrderByEpic[e.epicId], e.taskId);
      return state;
    }

    case 'TASK_MOVED': {
      const t = state.tasksById[e.taskId];
      if (!t) return state;

      ensureOrder(state, e.fromEpicId);
      ensureOrder(state, e.toEpicId);

      removeFromList(state.taskOrderByEpic[e.fromEpicId], e.taskId);
      insertIntoList(state.taskOrderByEpic[e.toEpicId], e.taskId, e.toIndex);

      // update task.epicId
      state.tasksById[e.taskId] = { ...t, epicId: e.toEpicId };

      return state;
    }

    case 'TASK_REORDERED': {
      ensureOrder(state, e.epicId);
      const list = state.taskOrderByEpic[e.epicId];

      // robust: remove then insert
      removeFromList(list, e.taskId);
      insertIntoList(list, e.taskId, e.toIndex);

      return state;
    }

    case 'CONFIG_UPDATED': {
      state.config = { ...state.config, ...e.patch };
      return state;
    }

    default:
      return state;
  }
}
