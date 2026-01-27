const WEEK_RE = /^Week\s+(\d+)\s+\((\d{4}-\d{2}-\d{2})\)$/;

export function parseWeekTitle(title: string) {
  const m = title.trim().match(WEEK_RE);
  if (!m) return null;
  return { weekNo: Number(m[1]), weekStart: m[2] };
}
