import React, {
  useMemo,
  useState,
  useImperativeHandle,
  forwardRef,
  useRef,
  useEffect,
} from 'react';
import './sprintboard.css';
import { InMemoryEventStore } from '@/domain/eventStore';
import { nowISO, uid } from '@/domain/utils';
import type { SprintEvent } from '@/domain/event';

import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  UniqueIdentifier,
  closestCenter,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { loadSprintConfig, byId } from '@/config/sprintConfig.ts';

/** ---------------- Config (future: load from file/db) ---------------- */
type StatusId = string;
type StakeholderId = string;
type PriorityId = string;

const CFG = loadSprintConfig();
const STATUS = CFG.statuses;
const STAKEHOLDERS = CFG.stakeholders;
const PRIORITIES = CFG.priorities;

const statusMap = byId(STATUS);
const stakeholderMap = byId(STAKEHOLDERS);
const priorityMap = byId(PRIORITIES);

const isClosedStatus = (statusId: string) => {
  return statusMap.get(statusId)?.toClose === true;
};

/** ---------------- Data model ---------------- */
type EpicId = string;
type TaskId = string;

type Epic = {
  id: EpicId;
  title: string;
  priorityId: PriorityId;
  statusId: StatusId; // Epic Status (manual / aggregate from tasks)
};

type Task = {
  id: TaskId;
  epicId: EpicId;
  title: string;
  statusId: StatusId;
  stakeholderId?: StakeholderId; // not required if DONE
};

type TasksById = Record<TaskId, Task>;
type TaskOrderByEpic = Record<EpicId, TaskId[]>;

type DragOrigin = { taskId: string; epicId: string; index: number };

/** dnd ids (avoid conflicts with epic/task id) */
const epicDndId = (id: EpicId) => `epic:${id}`;
const taskDndId = (id: TaskId) => `task:${id}`;
const isEpicDndId = (id: string) => id.startsWith('epic:');
const isTaskDndId = (id: string) => id.startsWith('task:');
const parseEpicId = (id: string) => id.replace('epic:', '');
const parseTaskId = (id: string) => id.replace('task:', '');

type EpicModalState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; epicId: EpicId };

type TaskModalState =
  | { open: false }
  | { open: true; mode: 'create'; defaultEpicId?: EpicId }
  | { open: true; mode: 'edit'; taskId: TaskId };

export type SprintBoardHandle = {
  openCreateEpic: () => void;
  openCreateTask: () => void;
};

