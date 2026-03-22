import React, { useState } from 'react';
import { NAV_KEY } from '@/components/core/SideBar';
import SprintBoardView from '@/components/sprintView/SprintBoardView';
import PriorityView from '@/components/priortyView/PriorityView';
import { useSprint } from '@/domain/sprintStore';
import LegacyWeekView from '@/components/logView/LegacyWeekView';
import CurrentWeekView from '../weekView/CurrentWeekView';
import TechDebtView from '@/components/debtView/TechDebtView';
import SettingsView from '../settingView/SettingView';

export default function Content({
  activeNav,
  onChangeNav,
  activeWeekFile,
  reloadSidebar,
}: {
  activeNav: NAV_KEY;
  onChangeNav: (nav: NAV_KEY) => void;
  activeWeekFile: string | null;
  reloadSidebar: () => void;
}) {
  const { state, actions } = useSprint();

  const jumpToEpic = (epicId: string) => {
    onChangeNav(NAV_KEY.TODO);
    actions.requestScrollToEpic(epicId);
  };

  return (
    <main className="content">
      {activeNav === NAV_KEY.TODO && <SprintBoardView />}
      {activeNav === NAV_KEY.PRIORITY && (
        <PriorityView onRedirect={jumpToEpic} />
      )}

      {activeNav === NAV_KEY.WEEKLY_REPORT && (
        <CurrentWeekView reloadSidebar={reloadSidebar} />
      )}

      {activeNav === NAV_KEY.LEGACY_REPORT &&
        (activeWeekFile ? (
          <LegacyWeekView fileName={activeWeekFile} onChangeNav={onChangeNav} />
        ) : (
          <div style={{ padding: 12, opacity: 0.75 }}>
            Please select a week from sidebar.
          </div>
        ))}

      {activeNav === NAV_KEY.TECH_DEBT && <TechDebtView></TechDebtView>}
      {activeNav === NAV_KEY.SETTING_MENU && <SettingsView></SettingsView>}
    </main>
  );
}
