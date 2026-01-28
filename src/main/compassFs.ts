import { app } from 'electron';
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

export function legacyWeeklyDir() {
  return path.join(getDataRoot(), 'legacy-weekly');
}

export type LegacyWeekItem = {
  fileName: string;
  title: string;
  weekNo?: number;
  weekStart?: string;
};

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
