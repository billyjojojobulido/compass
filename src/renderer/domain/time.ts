// src/domain/time.ts
// Time utilities for reports / projections.
// Assumption (MVP): use machine local timezone (Electron user's timezone).
// Events store ts as ISO UTC string, but grouping happens in local time.

export type WeekRange = {
  start: Date; // inclusive
  end: Date; // exclusive
};

export function parseISO(iso: string): Date {
  // ISO string (UTC) -> Date object
  // new Date(iso) is always UTC-based parsing.
  return new Date(iso);
}

export function formatLocalYMD(d: Date): string {
  // local date key like "2026-01-22"
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfDayLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export function endOfDayLocal(d: Date): Date {
  // end of day inclusive-ish (23:59:59.999)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function addDaysLocal(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function startOfWeekLocal(d: Date, weekStartsOn: 0 | 1 = 1): Date {
  // weekStartsOn: 0=Sunday, 1=Monday (default)
  const day = d.getDay(); // 0..6
  const diff = (day - weekStartsOn + 7) % 7;
  const start = addDaysLocal(startOfDayLocal(d), -diff);
  return start;
}

export function endOfWeekLocal(d: Date, weekStartsOn: 0 | 1 = 1): Date {
  // Exclusive end is easier for range comparisons
  const start = startOfWeekLocal(d, weekStartsOn);
  return addDaysLocal(start, 7);
}

export function isInRange(
  ts: Date,
  range: { start: Date; end: Date },
): boolean {
  // inclusive start, exclusive end
  return (
    ts.getTime() >= range.start.getTime() && ts.getTime() < range.end.getTime()
  );
}

export function dayRangeLocal(d: Date): WeekRange {
  const start = startOfDayLocal(d);
  const end = addDaysLocal(start, 1);
  return { start, end };
}

export function weekRangeLocal(d: Date, weekStartsOn: 0 | 1 = 1): WeekRange {
  const start = startOfWeekLocal(d, weekStartsOn);
  const end = endOfWeekLocal(d, weekStartsOn);
  return { start, end };
}
