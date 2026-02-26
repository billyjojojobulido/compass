import { DailySnapshot, SprintConfig } from '@/domain/types';
import { apiClient } from '@/services/ApiClient';

function statusLabelOf(statusId: string, config: SprintConfig) {
  console.log('🦁 ', config);
  const s = config.statuses.find((x) => x.id === statusId);
  return s?.label ?? statusId;
}

function stakeholderLabelOf(
  stakeholderId: string | undefined,
  config: SprintConfig,
) {
  if (!stakeholderId) return undefined;
  const s = config.stakeholders?.find((x) => x.id === stakeholderId);
  return s?.label ?? stakeholderId;
}

export type DayDigest = Array<{
  epicTitle: string;
  items: Array<{
    statusLabel: string;
    title: string;
    handoff?: string;
  }>;
}>;

export async function buildDayDigestFromSnapshot(
  date: string,
  config: SprintConfig,
) {
  const groups: Record<
    string,
    {
      epicTitle: string;
      items: {
        statusLabel: string;
        title: string;
        handoff?: string;
      }[];
    }
  > = {};

  try {
    const snap = await apiClient.snapshots.read(date);

    for (const task of Object.values(snap.tasksById)) {
      const epic = snap.epics.find((e) => e.id === task.epicId);
      if (!epic) continue;

      if (!groups[epic.id]) {
        groups[epic.id] = {
          epicTitle: epic.title,
          items: [],
        };
      }

      const statusLabel = statusLabelOf(task.statusId, config);
      const handoff = stakeholderLabelOf(task.stakeholderId, config);

      groups[epic.id].items.push({
        statusLabel,
        title: task.title,
        handoff,
      });
    }

    console.log('What the fuck: ', groups);
  } catch (e) {
    console.log('delay no more: ', e);
  }

  // sorting
  return Object.values(groups)
    .map((g) => ({
      ...g,
      items: g.items.sort((a, b) => a.statusLabel.localeCompare(b.statusLabel)),
    }))
    .sort((a, b) => a.epicTitle.localeCompare(b.epicTitle));
}
