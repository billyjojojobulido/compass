import { DailySnapshot, WeeklyWorkspace } from '@/domain/types';
import { app } from 'electron';
import { LegacyWeekItem } from '@/domain/types';
import fs from 'fs';
import path from 'path';

export function getDataRoot() {
  // TODO: can change to configable dir in the future
  // MVP use userData first
  return path.join(app.getPath('userData'), 'compass-data');
}

export function ensureCompassDirs() {
  const root = getDataRoot();
  const dirs = [
    root,
    path.join(root, 'config'),
    path.join(root, 'events'),
    path.join(root, 'snapshots'),
    path.join(root, 'reports'),
    path.join(root, 'legacy-weekly'),
  ];

  for (const d of dirs) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }
  return root;
}

//#region ---- Legacy Week Log -----
export function legacyWeeklyDir() {
  return path.join(getDataRoot(), 'legacy-weekly');
}

function parseLegacyTitle(fileName: string): LegacyWeekItem {
  // compatiable with my existing log file name format
  // e.g. "Week 72 (2026-01-19).md"
  const base = fileName.replace(/\.md$/i, '');
  const m = base.match(/Week\s*(\d+)\s*\((\d{4}-\d{2}-\d{2})\)/i);
  if (m) {
    return {
      fileName,
      title: `Week ${m[1]} (${m[2]})`,
      weekNo: Number(m[1]),
      weekStart: m[2],
    };
  }
  return { fileName, title: base };
}

export function listLegacyWeekly(): LegacyWeekItem[] {
  ensureCompassDirs();
  const dir = legacyWeeklyDir();

  if (!fs.existsSync(dir)) return [];

  const files = fs
    .readdirSync(dir)
    .filter((f) => /\.md$/i.test(f))
    .sort((a, b) => {
      // default order weekNo desc
      // last in first out
      const A = parseLegacyTitle(a);
      const B = parseLegacyTitle(b);
      if (A.weekNo != null && B.weekNo != null) return B.weekNo - A.weekNo;
      return b.localeCompare(a);
    });

  return files.map(parseLegacyTitle);
}

export function readLegacyWeekly(fileName: string): string {
  ensureCompassDirs();
  const safe = path.basename(fileName); // in case of path traversal
  const full = path.join(legacyWeeklyDir(), safe);
  if (!fs.existsSync(full)) throw new Error(`Legacy weekly not found: ${safe}`);
  return fs.readFileSync(full, 'utf-8');
}
//#endregion

//#region ---- Daily Snapshot -----
export function dailySnapshotYearDir(year: string) {
  return path.join(getDataRoot(), 'snapshots', 'daily', year);
}

export function dailySnapshotPath(date: string) {
  // date: "YYYY-MM-DD"
  assertDayKey(date);
  const year = date.slice(0, 4);
  return path.join(dailySnapshotYearDir(year), `${date}.snapshot.json`);
}

function assertDayKey(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid day key: ${date}`);
  }
}

function atomicWriteFileSync(fullPath: string, content: string) {
  const dir = path.dirname(fullPath);
  const tmp = `${fullPath}.tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  // step 1: write to temporary file
  fs.writeFileSync(tmp, content, 'utf-8');

  // step 2: rename to override :: overwrite on the same disk can be atomic
  // if target exists on windows, renaming may fail in some scenes
  // so unlink before rename
  try {
    fs.renameSync(tmp, fullPath);
  } catch (e) {
    try {
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      fs.renameSync(tmp, fullPath);
    } finally {
      // if still fail :: just make sure tmp is fully cleaned up
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    }
  }
}

function assertDailySnapshotShape(x: any, expectedDate: string) {
  // MVP: only do checking for the most important 2~3 fields
  if (!x || typeof x !== 'object')
    throw new Error('Invalid snapshot: not an object');
  if (x.schemaVersion !== 1)
    throw new Error(`Invalid snapshot: schemaVersion=${x.schemaVersion}`);
  if (x.date !== expectedDate)
    throw new Error(
      `Invalid snapshot: date mismatch (${x.date} != ${expectedDate})`,
    );
  if (!Array.isArray(x.epics))
    throw new Error('Invalid snapshot: epics must be array');
  if (!x.tasksById || typeof x.tasksById !== 'object')
    throw new Error('Invalid snapshot: tasksById must be object');
  if (!x.taskOrderByEpic || typeof x.taskOrderByEpic !== 'object')
    throw new Error('Invalid snapshot: taskOrderByEpic must be object');
}

