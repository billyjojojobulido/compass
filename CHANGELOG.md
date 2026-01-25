# Change Log

Updates in minor version will be recorded in this file.

---

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
