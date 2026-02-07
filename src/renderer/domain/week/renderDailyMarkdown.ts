import type { DailySnapshot, DailyChangelog } from '@/domain/types';

function monthDayLabel(date: string) {
  // "2026-01-05" -> "Jan 05"
  const [y, m, d] = date.split('-').map((x) => Number(x));
  const dt = new Date(y, m - 1, d);
  const MMM = dt.toLocaleString('en-US', { month: 'short' });
  const DD = String(d).padStart(2, '0');
  const weekday = dt.toLocaleString('en-US', { weekday: 'long' });
  return { head: `${MMM} ${DD} (${weekday})`, weekday };
}

function statusLabel(statusId: string, config: any) {
  const s = config.statuses?.find((x: any) => x.id === statusId);
  return s?.label ?? statusId;
}

function taskKeyOrder(snapshot: DailySnapshot, changelog?: DailyChangelog) {
  if (!changelog) return null;
  const touched = new Set<string>();
  changelog.added.forEach((t) => touched.add(t.id));
  changelog.completed.forEach((t) => touched.add(t.id));
  changelog.reopened.forEach((t) => touched.add(t.id));
  changelog.statusChanged.forEach((c) => touched.add(c.task.id));
  changelog.epicMoved.forEach((m) => touched.add(m.task.id));

  // touched tasks first
  return (aId: string, bId: string) => {
    const A = touched.has(aId) ? 0 : 1;
    const B = touched.has(bId) ? 0 : 1;
    if (A !== B) return A - B;
    const a = snapshot.tasksById[aId]?.title ?? '';
    const b = snapshot.tasksById[bId]?.title ?? '';
    return a.localeCompare(b);
  };
}

export function renderDailyMarkdown(args: {
  date: string;
  snapshot: DailySnapshot;
  config: any; // SprintConfig
  changelog?: DailyChangelog;
  dayTagText?: string; // e.g. "🎂" / "SYD public holiday" / "Sick Leave 😷"
}): string {
  const { head } = monthDayLabel(args.date);
  const titleLine = args.dayTagText
    ? `# ${head} ${args.dayTagText}`
    : `# ${head}`;

  const lines: string[] = [];
  lines.push(titleLine);
  lines.push('');
  lines.push('## Task');
  lines.push('');

  const orderCmp = taskKeyOrder(args.snapshot, args.changelog);

  // group tasks by epic in snapshot order
  for (const epic of args.snapshot.epics) {
    const taskIds = args.snapshot.taskOrderByEpic[epic.id] ?? [];
    const filtered = taskIds.filter((id) => args.snapshot.tasksById[id]);

    if (filtered.length === 0) continue;

    const sorted = orderCmp ? [...filtered].sort(orderCmp) : filtered;

    lines.push(`- \`${epic.title}\``);

    for (const tid of sorted) {
      const t = args.snapshot.tasksById[tid];
      const sLabel = statusLabel(t.statusId, args.config);

      lines.push(`  - ${t.title}`);
      lines.push(`    - **Recap:** ${sLabel === 'DONE' ? 'DONE' : 'TODO'}`);
      // TODO: may be use Recap: ${sLabel} (progress: ...) ?
    }

    lines.push('');
  }

  // Queue -- MVP :: if got statusId = "QUEUE"/"PENDING" , can pick it out
  // TODO: placeholder now
  lines.push('## Task in Queue');
  lines.push('');
  lines.push('- (none)');
  lines.push('');

  return lines.join('\n');
}
