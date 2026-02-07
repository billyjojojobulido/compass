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

export function setDayOff(
  ws: WeeklyWorkspace,
  dayKey: WorkdayKey,
  isOff: boolean,
): WeeklyWorkspace {
  // MVP：isOff === true then auto add a "off" tag
  // TODO: is this necessary?
  const offTag: DayTag = { id: 'off', label: 'Day Off', emoji: '😴' };

  const prevTags = ws.dayMeta?.[dayKey]?.tags ?? [];
  const nextTags = isOff
    ? prevTags.some((t) => t.id === 'off')
      ? prevTags
      : [offTag, ...prevTags]
    : prevTags.filter((t) => t.id !== 'off');

  return mergeDayMeta(ws, dayKey, { isOff, tags: nextTags });
}

export function toggleDayCollapsed(
  ws: WeeklyWorkspace,
  dayKey: WorkdayKey,
): WeeklyWorkspace {
  const cur = ws.dayMeta?.[dayKey]?.collapsed ?? false;
  return mergeDayMeta(ws, dayKey, { collapsed: !cur });
}

export function upsertDayTag(
  ws: WeeklyWorkspace,
  dayKey: WorkdayKey,
  tag: DayTag,
): WeeklyWorkspace {
  const tags = ws.dayMeta?.[dayKey]?.tags ?? [];
  const next = tags.some((t) => t.id === tag.id)
    ? tags.map((t) => (t.id === tag.id ? tag : t))
    : [tag, ...tags];
  return mergeDayMeta(ws, dayKey, { tags: next });
}

export function removeDayTag(
  ws: WeeklyWorkspace,
  dayKey: WorkdayKey,
  tagId: string,
): WeeklyWorkspace {
  const tags = ws.dayMeta?.[dayKey]?.tags ?? [];
  return mergeDayMeta(ws, dayKey, { tags: tags.filter((t) => t.id !== tagId) });
}
