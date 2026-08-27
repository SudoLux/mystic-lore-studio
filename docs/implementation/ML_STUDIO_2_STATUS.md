# Mystic Lore Studio 2.0 Implementation Ledger

Last updated: 2026-08-26

This ledger records the reproducible baseline and bounded implementation work
for Mystic Lore Studio 2.0. WP2 establishes the additive canonical schema,
membership RLS, publication boundary, Storage paths, deterministic legacy
migration, recovery evidence, and typed read-through adapters. WP3 cuts the
garment and reusable-library routes over to the persisted canonical workspace
without changing unrelated legacy domains. WP4 now includes the complete
Technical Studio: source-evidenced flats, stable POM authoring, measurements,
fit actuals, non-destructive grading, linked BOM, ordered construction, release
validation, governed waivers, and deterministic structured tech packs. WP5
adds the append-only garment change ledger, named Freeze Frames, structural
comparison, consequence-aware scoped restore, conflict handling, and protected
release/publication lineage. WP6 completes the released-version production
chain from supplier/sample/fit evidence through quantity costing, factory
orders, milestones, QC results, waivers, and final decision.
WP7 normalizes private Editorial Collections and Story from System. WP8 now
cuts Portfolio Studio and anonymous routes over to immutable, allowlisted
Public Cuts with copied rights-cleared media derivatives.

## Work-package Status

| Work package | Scope | Status | Exit condition |
| --- | --- | --- | --- |
| WP0 | Current behavior, migration input, screenshots, characterization tests, ADRs | Complete | Legacy fixture, baseline screenshots, and verification commands are reproducible |
| WP1 | Route modules, garment workspace shell, domain folders, repository interfaces | Complete | Build and route parity pass without intentional feature change |
| WP2 | Schema foundation, RLS, storage paths, read-through adapters | Complete | Legacy fixture dry-runs and round-trips with zero unexplained loss; retry/recovery evidence is recorded |
| WP3 | Garment, collection, design brief, moodboard, media relationships, Material Vault, Component Library, and reusable templates | Complete | Core relationships replace copied project/material fields; canonical routes pass parity and recovery checks |
| WP4a | Technical specification root, Technical Studio home, flats, annotations, files, validation, and export artifact foundation | Complete | A seeded garment can create, review, approve, version, validate, and export required source-evidenced flats |
| WP4b | Stable POM, measurement sets and values, fit actuals, grading preview/commit, structural compare, and selective restore | Complete | A seeded garment defines POM once, validates base/graded sets, and records sample actuals against stable points |
| WP4c | Linked BOM, ordered construction, release validation and waivers, templates, and deterministic structured tech packs | Complete | A seeded garment produces a validated, reproducible, approved tech pack from structured data |
| WP5 | Append-only change ledger, named Freeze Frames, domain-aware diff, scoped restore, conflicts, and release/publication protection | Complete | Restoring an older scope creates a new version while all earlier and pinned evidence remains unchanged |
| WP6a | Supplier/factory capabilities, pinned sample rounds, fit sessions, measurements, issues, private evidence, decisions, and provenance-preserving promotions | Complete | Sample and fit decisions are reproducible, version-pinned, and traceable to stable POM and media evidence; costing, orders, and QC remain deferred |
| WP6b | Quantity costing, released-version production orders, milestones, QC templates/results/waivers, decisions, and integrated timeline | Complete | Sample, fit, cost, order, milestone, and QC decisions reference the correct released garment version |
| WP7 | Editorial Collection normalization, Story from System, private export manifests, and canonical route cutover | Complete | Canonical collections preserve legacy editorial/lookbook evidence, sync-ready records remain private, and approved exports are checksum reproducible |
| WP8 | Portfolio profile/project/editorial curation, Public Cut preview, immutable publication history, copied media, and anonymous route cutover | Complete | Anonymous access exposes only selected immutable payloads and copied public-safe derivatives, proven by application and database privacy tests |
| WP9-WP10 | Remaining Product Bible sequence | Not started | WP9 begins candidate-only AI workflows; WP8 intentionally adds no AI writes |

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

