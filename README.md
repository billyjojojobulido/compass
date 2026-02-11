## Compass 🧭

`Stay on course, even when work drifts.`

**Compass 🧭** is a local-first work log and kanban system designed for individuals.

Unlike team-oriented task managers, Compass is built around a personal perspective:
tracking progress, dependencies, blockers, and unfinished commitments.

All data lives in plain local files.
Tasks can flow across a kanban board, form parent-child structures, and be reflected into weekly logs automatically — helping you stay oriented, even when work becomes fragmented and uncertain.

## Install

Clone the repo and install dependencies:

```bash
npm install
```

## Starting Development

Start the app in the `dev` environment:

```bash
npm start
```

## Packaging for Production

To package apps for the local platform:

```bash
npm run package
```

## Architecture

### System Breakdown

<pre>
[ UI Views ]
  ├─ SprintBoard
  ├─ PriorityView
  ├─ CurrentWeeklyReport
  └─ HistoryWeeklyReport
        ↑
[ Projections Layer ]
  ├─ selectDailyReport(events, state, date)
  ├─ selectWeeklyReport(events, state, weekId)
  ├─ selectCarryOverTasks(prevWeekReport)
  └─ selectLegacyWeekList(fsIndex)
        ↑
[ Domain Store ]
  ├─ SprintState
  ├─ SprintEvents[]
  └─ Actions (emit events)
        ↑
[ Persistence Layer ]
  ├─ Event Log Files
  ├─ Weekly Report Files
  └─ Legacy Import Files
        ↑
[ Electron IPC / FS ]
</pre>

### Data Pipelines

<pre>
SprintStore + Events
        ↓
Daily Snapshot (State Layer / Cold Data)
        ↓
Weekly Projection
        ↓
Weekly Report (Presentation Layer / Human Readable)
        ↓
Sidebar History View
</pre>

### Data Lifecycle Map

<pre>
┌───────────────────────────────┐
│           User Intent         │
│  (UI interactions, decisions) │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│          Domain Actions       │
│  createTask / moveTask / ...  │
└───────────────┬───────────────┘
                │ emit
                ▼
┌───────────────────────────────┐
│           Event Log           │   ← append-only, grows forever
│   events/YYYY-MM.ndjson       │
│                               │
│  - immutable                  │
│  - replayable                 │
│  - analytics source           │
└───────────────┬───────────────┘
                │ replay / reduce
                ▼
┌───────────────────────────────┐
│          SprintState          │   ← bounded working set
│        (state.json)           │
│                               │
│  - current epics/tasks only   │
│  - hot data                   │
│  - hydrated on app start      │
└───────────────┬───────────────┘
                │ snapshot (daily)
                ▼
┌───────────────────────────────┐
│        Daily Snapshot         │   ← cold state checkpoint
│  snapshots/YYYY/YYYY-MM-DD    │
│                               │
│  - full state clone           │
│  - deterministic              │
│  - used for diff              │
└───────────────┬───────────────┘
                │ project
                ▼
┌───────────────────────────────┐
│       Weekly Workspace        │   ← editable working doc
│      workspace.json           │
│                               │
│  - Mon–Fri days               │
│  - changelog per day          │
│  - day off / collapse / tags  │
│  - NOT source of truth        │
└───────────────┬───────────────┘
                │ archive
                ▼
┌───────────────────────────────┐
│      Legacy Weekly Report     │   ← human-readable history
│   legacy-weekly/WeekXX.md     │
│                               │
│  - frozen                     │
│  - versioned by content       │
│  - shown in Sidebar history   │
└───────────────────────────────┘
</pre>
