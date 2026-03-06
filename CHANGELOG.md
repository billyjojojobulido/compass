# Change Log

Updates in minor version will be recorded in this file.

---

## [0.1.7] - 2026-xx-xx

### Added

- 🚀 Tech Debt View
  - finalized MVP stage of Tech Debt page to display & persist long-term tasks that shall not be stored in SprintBoard
  - enhanced the UI & interaction features on Tech Debt UI.
- ✨ Week Report Summary Modal
  - allow users to manually edit & save week summary

### Changed

- 🔥 updated archive week report flow
  - click archive btn -> show week report edit modal -> click confirm btn -> do the archive
- 🔥 Week Report now supports the summary of Tech Debt writing

### Fixed

- fixed declared wrong data type when reading workspace summary issue
- fixed blocked aria-hidden on an element issue on Week Summary modal issue
- fixed some data issue & type issue in Tech Debt related data types

## [0.1.6] - 2026-02-28

### Added

- 🚀 Sprint Event Log
  - implemented append-only monthly NDJSON event log
  - events are now written to persisting file.
  - now offically move to `"Event-driven" age`
  - added `meta.cursor`
  - reducer starts to write cursor info
- ✨ Changelog Projection Refinement
  - added `selectDailyChangelog` to better distinguish events for changelog
  - added `selectDayEpicGroups` to help display :: divide projection from UI
- 🚀 Week View UI : Major renovation
  - 🔥 added DayEpicChangelog Drawer structure
  - events are now written to persisting file.
  - now offically move to `"Event-driven" age`
  - added `meta.cursor`
  - reducer starts to write cursor info
- 🚀 Tag System
  - 🔥 TagModal added to support linear / raycast style

### Changed

- ✨ State & Events are now separated
  - events & state writing are no longer mixed together
  - `PersistedSprintDoc` updated from `v1` to `v2`
- ✨ Weekly Workspace / Report System
  - `WeeklyWorkspace` updated to `v2` with more data to support fancier week report, incl (dayMeta, notes, meta.fromSnapshots)
- ✨ Markdown Export - Major Update
  - updated `renderDailyMarkdown`
  - updated `renderWeeklyMarkdown` :: priroty, daily digest done, week summary & tech debt WIP
  - arhchive week finally implemented

### Fixed

- fixed content overflow issue when height shrinks issue
- fixed click on Daily Markdown hitting undefined error issue
- fixed some button color issue

## [0.1.5] - 2026-02-10

### Added

- 🚀 Weekly Workspace model
  - Mon–Fri workspace derived from daily snapshots
  - Supports day-off markers and UI-specific metadata
  - Stored as editable workspace.json
- ✨ Current Week View (MVP)
  - Accordion-based Mon–Fri layout
  - Snapshot presence & completion indicators
  - Entry point for daily / weekly reporting
- Legacy Weekly Report support
  - Unified handling of generated and imported weekly markdown logs
  - Sidebar history view backed by filesystem index

### Changed

- ✨ Clarified data responsibilities across layers:
  - SprintState → working set only
  - Snapshots → cold state checkpoints
  - Workspace → editable weekly draft
  - Legacy markdown → immutable history
- ✨ Refined IPC boundary with explicit Compass APIs.
- ✨ Imporved preload exposure and API safety guarantees

### Fixed

- eliminated invalid button nesting in CurrentWeekView
- corrected snapshot loading edge cases for non-working days
- improved error handling for missing snapshot files

## [0.1.4] - 2026-02-01

### Added

- 🚀 Daily Snapshot schema and generator (createDailySnapshot)
- 🚀 Snapshot filesystem structure (snapshots/YYYY/YYYY-MM-DD.snapshot.json)
- 🚀 IPC API for snapshots (compass:snapshot:write/read/list)
- 🚀 CurrentWeekView with Monday–Friday accordion layout
- 🚀 “Archive Today” workflow to persist current sprint state as a daily snapshot
- 🚀 Legacy weekly log integration (list/read via IPC)
- Window bridge (window.compass.invoke) for unified domain FS access

### Changed

- 🚀 Sidebar weekly section now supports dynamic history sources (legacy + future reports)
- 🚀 Navigation model expanded to support current week vs historical week views
- 🚀 Snapshot generation decoupled from UI state (domain-driven from SprintStore)
- View components (SprintBoard / Priority / CurrentWeek) now own their own headers and actions
- deprecaed unnecessary channel compass:report:list

