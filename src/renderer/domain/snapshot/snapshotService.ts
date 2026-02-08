// src/domain/snapshot/snapshotService.ts
import type { SprintState, DailySnapshot } from '@/domain/types';
import { createDailySnapshot } from '@/domain/snapshot/dailySnapshot';
import { apiClient } from '@/services/ApiClient';

export type ArchiveSnapshotResult = {
  date: string;
  snapshot: DailySnapshot;
};

export async function archiveTodaySnapshot(
  state: SprintState,
  opts?: {
    now?: Date;
    source?: 'manual' | 'auto' | 'startup';
    timezone?: string;
  },
): Promise<ArchiveSnapshotResult> {
  const now = opts?.now ?? new Date();

  const snapshot = createDailySnapshot(state, now, {
    timezone: opts?.timezone,
    meta: {
      source: opts?.source ?? 'manual',
    },
  });

  await apiClient.snapshots.write(snapshot.date, snapshot);

  return { date: snapshot.date, snapshot };
}
