import React, { useMemo } from 'react';

export type NavKey = '技术债务' | '待做事项' | '周总结';

type WeekItem = { id: string; label: string };

type Props = {
  sidebarOpen: boolean;
  activeNav: NavKey;
  onChangeNav: (nav: NavKey) => void;
  onRequestClose: () => void; // click backdrop to close
};

export default function Sidebar({
  sidebarOpen,
  activeNav,
  onChangeNav,
  onRequestClose,
}: Props) {
  // TODO: mock data
  const weeks: WeekItem[] = useMemo(
    () => [
      { id: 'w2', label: 'Week 2 (26-01-19)' },
      { id: 'w1', label: 'Week 1 (19-01-12)' },
      { id: 'w52', label: 'Week 52 (18-12-29)' },
      { id: 'w51', label: 'Week 51 (18-12-22)' },
      { id: 'w50', label: 'Week 50 (18-12-15)' },
      { id: 'w49', label: 'Week 49 (18-12-08)' },
      { id: 'w48', label: 'Week 48 (18-12-01)' },
    ],
    [],
  );

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
              {weeks.map((w, i) => (
                <div
                  className={`weekRow ${i === 0 ? 'active' : ''}`}
                  key={w.id}
                  role="listitem"
                >
                  <span className="weekLabel">{w.label}</span>
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