Latest WP6 completion verification:

| Command | Result |
| --- | --- |
| `npm run validate:schema` | Passed: 75 private tables, 2 public projection tables, 82 pgTAP assertions, 7 preserved legacy inputs |
| `npm run db:reset` | Passed: all prior migrations and additive `20260826080100_complete_wp6_costing_orders_qc.sql` apply to an empty local database |
| `npm run test:db` | Passed: 82 pgTAP assertions, including same-Studio QC access, cross-Studio mutation denial, reviewer read, anonymous denial, table grants, RLS, provenance triggers, append-only waivers, and tenant-first indexes |
| `npm test` | Passed: 20 files, 94 tests, including four-decimal rounding, ISO currency, quantity scenarios, waste, invalid totals, immutable order pinning, stale-source warnings, QC failures/waivers, ledger evidence, and integrated chronology |
| `npm run build` | Passed: TypeScript and Vite production build |

Latest WP7 completion verification:

| Command | Result |
| --- | --- |
| `npm run validate:schema` | Passed: 77 private tables, 2 public projection tables, 87 pgTAP assertions, and 7 protected legacy inputs |
| `npm run db:reset` | Passed: every migration, including additive `20260826103000_normalize_editorial_story_from_system.sql`, applies to an empty local database |
| `npm run test:db` | Passed: 87 pgTAP assertions, including private Editorial relationship/export RLS, operation-specific member policies, source provenance, and append-only export evidence |
| `npm test` | Passed: 21 test files, 98 tests, including legacy normalization, source staleness, ordered scenes, asset-rights export gates, and deterministic private export identity |
| `npm run build` | Passed: TypeScript and Vite production build |

WP7 evidence:

- [ADR-0016: canonical Editorial Collections and Story from System](../adr/ADR-0016-wp7-editorial-story-from-system.md)
- `tests/wp7Editorial.test.ts`: legacy normalization report, one primary plus
  supporting garments, keyboard-safe scene order, source checksum staleness,
  asset-rights export gate, and deterministic private export identity.

Latest WP8 completion verification:

| Command | Result |
| --- | --- |
| `npm run validate:schema` | Passed: 81 private tables, 2 public projection tables, 100 pgTAP assertions, and 7 protected legacy inputs |
| `npm run db:reset` | Passed: every migration, including additive `20260826121000_implement_wp8_public_cuts.sql`, applies to an empty local database |
| `npm run test:db` | Passed: 100 pgTAP assertions, including same-Studio RLS, cross-Studio and anonymous denial, recursive root/nested allowlists and denylist, immutable history, unpublish, source-version gates, and copied-derivative provenance |
| `npm test` | Passed: 23 test files, 109 tests, including privacy regression fixtures, nested editorial allowlisting, selected relationships, staleness, public media copying, immutable republish history, offline release denial, route isolation, responsive controls, and exact-preview reuse |
| `npm run build` | Passed: TypeScript and Vite production build; the existing bundle-size advisory remains non-blocking |

WP8 evidence:

- [ADR-0017: immutable Public Cuts and anonymous route isolation](../adr/ADR-0017-wp8-immutable-public-cuts.md)
- `tests/wp8PublicCuts.test.ts`: payload allowlist/denylist, source version
  staleness, rights-cleared media manifest, copied paths, publish/unpublish
  history, fresh-state gates, and payload-size regression.
- `tests/wp8PortfolioUiContract.test.ts`: manager tabs, preview parity,
  anonymous loader isolation, keyboard controls, and narrow-screen contracts.

WP6 completion evidence:

- [ADR-0014: quantity-scenario costing and currency integrity](../adr/ADR-0014-wp6-quantity-costing.md)
- [ADR-0015: released-version orders, QC decisions, and production timeline](../adr/ADR-0015-wp6-orders-qc-timeline.md)
- `tests/wp6ProductionCompletion.test.ts`: exact cost math, quantity/fixed
  scenarios, ISO validation, approved sheet/order pinning, staleness,
  milestones, QC failure/waiver/decision, change ledger, and chronology.
