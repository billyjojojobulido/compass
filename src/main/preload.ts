// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { DailySnapshot, LegacyWeekItem, WeeklyWorkspace } from '@/domain/types';
import { contextBridge, ipcRenderer } from 'electron';
import { SprintEventV2 } from '@/domain/events/sprintEventV2';

export type GeneralChannels = 'ipc-example';

type Invoke = <T = unknown>(
  channel: CompassChannel,
  payload?: unknown,
) => Promise<T>;

const invoke: Invoke = (channel, payload) =>
  ipcRenderer.invoke(channel, payload);

export type CompassHandler = {
  invoke: Invoke;
  ipcRenderer: {
    sendMessage(channel: GeneralChannels, ...args: unknown[]): void;
    once(channel: GeneralChannels, func: (...args: unknown[]) => void): any;
  };
  legacyWeekly: {
    list(): Promise<LegacyWeekItem[]>;
    read(fileName: string): Promise<string>; // easier to return content as string
  };

  snapshot: {
    write(
      date: string,
      snapshot: DailySnapshot,
    ): Promise<{ ok: true; path: string }>;
    read(date: string): Promise<DailySnapshot>;
    list(year?: string): Promise<string[]>;
  };
  workspace: {
    write(
      key: string,
      doc: WeeklyWorkspace,
    ): Promise<{ ok: true; path: string }>;
    read(date: string): Promise<WeeklyWorkspace>;
    delete(year?: string): Promise<string[]>;
  };
  sprint: {
    stateRead(): Promise<unknown | null>;
    stateWrite(doc: unknown): Promise<{ ok: true; path: string }>;
    events: {
      append(
        event: SprintEventV2,
      ): Promise<{ ok: true; monthFile: string; path: string }>;
      read(monthKey: string): Promise<SprintEventV2[]>;
      list(): Promise<string[]>;
    };
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
  | 'compass:workspace:delete'
  | 'compass:sprint:state:read'
  | 'compass:sprint:state:write'
  | 'compass:sprint:events:append'
  | 'compass:sprint:events:read'
  | 'compass:sprint:events:list';

type SprintEventRecord = { id: string; ts: string; type: string; payload: any };
type SprintEventCursor = { monthFile: string; lastEventId?: string };

const compassHandler: CompassHandler = {
  invoke,

  ipcRenderer: {
    sendMessage(channel: GeneralChannels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    once(channel: GeneralChannels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },

  legacyWeekly: {
    list(): Promise<LegacyWeekItem[]> {
      return invoke('compass:legacy:list');
    },
    read(fileName: string): Promise<string> {
      return invoke('compass:legacy:read', { fileName });
    },
  },

  snapshot: {
    write(
      date: string,
      snapshot: DailySnapshot,
    ): Promise<{ ok: true; path: string }> {
      return invoke('compass:snapshot:write', { date, snapshot });
    },
    read(date: string): Promise<DailySnapshot> {
      return invoke('compass:snapshot:read', { date });
    },
    list(year?: string): Promise<string[]> {
      return invoke('compass:snapshot:list', year ? { year } : undefined);
    },
  },

  workspace: {
    write(
      key: string,
      doc: WeeklyWorkspace,
    ): Promise<{ ok: true; path: string }> {
      return invoke('compass:workspace:write', { key, doc });
    },
    read(key: string): Promise<WeeklyWorkspace> {
      return invoke('compass:workspace:read', { key });
    },
    delete(key?: string): Promise<string[]> {
      return invoke('compass:workspace:delete', key ? { key } : undefined);
    },
  },
  sprint: {
    stateRead: () => ipcRenderer.invoke('compass:sprint:state:read'),
    stateWrite: (doc: unknown) =>
      ipcRenderer.invoke('compass:sprint:state:write', { doc }),
    events: {
      append(
        event: SprintEventV2,
      ): Promise<{ ok: true; monthFile: string; path: string }> {
        return ipcRenderer.invoke('compass:sprint:events:append', { event });
      },
      read(monthKey: string): Promise<SprintEventV2[]> {
        return ipcRenderer.invoke('compass:sprint:events:read', monthKey);
      },
      list(): Promise<string[]> {
        return ipcRenderer.invoke('compass:sprint:events:list');
      },
    },
  },
};

contextBridge.exposeInMainWorld('compass', compassHandler);
