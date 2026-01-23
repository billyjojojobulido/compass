import type { SprintState, Epic, Task } from './types';

/** --- tiny helpers --- */

export function makeStatusMap(state: SprintState) {
  return new Map(state.config.statuses.map((s) => [s.id, s]));
}

export function makePriorityMap(state: SprintState) {
  return new Map(state.config.priorities.map((p) => [p.id, p]));
}

export function isClosedStatus(state: SprintState, statusId: string) {
  const s = state.config.statuses.find((x) => x.id === statusId);
  return s?.toClose === true;
}

/** --- Epic projections --- */

export function getEpicProgress(state: SprintState, epicId: string) {
  const ids = state.taskOrderByEpic[epicId] ?? [];
  const total = ids.length;
  let closed = 0;
  for (const tid of ids) {
    const t = state.tasksById[tid];
    if (!t) continue;
    if (isClosedStatus(state, t.statusId)) closed += 1;
  }
  return { closed, total };
}

/**
 * 统计某个 epic 里“未关闭任务”的 stakeholder 分布
 * key = stakeholderId 或 "UNASSIGNED"
 */
export function getEpicBlockers(state: SprintState, epicId: string) {
  const ids = state.taskOrderByEpic[epicId] ?? [];
  const counts = new Map<string, number>();
  for (const tid of ids) {
    const t = state.tasksById[tid];
    if (!t) continue;
    if (isClosedStatus(state, t.statusId)) continue;
    const key = t.stakeholderId ?? 'UNASSIGNED';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export function getEpicOpenBreakdown(state: SprintState, epicId: string) {
  const ids = state.taskOrderByEpic[epicId] ?? [];
  const counts = new Map<string, number>(); // statusId -> count
  for (const tid of ids) {
    const t = state.tasksById[tid];
    if (!t) continue;
    if (isClosedStatus(state, t.statusId)) continue;
    counts.set(t.statusId, (counts.get(t.statusId) ?? 0) + 1);
  }
  return counts;
}

/** --- Priority projections --- */

export function getPriorityRank(state: SprintState, priorityId: string) {
  const p = state.config.priorities.find((x) => x.id === priorityId);
  return p?.rank ?? 9999;
}

export function getPriorityIcon(state: SprintState, priorityId: string) {
  const p = state.config.priorities.find((x) => x.id === priorityId);
  return p?.icon ?? '';
}

/**
 * Epic Priority View 的主入口：按 pinned + priority rank 排序的 epic 列表
 */
export function selectEpicsByPriority(state: SprintState): Epic[] {
  const epics = [...state.epics];
  epics.sort((a, b) => {
    const ap = a.pinned ? -1 : 0;
    const bp = b.pinned ? -1 : 0;
    if (ap !== bp) return ap - bp;

    const ar = getPriorityRank(state, a.priorityId);
    const br = getPriorityRank(state, b.priorityId);
    if (ar !== br) return ar - br;

    // tie-breaker: open tasks more first (optional)
    const ao = getEpicProgress(state, a.id);
    const bo = getEpicProgress(state, b.id);
    const aOpen = ao.total - ao.closed;
    const bOpen = bo.total - bo.closed;
    return bOpen - aOpen;
  });
  return epics;
}

/** --- Task projections (optional) --- */

export function selectTasksInEpic(state: SprintState, epicId: string): Task[] {
  const ids = state.taskOrderByEpic[epicId] ?? [];
  return ids.map((id) => state.tasksById[id]).filter(Boolean) as Task[];
}
