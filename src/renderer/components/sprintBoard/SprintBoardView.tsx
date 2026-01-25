import React, {
  useMemo,
  useState,
  useImperativeHandle,
  forwardRef,
  useRef,
  useEffect,
} from 'react';
import './sprintboard.css';

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
import { useSprint } from '@/domain/sprintStore';
import { byId } from '@/config/sprintConfig.ts';
import { PriorityDef, StakeholderDef, StatusDef } from '@/domain/types';

/** ---------------- Config (future: load from file/db) ---------------- */
type StatusId = string;
type StakeholderId = string;
type PriorityId = string;

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
    const { state, actions } = useSprint();
    const { epics, tasksById, taskOrderByEpic, config } = state;

    const STATUS = config.statuses;
    const STAKEHOLDERS = config.stakeholders;
    const PRIORITIES = config.priorities;

    const statusMap = useMemo(() => byId(STATUS), [STATUS]);
    const stakeholderMap = useMemo(() => byId(STAKEHOLDERS), [STAKEHOLDERS]);
    const priorityMap = useMemo(() => byId(PRIORITIES), [PRIORITIES]);

    const isClosedStatus = (statusId: string) =>
      statusMap.get(statusId)?.toClose === true;

    /** ---- sort epics by priority (higher => left) ---- */
    const sortedEpics = useMemo(() => {
      const rank = (p: PriorityId) => priorityMap.get(p)?.rank ?? 999;
      return [...epics].sort((a, b) => rank(a.priorityId) - rank(b.priorityId));
    }, [epics, priorityMap]);

    const taskOrderRef = useRef(taskOrderByEpic);
    useEffect(() => {
      taskOrderRef.current = taskOrderByEpic;
    }, [taskOrderByEpic]);

    useEffect(() => {
      const epicId = state.ui?.scrollToEpicId;
      if (!epicId) return;

      const el = epicElMapRef.current[epicId];
      if (el) {
        el.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest',
        });

        // flash light -> highlight corresponding epic
        el.classList.add('flashTarget');
        window.setTimeout(() => el.classList.remove('flashTarget'), 700);
      }

      actions.clearScrollToEpic();
    }, [state.ui?.scrollToEpicId]);

    const dragOriginRef = useRef<DragOrigin | null>(null);

    const epicElMapRef = useRef<Record<string, HTMLElement | null>>({});

    /** ---- modal states ---- */
    const [epicModal, setEpicModal] = useState<EpicModalState>({ open: false });
    const [taskModal, setTaskModal] = useState<TaskModalState>({ open: false });

    function openCreateTask(defaultEpicId?: EpicId) {
      setTaskModal({ open: true, mode: 'create', defaultEpicId });
    }
    function openEditTask(taskId: TaskId) {
      setTaskModal({ open: true, mode: 'edit', taskId });
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
      setActiveId(e.active.id);
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

      const toList = taskOrderRef.current[toEpicId] ?? [];

      // insert position: if hovering a task -> before it; if hovering epic container -> end
      let insertIndex = toList.length;
      if (isTaskDndId(overSid)) {
        const overTaskId = parseTaskId(overSid);
        const idx = toList.indexOf(overTaskId);
        if (idx >= 0) insertIndex = idx;
      }

      actions.previewMoveTask({
        taskId,
        fromEpicId,
        toEpicId,
        toIndex: insertIndex,
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
        actions.moveTask({
          taskId,
          fromEpicId: origin.epicId,
          toEpicId,
          toIndex,
        });
      } else if (movedIndex) {
        actions.reorderTask({
          taskId,
          epicId: toEpicId,
          toIndex,
          fromIndex: origin.index,
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
        actions.createEpic({
          id: `e${Date.now()}`,
          title: payload.title,
          priorityId: payload.priorityId,
          statusId: payload.statusId,
        });
      } else if (epicModal.open && epicModal.mode === 'edit') {
        const id = epicModal.epicId;
        actions.updateEpic(id, {
          title: payload.title,
          priorityId: payload.priorityId,
          statusId: payload.statusId,
        });
      }
      setEpicModal({ open: false });
    }

    function deleteEpic(epicId: EpicId) {
      // delete epic + its tasks (simple strategy)
      actions.deleteEpic(epicId);
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
        actions.createTask({
          id: `t${Date.now()}`,
          epicId: payload.epicId,
          title: payload.title,
          statusId: payload.statusId,
          stakeholderId: isClosedStatus(payload.statusId)
            ? undefined
            : payload.stakeholderId,
        });
      } else if (taskModal.open && taskModal.mode === 'edit') {
        const id = taskModal.taskId;

        actions.updateTask(id, {
          epicId: payload.epicId,
          title: payload.title,
          statusId: payload.statusId,
          stakeholderId: isClosedStatus(payload.statusId)
            ? undefined
            : payload.stakeholderId,
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

      actions.deleteTask(taskId);

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
                  priorityMap={priorityMap}
                  statusMap={statusMap}
                  setColRef={(node) => {
                    epicElMapRef.current[epic.id] = node;
                  }}
                >
                  {ids.map((tid) => (
                    <SortableTaskCard
                      key={tid}
                      task={tasksById[tid]}
                      onOpen={() => openEditTask(tid)}
                      isClosedStatus={isClosedStatus}
                      statusMap={statusMap}
                      stakeholderMap={stakeholderMap}
                    />
                  ))}
                </EpicColumn>
              );
            })}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeTask ? (
              <TaskCard
                task={activeTask}
                statusMap={statusMap}
                stakeholderMap={stakeholderMap}
                overlay
              />
            ) : null}
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
            priorities={PRIORITIES}
            statuses={STATUS}
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
            statuses={STATUS}
            stakeholders={STAKEHOLDERS}
            isClosedStatus={isClosedStatus}
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
  priorityMap: Map<string, PriorityDef>;
  statusMap: Map<string, StatusDef>;
  setColRef?: (node: HTMLElement | null) => void;
}) {
  const {
    epic,
    taskIds,
    children,
    onEditEpic,
    onCreateTask,
    totalCount,
    closedCount,
    priorityMap,
    statusMap,
  } = props;

  // column droppable for “drop to empty space”
  const { setNodeRef, isOver } = useDroppable({ id: epicDndId(epic.id) });

  const pr = priorityMap.get(epic.priorityId)?.label ?? epic.priorityId;
  const st = statusMap.get(epic.statusId);

  return (
    <section ref={props.setColRef} className="epicCol" aria-label={epic.title}>
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

function SortableTaskCard(props: {
  task: Task;
  onOpen: () => void;
  isClosedStatus: (id: string) => boolean;
  statusMap: Map<string, any>;
  stakeholderMap: Map<string, any>;
}) {
  const dndId = taskDndId(props.task.id);
  const isClosed = props.isClosedStatus(props.task.statusId);

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
        statusMap={props.statusMap}
        stakeholderMap={props.stakeholderMap}
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
  statusMap: Map<string, StatusDef>;
  stakeholderMap: Map<string, StakeholderDef>;
}) {
  const {
    task,
    onOpen,
    dragging,
    overlay,
    dragHandleProps,
    dragDisabled,
    closed,
    statusMap,
    stakeholderMap,
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
  priorities: { id: string; label: string }[];
  statuses: { id: string; label: string }[];
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
          {props.priorities.map((p) => (
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
          {props.statuses.map((s) => (
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
  statuses: { id: string; label: string }[];
  stakeholders: { id: string; label: string }[];
  isClosedStatus: (id: string) => boolean;
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

  const isClosed = props.isClosedStatus(statusId);

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
          {props.statuses.map((s) => (
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
          {props.stakeholders.map((p) => (
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
