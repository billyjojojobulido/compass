import React, { useMemo, useState } from 'react';
import './App.css';

type KanbanStatus = 'TODO' | 'WIP' | 'QA' | 'DONE';

type Task = {
  id: string;
  title: string;
  status: KanbanStatus;
  meta?: string; // TODO: optional: may add deescription later
};

type WeekItem = {
  id: string;
  label: string; // Format: e.g. "Week 2 (26-01-19)""
};

const STATUSES: KanbanStatus[] = ['TODO', 'WIP', 'QA', 'DONE'];

const statusTitle: Record<KanbanStatus, string> = {
  TODO: 'TODO',
  WIP: 'WIP',
  QA: 'QA',
  DONE: 'DONE',
};

function clampText(s: string, max = 38) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

export default function App() {
  const [query, setQuery] = useState('');
  const [activeNav, setActiveNav] = useState<
    '技术债务' | '待做事项' | '周总结'
  >('待做事项');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const weeks: WeekItem[] = useMemo(
    () => [
      // TODO: mocked data ATM, add file IO later
      { id: 'w2', label: 'Week 2 (26-01-19)' },
      { id: 'w1', label: 'Week 1 (19-01-12)' },
      { id: 'w52', label: 'Week 52 (18-12-29)' },
      { id: 'w51', label: 'Week 51 (18-12-22)' },
      { id: 'w50', label: 'Week 50 (18-12-15)' },
      { id: 'w49', label: 'Week 49 (18-12-08)' },
      { id: 'w48', label: 'Week 48 (18-12-01)' },
      { id: 'w47', label: 'Week 47 (17-11-24)' },
      { id: 'w46', label: 'Week 46 (17-11-17)' },
    ],
    [],
  );

  // TODO: mocked data ATM, add file IO later
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 't1',
      title: 'UIv3 — Game Of Queen',
      status: 'TODO',
      meta: 'Epic: UIv3',
    },
    { id: 't2', title: 'Character Redesign', status: 'TODO', meta: 'Art' },
    { id: 't3', title: 'UI Overhaul', status: 'TODO', meta: 'Tech Debt' },
    {
      id: 't4',
      title: 'UIv3 — Game Of King',
      status: 'WIP',
      meta: 'Epic: UIv3',
    },
    { id: 't5', title: 'Lobby Redesign', status: 'WIP', meta: 'UI' },
    { id: 't6', title: 'Level Testing', status: 'QA', meta: 'QA' },
    { id: 't7', title: 'Bug Fixes', status: 'QA', meta: 'QA' },
    { id: 't8', title: 'Main Menu Revamp', status: 'DONE', meta: 'UI' },
    { id: 't9', title: 'Sound Effects Update', status: 'DONE', meta: 'Audio' },
  ]);

  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.meta?.toLowerCase().includes(q) ?? false) ||
        t.status.toLowerCase().includes(q),
    );
  }, [tasks, query]);

  const grouped = useMemo(() => {
    const m: Record<KanbanStatus, Task[]> = {
      TODO: [],
      WIP: [],
      QA: [],
      DONE: [],
    };
    for (const t of filteredTasks) m[t.status].push(t);
    return m;
  }, [filteredTasks]);

  function moveTask(taskId: string, nextStatus: KanbanStatus) {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t)),
    );
  }

  // TODO: only used for MVP
  // TEMP solution to transit STATUS in fixed cycle routine
  // e.g. (TODO->WIP->QA->DONE->TODO)
  function cycleStatus(task: Task) {
    const idx = STATUSES.indexOf(task.status);
    const next = STATUSES[(idx + 1) % STATUSES.length];
    moveTask(task.id, next);
  }

  return (
    <div className="appRoot">
      {/* Top Bar */}
      <header className="topBar">
        <div className="topLeft">
          <button
            className="iconBtn sidebarToggle"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
          >
            ☰
          </button>

          <div className="logo" title="Compass">
            <div className="logoMark" />
            <div className="logoText">Compass</div>
          </div>
        </div>

        <div className="topCenter">
          <div className="searchWrap">
            <span className="searchIcon" aria-hidden>
              🔎
            </span>
            <input
              className="searchInput"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
            />
          </div>
        </div>

        <div className="topRight">
          <button className="iconBtn" aria-label="Settings" title="Settings">
            ⚙️
          </button>
        </div>
      </header>

      {/* Main */}
      <div className="mainRow">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebarInner">
            {/* Top Half= (40%) */}
            <section className="navTop">
              <NavButton
                active={activeNav === '技术债务'}
                label="技术债务"
                icon="🛠️"
                onClick={() => setActiveNav('技术债务')}
              />
              <NavButton
                active={activeNav === '待做事项'}
                label="待做事项"
                icon="✅"
                onClick={() => setActiveNav('待做事项')}
              />
              <NavButton
                active={activeNav === '周总结'}
                label="周总结"
                icon="📝"
                onClick={() => setActiveNav('周总结')}
              />
            </section>

            <div className="sidebarDivider" />

            {/* Bottom Half (55% + buffer) */}
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

        {/* Content / Kanban */}
        <main className="content">
          <div className="contentHeader">
            <div className="contentTitle">{activeNav}</div>
            <div className="contentHint">
              点击卡片右上角按钮可切换状态(MVP only)
            </div>
          </div>

          <div className="kanbanBoard" aria-label="Kanban board">
            {STATUSES.map((st) => (
              <section className="kanbanCol" key={st} aria-label={st}>
                <div className={`colHeader col-${st}`}>
                  <div className="colTitle">{statusTitle[st]}</div>
                  <div className="colCount">{grouped[st].length}</div>
                </div>

                <div className="colBody">
                  {grouped[st].map((t) => (
                    <article className="taskCard" key={t.id}>
                      <div className="taskTop">
                        <div className="taskTitle" title={t.title}>
                          {clampText(t.title, 44)}
                        </div>
                        <button
                          className="miniBtn"
                          onClick={() => cycleStatus(t)}
                          title="Cycle status"
                          aria-label="Cycle status"
                        >
                          ↻
                        </button>
                      </div>
                      {t.meta ? <div className="taskMeta">{t.meta}</div> : null}
                    </article>
                  ))}

                  {grouped[st].length === 0 ? (
                    <div className="emptyState">No items</div>
                  ) : null}
                </div>
              </section>
            ))}
          </div>
        </main>
      </div>
    </div>
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
