import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { weekRangeLocal } from '@/domain/time';
import type { WeeklyWorkspace } from '@/domain/types';
import { loadCurrentWeekSnapshots } from './loadCurrentWeekSnapshots';
import { selectWeeklyWorkspace } from './selectWeeklyWorkspace';

function toISO(d: Date) {
  return d.toISOString();
}

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

  const weekKey = '2026-02-02';
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const doc = await window.compass.invoke('compass:workspace:read', {
        key: weekKey,
      });

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
    await window.compass.invoke('compass:workspace:write', {
      key: next.weekKey,
      doc: next,
    });
  }, []);

  return { loading, error, ws, setWs, persistWs, reload };
}