const SprintBoardView = forwardRef<SprintBoardHandle>(
  function SprintBoardView(_props, ref) {
    /** ---- Hardcoded initial data (future: load) ---- */
    const [epics, setEpics] = useState<Epic[]>([
      { id: 'e1', title: 'UIv3', priorityId: 'P0', statusId: 'WIP' },
      { id: 'e2', title: 'Lobby Refresh', priorityId: 'P1', statusId: 'QA' },
      {
        id: 'e3',
        title: 'Tech Debt Cleanup',
        priorityId: 'P2',
        statusId: 'TODO',
      },
    ]);

    const [tasksById, setTasksById] = useState<TasksById>({
      t1: {
        id: 't1',
        epicId: 'e1',
        title: 'Game Of Queen – Implement core UI',
        statusId: 'WIP',
        stakeholderId: 'ME',
      },
      t2: {
        id: 't2',
        epicId: 'e1',
        title:
          'Game Of King – Waiting for final art assets (icons + background)',
        statusId: 'BLOCKED',
        stakeholderId: 'ART',
      },
      t3: {
        id: 't3',
        epicId: 'e1',
        title: 'Integrate i18n copy',
        statusId: 'TODO',
        stakeholderId: 'COPY',
      },

      t4: {
        id: 't4',
        epicId: 'e2',
        title: 'Lobby layout polish',
        statusId: 'QA',
        stakeholderId: 'QA',
      },
      t5: {
        id: 't5',
        epicId: 'e2',
        title: 'Fix iPad scaling regression when rotating device orientation',
        statusId: 'WIP',
        stakeholderId: 'DEV',
      },
      t6: {
        id: 't6',
        epicId: 'e2',
        title: 'Main menu animation cleanup',
        statusId: 'DONE',
      },

      t7: {
        id: 't7',
        epicId: 'e3',
        title: 'Remove redundant getComponent calls via @property injection',
        statusId: 'TODO',
        stakeholderId: 'ME',
      },
    });

    const [taskOrderByEpic, setTaskOrderByEpic] = useState<TaskOrderByEpic>({
      e1: ['t1', 't2', 't3'],
      e2: ['t4', 't5', 't6'],
      e3: ['t7'],
    });

    /** ---- sort epics by priority (higher => left) ---- */
    const sortedEpics = useMemo(() => {
      const rank = (p: PriorityId) => priorityMap.get(p)?.rank ?? 999;
      return [...epics].sort((a, b) => rank(a.priorityId) - rank(b.priorityId));
    }, [epics]);

    const taskOrderRef = useRef(taskOrderByEpic);
    useEffect(() => {
      taskOrderRef.current = taskOrderByEpic;
    }, [taskOrderByEpic]);

    const dragOriginRef = useRef<DragOrigin | null>(null);

    /** ---- modal states ---- */
    const [epicModal, setEpicModal] = useState<EpicModalState>({ open: false });
    const [taskModal, setTaskModal] = useState<TaskModalState>({ open: false });

    function openCreateTask(defaultEpicId?: EpicId) {
      setTaskModal({ open: true, mode: 'create', defaultEpicId });
    }
    function openEditTask(taskId: TaskId) {
      setTaskModal({ open: true, mode: 'edit', taskId });
    }

    /* ---- event engine ---- */
    const eventStoreRef = useRef<InMemoryEventStore | null>(null);

    if (!eventStoreRef.current) {
      eventStoreRef.current = new InMemoryEventStore();
    }

    const eventStore = eventStoreRef.current;

    function emitEvent(e: Omit<SprintEvent, 'id' | 'ts'>) {
      const full: SprintEvent = {
        ...e,
        id: uid(),
        ts: nowISO(),
      };

      eventStore.append(full);

      // Dev 模式可视化
      if (process.env.NODE_ENV !== 'production') {
        console.log('[SPRINT EVENT]', full);
      }
    }

    // expose set methods to Outer Components;
    // Content header buttons will call
    /* baocheng notes: TODO: may migrate to Redux in future */
    useImperativeHandle(ref, () => ({
      openCreateEpic,
      openCreateTask,
    }));

    /** ---- DnD ---- */
    const sensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    );
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

    const activeTask = useMemo(() => {
      if (!activeId) return null;
      const id = String(activeId);
      if (!isTaskDndId(id)) return null;
      const tid = parseTaskId(id);
      return tasksById[tid] ?? null;
    }, [activeId, tasksById]);

    function findEpicContainerByDndId(id: UniqueIdentifier): EpicId | null {
      const sid = String(id);
      if (isEpicDndId(sid)) return parseEpicId(sid);
      if (isTaskDndId(sid)) {
        const tid = parseTaskId(sid);
        return tasksById[tid]?.epicId ?? null;
      }
      return null;
    }

    function onDragStart(e: DragStartEvent) {
      const sid = String(e.active.id);
      if (!isTaskDndId(sid)) return;

      const taskId = parseTaskId(sid);
      const epicId = findEpicContainerByDndId(e.active.id);
      if (!epicId) return;

      const list = taskOrderRef.current[epicId] ?? [];
      dragOriginRef.current = { taskId, epicId, index: list.indexOf(taskId) };
    }

    function onDragOver(e: DragOverEvent) {
      const { active, over } = e;
      if (!over) return;

      const activeSid = String(active.id);
      const overSid = String(over.id);

      if (!isTaskDndId(activeSid)) return; // only tasks are draggable

      const fromEpicId = findEpicContainerByDndId(active.id);
      const toEpicId = findEpicContainerByDndId(over.id);

      if (!fromEpicId || !toEpicId) return;
      if (fromEpicId === toEpicId) return;

      const taskId = parseTaskId(activeSid);

      setTaskOrderByEpic((prev) => {
        const next = { ...prev };
        const fromList = [...(next[fromEpicId] ?? [])];
        const toList = [...(next[toEpicId] ?? [])];

        const fromIndex = fromList.indexOf(taskId);
        if (fromIndex === -1) return prev;

        fromList.splice(fromIndex, 1);

        // insert position: if hovering a task -> before it; if hovering epic container -> end
        let insertIndex = toList.length;
        if (isTaskDndId(overSid)) {
          const overTaskId = parseTaskId(overSid);
          const idx = toList.indexOf(overTaskId);
          if (idx >= 0) insertIndex = idx;
        }
        toList.splice(insertIndex, 0, taskId);

        next[fromEpicId] = fromList;
        next[toEpicId] = toList;
        return next;
      });

      // update task epicId
      setTasksById((prev) => {
        const t = prev[taskId];
        if (!t) return prev;
        if (t.epicId === toEpicId) return prev;
        return { ...prev, [taskId]: { ...t, epicId: toEpicId } };
      });
    }

    function onDragEnd(e: DragEndEvent) {
      const { active, over } = e;
      setActiveId(null);

      const origin = dragOriginRef.current;
      dragOriginRef.current = null;
      if (!over || !origin) return;

      const activeSid = String(active.id);
      const overSid = String(over.id);
      if (!isTaskDndId(activeSid)) return;

      const taskId = parseTaskId(activeSid);

      const toEpicId = findEpicContainerByDndId(over.id);
      if (!toEpicId) return;

      const toList = taskOrderRef.current[toEpicId] ?? [];
      const toIndex = toList.indexOf(taskId);

      const epicId = findEpicContainerByDndId(active.id);
      const overEpicId = findEpicContainerByDndId(over.id);
      if (!epicId || !overEpicId) return;

      const movedEpic = origin.epicId !== toEpicId;
      const movedIndex = origin.index !== toIndex;

      if (movedEpic) {
        emitEvent({
          entity: { type: 'task', id: taskId },
          action: 'move',
          meta: {
            fromEpicId: origin.epicId,
            toEpicId,
            fromIndex: origin.index,
            toIndex,
          },
        });
      } else if (movedIndex) {
        emitEvent({
          entity: { type: 'task', id: taskId },
          action: 'reorder',
          meta: { epicId: toEpicId, fromIndex: origin.index, toIndex },
        });
      }
    }

    /** ---------------- CRUD: Epics ---------------- */
    function openCreateEpic() {
      setEpicModal({ open: true, mode: 'create' });
    }
    function openEditEpic(epicId: EpicId) {
      setEpicModal({ open: true, mode: 'edit', epicId });
    }

    function saveEpic(payload: {
      epicId?: EpicId;
      title: string;
      priorityId: PriorityId;
      statusId: StatusId;
    }) {
      if (epicModal.open && epicModal.mode === 'create') {
        const id = `e${Date.now()}`;
        const newEpic: Epic = {
          id,
          title: payload.title,
          priorityId: payload.priorityId,
          statusId: payload.statusId,
        };
        setEpics((prev) => [...prev, newEpic]);
        setTaskOrderByEpic((prev) => ({ ...prev, [id]: [] }));
      } else if (epicModal.open && epicModal.mode === 'edit') {
        const id = epicModal.epicId;
        setEpics((prev) =>
          prev.map((e) =>
            e.id === id
              ? {
                  ...e,
                  title: payload.title,
                  priorityId: payload.priorityId,
                  statusId: payload.statusId,
                }
              : e,
          ),
        );
      }
      setEpicModal({ open: false });
    }

    function deleteEpic(epicId: EpicId) {
      // delete epic + its tasks (simple strategy)
      setEpics((prev) => prev.filter((e) => e.id !== epicId));

      const taskIds = taskOrderByEpic[epicId] ?? [];
      setTasksById((prev) => {
        const next = { ...prev };
        taskIds.forEach((tid) => delete next[tid]);
        return next;
      });

      setTaskOrderByEpic((prev) => {
        const next = { ...prev };
        delete next[epicId];
        return next;
      });

      setEpicModal({ open: false });
    }

    /** ---------------- CRUD: Tasks ---------------- */

    function moveToBottom(list: string[], id: string) {
      const next = list.filter((x) => x !== id);
      next.push(id);
      return next;
    }

    function moveToEndOfNonDone(
      list: string[],
      id: string,
      tasksById: Record<string, { statusId: string }>,
    ) {
      const without = list.filter((x) => x !== id);

      // find the first DONE position
      const firstDoneIndex = without.findIndex(
        (tid) => tasksById[tid]?.statusId === 'DONE',
      );
      const insertIndex =
        firstDoneIndex === -1 ? without.length : firstDoneIndex;

      const next = [...without];
      next.splice(insertIndex, 0, id);
      return next;
    }

    function saveTask(payload: {
      taskId?: TaskId;
      epicId: EpicId;
      title: string;
      statusId: StatusId;
      stakeholderId?: StakeholderId;
    }) {
      const isDone = payload.statusId === 'DONE';
      const stakeholderId = isDone ? undefined : payload.stakeholderId;

      if (taskModal.open && taskModal.mode === 'create') {
        const id = `t${Date.now()}`;
        const t: Task = {
          id,
          epicId: payload.epicId,
          title: payload.title,
          statusId: payload.statusId,
          stakeholderId,
        };
        setTasksById((prev) => ({ ...prev, [id]: t }));
        setTaskOrderByEpic((prev) => ({
          ...prev,
          [payload.epicId]: [...(prev[payload.epicId] ?? []), id],
        }));
        emitEvent({
          entity: { type: 'task', id: id },
          action: 'create',
          diff: {
            after: {
              title: t.title,
              epicId: t.epicId,
              statusId: t.statusId,
              stakeholderId: t.stakeholderId,
            },
          },
        });
      } else if (taskModal.open && taskModal.mode === 'edit') {
        const id = taskModal.taskId;
        const prevTask = tasksById[id];
        if (!prevTask) {
          setTaskModal({ open: false });
          return;
        }

        emitEvent({
          entity: { type: 'task', id: id },
          action: 'update',
          diff: {
            before: {
              title: prevTask.title,
              statusId: prevTask.statusId,
              stakeholderId: prevTask.stakeholderId,
              epicId: prevTask.epicId,
            },
            after: {
              title: payload.title,
              epicId: payload.epicId,
              statusId: payload.statusId,
              stakeholderId: payload.stakeholderId,
            },
          },
        });

        const prevStatus = prevTask.statusId;
        const nextStatus = payload.statusId;

        const prevEpicId = prevTask.epicId;
        const nextEpicId = payload.epicId;

        // if epic changed, move order lists
        if (prevEpicId !== nextEpicId) {
          setTaskOrderByEpic((prev) => {
            const next = { ...prev };
            next[prevEpicId] = (next[prevEpicId] ?? []).filter((x) => x !== id);
            next[nextEpicId] = [...(next[nextEpicId] ?? []), id]; // append frist
            return next;
          });
        }

        // then update tasksById (state change first)
        setTasksById((prev) => {
          const nextTasks = {
            ...prev,
            [id]: {
              ...prev[id],
              epicId: nextEpicId,
              title: payload.title,
              statusId: nextStatus,
              stakeholderId,
            },
          };

          setTaskOrderByEpic((prevOrder) => {
            const nextOrder = { ...prevOrder };

            // make sure it is already in the nextEpicId list
            // if epic is changed, can do the moving first
            if (prevEpicId !== nextEpicId) {
              nextOrder[prevEpicId] = (nextOrder[prevEpicId] ?? []).filter(
                (x) => x !== id,
              );
              nextOrder[nextEpicId] = [...(nextOrder[nextEpicId] ?? []), id];
            }

            if (prevStatus !== nextStatus) {
              if (nextStatus === 'DONE') {
                nextOrder[nextEpicId] = moveToBottom(
                  nextOrder[nextEpicId] ?? [],
                  id,
                );
              } else if (prevStatus === 'DONE') {
                nextOrder[nextEpicId] = moveToEndOfNonDone(
                  nextOrder[nextEpicId] ?? [],
                  id,
                  nextTasks,
                );
              }
            }

            return nextOrder;
          });

          return nextTasks;
        });
      }

      setTaskModal({ open: false });
    }

    function deleteTask(taskId: TaskId) {
      const t = tasksById[taskId];
      if (!t) {
        setTaskModal({ open: false });
        return;
      }

      emitEvent({
        entity: { type: 'task', id: taskId },
        action: 'delete',
        diff: {
          before: { ...tasksById[taskId] },
        },
      });

      setTasksById((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });

      setTaskOrderByEpic((prev) => ({
        ...prev,
        [t.epicId]: (prev[t.epicId] ?? []).filter((x) => x !== taskId),
      }));

      setTaskModal({ open: false });
    }

    /** ---------------- Render ---------------- */
    return (
      <div className="sprintRoot">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          <div className="sprintBoard" aria-label="Sprint board">
            {sortedEpics.map((epic) => {
              const ids = taskOrderByEpic[epic.id] ?? [];
              const totalCount = ids.length;
              const closedCount = ids.reduce(
                (acc, tid) =>
                  acc + (isClosedStatus(tasksById[tid]?.statusId) ? 1 : 0),
                0,
              );
              return (
                <EpicColumn
                  key={epic.id}
                  epic={epic}
                  taskIds={ids}
                  onEditEpic={() => openEditEpic(epic.id)}
                  onCreateTask={() => openCreateTask(epic.id)}
                  totalCount={totalCount}
                  closedCount={closedCount}
                >
                  {ids.map((tid) => (
                    <SortableTaskCard
                      key={tid}
                      task={tasksById[tid]}
                      onOpen={() => openEditTask(tid)}
                    />
                  ))}
                </EpicColumn>
              );
            })}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeTask ? <TaskCard task={activeTask} overlay /> : null}
          </DragOverlay>
        </DndContext>

        {/* Modals */}
        {epicModal.open ? (
          <EpicModal
            mode={epicModal.mode}
            epic={
              epicModal.mode === 'edit'
                ? (epics.find((e) => e.id === epicModal.epicId) ?? null)
                : null
            }
            onClose={() => setEpicModal({ open: false })}
            onSave={(v) => saveEpic(v)}
            onDelete={(epicId) => deleteEpic(epicId)}
          />
        ) : null}

        {taskModal.open ? (
          <TaskModal
            mode={taskModal.mode}
            epics={epics}
            defaultEpicId={
              taskModal.mode === 'create' ? taskModal.defaultEpicId : undefined
            }
            task={
              taskModal.mode === 'edit'
                ? (tasksById[taskModal.taskId] ?? null)
                : null
            }
            onClose={() => setTaskModal({ open: false })}
            onSave={(v) => saveTask(v)}
            onDelete={(taskId) => deleteTask(taskId)}
          />
        ) : null}
      </div>
    );
  },
);

