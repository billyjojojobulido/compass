import React, { useState } from 'react';
import type { NavKey } from '@/components/core/SideBar';
import SprintBoardView from '@/components/sprintBoard/SprintBoardView';
import PriorityView from '@/components/priortyView/PriorityView';
import { useSprint } from '@/domain/sprintStore';
import LegacyWeekView from '@/components/logView/LegacyWeekView';
import { archiveTodaySnapshot } from '@/domain/snapshot/snapshotService';
import CurrentWeekView from '../week/CurrentWeekView';

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

  return (
    <main className="content">
      {activeNav === '待做事项' && <SprintBoardView />}
      {activeNav === '优先级管理' && <PriorityView onRedirect={jumpToEpic} />}

      {activeNav === '周总结' && <CurrentWeekView />}

      {activeNav === '历史周总结' &&
        (activeWeekFile ? (
          <LegacyWeekView fileName={activeWeekFile} onChangeNav={onChangeNav} />
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
