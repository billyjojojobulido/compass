import type {
  WeeklyWorkspace,
  WorkdayKey,
  DayTag,
  WeeklyDayMeta,
} from '@/domain/types';

function cloneWs(ws: WeeklyWorkspace): WeeklyWorkspace {
  return {
    ...ws,
    dayMeta: { ...(ws.dayMeta ?? {}) },
  };
}

function mergeDayMeta(
  ws: WeeklyWorkspace,
  dayKey: WorkdayKey,
  patch: Partial<WeeklyDayMeta>,
): WeeklyWorkspace {
  const next = cloneWs(ws);
  const prev = next.dayMeta?.[dayKey] ?? {};
  next.dayMeta![dayKey] = { ...prev, ...patch };
  return next;
}

export function setDayTag(
  ws: WeeklyWorkspace,
  day: WorkdayKey,
  tag?: DayTag,
): WeeklyWorkspace {
  const next = structuredClone(ws);
  next.dayMeta ??= {};
  next.dayMeta[day] ??= {};

  if (!tag) delete next.dayMeta[day].tag;
  else next.dayMeta[day].tag = tag;

  return next;
}

export function toggleDayCollapsed(
  ws: WeeklyWorkspace,
  dayKey: WorkdayKey,
): WeeklyWorkspace {
  const cur = ws.dayMeta?.[dayKey]?.collapsed ?? false;
  return mergeDayMeta(ws, dayKey, { collapsed: !cur });
}
