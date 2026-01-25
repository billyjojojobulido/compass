// src/domain/projections/priorityProjections.ts
import type { SprintState } from '@/domain/types';

export type BlockedStats = {
  totalOpen: number;
  byStakeholder: Array<{ stakeholderId: string; count: number }>;
  topText: string; // e.g. "Backend (2), QA (1)"
};

export type EpicCardVM = {
  epicId: string;
  title: string;
  priorityId: string;
  progressText: string; // "4 / 10"
  blockedText: string; // "Blocked: Backend (2), QA (1)" or "No blockers"
  blockedLevel: 'none' | 'some' | 'heavy';
};

export type PriorityGroupVM = {
  priorityId: string;
  label: string;
  rank: number;
  epics: EpicCardVM[];
};

function byId<T extends { id: string }>(arr: T[]) {
  return new Map(arr.map((x) => [x.id, x]));
}

export function selectBlockedStats(
  epicId: string,
  state: SprintState,
): BlockedStats {
  const { tasksById, taskOrderByEpic, config } = state;
  const statusMap = byId(config.statuses);
  const stakeholderMap = byId(config.stakeholders);

  const ids = taskOrderByEpic[epicId] ?? [];
  let totalOpen = 0;

  const counts = new Map<string, number>();

  for (const tid of ids) {
    const t = tasksById[tid];
    if (!t) continue;

    const st = statusMap.get(t.statusId);
    const closed = st?.toClose === true;
    if (closed) continue;

    totalOpen += 1;
    const sid = t.stakeholderId ?? 'UNASSIGNED';
    counts.set(sid, (counts.get(sid) ?? 0) + 1);
  }

  const byStakeholder = [...counts.entries()]
    .map(([stakeholderId, count]) => ({ stakeholderId, count }))
    .sort((a, b) => b.count - a.count);

  const top = byStakeholder.slice(0, 2).map((x) => {
    const label =
      x.stakeholderId === 'UNASSIGNED'
        ? '—'
        : (stakeholderMap.get(x.stakeholderId)?.label ?? x.stakeholderId);
    return { label, count: x.count };
  });

  const rest = byStakeholder.length - top.length;
  const topText =
    top.length === 0
      ? ''
      : `${top.map((t) => `${t.label} (${t.count})`).join(', ')}${
          rest > 0 ? `, +${rest}` : ''
        }`;

  return { totalOpen, byStakeholder, topText };
}

export function selectPriorityGroups(state: SprintState): PriorityGroupVM[] {
  const { epics, config, taskOrderByEpic, tasksById } = state;

  const priorityMap = byId(config.priorities);
  const statusMap = byId(config.statuses);

  const rankOf = (pid: string) => priorityMap.get(pid)?.rank ?? 999;
  const labelOf = (pid: string) => priorityMap.get(pid)?.label ?? pid;

  // Group epics by priorityId
  const grouped = new Map<string, string[]>();
  for (const e of epics) {
    const list = grouped.get(e.priorityId) ?? [];
    list.push(e.id);
    grouped.set(e.priorityId, list);
  }

  // Ensure every priority exists even if empty
  for (const p of config.priorities) {
    if (!grouped.has(p.id)) grouped.set(p.id, []);
  }

  const buildEpicVM = (epicId: string): EpicCardVM | null => {
    const epic = epics.find((x) => x.id === epicId);
    if (!epic) return null;

    const ids = taskOrderByEpic[epicId] ?? [];
    let total = 0;
    let closed = 0;

    for (const tid of ids) {
      const t = tasksById[tid];
      if (!t) continue;
      total += 1;
      const st = statusMap.get(t.statusId);
      if (st?.toClose === true) closed += 1;
    }

    const blocked = selectBlockedStats(epicId, state);

    const blockedText =
      blocked.totalOpen === 0
        ? 'No open tasks'
        : blocked.topText
          ? `Blocked: ${blocked.topText}`
          : 'Blocked: —';

    const blockedLevel: EpicCardVM['blockedLevel'] =
      blocked.totalOpen === 0
        ? 'none'
        : blocked.totalOpen >= 3
          ? 'heavy'
          : 'some';

    return {
      epicId,
      title: epic.title,
      priorityId: epic.priorityId,
      progressText: `${closed} / ${total}`,
      blockedText,
      blockedLevel,
    };
  };

  const groups: PriorityGroupVM[] = [];
  for (const [priorityId, epicIds] of grouped.entries()) {
    const epicsVm = epicIds.map(buildEpicVM).filter(Boolean) as EpicCardVM[];

    // default ordering inside priority group (later we can replace with stored order)
    epicsVm.sort((a, b) => a.title.localeCompare(b.title));

    groups.push({
      priorityId,
      label: labelOf(priorityId),
      rank: rankOf(priorityId),
      epics: epicsVm,
    });
  }

  groups.sort((a, b) => a.rank - b.rank);
  return groups;
}

/**
 * 决策面板用：默认展开哪些优先级、默认选中哪个 epic
 * - 先选 rank 最小且有 epics 的那个 priority
 * - 再选该 priority 里的第一个 epic
 */
export function selectFocusEpics(
  _events: SprintState['events'],
  state: SprintState,
): { defaultPriorityId?: string; defaultEpicId?: string } {
  const groups = selectPriorityGroups(state);
  const firstNonEmpty = groups.find((g) => g.epics.length > 0);
  return {
    defaultPriorityId: firstNonEmpty?.priorityId,
    defaultEpicId: firstNonEmpty?.epics[0]?.epicId,
  };
}
