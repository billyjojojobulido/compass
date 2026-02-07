import type { LegacyWeekItem, DailySnapshot } from '@/domain/types';

type CompassInvoke = (channel: string, payload?: unknown) => Promise<any>;

function assertCompass(): { invoke: CompassInvoke } {
  if (typeof window === 'undefined') {
    throw new Error('[ApiClient] window is undefined (not in renderer)');
  }
  if (!window.compass || typeof window.compass.invoke !== 'function') {
    throw new Error(
      '[ApiClient] window.compass.invoke is not available. Check preload exposure.',
    );
  }
  return window.compass;
}

function toErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

/**
 * ApiClient: renderer-side typed client.
 * UI should call these methods instead of `window.compass.invoke(...)`.
 */
export const apiClient = {
  legacyWeekly: {
    async list(): Promise<LegacyWeekItem[]> {
      try {
        const compass = assertCompass();
        return await compass.invoke('compass:legacy:list');
      } catch (e) {
        throw new Error(`[ApiClient.legacyWeekly.list] ${toErrorMessage(e)}`);
      }
    },

    async read(fileName: string): Promise<string> {
      try {
        const compass = assertCompass();
        return await compass.invoke('compass:legacy:read', { fileName });
      } catch (e) {
        throw new Error(`[ApiClient.legacyWeekly.read] ${toErrorMessage(e)}`);
      }
    },

    // NOTE: only implement when you add ipcMain.handle('compass:legacy:write')
    // async write(fileName: string, content: string): Promise<{ ok: true }> { ... }
  },

  snapshots: {
    async list(year?: string): Promise<string[]> {
      try {
        const compass = assertCompass();
        return await compass.invoke(
          'compass:snapshot:list',
          year ? { year } : undefined,
        );
      } catch (e) {
        throw new Error(`[ApiClient.snapshots.list] ${toErrorMessage(e)}`);
      }
    },

    async read(date: string): Promise<DailySnapshot> {
      try {
        const compass = assertCompass();
        return await compass.invoke('compass:snapshot:read', { date });
      } catch (e) {
        throw new Error(`[ApiClient.snapshots.read] ${toErrorMessage(e)}`);
      }
    },

    async write(
      date: string,
      snapshot: DailySnapshot,
    ): Promise<{ ok: true; path: string }> {
      try {
        const compass = assertCompass();
        return await compass.invoke('compass:snapshot:write', {
          date,
          snapshot,
        });
      } catch (e) {
        throw new Error(`[ApiClient.snapshots.write] ${toErrorMessage(e)}`);
      }
    },
  },

  // TODO: Future expansion points (implement when IPC exists)
  // config: { read, write }
  // events: { append, read }
  // reports: { list, read, write }
};

export type ApiClient = typeof apiClient;