- `tests/wp6ProductionUiContract.test.ts`: Cost Sheet, COGS/wholesale/margin,
  order stale-source warning, QC checklist/waiver/release decision, Timeline,
  keyboard navigation, and narrow-table fallbacks.

Latest WP6a completion verification:

| Command | Result |
| --- | --- |
| `npm run validate:schema` | Passed: 70 private tables, 2 public projection tables, 68 pgTAP assertions, 7 preserved legacy inputs |
| `npm run db:reset` | Passed: all prior migrations and additive `20260826061816_implement_wp6_production_sampling_fit.sql` apply to an empty local database |
| `npm run test:db` | Passed: 68 pgTAP assertions, including evidence-table RLS/grants, normalized target constraints, provenance triggers, and tenant-first indexes |
| `npm test` | Passed: 19 files, 88 tests, including pinned sample/fit lineage, stable-POM actuals, multi-round behavior, conflict rejection, evidence queue/retry/reload, and provenance-preserving task/version-note promotion |
| `npm run build` | Passed: TypeScript and Vite production build |

WP6a evidence:

- [ADR-0013: version-pinned sampling and fit provenance](../adr/ADR-0013-wp6-sampling-fit-provenance.md)
- `tests/wp6Production.test.ts`: canonical sourcing, sample, session,
  measurement, issue, decision, promotion, offline evidence, stable-POM, and
  no-cost/no-order/no-QC boundary coverage.
- `tests/wp6ProductionUiContract.test.ts`: Production Home, Fit Review,
  gallery, mobile capture, queue/retry, decision, task, and promotion
  interaction contracts.

Latest WP5 completion verification:

| Command | Result |
| --- | --- |
| `npm run validate:schema` | Passed: 67 private tables, 2 public projection tables, 60 pgTAP assertions, 7 preserved legacy inputs |
| `npm run db:reset` | Passed: all six legacy migrations, four ordered WP2 migrations, three ordered WP4 migrations, and the additive WP5 migration applied to an empty local database |
| `npm run test:db` | Passed: 60 pgTAP assertions, including tenant/publication/Storage policies, fresh revision commands, append-only audit evidence, cross-Studio/anonymous denial, stale publication rejection, and protected release deletion |
| Authenticated local API dry run | Passed: representative fixture applied through the typed Supabase store; one owner-visible garment; duplicate execution completed safely |
| `npm test` | Passed: 17 test files, 79 tests, including replay/reverse evidence, deterministic checksums, structural domain diff, scoped restore, dependency warnings, conflict policies, protected frames, and responsive UI contracts |
| `npm run build` | Passed: TypeScript build and Vite production build |

WP5 evidence:

- [ADR-0012: append-only Freeze Frames and structural restore](../adr/ADR-0012-wp5-freeze-frames-structural-restore.md)
- `tests/wp5Versioning.test.ts`: checksums and parent/current lineage,
  high-value mutation ledger, replay/reverse, domain-aware comparison, scoped
  restore, pinned dependency warnings, release protection, fresh-state gates,
  scalar/ordered/media/tombstone conflict policies, and evidence preservation.
- `tests/wp5VersioningUiContract.test.ts`: Versions timeline, A/B selectors,
  desktop and narrow-screen diff, scoped selection, Freeze Frame dialog,
  restore consequence preview, conflict resolution, and fresh-state gate.
- Live authenticated verification captured the garment-wide `WP5 browser
  review` Freeze Frame, compared it with protected Release A, selected 21
  restorable structural changes, and surfaced the pinned release and tech-pack
  export before commit. Desktop and 390 px layouts passed without page overflow
  or console warnings/errors; the restore itself was intentionally left at
  preview so released working data was not changed.

WP4c evidence:

