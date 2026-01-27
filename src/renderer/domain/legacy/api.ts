// renderer/domain/legacy/api.ts
export type LegacyWeekItem = {
  fileName: string;
  title: string; // "Week 72 (2026-01-19)"
  weekNo?: number;
  weekStart?: string;
};

export async function listLegacyWeekly(): Promise<LegacyWeekItem[]> {
  return window.electron.ipcRenderer.invoke<LegacyWeekItem[]>(
    'list-legacy-weekly',
  );
}

export async function readLegacyWeekly(fileName: string): Promise<{
  fileName: string;
  markdown: string;
}> {
  return window.electron.ipcRenderer.invoke('read-legacy-weekly', fileName);
}
