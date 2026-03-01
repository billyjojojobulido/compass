import React, { useState } from 'react';
import type { NavKey } from '@/components/core/SideBar';
import SprintBoardView from '@/components/sprintView/SprintBoardView';
import PriorityView from '@/components/priortyView/PriorityView';
import { useSprint } from '@/domain/sprintStore';
import LegacyWeekView from '@/components/logView/LegacyWeekView';
import CurrentWeekView from '../weekView/CurrentWeekView';
import TechDebtView from '@/components/debtView/TechDebtView';

export default function Content({
  activeNav,
  onChangeNav,
  activeWeekFile,
  reloadSidebar,
}: {
  activeNav: NavKey;
  onChangeNav: (nav: NavKey) => void;
  activeWeekFile: string | null;
  reloadSidebar: () => void;
}) {
  const { state, actions } = useSprint();

  const jumpToEpic = (epicId: string) => {
    onChangeNav('待做事项');
    actions.requestScrollToEpic(epicId);
  };

  return (
    <main className="content">
      {activeNav === '待做事项' && <SprintBoardView />}
      {activeNav === '优先级管理' && <PriorityView onRedirect={jumpToEpic} />}

      {activeNav === '周总结' && (
        <CurrentWeekView reloadSidebar={reloadSidebar} />
      )}

      {activeNav === '历史周总结' &&
        (activeWeekFile ? (
          <LegacyWeekView fileName={activeWeekFile} onChangeNav={onChangeNav} />
        ) : (
          <div style={{ padding: 12, opacity: 0.75 }}>
            Please select a week from sidebar.
          </div>
        ))}

      {activeNav === '技术债务' && <TechDebtView></TechDebtView>}
    </main>
  );
}
