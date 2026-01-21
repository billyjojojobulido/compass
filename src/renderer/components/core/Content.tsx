import React, { useRef } from 'react';
import type { NavKey } from '@/components/core/SideBar';
import SprintBoardView, {
  SprintBoardHandle,
} from '@/components/sprintBoard/SprintBoardView';

export default function Content({ activeNav }: { activeNav: NavKey }) {
  const boardRef = useRef<SprintBoardHandle>(null);

  return (
    <main className="content">
      <div className="contentHeader">
        <div>
          <div className="contentTitle">{activeNav}</div>
          <div className="contentHint">
            {activeNav === '待做事项' ? 'Sprint Board' : 'Coming soon'}
          </div>
        </div>

        {/* button area on Top Right */}
        {activeNav === '待做事项' ? (
          <div className="contentActions">
            <button
              className="btnPrimary"
              onClick={() => boardRef.current?.openCreateEpic()}
            >
              Add Epic
            </button>
            <button
              className="btnGhost"
              onClick={() => boardRef.current?.openCreateTask()}
            >
              Create Task
            </button>
          </div>
        ) : null}
      </div>
      {activeNav === '待做事项' && <SprintBoardView ref={boardRef} />}
      {activeNav === '周总结' && (
        <div style={{ padding: 12, opacity: 0.75 }}>Weekly placeholder</div>
      )}
      {activeNav === '技术债务' && (
        <div style={{ padding: 12, opacity: 0.75 }}>TechDebt placeholder</div>
      )}
    </main>
  );
}
