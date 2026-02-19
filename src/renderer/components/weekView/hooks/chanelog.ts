import { DailySnapshot, DailyChangelog, SprintConfig } from '@/domain/types';

function epicIndex(snapshot: DailySnapshot) {
  const map = new Map<
    string,
    { id: string; title: string; priorityId: string }
  >();
  for (const e of snapshot.epics) {
    map.set(e.id, {
      id: e.id,
      title: e.title,
      priorityId: e.priorityId,
    });
  }
  return map;
}

function taskIndex(snapshot: DailySnapshot) {
  const map = new Map<
    string,
    {
      id: string;
      title: string;
      epicId: string;
      statusId: string;
    }
  >();

  for (const t of Object.values(snapshot.tasksById)) {
    map.set(t.id, {
      id: t.id,
      title: t.title,
      epicId: t.epicId,
      statusId: t.statusId,
    });
  }
  return map;
}

export function selectDailyChangelog(
  prev: DailySnapshot | null,
  curr: DailySnapshot,
  config: SprintConfig, // things like closed / label / rank may be configured
  opts?: {
    eventFromId?: string;
    eventToId?: string;
  },
): DailyChangelog {
  const prevTasks = prev ? taskIndex(prev) : new Map();
  const currTasks = taskIndex(curr);

  const prevEpics = prev ? epicIndex(prev) : new Map();
  const currEpics = epicIndex(curr);

  const added: DailyChangelog['added'] = [];
  const completed: DailyChangelog['completed'] = [];
  const reopened: DailyChangelog['reopened'] = [];
  const statusChanged: DailyChangelog['statusChanged'] = [];
  const epicMoved: DailyChangelog['epicMoved'] = [];
  const priorityChanged: DailyChangelog['priorityChanged'] = [];

  // --- TASK LEVEL DIFF ---
  for (const [id, currTask] of currTasks) {
    const prevTask = prevTasks.get(id);

    const taskRef = {
      id: currTask.id,
      title: currTask.title,
      epicId: currTask.epicId,
    };

    // New task
    if (!prevTask) {
      added.push(taskRef);
      continue;
    }

    // Status change
    if (prevTask.statusId !== currTask.statusId) {
      statusChanged.push({
        task: taskRef,
        from: prevTask.statusId,
        to: currTask.statusId,
      });

      if (currTask.statusId === 'DONE') {
        completed.push(taskRef);
      }

      if (prevTask.statusId === 'DONE' && currTask.statusId !== 'DONE') {
        reopened.push(taskRef);
      }
    }

    // Epic move
    if (prevTask.epicId !== currTask.epicId) {
      const fromEpic = prevEpics.get(prevTask.epicId);
      const toEpic = currEpics.get(currTask.epicId);

      if (fromEpic && toEpic) {
        epicMoved.push({
          task: taskRef,
          fromEpic: {
            id: fromEpic.id,
            title: fromEpic.title,
          },
          toEpic: {
            id: toEpic.id,
            title: toEpic.title,
          },
        });
      }
    }
  }

  // --- EPIC LEVEL DIFF ---
  for (const [id, currEpic] of currEpics) {
    const prevEpic = prevEpics.get(id);
    if (!prevEpic) continue;

    if (prevEpic.priorityId !== currEpic.priorityId) {
      priorityChanged.push({
        epic: {
          id: currEpic.id,
          title: currEpic.title,
        },
        from: prevEpic.priorityId,
        to: currEpic.priorityId,
      });
    }
  }

  const stats = {
    tasksAdded: added.length,
    tasksCompleted: completed.length,
    tasksReopened: reopened.length,
    statusChanges: statusChanged.length,
    epicMoves: epicMoved.length,
    priorityChanges: priorityChanged.length,
  };

  return {
    schemaVersion: 1,
    date: curr.date,
    generatedAt: new Date().toISOString(),

    stats,

    added,
    completed,
    reopened,
    statusChanged,
    epicMoved,
    priorityChanged,

    meta: {
      snapshotFrom: prev?.date,
      snapshotTo: curr.date,
      eventCursor: opts
        ? {
            fromId: opts.eventFromId,
            toId: opts.eventToId,
          }
        : undefined,
    },
  };
}

export function renderDailyMarkdown(d: DailyChangelog): string {
  const lines: string[] = [];

  lines.push(`## ${d.date}`);
  lines.push('');

  if (d.added.length) {
    lines.push('### ➕ Added');
    d.added.forEach((t) => lines.push(`- ${t.title} (${t.epicId})`));
    lines.push('');
  }

  if (d.completed.length) {
    lines.push('### ✅ Completed');
    d.completed.forEach((t) => lines.push(`- ${t.title}`));
    lines.push('');
  }

  if (d.statusChanged.length) {
    lines.push('### 🔄 Status Changed');
    d.statusChanged.forEach((s) =>
      lines.push(`- ${s.task.title}: ${s.from} → ${s.to}`),
    );
    lines.push('');
  }

  if (d.priorityChanged.length) {
    lines.push('### ⚠️ Priority Changed');
    d.priorityChanged.forEach((p) =>
      lines.push(`- ${p.epic.title}: ${p.from} → ${p.to}`),
    );
    lines.push('');
  }

  return lines.join('\n');
}
