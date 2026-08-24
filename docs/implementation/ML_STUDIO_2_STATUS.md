# Mystic Lore Studio 2.0 Implementation Ledger

Last updated: 2026-08-24

This ledger records the reproducible baseline and bounded implementation work
for Mystic Lore Studio 2.0. WP2 uses Product Bible pages 11, 19-35, and 59-60
to establish the additive canonical schema, membership RLS, publication
boundary, Storage paths, deterministic legacy migration, recovery evidence,
and typed read-through adapters without switching the application UI.

## Work-package Status

| Work package | Scope | Status | Exit condition |
| --- | --- | --- | --- |
| WP0 | Current behavior, migration input, screenshots, characterization tests, ADRs | Complete | Legacy fixture, baseline screenshots, and verification commands are reproducible |
| WP1 | Route modules, garment workspace shell, domain folders, repository interfaces | Complete | Build and route parity pass without intentional feature change |
| WP2 | Schema foundation, RLS, storage paths, read-through adapters | Complete | Legacy fixture dry-runs and round-trips with zero unexplained loss; retry/recovery evidence is recorded |
| WP3-WP10 | Product Bible sequence | Not started | See Product Bible page 59 |

## Verification

Run from the repository root:

```bash
npm run validate:schema
npm run db:start
npm run db:reset
npm run test:db
npm test
npm run build
```

Characterization coverage:

- `tests/appRoutes.test.ts`: hash routes and public portfolio path parsing.
- `tests/studioData.test.ts`: legacy StudioData import/export relationships and
  current timestamp-based cloud merge behavior.
- `tests/portfolioSnapshot.test.ts`: private project exclusion and deliberate
  note publication behavior.
- `tests/editorialExport.test.ts`: ordered, immutable, deterministic editorial
  export snapshots and missing-asset warnings.
- `tests/routeParity.test.ts`: primary hash routes, public route separation, and
  the six-lens garment-workspace contract.
- `tests/shellContract.test.ts`: fixed desktop/compact responsive shell modes
  and semantic native-button navigation for keyboard access.

Latest WP2 verification:

| Command | Result |
| --- | --- |
| `npm run validate:schema` | Passed: 66 private tables, 2 public projection tables, 28 pgTAP assertions, 7 preserved legacy inputs |
| `npm run db:reset` | Passed: all six legacy migrations and four ordered WP2 migrations applied to an empty local database |
| `npm run test:db` | Passed: 28 pgTAP assertions, including owner-only settings retry, same-Studio access, cross-Studio denial, anonymous denial, Public Cut, and Storage policies |
| Authenticated local API dry run | Passed: representative fixture applied through the typed Supabase store; one owner-visible garment; duplicate execution completed safely |
| `npm test` | Passed: 7 test files, 27 tests |
| `npm run build` | Passed: TypeScript build and Vite production build |

WP2 dry-run artifacts:

- [machine-readable migration report](evidence/wp2/legacy-studio-data-v5.migration-report.json)
- [retry and recovery evidence](evidence/wp2/recovery-evidence.json)
- [ADR-0006: deterministic legacy migration and read-through](../adr/ADR-0006-deterministic-legacy-read-through.md)

## Baseline Screenshots

Existing repository screenshots are preserved as the signed-in baseline. They
were used rather than weakening authentication or creating a bypass for WP0.
See [baseline screenshot manifest](BASELINE_SCREENSHOTS.md).

## Current Screen and Route Inventory

| Area | Current route or state | Primary page/component | Current owner |
| --- | --- | --- | --- |
| Access | no authenticated Supabase session | `AuthScreen` | `useAuth` |
| Dashboard | `#/` or `#/dashboard` | `DashboardPage` | `StudioDataProvider` |
| Projects | `#/projects`, `#/projects/:id` | `ProjectsPage`, `ProjectDetailPage` | `StudioDataProvider` |
| Fabric Vault | `#/fabrics`, `#/fabrics/:id` | `FabricVaultPage` | `StudioDataProvider` |
| Workflow | `#/kanban` | `KanbanPage` | `StudioDataProvider` |
| Editorial Collections | `#/lookbooks` | `LookbooksPage`, `EditorialSceneBuilder`, `EditorialCollectionViewer` | `StudioDataProvider` and local editorial collection state |
| Portfolio manager | `#/portfolio` | `PortfolioPage` | `StudioDataProvider` |
| Studio signals | `#/stats` | `StatsPage` | `StudioDataProvider` |
| Settings and sync | `#/settings` | `SettingsPage` | `StudioDataProvider`, sync queue |
| Public portfolio | `/portfolio/:usernameSlug` | `PublicPortfolioPage` | public snapshot loader |
| Public case study | `/portfolio/:usernameSlug/:projectSlug` | `PublicPortfolioPage` | public snapshot loader |
| Public editorial | `/portfolio/:usernameSlug/editorials/:editorialSlug` | `PublicPortfolioPage` | public snapshot loader |