export function writeDailySnapshot(date: string, snapshot: DailySnapshot) {
  ensureCompassDirs();
  assertDayKey(date);

  if (snapshot.date !== date) {
    throw new Error(
      `Snapshot.date (${snapshot.date}) must match date param (${date})`,
    );
  }

  const full = dailySnapshotPath(date);
  const dir = path.dirname(full);

  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // pretty JSON for human-readable
  const json = JSON.stringify(snapshot, null, 2);
  atomicWriteFileSync(full, json);

  return { ok: true, path: full };
}

export function readDailySnapshot(date: string) {
  ensureCompassDirs();
  assertDayKey(date);

  const full = dailySnapshotPath(date);
  if (!fs.existsSync(full))
    throw new Error(`Daily snapshot not found: ${date}`);
  const raw = fs.readFileSync(full, 'utf-8');
  const parsed = JSON.parse(raw);

  assertDailySnapshotShape(parsed, date);
  return parsed as DailySnapshot;
}

function assertYear(y: string) {
  if (!/^\d{4}$/.test(y)) throw new Error(`Invalid year: ${y}`);
}

/*
optional params for customize: opts {order: asc | desc} default -> desc
*/
export function listDailySnapshots(
  year?: string,
  opts?: { order?: 'asc' | 'desc'; limit?: number },
): string[] {
  ensureCompassDirs();
  /* [guardian] year validation */
  const y = year ?? String(new Date().getFullYear());
  assertYear(y);

  const dir = dailySnapshotYearDir(y);

  if (!fs.existsSync(dir)) return [];

  /* [guardian] in case of dirty file name */
  const dates = fs
    .readdirSync(dir)
    .filter((f) => /\.snapshot\.json$/i.test(f))
    .map((f) => f.replace(/\.snapshot\.json$/i, ''))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));

  dates.sort(); // asc by date (YYYY-MM-DD string works)

  if (opts?.order === 'desc') dates.reverse();
  if (opts?.limit != null) return dates.slice(0, Math.max(0, opts.limit));

  return dates;
}
//#endregion

//#region ---- Weekly Reports :: Workspace -----

// compassFs.ts
export function weeklyWorkspacePath(weekKey: string) {
  // weekKey = Monday "YYYY-MM-DD"
  return path.join(getDataRoot(), 'reports', `${weekKey}.workspace.json`);
}

export function writeWeeklyWorkspace(weekKey: string, ws: WeeklyWorkspace) {
  ensureCompassDirs();
  assertDayKey(weekKey);
  const full = weeklyWorkspacePath(weekKey);
  fs.writeFileSync(full, JSON.stringify(ws, null, 2), 'utf-8');
  return { ok: true, path: full };
}

export function readWeeklyWorkspace(weekKey: string) {
  ensureCompassDirs();
  assertDayKey(weekKey);
  const full = weeklyWorkspacePath(weekKey);
  if (!fs.existsSync(full)) return null;
  return JSON.parse(fs.readFileSync(full, 'utf-8')) as WeeklyWorkspace;
}

export function deleteWeeklyWorkspace(weekKey: string) {
  ensureCompassDirs();
  assertDayKey(weekKey);
  const full = weeklyWorkspacePath(weekKey);
  if (fs.existsSync(full)) fs.unlinkSync(full);
  return { ok: true };
}

//#endregion

//#region ---- Sprint State ----
export function sprintDir() {
  return path.join(getDataRoot(), 'sprint');
}

export function sprintStatePath() {
  return path.join(sprintDir(), 'state.json');
}

export function writeSprintState(doc: unknown) {
  ensureCompassDirs();
  const dir = sprintDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(sprintStatePath(), JSON.stringify(doc, null, 2), 'utf-8');
  return { ok: true, path: sprintStatePath() };
}

export function readSprintState(): unknown | null {
  ensureCompassDirs();
  const full = sprintStatePath();
  if (!fs.existsSync(full)) return null;
  const raw = fs.readFileSync(full, 'utf-8');
  return JSON.parse(raw);
}
//#endregion
