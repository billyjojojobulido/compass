import { apiClient } from '@/services/ApiClient';

export type SprintEventRecord = {
  id: string;
  ts: string;
  type: string;
  payload: any;
};
export type SprintEventCursor = { monthFile: string; lastEventId?: string };

function debounce<T extends (...args: any[]) => void>(fn: T, wait = 500) {
  let t: any = null;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export async function hydrateSprintState(args: {
  initialState: any;
  applyEvent: (state: any, ev: SprintEventRecord) => any; // reducer apply
}) {
  const diskState = await apiClient.sprint.state.read().catch(() => null);

  /* TODO: in future there might be a wrapper {state, meta} */
  const baseState = diskState?.state ?? diskState ?? null;
  let state = baseState ?? args.initialState;

  const cursor: SprintEventCursor | undefined =
    diskState?.meta?.eventCursor ?? state?.meta?.eventCursor;

  const events = await apiClient.sprint.events.read(
    cursor ? { from: cursor } : undefined,
  );

  let lastEventId: string | undefined = cursor?.lastEventId;
  let lastMonthFile: string | undefined = cursor?.monthFile;

  for (const ev of events) {
    state = args.applyEvent(state, ev);
    lastEventId = ev.id;
    // monthFile will be returned in append, but can also be derived from read
    // in MVP: just use cursoer.monthFile to keep flow going
  }

  // immediately write back after hydrate :: to update curosr
  const nextMeta = {
    ...(diskState?.meta ?? state?.meta ?? {}),
    eventCursor: {
      monthFile: lastMonthFile ?? cursor?.monthFile ?? guessMonthFile(),
      lastEventId,
    },
    lastHydratedAt: new Date().toISOString(),
  };

  const toWrite = {
    ...(diskState?.state ? diskState : {}),
    state,
    meta: nextMeta,
  };
  await apiClient.sprint.state.write(toWrite);

  return toWrite; // {state, meta}
}

function guessMonthFile() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}.ndjson`;
}

export function createSprintPersister() {
  const writeStateDebounced = debounce(async (doc: any) => {
    await apiClient.sprint.state.write(doc);
  }, 600);

  return {
    async appendEventAndScheduleState(args: {
      event: SprintEventRecord;
      doc: any; // {state, meta}
    }) {
      const res = await apiClient.sprint.events.append(args.event);

      // update cursor to ensure  "evnet -> state" write order
      const nextDoc = {
        ...args.doc,
        meta: {
          ...(args.doc?.meta ?? {}),
          eventCursor: { monthFile: res.monthFile, lastEventId: args.event.id },
          lastPersistedAt: new Date().toISOString(),
        },
      };

      writeStateDebounced(nextDoc);
      return nextDoc;
    },
  };
}