- [ADR-0010: release gates, waivers, and approval](../adr/ADR-0010-wp4-release-gates-waivers-and-approval.md)
- [ADR-0011: deterministic structured tech pack](../adr/ADR-0011-deterministic-structured-tech-pack.md)
- `tests/wp4ReleasePack.test.ts`: linked and intentional-free-text BOM rows,
  unit errors, substitutions, shortage/cost effects, stable construction order,
  template application, waiver governance, privacy rejection, full release,
  and byte-identical repeated export.
- `tests/wp4ReleaseUiContract.test.ts`: RelationshipPicker integration,
  component detail, accessible ordering, template application evidence,
  grouped validation, release confirmation, export stages, manifest, and AI
  candidate-only language.
- Live authenticated verification completed the seeded Waden garment with one
  linked approved shell BOM row and one machine/stitch/seam-defined construction
  step, approved Release A with zero waivers, and recorded the six-section
  `MLS-B6B08932-tech-v001-template-v1-cf258c47.zip` artifact. Desktop and
  390 px verification passed without horizontal overflow or console errors.

WP4a evidence:

- [ADR-0008: Technical flat source evidence](../adr/ADR-0008-wp4-technical-flat-source-evidence.md)
- `tests/technicalStudio.test.ts`: required-view/source validation, revision
  comparison, structured critical-annotation resolution, approval, checkpoint,
  and deterministic filename checks.
- `tests/wp4UiContract.test.ts`: keyboard canvas/view switching, source and
  revision identity, visible state gates, and responsive layout contracts.
- Live authenticated browser verification passed on desktop and 390 px width
  with no horizontal overflow or console errors.

WP4b evidence:

- [ADR-0009: POM, measurement, and grading model](../adr/ADR-0009-wp4-pom-measurement-and-grading.md)
- `tests/measurements.test.ts`: migrated-state hydration, unit conversion,
  tolerance boundaries, stable POM identity, fit variance, grade preview and
  commit, CSV validation/import, structural comparison, and selective restore.
- `tests/wp4MeasurementUiContract.test.ts`: synchronized POM canvas/list,
  Enter/Escape editing, dirty/conflict feedback, paste validation, mobile row
  cards, non-destructive grading, and restore-selection contracts.
- Live authenticated verification created one seeded POM/base target/sample
  actual, previewed XS-XL grading, and passed 390 px reflow with no horizontal
  page overflow or console errors.

WP3 cutover evidence:

- [ADR-0007: canonical garment and library route cutover](../adr/ADR-0007-wp3-canonical-garment-route-cutover.md)
- `tests/canonicalWorkspace.test.ts`: fixture-to-canonical parity plus one-to-one
  brief, reusable variant, inventory-ledger, moodboard/media, and dependency
  deletion checks.
- `tests/wp3UiContract.test.ts`: loading/error/offline, keyboard-native
  relationship selection, destructive confirmation, and responsive layout
  contract checks.

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
| Garments | `#/projects`, `#/projects/:id` (legacy-compatible paths) | `GarmentLibraryPage`, `CanonicalGarmentWorkspacePage` | `CanonicalWorkspaceProvider` |
| Libraries | `#/fabrics` (legacy-compatible path) | `LibraryVaultPage` (Material Vault and Component Library) | `CanonicalWorkspaceProvider` |
| Technical Studio | `#/technical`, `#/technical/:garmentId` | `TechnicalStudioPage`, `FlatCanvas`, `POMCanvas`, `MeasurementDataGrid`, `BomWorkspace`, `ConstructionWorkspace`, `ReleaseWorkspace`, grading, validation, and export panels | `CanonicalWorkspaceProvider` and technical, measurement, and release commands/repositories |
| Production & fit | `#/production`, `#/production/:garmentId` | `ProductionPage`, sample rounds, Fit Review, private evidence gallery, decision and promotion controls | `CanonicalWorkspaceProvider` and production repositories |
| Versions & Diff | `#/versions` | `VersionsPage`, `DiffViewer`, `FreezeFrameDialog`, `RestorePreview`, `ConflictResolver`, `ReleaseGate` | `CanonicalWorkspaceProvider` and versioning commands/repository |
| Workflow | `#/kanban` | `KanbanPage` | `StudioDataProvider` |
| Editorial Collections | `#/lookbooks` | `EditorialStudioPage`, canonical collection/scene/block/asset/export records, Story from System | `CanonicalWorkspaceProvider` and Editorial repository |
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
- `src/routes/StudioPageRouter.tsx`: compatibility router; Garments and
  Libraries resolve to canonical WP3 route modules.
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
| Public data | `src/domains/portfolio/publicCutRepository.ts`, `src/lib/canonicalPublications.ts` | Studio builds immutable Public Cuts; anonymous routes query only current `ml_public` snapshot rows and copied public media |

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