### Fixed

- resolved nested <button> hydration error in CurrentWeek accordion headers
- improved snapshot directory creation and safe path handling
- stabilized IPC channel naming between preload and main process
- corrected drag and navigation side effects after ContentHeader refactor

## [0.1.3] - 2026-01-28

### Added

- 🚀 new dependencies `react-markdown` & `remark-gfm`

### Changed

- 🚀 updated the styling of legacy week logs markdown rendering to make it looks more like MacOS notes app style.

## [0.1.2] - 2026-01-28

### Added

- 🚀 Legacy Weekly Log support (file-based import of historical reports)
- 🚀 LegacyWeekView component for rendering historical week reports
- sidebar integration for browsing historical weeks (Week 1 → current)
- content routing for separating Current Week Summary vs Historical Week View
- redid time utility layer (time.ts) for local-day and local-week range calculations

### Changed

- 🚀 introduced a dual-report architecture:
  - Daily Snapshot (event-driven, structured data)
  - Weekly Report (Markdown, human-readable artifact)
- 🚀 navigation model extended to distinguish between Sprint/Views and Historical Reports
- 🚀 domain events positioned as the upstream source for future report generation

### Fixed

- resolved layout issues when displaying large historical reports inside the Content shell
- eliminated text selection artifacts in sidebar week rows for cleaner navigation UX

## [0.1.1] - 2026-01-27

### Added

- 🚀 Priority View as a standalone, projection-driven decision panel
- 🚀 priority grouping projection (selectPriorityGroups) for lane-based epic visualization
- 🚀 priority lane counts and visual emphasis by rank
- 🚀 epic redirect action from Priority View to Sprint Board
- config-driven priority theming (backgrounds, accents, and card styling via PriorityDef)
- focus/decision projection (selectFocusEpics) for surfacing high-impact epics
- blocked/health stats projection (selectBlockedStats) for epic risk awareness
- responsive lane layout with adaptive card grid and glass-layer styling

### Changed

- 🚀 Priority View UI now consumes projections only (no direct state mutation)
- 🚀 AppShell layout adjusted to support fixed sidebar width with responsive content scaling
- epic cards refactored into reusable, theme-aware presentation components
- selection and navigation logic centralized at the Content/AppShell level
- priority color, tone, and visual semantics moved from CSS to config

### Fixed

- improved visual separation between priority lanes and epic cards (contrast, elevation, and glass layering)
- resolved non-responsive lane/card behavior on window resize
- corrected inconsistent epic counts and progress display across priority groups
- removed hardcoded priority rank → UI mappings from the view layer

## [0.1.0] - 2026-01-25

### Added

- 🚀 SprintStore with SprintProvider and useSprint() hook
- 🚀 domain actions API (createEpic, updateTask, moveTask, reorderTask, etc.)
- 🚀 structured SprintEvent emission for all mutations
- 🚀 config-driven semantics (SprintConfig: statuses, priorities, stakeholders)
- 🚀 projection layer for derived views (e.g. Priority View, Reports)
- drag origin tracking to distinguish MOVE vs REORDER events

### Changed

- 🚀 SprintBoardView now renders projections and emits intents instead of mutating state
- 🚀 business rules (closed status, auto-sink, cross-epic moves) moved into reducer/actions
- 🚀 epic/task ordering managed centrally in taskOrderByEpic
- 🚀 UI components receive maps (status/priority/stakeholder) instead of hardcoded labels

### Fixed

- eliminated drag-and-drop event spam by committing state only on onDragEnd
- Corrected closed-task behavior (disable drag, auto-sink to bottom, strike-through title)
- resolved inconsistent cross-epic ordering during preview vs commit phase
- removed hardcoded status/priority logic from UI layer

## [0.0.2] - 2026-01-22

### Added

- extended `Sprint Board` component based on `Kanban` component in `0.0.1`

- `config.json` file allowing users to customize sprint board related elements, such as status, stakeholders, etc.

### Changed

- column now is also draggable

- task card & epic column status can edit

- task & epic column now sortable

### Fixed

- fixed title too long crashing nearby buttons issue

- fixed styling issue when tasks are overlay

- fixed the incorrect usage of `useRef` issue
