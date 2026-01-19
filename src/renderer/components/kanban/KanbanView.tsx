import React, { useMemo, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  UniqueIdentifier,
  useSensor,
  useSensors,
  DragOverlay,
  closestCenter,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type KanbanStatus = 'TODO' | 'WIP' | 'QA' | 'DONE';
type Task = { id: string; title: string; status: KanbanStatus; meta?: string };

const STATUSES: KanbanStatus[] = ['TODO', 'WIP', 'QA', 'DONE'];
const statusTitle: Record<KanbanStatus, string> = {
  TODO: 'TODO',
  WIP: 'WIP',
  QA: 'QA',
  DONE: 'DONE',
};

function isStatus(x: any): x is KanbanStatus {
  return x === 'TODO' || x === 'WIP' || x === 'QA' || x === 'DONE';
}

export default function KanbanView() {
  // TODO: --- mock data ---
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

  // --- dnd sensors ---
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const activeTask = useMemo(() => {
    if (!activeId) return null;
    return tasksById[String(activeId)] ?? null;
  }, [activeId, tasksById]);

  function findContainer(id: UniqueIdentifier): KanbanStatus | null {
    const sid = String(id);
    if (isStatus(sid)) return sid;
    for (const st of STATUSES) {
      if (columns[st].includes(sid)) return st;
    }
    return null;
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(e.active.id);
  }

  // insert over columns:
  // insert activeId to target column when hover to other column
  // :: position = over item pos || end）
  function onDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;

    const from = findContainer(active.id);
    const to = findContainer(over.id);
    if (!from || !to) return;
    if (from === to) return;

    const activeTaskId = String(active.id);
    const overId = String(over.id);

    setColumns((prev) => {
      const next = { ...prev };
      const fromItems = [...next[from]];
      const toItems = [...next[to]];

      const fromIndex = fromItems.indexOf(activeTaskId);
      if (fromIndex === -1) return prev;

      fromItems.splice(fromIndex, 1);

      const overIndex = isStatus(overId) ? -1 : toItems.indexOf(overId);
      const insertIndex = overIndex >= 0 ? overIndex : toItems.length;
      toItems.splice(insertIndex, 0, activeTaskId);

      next[from] = fromItems;
      next[to] = toItems;
      return next;
    });

    setTasksById((prev) => {
      const t = prev[activeTaskId];
      if (!t || t.status === to) return prev;
      return { ...prev, [activeTaskId]: { ...t, status: to } };
    });
  }

  // sort in same column: END :: arrayMove
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;

    const from = findContainer(active.id);
    const to = findContainer(over.id);
    if (!from || !to) return;

    if (from === to) {
      const activeIdStr = String(active.id);
      const overIdStr = String(over.id);

      setColumns((prev) => {
        const items = [...prev[from]];
        const oldIndex = items.indexOf(activeIdStr);
        const newIndex = items.indexOf(overIdStr);
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex)
          return prev;

        return { ...prev, [from]: arrayMove(items, oldIndex, newIndex) };
      });
    }
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="kanbanBoard" aria-label="Kanban board">
          {STATUSES.map((st) => {
            const ids = columns[st];
            return (
              <KanbanColumn
                key={st}
                status={st}
                title={statusTitle[st]}
                count={columns[st].length}
                itemIds={ids}
              >
                {ids.map((id) => (
                  <SortableTaskCard key={id} task={tasksById[id]} />
                ))}
              </KanbanColumn>
            );
          })}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask ? <TaskCard task={activeTask} overlay /> : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}

/* ------------------ Components ------------------ */

function KanbanColumn(props: {
  status: KanbanStatus;
  title: string;
  count: number;
  itemIds: string[];
  children: React.ReactNode;
}) {
  const { status, title, count, itemIds, children } = props;

  // baocheng notes: to make column body droppable
  // or cannot drag item to empty column
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section className="kanbanCol" aria-label={status}>
      <div className={`colHeader col-${status}`}>
        <div className="colTitle">{title}</div>
        <div className="colCount">{count}</div>
      </div>

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

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.2 : 1,
      }}
    >
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
          {task.title}
        </div>
        <button className="dragHandle" {...dragHandleProps} aria-label="Drag">
          ⠿
        </button>
      </div>
      {task.meta ? <div className="taskMeta">{task.meta}</div> : null}
    </article>
  );
}
