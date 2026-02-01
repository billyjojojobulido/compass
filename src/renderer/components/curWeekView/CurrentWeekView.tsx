// src/components/week/CurrentWeekView.tsx
import React, { useEffect, useMemo, useState } from 'react';
import './currentWeekView.css';
import { useSprint } from '@/domain/sprintStore';
import { formatLocalYMD, startOfWeekLocal, addDaysLocal } from '@/domain/time';
import { createDailySnapshot } from '@/domain/snapshot/dailySnapshot';

// ---- Types (renderer-only, avoid breaking domain types) ----
type DayKey = string; // "YYYY-MM-DD"

type DailySnapshotLike = {
  schemaVersion: number;
  date: DayKey;
  generatedAt: string;
  timezone?: string;
  range?: { start: string; end: string };
  epics: Array<{
    id: string;
    title: string;
    priorityId: string;
    statusId: string;
    pinned?: boolean;
  }>;
  tasksById: Record<
    string,
    {
      id: string;
      epicId: string;
      title: string;
      statusId: string;
      stakeholderId?: string;
    }
  >;
  taskOrderByEpic: Record<string, string[]>;
  meta?: {
    off?: boolean; // 😴 day off
    dayNote?: string; // custom notes for that day
  };
};

type WeekDraft = {
  weekStart: DayKey; // Monday
  techDebtText: string; // subjective
  priorityText: string; // subjective
};

const DEFAULT_DRAFT: WeekDraft = {
  weekStart: '',
  techDebtText: '',
  priorityText: '',
};

// Mon-Fri labels
const DAY_LABELS: Array<{ idx: number; label: string }> = [
  { idx: 0, label: 'Monday' },
  { idx: 1, label: 'Tuesday' },
  { idx: 2, label: 'Wednesday' },
  { idx: 3, label: 'Thursday' },
  { idx: 4, label: 'Friday' },
];

function isWeekdayMonFri(d: Date) {
  const day = d.getDay(); // 0 Sun ... 6 Sat
  return day >= 1 && day <= 5;
}

function getWeekStartMonday(now: Date) {
  // startOfWeekLocal(d, 1) => Monday
  return startOfWeekLocal(now, 1);
}

function buildMonFriDayKeys(weekStartMonday: Date): DayKey[] {
  return DAY_LABELS.map(({ idx }) =>
    formatLocalYMD(addDaysLocal(weekStartMonday, idx)),
  );
}

function pickDefaultExpanded(
  dayKeys: DayKey[],
  snapshots: Record<DayKey, DailySnapshotLike | null>,
) {
  // Prefer first missing snapshot in Mon-Fri; else Monday
  for (const k of dayKeys) {
    if (!snapshots[k]) return k;
  }
  return dayKeys[0] ?? '';
}

function snapshotSummary(s: DailySnapshotLike) {
  if (s.meta?.off) return '😴 Day off';
  const taskIds = Object.keys(s.tasksById || {});
  const doneCount = taskIds.reduce((acc, id) => {
    const t = s.tasksById[id];
    return acc + (t?.statusId === 'DONE' ? 1 : 0);
  }, 0);
  return `${doneCount}/${taskIds.length} done`;
}

function todayKeyLocal(now: Date) {
  return formatLocalYMD(now);
}

