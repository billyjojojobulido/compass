import type { WeeklyWorkspace, WorkdayKey } from '@/domain/types';
import { WORKDAYS } from '@/domain/types';

const DAY_LABEL: Record<WorkdayKey, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
};

function bullet(lines: string[], items: string[]) {
  for (const x of items) lines.push(`- ${x}`);
  if (items.length === 0) lines.push(`- (none)`);
}

export function renderWeeklyMarkdown(ws: WeeklyWorkspace): string {
  const lines: string[] = [];

  // Header
  lines.push(`### ${ws.title}`);
  lines.push('');
  lines.push(`GeneratedAt: ${ws.generatedAt}`);
  lines.push('');

  // Weekly Rollup
  lines.push(`#### Weekly Rollup`);
  lines.push('');
  lines.push(`- Added: ${ws.rollup.tasksAdded}`);
  lines.push(`- Completed: ${ws.rollup.tasksCompleted}`);
  lines.push(`- Reopened: ${ws.rollup.tasksReopened}`);
  lines.push(`- Status changes: ${ws.rollup.statusChanges}`);
  lines.push(`- Epic moves: ${ws.rollup.epicMoves}`);
  lines.push(`- Priority changes: ${ws.rollup.priorityChanges}`);
  lines.push('');

  // Optional subjective notes (if you keep them)
  if (ws.notes?.techDebt?.length) {
    lines.push(`#### 技术债务`);
    lines.push('');
    bullet(lines, ws.notes.techDebt);
    lines.push('');
  }

  if (ws.notes?.priorityNotes?.length) {
    lines.push(`#### 优先级`);
    lines.push('');
    bullet(lines, ws.notes.priorityNotes);
    lines.push('');
  }

  // Days
  lines.push(`#### Daily Logs`);
  lines.push('');

  for (const k of WORKDAYS) {
    const d = ws.days[k];

    // #### Monday (2026-02-02)
    const datePart = d?.date ? ` (${d.date})` : '';
    lines.push(`##### ${DAY_LABEL[k]}${datePart}`);

    if (!d || !d.snapshotExists) {
      lines.push('');
      if (d?.isOff) {
        lines.push(`- 😴 Day Off`);
      } else {
        lines.push(`- (no snapshot)`);
      }
      lines.push('');
      continue;
    }

    if (d.isOff) {
      lines.push('');
      lines.push(`- 😴 Day Off`);
      lines.push('');
      continue;
    }

    const log = d.changelog;

    lines.push('');
    lines.push(`- ✅ Completed: ${log.completed.length}`);
    lines.push(`- ➕ Added: ${log.added.length}`);
    lines.push(`- 🔄 Status: ${log.statusChanged.length}`);
    lines.push(`- 🔁 Moves: ${log.epicMoved.length}`);
    lines.push(`- ⚠️ Priority: ${log.priorityChanged.length}`);
    lines.push('');

    // Sections (use ###### or ##### depending your format preference)
    lines.push(`###### ✅ Completed`);
    lines.push('');
    bullet(
      lines,
      log.completed.map((t) => t.title),
    );
    lines.push('');

    lines.push(`###### ➕ Added`);
    lines.push('');
    bullet(
      lines,
      log.added.map((t) => `${t.title} (epic:${t.epicId})`),
    );
    lines.push('');

    lines.push(`###### 🔄 Status Changed`);
    lines.push('');
    bullet(
      lines,
      log.statusChanged.map((s) => `${s.task.title}: ${s.from} → ${s.to}`),
    );
    lines.push('');

    lines.push(`###### 🔁 Epic Moved`);
    lines.push('');
    bullet(
      lines,
      log.epicMoved.map(
        (m) => `${m.task.title}: ${m.fromEpic.title} → ${m.toEpic.title}`,
      ),
    );
    lines.push('');

    lines.push(`###### ⚠️ Priority Changed`);
    lines.push('');
    bullet(
      lines,
      log.priorityChanged.map((p) => `${p.epic.title}: ${p.from} → ${p.to}`),
    );
    lines.push('');
  }

  // Weekly Summary (optional / maybe only allow edit when archiving)
  lines.push(`#### 周总结`);
  lines.push('');
  lines.push(ws.notes?.weeklySummary?.trim() ? ws.notes.weeklySummary : `TODO`);
  lines.push('');

  return lines.join('\n');
}
