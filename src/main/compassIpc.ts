import { ipcMain } from 'electron';
import {
  // legacy ...
  listLegacyWeekly,
  readLegacyWeekly,
  // snapshot ...
  writeDailySnapshot,
  readDailySnapshot,
  listDailySnapshots,
  // workspace ...
  writeWeeklyWorkspace,
  readWeeklyWorkspace,
  deleteWeeklyWorkspace,
  // sprint ...
  readSprintState,
  writeSprintState,
  appendSprintEvent,
  readSprintEvents,
} from './compassFs';
import { DailySnapshot, WeeklyWorkspace } from '@/domain/types';

export function registerCompassIpc() {
  /* ---- legacy ---- */
  ipcMain.handle('compass:legacy:list', async () => {
    return listLegacyWeekly();
  });

  ipcMain.handle(
    'compass:legacy:read',
    async (_e, payload: { fileName: string }) => {
      return readLegacyWeekly(payload.fileName);
    },
  );

  /* ---- snapshot ---- */
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

  /* ---- workspace ---- */
  ipcMain.handle(
    'compass:workspace:write',
    async (_e, payload: { key: string; doc: WeeklyWorkspace }) => {
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

  /* ---- sprint: state---- */
  ipcMain.handle('compass:sprint:state:read', async () => {
    return readSprintState(); // unknown | null
  });

  ipcMain.handle(
    'compass:sprint:state:write',
    async (_e, payload: { doc: unknown }) => {
      return writeSprintState(payload.doc);
    },
  );

  /* ---- sprint: events ---- */
  ipcMain.handle(
    'compass:sprint:events:append',
    async (_e, payload: { event: any }) => {
      return appendSprintEvent(payload.event);
    },
  );

  ipcMain.handle(
    'compass:sprint:events:read',
    async (
      _e,
      payload?: {
        from?: { monthFile: string; lastEventId?: string };
        toMonthKey?: string;
      },
    ) => {
      return readSprintEvents(payload);
    },
  );
}
