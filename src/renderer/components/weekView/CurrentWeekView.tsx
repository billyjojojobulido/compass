import React from 'react';
import { WORKDAYS } from '@/domain/types';
import DayEpicChangelog from '@/components/weekView/DayEpicChangelog';
import { useCurrentWeekWorkspace } from '@/components/weekView/hooks/useCurrentWeekWorkspace';
import './currentWeek.css';

const LABEL: Record<string, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
};

export default function CurrentWeekView() {
  const { loading, error, ws, reload } = useCurrentWeekWorkspace();

  if (loading)
    return <div style={{ padding: 12, opacity: 0.75 }}>Loading week…</div>;
  if (error)
    return (
      <div style={{ padding: 12, color: 'crimson' }}>Load failed: {error}</div>
    );
  if (!ws) return <div style={{ padding: 12 }}>No workspace</div>;

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
            onClick={() => console.log('Archive Today')}
          >
            Archive Today
          </button>
        </div>
      </div>

      <div className="cwGrid">
        <section className="cwLeft">
          <div className="cwPanel">
            <div className="cwPanelTitle">技术债务</div>
            <div className="cwPanelBody">（TODO）</div>
          </div>

          <div className="cwPanel">
            <div className="cwPanelTitle">优先级</div>
            <div className="cwPanelBody">（TODO）</div>
          </div>
        </section>

        <section className="cwRight">
          <div className="cwAccordion">
            {WORKDAYS.map((d) => {
              const day = ws.days[d];
              const label = LABEL[d] ?? d;
              const title = `${label}${day?.date ? ` (${day.date})` : ''}`;

              const notArchived = !day?.snapshotExists;
              const isOff = !!day?.isOff;

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
