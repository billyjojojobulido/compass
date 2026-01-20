import React from 'react';
import type { NavKey } from '-/components/core/SideBar';
import KanbanView from '-/components/kanban/KanbanView';

type Props = {
  activeNav: NavKey;
};

export default function Content({ activeNav }: Props) {
  return (
    <main className="content">
      <div className="contentHeader">
        <div className="contentTitle">{activeNav}</div>
        <div className="contentHint">
          {activeNav === '待做事项' ? 'Kanban view' : 'Coming soon'}
        </div>
      </div>

      {activeNav === '待做事项' && <KanbanView />}
      {activeNav === '周总结' && renderWeekly()}
      {activeNav === '技术债务' && renderTechDebt()}
    </main>
  );
}

// TODO: weekly report section place holder
function renderWeekly() {
  return (
    <div style={{ padding: 12, opacity: 0.75 }}>Weekly Summary placeholder</div>
  );
}

// TODO: tech debt section place holder
function renderTechDebt() {
  return (
    <div style={{ padding: 12, opacity: 0.75 }}>Tech Debt placeholder</div>
  );
}
