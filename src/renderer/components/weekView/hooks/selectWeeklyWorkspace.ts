import {
  WORKDAYS,
  type DailySnapshot,
  WeeklyWorkspace,
  WorkdayKey,
  WeeklyDay,
} from '@/domain/types';
import { selectDailyChangelog } from './chanelog';
import { nowISO } from '@/domain/sprintStore';

/**
 * weekStartLocalDate: the Monday Date object of that week (local)
 * dayToSnapshot: map "Mon"->snapshot, "Tue"->snapshot ...
 */
export function selectWeeklyWorkspace(args: {
  weekKey: string; // "YYYY-MM-DD" of Monday
  title: string; // fixed template: e.g. "Week 73 (2026-02-02)"
  range: { startISO: string; endISO: string };
  dayToSnapshot: Partial<Record<WorkdayKey, DailySnapshot>>;
  dayOff?: Partial<Record<WorkdayKey, boolean>>;
}): WeeklyWorkspace {
  let prevExisting: DailySnapshot | null = null;

  const days: WeeklyWorkspace['days'] = {};
  const usedSnapshots: string[] = [];

  for (const k of WORKDAYS) {
    const snap = args.dayToSnapshot[k] ?? null;
    const isOff = args.dayOff?.[k] ?? false;

    if (!snap) {
      // no snapshot: still create a placeholder day (UI can show "not archived")
      days[k] = {
        date: '', // unknown
        isOff,
        snapshotExists: false,
        changelog: {
          schemaVersion: 1,
          date: '', // UI can show "-"
          generatedAt: nowISO(),
          stats: {
            tasksAdded: 0,
            tasksCompleted: 0,
            tasksReopened: 0,
            statusChanges: 0,
            epicMoves: 0,
            priorityChanges: 0,
          },
          added: [],
          completed: [],
          reopened: [],
          statusChanged: [],
          epicMoved: [],
          priorityChanged: [],
          meta: { snapshotFrom: prevExisting?.date, snapshotTo: '' },
        },
      } satisfies WeeklyDay;
      continue;
    }

    usedSnapshots.push(snap.date);

    const log = selectDailyChangelog(prevExisting, snap);

    days[k] = {
      date: snap.date,
      isOff,
      snapshotExists: true,
      changelog: log,
    };

    prevExisting = snap;
  }

  const rollup = rollupWeek(days);

  return {
    schemaVersion: 1,
    weekKey: args.weekKey,
    title: args.title,
    generatedAt: isoNow(),
    range: { start: args.range.startISO, end: args.range.endISO },
    days,
    rollup,
    meta: { fromSnapshots: usedSnapshots },
  };
}

function rollupWeek(days: WeeklyWorkspace['days']): WeeklyWorkspace['rollup'] {
  const sum = {
    tasksAdded: 0,
    tasksCompleted: 0,
    tasksReopened: 0,
    statusChanges: 0,
    epicMoves: 0,
    priorityChanges: 0,
  };

  for (const k of WORKDAYS) {
    const d = days[k];
    if (!d?.snapshotExists) continue;
    const s = d.changelog.stats;
    sum.tasksAdded += s.tasksAdded;
    sum.tasksCompleted += s.tasksCompleted;
    sum.tasksReopened += s.tasksReopened;
    sum.statusChanges += s.statusChanges;
    sum.epicMoves += s.epicMoves;
    sum.priorityChanges += s.priorityChanges;
  }

  return sum;
}
