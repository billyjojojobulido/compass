import React, { useRef, useState } from 'react';
import type { NavKey } from '@/components/core/SideBar';
import SprintBoardView, {
  SprintBoardHandle,
} from '@/components/sprintBoard/SprintBoardView';
import PriorityView from '@/components/priortyView/PriorityView';
import { useSprint } from '@/domain/sprintStore';
import LegacyWeekView from '@/components/logView/LegacyWeekView';
import { archiveTodaySnapshot } from '@/domain/snapshot/snapshotService';

export default function Content({
  activeNav,
  onChangeNav,
  activeWeekFile,
}: {
  activeNav: NavKey;
  onChangeNav: (nav: NavKey) => void;
  activeWeekFile: string | null;
}) {
  const { state, actions } = useSprint();
  const boardRef = useRef<SprintBoardHandle>(null);
  const [savingSnap, setSavingSnap] = useState(false);

  const jumpToEpic = (epicId: string) => {
    onChangeNav('待做事项');
    actions.requestScrollToEpic(epicId);
  };

  async function onArchiveToday() {
    if (savingSnap) return;
    try {
      setSavingSnap(true);
      const { date } = await archiveTodaySnapshot(state, {
        source: 'manual',
      });
      console.log('[SNAPSHOT] saved', date);
    } finally {
      setSavingSnap(false);
    }
  }

  const hint =
    activeNav === '待做事项'
      ? 'Sprint Board'
      : activeNav === '优先级管理'
        ? 'Priority View'
        : activeNav === '周总结'
          ? 'This Week'
          : activeNav === '历史周总结'
            ? 'History Weekly Reports'
            : 'Coming soon';

  return (
    <main className="content">
      <div className="contentHeader">
        <div>
          <div className="contentTitle">{activeNav}</div>

          <div className="contentHint">{hint}</div>
        </div>

        {/* button area on Top Right */}
        {activeNav === '待做事项' ? (
          <div className="contentActions">
            <button
              className="btnPrimary"
              onClick={() => boardRef.current?.openCreateEpic()}
            >
              Add Epic
            </button>
            <button
              className="btnGhost"
              onClick={() => boardRef.current?.openCreateTask()}
            >
              Create Task
            </button>
          </div>
        ) : null}
        {activeNav === '周总结' ? (
          <div className="contentActions">
            <button
              className="btnPrimary"
              onClick={() => console.log('Archive (TODO)')}
            >
              Archive
            </button>
            <button
              className="btnGhost"
              onClick={() => console.log('Carry over last week (TODO)')}
            >
              Carry Over
            </button>
          </div>
        ) : null}

        {activeNav === '历史周总结' ? (
          <div className="contentActions">
            <button className="btnGhost" onClick={() => onChangeNav('周总结')}>
              Back to This Week
            </button>
          </div>
        ) : null}
      </div>
      {activeNav === '待做事项' && <SprintBoardView ref={boardRef} />}
      {activeNav === '优先级管理' && <PriorityView onRedirect={jumpToEpic} />}
      {activeNav === '周总结' ? (
        <div className="contentActions">
          <button
            className="btnPrimary"
            onClick={onArchiveToday}
            disabled={savingSnap}
            title="Write today's DailySnapshot to disk"
          >
            {savingSnap ? 'Archiving…' : 'Archive Today'}
          </button>
        </div>
      ) : null}

      {activeNav === '历史周总结' &&
        (activeWeekFile ? (
          <LegacyWeekView fileName={activeWeekFile} />
        ) : (
          <div style={{ padding: 12, opacity: 0.75 }}>
            Please select a week from sidebar.
          </div>
        ))}

      {activeNav === '技术债务' && (
        <div style={{ padding: 12, opacity: 0.75 }}>TechDebt placeholder</div>
      )}
    </main>
  );
}