export default SprintBoardView;

/** ---------------- UI Components ---------------- */

function EpicColumn(props: {
  epic: Epic;
  taskIds: TaskId[];
  children: React.ReactNode;
  onEditEpic: () => void;
  onCreateTask: () => void;
  totalCount: number;
  closedCount: number;
}) {
  const {
    epic,
    taskIds,
    children,
    onEditEpic,
    onCreateTask,
    totalCount,
    closedCount,
  } = props;

  // column droppable for “drop to empty space”
  const { setNodeRef, isOver } = useDroppable({ id: epicDndId(epic.id) });

  const pr = priorityMap.get(epic.priorityId)?.label ?? epic.priorityId;
  const st = statusMap.get(epic.statusId);

  return (
    <section className="epicCol" aria-label={epic.title}>
      {/* sticky header */}
      <div className={`epicHeader ${isOver ? 'isOver' : ''}`}>
        <div className="epicHeaderTop">
          <div className="epicTitleRow">
            <div className="epicTitleClamp" title={epic.title}>
              {epic.title}
            </div>

            <div
              className="epicProgress"
              title={`${closedCount}/${totalCount} closed`}
            >
              {closedCount}/{totalCount}
            </div>
          </div>

          {/* pen icon */}
          <button
            className="iconMini"
            onClick={onEditEpic}
            aria-label="Edit Epic"
            title="Edit Epic"
          >
            ⋮
          </button>
        </div>

        <div className="epicMeta">
          <span className={`pill tone-${st?.tone ?? 'gray'}`}>
            {st?.label ?? epic.statusId}
          </span>
          <span className="pill outline">{pr}</span>
          <button className="linkMini" onClick={onCreateTask}>
            + Task
          </button>
        </div>
      </div>

      <div ref={setNodeRef} className="epicBody">
        <SortableContext
          items={taskIds.map(taskDndId)}
          strategy={verticalListSortingStrategy}
        >
          {children}
        </SortableContext>

        {taskIds.length === 0 ? (
          <div className="emptyHint">Drop task here</div>
        ) : null}
      </div>
    </section>
  );
}