WP1 composition boundaries:

- `src/App.tsx`: authentication and public/private route choice only.
- `src/routes/PublicPortfolioRoute.tsx`: public snapshot route loading only.
- `src/routes/StudioAppRoute.tsx`: authenticated hash route state only.
- `src/routes/AuthenticatedStudioShell.tsx`: private shell chrome only.
- `src/routes/StudioPageRouter.tsx`: legacy feature-page routing adapter.
- `src/routes/StudioModalLayer.tsx`: form, destructive, migration, and sync
  modal orchestration.
- `src/routes/garments/GarmentWorkspaceRoute.tsx`: nested garment workspace
  boundary with six lenses and an optional future Threadline slot.

Private and public route composition remain separate; anonymous public routes
continue to load sanitized published snapshots rather than in-memory `StudioData`.

## Current State and Browser Persistence

| Concern | Current implementation | Canonical behavior today |
| --- | --- | --- |
| Studio state | `useStudioData.tsx` / `StudioDataProvider` | Optimistic React state backed by a `StudioData` aggregate |
| Aggregate storage | `src/lib/studioStorage.ts` | User-scoped localStorage cache, `LOCAL_DATA_VERSION = 6`, image URLs/Base64 stripped before persistence |
| Media and durable queue | `src/lib/imageBlobStore.ts`, `src/lib/studioSyncStorage.ts` | IndexedDB database `mystic-lore-studio-media`, stores `image-blobs` and `sync-state` |
| Image variants | `src/lib/localImages.ts`, `src/lib/imageCompression.ts` | Master, display, and compact preview variants; browser cache avoids storing signed URLs in localStorage |
| Browser recovery | `src/lib/pwa.ts`, `public/sw.js` | Development worker cleanup and production app-shell behavior |
| Cloud merge | `src/lib/supabaseStudio.ts` | Newest `updatedAt` record wins, with tombstones protecting deleted IDs |
| Public data | `src/utils/portfolioSnapshot.ts`, `src/lib/publicPortfolioPublication.ts` | Public routes render sanitized snapshots, never the private in-memory studio aggregate |

## Supabase and Storage Inventory

Private, owner-scoped application tables from the current migrations:

- `profiles`
- `projects`
- `fabrics`
- `materials`
- `tasks`
- `notes`
- `project_images`
- `yardage_entries`
- `lookbook_pages`
- `sync_tombstones`

Public-publishing tables introduced by the portfolio migrations:

- `portfolio_publications` (current application public snapshot source)
- `portfolio_profiles`
- `published_portfolio_projects`
- `published_editorials`

Storage buckets:

- `project-images`: private; authenticated owners are restricted to
  `users/{user_id}/...` paths.
- `portfolio-images`: intentionally public; restricted to approved portfolio
  presentation assets.

WP2A adds isolated canonical schemas while preserving everything above:

- `ml_private`: 66 canonical Studio-owned identity, garment, design, media,
  materials, components, technical, production, story, versioning, workflow,
  AI, and sync tables.
- `ml_public`: immutable `publications` and `publication_assets` projections.
- `ml_internal`: non-exposed membership, integrity, publication-state, and
  audit helpers.
- `studio-assets`: private canonical objects under
  `studios/{studio_id}/{domain}/...`.
- `portfolio-assets`: copied public-safe derivatives under
  `publications/{publication_id}/{publication_asset_id}/...`.

The current UI does not reference any canonical schema or bucket name. Typed
migration/read-through adapters exist under `src/domains/migration`, but no
route, page, hook, or component is cut over. See the
[canonical schema specification](../schema/ML_STUDIO_2_CANONICAL_SCHEMA.md),
[ADR-0005](../adr/ADR-0005-canonical-schema-and-public-cut-boundary.md), and
[ADR-0006](../adr/ADR-0006-deterministic-legacy-read-through.md).

All private application tables enable RLS with owner-only authenticated policies.
The portfolio publication tables intentionally allow anonymous `select` only for
rows marked public; they do not grant anonymous access to private studio tables.

## Migration Ledger

