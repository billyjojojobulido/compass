import { ipcMain } from 'electron';
import {
  listLegacyWeekly,
  readLegacyWeekly,
  writeDailySnapshot,
  readDailySnapshot,
  listDailySnapshots,
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
    'compass:snapshot:daily:write',
    async (_e, payload: { date: string; snapshot: DailySnapshot }) => {
      return writeDailySnapshot(payload.date, payload.snapshot);
    },
  );

  ipcMain.handle(
    'compass:snapshot:daily:read',
    async (_e, payload: { date: string }) => {
      return readDailySnapshot(payload.date);
    },
  );

  ipcMain.handle(
    'compass:snapshot:daily:list',
    async (_e, payload?: { year?: string }) => {
      return listDailySnapshots(payload?.year);
    },
  );
}
