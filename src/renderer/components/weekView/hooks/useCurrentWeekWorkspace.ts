import { useCallback, useEffect, useState } from 'react';
import type { WeeklyRollup, WeeklyWorkspace } from '@/domain/types';
import { apiClient } from '@/services/ApiClient';
import { nowISO } from '@/domain/sprintStore';
import { addDays, formatLocalDate, parseLocalDate } from '@/domain/time';

function makeTitle(weekKey: string) {
  // baocheng notes: in current design, title format is fixed
  // so use weekKey(Monday, etc.) to generate in MVP
  // WeekNo is for my own indexing system in the future if needed
  return `Week (${weekKey})`;
}

function getMonday(date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 (Sun) - 6 (Sat)

  // key: make Sunday (0) to 7, easier to calculate
  const diff = day === 0 ? -6 : 1 - day;

  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0); // this may be removed? hours doesn't matter

  return d;
}

function createEmptyWeeklyWorkspace(weekKey: string): WeeklyWorkspace {
  const monday = parseLocalDate(weekKey);
  const friday = addDays(monday, 4);

  return {
    schemaVersion: 1,
    weekKey,
    title: makeTitle(weekKey),
    generatedAt: nowISO(),
    range: {
      start: formatLocalDate(monday),
      end: formatLocalDate(friday),
    },
    days: {},
    dayMeta: {},
    rollup: {
      tasksAdded: 0,
      tasksCompleted: 0,
      tasksReopened: 0,
      statusChanges: 0,
      epicMoves: 0,
      priorityChanges: 0,
      topComplete: undefined,
    } as WeeklyRollup,
    notes: {
      techDebt: [],
      priorityNotes: [],
      weeklySummary: '',
    },
    meta: {
      fromSnapshots: [],
    },
  };
}

export function useCurrentWeekWorkspace() {
  const [ws, setWs] = useState<WeeklyWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const weekKey = getMonday(new Date()).toISOString().slice(0, 10);
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let doc = await apiClient.workspace.read(weekKey);
      if (!doc) {
        doc = createEmptyWeeklyWorkspace(weekKey);
        await apiClient.workspace.write(weekKey, doc);
      }
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
