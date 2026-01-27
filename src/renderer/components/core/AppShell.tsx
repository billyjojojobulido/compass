import React, { useEffect, useMemo, useState } from 'react';
import TopBar from './TopBar';
import Sidebar, { NavKey } from './SideBar';
import Content from '@/components/core/Content';
import { LegacyIndexItem, listLegacyWeekly } from '@/domain/legacy/api';
import { parseWeekTitle } from '@/domain/legacy/parse';

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeNav, setActiveNav] = useState<NavKey>('待做事项');
  /* history week log index + week log that is currently chosen */
  const [legacyIndex, setLegacyIndex] = useState<LegacyIndexItem[]>([]);
  const [activeWeekFile, setActiveWeekFile] = useState<string | null>(null);

  /* read legacy weekly report list when launch */
  useEffect(() => {
    let alive = true;

    (async () => {
      const raw = await listLegacyWeekly(); // [{fileName,title}]
      if (!alive) return;

      const normalized: LegacyIndexItem[] = raw.map((it) => {
        const parsed = parseWeekTitle(it.title);
        return {
          ...it,
          weekNo: parsed?.weekNo,
          weekStart: parsed?.weekStart,
        };
      });

      setLegacyIndex(normalized);
    })();

    return () => {
      alive = false;
    };
  }, []);

  /* sort: weekNo desc
    if parse failed, moved to bottom
  */
  const legacyIndexSorted = useMemo(() => {
    return [...legacyIndex].sort((a, b) => {
      const an = a.weekNo ?? -1;
      const bn = b.weekNo ?? -1;
      return bn - an;
    });
  }, [legacyIndex]);

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
          legacyWeeks={legacyIndexSorted}
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
