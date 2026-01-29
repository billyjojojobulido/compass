import React, { useEffect, useMemo, useState } from 'react';
import TopBar from './TopBar';
import Sidebar, { NavKey } from './SideBar';
import Content from '@/components/core/Content';
import { LegacyWeekItem, listLegacyWeekly } from '@/domain/legacy/api';

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeNav, setActiveNav] = useState<NavKey>('待做事项');
  /* history week log index + week log that is currently chosen */
  const [legacyWeeks, setLegacyWeeks] = useState<LegacyWeekItem[]>([]);
  const [activeWeekFile, setActiveWeekFile] = useState<string | null>(null);

  /* read legacy weekly report list when launch */
  useEffect(() => {
    listLegacyWeekly()
      .then((items) => {
        setLegacyWeeks(items);
        // default to select nothing
        // setActiveWeekFile(items[0]?.fileName ?? null);
      })
      .catch((err) => {
        console.error('[legacyWeeks] load failed', err);
        setLegacyWeeks([]);
      });
  }, []);

  return (
    <div className="appRoot">
      <TopBar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onOpenSettings={() => {
          console.log('APP ROOT :: open settings');
        }}
      />

      <div className="mainRow">
        <Sidebar
          sidebarOpen={sidebarOpen}
          activeNav={activeNav}
          onChangeNav={(nav) => {
            setActiveNav(nav);
            if (nav !== '历史周总结') setActiveWeekFile(null);
          }}
          onRequestClose={() => setSidebarOpen(false)}
          legacyWeeks={legacyWeeks}
          activeWeekFile={activeWeekFile}
          onSelectWeek={(fileName) => {
            setActiveWeekFile(fileName);
            setActiveNav('历史周总结'); // click on week row => goes to history log page
          }}
        />

        <Content
          activeNav={activeNav}
          onChangeNav={(nav) => {
            setActiveNav(nav);
            if (nav !== '历史周总结') setActiveWeekFile(null);
          }}
          activeWeekFile={activeWeekFile}
        />
      </div>
    </div>
  );
}
