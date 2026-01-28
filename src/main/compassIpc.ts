import { ipcMain } from 'electron';
import { listLegacyWeekly, readLegacyWeekly } from './compassFs';

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
}
