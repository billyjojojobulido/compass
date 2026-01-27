// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { LegacyWeekItem } from '@/domain/legacy/api';
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels = 'ipc-example';

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

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
