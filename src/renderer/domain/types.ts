export type EntityType = 'epic' | 'task' | 'config';
export type ActionType = 'create' | 'update' | 'delete' | 'move' | 'reorder';
export type Tone = 'gray' | 'blue' | 'yellow' | 'green' | 'red';

export type SprintEvent = {
  id: string;
  ts: string;
  actor?: string;
  entity: { type: EntityType; id: string };
  action: ActionType;
  diff?: { before?: Record<string, unknown>; after?: Record<string, unknown> };
  meta?: Record<string, unknown>;
};

export type PriorityDef = {
  id: string;
  label: string;
  rank: number;
  icon?: string;
  theme?: PriorityTheme;
};
export type StakeholderDef = { id: string; label: string };

export type StatusDef = {
  id: string;
  label: string;
  tone: Tone;
  toClose: boolean;
};

export type PriorityTheme = {
  bg?: string; // group background
  border?: string; // group border
  accent?: string; // left accent bar / highlight
  cardBg?: string; // optional: task/epic card background override
};

export type SprintConfig = {
  priorities: PriorityDef[];
  stakeholders: StakeholderDef[];
  statuses: StatusDef[];
};

export type Epic = {
  id: string;
  title: string;
  priorityId: string;
  statusId: string;
  pinned?: boolean;
};

export type Task = {
  id: string;
  epicId: string;
  title: string;
  statusId: string;
  stakeholderId?: string;
};

export type SprintUIState = {
  scrollToEpicId?: string | null;
};

export type SprintState = {
  config: SprintConfig;
  epics: Epic[];
  tasksById: Record<string, Task>;
  taskOrderByEpic: Record<string, string[]>;

  // Event log（Stage 4）
  events: SprintEvent[];
  // scroll to epicId
  ui?: SprintUIState;
};

export type DailySnapshot = {
  schemaVersion: 1;

  date: string; // "YYYY-MM-DD" (local day key)
  generatedAt: string; // ISO UTC
  timezone?: string; // TODO: optional, e.g. "Australia/Sydney" leave to future

  // Optional but very useful for weekly grouping
  range?: {
    startISO: string;
    endISO: string;
  };
  // SprintStore core states
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

  /*
    optional: used to incrementally generate weekly report
    keep record of the events offset when last carry over on that day
  */
  eventCursor?: {
    monthFile: string; // "2026-01.ndjson"
    byteOffset?: number; // TODO: optional :: leave placeholder here in case gets too complex in future
    lastEventId?: string; // MVP can use lastEventId
  };

  // Debug / future-proofing
  meta?: {
    appVersion?: string;
    configHash?: string;
    note?: string;
    source?: string;
  };
};

//#region Changelog related types
export type TaskRef = {
  id: string;
  title: string;
  epicId: string;
};

export type EpicRef = {
  id: string;
  title: string;
};

export type StatusChange = {
  task: TaskRef;
  from: string;
  to: string;
};

export type EpicMove = {
  task: TaskRef;
  fromEpic: EpicRef;
  toEpic: EpicRef;
};

export type PriorityChange = {
  epic: EpicRef;
  from: string;
  to: string;
};

export type DailyChangelog = {
  schemaVersion: 1;

  date: string; // "YYYY-MM-DD"
  generatedAt: string; // ISO

  summary?: string;
  // optional human-written weekly narrative (used later in WeeklyWorkspace)

  stats: {
    tasksAdded: number;
    tasksCompleted: number;
    tasksReopened: number;
    statusChanges: number;
    epicMoves: number;
    priorityChanges: number;
  };

  added: TaskRef[];
  completed: TaskRef[];
  reopened: TaskRef[];

  statusChanged: StatusChange[];
  epicMoved: EpicMove[];
  priorityChanged: PriorityChange[];

  meta?: {
    snapshotFrom?: string;
    snapshotTo?: string;
    eventCursor?: {
      fromId?: string;
      toId?: string;
    };
  };
};

export type WeekKey = string; // "YYYY-MM-DD" (weekStart local day key)

export type WeekRangeISO = {
  start: string; // ISO
  end: string; // ISO (exclusive)
};

export type WorkdayKey = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
export const WORKDAYS: WorkdayKey[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export type WeeklyWorkspace = {
  schemaVersion: 1;

  // identity
  weekKey: WeekKey; // weekStart local day key: "2026-02-02"
  weekNo?: number; // optional, later can compute from your existing numbering
  title: string; // fixed format, user cannot edit
  generatedAt: string; // ISO

  range: WeekRangeISO; // for future cross-timezone stability

  // per day (Mon-Fri only)
  days: Partial<Record<WorkdayKey, WeeklyDay>>;

  // weekly rollup (derived)
  rollup: WeeklyRollup;

  // optional notes (if you ever want)
  notes?: {
    techDebt?: string[]; // subjective panel (optional if you keep it)
    priorityNotes?: string[]; // subjective panel
    weeklySummary?: string; // final summary (optional)
  };

  meta?: {
    fromSnapshots?: string[]; // dates used
  };
};

export type WeeklyDay = {
  date: string; // "YYYY-MM-DD" local day key
  isOff?: boolean; // 😴 day off
  snapshotExists: boolean;

  // the core content we display
  changelog: DailyChangelog;

  // optional: allow a small manual appendix (if you later re-add customization)
  appendix?: string[];
};

export type WeeklyRollup = {
  tasksAdded: number;
  tasksCompleted: number;
  tasksReopened: number;
  statusChanges: number;
  epicMoves: number;
  priorityChanges: number;

  // nice-to-have rollups for readability
  topCompleted?: Array<{ epicId: string; epicTitle: string; count: number }>;
};

//#endregion