function SortableTaskCard(props: { task: Task; onOpen: () => void }) {
  const dndId = taskDndId(props.task.id);
  const isClosed = isClosedStatus(props.task.statusId);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: dndId,
    disabled: isClosed,
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
        task={props.task}
        onOpen={props.onOpen}
        dragging={isDragging}
        dragHandleProps={isClosed ? undefined : { ...attributes, ...listeners }}
        // if task is DONE then don't bind handle to drag
        dragDisabled={isClosed}
        closed={isClosed}
      />
    </div>
  );
}

function TaskCard(props: {
  task: Task;
  onOpen?: () => void;
  dragging?: boolean;
  overlay?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  dragDisabled?: boolean;
  closed?: boolean;
}) {
  const {
    task,
    onOpen,
    dragging,
    overlay,
    dragHandleProps,
    dragDisabled,
    closed,
  } = props;

  const st = statusMap.get(task.statusId);
  const stakeholder = task.stakeholderId
    ? stakeholderMap.get(task.stakeholderId)?.label
    : null;
  const showStakeholder = task.statusId !== 'DONE';

  return (
    <article
      className={`taskCard2  ${dragging ? 'dragging' : ''} ${overlay ? 'overlay' : ''} ${closed ? 'closed' : ''}`}
    >
      <div className="taskRow">
        {/* title clickable; hover shows full title */}
        <button className="taskTitleBtn" onClick={onOpen} title={task.title}>
          <span className={`taskTitleClamp ${closed ? 'strike' : ''}`}>
            {task.title}
          </span>
        </button>

        {/* drag handle only */}
        <button
          className={`dragHandle2 ${dragDisabled ? 'disabled' : ''}`}
          {...(dragHandleProps ?? {})}
          aria-label={dragDisabled ? 'Drag disabled' : 'Drag'}
          title={dragDisabled ? 'DONE tasks cannot be dragged' : 'Drag'}
          disabled={dragDisabled}
        >
          ⠿
        </button>
      </div>

      <div className="taskRow taskMetaRow">
        {/* status only as colored pill (no redundant “Status: WIP” text) */}
        <span className={`pill tone-${st?.tone ?? 'gray'}`}>
          {st?.label ?? task.statusId}
        </span>

        {/* stakeholder only when not DONE */}
        {showStakeholder ? (
          <span className="pill outline">
            {stakeholder ? `Stuck at: ${stakeholder}` : 'Stuck at: —'}
          </span>
        ) : null}
      </div>
    </article>
  );
}

