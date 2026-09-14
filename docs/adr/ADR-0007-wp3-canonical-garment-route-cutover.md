# ADR-0007: WP3 Canonical Garment and Library Route Cutover

Status: Accepted

## Context

WP2 established a normalized, RLS-protected canonical graph and a deterministic
legacy migration plan, but the application continued to render legacy
`StudioData` project and fabric aggregates. That meant the user could still
edit copied material facts inside a project, and design/media relationships had
no first-class browser owner.

## Decision

- WP3 adds a typed canonical workspace repository under
  `src/domains/workspace`. On first use it builds the accepted deterministic
  migration plan and persists the resulting canonical graph separately from
  `StudioData` under a user-scoped browser key.
- The `#/projects`, `#/projects/:id`, and `#/fabrics` routes now render the
  canonical Garment Library, garment workspace, Material Vault, and Component
  Library. The legacy hash names remain only as routing compatibility aliases.
- A garment owns its identity and references a one-to-one design brief;
  materials, components, media, moodboard items, inventory, and suppliers are
  relationship records. The UI does not copy their source fields into the
  garment record.
- Browser persistence is an offline canonical cache, not a replacement for
  the accepted Supabase schema. When the cloud canonical writer is introduced
  in a later synchronization slice, it must use the same command/repository
  contracts and preserve existing local canonical cache recovery.
- Repeated relationship links are idempotent in the browser repository, which
  mirrors the canonical schema's unique relationship constraints.
- Deleting a garment requires explicit UI confirmation and removes only the
  garment-owned relationship rows from the local canonical workspace. Shared
  materials, components, and assets remain reusable records.

## Consequences

- New and migrated garment/library screens no longer read legacy project,
  fabric, or linked-material arrays after canonical workspace initialization.
- Legacy `StudioData` remains untouched for dashboard, workflow, editorial,
  portfolio, settings, and recovery compatibility until their dedicated work
  packages are accepted.
- Existing cloud migration evidence remains valid because WP3 does not alter
  the schema or the deterministic WP2 migration report.

## Verification

- `tests/canonicalWorkspace.test.ts`
- `tests/wp3UiContract.test.ts`
- `tests/legacyCanonicalMigration.test.ts`
- `npm run validate:schema`, `npm test`, and `npm run build`
