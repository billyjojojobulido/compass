# Compass Architecture Contract

This document works as baocheng's reminder of the overall architecture & original designated responsibilities of each segments, which defines the boundary, responsibilities, and conventions of the Compass app.

---

## Layers

### 1. Electron Main Process (`src/main/*`)

**Goal:** System boundary. Owns FS / OS paths / IPC registration.

- `compassFs.ts`
  - All file system operations live here.
  - Uses `app.getPath('userData')` and manages `compass-data/*` folders.
  - Must not import renderer code or React.
  - Must not contain business projections.

- `compassIpc.ts`
  - Defines the IPC API surface (the "local RPC protocol").
  - Registers handlers with `ipcMain.handle(...)`.
  - Handler payloads are plain JSON.

**Rules**

- ✅ Can import: `electron`, `fs`, `path`, Node utilities.
- ❌ Must not import: `renderer/*`, React, UI components.

---

### 2. Preload Bridge (`src/preload/*`)

**Goal:** Security bridge between renderer and main.

- Uses `contextBridge.exposeInMainWorld('compass', ...)`.
- Exposes a minimal `window.compass` surface.
- Renderer should not call `ipcRenderer` directly.

**Rules**

- ✅ Expose only whitelisted APIs.
- ❌ Do not expose raw fs/path or unrestricted invoke.

---

### 3. Renderer API Client (`src/renderer/services/ApiClient.ts`)

**Goal:** Typed client for calling `window.compass`.

- Renderer should not use `window.compass.invoke(channel, payload)` directly.
- UI uses `apiClient.snapshots.read(date)` and similar semantic functions.
- Central place to handle:
  - payload shapes
  - response types
  - runtime validation / error normalization (optional)

---

### 4. Domain Layer (`src/renderer/domain/*`)

**Goal:** Pure business model. No React, no FS, no IPC.

- Sprint domain: state, actions, reducer, events.
- Snapshot domain: create snapshot from SprintState (cold data).
- Week domain: WeeklyWorkspace (UI working memory), changelog, markdown rendering.
- Projections: deterministic selectors `state/events -> VM`.

**Rules**

- ✅ Pure functions + types.
- ✅ Unit-test friendly.
- ❌ No imports from React, Electron, fs.

---

### 5. UI Layer (`src/renderer/components/*`, `src/renderer/app/*`)

**Goal:** Render + interaction only.

- Reads data via:
  - `useSprint()` for live Sprint state
  - `apiClient.*` for persisted data (legacy/snapshot)
  - domain projections for view models
- UI emits intents:
  - mutate Sprint via domain actions (which emit events)
  - persist snapshots/workspace/reports via apiClient

**Rules**

- ✅ May call projections/selectors.
- ✅ May call `apiClient`.
- ❌ Must not contain FS logic.
- ❌ Must not reference IPC channel strings.

---

## Data Pipelines

### Sprint / Snapshot / Weekly

SprintStore (Live State + Events)
-> DailySnapshot (Cold Truth, persisted)
-> WeeklyWorkspace (UI working memory, persisted)
-> Weekly Projection (derived VM)
-> Markdown Archive (human artifact, persisted)
-> Sidebar History view

---

## File/Folder Conventions

`compass-data/`

- `legacy-weekly/*.md` (manual + archived weekly markdown)
- `snapshots/YYYY/*.snapshot.json` (daily snapshots)
- `events/*.ndjson` (future)
- `reports/*` (optional future)
- `config/*` (optional future)

---

## IPC Naming Convention

Use namespaced channels:

- `compass:legacy:list`
- `compass:legacy:read`
- `compass:snapshot:write`
- `compass:snapshot:read`
- `compass:snapshot:list`

Payloads are always JSON:

- `{ date: "YYYY-MM-DD" }`
- `{ fileName: "Week 72 (2026-01-19).md" }`

---

## Upgrade Strategy (Schema Versioning)

All persisted files must include schema version:

- `DailySnapshot.schemaVersion`
- `WeeklyWorkspace.schemaVersion`
- `DailyChangelog.schemaVersion`

Upgrades should be handled in domain migration helpers, not UI.

---

## Golden Rules

1. Renderer never calls raw IPC directly.
2. `ApiClient` is the only entry to persisted data.
3. Domain has no side effects.
4. Projections are deterministic.
5. UI is replaceable; data is durable.
