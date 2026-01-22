export type EntityType = 'epic' | 'task' | 'config';
export type ActionType = 'create' | 'update' | 'delete' | 'move' | 'reorder';

export type SprintEvent = {
  id: string;
  ts: string; // ISO
  actor?: string;

  entity: {
    type: EntityType;
    id: string;
  };

  action: ActionType;

  diff?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };

  meta?: Record<string, unknown>;
};
