import raw from '@/config/sprintConfig.json';
import { PriorityDef, SprintConfig } from '@/domain/types';

function assertUniqueIds(list: { id: string }[], name: string) {
  const seen = new Set<string>();
  for (const item of list) {
    if (seen.has(item.id))
      throw new Error(`[SprintConfig] Duplicate id in ${name}: ${item.id}`);
    seen.add(item.id);
  }
}

export function loadSprintConfig(): SprintConfig {
  // directly import from JSON :: and then pack to renderer
  // TODO: in future can change to read file from main process and then return from IPC
  const cfg = raw as SprintConfig;

  assertUniqueIds(cfg.priorities, 'priorities');
  assertUniqueIds(cfg.statuses, 'statuses');
  assertUniqueIds(cfg.stakeholders, 'stakeholders');

  return cfg;
}

export function getPriorityConfig(priroityId: string): PriorityDef {
  let ret = undefined;
  sprintConfig?.priorities.forEach((p) => {
    if (p.id === priroityId) {
      ret = p;
    }
  });
  return ret;
}

export function byId<T extends { id: string }>(arr: T[]) {
  const m = new Map<string, T>();
  for (const x of arr) m.set(x.id, x);
  return m;
}

const sprintConfig = loadSprintConfig();
export { sprintConfig };
