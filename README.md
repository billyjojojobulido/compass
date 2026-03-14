## Compass 🧭

**Compass** is an offline-first desktop tool that helps engineers **track daily work, understand weekly progress, and generate structured work reports automatically**.

Instead of writing weekly reports from scratch, Compass records your work activity during the week and produces a **clear changelog-style summary** that can be exported as Markdown.

Compass is designed for developers who want a lightweight system to **reflect on work progress, manage personal tasks, and document technical activities** without relying on heavy team management platforms.

## Why Compass Exists

Many engineers experience the same problems that I have:
• Work is spread across multiple tools (Jira, GitHub, Slack, emails).
• Weekly reports take time to reconstruct from memory.
• Personal technical exploration and low-priority work rarely appear in official task trackers.
• Existing productivity tools are either too heavy or too generic.

Compass solves this by acting as a personal work log + task board + weekly reporting engine, designed specifically for developers.

## Compass Philosophy

Compass follows three guiding principles:

> Offline First

- Your work log belongs to you.
  No cloud dependency is required.

> Lightweight but Structured

- Compass focuses on clarity and reflection, not heavy project management.

> Developer-Centric

The tool is built around real developer workflows:

- technical exploration
- debugging sessions
- incremental progress
- personal knowledge tracking

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
