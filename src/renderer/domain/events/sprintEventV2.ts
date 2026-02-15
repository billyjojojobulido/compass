// src/renderer/domain/sprintEventV2.ts
import type { Epic, Task, SprintConfig } from '@/domain/types';

export type SprintEventV2 =
  | EpicCreated
  | EpicUpdated
  | EpicDeleted
  | TaskCreated
  | TaskUpdated
  | TaskDeleted
  | TaskMoved
  | TaskReordered
  | ConfigUpdated;

export type BaseEventV2 = {
  v: 2;
  id: string;
  ts: string; // ISO
  // keep room for future "career semantics"
  tags?: string[]; // e.g. ["release", "mentorship"]
};

export type EpicCreated = BaseEventV2 & {
  type: 'EPIC_CREATED';
  epic: Epic;
};

export type EpicUpdated = BaseEventV2 & {
  type: 'EPIC_UPDATED';
  epicId: string;
  patch: Partial<Epic>;
  from?: Partial<Epic>; // optional: helps projections
};

export type EpicDeleted = BaseEventV2 & {
  type: 'EPIC_DELETED';
  epicId: string;
  // optional for forensics
  removedTaskIds?: string[];
};

export type TaskCreated = BaseEventV2 & {
  type: 'TASK_CREATED';
  task: Task;
};

export type TaskUpdated = BaseEventV2 & {
  type: 'TASK_UPDATED';
  taskId: string;
  patch: Partial<Task>;
  from?: Partial<Task>;
  autoCloseBottom?: boolean;
};

export type TaskDeleted = BaseEventV2 & {
  type: 'TASK_DELETED';
  taskId: string;
  epicId: string;
};

export type TaskMoved = BaseEventV2 & {
  type: 'TASK_MOVED';
  taskId: string;
  fromEpicId: string;
  toEpicId: string;
  toIndex: number;
  reason?: 'user-dnd' | 'system';
};

export type TaskReordered = BaseEventV2 & {
  type: 'TASK_REORDERED';
  taskId: string;
  epicId: string;
  fromIndex: number;
  toIndex: number;
  reason?: 'user-dnd';
};

export type ConfigUpdated = BaseEventV2 & {
  type: 'CONFIG_UPDATED';
  patch: Partial<SprintConfig>;
  from?: Partial<SprintConfig>;
};
