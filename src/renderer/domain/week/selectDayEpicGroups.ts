import type { DailyChangelog, TaskRef } from '@/domain/types';

export type ChangeItemVM =
  | { kind: 'added'; task: TaskRef }
  | { kind: 'completed'; task: TaskRef }
  | { kind: 'reopened'; task: TaskRef }
  | { kind: 'status'; task: TaskRef; from: string; to: string }
  | { kind: 'move'; task: TaskRef; fromEpicTitle: string; toEpicTitle: string }
  | {
      kind: 'priority';
      epicId: string;
      epicTitle: string;
      from: string;
      to: string;
    };

// export type EpicGroupVM = {
//   epicId: string;
//   epicTitle: string; // use epicId to hold place :: later can use snapshot:epics map to fill title
//   items: ChangeItemVM[];
// };

/* new version of EpicGroupVM */
export type EpicGroupVM = {
  epicId: string;
  epicTitle: string;
  // each task takes a row: show icon & text acc "items changed"
  items: Array<{
    taskId?: string;
    icon: string; // ➕ ✅ 🔄 ↔️ ⚠️ etc
    text: string; // short desc
    kind:
      | 'added'
      | 'completed'
      | 'reopened'
      | 'statusChanged'
      | 'epicMoved'
      | 'priorityChanged';
  }>;
};

export function selectDayEpicGroups(
  log: DailyChangelog,
  opts?: { epicTitleById?: Record<string, string> },
): EpicGroupVM[] {
  if (!log) return [];

  const epicTitleById = opts?.epicTitleById ?? {};

  const touched = new Set(log.touchedEpicIds ?? []);
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
    };
    map.set(epicId, created);
    return created;
  };

  // --- tasks ---
  for (const t of log.added) {
    if (!touched.has(t.epicId)) continue;
    ensure(t.epicId).items.push({
      taskId: t.id,
      icon: '➕',
      kind: 'added',
      text: t.title,
    });
  }

  for (const t of log.completed) {
    if (!touched.has(t.epicId)) continue;
    ensure(t.epicId).items.push({
      taskId: t.id,
      icon: '✅',
      kind: 'completed',
      text: t.title,
    });
  }

  for (const t of log.reopened) {
    if (!touched.has(t.epicId)) continue;
    ensure(t.epicId).items.push({
      taskId: t.id,
      icon: '♻️',
      kind: 'reopened',
      text: t.title,
    });
  }

  for (const s of log.statusChanged) {
    const epicId = s.task.epicId;
    if (!touched.has(epicId)) continue;
    ensure(epicId).items.push({
      taskId: s.task.id,
      icon: '🔄',
      kind: 'statusChanged',
      text: `${s.task.title}: ${s.from} → ${s.to}`,
    });
  }

  for (const m of log.epicMoved) {
    // just shown in toEpic is fine, more straight forward
    // but won't hurt to add to both
    const epicId = m.toEpic.id;
    if (!touched.has(epicId)) continue;
    ensure(epicId).items.push({
      taskId: m.task.id,
      icon: '↔️',
      kind: 'epicMoved',
      text: `${m.task.title}: ${m.fromEpic.title} → ${m.toEpic.title}`,
    });
  }

  // --- epic priority ---
  for (const p of log.priorityChanged) {
    const epicId = p.epic.id;
    if (!touched.has(epicId)) continue;
    ensure(epicId).items.push({
      icon: '⚠️',
      kind: 'priorityChanged',
      text: `Priority: ${p.from} → ${p.to}`,
    });
  }

  // only return epics that actually has items
  const groups = Array.from(map.values()).filter((g) => g.items.length > 0);

  // sorting: now sort by items number (des)
  groups.sort((a, b) => b.items.length - a.items.length);

  return groups;
}