- `ml_private`: 67 canonical Studio-owned identity, garment, design, media,
  materials, components, technical, production, story, versioning, workflow,
  AI, and sync tables.
- `ml_public`: immutable `publications` and `publication_assets` projections.
- `ml_internal`: non-exposed membership, integrity, publication-state, and
  audit helpers.
- `studio-assets`: private canonical objects under
  `studios/{studio_id}/{domain}/...`.
- `portfolio-assets`: copied public-safe derivatives under
  `publications/{publication_id}/{publication_asset_id}/...`.

The WP3 Garments and Libraries UI uses `CanonicalWorkspaceProvider`, which
imports the accepted deterministic migration graph into separately persisted
canonical browser records. It never reads legacy project/fabric/linked-material
arrays after initialization. Typed migration/read-through adapters remain for
recovery and untouched domains. See the
[canonical schema specification](../schema/ML_STUDIO_2_CANONICAL_SCHEMA.md),
[ADR-0005](../adr/ADR-0005-canonical-schema-and-public-cut-boundary.md), and
[ADR-0006](../adr/ADR-0006-deterministic-legacy-read-through.md).

All private application tables enable RLS. Legacy rows remain owner-scoped;
canonical rows use active Studio membership and role-aware write policies. The
portfolio publication tables intentionally allow anonymous `select` only for
rows marked public; they do not grant anonymous access to private Studio tables.

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
| `20260825035858_add_technical_foundation_contracts.sql` | Flat source/revision, annotation severity/status, export-template evidence, and critical-callout index | WP4a added; additive technical foundation |
| `20260825051344_enforce_pom_measurement_integrity.sql` | Stable POM anchors, decimal measurement/fit constraints, and grading lookup indexes | WP4b added; canonical technical rows retained |
| `20260825184506_complete_wp4_bom_construction_release_pack.sql` | Linked/free-text BOM semantics, construction requirements, immutable waiver evidence, release lineage, and deterministic export manifest | WP4c added; versioning work deferred |
| `20260825203246_implement_wp5_freeze_frames_restore.sql` | Freeze Frame scope/parent identity, append-only replay evidence, fresh-revision commands, restore audit, protected dependencies, and stale publication rejection | WP5 added; no legacy mutation |
| `20260826061816_implement_wp6_production_sampling_fit.sql` | Supplier/factory capability, version-pinned sample and fit evidence, private media queue/retry, and provenance-preserving issue promotion | WP6a added; no legacy mutation |
| `20260826080100_complete_wp6_costing_orders_qc.sql` | Quantity costing, immutable released-version order pin, normalized milestones, versioned QC templates/results, append-only waivers, change events, RLS, grants, and indexes | WP6b added; Editorial remains untouched |
| `20260826103000_normalize_editorial_story_from_system.sql` | Normalized private editorial garments, scenes/blocks/assets, Story from System provenance, and immutable export evidence | WP7 added; no public draft exposure |
| `20260826121000_implement_wp8_public_cuts.sql` | Normalized portfolio selections, optional released technical excerpts, publication allowlist/denylist, source revisions, copied-media provenance, RLS, and anonymous path index | WP8 added; legacy public tables retained for recovery |

No legacy migration or table was edited or removed. The safe, sanitized input
artifact remains `tests/fixtures/legacy-studio-data-v5.json`; WP2 retains it as
the recovery source after every dry run.

