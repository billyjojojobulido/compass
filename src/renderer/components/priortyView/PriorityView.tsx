// src/views/PriorityView/PriorityView.tsx
import React, { useMemo, useState, useEffect } from 'react';
import './priorityView.css';
import { useSprint } from '@/domain/sprintStore';
import {
  selectPriorityGroups,
  selectBlockedStats,
  selectFocusEpics,
  type PriorityGroupVM,
  type EpicCardVM,
} from '@/domain/projections/priorityProjections';

type DrawerMode =
  | { open: false }
  | { open: true; mode: 'edit'; epicId: string }
  | { open: true; mode: 'create' };

export default function PriorityView({
  onRedirect,
}: {
  onRedirect: (string) => void;
}) {
  const { state, actions } = useSprint();
  const { epics, config } = state;

  const groups = useMemo(() => selectPriorityGroups(state), [state]);

  const defaults = useMemo(
    () => selectFocusEpics(state.events, state),
    [state],
  );

  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<DrawerMode>({ open: false });

  useEffect(() => {
    if (selectedEpicId) return;
    if (defaults.defaultEpicId) setSelectedEpicId(defaults.defaultEpicId);
  }, [defaults.defaultEpicId, selectedEpicId]);

  const selectedEpic = useMemo(() => {
    if (!selectedEpicId) return null;
    return epics.find((e) => e.id === selectedEpicId) ?? null;
  }, [epics, selectedEpicId]);

  const priorityMap = useMemo(() => {
    return new Map(config.priorities.map((p) => [p.id, p]));
  }, [config.priorities]);

  function openCreate() {
    setDrawer({ open: true, mode: 'create' });
  }
  function openEdit(epicId: string) {
    setSelectedEpicId(epicId);
    setDrawer({ open: true, mode: 'edit', epicId });
  }
  function closeDrawer() {
    setDrawer({ open: false });
  }

  function handleSaveEpic(payload: {
    epicId?: string;
    title: string;
    priorityId: string;
    statusId: string;
  }) {
    if (drawer.open && drawer.mode === 'create') {
      actions.createEpic({
        id: `e${Date.now()}`,
        title: payload.title,
        priorityId: payload.priorityId,
        statusId: payload.statusId,
      });
    } else if (drawer.open && drawer.mode === 'edit' && drawer.epicId) {
      actions.updateEpic(drawer.epicId, {
        title: payload.title,
        priorityId: payload.priorityId,
        statusId: payload.statusId,
      });
    }
    closeDrawer();
  }

  function handleDeleteEpic(epicId: string) {
    actions.deleteEpic(epicId);
    if (selectedEpicId === epicId) setSelectedEpicId(null);
    closeDrawer();
  }

  return (
    <div className="pvRoot">
      <div className="pvLayout">
        {/* LEFT: ladder */}
        <div className="pvLadder" aria-label="Priority ladder">
          {groups.map((g) => (
            <PriorityLane
              key={g.priorityId}
              group={g}
              selectedEpicId={selectedEpicId}
              onSelect={(id) => setSelectedEpicId(id)}
              onEdit={(id) => openEdit(id)}
              onRedirect={(id) => {
                onRedirect('待做事项');
              }}
            />
          ))}
        </div>

        {/* RIGHT: drawer */}
        <aside className={`pvDrawer ${drawer.open ? 'open' : ''}`}>
          <div className="pvDrawerInner">
            {drawer.open ? (
              <EpicDrawer
                mode={drawer.mode}
                epic={drawer.mode === 'edit' ? selectedEpic : null}
                priorities={config.priorities}
                statuses={config.statuses}
                priorityLabel={(id) => priorityMap.get(id)?.label ?? id}
                onClose={closeDrawer}
                onSave={handleSaveEpic}
                onDelete={handleDeleteEpic}
              />
            ) : (
              <div className="pvDrawerEmpty">
                <div className="pvDrawerEmptyTitle">选择一个 Epic</div>
                <div className="pvDrawerEmptyDesc">
                  点击左侧卡片打开编辑；或创建一个新的 Epic。
                </div>
                <button className="pvBtnPrimary" onClick={openCreate}>
                  + New Epic
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

/** ------------------ components ------------------ */

function PriorityLane(props: {
  group: PriorityGroupVM;
  selectedEpicId: string | null;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onRedirect: (id: string) => void;
}) {
  const { group } = props;

  // Visual emphasis by rank
  const tone =
    group.rank <= 0
      ? 'p0'
      : group.rank === 1
        ? 'p1'
        : group.rank === 2
          ? 'p2'
          : 'p3';

  return (
    <section className={`pvLane ${tone}`} aria-label={group.label}>
      <div className="pvLaneHeader">
        <div className="pvLaneLeft">
          <span className="pvLaneBadge">
            {tone === 'p0'
              ? '🚨'
              : tone === 'p1'
                ? '⚠️'
                : tone === 'p2'
                  ? '👀'
                  : '😴'}
          </span>
          <span className="pvLaneTitle">{group.label}</span>
          <span className="pvLaneCount">{group.epics.length}</span>
        </div>

        <div className="pvLaneRight">
          {/* placeholder: later could show aggregated stats */}
        </div>
      </div>

      <div className="pvLaneBody">
        <div className="pvCardRow">
          {group.epics.length === 0 ? (
            <div className="pvEmpty">暂无 Epic</div>
          ) : (
            group.epics.map((e) => (
              <EpicCard
                key={e.epicId}
                epic={e}
                selected={props.selectedEpicId === e.epicId}
                onClick={() => props.onSelect(e.epicId)}
                onEdit={() => props.onEdit(e.epicId)}
                onRedirect={() => props.onRedirect(e.epicId)}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function EpicCard(props: {
  epic: EpicCardVM;
  selected: boolean;
  onClick: () => void;
  onEdit: () => void;
  onRedirect: () => void;
}) {
  const { epic } = props;

  return (
    <div
      className={`pvEpicCard ${props.selected ? 'selected' : ''} lvl-${epic.blockedLevel}`}
      onClick={props.onClick}
      role="button"
      tabIndex={0}
      title={epic.title}
    >
      <div className="pvEpicTop">
        <div className="pvEpicTitleClamp">{epic.title}</div>

        <button
          className="pvIconBtn"
          onClick={(e) => {
            e.stopPropagation();
            props.onRedirect();
          }}
          aria-label="Edit Epic"
          title="Edit Epic"
        >
          ›
        </button>
      </div>

      <div className="pvEpicMeta">
        <div className="pvEpicLine">
          <span className="pvKey">Progress</span>
          <span className="pvVal">{epic.progressText}</span>
        </div>
        <div className="pvEpicLine">
          <span className="pvKey">Blocked</span>
          <span className="pvVal">
            {epic.blockedText.replace('Blocked: ', '')}
          </span>
        </div>
      </div>
    </div>
  );
}

function EpicDrawer(props: {
  mode: 'create' | 'edit';
  epic: any | null;
  priorities: { id: string; label: string }[];
  statuses: { id: string; label: string }[];
  priorityLabel: (id: string) => string;
  onClose: () => void;
  onSave: (v: {
    epicId?: string;
    title: string;
    priorityId: string;
    statusId: string;
  }) => void;
  onDelete: (epicId: string) => void;
}) {
  const isEdit = props.mode === 'edit';
  const [title, setTitle] = useState(props.epic?.title ?? '');
  const [priorityId, setPriorityId] = useState(
    props.epic?.priorityId ?? props.priorities[0]?.id ?? 'P1',
  );
  const [statusId, setStatusId] = useState(
    props.epic?.statusId ?? props.statuses[0]?.id ?? 'TODO',
  );

  useEffect(() => {
    setTitle(props.epic?.title ?? '');
    setPriorityId(props.epic?.priorityId ?? props.priorities[0]?.id ?? 'P1');
    setStatusId(props.epic?.statusId ?? props.statuses[0]?.id ?? 'TODO');
  }, [props.epic, props.mode, props.priorities, props.statuses]);

  return (
    <div className="pvDrawerCard">
      <div className="pvDrawerHeader">
        <div>
          <div className="pvDrawerTitle">
            {isEdit ? 'Edit Epic' : 'New Epic'}
          </div>
          <div className="pvDrawerSub">
            {isEdit ? props.priorityLabel(priorityId) : 'Create & set priority'}
          </div>
        </div>

        <button
          className="pvIconBtn"
          onClick={props.onClose}
          aria-label="Close"
          title="Close"
        >
          ✕
        </button>
      </div>

      <div className="pvDrawerBody">
        <div className="pvField">
          <div className="pvLabel">Epic Name</div>
          <input
            className="pvInput"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. UIv3 batch 1&2"
          />
        </div>

        <div className="pvFieldGrid">
          <div className="pvField">
            <div className="pvLabel">Priority</div>
            <select
              className="pvSelect"
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

          <div className="pvField">
            <div className="pvLabel">Status</div>
            <select
              className="pvSelect"
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
        </div>

        <div className="pvDrawerActions">
          {isEdit && props.epic ? (
            <button
              className="pvBtnDanger"
              onClick={() => props.onDelete(props.epic.id)}
            >
              Delete
            </button>
          ) : (
            <div />
          )}

          <div className="pvActionsRight">
            <button
              className="pvBtnGhost"
              onClick={props.onClose}
              style={{ height: 34 }}
            >
              Cancel
            </button>
            <button
              className="pvBtnPrimary"
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
      </div>
    </div>
  );
}
