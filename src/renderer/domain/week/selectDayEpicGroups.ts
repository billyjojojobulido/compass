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

export type EpicGroupVM = {
  epicId: string;
  epicTitle: string; // use epicId to hold place :: later can use snapshot:epics map to fill title
  items: ChangeItemVM[];
};

export function selectDayEpicGroups(
  log: DailyChangelog,
  opts?: { epicTitleById?: Record<string, string> },
): EpicGroupVM[] {
  const epicTitleById = opts?.epicTitleById ?? {};
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

  // Task-based groups
  for (const t of log.added)
    ensure(t.epicId).items.push({ kind: 'added', task: t });
  for (const t of log.completed)
    ensure(t.epicId).items.push({ kind: 'completed', task: t });
  for (const t of log.reopened)
    ensure(t.epicId).items.push({ kind: 'reopened', task: t });

  for (const c of log.statusChanged) {
    ensure(c.task.epicId).items.push({
      kind: 'status',
      task: c.task,
      from: c.from,
      to: c.to,
    });
  }

  for (const m of log.epicMoved) {
    /* notes: may "move" over epics
     so it is more straightforward to
     make it under "toEpic" :: fromEpic like wise */
    ensure(m.toEpic.id).items.push({
      kind: 'move',
      task: m.task,
      fromEpicTitle: m.fromEpic.title,
      toEpicTitle: m.toEpic.title,
    });
  }

  for (const p of log.priorityChanged) {
    ensure(p.epic.id).items.push({
      kind: 'priority',
      epicId: p.epic.id,
      epicTitle: p.epic.title,
      from: p.from,
      to: p.to,
    });
  }

  // only keeps epics taht have changed
  // soring by epicTitle
  // TODO: is it necessary? if optional, may take out later
  return Array.from(map.values())
    .filter((g) => g.items.length > 0)
    .sort((a, b) => a.epicTitle.localeCompare(b.epicTitle));
}
