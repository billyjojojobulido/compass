import { SprintEventV2 } from '@/domain/events/sprintEventV2';
import type {
  LegacyWeekItem,
  DailySnapshot,
  WeeklyWorkspace,
  TechDebtDoc,
} from '@/domain/types';
import { SprintEventCursor } from 'src/main/compassFs';

function assertCompass(): Window['compass'] {
  if (typeof window === 'undefined') {
    throw new Error('[ApiClient] window is undefined (not in renderer)');
  }
  if (!window.compass) {
    throw new Error(
      '[ApiClient] window.compass is not available. Check preload exposure.',
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
        return await compass.legacyWeekly.list();
      } catch (e) {
        throw new Error(`[ApiClient.legacyWeekly.list] ${toErrorMessage(e)}`);
      }
    },

    async read(fileName: string): Promise<string> {
      try {
        const compass = assertCompass();
        return await compass.legacyWeekly.read(fileName);
      } catch (e) {
        throw new Error(`[ApiClient.legacyWeekly.read] ${toErrorMessage(e)}`);
      }
    },
    async write(
      fileName: string,
      content: string,
    ): Promise<{ ok: true; path: string }> {
      try {
        const compass = assertCompass();
        return await compass.legacyWeekly.write(fileName, content);
      } catch (e) {
        throw new Error(`[ApiClient.legacyWeekly.write] ${toErrorMessage(e)}`);
      }
    },

    // NOTE: only implement when add ipcMain.handle('compass:legacy:write')
    // async write(fileName: string, content: string): Promise<{ ok: true }> { ... }
  },

  snapshots: {
    async list(year?: string): Promise<string[]> {
      try {
        const compass = assertCompass();
        return await compass.snapshot.list(year);
      } catch (e) {
        throw new Error(`[ApiClient.snapshots.list] ${toErrorMessage(e)}`);
      }
    },

    async read(date: string): Promise<DailySnapshot> {
      try {
        const compass = assertCompass();
        return await compass.snapshot.read(date);
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
        return await compass.snapshot.write(date, snapshot);
      } catch (e) {
        throw new Error(`[ApiClient.snapshots.write] ${toErrorMessage(e)}`);
      }
    },
  },

  workspace: {
    async write(
      key: string,
      doc: WeeklyWorkspace,
    ): Promise<{ ok: true; path: string }> {
      try {
        const compass = assertCompass();
        return await compass.workspace.write(key, doc);
      } catch (e) {
        throw new Error(`[ApiClient.workspace.write] ${toErrorMessage(e)}`);
      }
    },

    async read(key: string): Promise<WeeklyWorkspace> {
      try {
        const compass = assertCompass();
        return await compass.workspace.read(key);
      } catch (e) {
        throw new Error(`[ApiClient.workspace.read] ${toErrorMessage(e)}`);
      }
    },

    async delete(key: string): Promise<string[]> {
      try {
        const compass = assertCompass();
        return await compass.workspace.delete(key);
      } catch (e) {
        throw new Error(`[ApiClient.workspace.delete] ${toErrorMessage(e)}`);
      }
    },
  },
  sprint: {
    state: {
      async read(): Promise<unknown> {
        try {
          const compass = assertCompass();
          return await compass.sprint.stateRead();
        } catch (e) {
          throw new Error(`[ApiClient.sprint.state.read] ${toErrorMessage(e)}`);
        }
      },
      async write(state: unknown): Promise<{ ok: true; path: string }> {
        try {
          const compass = assertCompass();
          return await compass.sprint.stateWrite(state);
        } catch (e) {
          throw new Error(
            `[ApiClient.sprint.state.write] ${toErrorMessage(e)}`,
          );
        }
      },
    },
    events: {
      async read(args?: {
        from?: SprintEventCursor;
        toMonthKey?: string;
      }): Promise<SprintEventV2[]> {
        try {
          const compass = assertCompass();
          return await compass.sprint.events.read(args);
        } catch (e) {
          throw new Error(
            `[ApiClient.sprint.events.read] ${toErrorMessage(e)}`,
          );
        }
      },

      async append(
        event: SprintEventV2,
      ): Promise<{ ok: true; monthFile: string }> {
        try {
          const compass = assertCompass();
          return await compass.sprint.events.append(event);
        } catch (e) {
          throw new Error(
            `[ApiClient.sprint.events.append] ${toErrorMessage(e)}`,
          );
        }
      },
    },
  },
  techDebt: {
    read: async () => {
      return window.compass.techDebt.read();
    },

    write: async (doc: TechDebtDoc) => {
      return window.compass.techDebt.write(doc);
    },
  },
  // TODO: Future expansion points (implement when IPC exists)
  // config: { read, write }
  // events: { append, read }
  // reports: { list, read, write }
};

export type ApiClient = typeof apiClient;
