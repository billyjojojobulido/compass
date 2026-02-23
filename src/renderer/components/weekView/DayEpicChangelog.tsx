import React, { useMemo, useState } from 'react';
import Drawer from './Drawer';
import type { DailyChangelog, DayTag, WorkdayKey } from '@/domain/types';
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
  tag?: DayTag;

  log: DailyChangelog;
  epicTitleById?: Record<string, string>;

  collapsed?: boolean;
  onToggle?: (dayKey: WorkdayKey) => void;

  // TODO: top-right buttons (placeholder)
  onTag?: (dayKey: WorkdayKey, dateKey: string) => void;
  onGenerateDayReport?: (dayKey: WorkdayKey) => void;

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
            props.tag ? (
              <span className="pill outline">{props.tag.label}</span>
            ) : props.notArchived ? (
              <span className="pill outline">No Change</span>
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
            props.onTag?.(props.dayKey, props.dateKey);
          }}
          onGen={(e) => {
            e.stopPropagation();
            props.onGenerateDayReport?.(props.dayKey);
          }}
        />
      }
    >
      {props.tag ? (
        <div className="cwDayEmpty">{props.tag.label}</div>
      ) : props.notArchived ? (
        <div className="cwDayEmpty">No snapshot</div>
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
