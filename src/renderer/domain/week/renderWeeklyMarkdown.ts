import { WeeklyWorkspace, WORKDAYS } from '@/domain/types';
import { selectDayEpicGroups } from './selectDayEpicGroups';

export function renderWeeklyMarkdown(ws: WeeklyWorkspace): string {
  const lines: string[] = [];

  // title
  lines.push(`# ${ws.title}`);
  lines.push('');

  for (const dayKey of WORKDAYS) {
    const day = ws.days[dayKey];
    const meta = ws.dayMeta?.[dayKey];

    const date = day?.date ?? '';
    const tag = meta?.tag?.label ? ` ${meta.tag.label}` : '';

    // ---------- DAY HEADER ----------
    lines.push(`## ${date}${tag}`);
    lines.push('');

    if (!day?.snapshotExists) {
      lines.push('_No snapshot_');
      lines.push('');
      continue;
    }

    if (meta?.tag) {
      lines.push(meta.tag?.label);
      lines.push('');
      continue;
    }

    const groups = selectDayEpicGroups(day.changelog);

    if (!groups.length) {
      lines.push('_No changes_');
      lines.push('');
      continue;
    }

    // ---------- EPIC ----------
    for (const g of groups) {
      lines.push(`- \`${g.epicTitle}\``);

      for (const item of g.items) {
        lines.push(`  - ${item.icon} ${item.title}`);
        if (item.detail) {
          lines.push(`    - **Recap:** ${item.detail}`);
        }
      }

      lines.push('');
    }

    lines.push('');
  }

  return lines.join('\n');
}