## Known Local/Cloud Merge Gaps

These are observed current behaviors, not WP0 fixes:

1. The WP2 adapter normalizes Editorial Collections and lookbook bridges in the
   migration plan, but current UI cloud merge remains legacy until WP7 cutover.
2. Canonical unit/currency/version/AI policy is separated from device-only
   backup reminder preferences; the current UI still reads the legacy settings.
3. Legacy domains still use timestamp-based newest-wins with tombstones. Every
   canonical garment mutation now uses the WP5 ledger and conflict policies;
   untouched legacy domains adopt that model only during their own cutover.
4. Browser IDs now have deterministic UUIDv5 mappings in WP2 evidence. WP3
   Garments and Libraries use their canonical IDs; untouched domains still use
   legacy IDs until their own route cutover.
5. Legacy `lookbook_pages` and newer Editorial Collections coexist by explicit
   `preserve-both-until-wp7` policy; overlap is reported, never silently merged.
6. Legacy aggregate and granular portfolio publication tables remain for
   recovery, but signed-out routes now read only canonical
   `ml_public.publications`; no UI hydrates the legacy public graph.

## Accepted Decisions

- [ADR-0001: Garment naming transition](../adr/ADR-0001-garment-naming-transition.md)
- [ADR-0002: Private and public separation](../adr/ADR-0002-private-public-separation.md)
- [ADR-0003: Staged migration strategy](../adr/ADR-0003-staged-migration-strategy.md)
- [ADR-0004: Route and domain boundaries](../adr/ADR-0004-route-and-domain-boundaries.md)
- [ADR-0005: Canonical schema and Public Cut boundary](../adr/ADR-0005-canonical-schema-and-public-cut-boundary.md)
- [ADR-0006: Deterministic legacy migration and read-through](../adr/ADR-0006-deterministic-legacy-read-through.md)
- [ADR-0007: WP3 canonical garment and library route cutover](../adr/ADR-0007-wp3-canonical-garment-route-cutover.md)
- [ADR-0008: WP4 technical flat source evidence](../adr/ADR-0008-wp4-technical-flat-source-evidence.md)
- [ADR-0009: WP4 POM, measurement, and grading model](../adr/ADR-0009-wp4-pom-measurement-and-grading.md)
- [ADR-0010: WP4 release gates, waivers, and approval](../adr/ADR-0010-wp4-release-gates-waivers-and-approval.md)
- [ADR-0011: deterministic structured tech pack](../adr/ADR-0011-deterministic-structured-tech-pack.md)
- [ADR-0012: append-only Freeze Frames and structural restore](../adr/ADR-0012-wp5-freeze-frames-structural-restore.md)
- [ADR-0013: version-pinned sampling and fit provenance](../adr/ADR-0013-wp6-sampling-fit-provenance.md)
- [ADR-0014: quantity-scenario costing and currency integrity](../adr/ADR-0014-wp6-quantity-costing.md)
- [ADR-0015: released-version orders, QC decisions, and production timeline](../adr/ADR-0015-wp6-orders-qc-timeline.md)
- [ADR-0016: canonical Editorial Collections and Story from System](../adr/ADR-0016-wp7-editorial-story-from-system.md)
- [ADR-0017: immutable Public Cuts and anonymous route isolation](../adr/ADR-0017-wp8-immutable-public-cuts.md)
- Vitest is the WP0 automated test harness. It adds no browser runtime behavior.
- Existing repository screenshots are the signed-in visual baseline. WP0 does
  not add an authentication bypass merely to create new captures.
- WP3 adds a visible wide-screen Threadline panel to the canonical garment
  workspace. On narrow screens it remains ordinary document flow rather than a
  hidden capability.

## Open Decisions

- Define the server orchestration and user-review queues for WP9 AI candidates;
  WP8 rejects raw AI inputs and adds no direct AI writes.
- Define the final retirement window for preserved legacy portfolio publication
  tables after canonical Public Cuts have production telemetry and backups.

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
