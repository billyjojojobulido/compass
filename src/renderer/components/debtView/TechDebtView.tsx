import React, { useMemo, useState } from 'react';
import { useTechDebt } from './useTechDebt';

import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TechDebtItem, TechDebtStatus } from '@/domain/types';
import { reorderByIds } from './techDebtService';

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
  } = useTechDebt();

  const [draft, setDraft] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const items = doc?.items ?? [];

  const activeItems = useMemo(
    () => items.filter((x) => x.status !== TechDebtStatus.DONE),
    [items],
  );
  const doneItems = useMemo(
    () => items.filter((x) => x.status === TechDebtStatus.DONE),
    [items],
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // MVP: only reorder inside active list
    const activeOnlyIds = activeItems.map((x) => x.id);
    if (!activeOnlyIds.includes(activeId) || !activeOnlyIds.includes(overId)) {
      return;
    }

    const nextActive = reorderByIds(activeItems, activeId, overId);
    const nextAll: TechDebtItem[] = [...nextActive, ...doneItems];
    setOrder(nextAll);
  };

  return (
    <div style={{ padding: 12 }}>
      <div className="contentHeader" style={{ padding: 0, marginBottom: 12 }}>
        <div>
          <div className="contentTitle">技术债务</div>
          <div className="contentHint">Checklist + Drag reorder</div>
        </div>

        <div className="contentActions">
          <button className="btnGhost" onClick={refresh}>
            Refresh
          </button>
        </div>
      </div>

      {loading ? <div style={{ opacity: 0.75 }}>Loading…</div> : null}
      {error ? (
        <div style={{ color: 'crimson' }}>Load failed: {error}</div>
      ) : null}

      <div className="tdCard">
        <div className="tdAddRow">
          <input
            className="tdInput"
            value={draft}
            placeholder="Add a tech debt…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                add(draft);
                setDraft('');
              }
            }}
          />
          <button
            className="btnPrimary"
            onClick={() => {
              add(draft);
              setDraft('');
            }}
          >
            Add
          </button>
        </div>

        <div className="tdSectionTitle">TODO</div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={activeItems.map((x) => x.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="tdList">
              {activeItems.length === 0 ? (
                <div className="tdEmpty">No tech debt 🎉</div>
              ) : (
                activeItems.map((it) => (
                  <DebtRow
                    key={it.id}
                    item={it}
                    onToggle={() => toggleDone(it.id)}
                    onRemove={() => remove(it.id)}
                    onChangeTitle={(t) => updateTitle(it.id, t)}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>

        <div className="tdSectionTitle" style={{ marginTop: 16 }}>
          DONE
        </div>
        <div className="tdList">
          {doneItems.length === 0 ? (
            <div className="tdEmpty">None</div>
          ) : (
            doneItems.map((it) => (
              <DebtRow
                key={it.id}
                item={it}
                done
                draggable={false}
                onToggle={() => toggleDone(it.id)}
                onRemove={() => remove(it.id)}
                onChangeTitle={(t) => updateTitle(it.id, t)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function DebtRow(props: {
  item: TechDebtItem;
  done?: boolean;
  draggable?: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onChangeTitle: (t: string) => void;
}) {
  const { item, done, draggable = true } = props;

  const sortable = useSortable({ id: item.id, disabled: !draggable });
  const style: React.CSSProperties = draggable
    ? {
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        opacity: sortable.isDragging ? 0.8 : 1,
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

      <input
        className="tdTitle"
        value={item.title}
        onChange={(e) => props.onChangeTitle(e.target.value)}
        spellCheck={false}
      />

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

      <button className="tdRemove" onClick={props.onRemove} aria-label="Remove">
        ✕
      </button>
    </div>
  );
}
