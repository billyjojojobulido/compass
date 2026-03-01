import { TechDebtDoc, TechDebtItem, TechDebtStatus } from '@/domain/types';

export function sortTechDebtItems(a: TechDebtItem, b: TechDebtItem) {
  // unfinished first, then order asc
  const ad = a.status === TechDebtStatus.DONE;
  const bd = b.status === TechDebtStatus.DONE;
  if (ad !== bd) return ad ? 1 : -1;
  return (a.order ?? 0) - (b.order ?? 0);
}

export function reorderByIds<T extends { id: string }>(
  items: T[],
  activeId: string,
  overId: string,
) {
  const from = items.findIndex((x) => x.id === activeId);
  const to = items.findIndex((x) => x.id === overId);
  if (from < 0 || to < 0 || from === to) return items;

  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function normalizeTechDebtDoc(raw: any): TechDebtDoc {
  const items: TechDebtItem[] = Array.isArray(raw?.items) ? raw.items : [];
  const fixed = items.map((it, idx) => ({
    id: String(it.id ?? ''),
    title: String(it.title ?? ''),
    status: it.status,
    createdAt: String(it.createdAt ?? new Date().toISOString()),
    doneAt: it.doneAt ? String(it.doneAt) : undefined,
    order: Number.isFinite(it.order) ? Number(it.order) : idx,
  }));

  // drop empties & ensure stable order
  const cleaned = fixed
    .filter((x) => x.id && x.title.trim())
    .sort(sortTechDebtItems)
    .map((x, i) => ({ ...x, order: i }));

  return {
    schemaVersion: 1,
    updatedAt: String(raw?.updatedAt ?? new Date().toISOString()),
    items: cleaned,
  };
}
