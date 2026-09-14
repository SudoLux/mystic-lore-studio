# ADR-0004: Separate Route Composition from Legacy Domain Implementations

Status: Accepted

## Context

The previous `App.tsx` composed authentication, public portfolio loading,
private route state, page selection, shell chrome, and all application dialogs.
That made it too easy for future public or domain work to couple directly to
the private `StudioData` aggregate.

## Decision

WP1 separates the composition responsibilities without changing the current
feature pages or persisted data:

- `App.tsx` is the access boundary only.
- `PublicPortfolioRoute` owns anonymous public snapshot loading and never reads
  `StudioData`.
- `StudioAppRoute` owns authenticated hash route state.
- `AuthenticatedStudioShell` owns only private chrome.
- `StudioPageRouter` selects existing feature pages.
- `StudioModalLayer` owns form, delete, migration, and sync overlays.
- `GarmentWorkspaceRoute` is the stable nested garment entry point. Its six
  lenses are explicit contracts while the current Project Detail tabs remain a
  legacy adapter.

Typed command, repository, selector, and sync contracts live in `src/domains`.
They describe the target seams but do not move persistence or schema ownership
ahead of WP2.

## Consequences

- Public pages stay a snapshot projection and cannot accidentally reuse
  authenticated in-memory studio records.
- The existing AppShell keeps its visual behavior, including the fixed desktop
  rail and compact mobile/tablet navigation.
- Later work may replace a legacy page or persistence adapter at one boundary
  at a time.
- Threadline is an optional garment-workspace slot, deliberately reserved until
  the canonical garment relationship layer exists.
