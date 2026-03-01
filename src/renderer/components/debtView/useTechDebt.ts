import React from 'react';
import { apiClient } from '@/services/ApiClient';
import { TechDebtDoc, TechDebtItem, TechDebtStatus } from '@/domain/types';
import { normalizeTechDebtDoc, sortTechDebtItems } from './techDebtService';

function createDebouncer(wait = 300) {
  let t: any = null;
  return (fn: () => void) => {
    if (t) clearTimeout(t);
    t = setTimeout(fn, wait);
  };
}

function uid() {
  // Electron renderer usually has crypto.randomUUID
  // but keep fallback
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `td_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

export function useTechDebt() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [doc, setDoc] = React.useState<TechDebtDoc | null>(null);

  const debouncedSave = React.useMemo(() => createDebouncer(300), []);
  const savingRef = React.useRef(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await apiClient.techDebt.read();
      setDoc(normalizeTechDebtDoc(raw));
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setDoc(normalizeTechDebtDoc(null));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const persist = React.useCallback(async (next: TechDebtDoc) => {
    // avoid overlapping writes
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      await apiClient.techDebt.write(next);
    } catch (e) {
      // keep silent-ish, UI already optimistic
      console.error('[TechDebt] write failed', e);
    } finally {
      savingRef.current = false;
    }
  }, []);

  const setAndSave = React.useCallback(
    (next: TechDebtDoc) => {
      setDoc(next);
      debouncedSave(() => persist(next));
    },
    [debouncedSave, persist],
  );

  const add = React.useCallback(
    (title: string) => {
      if (!doc) return;
      const t = title.trim();
      if (!t) return;

      const now = new Date().toISOString();
      const items = doc.items
        .concat({
          id: uid(),
          title: t,
          status: TechDebtStatus.TODO,
          createdAt: now,
          order: doc.items.length,
        })
        .sort(sortTechDebtItems)
        .map((x, i) => ({ ...x, order: i }));

      setAndSave({
        ...doc,
        updatedAt: now,
        items,
      });
    },
    [doc, setAndSave],
  );

  const remove = React.useCallback(
    (id: string) => {
      if (!doc) return;
      const now = new Date().toISOString();
      const items = doc.items
        .filter((x) => x.id !== id)
        .sort(sortTechDebtItems)
        .map((x, i) => ({ ...x, order: i }));

      setAndSave({ ...doc, updatedAt: now, items });
    },
    [doc, setAndSave],
  );

  const toggleDone = React.useCallback(
    (id: string) => {
      if (!doc) return;
      const now = new Date().toISOString();
      const items = doc.items
        .map((x) =>
          x.id !== id
            ? x
            : {
                ...x,
                status:
                  x.status === TechDebtStatus.DONE
                    ? TechDebtStatus.WIP
                    : TechDebtStatus.DONE,
                doneAt: x.status === TechDebtStatus.DONE ? now : undefined,
              },
        )
        .sort(sortTechDebtItems)
        .map((x, i) => ({ ...x, order: i }));

      setAndSave({ ...doc, updatedAt: now, items });
    },
    [doc, setAndSave],
  );

  const updateTitle = React.useCallback(
    (id: string, title: string) => {
      if (!doc) return;
      const t = title.trim();
      const now = new Date().toISOString();

      const items = doc.items.map((x) =>
        x.id === id ? { ...x, title: t } : x,
      );
      setAndSave({ ...doc, updatedAt: now, items });
    },
    [doc, setAndSave],
  );

  const setOrder = React.useCallback(
    (items: TechDebtItem[]) => {
      if (!doc) return;
      const now = new Date().toISOString();
      const next = items.map((x, i) => ({ ...x, order: i }));
      setAndSave({ ...doc, updatedAt: now, items: next });
    },
    [doc, setAndSave],
  );

  return {
    loading,
    error,
    doc,

    refresh: load,

    add,
    remove,
    toggleDone,
    updateTitle,
    setOrder,

    // TODO: do we need manual save button?
    saveNow: async () => {
      if (!doc) return;
      await persist(doc);
    },
  };
}
