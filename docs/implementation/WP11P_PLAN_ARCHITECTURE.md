# WP11P-A — Plan Workspace Architecture

## Scope

Plan now has a shared presentation layer for its three views:

- **Flow** answers where a garment is.
- **Tasks** answers what needs to happen.
- **Calendar** answers when it happens.

This pass does not redesign the individual Flow, Tasks, or Calendar workbenches. It establishes their common, canonical context first.

## Existing behavior retained

- `garments.phase` remains the only Flow-stage value. Moving a garment updates that canonical record and does not alter its tasks.
- `release_tasks` remains the only task record. Creation, status editing, due dates, garment links, change events, offline outbox replay, and conflicts remain unchanged.
- `calendar_events` remains the only standalone event record for fittings, meetings, shoots, reviews, deadlines, and production appointments.
- A due task is represented in Calendar by a transient display item. No task or event is copied into another table.
- Existing RLS, Supabase persistence, cloud sync, recovery, and canonical media delivery are unchanged.

## Shared selectors and adapters

`src/lib/canonicalPlanPresentation.ts` introduces presentation-only selectors:

- `selectPlanGarmentSummaries` — canonical garment id, cover image, collection, type, phase, open-task count, next task, and safe warning state.
- `selectPlanTaskItems` — canonical task with its linked garment summary and task fields.
- `selectPlanCalendarItems` — dated tasks and standalone events projected into one ordered calendar feed, marked by source without duplicating a canonical record.
- `selectPlanWorkspacePresentation` — the common view model consumed by all three Plan tabs.

Garment cover images resolve through `canonicalGarmentCover`, so they continue to use private canonical media relationships and authenticated delivery.

## Presentation state

Only temporary interface state is introduced or retained:

- active Plan tab (`Flow`, `Tasks`, or `Calendar`)
- whether the existing create task/event form is open

No freeform coordinates are currently needed for the existing grouped task presentation. Future freeform task layouts should keep positions as a small, separate presentation preference keyed by canonical task id; they must not duplicate task records or alter task ownership.

## Schema decision

No schema or migration change is required. The canonical model already contains the garment, task, due-date, status, event, stage, and media relationships required for this foundation.

## Interaction foundation

- Tabs use one tablist with roving keyboard focus: Arrow Left/Right, Home, and End change views.
- Flow remains horizontally scrollable for desktop, iPad, and mobile.
- Flow cards now consume the shared garment context, including canonical cover, open tasks, next task, and supported warning.
- Tasks and Calendar consume the same garment context, so garment names remain aligned across views.

## WP11P-B — Flow Board visual recovery

Flow is now an image-led horizontal atelier pipeline rather than a compressed
table of stages.

- It retains the eight canonical `garments.phase` values: Brief, Design,
  Materials, Technical, Sampling, Production, Story, and Portfolio.
- Each 320–328px column has a restrained stage description, count, deliberate
  empty/drop state, and natural horizontal scrolling on every viewport.
- Each garment card resolves the existing private canonical cover image and
  presents its collection, type, phase, open-task count, next move, and
  supported warning without creating another garment record.
- A separate drag handle prevents drag gestures from competing with opening a
  garment. Pointer, touch, and keyboard drag sensors use the same
  `updateGarment(..., { phase })` command as the visible stage dropdown.
- Clicking a card opens that garment workspace. The dropdown remains the
  explicit keyboard-friendly alternative for moving a garment; a drag/drop
  success or failure is announced through a polite live region.
- Dragging only updates the existing canonical phase and therefore preserves
  canonical change events, offline outbox replay, conflict handling, RLS,
  private media delivery, and reload behavior.

## WP11P-C — Mystic Lore Task Pinboard

Tasks are now a visual studio pinboard, not a second Kanban system. Every note
continues to render the same canonical `release_tasks` row used by Flow,
garment context, and the Calendar projection.

- The four organization modes are **Priority**, **Garment**, **Due date**, and
  **Freeform**. They regroup the same task references in memory; no records are
  copied or transformed into a board-specific task type.
- Priority uses Urgent, This week, and Later. Garment mode adds a small,
  private-media garment header. Due-date mode uses chronological groups.
  Completed and cancelled tasks remain available in a collapsible archive, and
  can be reopened from the same note.
- Notes provide deliberate priority treatment, completion/reopen, linked
  canonical garment thumbnail, due date, status, and an accessible detail
  drawer for title, notes, garment, priority, status, due date, and deletion.
  Task deletion removes only the canonical task, never the garment, media, or
  a standalone calendar event.
- The compact New task composer captures title, garment, priority, due date,
  and notes without requiring a full-page form. A date on the canonical task
  remains visible in Calendar through the existing transient task projection.
- Freeform coordinates are saved under
  `plan-task-pinboard:<studioId>` in the existing canonical IndexedDB settings
  store. They are an intentionally local presentation preference: they never
  alter task rows, ownership, revisions, RLS, cloud sync, or Calendar data.
  Desktop and iPad offer touch/pointer/keyboard drag handles; narrow mobile
  keeps the same notes in a stacked Priority layout.

## Schema decision

No schema or migration change is required for WP11P-C. Task editing and
deletion use new small commands over existing canonical `release_tasks` rows,
so standard revisions, change events, conflict handling, offline-outbox replay,
and second-device hydration remain in force. Freeform positions deliberately
remain outside the canonical domain model.

## Remaining WP11P work

1. **Calendar:** month/week/agenda modes, responsive detail panel, date navigation, and event editing.
2. **Cross-view polish:** deep links, transitions, loading skeletons, empty states, and visual regression coverage at desktop, iPad, and mobile sizes.
