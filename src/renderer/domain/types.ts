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
