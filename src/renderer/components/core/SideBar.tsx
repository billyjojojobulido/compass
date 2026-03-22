import React from 'react';
import { LegacyWeekItem } from '@/domain/types';
import i18n from '@/services/i18n/i18n';

export const enum NAV_KEY {
  TECH_DEBT,
  TODO,
  PRIORITY,
  WEEKLY_REPORT,
  LEGACY_REPORT,
  SETTING_MENU,
}

type Props = {
  sidebarOpen: boolean;
  activeNav: NAV_KEY;
  onChangeNav: (nav: NAV_KEY) => void;
  onRequestClose: () => void; // click backdrop to close
  legacyWeeks: LegacyWeekItem[];

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
              active={activeNav === NAV_KEY.TECH_DEBT}
              label={i18n.t('SideBar.TechDebt')}
              icon="🛠️"
              onClick={() => onChangeNav(NAV_KEY.TECH_DEBT)}
            />
            <NavButton
              active={activeNav === NAV_KEY.TODO}
              label="待做事项"
              icon="✅"
              onClick={() => onChangeNav(NAV_KEY.TODO)}
            />
            <NavButton
              active={activeNav === NAV_KEY.PRIORITY}
              label="优先级管理"
              icon="⚡️"
              onClick={() => onChangeNav(NAV_KEY.PRIORITY)}
            />{' '}
            <NavButton
              active={activeNav === NAV_KEY.WEEKLY_REPORT}
              label="周总结"
              icon="📝"
              onClick={() => onChangeNav(NAV_KEY.WEEKLY_REPORT)}
            />
          </section>

          <div className="sidebarDivider" />

          <section className="navBottom">
            <div className="sectionTitle">Weekly Reports</div>

            <div className="weekList" role="list">
              {[...legacyWeeks].map((w) => (
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
