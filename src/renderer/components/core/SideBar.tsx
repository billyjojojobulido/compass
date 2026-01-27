import React, { useMemo } from 'react';

export type NavKey = '技术债务' | '待做事项' | '优先级管理' | '周总结';

type WeekItem = { id: string; label: string };

type Props = {
  sidebarOpen: boolean;
  activeNav: NavKey;
  onChangeNav: (nav: NavKey) => void;
  onRequestClose: () => void; // click backdrop to close
  legacyWeeks: {
    fileName: string;
    title: string;
    weekNo?: number;
    weekStart?: string;
  }[];
  activeWeekFile: string | null;
  onSelectWeek: (fileName: string) => void;
};

export default function Sidebar({
  sidebarOpen,
  activeNav,
  onChangeNav,
  onRequestClose,
  legacyWeeks,
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
              icon="📝"
              onClick={() => onChangeNav('优先级管理')}
            />
          </section>

          <div className="sidebarDivider" />

          <section className="navBottom">
            <div className="sectionTitle">Weekly Reports</div>

            <div className="weekList" role="list">
              {legacyWeeks.map((w, i) => (
                <div
                  className={`weekRow ${i === 0 ? 'active' : ''}`}
                  key={w.weekNo}
                  role="listitem"
                >
                  <span className="weekLabel">{w.title}</span>
                  <span className="weekChevron" aria-hidden>
                    ›
                  </span>
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
