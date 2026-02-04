import { ipcMain } from 'electron';
import {
  listLegacyWeekly,
  readLegacyWeekly,
  writeDailySnapshot,
  readDailySnapshot,
  listDailySnapshots,
  readWeeklyReport,
  writeWeeklyReport,
  writeWeeklyWorkspace,
  readWeeklyWorkspace,
  deleteWeeklyWorkspace,
} from './compassFs';
import { DailySnapshot } from '@/domain/types';

export function registerCompassIpc() {
  ipcMain.handle('compass:legacy:list', async () => {
    return listLegacyWeekly();
  });

  ipcMain.handle(
    'compass:legacy:read',
    async (_e, payload: { fileName: string }) => {
      return readLegacyWeekly(payload.fileName);
    },
  );

  ipcMain.handle(
    'compass:snapshot:write',
    async (_e, payload: { date: string; snapshot: DailySnapshot }) => {
      return writeDailySnapshot(payload.date, payload.snapshot);
    },
  );

  ipcMain.handle(
    'compass:snapshot:read',
    async (_e, payload: { date: string }) => {
      return readDailySnapshot(payload.date);
    },
  );

  ipcMain.handle(
    'compass:snapshot:list',
    async (_e, payload?: { year?: string }) => {
      return listDailySnapshots(payload?.year);
    },
  );

  ipcMain.handle(
    'compass:report:read',
    async (_e, payload: { fileName: string }) => {
      return readWeeklyReport(payload.fileName);
    },
  );

  ipcMain.handle(
    'compass:report:write',
    async (_e, payload: { weekStart: string; content: string }) => {
      return writeWeeklyReport(payload.weekStart, payload.content);
    },
  );

  // compassIpc.ts
  ipcMain.handle(
    'compass:workspace:write',
    async (_e, payload: { key: string; doc: unknown }) => {
      // key = weekKey
      return writeWeeklyWorkspace(payload.key, payload.doc);
    },
  );

  ipcMain.handle(
    'compass:workspace:read',
    async (_e, payload: { key: string }) => {
      return readWeeklyWorkspace(payload.key);
    },
  );

  ipcMain.handle(
    'compass:workspace:delete',
    async (_e, payload: { key: string }) => {
      return deleteWeeklyWorkspace(payload.key);
    },
  );
}
