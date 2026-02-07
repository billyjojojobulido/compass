// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { DailySnapshot, LegacyWeekItem, WeeklyWorkspace } from '@/domain/types';
import { apiClient } from '@/services/ApiClient';
import { contextBridge, ipcRenderer } from 'electron';

export type GeneralChannels = 'ipc-example';

export type CompassHandler = {
  invoke<T = unknown>(channel: CompassChannel, payload?: unknown): Promise<T>;

  ipcRenderer: {
    sendMessage(channel: GeneralChannels, ...args: unknown[]): void;
    once(channel: GeneralChannels, func: (...args: unknown[]) => void): any;
  };

  legacyWeekly: {
    list(): Promise<LegacyWeekItem[]>;
    read(fileName: string): Promise<string>; // easier to return content as string
  };

  snapshot: {
    writeDaily(
      date: string,
      snapshot: DailySnapshot,
    ): Promise<{ ok: true; path: string }>;
    readDaily(date: string): Promise<DailySnapshot>;
    listDaily(year?: string): Promise<string[]>;
  };
  workspace: {
    writeWorkspace(
      date: string,
      snapshot: DailySnapshot,
    ): Promise<{ ok: true; path: string }>;
    readWorkspace(date: string): Promise<WeeklyWorkspace>;
    deleteWorkspace(year?: string): Promise<string[]>;
  };
};

export type CompassChannel =
  | 'compass:config:read'
  | 'compass:config:write'
  | 'compass:events:append'
  | 'compass:events:read'
  | 'compass:snapshot:write'
  | 'compass:snapshot:read'
  | 'compass:snapshot:list'
  | 'compass:legacy:list'
  | 'compass:legacy:read'
  | 'compass:workspace:read'
  | 'compass:workspace:write'
  | 'compass:workspace:delete';

export type InvokeChannels = 'list-legacy-weekly' | 'read-legacy-weekly';

const compassHandler: CompassHandler = {
  invoke: (channel: string, payload?: unknown) =>
    ipcRenderer.invoke(channel, payload),

  ipcRenderer: {
    sendMessage(channel: GeneralChannels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    once(channel: GeneralChannels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },

  legacyWeekly: {
    list: () => apiClient.legacyWeekly.list(),
    read: (fileName: string) => apiClient.legacyWeekly.read(fileName),
  },

  snapshot: {
    writeDaily: (date: string, snapshot: DailySnapshot) =>
      apiClient.snapshots.write(date, snapshot),
    readDaily: (date: string) => apiClient.snapshots.read(date),
    listDaily: (year: string) => apiClient.snapshots.list(year),
  },

  workspace: {
    writeWorkspace: (key: string, doc: unknown) =>
      apiClient.workspace.write(key, doc),
    readWorkspace: (key: string) => apiClient.workspace.read(key),
    deleteWorkspace: (key: string) => apiClient.workspace.delete(key),
  },
};

contextBridge.exposeInMainWorld('compass', compassHandler);