export default function CurrentWeekView(props: {
  onArchivedWeek?: (weekStart: string) => void; // optional: let App refresh sidebar list
}) {
  const { state } = useSprint();

  const now = useMemo(() => new Date(), []);
  const weekStart = useMemo(() => getWeekStartMonday(now), [now]);
  const dayKeys = useMemo(() => buildMonFriDayKeys(weekStart), [weekStart]);
  const weekStartKey = dayKeys[0];

  // --- Week draft (subjective panels) ---
  const [draft, setDraft] = useState<WeekDraft>({
    ...DEFAULT_DRAFT,
    weekStart: weekStartKey,
  });
  const [draftEdit, setDraftEdit] = useState(false);

  // --- Snapshots state ---
  const [snapshots, setSnapshots] = useState<
    Record<DayKey, DailySnapshotLike | null>
  >(() => {
    const init: Record<DayKey, DailySnapshotLike | null> = {};
    for (const k of dayKeys) init[k] = null;
    return init;
  });

  // Accordion behavior: only one expanded at a time
  const [expandedDay, setExpandedDay] = useState<DayKey>(
    () => dayKeys[0] ?? '',
  );
  const [editingDay, setEditingDay] = useState<DayKey | null>(null);
  const [dayNoteDraft, setDayNoteDraft] = useState<string>('');

  const allArchived = useMemo(() => {
    return dayKeys.every((k) => Boolean(snapshots[k]));
  }, [dayKeys, snapshots]);

  const todayKey = useMemo(() => todayKeyLocal(new Date()), []);
  const todayIsInThisWeek = dayKeys.includes(todayKey);
  const todayIsWorkday = useMemo(() => isWeekdayMonFri(new Date()), []);

  // ---- Load draft + snapshots on mount ----
  useEffect(() => {
    // 1) load week draft (subjective text) from a local cache first (MVP)
    // can later replace this with real file persistence via compass:report:read(draft)
    const cacheKey = `compass.currentWeekDraft.${weekStartKey}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as WeekDraft;
        if (parsed.weekStart === weekStartKey) setDraft(parsed);
      } catch {}
    }

    // 2) load snapshots for Mon-Fri
    (async () => {
      const next: Record<DayKey, DailySnapshotLike | null> = {};
      for (const k of dayKeys) next[k] = null;

      for (const k of dayKeys) {
        try {
          const raw = await window.compass.invoke('compass:snapshot:read', {
            date: k,
          });
          next[k] = raw as DailySnapshotLike;
        } catch {
          next[k] = null;
        }
      }
      setSnapshots(next);
      setExpandedDay((prev) => prev || pickDefaultExpanded(dayKeys, next));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartKey]);

  // persist draft to localStorage (MVP)
  useEffect(() => {
    const cacheKey = `compass.currentWeekDraft.${weekStartKey}`;
    localStorage.setItem(cacheKey, JSON.stringify(draft));
  }, [draft, weekStartKey]);

  // ---- Actions ----
  async function archiveDay(dayKey: DayKey, mode: 'normal' | 'off') {
    const snap = createDailySnapshot(state, new Date(), {
      includeRange: true,
      meta: {
        ...(mode === 'off' ? { off: true } : {}),
        ...(snapshots[dayKey]?.meta?.dayNote
          ? { dayNote: snapshots[dayKey]?.meta?.dayNote }
          : {}),
      },
    }) as unknown as DailySnapshotLike;

    // ensure date matches the dayKey (because createDailySnapshot uses "now")
    snap.date = dayKey;

    await window.compass.invoke('compass:snapshot:write', {
      date: dayKey,
      snapshot: snap,
    });

    setSnapshots((prev) => ({ ...prev, [dayKey]: snap }));
    setEditingDay(null);
  }

  async function saveDayNote(dayKey: DayKey, note: string) {
    const current = snapshots[dayKey];
    if (!current) {
      // allow note even before archive by storing it in localStorage (MVP)
      localStorage.setItem(`compass.dayNote.${dayKey}`, note);
      return;
    }
    const next: DailySnapshotLike = {
      ...current,
      meta: { ...(current.meta ?? {}), dayNote: note },
    };
    await window.compass.invoke('compass:snapshot:write', {
      date: dayKey,
      snapshot: next,
    });
    setSnapshots((prev) => ({ ...prev, [dayKey]: next }));
  }

  function openEditDay(dayKey: DayKey) {
    setExpandedDay(dayKey);
    setEditingDay(dayKey);
    // prefill note from snapshot meta or local fallback
    const fromSnap = snapshots[dayKey]?.meta?.dayNote;
    const fromCache = localStorage.getItem(`compass.dayNote.${dayKey}`) ?? '';
    setDayNoteDraft(fromSnap ?? fromCache ?? '');
  }

  async function commitDayEdit(dayKey: DayKey) {
    await saveDayNote(dayKey, dayNoteDraft);
    // If snapshot not archived yet, we just keep note for later; user still needs "Archive Today"
    setEditingDay(null);
  }

  function cancelDayEdit() {
    setEditingDay(null);
  }

  async function archiveTodayOrWeek() {
    if (allArchived) {
      // Archive This Week -> write weekly report file
      const md = buildWeeklyMarkdown({
        weekStart: weekStartKey,
        draft,
        dayKeys,
        snapshots,
      });

      // Use weekStart as identifier (file name can be computed in main)
      await window.compass.invoke('compass:report:write', {
        weekStart: weekStartKey,
        content: md,
      });

      props.onArchivedWeek?.(weekStartKey);
      return;
    }

    // Archive Today (only Mon-Fri)
    if (!todayIsWorkday || !todayIsInThisWeek) return;

    await archiveDay(todayKey, 'normal');

    // after archive, auto expand next day
    const idx = dayKeys.indexOf(todayKey);
    const nextKey = dayKeys[Math.min(idx + 1, dayKeys.length - 1)];
    setExpandedDay(nextKey);
  }

  // ---- UI helpers ----
  const leftTitle = `Week ${weekStartKey}`;
  const archiveBtnLabel = allArchived ? 'Archive This Week' : 'Archive Today';
  const archiveDisabled =
    !allArchived && (!todayIsWorkday || !todayIsInThisWeek);

  return (
    <>
      <div className="contentHeader">
        <div>
          <div className="contentTitle">周总结</div>
          <div className="contentHint">Current Week Log</div>
          <div className="cwWeekKey">{leftTitle}</div>
        </div>

        {/* button area on Top Right */}
        <div className="contentActions">
          <button
            className={`btnPrimary ${archiveDisabled ? 'disabled' : ''}`}
            onClick={archiveTodayOrWeek}
            disabled={archiveDisabled}
          >
            Archive
          </button>
          <button
            className="btnGhost"
            onClick={() => console.log('Carry over last week (TODO)')}
          >
            Carry Over
          </button>
        </div>
      </div>
      <div className="cwRoot">
        <div className="cwGrid">
          {/* LEFT: subjective panels */}
          <section className="cwLeft">
            <div className="cwPanel">
              <div className="cwPanelHeader">
                <div className="cwPanelTitle">技术债务</div>
                <div className="cwPanelActions">
                  <button
                    className="cwIconBtn"
                    onClick={() => setDraftEdit((v) => !v)}
                    title={draftEdit ? 'Exit edit' : 'Edit'}
                  >
                    {draftEdit ? '✅' : '✏️'}
                  </button>
                </div>
              </div>

              {draftEdit ? (
                <textarea
                  className="cwTextarea"
                  value={draft.techDebtText}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, techDebtText: e.target.value }))
                  }
                  placeholder="may just bring over last weeks's debt..."
                />
              ) : (
                <pre className="cwPre">{draft.techDebtText || '（空）'}</pre>
              )}
            </div>

            <div className="cwPanel">
              <div className="cwPanelHeader">
                <div className="cwPanelTitle">优先级 </div>
                <div className="cwPanelHint">
                  HINT: can add events not in Sprint, e.g. mentorship/ appraisal
                  / interview, etc
                </div>
              </div>

              {draftEdit ? (
                <textarea
                  className="cwTextarea"
                  value={draft.priorityText}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, priorityText: e.target.value }))
                  }
                  placeholder="写下本周优先级补充..."
                />
              ) : (
                <pre className="cwPre">{draft.priorityText || '（空）'}</pre>
              )}
            </div>
          </section>

          {/* RIGHT: Mon-Fri snapshots accordion */}
          <section className="cwRight">
            <div className="cwRightHeader">
              <div className="cwRightTitle">Monday – Friday</div>
              <div className="cwRightHint">
                ✏️: Edit Mode (✅ Save / 😴 Leave)
              </div>
            </div>

            <div className="cwAccordion">
              {dayKeys.map((k, i) => {
                const label = `${DAY_LABELS[i]?.label ?? 'Day'}  ${k}`;
                const snap = snapshots[k];
                const expanded = expandedDay === k;
                const isEditing = editingDay === k;

                return (
                  <div
                    key={k}
                    className={`cwDay ${expanded ? 'expanded' : ''}`}
                  >
                    <div
                      className="cwDayHeader"
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setExpandedDay((prev) => (prev === k ? '' : k));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ')
                          () => {
                            setExpandedDay((prev) => (prev === k ? '' : k));
                          };
                      }}
                    >
                      <div className="cwDayHeaderLeft">
                        <div className="cwDayLabel">{label}</div>
                        <div className="cwDayMeta">
                          <span className={`cwPill ${snap ? 'ok' : 'pending'}`}>
                            {snap ? 'Archived' : 'Pending'}
                          </span>
                          <span className="cwPill outline">
                            {snap ? snapshotSummary(snap) : '—'}
                          </span>
                        </div>
                      </div>

                      <div
                        className="cwDayHeaderRight"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {!isEditing ? (
                          <button
                            className="cwIconBtn"
                            onClick={() => openEditDay(k)}
                            title="Edit day"
                          >
                            ✏️
                          </button>
                        ) : (
                          <>
                            <button
                              className="cwIconBtn"
                              onClick={async () => {
                                await commitDayEdit(k);
                              }}
                              title="Save notes"
                            >
                              ✅
                            </button>
                            <button
                              className="cwIconBtn"
                              onClick={async () => {
                                // Mark day off + archive snapshot
                                await saveDayNote(k, dayNoteDraft);
                                await archiveDay(k, 'off');
                              }}
                              title="Day off (archive as off)"
                            >
                              😴
                            </button>
                            <button
                              className="cwIconBtn"
                              onClick={cancelDayEdit}
                              title="Cancel"
                            >
                              ✕
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {expanded ? (
                      <div className="cwDayBody">
                        {/* Day note */}
                        <div className="cwDayBlock">
                          <div className="cwBlockTitle">每日总结</div>
                          {isEditing ? (
                            <textarea
                              className="cwTextarea"
                              value={dayNoteDraft}
                              onChange={(e) => setDayNoteDraft(e.target.value)}
                              placeholder="code review / meeting / appraisal ..."
                            />
                          ) : (
                            <pre className="cwPre">
                              {snap?.meta?.dayNote ??
                                localStorage.getItem(`compass.dayNote.${k}`) ??
                                '（空）'}
                            </pre>
                          )}
                        </div>

                        {/* Snapshot preview */}
                        <div className="cwDayBlock">
                          <div className="cwBlockTitle">Snapshot</div>

                          {!snap ? (
                            <div className="cwEmptyHint">
                              HINT: not Archived yet. First, write Day Notes,
                              and then hits “Archive Today” , or choose 😴 btn
                              here.
                            </div>
                          ) : snap.meta?.off ? (
                            <div className="cwOffHint">😴 On Leave Today</div>
                          ) : (
                            <SnapshotPreview snapshot={snap} />
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function SnapshotPreview({ snapshot }: { snapshot: DailySnapshotLike }) {
  // Minimal preview: epics + tasks summary (memo-like)
  const epicMap = useMemo(() => {
    const m = new Map<string, { id: string; title: string }>();
    for (const e of snapshot.epics) m.set(e.id, { id: e.id, title: e.title });
    return m;
  }, [snapshot.epics]);

  const lines = useMemo(() => {
    const taskIds = Object.keys(snapshot.tasksById || {});
    const tasks = taskIds.map((id) => snapshot.tasksById[id]).filter(Boolean);

    // group by epic
    const byEpic = new Map<string, typeof tasks>();
    for (const t of tasks) {
      const arr = byEpic.get(t.epicId) ?? [];
      arr.push(t);
      byEpic.set(t.epicId, arr);
    }

    const out: string[] = [];
    out.push(`GeneratedAt: ${snapshot.generatedAt}`);
    out.push('');

    for (const [epicId, list] of byEpic.entries()) {
      const epicTitle = epicMap.get(epicId)?.title ?? epicId;
      out.push(`• ${epicTitle}`);

      // stable order: use taskOrderByEpic if present
      const ordered = (snapshot.taskOrderByEpic?.[epicId] ?? [])
        .map((id) => snapshot.tasksById[id])
        .filter(Boolean);

      const useList = ordered.length ? ordered : list;

      for (const t of useList) {
        const mark = t.statusId === 'DONE' ? '[DONE]' : '[WIP]';
        const who = t.stakeholderId ? ` (${t.stakeholderId})` : '';
        out.push(`   - ${mark} ${t.title}${who}`);
      }
      out.push('');
    }

    return out.join('\n');
  }, [snapshot, epicMap]);

  return <pre className="cwPre">{lines}</pre>;
}

function buildWeeklyMarkdown(args: {
  weekStart: string;
  draft: { techDebtText: string; priorityText: string };
  dayKeys: string[];
  snapshots: Record<string, DailySnapshotLike | null>;
}) {
  const { weekStart, draft, dayKeys, snapshots } = args;

  const header = `# Week Report (${weekStart})\n\n`;
  const techDebt = `## 技术债务\n\n${draft.techDebtText?.trim() || '（空）'}\n\n`;
  const priority = `## 优先级\n\n${draft.priorityText?.trim() || '（空）'}\n\n`;

  const days = dayKeys
    .map((k, idx) => {
      const s = snapshots[k];
      const dayName = DAY_LABELS[idx]?.label ?? `Day${idx + 1}`;
      if (!s) return `## ${dayName} ${k}\n\n（未归档）\n\n`;

      if (s.meta?.off) {
        const note = s.meta?.dayNote?.trim() || '（空）';
        return `## ${dayName} ${k}\n\n😴 休假\n\n### Day Notes\n\n${note}\n\n`;
      }

      const note = s.meta?.dayNote?.trim() || '（空）';
      // Keep snapshot readable but not too long
      const doneCount = Object.keys(s.tasksById || {}).reduce(
        (acc, id) => acc + (s.tasksById[id]?.statusId === 'DONE' ? 1 : 0),
        0,
      );
      const total = Object.keys(s.tasksById || {}).length;

      return [
        `## ${dayName} ${k}`,
        ``,
        `- Snapshot: ${doneCount}/${total} done`,
        ``,
        `### Day Notes`,
        ``,
        note,
        ``,
      ].join('\n');
    })
    .join('\n');

  return header + techDebt + priority + `## Monday – Friday\n\n` + days;
}
