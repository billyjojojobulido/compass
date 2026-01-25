// src/renderer/views/priority/PriorityView.tsx
import React, { useMemo } from 'react';
import './priorityView.css';
import { useSprint } from '@/domain/sprintStore';
import {
  selectFocusEpics,
  selectPriorityGroups,
} from '@/domain/projections/prioritySelector.ts';

type Props = {
  onOpenEpic?: (epicId: string) => void; // optional: click open epic detail
  onAdjustPriority?: (epicId: string) => void; // optional: open priority editor modal
};

export default function PriorityView(props: Props) {
  const { state } = useSprint();
  const { events } = state;

  // ---- projections (pure) ----
  const focusRows = useMemo(
    () => selectFocusEpics(events, state, 7, 6),
    [events, state],
  );
  const groups = useMemo(() => selectPriorityGroups(state), [state]);

  return (
    <div className="pvRoot">
      {/* Focus */}
      <section className="pvSection">
        <div className="pvSectionTitle">本周 Focus</div>
        <div className="pvFocusRow">
          {focusRows.map((r) => (
            <EpicCard
              key={r.epicId}
              tone="danger"
              title={r.title}
              progress={`${r.progressClosed} / ${r.progressTotal}`}
              line2={r.blockedLabel}
              onOpen={() => props.onOpenEpic?.(r.epicId)}
              onAdjust={() => props.onAdjustPriority?.(r.epicId)}
            />
          ))}

          {/* right arrow hint like design */}
          <div className="pvArrowHint" aria-hidden>
            ❯
          </div>
        </div>
      </section>

      {/* All epics grouped */}
      <section className="pvSection">
        <div className="pvSectionTitle">所有 Epics</div>

        {groups.map((g) => (
          <PriorityGroupRow
            key={g.priorityId}
            label={g.label}
            pid={g.priorityId}
            epics={g.epics.map((e) => ({
              id: e.epicId,
              title: e.title,
              progress: `${e.progressClosed} / ${e.progressTotal}`,
              line2: e.secondaryLine ?? e.blockedLabel,
              line3: e.secondaryLine ? e.blockedLabel : undefined,
            }))}
            onOpenEpic={props.onOpenEpic}
            onAdjustPriority={props.onAdjustPriority}
          />
        ))}
      </section>
    </div>
  );
}

/** ---------------- UI blocks ---------------- */

function PriorityGroupRow(props: {
  label: string;
  pid: string;
  epics: {
    id: string;
    title: string;
    progress: string;
    line2: string;
    line3?: string;
  }[];
  onOpenEpic?: (epicId: string) => void;
  onAdjustPriority?: (epicId: string) => void;
}) {
  return (
    <div
      className={`pvGroup ${props.pid === 'P0' ? 'pvP0' : props.pid === 'P1' ? 'pvP1' : 'pvP2'}`}
    >
      <div className="pvGroupHeader">
        <div className="pvGroupBadge">
          <span className="pvBadgeIcon">⚠︎</span>
          <span className="pvBadgeText">{props.label}</span>
        </div>
      </div>

      <div className="pvGroupBody">
        <div className="pvCardsRow">
          {props.epics.map((e) => (
            <EpicCard
              key={e.id}
              tone="danger"
              title={e.title}
              progress={e.progress}
              line2={e.line2}
              line3={e.line3}
              onOpen={() => props.onOpenEpic?.(e.id)}
              onAdjust={() => props.onAdjustPriority?.(e.id)}
            />
          ))}

          <div className="pvArrowHint" aria-hidden>
            ❯
          </div>
        </div>
      </div>
    </div>
  );
}

function EpicCard(props: {
  tone: 'danger' | 'warn' | 'info';
  title: string;
  progress: string;
  line2: string;
  line3?: string;
  onOpen?: () => void;
  onAdjust?: () => void;
}) {
  return (
    <article className="pvCard">
      <div className="pvCardTop">
        <div className={`pvToneIcon tone-${props.tone}`} aria-hidden>
          !
        </div>

        <button
          className="pvCardTitle"
          onClick={props.onOpen}
          title={props.title}
        >
          <span className="pvTitleClamp">{props.title}</span>
        </button>
      </div>

      <div className="pvCardBody">
        <div className="pvLine">
          <span className="pvLabel">Progress:</span>
          <span className="pvValue">{props.progress}</span>
        </div>

        <div className="pvLine">
          <span className="pvValue">{props.line2}</span>
        </div>

        {props.line3 ? (
          <div className="pvLine">
            <span className="pvValue">{props.line3}</span>
          </div>
        ) : null}

        <div className="pvCardFooter">
          <button className="pvAdjustBtn" onClick={props.onAdjust}>
            调整优先级
          </button>
        </div>
      </div>
    </article>
  );
}
