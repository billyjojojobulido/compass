import { useCallback, useEffect, useState } from 'react';
import type { WeeklyWorkspace } from '@/domain/types';
import { apiClient } from '@/services/ApiClient';

function makeTitle(weekKey: string) {
  // baocheng notes: in current design, title format is fixed
  // so use weekKey(Monday, etc.) to generate in MVP
  // WeekNo is for my own indexing system in the future if needed
  return `Week (${weekKey})`;
}

export function useCurrentWeekWorkspace() {
  const [ws, setWs] = useState<WeeklyWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // TODO: use current week key, if not exist, then create one
  const weekKey = '2026-02-02';
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const doc = await apiClient.workspace.read(weekKey);

      // doc maybe empty, if so, just selectWeeklyWorkspace(...) to generate one
      setWs(doc);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, [weekKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  const persistWs = useCallback(async (next: WeeklyWorkspace) => {
    await apiClient.workspace.write(next.weekKey, next);
  }, []);

  return { loading, error, ws, setWs, persistWs, reload };
}
