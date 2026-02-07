import React, { useMemo, useState } from 'react';
import {
  DailySnapshot,
  WeeklyWorkspace,
  WorkdayKey,
  WORKDAYS,
} from '@/domain/types';
import DayEpicChangelog from '@/components/weekView/DayEpicChangelog';
import { useCurrentWeekWorkspace } from '@/components/weekView/hooks/useCurrentWeekWorkspace';
import './currentWeek.css';
import { setDayOff, toggleDayCollapsed } from '@/domain/week/workspaceHelper';
import { renderDailyMarkdown } from '@/domain/week/renderDailyMarkdown';
import { useSprint } from '@/domain/sprintStore';

const LABEL: Record<string, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
};

export default function CurrentWeekView() {
  const { state } = useSprint();
  const { loading, error, ws, setWs, persistWs, reload } =
    useCurrentWeekWorkspace();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMarkdown, setModalMarkdown] = useState('');

  const canArchiveThisWeek = useMemo(() => {
    if (!ws) return false;
    // only Mon-Fri: either napshotExists, or dayOff
    return (WORKDAYS as WorkdayKey[]).every((k) => {
      const day = ws.days[k];
      const off = ws.dayMeta?.[k]?.isOff ?? false;
      return off || !!day?.snapshotExists;
    });
  }, [ws]);

  if (loading)
    return <div style={{ padding: 12, opacity: 0.75 }}>Loading week…</div>;
  if (error)
    return (
      <div style={{ padding: 12, color: 'crimson' }}>Load failed: {error}</div>
    );
  if (!ws) return <div style={{ padding: 12 }}>No workspace</div>;

  const saveWs = async (next: WeeklyWorkspace) => {
    // 1) opti update UI
    setWs(next);
    // 2) write in workspace.json
    await persistWs(next);
  };

  const onClickTag = async (dayKey: WorkdayKey) => {
    // MVP: click to set dayOff
    const cur = ws.dayMeta?.[dayKey]?.isOff ?? false;
    const next = setDayOff(ws, dayKey, !cur);
    await saveWs(next);
  };

  const onClickGenerateDayReport = async (dayKey: WorkdayKey) => {
    const day = ws.days[dayKey];
    if (!day?.snapshotExists || !day.date) {
      setModalTitle(`${LABEL[dayKey]} (No snapshot)`);
      setModalMarkdown(
        `No snapshot for ${dayKey}. Please archive the day first.`,
      );
      setModalOpen(true);
      return;
    }

    // read snapshot data of that day (upstream)
    const snap = (await window.compass.invoke('compass:snapshot:read', {
      date: day.date,
    })) as DailySnapshot;

    // dayTagText：if is off / birthday
    const isOff = ws.dayMeta?.[dayKey]?.isOff ?? false;
    const dayTagText = isOff ? '😴' : undefined;

    const md = renderDailyMarkdown({
      date: day.date,
      snapshot: snap,
      config: state.config,
      // changelog: day.changelog, // can pass in if want changelog to be sorted by touched
      dayTagText,
    });

    setModalTitle(`${day.date} Daily Report`);
    setModalMarkdown(md);
    setModalOpen(true);
  };

  const onToggleDay = async (dayKey: WorkdayKey) => {
    const next = toggleDayCollapsed(ws, dayKey);
    await saveWs(next);
  };

  return (
    <div className="cwRoot">
      <div className="contentHeader">
        <div>
          <div className="contentTitle">周总结</div>
          <div className="contentHint">{ws.title}</div>
        </div>

        <div className="contentActions">
          <button
            className="btnPrimary"
            onClick={() => {
              if (!canArchiveThisWeek) {
                console.log('Archive Today');
              } else {
                console.log('Archive This Week');
              }
            }}
          >
            {canArchiveThisWeek ? 'Archive This Week' : 'Archive Today'}
          </button>

          <button className="btnGhost" onClick={reload}>
            Refresh
          </button>
        </div>
      </div>

      <div className="cwGrid">
        {/* <section className="cwLeft">
          <div className="cwPanel">
            <div className="cwPanelTitle">技术债务</div>
            <div className="cwPanelBody">（TODO）</div>
          </div>

          <div className="cwPanel">
            <div className="cwPanelTitle">优先级</div>
            <div className="cwPanelBody">（TODO）</div>
          </div>
        </section> */}

        <section className="cwRight">
          <div className="cwAccordion">
            {WORKDAYS.map((d) => {
              const day = ws.days[d];
              const label = LABEL[d] ?? d;
              const title = `${label}${day?.date ? ` (${day.date})` : ''}`;

              const notArchived = !day?.snapshotExists;
              const isOff = !!day?.isOff;

              const collapsed = ws.dayMeta?.[d]?.collapsed ?? d !== 'Mon'; // by right only expand Mon

              const pill = !day?.snapshotExists
                ? 'Not archived'
                : isOff
                  ? '😴 Off'
                  : `✅ ${day.changelog.completed.length} / ➕ ${day.changelog.added.length}`;

              return (
                <DayEpicChangelog
                  key={d}
                  dayKey={d}
                  dateKey={day?.date ?? ''} // may be empty when not archived
                  // future solution : later can use <weekKey+dayKey> as key
                  title={title}
                  notArchived={notArchived}
                  isOff={isOff}
                  log={
                    day?.snapshotExists && !day.isOff
                      ? day.changelog
                      : undefined
                  }
                  onTag={(dateKey) => console.log('tag day', d, dateKey)}
                  onGenerateDayReport={(dateKey) =>
                    console.log('gen day report', d, dateKey)
                  }
                  defaultOpen={d === 'Mon'} // expand Monday by default
                />
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