/** ---------------- Modals (400x300) ---------------- */

function EpicModal(props: {
  mode: 'create' | 'edit';
  epic: Epic | null;
  onClose: () => void;
  onSave: (v: {
    epicId?: EpicId;
    title: string;
    priorityId: PriorityId;
    statusId: StatusId;
  }) => void;
  onDelete: (epicId: EpicId) => void;
}) {
  const isEdit = props.mode === 'edit';
  const [title, setTitle] = useState(props.epic?.title ?? '');
  const [priorityId, setPriorityId] = useState<PriorityId>(
    props.epic?.priorityId ?? 'P2',
  );
  const [statusId, setStatusId] = useState<StatusId>(
    props.epic?.statusId ?? 'TODO',
  );

  return (
    <ModalShell
      title={isEdit ? 'Edit Epic' : 'Create Epic'}
      onClose={props.onClose}
    >
      <div className="formRow">
        <label className="label">Epic Name</label>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. UIv3"
        />
      </div>

      <div className="formRow">
        <label className="label">Priority</label>
        <select
          className="select"
          value={priorityId}
          onChange={(e) => setPriorityId(e.target.value)}
        >
          {PRIORITIES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="formRow">
        <label className="label">Epic Status</label>
        <select
          className="select"
          value={statusId}
          onChange={(e) => setStatusId(e.target.value)}
        >
          {STATUS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="modalActions">
        {isEdit && props.epic ? (
          <button
            className="btnDanger"
            onClick={() => props.onDelete(props.epic!.id)}
          >
            Delete
          </button>
        ) : (
          <div />
        )}

        <div className="actionsRight">
          <button className="btnGhost" onClick={props.onClose}>
            Cancel
          </button>
          <button
            className="btnPrimary"
            onClick={() =>
              props.onSave({
                epicId: props.epic?.id,
                title: title.trim(),
                priorityId,
                statusId,
              })
            }
            disabled={!title.trim()}
          >
            Save
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function TaskModal(props: {
  mode: 'create' | 'edit';
  task: Task | null;
  epics: Epic[];
  defaultEpicId?: EpicId;
  onClose: () => void;
  onSave: (v: {
    taskId?: TaskId;
    epicId: EpicId;
    title: string;
    statusId: StatusId;
    stakeholderId?: StakeholderId;
  }) => void;
  onDelete: (taskId: TaskId) => void;
}) {
  const isEdit = props.mode === 'edit';

  const [title, setTitle] = useState(props.task?.title ?? '');
  const [epicId, setEpicId] = useState<EpicId>(
    props.task?.epicId ?? props.defaultEpicId ?? props.epics[0]?.id ?? 'e1',
  );
  const [statusId, setStatusId] = useState<StatusId>(
    props.task?.statusId ?? 'TODO',
  );
  const [stakeholderId, setStakeholderId] = useState<StakeholderId>(
    props.task?.stakeholderId ?? 'ME',
  );

  const isClosed = isClosedStatus(statusId);

  return (
    <ModalShell
      title={isEdit ? 'Edit Task' : 'Create Task'}
      onClose={props.onClose}
    >
      <div className="formRow">
        <label className="label">Title</label>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
        />
      </div>

      <div className="formRow">
        <label className="label">Epic</label>
        <select
          className="select"
          value={epicId}
          onChange={(e) => setEpicId(e.target.value)}
        >
          {props.epics.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
      </div>

      <div className="formRow">
        <label className="label">Status</label>
        <select
          className="select"
          value={statusId}
          onChange={(e) => setStatusId(e.target.value)}
        >
          {STATUS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="formRow">
        <label className="label">Stakeholder</label>
        <select
          className="select"
          value={stakeholderId}
          onChange={(e) => setStakeholderId(e.target.value)}
          disabled={isClosed}
          title={isClosed ? 'Closed tasks do not require stakeholder' : ''}
        >
          {STAKEHOLDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="modalActions">
        {isEdit && props.task ? (
          <button
            className="btnDanger"
            onClick={() => props.onDelete(props.task!.id)}
          >
            Delete
          </button>
        ) : (
          <div />
        )}

        <div className="actionsRight">
          <button className="btnGhost" onClick={props.onClose}>
            Cancel
          </button>
          <button
            className="btnPrimary"
            onClick={() =>
              props.onSave({
                taskId: props.task?.id,
                epicId,
                title: title.trim(),
                statusId,
                stakeholderId: isClosed ? undefined : stakeholderId,
              })
            }
            disabled={!title.trim() || !epicId}
          >
            Save
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function ModalShell(props: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="modalBackdrop" onMouseDown={props.onClose}>
      <div
        className="modal"
        style={{ width: 400, height: 300 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modalHeader">
          <div className="modalTitle">{props.title}</div>
          <button
            className="iconMini"
            onClick={props.onClose}
            aria-label="Close"
            title="Close"
          >
            ✕
          </button>
        </div>
        <div className="modalBody">{props.children}</div>
      </div>
    </div>
  );
}
