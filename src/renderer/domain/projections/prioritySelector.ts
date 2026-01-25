// src/renderer/domain/projections/prioritySelectors.ts
import type { SprintState, SprintEvent, Epic, Task } from '@/domain/types';

/** ---------------------------
 * Types for Priority View UI
 * --------------------------*/

export type FocusEpicRow = {
  epicId: string;
  title: string;
  priorityId: string;

  // display
  progressClosed: number;
  progressTotal: number;

  // "Blocked by: Backend (2)"
  blockedLabel: string; // already formatted
};

export type PriorityGroup = {
  priorityId: string;
  label: string;
  rank: number;
  epics: PriorityEpicRow[];
};

export type PriorityEpicRow = {
  epicId: string;
  title: string;
  priorityId: string;

  progressClosed: number;
  progressTotal: number;

  // optional secondary line (e.g. QA issues count)
  secondaryLine?: string;

  blockedLabel: string;
};

export type BlockedStats = {
  progressClosed: number;
  progressTotal: number;

  // Most-blocking stakeholder + count
  topBlockedStakeholderId?: string;
  topBlockedStakeholderLabel?: string;
  topBlockedCount?: number;

  // formatted string for UI
  blockedLabel: string;
};

/** ---------------------------------------
 * Helpers (pure, no React)
 * --------------------------------------*/

function nowMs() {
  return Date.now();
}

function parseTsMs(iso: string) {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

function isClosedStatus(state: SprintState, statusId: string) {
  const def = state.config.statuses.find((s) => s.id === statusId);
  return def?.toClose === true;
}

function stakeholderLabel(state: SprintState, stakeholderId?: string) {
  if (!stakeholderId) return undefined;
  return state.config.stakeholders.find((s) => s.id === stakeholderId)?.label;
}

/**
 * Here we define "Focus" as:
 * - epics that have ANY events in the last N days
 * - sorted by: priority rank asc, then latest activity desc
 *
 * You can change this definition later without touching UI.
 */
export function selectFocusEpics(
  events: SprintEvent[],
  state: SprintState,
  days = 7,
  limit = 6,
): FocusEpicRow[] {
  const since = nowMs() - days * 24 * 60 * 60 * 1000;

  // map epicId -> latest event ts (ms)
  const epicLatest: Record<string, number> = {};

  for (const e of events) {
    const ts = parseTsMs(e.ts);
    if (ts < since) continue;

    // event may be on epic or task
    if (e.entity?.type === 'epic') {
      epicLatest[e.entity.id] = Math.max(epicLatest[e.entity.id] ?? 0, ts);
    } else if (e.entity?.type === 'task') {
      const t = state.tasksById[e.entity.id];
      if (t?.epicId) {
        epicLatest[t.epicId] = Math.max(epicLatest[t.epicId] ?? 0, ts);
      }
    }
  }

  const priorityRank = (priorityId: string) =>
    state.config.priorities.find((p) => p.id === priorityId)?.rank ?? 999;

  const rows = Object.keys(epicLatest)
    .map((epicId) => state.epics.find((x) => x.id === epicId))
    .filter(Boolean) as Epic[];

  const sorted = [...rows].sort((a, b) => {
    const pr = priorityRank(a.priorityId) - priorityRank(b.priorityId);
    if (pr !== 0) return pr;
    return (epicLatest[b.id] ?? 0) - (epicLatest[a.id] ?? 0);
  });

  return sorted.slice(0, limit).map((epic) => {
    const stats = selectBlockedStats(epic.id, state);
    return {
      epicId: epic.id,
      title: epic.title,
      priorityId: epic.priorityId,
      progressClosed: stats.progressClosed,
      progressTotal: stats.progressTotal,
      blockedLabel: stats.blockedLabel,
    };
  });
}

/**
 * Group epics by priority (P0/P1/P2/...) sorted by rank.
 * Each epic row includes progress + blocked label.
 */
export function selectPriorityGroups(state: SprintState): PriorityGroup[] {
  const priMap = new Map(state.config.priorities.map((p) => [p.id, p]));
  const rank = (pid: string) => priMap.get(pid)?.rank ?? 999;

  const groupsMap = new Map<string, PriorityGroup>();

  for (const epic of state.epics) {
    const pri = priMap.get(epic.priorityId);
    const pid = epic.priorityId;

    if (!groupsMap.has(pid)) {
      groupsMap.set(pid, {
        priorityId: pid,
        label: pri?.label ?? pid,
        rank: rank(pid),
        epics: [],
      });
    }

    const stats = selectBlockedStats(epic.id, state);

    // optional: QA issues example
    const qaCount = countTasksByStatusLabel(state, epic.id, 'QA');

    groupsMap.get(pid)!.epics.push({
      epicId: epic.id,
      title: epic.title,
      priorityId: pid,
      progressClosed: stats.progressClosed,
      progressTotal: stats.progressTotal,
      blockedLabel: stats.blockedLabel,
      secondaryLine: qaCount > 0 ? `QA Issues: ${qaCount}` : undefined,
    });
  }

  const groups = [...groupsMap.values()].sort((a, b) => a.rank - b.rank);

  // stable sort epics inside group: priority already same, use title
  for (const g of groups) {
    g.epics.sort((a, b) => a.title.localeCompare(b.title));
  }

  return groups;
}

/**
 * BlockedStats:
 * - progress: closed tasks / total tasks in epic
 * - blocked: among NON-closed tasks, count by stakeholder; take top
 * - if no stakeholder, treat as "—"
 */
export function selectBlockedStats(
  epicId: string,
  state: SprintState,
): BlockedStats {
  const taskIds = state.taskOrderByEpic[epicId] ?? [];
  const tasks = taskIds
    .map((id) => state.tasksById[id])
    .filter(Boolean) as Task[];

  const total = tasks.length;

  let closed = 0;

  // stakeholderId -> count (only non-closed)
  const blockedCounts: Record<string, number> = {};

  for (const t of tasks) {
    const closedNow = isClosedStatus(state, t.statusId);
    if (closedNow) {
      closed += 1;
      continue;
    }

    const sid = t.stakeholderId ?? '__NONE__';
    blockedCounts[sid] = (blockedCounts[sid] ?? 0) + 1;
  }

  // pick top
  let topId: string | undefined;
  let topCount = 0;
  for (const [sid, c] of Object.entries(blockedCounts)) {
    if (c > topCount) {
      topCount = c;
      topId = sid;
    }
  }

  const topLabel =
    topId && topId !== '__NONE__' ? stakeholderLabel(state, topId) : undefined;

  const blockedLabel =
    topCount > 0
      ? `Blocked by: ${topLabel ?? '—'} (${topCount})`
      : 'Blocked by: —';

  return {
    progressClosed: closed,
    progressTotal: total,
    topBlockedStakeholderId: topId === '__NONE__' ? undefined : topId,
    topBlockedStakeholderLabel: topLabel,
    topBlockedCount: topCount || undefined,
    blockedLabel,
  };
}

/** ---------------------------
 * tiny helper: find status by label
 * (optional, keeps UI clean)
 * --------------------------*/
function countTasksByStatusLabel(
  state: SprintState,
  epicId: string,
  label: string,
) {
  const statusIds = state.config.statuses
    .filter((s) => s.label.toLowerCase() === label.toLowerCase())
    .map((s) => s.id);

  if (statusIds.length === 0) return 0;

  const taskIds = state.taskOrderByEpic[epicId] ?? [];
  let n = 0;
  for (const tid of taskIds) {
    const t = state.tasksById[tid];
    if (t && statusIds.includes(t.statusId)) n += 1;
  }
  return n;
}
