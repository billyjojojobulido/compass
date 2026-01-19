import React, { useMemo, useState } from 'react';
import './App.css';

import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  DragOverlay,
  UniqueIdentifier,
  useDroppable,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type KanbanStatus = 'TODO' | 'WIP' | 'QA' | 'DONE';

type Task = {
  id: string;
  title: string;
  status: KanbanStatus;
  meta?: string;
};

type WeekItem = {
  id: string;
  label: string;
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

function isStatus(x: any): x is KanbanStatus {
  return x === 'TODO' || x === 'WIP' || x === 'QA' || x === 'DONE';
}

export default function App() {
  const [query, setQuery] = useState('');
  const [activeNav, setActiveNav] = useState<
    '技术债务' | '待做事项' | '周总结'
  >('待做事项');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const weeks: WeekItem[] = useMemo(
    () => [
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

  // ---------- Data model: tasksById + columns (order per column) ----------
  const initialTasks: Task[] = useMemo(
    () => [
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
      {
        id: 't9',
        title: 'Sound Effects Update',
        status: 'DONE',
        meta: 'Audio',
      },
    ],
    [],
  );

  const [tasksById, setTasksById] = useState<Record<string, Task>>(() => {
    const m: Record<string, Task> = {};
    for (const t of initialTasks) m[t.id] = t;
    return m;
  });

  const [columns, setColumns] = useState<Record<KanbanStatus, string[]>>(() => {
    const cols: Record<KanbanStatus, string[]> = {
      TODO: [],
      WIP: [],
      QA: [],
      DONE: [],
    };
    for (const t of initialTasks) cols[t.status].push(t.id);
    return cols;
  });

  // TODO: Do We Really Need Search?
  const filteredColumns = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return columns;

    const passes = (id: string) => {
      const t = tasksById[id];
      if (!t) return false;
      return (
        t.title.toLowerCase().includes(q) ||
        (t.meta?.toLowerCase().includes(q) ?? false) ||
        t.status.toLowerCase().includes(q)
      );
    };

    return {
      TODO: columns.TODO.filter(passes),
      WIP: columns.WIP.filter(passes),
      QA: columns.QA.filter(passes),
      DONE: columns.DONE.filter(passes),
    };
  }, [columns, tasksById, query]);

  // ---------- DnD ----------
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const activeTask = useMemo(() => {
    if (!activeId) return null;
    const id = String(activeId);
    return tasksById[id] ?? null;
  }, [activeId, tasksById]);

  // using a id to find to which container (column) it belongs
  function findContainer(id: UniqueIdentifier): KanbanStatus | null {
    const sid = String(id);
    if (isStatus(sid)) return sid; // container id -> status
    for (const st of STATUSES) {
      if (columns[st].includes(sid)) return st;
    }
    return null;
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(e.active.id);
  }

  // KEY! DragOver also insert card to specific position in target column
  function onDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;

    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);
    if (!activeContainer || !overContainer) return;

    if (activeContainer === overContainer) return;

    const activeItemId = String(active.id);
    const overId = String(over.id);

    setColumns((prev) => {
      const next = { ...prev };
      const activeItems = [...next[activeContainer]];
      const overItems = [...next[overContainer]];

      const activeIndex = activeItems.indexOf(activeItemId);
      if (activeIndex === -1) return prev;

      // remove from original column
      activeItems.splice(activeIndex, 1);

      // calc position: if over is an item, then insert infront of it
      // if over is container, then append to end
      const overIndex = overItems.indexOf(overId);
      const insertIndex = overIndex >= 0 ? overIndex : overItems.length;

      overItems.splice(insertIndex, 0, activeItemId);

      next[activeContainer] = activeItems;
      next[overContainer] = overItems;

      return next;
    });

    // sync task.status (data consistency)
    setTasksById((prev) => {
      const id = String(active.id);
      const t = prev[id];
      if (!t) return prev;
      if (t.status === overContainer) return prev;
      return { ...prev, [id]: { ...t, status: overContainer } };
    });
  }

  // sorting in same column, and fallback when ending
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;

    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);
    if (!activeContainer || !overContainer) return;

    // same column -> sorting
    if (activeContainer === overContainer) {
      const activeIdStr = String(active.id);
      const overIdStr = String(over.id);

      setColumns((prev) => {
        const items = [...prev[activeContainer]];
        const oldIndex = items.indexOf(activeIdStr);
        const newIndex = items.indexOf(overIdStr);
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex)
          return prev;

        const nextItems = arrayMove(items, oldIndex, newIndex);
        return { ...prev, [activeContainer]: nextItems };
      });
      return;
    }

    // different columns: onDragOver have done the inserting already
    // no need for extra calculation here
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
        {/* mobile backdrop */}
        <div
          className={`backdrop ${sidebarOpen ? 'show' : ''}`}
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />

        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebarInner">
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

        {/* Content */}
        <main className="content">
          <div className="contentHeader">
            <div className="contentTitle">{activeNav}</div>
            <div className="contentHint">跨列插入 + DragOverlay（demo）</div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
          >
            <div className="kanbanBoard" aria-label="Kanban board">
              {STATUSES.map((st) => {
                const ids = filteredColumns[st];
                return (
                  <KanbanColumn
                    key={st}
                    status={st}
                    title={statusTitle[st]}
                    count={columns[st].length} // use real-time data, not affected by search
                    itemIds={ids}
                  >
                    {ids.map((id) => (
                      <SortableTaskCard key={id} task={tasksById[id]} />
                    ))}
                  </KanbanColumn>
                );
              })}
            </div>

            {/* Drag overlay preview */}
            <DragOverlay dropAnimation={null}>
              {activeTask ? <TaskCard task={activeTask} overlay /> : null}
            </DragOverlay>
          </DndContext>
        </main>
      </div>
    </div>
  );
}

function KanbanColumn(props: {
  status: KanbanStatus;
  title: string;
  count: number;
  itemIds: string[];
  children: React.ReactNode;
}) {
  const { status, title, count, itemIds, children } = props;

  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section className="kanbanCol" aria-label={status}>
      <div className={`colHeader col-${status}`}>
        <div className="colTitle">{title}</div>
        <div className="colCount">{count}</div>
      </div>

      {/*  containerId -> status :: to identify over different containers */}
      <div ref={setNodeRef} className={`colBody ${isOver ? 'isOver' : ''}`}>
        <SortableContext
          id={status}
          items={itemIds}
          strategy={verticalListSortingStrategy}
        >
          {children}
        </SortableContext>

        {itemIds.length === 0 ? (
          <div className="emptyState">Drop here</div>
        ) : null}
      </div>
    </section>
  );
}

function SortableTaskCard({ task }: { task: Task }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.2 : 1, // once dragged, then ori position fades out
    // overlay :: used to floating card
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard
        task={task}
        dragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

function TaskCard({
  task,
  dragging,
  overlay,
  dragHandleProps,
}: {
  task: Task;
  dragging?: boolean;
  overlay?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}) {
  return (
    <article
      className={`taskCard ${dragging ? 'dragging' : ''} ${overlay ? 'overlay' : ''}`}
    >
      <div className="taskTop">
        <div className="taskTitle" title={task.title}>
          {clampText(task.title, 44)}
        </div>

        <button className="dragHandle" {...dragHandleProps} aria-label="Drag">
          ⠿
        </button>
      </div>

      {task.meta ? <div className="taskMeta">{task.meta}</div> : null}
    </article>
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
