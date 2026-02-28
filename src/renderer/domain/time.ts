// src/domain/time.ts
// Time utilities for reports / projections.
// MVP assumption: group by machine local timezone (Electron user's timezone).
// Events store ts as ISO string; we interpret it with Date(ts) then group in LOCAL time.

export type ISODate = `${number}-${string}-${string}`; // "YYYY-MM-DD"
export type WeekId = `${number}-W${string}`; // "2026-W03"

export type DateRange = {
  start: Date; // inclusive
  end: Date; // exclusive
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** ISO string -> Date */
export function parseISO(iso: string): Date {
  return new Date(iso);
}

/** local date key like "2026-01-22" */
export function formatLocalYMD(d: Date): ISODate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}` as ISODate;
}

export function startOfDayLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/** end-of-day local (inclusive-ish) */
export function endOfDayLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function addDaysLocal(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

/** inclusive start, exclusive end */
export function isInRange(ts: Date, range: DateRange): boolean {
  return (
    ts.getTime() >= range.start.getTime() && ts.getTime() < range.end.getTime()
  );
}

export function dayRangeLocal(d: Date): DateRange {
  const start = startOfDayLocal(d);
  const end = addDaysLocal(start, 1);
  return { start, end };
}

/** weekStartsOn: 0=Sunday, 1=Monday */
export function startOfWeekLocal(d: Date, weekStartsOn: 0 | 1 = 1): Date {
  const day = d.getDay(); // 0..6
  const diff = (day - weekStartsOn + 7) % 7;
  return addDaysLocal(startOfDayLocal(d), -diff);
}

export function endOfWeekLocal(d: Date, weekStartsOn: 0 | 1 = 1): Date {
  const start = startOfWeekLocal(d, weekStartsOn);
  return addDaysLocal(start, 7);
}

export function weekRangeLocal(d: Date, weekStartsOn: 0 | 1 = 1): DateRange {
  const start = startOfWeekLocal(d, weekStartsOn);
  const end = endOfWeekLocal(d, weekStartsOn);
  return { start, end };
}

/** ---------------- ISO Week helpers (for WeekId) ---------------- */

/** ISO day-of-week: Mon=1 ... Sun=7 */
export function isoDayOfWeek(d: Date): number {
  const day = d.getDay(); // 0..6
  return day === 0 ? 7 : day;
}

/** start of ISO week (Monday 00:00 local) */
export function startOfISOWeekLocal(d: Date): Date {
  const x = startOfDayLocal(d);
  const dow = isoDayOfWeek(x);
  return addDaysLocal(x, 1 - dow);
}

/**
 * ISO week-year can differ from calendar year.
 * Rule: the ISO week-year is the year of the Thursday in that week.
 */
export function getISOWeekPartsLocal(date: Date): {
  isoYear: number;
  week: number;
} {
  const d = startOfDayLocal(date);

  const dow = isoDayOfWeek(d);
  const thursday = addDaysLocal(d, 4 - dow);
  const isoYear = thursday.getFullYear();

  // Week 1 is the week containing Jan 4
  const jan4 = new Date(isoYear, 0, 4, 0, 0, 0, 0);
  const week1Start = startOfISOWeekLocal(jan4);

  const thisStart = startOfISOWeekLocal(d);
  const diffDays = Math.round(
    (thisStart.getTime() - week1Start.getTime()) / DAY_MS,
  );
  const week = Math.floor(diffDays / 7) + 1;

  return { isoYear, week };
}

export function formatWeekId(isoYear: number, week: number): WeekId {
  const w = String(week).padStart(2, '0');
  return `${isoYear}-W${w}` as WeekId;
}

export function getISOWeekIdFromDateLocal(d: Date): WeekId {
  const { isoYear, week } = getISOWeekPartsLocal(d);
  return formatWeekId(isoYear, week);
}

export function parseWeekId(weekId: string): { isoYear: number; week: number } {
  const m = /^(\d{4})-W(\d{2})$/.exec(weekId);
  if (!m) throw new Error(`Invalid WeekId: ${weekId}`);
  return { isoYear: Number(m[1]), week: Number(m[2]) };
}

/**
 * ISO week range in LOCAL time:
 * start = Monday 00:00 local, end = next Monday 00:00 local (exclusive)
 */
export function isoWeekRangeLocalByWeekId(weekId: WeekId): DateRange {
  const { isoYear, week } = parseWeekId(weekId);

  const jan4 = new Date(isoYear, 0, 4, 0, 0, 0, 0);
  const week1Start = startOfISOWeekLocal(jan4);

  const start = addDaysLocal(week1Start, (week - 1) * 7);
  const end = addDaysLocal(start, 7);

  return { start, end };
}

/** event.ts 'ts' -> local day key */
export function localDayKeyFromEventTs(ts: string): ISODate {
  return formatLocalYMD(new Date(ts));
}

/** event.ts 'ts' -> ISO WeekId */
export function isoWeekIdFromEventTsLocal(ts: string): WeekId {
  return getISOWeekIdFromDateLocal(new Date(ts));
}

/**
 * start: startDate week 1  (YYYY-MM-DD)
 * target: random Date (YYYY-MM-DD)
 */
export function calcWeekIndex(start: string, target: string): number {
  const startDate = parseISODate(start);
  const targetDate = parseISODate(target);

  const diffMs = targetDate.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffMs / DAY);

  return Math.floor(diffDays / 7) + 1;
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * this is important! to avoid impact of timezone
 * use local YYYY-MM-DD to construct Date
 */
function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
