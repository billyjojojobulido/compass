import { useEffect, useMemo, useState } from 'react';
import { weekRangeLocal } from '@/domain/time';
import type { WeeklyWorkspace, WorkdayKey } from '@/domain/types';
import { loadCurrentWeekSnapshots } from './weekly/loadCurrentWeekSnapshots';
import { selectWeeklyWorkspace } from './weekly/selectWeeklyWorkspace';

function toISO(d: Date) {
  return d.toISOString();
}

function makeTitle(weekKey: string) {
  // baocheng notes: in current design, title format is fixed
  // so use weekKey(Monday, etc.) to generate in MVP
  // WeekNo is for my own indexing system in the future if needed
  return `Week (${weekKey})`;
}

export function useCurrentWeekWorkspace(now: Date = new Date()) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ws, setWs] = useState<WeeklyWorkspace | null>(null);

  const weekKey = useMemo(() => {
    // can get weekey via loadCurrentWeekSnapshots also
    // but here is for UI to show title in advance
    // may drop useMemo to optimize
    return '';
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const nowLocal = new Date(now);
        const { weekKey, dayToSnapshot } =
          await loadCurrentWeekSnapshots(nowLocal);

        // range：Monday 00:00 -> next Monday 00:00 (exclusive)
        const r = weekRangeLocal(nowLocal, 1);
        const title = makeTitle(weekKey);

        const workspace = selectWeeklyWorkspace({
          weekKey,
          title,
          range: { startISO: toISO(r.start), endISO: toISO(r.end) },
          dayToSnapshot,
          // TODO: dayOff use placeholder for now
          // will added when implementing “😴 Day Off”
        });

        if (!alive) return;
        setWs(workspace);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? String(e));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [now]);

  return { loading, error, ws, reload: () => setWs(null) };
}
