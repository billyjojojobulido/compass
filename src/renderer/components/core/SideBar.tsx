import React, { useMemo } from 'react';
import { LegacyWeekItem, WeeklyReportItem } from 'src/main/compassFs';

export type NavKey =
  | '技术债务'
  | '待做事项'
  | '优先级管理'
  | '周总结'
  | '历史周总结';

type Props = {
  sidebarOpen: boolean;
  activeNav: NavKey;
  onChangeNav: (nav: NavKey) => void;
  onRequestClose: () => void; // click backdrop to close
  legacyWeeks: LegacyWeekItem[];
  weeklyReports: WeeklyReportItem[];

  activeWeekFile: string | null;
  onSelectWeek: (fileName: string) => void;
};

export default function Sidebar({
  sidebarOpen,
  activeNav,
  onChangeNav,
  onRequestClose,
  legacyWeeks,
  weeklyReports,
  activeWeekFile,
  onSelectWeek,
}: Props) {
  return (
    <>
      {/* mobile backdrop */}
      <div
        className={`backdrop ${sidebarOpen ? 'show' : ''}`}
        onClick={onRequestClose}
        aria-hidden
      />

      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebarInner">
          <section className="navTop">
            <NavButton
              active={activeNav === '技术债务'}
              label="技术债务"
              icon="🛠️"
              onClick={() => onChangeNav('技术债务')}
            />
            <NavButton
              active={activeNav === '待做事项'}
              label="待做事项"
              icon="✅"
              onClick={() => onChangeNav('待做事项')}
            />
            <NavButton
              active={activeNav === '优先级管理'}
              label="优先级管理"
              icon="⚡️"
              onClick={() => onChangeNav('优先级管理')}
            />{' '}
            <NavButton
              active={activeNav === '周总结'}
              label="周总结"
              icon="📝"
              onClick={() => onChangeNav('周总结')}
            />
          </section>

          <div className="sidebarDivider" />

          <section className="navBottom">
            <div className="sectionTitle">Weekly Reports</div>

            <div className="weekList" role="list">
              {[...weeklyReports, ...legacyWeeks].map((w) => (
                <div
                  className={`weekRow ${
                    activeWeekFile === w.fileName ? 'active' : ''
                  }`}
                  key={w.fileName}
                  role="listitem"
                  onClick={() => onSelectWeek(w.fileName)}
                >
                  <span className="weekLabel">
                    {w.hasOwnProperty('generated') && w['generated']
                      ? '📄 '
                      : '🕰️ '}
                    {w.title}
                  </span>
                  <span className="weekChevron">›</span>
                </div>
              ))}
            </div>
          </section>

          <div className="sidebarBuffer" />
        </div>
      </aside>
    </>
  );
}

function NavButton(props: {
  active?: boolean;
  label: string;
  icon?: string;
  onClick: () => void;
}) {
  const { active, label, icon, onClick } = props;
  return (
    <button className={`navBtn ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="navIcon" aria-hidden>
        {icon ?? '•'}
      </span>
      <span className="navLabel">{label}</span>
    </button>
  );
}
