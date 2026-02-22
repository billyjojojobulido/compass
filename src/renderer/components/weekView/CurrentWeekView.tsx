import React, { useMemo, useState } from 'react';
import {
  DailySnapshot,
  DayTag,
  WeeklyWorkspace,
  WorkdayKey,
  WORKDAYS,
} from '@/domain/types';
import DayEpicChangelog from '@/components/weekView/DayEpicChangelog';
import { useCurrentWeekWorkspace } from '@/components/weekView/hooks/useCurrentWeekWorkspace';
import './currentWeek.css';
import { setDayTag, toggleDayCollapsed } from '@/domain/week/workspaceHelper';
import { renderDailyMarkdown } from '@/domain/week/renderDailyMarkdown';
import { useSprint } from '@/domain/sprintStore';
import { apiClient } from '@/services/ApiClient';

import TagModal, { TagModalValue } from './tag/TagModal';

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

  const [tagModal, setTagModal] = useState<TagModalValue>({});

  // for changelog
  const epicTitleById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const e of state.epics) {
      map[e.id] = e.title;
    }
    return map;
  }, [state.epics]);

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

  const onClickTag = async (dayKey: WorkdayKey, dateKey: string) => {
    setTagModal({
      day: dayKey,
      dateKey: dateKey,
      current: { type: 'ML', label: '😷 病假' },
    });
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
    const snap = (await apiClient.snapshots.read(day.date)) as DailySnapshot;

    // dayTagText：if is off / birthday
    const tag = ws.dayMeta?.[dayKey]?.tag ?? undefined;
    const dayTagText = tag ? tag.label : undefined;

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
              ws && saveWs(ws);
            }}
          >
            Save
          </button>

          <button className="btnGhost" onClick={reload}>
            Refresh
          </button>
        </div>
      </div>

      <div className="cwGrid">
        <section className="cwRight">
          <div className="cwAccordion">
            {WORKDAYS.map((d) => {
              const day = ws.days[d];
              const label = LABEL[d] ?? d;
              const tag = ws.dayMeta?.[d]?.tag;
              const title = `${label}${day?.date ? ` (${day.date})` : ''}`;

              const notArchived = !day?.snapshotExists;

              const collapsed = ws.dayMeta?.[d]?.collapsed ?? d !== 'Mon'; // by right only expand Mon

              return (
                <DayEpicChangelog
                  key={d}
                  dayKey={d}
                  dateKey={day?.date ?? ''} // may be empty when not archived
                  // future solution : later can use <weekKey+dayKey> as key
                  title={title}
                  notArchived={notArchived}
                  tag={tag}
                  log={day?.snapshotExists ? day.changelog : undefined}
                  onTag={(dayKey: WorkdayKey, dateKey: string) =>
                    onClickTag(dayKey, dateKey)
                  }
                  onGenerateDayReport={(dateKey) =>
                    console.log('gen day report', d, dateKey)
                  }
                  defaultOpen={d === 'Mon'} // expand Monday by default
                  epicTitleById={epicTitleById}
                />
              );
            })}
          </div>
        </section>
      </div>
      {tagModal.day && (
        <TagModal
          value={tagModal}
          onClose={() => setTagModal({})}
          onConfirm={(tag) => {
            const next = setDayTag(ws, tagModal.day!, tag);
            saveWs(next);
            setTagModal({
              day: tagModal.day,
              dateKey: tagModal.dateKey,
              current: tag,
            });
          }}
        />
      )}
    </div>
  );
}
