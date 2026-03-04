import React, { useMemo, useState } from 'react';
import { useTechDebt } from './useTechDebt';

import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragCancelEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TechDebtItem, TechDebtStatus } from '@/domain/types';
import { reorderByIds } from './techDebtService';
import './techDebt.css';

function TechDebtAddInput(props: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  const [isComposing, setIsComposing] = useState(false);

  return (
    <input
      className="tdInput"
      value={props.value}
      placeholder="Add a tech debt…"
      onChange={(e) => props.onChange(e.target.value)}
      onCompositionStart={() => setIsComposing(true)}
      onCompositionEnd={() => setIsComposing(false)}
      onKeyDown={(e) => {
        // disable enter click trigger add directly
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        // a safter shortcut: Cmd/Ctrl + Enter
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !isComposing) {
          e.preventDefault();
          props.onSubmit();
        }
      }}
    />
  );
}

function DebtRow(props: {
  item: TechDebtItem;
  done?: boolean;
  draggable?: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onChangeTitle: (t: string) => void;
  onHide?: () => void;
}) {
  const { item, done, draggable = true } = props;

  const sortable = useSortable({ id: item.id, disabled: !draggable });

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.title);

  // sync when outside update e.g. refresh
  React.useEffect(() => {
    if (!editing) setDraft(item.title);
  }, [item.title, editing]);

  const commit = () => {
    const t = draft.trim();
    if (!t) {
      // not allow empty title
      setDraft(item.title);
      setEditing(false);
      return;
    }
    if (t !== item.title) props.onChangeTitle(t);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(item.title);
    setEditing(false);
  };

  const style: React.CSSProperties = draggable
    ? {
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        opacity: sortable.isDragging ? 0.6 : 1,
      }
    : {};

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className={`tdRow ${done ? 'done' : ''}`}
      {...(draggable ? sortable.attributes : {})}
    >
      <button
        className="tdCheck"
        onClick={props.onToggle}
        aria-label="Toggle done"
      >
        {done ? '✅' : '⬜️'}
      </button>

      {!editing ? (
        <button
          type="button"
          className="tdTitleBtn"
          onClick={() => setEditing(true)}
          title="Click to edit"
        >
          {item.title}
        </button>
      ) : (
        <input
          className="tdTitleEdit"
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              cancel();
            }
          }}
        />
      )}

      {draggable ? (
        <span
          className="tdDragHandle"
          {...sortable.listeners}
          title="Drag reorder"
        >
          ⋮⋮
        </span>
      ) : (
        <span className="tdDragHandle disabled">⋮⋮</span>
      )}

      {/* DONE item hide button; only pass in onHide callback when = DONE */}
      {props.onHide ? (
        <button className="tdHide" onClick={props.onHide} aria-label="Hide">
          {item.hidden ? '👀' : '🙈'}
        </button>
      ) : null}

      <button className="tdRemove" onClick={props.onRemove} aria-label="Remove">
        ✕
      </button>
    </div>
  );
}

