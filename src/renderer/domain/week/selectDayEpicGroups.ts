import type { DailyChangelog, TaskRef } from '@/domain/types';

export type ChangeKind =
  | 'added'
  | 'completed'
  | 'reopened'
  | 'statusChanged'
  | 'epicMoved'
  | 'priorityChanged';

export type ChangeItemVM = {
  kind: ChangeKind;

  icon: string; // UI: icon on left
  title: string; // UI: title (should be short)
  detail?: string; // UI: secondary info（from→to / fromEpic→toEpic etc）

  taskId?: string;
  epicId?: string;

  // baocheng notes: severity is planned to be used for sorting/highlight
  // cos i was thinking that I will add color/badge in future
  // TODO: but how to makes it cooperating with user custom config????
  severity?: 1 | 2 | 3;
};

export type EpicGroupVM = {
  epicId: string;
  epicTitle: string;
  items: ChangeItemVM[];
  // for UI effects
  stats: Record<ChangeKind, number>;
  score: number;
};

const KIND_WEIGHT: Record<ChangeKind, number> = {
  completed: 6,
  added: 5,
  reopened: 5,
  statusChanged: 3,
  epicMoved: 2,
  priorityChanged: 1,
};

function blankStats(): Record<ChangeKind, number> {
  return {
    added: 0,
    completed: 0,
    reopened: 0,
    statusChanged: 0,
    epicMoved: 0,
    priorityChanged: 0,
  };
}

function computeScore(stats: Record<ChangeKind, number>) {
  let s = 0;
  (Object.keys(stats) as ChangeKind[]).forEach((k) => {
    s += stats[k] * KIND_WEIGHT[k];
  });
  return s;
}

export function selectDayEpicGroups(
  log: DailyChangelog,
  opts?: { epicTitleById?: Record<string, string> },
): EpicGroupVM[] {
  if (!log) return [];

  const epicTitleById = opts?.epicTitleById ?? {};

  const touched = new Set<string>(log.touchedEpicIds ?? []);
  /* baocheng notes: this is to make sure it is compatible */
  if (touched.size === 0) {
    for (const t of log.added) touched.add(t.epicId);
    for (const t of log.completed) touched.add(t.epicId);
    for (const t of log.reopened) touched.add(t.epicId);
    for (const s of log.statusChanged) touched.add(s.task.epicId);
    for (const m of log.epicMoved) {
      touched.add(m.fromEpic.id);
      touched.add(m.toEpic.id);
    }
    for (const p of log.priorityChanged) touched.add(p.epic.id);
  }

  const map = new Map<string, EpicGroupVM>();

  const ensure = (epicId: string) => {
    const g = map.get(epicId);
    if (g) return g;
    const created: EpicGroupVM = {
      epicId,
      epicTitle: epicTitleById[epicId] ?? epicId,
      items: [],
      stats: blankStats(),
      score: 0,
    };
    map.set(epicId, created);
    return created;
  };

  const push = (epicId: string, item: ChangeItemVM) => {
    if (!touched.has(epicId)) return;
    ensure(epicId).items.push({ ...item, epicId });
    ensure(epicId).stats[item.kind] += 1;
  };

  // --- tasks ---
  for (const t of log.added) {
    push(t.epicId, {
      kind: 'added',
      icon: '🆕',
      title: t.title,
      detail: undefined,
      taskId: t.id,
      severity: 1,
    });
  }

  for (const t of log.completed) {
    push(t.epicId, {
      kind: 'completed',
      icon: '✅',
      title: t.title,
      taskId: t.id,
      severity: 1,
    });
  }

  for (const t of log.reopened) {
    push(t.epicId, {
      kind: 'reopened',
      icon: '♻️',
      title: t.title,
      taskId: t.id,
      severity: 2,
    });
  }

  for (const s of log.statusChanged) {
    const epicId = s.task.epicId;
    push(epicId, {
      kind: 'statusChanged',
      icon: '🔄',
      title: s.task.title,
      detail: `${s.from} → ${s.to}`,
      taskId: s.task.id,
      severity: 2,
    });
  }
  /* bacoheng notes: looks more like real log
   to push both in fromEpic & toEpic */
  for (const m of log.epicMoved) {
    push(m.fromEpic.id, {
      kind: 'epicMoved',
      icon: '🛫',
      title: m.task.title,
      detail: `Moved to ${m.toEpic.title}`,
      taskId: m.task.id,
      severity: 2,
    });

    push(m.toEpic.id, {
      kind: 'epicMoved',
      icon: '🛬',
      title: m.task.title,
      detail: `Moved from ${m.fromEpic.title}`,
      taskId: m.task.id,
      severity: 2,
    });
  }

  // --- epic priority ---
  for (const p of log.priorityChanged) {
    push(p.epic.id, {
      kind: 'priorityChanged',
      icon: '⚠️',
      title: 'Priority changed',
      detail: `${p.from} → ${p.to}`,
      severity: 3,
    });
  }

  // only return epics that actually has items
  const groups = Array.from(map.values()).filter((g) => g.items.length > 0);

  // sorting: epic with more changes show at first (tie breaker: title)

  for (const g of groups) {
    g.score = computeScore(g.stats);

    // in group sorting:: DONE & New TODO at top
    g.items.sort((a, b) => KIND_WEIGHT[b.kind] - KIND_WEIGHT[a.kind]);
  }

  // Epic group sort desc by score
  groups.sort((a, b) => b.score - a.score);

  return groups;
}
