import type { WeeklyWorkspace, WorkdayKey, DayTag } from '@/domain/types';
import { buildDayDigestFromSnapshot } from './buildDayDigestFromSnapshot';
import { sprintConfig } from '@/config/sprintConfig.ts';

const WORKDAYS: WorkdayKey[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const CN_WEEKDAY: Record<WorkdayKey, string> = {
  Mon: '周一',
  Tue: '周二',
  Wed: '周三',
  Thu: '周四',
  Fri: '周五',
};

function tagToText(tag?: DayTag): string {
  if (!tag || tag.type === 'NONE') return '';
  if (tag.type === 'ML') return '😷 病假';
  if (tag.type === 'AL') return '🏖️ 年假';
  if (tag.type === 'PH') return '📅 公共假期';
  if (tag.type === 'BT') return '✈️ 出差';
  if (tag.type === 'CUSTOM') return tag.label;
  return '';
}

function pushSectionTitle(lines: string[], title: string) {
  lines.push('');
  lines.push(`#### ${title}`);
  lines.push('');
}

export async function renderWeeklyMarkdown(
  ws: WeeklyWorkspace,
): Promise<string> {
  const lines: string[] = [];

  // Title
  // exactly: ### Week 72 (2026-01-19)
  lines.push(`### ${ws.title}`);
  lines.push('');

  // TODO: Tech Debt
  pushSectionTitle(lines, '历史遗留（技术债务）');
  const techDebt = ws.notes?.techDebt ?? [];
  if (techDebt.length === 0) {
    lines.push('- （空）');
  } else {
    for (const it of techDebt) lines.push(`- ${it}`);
  }
  lines.push('');

  // TODO: Priority
  pushSectionTitle(lines, '优先级');
  const pri = ws.notes?.priorityNotes ?? [];
  if (pri.length === 0) {
    lines.push('- （空）');
  } else {
    for (const it of pri) {
      // TODO:
      // lines.push(`- [${it.checked ? 'x' : ' '}] [${it.badge}] ${it.text}`);
    }
  }
  lines.push('');

  // TODO: Weekly Summary
  pushSectionTitle(lines, '周总结：');
  const summary = ws.notes?.weeklySummary ?? [];
  if (summary.length === 0) {
    lines.push('- （空）');
  } else {
    for (const s of summary) lines.push(`- ${s}`);
  }
  lines.push('');

  // Mon-Fri
  for (const dayKey of WORKDAYS) {
    const day = ws.days?.[dayKey];
    const date = day?.date ?? '';
    const tagText = tagToText(ws.dayMeta?.[dayKey]?.tag);

    // "#### 周一 2026-01-19"
    // + optional " 😷 ML"
    lines.push(
      `#### ${CN_WEEKDAY[dayKey]} ${date}${tagText ? ` ${tagText}` : ''}`,
    );
    lines.push('');

    // If no snapshot/digest
    if (!day?.snapshotExists) {
      lines.push('- （暂无记录）');
      lines.push('');
      continue;
    } else {
      const digest = await buildDayDigestFromSnapshot(day.date, sprintConfig);
      // Epic -> tasks
      for (const epic of digest) {
        // "- **UIv3 batch 1 & 2**"
        lines.push(`- **${epic.epicTitle}**`);

        for (const it of epic.items) {
          // "  - 【WIP】 Game of Knight 【当前回合：后端】"
          const status = (it.statusLabel || '').trim();
          const title = (it.title || '').trim();
          const handoff = (it.handoff || '').trim();

          const statusText = status ? `【${status}】 ` : '';
          const handoffText = handoff ? ` 【当前回合：${handoff}】` : '';

          lines.push(`  - ${statusText}${title}${handoffText}`);
        }
      }
    }

    lines.push('');
  }

  return lines.join('\n');
}
