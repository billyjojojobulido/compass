export type EntityType = 'epic' | 'task' | 'config';
export type ActionType = 'create' | 'update' | 'delete' | 'move' | 'reorder';
export type Tone = 'gray' | 'blue' | 'yellow' | 'green' | 'red';

//#region [IMPORTANT] SPRINT EVENTS related 🚨
export type SprintEvent = {
  id: string;
  ts: string;
  actor?: string;
  entity: { type: EntityType; id: string };
  action: ActionType;
  diff?: { before?: Record<string, unknown>; after?: Record<string, unknown> };
  meta?: Record<string, unknown>;
};

type BaseEvent = {
  id: string; // uuid
  ts: string; // ISO
  version: 2; // schema version
};
export type SprintEventV2 =
  | EpicCreated
  | EpicUpdated
  | EpicDeleted
  | TaskCreated
  | TaskUpdated
  | TaskDeleted
  | TaskMoved
  | TaskReordered;

/* Epic related events */
export type EpicCreated = BaseEvent & {
  type: 'EPIC_CREATED';
  epic: Epic;
};

type EpicUpdated = BaseEvent & {
  type: 'EPIC_UPDATED';
  epicId: string;
  patch: Partial<Epic>;
  from?: Partial<Epic>;
};

type EpicDeleted = BaseEvent & {
  type: 'EPIC_DELETED';
  epicId: string;
};
/* Task related events */
type TaskCreated = BaseEvent & {
  type: 'TASK_CREATED';
  task: Task;
};

type TaskUpdated = BaseEvent & {
  type: 'TASK_UPDATED';
  taskId: string;
  patch: Partial<Task>;
  from?: Partial<Task>;
  autoCloseBottom?: boolean;
};

type TaskDeleted = BaseEvent & {
  type: 'TASK_DELETED';
  taskId: string;
  epicId: string;
};

type TaskMoved = BaseEvent & {
  type: 'TASK_MOVED';
  taskId: string;
  fromEpicId: string;
  toEpicId: string;
  toIndex: number;
  reason?: 'user-dnd' | 'system';
};

type TaskReordered = BaseEvent & {
  type: 'TASK_REORDERED';
  taskId: string;
  epicId: string;
  fromIndex: number;
  toIndex: number;
  reason?: 'user-dnd';
};
//#endregion

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
  events: (SprintEvent | SprintEventV2)[];
  // scroll to epicId
  ui?: SprintUIState;
};

export type PersistedSprintDocV1 = {
  schemaVersion: 1;
  generatedAt: string; // ISO
  state: SprintState;
};

export type PersistedSprintDoc = PersistedSprintDocV1;

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

export type LegacyWeekItem = {
  fileName: string;
  title: string; // "Week 72 (2026-01-19)"
  weekNo?: number;
  weekStart?: string;
};

export type WorkdayKey = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
export const WORKDAYS: WorkdayKey[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export type DayTag = {
  id: string; // e.g. "off" | "birthday" | "payday" | ...
  label: string; // display text
  emoji?: string; // optional
};

export type WeeklyDayMeta = {
  tags?: DayTag[]; // future: birthday/payday/etc
  isOff?: boolean; // MVP required
  collapsed?: boolean; // UI state: day drawer collapsed
};

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

  dayMeta?: Partial<Record<WorkdayKey, WeeklyDayMeta>>;

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
