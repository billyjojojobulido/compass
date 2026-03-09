import raw from '@/config/userConfig.json';
import { UserConfig } from '@/domain/types';

function assertUniqueIds(list: { id: string }[], name: string) {
  const seen = new Set<string>();
  for (const item of list) {
    if (seen.has(item.id))
      throw new Error(`[UserConfig] Duplicate id in ${name}: ${item.id}`);
    seen.add(item.id);
  }
}

export function loadUserConfig(): UserConfig {
  // directly import from JSON :: and then pack to renderer
  // TODO: in future can change to read file from main process and then return from IPC
  const cfg = raw as UserConfig;
  return cfg;
}

export function byId<T extends { id: string }>(arr: T[]) {
  const m = new Map<string, T>();
  for (const x of arr) m.set(x.id, x);
  return m;
}

const userConfig = loadUserConfig();
export { userConfig };
