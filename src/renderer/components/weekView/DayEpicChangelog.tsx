import React, { useMemo, useState } from 'react';
import Drawer from './Drawer';
import type { DailyChangelog, WorkdayKey } from '@/domain/types';
import {
  selectDayEpicGroups,
  EpicGroupVM,
  ChangeItemVM,
} from '@/domain/week/selectDayEpicGroups';
import './currentWeek.css';

export default function DayEpicChangelog(props: {
  dayKey: WorkdayKey; // "Mon | Tue | Wed..."
  dateKey: string; // "2026-02-02"
  title: string;
  notArchived?: boolean;
  isOff?: boolean;

  log: DailyChangelog;
  epicTitleById?: Record<string, string>;

  collapsed?: boolean;
  onToggle?: (dayKey: WorkdayKey) => void;

  // TODO: top-right buttons (placeholder)
  onTag?: (dateKey: WorkdayKey) => void;
  onGenerateDayReport?: (dateKey: string) => void;

  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(props.defaultOpen ?? true);

  const groups = useMemo(() => {
    if (!props.log) return [];
    return selectDayEpicGroups(props.log, {
      epicTitleById: props.epicTitleById,
    });
  }, [props.log, props.epicTitleById]);
  // if no changes on that day,
  // can have a lighter way to show "no update"
  const hasChanges = groups.length > 0;

  return (
    <Drawer
      className="cwDay"
      open={open}
      onToggle={() => setOpen((v) => !v)}
      header={
        <DayHeader
          title={props.title}
          open={open}
          meta={
            props.notArchived ? (
              <span className="pill outline">Not archived</span>
            ) : props.isOff ? (
              <span className="pill outline">😴 Off</span>
            ) : props.log ? (
              <span className="pill outline">
                ✅ {props.log.completed.length} / 🆕 {props.log.added.length}
              </span>
            ) : (
              <span className="pill outline">—</span>
            )
          }
          onTag={(e) => {
            e.stopPropagation();
            props.onTag?.(props.dayKey);
          }}
          onGen={(e) => {
            e.stopPropagation();
            props.onGenerateDayReport?.(props.dateKey);
          }}
        />
      }
    >
      {props.notArchived ? (
        <div className="cwDayEmpty">No snapshot</div>
      ) : props.isOff ? (
        <div className="cwDayEmpty">😴 Day Off</div>
      ) : !props.log ? (
        <div className="cwDayEmpty">—</div>
      ) : !hasChanges ? (
        <div className="cwDayEmpty">No changes</div>
      ) : (
        <div className="cwEpicList">
          {groups.map((g) => (
            <EpicDrawer key={g.epicId} group={g} />
          ))}
        </div>
      )}
    </Drawer>
  );
}

function DayHeader(props: {
  title: string;
  open: boolean;
  meta: React.ReactNode;
  onTag: (e: React.MouseEvent) => void;
  onGen: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="cwDayHeaderRow">
      <div className="cwDayLeft">
        <span className={`cwCaret ${props.open ? 'open' : ''}`}>›</span>
        <div className="cwDayTitle">{props.title}</div>
        <div className="cwDayMeta">{props.meta}</div>
      </div>

      <div className="cwDayRight">
        {/* TODO: placeholder : Tag（MVP -> only supports day off） */}
        <div
          className="cwIconBtn"
          role="button"
          tabIndex={0}
          onClick={props.onTag}
          title="Tag"
        >
          🏷️
        </div>
        {/* TODO: placeholder: generate taht day's markdown */}
        <div
          className="cwIconBtn"
          role="button"
          tabIndex={0}
          onClick={props.onGen}
          title="Generate day report"
        >
          ⤓
        </div>
      </div>
    </div>
  );
}

function EpicDrawer({ group }: { group: EpicGroupVM }) {
  const [open, setOpen] = useState(true);
  const s = group.stats;

  return (
    <Drawer
      className="cwEpic"
      open={open}
      onToggle={() => setOpen((v) => !v)}
      header={
        <div className="cwEpicHeaderRow">
          <span className={`cwCaret ${open ? 'open' : ''}`}>›</span>

          <div className="cwEpicTitle">{group.epicTitle}</div>

          <div className="cwEpicRight">
            <div className="cwEpicPills" aria-hidden>
              {s.completed ? (
                <span className="cwPill kind-completed">✅ {s.completed}</span>
              ) : null}
              {s.added ? (
                <span className="cwPill kind-added">🆕 {s.added}</span>
              ) : null}
              {s.statusChanged ? (
                <span className="cwPill kind-statusChanged">
                  🔄 {s.statusChanged}
                </span>
              ) : null}
              {s.reopened ? (
                <span className="cwPill kind-reopened">♻️ {s.reopened}</span>
              ) : null}
              {s.epicMoved ? (
                <span className="cwPill kind-epicMoved">🩹 {s.epicMoved}</span>
              ) : null}
              {s.priorityChanged ? (
                <span className="cwPill kind-priorityChanged">
                  ⚠️ {s.priorityChanged}
                </span>
              ) : null}
            </div>

            <div className="cwEpicCount">{group.items.length}</div>
          </div>
        </div>
      }
    >
      <div className="cwChanges">
        {group.items.map((it, idx) => (
          <ChangeRow key={idx} item={it} />
        ))}
      </div>
    </Drawer>
  );
}

function ChangeRow({ item }: { item: ChangeItemVM }) {
  return (
    <div className={`cwChangeRow kind-${item.kind}`} data-kind={item.kind}>
      <span className="cwChangeIcon" aria-hidden>
        {item.icon}
      </span>
      <div className="cwChangeText">
        <div className="cwChangeTitle">{item.title}</div>
        {item.detail ? (
          <div className="cwChangeDetail">{item.detail}</div>
        ) : null}
      </div>
    </div>
  );
}

function Row(props: {
  tone: 'add' | 'done' | 'reopen' | 'status' | 'move' | 'prio';
  icon: string;
  title: string;
  meta: string;
}) {
  return (
    <div className={`cwRow tone-${props.tone}`}>
      <span className="cwRowIcon">{props.icon}</span>
      <span className="cwRowTitle">{props.title}</span>
      <span className="cwRowMeta">{props.meta}</span>
    </div>
  );
}
