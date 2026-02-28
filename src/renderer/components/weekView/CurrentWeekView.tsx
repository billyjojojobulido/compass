import React, { useMemo, useState } from 'react';
import { WeeklyWorkspace, WorkdayKey, WORKDAYS } from '@/domain/types';
import DayEpicChangelog from '@/components/weekView/DayEpicChangelog';
import { useCurrentWeekWorkspace } from '@/components/weekView/hooks/useCurrentWeekWorkspace';
import './currentWeek.css';
import { setDayTag, toggleDayCollapsed } from '@/domain/week/workspaceHelper';
import { renderDailyMarkdown } from '@/domain/week/renderDailyMarkdown';
import { useSprint } from '@/domain/sprintStore';

import TagModal, { TagModalValue } from './tag/TagModal';
import { useToast } from '../core/toast/useToast';
import ToastContainer from '../core/toast/ToastContainer';
import DailyReportModal from '../reportView/DailyReportModal';
import { apiClient } from '@/services/ApiClient';
import { renderWeeklyMarkdown } from '@/domain/week/renderWeeklyMarkdown';
import { calcWeekIndex } from '@/domain/time';
import { sharedConfig } from '@/config/sharedConfig.ts';
import { WeekSummaryModal } from './WeekSummaryModal';

export const LABEL: Record<string, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
};

export default function CurrentWeekView({
  reloadSidebar,
}: {
  reloadSidebar: () => void;
}) {
  const { state } = useSprint();
  const { loading, error, ws, setWs, persistWs, reload } =
    useCurrentWeekWorkspace();
  const { toasts, show } = useToast();

  // Day
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMarkdown, setModalMarkdown] = useState('');
  // Week
  const [weekSummaryOpen, setWeekSummaryOpen] = useState(false);
  const [weekSummaryDraft, setWeekSummaryDraft] = useState('');

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

  /* Save */
  const saveWs = async (next: WeeklyWorkspace) => {
    // 1) opti update UI
    setWs(next);
    // 2) write in workspace.json
    await persistWs(next);
  };

  /* Tag */
  const onClickTag = async (dayKey: WorkdayKey, dateKey: string) => {
    setTagModal({
      day: dayKey,
      dateKey: dateKey,
      current: { type: 'ML', label: '😷 病假' },
    });
  };

  const onToggleDay = async (dayKey: WorkdayKey) => {
    const next = toggleDayCollapsed(ws, dayKey);
    await saveWs(next);
  };

  /* Day Report */
  const onGenerateDayReport = async (dayKey: WorkdayKey) => {
    const day = ws.days[dayKey];
    if (!day?.snapshotExists || !day.date) {
      show(`Snapshot Not Created Yet for ${day.date}`);
      return;
    }

    try {
      const snap = await apiClient.snapshots.read(day.date);
      const md = renderDailyMarkdown({
        date: day.date,
        snapshot: snap,
        config: state.config,
        dayTagText: ws.dayMeta?.[dayKey]?.tag?.label,
      });

      setModalTitle(`${day.date} Daily Report`);
      setModalMarkdown(md);
      setModalOpen(true);
    } catch (error) {
      show(`Snapshot Not Found for ${day.date}`);
    }
  };

  /* Week Report */
  const onArchiveWeek = async () => {
    setWeekSummaryDraft(ws.notes?.weeklySummary ?? '');
    setWeekSummaryOpen(true);
  };

  const onConfirmArchive = async (summaryText: string) => {
    const nextWs = {
      ...ws,
      notes: {
        ...(ws.notes ?? {}),
        weeklySummary: summaryText.trim() ? summaryText.trim() : undefined,
      },
    };
    await saveWs(nextWs);

    const md = await renderWeeklyMarkdown(nextWs);

    let weekNo: number;

    if (!sharedConfig?.startDate) {
      weekNo = 404;
    }
    weekNo = calcWeekIndex(sharedConfig.startDate, ws.weekKey);

    await apiClient.legacyWeekly.write(`Week ${weekNo} (${ws.weekKey}).md`, md);

    show('✅ Archive Success');
    reloadSidebar();
  };

  return (
    <div className="cwRoot">
      <div className="contentHeader">
        <div>
          <div className="contentTitle">周总结</div>
          <div className="contentHint">{ws.title}</div>
        </div>

        <div className="contentActions">
          <button className="btnGhost" onClick={reload}>
            Refresh
          </button>{' '}
          <button
            className="btnPrimary"
            onClick={() => {
              ws && saveWs(ws);
              show('✅ Save Success');
            }}
          >
            Save
          </button>
          <button className="btnPrimary" onClick={onArchiveWeek}>
            Archive Week {ws.weekKey}
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
                  onGenerateDayReport={(dayKey: WorkdayKey) =>
                    onGenerateDayReport(dayKey)
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

            if (tag) show('Tag saved');
            else show('Tag removed');

            setTagModal({});
          }}
        />
      )}
      <DailyReportModal
        open={modalOpen}
        title={modalTitle}
        markdown={modalMarkdown}
        onClose={() => {
          setModalOpen(false);
          setModalMarkdown(undefined);
          setModalTitle(undefined);
        }}
        onCopied={() => show('Copied to clipboard')}
      ></DailyReportModal>
      {weekSummaryOpen && (
        <WeekSummaryModal
          open={weekSummaryOpen}
          title={`Archive ${ws.title}`}
          value={weekSummaryDraft}
          onChange={setWeekSummaryDraft}
          onClose={() => setWeekSummaryOpen(false)}
          onConfirm={async () => {
            setWeekSummaryOpen(false);
            await onConfirmArchive(weekSummaryDraft);
          }}
        />
      )}
      <ToastContainer toasts={toasts} />
    </div>
  );
}