export default function TechDebtView() {
  const {
    loading,
    error,
    doc,
    add,
    remove,
    toggleDone,
    updateTitle,
    setOrder,
    refresh,
    setHidden,
  } = useTechDebt();

  const [draft, setDraft] = useState('');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const [mode, setMode] = useState<'TODO' | 'DONE'>('TODO');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [showHiddenDone, setShowHiddenDone] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const items = doc?.items ?? [];
  const todoItems = useMemo(
    () => items.filter((x) => !(x.status === TechDebtStatus.DONE)),
    [items],
  );
  const doneItemsAll = useMemo(
    () => items.filter((x) => x.status === TechDebtStatus.DONE),
    [items],
  );
  const doneItems = useMemo(
    () =>
      showHiddenDone ? doneItemsAll : doneItemsAll.filter((x) => !x.hidden),
    [doneItemsAll, showHiddenDone],
  );

  // when shows TODO or DONE
  const listItems = mode === 'TODO' ? todoItems : doneItems;

  const totalPages = Math.max(1, Math.ceil(listItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return listItems.slice(start, start + PAGE_SIZE);
  }, [listItems, safePage]);

  const activeItem = useMemo<TechDebtItem | undefined>(() => {
    if (!activeDragId) return undefined;
    return todoItems.find((x) => x.id === activeDragId);
  }, [activeDragId, todoItems]);

  const onDragStart = (e: DragStartEvent) => {
    setActiveDragId(String(e.active.id));
  };

  const onDragCancel = (_e: DragCancelEvent) => {
    setActiveDragId(null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveDragId(null);

    const { active, over } = e;
    if (!over) return;

    // MVP: only allow reorder in TODO list
    if (mode !== 'TODO') return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const ids = todoItems.map((x) => x.id);
    if (!ids.includes(activeId) || !ids.includes(overId)) return;

    const nextTodo = reorderByIds(todoItems, activeId, overId);

    // keep DONE still after
    const nextAll: TechDebtItem[] = [...nextTodo, ...doneItemsAll];
    setOrder(nextAll);
  };

  return (
    <div style={{ padding: 12 }}>
      <div className="tdCard">
        <div className="tdAddRow">
          <TechDebtAddInput
            value={draft}
            onChange={setDraft}
            onSubmit={() => {
              add(draft);
              setDraft('');
              setPage(1);
              setMode('TODO');
            }}
          />
          <button
            className="btnPrimary"
            onClick={() => {
              add(draft);
              setDraft('');
              setPage(1);
              setMode('TODO');
            }}
          >
            Add
          </button>
        </div>

        {/*  TODO / DONE switch */}
        <div className="tdSwitchRow">
          <button
            className={`tdSwitch ${mode === 'TODO' ? 'active' : ''}`}
            onClick={() => {
              setMode('TODO');
              setPage(1);
            }}
          >
            TODO ({todoItems.length})
          </button>
          <button
            className={`tdSwitch ${mode === 'DONE' ? 'active' : ''}`}
            onClick={() => {
              setMode('DONE');
              setPage(1);
            }}
          >
            DONE ({doneItems.length})
          </button>

          {mode === 'DONE' ? (
            <label className="tdToggle">
              <input
                type="checkbox"
                checked={showHiddenDone}
                onChange={(e) => setShowHiddenDone(e.target.checked)}
              />
              Show hidden
            </label>
          ) : null}
        </div>

        {/*  list */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragCancel={onDragCancel}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={mode === 'TODO' ? pageItems.map((x) => x.id) : []}
            strategy={verticalListSortingStrategy}
          >
            <div className="tdList">
              {loading ? <div className="tdEmpty">Loading…</div> : null}
              {error ? (
                <div className="tdEmpty" style={{ color: 'crimson' }}>
                  Load failed: {error}
                </div>
              ) : null}

              {pageItems.length === 0 ? (
                <div className="tdEmpty">
                  {mode === 'TODO' ? 'No tech debt 🎉' : 'None'}
                </div>
              ) : (
                pageItems.map((it) => (
                  <DebtRow
                    key={it.id}
                    item={it}
                    done={it.status === TechDebtStatus.DONE}
                    draggable={
                      mode === 'TODO' && it.status !== TechDebtStatus.DONE
                    }
                    onToggle={() => toggleDone(it.id)}
                    onRemove={() => remove(it.id)}
                    onChangeTitle={(t) => updateTitle(it.id, t)}
                    onHide={
                      mode === 'DONE'
                        ? () => {
                            const ret = it.hidden ?? false;
                            setHidden(it.id, !ret);
                          }
                        : undefined
                    }
                  />
                ))
              )}
            </div>

            {/*  pagination */}
            {totalPages > 1 ? (
              <div className="tdPager">
                <button
                  className="btnGhost"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <div className="tdPagerInfo">
                  Page {safePage} / {totalPages}
                </div>
                <button
                  className="btnGhost"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            ) : null}
          </SortableContext>

          {/*  DragOverlay */}
          <DragOverlay>
            {activeItem ? (
              <div className="tdOverlay">
                <div className="tdRow tdRowOverlay">
                  <span className="tdCheck" aria-hidden>
                    ⬜️
                  </span>
                  <div className="tdOverlayTitle">{activeItem.title}</div>
                  <span className="tdDragHandle" aria-hidden>
                    ⋮⋮
                  </span>
                  <span className="tdRemove" aria-hidden>
                    ✕
                  </span>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        <div style={{ marginTop: 10 }}>
          <button className="btnGhost" onClick={refresh}>
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
