import type { DailySnapshot, WorkdayKey } from '@/domain/types';
import { startOfWeekLocal, addDaysLocal, formatLocalYMD } from '@/domain/time';
import { WORKDAYS } from '@/domain/types';

type DayToSnapshot = Partial<Record<WorkdayKey, DailySnapshot>>;

function getMonOfThisWeek(now: Date) {
  // weekStartsOn=1 => Monday
  return startOfWeekLocal(now, 1);
}

function workdayDateKey(mon: Date, day: WorkdayKey): string {
  const offset =
    day === 'Mon'
      ? 0
      : day === 'Tue'
        ? 1
        : day === 'Wed'
          ? 2
          : day === 'Thu'
            ? 3
            : 4; // Fri
  return formatLocalYMD(addDaysLocal(mon, offset));
}

export async function loadCurrentWeekSnapshots(
  now: Date = new Date(),
): Promise<{
  weekKey: string; // Monday "YYYY-MM-DD"
  dayToDate: Record<WorkdayKey, string>;
  dayToSnapshot: DayToSnapshot;
}> {
  const mon = getMonOfThisWeek(now);
  const weekKey = formatLocalYMD(mon);

  const dayToDate = Object.fromEntries(
    WORKDAYS.map((d) => [d, workdayDateKey(mon, d)]),
  ) as Record<WorkdayKey, string>;

  // baocheng notes: list first, and then read as needed
  // in case blindly read files not exist
  const year = weekKey.slice(0, 4);
  const allDates: string[] = await window.compass.invoke(
    'compass:snapshot:list',
    { year },
  );

  const set = new Set(allDates);
  const dayToSnapshot: DayToSnapshot = {};

  // read order: Mon→Fri by default
  for (const d of WORKDAYS) {
    const date = dayToDate[d];
    if (!set.has(date)) continue;

    const snap = await window.compass.invoke('compass:snapshot:read', { date });
    // baocheng notes: snap is `plain object`
    // because readDailySnapshot return JSON.parse(raw)
    dayToSnapshot[d] = snap as DailySnapshot;
  }

  return { weekKey, dayToDate, dayToSnapshot };
}
