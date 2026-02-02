// src/domain/snapshot/dailySnapshot.ts
import type { SprintState, DailySnapshot } from '@/domain/types';
import { formatLocalYMD, startOfDayLocal, addDaysLocal } from '../time';

/**
 * Returns ISO UTC strings for local day [start, end) range.
 * This is super useful later for weekly grouping & filtering.
 */
export function dayRangeLocalISO(d: Date): {
  startISO: string;
  endISO: string;
} {
  const startLocal = startOfDayLocal(d);
  const endLocal = addDaysLocal(startLocal, 1);
  // Date#toISOString is always UTC – perfect for file storage
  return { startISO: startLocal.toISOString(), endISO: endLocal.toISOString() };
}

//#endregion

/*
Baocheng: This is the heart and soul of the daily snapshot function
*/

//#region ---- Core function ----
export function createDailySnapshot(
  state: SprintState,
  now: Date = new Date(),
  opts?: {
    timezone?: string; // optional, keep for future
    eventCursor?: DailySnapshot['eventCursor'];
    meta?: DailySnapshot['meta'];
    includeRange?: boolean; // default true
  },
): DailySnapshot {
  const date = formatLocalYMD(now);

  // Copy state -> snapshot payload
  // Keep it minimal and deterministic (no functions, no Map, no class instances)
  const epics = state.epics.map((e) => ({
    id: e.id,
    title: e.title,
    priorityId: e.priorityId,
    statusId: e.statusId,
    pinned: e.pinned,
  }));

  const tasksById: DailySnapshot['tasksById'] = {};
  for (const [id, t] of Object.entries(state.tasksById)) {
    tasksById[id] = {
      id: t.id,
      epicId: t.epicId,
      title: t.title,
      statusId: t.statusId,
      stakeholderId: t.stakeholderId,
    };
  }

  const taskOrderByEpic: DailySnapshot['taskOrderByEpic'] = {};
  for (const [epicId, order] of Object.entries(state.taskOrderByEpic)) {
    taskOrderByEpic[epicId] = [...order];
  }

  // Optional sanity: guarantee every epic has an order array
  // (helps when creating a new epic but order missing due to earlier bugs)
  for (const e of epics) {
    if (!taskOrderByEpic[e.id]) taskOrderByEpic[e.id] = [];
  }

  const includeRange = opts?.includeRange ?? true;

  const snap: DailySnapshot = {
    schemaVersion: 1,
    date,
    generatedAt: now.toISOString(),
    timezone: opts?.timezone,

    ...(includeRange ? { range: dayRangeLocalISO(now) } : {}),

    epics,
    tasksById,
    taskOrderByEpic,

    eventCursor: opts?.eventCursor,
    meta: opts?.meta,
  };

  return snap;
}

//#endregion
