import React from 'react';
import type { NavKey } from '-/components/core/SideBar';
import SprintBoardView from '-/components/sprintBoard/SprintBoardView';

type Props = {
  activeNav: NavKey;
};

export default function Content({ activeNav }: { activeNav: NavKey }) {
  return (
    <main className="content">
      <div className="contentHeader">
        <div className="contentTitle">{activeNav}</div>

        <div className="contentActions">
          {activeNav === '待做事项' ? <SprintBoardView.Actions /> : null}
        </div>
      </div>
      {activeNav === '待做事项' && <SprintBoardView />}
      {activeNav === '周总结' && (
        <div style={{ padding: 12, opacity: 0.75 }}>Weekly placeholder</div>
      )}
      {activeNav === '技术债务' && (
        <div style={{ padding: 12, opacity: 0.75 }}>TechDebt placeholder</div>
      )}
    </main>
  );
}