| Migration | Purpose | WP0 action |
| --- | --- | --- |
| `20260617010000_create_mystic_lore_schema.sql` | Initial Studio tables, owner RLS, triggers | Preserved as migration input |
| `20260621010000_add_cloud_sync_and_storage.sql` | Lookbook table and private `project-images` bucket | Preserved as migration input |
| `20260628010000_add_sync_tombstones.sql` | Deletion tombstones and stale-write guards | Preserved as migration input |
| `20260707010000_add_portfolio_profile.sql` | Private portfolio profile JSON on `profiles` | Preserved as migration input |
| `20260710010000_add_public_portfolio_publications.sql` | Sanitized public publication table and public asset bucket | Preserved as migration input |
| `20260711010000_create_public_portfolio_snapshots.sql` | Granular public portfolio snapshot tables | Preserved as migration input |
| `20260824051228_ml_studio_2_canonical_schema.sql` | Additive canonical schemas, types, 66 private tables, two public projection tables, foreign keys, indexes, revision and identity guards | WP2A added; no legacy mutation |
| `20260824051237_ml_studio_2_rls_and_publication_boundary.sql` | Membership RLS, least-privilege grants, public payload immutability/privacy, publication commands, audit triggers | WP2A added; 28-assertion pgTAP runtime gate passed in WP2B |
| `20260824051247_ml_studio_2_storage_policies.sql` | Canonical private/public buckets, paths, and Storage object policies | WP2A added; legacy buckets preserved |
| `20260824070629_enable_canonical_migration_bootstrap.sql` | Owner-only INSERT permission required for retry-safe settings upsert after trigger bootstrap | WP2B added; no legacy mutation |

No legacy migration or table was edited or removed. The safe, sanitized input
artifact remains `tests/fixtures/legacy-studio-data-v5.json`; WP2 retains it as
the recovery source after every dry run.

## Known Local/Cloud Merge Gaps

These are observed current behaviors, not WP0 fixes:

1. The WP2 adapter normalizes Editorial Collections and lookbook bridges in the
   migration plan, but current UI cloud merge remains legacy until WP7 cutover.
2. Canonical unit/currency/version/AI policy is separated from device-only
   backup reminder preferences; the current UI still reads the legacy settings.
3. Conflict handling is timestamp-based newest-wins with tombstones. There is
   no append-only change event stream, named Freeze Frame, structural diff, or
   non-destructive restore model yet.
4. Browser IDs now have deterministic UUIDv5 mappings in WP2 evidence. The UI
   continues to expose legacy IDs until a later domain route cutover.
5. Legacy `lookbook_pages` and newer Editorial Collections coexist by explicit
   `preserve-both-until-wp7` policy; overlap is reported, never silently merged.
6. The migration ledger includes both aggregate `portfolio_publications` and
   granular published portfolio tables. Current public routes use the aggregate
   publication loader. Selecting one canonical publication projection is an
   explicit future migration decision.

## Accepted Decisions

- [ADR-0001: Garment naming transition](../adr/ADR-0001-garment-naming-transition.md)
- [ADR-0002: Private and public separation](../adr/ADR-0002-private-public-separation.md)
- [ADR-0003: Staged migration strategy](../adr/ADR-0003-staged-migration-strategy.md)
- [ADR-0004: Route and domain boundaries](../adr/ADR-0004-route-and-domain-boundaries.md)
- [ADR-0005: Canonical schema and Public Cut boundary](../adr/ADR-0005-canonical-schema-and-public-cut-boundary.md)
- [ADR-0006: Deterministic legacy migration and read-through](../adr/ADR-0006-deterministic-legacy-read-through.md)
- Vitest is the WP0 automated test harness. It adds no browser runtime behavior.
- Existing repository screenshots are the signed-in visual baseline. WP0 does
  not add an authentication bypass merely to create new captures.
- WP1 preserves current feature-page presentation. The AppShell remains the
  established desktop fixed rail and compact mobile/tablet dock; Threadline is
  a reserved optional workspace slot, not a visible new rail yet.

## Open Decisions

- Define one primary garment plus optional supporting garments for an Editorial
  Collection before WP7.
- Define retention and migration behavior for legacy `lookbook_pages` before
  retiring that representation.

WP2A resolves three former schema decisions:

- `garment_code` is immutable and unique inside a Studio; canonical clients
  archive garment roots instead of deleting them.
- A Studio has one preferred measurement unit, each technical spec records its
  owning unit, and conversions are explicit display/export behavior.
- `ml_public.publications` plus `publication_assets` is the canonical future
  public projection. Legacy public snapshot tables remain the current route
  source until WP8 cutover.

WP2B resolves the transition decisions:

- UUIDv5 mapping is deterministic by Studio, table, legacy entity, and legacy
  ID; the representative mapping is committed in machine-readable evidence.
- Media deduplicates by checksum while role/framing relationships remain
  separate; provisional metadata checksums block silent copy assumptions.
- Notes and device backup settings stay in the legacy recovery fixture until a
  later canonical owner exists.
- Studio roots and append-only rows use duplicate-safe inserts; mutable rows use
  conflict-key upserts; interrupted runs converge on the clean-run checksum.
- No canonical publication rows, public assets, UI cutover, or legacy deletion
  occurs in WP2.
