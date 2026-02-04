// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { LegacyWeekItem } from '@/domain/legacy/api';
import { DailySnapshot } from '@/domain/types';
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels = 'ipc-example';

export type CompassHandler = {
  invoke<T = unknown>(channel: CompassChannel, payload?: unknown): Promise<T>;

  legacyWeekly: {
    list(): Promise<LegacyWeekItem[]>;
    read(fileName: string): Promise<string>; // 建议直接返回 content string 更简单
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
    readWorkspace(date: string): Promise<DailySnapshot>;
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
  | 'compass:report:write'
  | 'compass:report:read'
  | 'compass:legacy:list'
  | 'compass:legacy:read'
  | 'compass:workspace:read'
  | 'compass:workspace:write'
  | 'compass:workspace:delete';

export type InvokeChannels = 'list-legacy-weekly' | 'read-legacy-weekly';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
    invoke<T = unknown>(
      channel: InvokeChannels,
      ...args: unknown[]
    ): Promise<T> {
      return ipcRenderer.invoke(channel, ...args);
    },
  },
  legacyWeekly: {
    list(): Promise<LegacyWeekItem[]> {
      return ipcRenderer.invoke('list-legacy-weekly');
    },
    read(fileName: string): Promise<{ fileName: string; content: string }> {
      return ipcRenderer.invoke('read-legacy-weekly', fileName);
    },
  },
};

const compassHandler: CompassHandler = {
  invoke: (channel: string, payload?: unknown) =>
    ipcRenderer.invoke(channel, payload),

  legacyWeekly: {
    list: () => ipcRenderer.invoke('compass:legacy:list'),
    read: (fileName: string) =>
      ipcRenderer.invoke('compass:legacy:read', { fileName }),
  },

  snapshot: {
    writeDaily: (date: string, snapshot: DailySnapshot) =>
      ipcRenderer.invoke('compass:snapshot:write', { date, snapshot }),
    readDaily: (date: string) =>
      ipcRenderer.invoke('compass:snapshot:read', { date }),
    listDaily: (year: string) =>
      ipcRenderer.invoke('compass:snapshot:list', { year }),
  },

  workspace: {
    writeWorkspace: (key: string, doc: unknown) =>
      ipcRenderer.invoke('compass:workspace:write', { key, doc }),
    readWorkspace: (key: string) =>
      ipcRenderer.invoke('compass:workspace:read', { key }),
    deleteWorkspace: (key: string) =>
      ipcRenderer.invoke('compass:workspace:delete', { key }),
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);
contextBridge.exposeInMainWorld('compass', compassHandler);

export type ElectronHandler = typeof electronHandler;
