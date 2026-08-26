# Mystic Lore Studio 2.0 Canonical Schema

Status: WP6a complete through version-pinned supplier/factory, sampling, and
fit evidence; append-only history, named Freeze Frames, domain-aware comparison,
scoped restore, and release/publication protection remain in force

Source specification: Product Bible pages 18, 28, 31, 33-35, 40, 56, and
59-60. The ordered SQL
migrations are authoritative for exact types, checks, foreign keys, indexes,
grants, triggers, and policies.

## Schema Boundary

| Schema | Exposure | Responsibility |
| --- | --- | --- |
| `public` | Existing Data API contract | Legacy tables and legacy public snapshots; unchanged by WP2 |
| `ml_private` | Authenticated Data API only | Canonical Studio 2.0 domain graph protected by membership-derived RLS |
| `ml_public` | Anonymous and authenticated reads | Immutable current Public Cut snapshots and copied derivative manifests |
| `ml_internal` | Not exposed through the Data API | Membership helpers, integrity guards, publication transitions, and audit triggers |

The local Supabase configuration exposes `ml_private` and `ml_public` in
addition to the legacy schemas. Table grants and RLS remain authoritative;
`anon` has no grant on `ml_private`.

## Ownership and Identity

```mermaid
erDiagram
  AUTH_USERS ||--o| PROFILES : identifies
  AUTH_USERS ||--o{ STUDIOS : owns
  STUDIOS ||--o{ STUDIO_MEMBERS : authorizes
  AUTH_USERS ||--o{ STUDIO_MEMBERS : joins
  STUDIOS ||--|| STUDIO_SETTINGS : configures
  STUDIOS ||--o{ COLLECTIONS : owns
  COLLECTIONS o|--o{ GARMENTS : groups
  STUDIOS ||--o{ TAGS : defines
  GARMENTS ||--o{ GARMENT_TAGS : classified_by
  TAGS ||--o{ GARMENT_TAGS : applies_to
```

- Every tenant-owned private row carries `studio_id`.
- Every relationship between tenant rows uses a composite
  `(studio_id, foreign_id)` foreign key where applicable. A valid writer who is
  a member of two studios still cannot create a cross-studio relationship.
- `profiles` is the intentional exception: it is person-owned through
  `auth.users.user_id`.
- Creating a Studio inserts one active owner membership and one settings row in
  the same transaction.
- Roles are schema-ready for `owner`, `editor`, `reviewer`, and `viewer`.
  Owners/editors write; all active roles read. Membership UX remains
  single-owner-first during 2.x.
- `garment_code`, Studio slug, portfolio username, project slug, and editorial
  slug are immutable. Canonical clients archive these roots instead of deleting
  them, preventing application-level reuse.

## Complete Domain Inventory

| Domain | Canonical tables |
| --- | --- |
| Identity and catalog | `profiles`, `studios`, `studio_members`, `studio_settings`, `collections`, `garments`, `tags`, `garment_tags` |
| Design and media | `design_briefs`, `inspiration_boards`, `inspiration_items`, `media_assets`, `garment_media`, `media_derivatives`, `design_annotations` |
| Materials and components | `materials`, `material_variants`, `inventory_entries`, `garment_materials`, `components`, `component_variants`, `garment_components`, `supplier_items` |
| Technical foundation | `technical_specs`, `technical_flats`, `flat_annotations`, `technical_files`, `tech_pack_exports`, `validation_runs`, `validation_waivers` |
| POM and grading | `pom_points`, `measurement_sets`, `measurement_values`, `grade_rules`, `grade_rule_values`, `fit_measurements` |
| BOM and construction | `bom_items`, `construction_sections`, `construction_steps`, `construction_details`, `technical_templates`, `template_applications` |
| Production | `suppliers`, `factories`, `sample_rounds`, `sample_round_media`, `fit_sessions`, `fit_session_media`, `fit_issues`, `fit_issue_promotions`, `cost_sheets`, `cost_items`, `production_orders`, `qc_results` |
| Story and portfolio | `editorial_collections`, `editorial_scenes`, `editorial_blocks`, `editorial_assets`, `portfolio_profiles`, `portfolio_projects`, `portfolio_editorials` |
| Versioning, workflow, AI, sync | `garment_versions`, `entity_revisions`, `change_events`, `restore_operations`, `tasks`, `calendar_events`, `ai_jobs`, `ai_artifacts`, `sync_tombstones` |
| Public projection | `ml_public.publications`, `ml_public.publication_assets` |

There are 70 canonical private tables and two public projection tables.

## Design, Library, and Media Relationships

```mermaid
erDiagram
  GARMENTS ||--o| DESIGN_BRIEFS : defines
  GARMENTS ||--o{ INSPIRATION_BOARDS : develops
  INSPIRATION_BOARDS ||--o{ INSPIRATION_ITEMS : contains
  MEDIA_ASSETS ||--o{ INSPIRATION_ITEMS : supplies
  GARMENTS ||--o{ GARMENT_MEDIA : presents
  MEDIA_ASSETS ||--o{ GARMENT_MEDIA : reused_as
  MEDIA_ASSETS ||--o{ MEDIA_DERIVATIVES : derives
  GARMENTS ||--o{ DESIGN_ANNOTATIONS : discusses
  MEDIA_ASSETS ||--o{ DESIGN_ANNOTATIONS : anchors
  MATERIALS ||--o{ MATERIAL_VARIANTS : varies
  MATERIAL_VARIANTS ||--o{ INVENTORY_ENTRIES : ledgers
  GARMENTS ||--o{ GARMENT_MATERIALS : allocates
  MATERIAL_VARIANTS ||--o{ GARMENT_MATERIALS : specified_by
  COMPONENTS ||--o{ COMPONENT_VARIANTS : varies
  GARMENTS ||--o{ GARMENT_COMPONENTS : allocates
  COMPONENT_VARIANTS ||--o{ GARMENT_COMPONENTS : specified_by
  SUPPLIERS ||--o{ SUPPLIER_ITEMS : offers
```

Inventory is append-only. Available quantity is derived from ledger entry type
and garment reservations; no manually editable available total exists.
Supplier offers use explicit nullable material/component variant foreign keys
with an exactly-one constraint rather than a polymorphic JSON relationship.

## Technical and Production Relationships

```mermaid
erDiagram
  GARMENTS ||--o| TECHNICAL_SPECS : specifies
  TECHNICAL_SPECS ||--o{ TECHNICAL_FLATS : illustrates
  TECHNICAL_FLATS ||--o{ FLAT_ANNOTATIONS : calls_out
  TECHNICAL_SPECS ||--o{ TECHNICAL_FILES : attaches
  TECHNICAL_SPECS ||--o{ POM_POINTS : defines
  TECHNICAL_SPECS ||--o{ MEASUREMENT_SETS : measures
  MEASUREMENT_SETS ||--o{ MEASUREMENT_VALUES : contains
  POM_POINTS ||--o{ MEASUREMENT_VALUES : identifies
  TECHNICAL_SPECS ||--o{ GRADE_RULES : grades
  GRADE_RULES ||--o{ GRADE_RULE_VALUES : contains
  POM_POINTS ||--o{ GRADE_RULE_VALUES : identifies
  TECHNICAL_SPECS ||--o{ BOM_ITEMS : itemizes
  TECHNICAL_SPECS ||--o{ CONSTRUCTION_SECTIONS : structures
  CONSTRUCTION_SECTIONS ||--o{ CONSTRUCTION_STEPS : orders
  CONSTRUCTION_STEPS ||--o{ CONSTRUCTION_DETAILS : annotates
  TECHNICAL_SPECS ||--o{ VALIDATION_RUNS : validates
  VALIDATION_RUNS ||--o{ VALIDATION_WAIVERS : governs
  TASKS ||--o{ VALIDATION_WAIVERS : follows_up
  GARMENTS ||--o{ GARMENT_VERSIONS : freezes
  TECHNICAL_SPECS ||--o{ TECH_PACK_EXPORTS : generates
  GARMENT_VERSIONS ||--o{ TECH_PACK_EXPORTS : reproduces
  GARMENTS ||--o{ SAMPLE_ROUNDS : samples
  FACTORIES ||--o{ SAMPLE_ROUNDS : produces
  GARMENT_VERSIONS ||--o{ SAMPLE_ROUNDS : pins
  SAMPLE_ROUNDS ||--o{ SAMPLE_ROUND_MEDIA : evidences
  SAMPLE_ROUNDS ||--o{ FIT_SESSIONS : reviews
  GARMENT_VERSIONS ||--o{ FIT_SESSIONS : pins
  FIT_SESSIONS ||--o{ FIT_SESSION_MEDIA : evidences
  FIT_SESSIONS ||--o{ FIT_ISSUES : records
  FIT_SESSIONS ||--o{ FIT_MEASUREMENTS : observes
  POM_POINTS ||--o{ FIT_MEASUREMENTS : identifies
  FIT_ISSUES ||--o{ FIT_ISSUE_PROMOTIONS : promotes
  GARMENTS ||--o{ COST_SHEETS : costs
  COST_SHEETS ||--o{ COST_ITEMS : contains
  GARMENT_VERSIONS ||--o{ PRODUCTION_ORDERS : releases
  FACTORIES ||--o{ PRODUCTION_ORDERS : manufactures
  PRODUCTION_ORDERS ||--o{ QC_RESULTS : verifies
```

The Studio setting establishes the preferred measurement unit. Each technical
spec records that owning unit; display/export conversion is explicit and
measurement rows do not silently mix units. Money uses exact numeric values
plus constrained three-letter currency codes.

## Story, Versioning, and Public Cut

```mermaid
erDiagram
  GARMENTS ||--o{ EDITORIAL_COLLECTIONS : stories
  EDITORIAL_COLLECTIONS ||--o{ EDITORIAL_SCENES : contains
  EDITORIAL_SCENES ||--o{ EDITORIAL_BLOCKS : contains
  EDITORIAL_COLLECTIONS ||--o{ EDITORIAL_ASSETS : manifests
  MEDIA_ASSETS ||--o{ EDITORIAL_ASSETS : supplies
  STUDIOS ||--|| PORTFOLIO_PROFILES : curates
  PORTFOLIO_PROFILES ||--o{ PORTFOLIO_PROJECTS : selects
  GARMENTS ||--o{ PORTFOLIO_PROJECTS : documents
  PORTFOLIO_PROFILES ||--o{ PORTFOLIO_EDITORIALS : selects
  EDITORIAL_COLLECTIONS ||--o{ PORTFOLIO_EDITORIALS : presents
  GARMENT_VERSIONS ||--o{ ENTITY_REVISIONS : contains
  GARMENTS ||--o{ CHANGE_EVENTS : audits
  GARMENT_VERSIONS ||--o{ RESTORE_OPERATIONS : sources
  AI_JOBS ||--o{ AI_ARTIFACTS : proposes
  PORTFOLIO_PROFILES ||--o{ PUBLICATIONS : publishes
  PUBLICATIONS ||--o{ PUBLICATION_ASSETS : copies
```

`ml_public.publications` contains the immutable sanitized snapshot and media
manifest. Source IDs remain normalized foreign keys but do not grant access to
the private source. Anonymous RLS requires all of `is_public`, `is_current`, and
`unpublished_at is null`. Historical rows remain owner-readable.

Publication is staged as a private draft, copied derivatives are registered and
uploaded, then the guarded publication command makes the snapshot current.
Unpublication requires copied public objects to be removed first, marks the
snapshot non-current/non-public, retains private source and publication history,
and records an immutable change event.

The public payload trigger recursively rejects private-only keys including
costs, supplier/factory identifiers, technical source files, fit evidence,
model profiles, raw AI input references/prompts, private notes, and private
storage paths. A later WP8 allowlisted publication builder remains responsible
for constructing the positive public contract.

## Storage Contract

| Bucket | Visibility | Canonical path | Write rule |
| --- | --- | --- | --- |
| `studio-assets` | Private | `studios/{studio_id}/{assets|derivatives|technical|samples|editorial|exports}/...` | Active owner/editor of the path Studio |
| `portfolio-assets` | Public direct download; anonymous listing denied | `publications/{publication_id}/{publication_asset_id}/{filename}` | Active owner/editor and a matching draft `publication_assets` row |

The existing `project-images` and `portfolio-images` buckets are untouched.
Private clients use signed URLs for canonical private objects. Public assets are
copies, never aliases of private source objects.

## JSONB Policy

JSONB is limited to the Product Bible's extensible settings, visual layouts and
anchors, template mappings, validation/AI results, reversible patches, and
immutable snapshots. Catalog, garment, media, supplier, technical, production,
portfolio, and publication relationships use columns and foreign keys.

## Migration and Verification

Ordered migrations:

1. `20260824051228_ml_studio_2_canonical_schema.sql`
2. `20260824051237_ml_studio_2_rls_and_publication_boundary.sql`
3. `20260824051247_ml_studio_2_storage_policies.sql`
4. `20260824070629_enable_canonical_migration_bootstrap.sql`
5. `20260825035858_add_technical_foundation_contracts.sql`
6. `20260825051344_enforce_pom_measurement_integrity.sql`
7. `20260825184506_complete_wp4_bom_construction_release_pack.sql`
8. `20260825203246_implement_wp5_freeze_frames_restore.sql`
9. `20260826061816_implement_wp6_production_sampling_fit.sql`

Verification commands:

```bash
npm run validate:schema
npm run db:start
npm run db:reset
npm run test:db
npm test
npm run build
```

`validate:schema` is deterministic and verifies the table inventory, tenant
columns, allowed JSONB fields, RLS/storage coverage, migration order, pgTAP
plan, WP3/WP4/WP5/WP6 canonical route boundaries, and checksums of all six legacy
migrations plus the WP0 fixture. `test:db` executes the 68-assertion pgTAP
matrix on a local or explicit test database.

## WP2B Transition Contract

`src/domains/migration` adds the typed, non-UI transition layer:

- deterministic UUIDv5 identity mapping and canonical row batches;
- dependency-ordered, retry-safe execution against in-memory or injected
  authenticated Supabase stores;
- offline queue and tombstone replay with surfaced scalar conflicts;
- checksum-based media deduplication with separate usage relationships;
- private portfolio case-study snapshots without public publication rows;
- legacy read-through for notes, device settings, and lookbook ownership that
  is intentionally deferred to later work packages.

The committed machine report is
`docs/implementation/evidence/wp2/legacy-studio-data-v5.migration-report.json`.
It is regenerated in memory and compared byte-for-structure by the application
tests, preventing stale row counts, mappings, warnings, or checksums.

## WP3 Route Cutover

`CanonicalWorkspaceProvider` consumes the accepted deterministic migration
graph and persists a user-scoped canonical browser workspace. The Garment
Library, garment overview/Design Studio, Material Vault, and Component Library
call this repository instead of reading legacy project, fabric, or linked
material arrays. The same typed records mirror `ml_private` table ownership and
relationship rules, while the browser cache remains recoverable independently
of the legacy aggregate.

Legacy project/fabric routes remain as compatibility hash aliases only. Their
old page components are not mounted by the route router. Dashboard, workflow,
editorial, portfolio, settings, cloud sync, and public routes remain outside
WP3 scope and continue to use the accepted legacy/read-through boundary.

## WP4a Technical Studio Contract

The additive `add_technical_foundation_contracts` migration completes fields
needed by the first working Technical Studio segment:

- `flat_annotations.severity` and `flat_annotations.status` support critical
  issue gates without encoding workflow state into canvas pixels;
- `tech_pack_exports` retains `template_id`, `template_version`,
  `source_revision_label`, and `deterministic_filename` beside its immutable
  source garment version and checksum;
- `technical_templates.template_type` admits the `tech_pack` export template;
- the partial `(studio_id, flat_id)` index covers unresolved critical callouts.

The typed technical repository owns commands for spec creation, source-mapped
flat revision registration, structured annotations, approval, validation runs,
comparison preparation, garment Technical checkpoints, and export records.
Original source bytes and generated ZIP bytes are durable offline blobs with
canonical private Storage target paths. Front and Back are the initial required
view set. BOM and construction remain unused until their dedicated segment.

## WP4b POM, Measurement, Fit, and Grading Contract

`technical_specs.unit` is the only stored unit for a specification. POM
targets, asymmetric tolerances, grade deltas, and sample actuals are persisted
in that unit; millimeter, centimeter, and inch alternatives are explicit display
conversions. POM rows own normalized anchors, names, and methods independently
of their canvas rendering.

The `enforce_pom_measurement_integrity` migration adds normalized-anchor,
non-blank identity, non-negative target/actual, and size constraints plus
POM-centered target, grading, and fit lookup indexes. Existing Studio-derived
RLS covers these already-canonical private tables.

The measurement repository provides atomic CSV validation/import, inclusive
tolerance evaluation, sample variance, grading previews and non-destructive
graded-set commits. Technical checkpoints now snapshot POM, measurement-set,
measurement-value, grade-rule, and grade-delta structure. Comparison is keyed
by stable POM and set/POM/size identity. Selective restore updates only chosen
rows, records a restore operation with a new checkpoint, and never removes fit
measurements created after the source checkpoint.

## WP4c BOM, Construction, Release, and Export Contract

The `complete_wp4_bom_construction_release_pack` migration completes the
structured release surface:

- BOM rows use stable material/component variant relationships, optional
  supplier-offer and substitute links, or an explicit intentional-free-text
  state. Quantity, unit, placement, lifecycle status, shortage, and exact cost
  impact remain queryable columns.
- Construction sections, steps, and callouts retain stable sort identity.
  Machine, stitch/seam specification, required flags, asset anchors, and detail
  resolution status are structured records rather than rendered pixels.
- A technical spec records its released source version, validation run, actor,
  time, protected checkpoint, and evidence. Release waivers are separate
  member-readable audit rows; the database constraint excludes privacy-domain
  waivers and clients receive no direct mutation grant.
- An approved tech-pack export records the pinned source garment version,
  ruleset/template versions, deterministic filename, checksum, private Storage
  path, generation/approval evidence, and ordered section manifest.

The release repository owns atomic BOM and construction commands, template
capture/application, grouped validation, governed waiver creation, release
commit, and deterministic export. Export consumes the released checkpoint,
stable-orders structured JSON and ZIP entries, fixes archive timestamps, and
includes stored source bytes. Repeated export of the same release and template
is byte-identical. AI integrations can only submit candidates to these commands;
they cannot write technical or released records directly.

## WP5 Change Ledger, Freeze Frame, and Restore Contract

The `implement_wp5_freeze_frames_restore` migration makes the versioning roots
operational rather than descriptive:

- Freeze Frames add decision notes, named/release/restore kind, fresh base
  revision, validated domain scope, garment-local parent identity, and
  checksum lookup. Parent/current foreign keys restrict deletion.
- Change events add scope and base/result revisions. Entity revisions, change
  events, and restore operations reject update and delete. Release, export,
  order, and publication references protect their source Freeze Frame.
- Restore operations retain selected keys, downstream dependencies, preview
  checksum, replay/inverse patches, actor, source/result versions, and
  base/result revision.
- Authenticated command wrappers create a Freeze Frame or commit a restore only
  after Studio-write authorization and a row-locked expected-revision check.
  Internal helpers pin an empty search path and are not exposed as Data API
  schemas.
- A publication transition rejects a non-current source Freeze Frame. Existing
  immutable Public Cuts are unaffected by working-state restore.

The typed versioning repository mirrors these invariants for the current
canonical browser workspace. Structural comparison addresses stable field and
row identity, POM and measurements, BOM substitution/cost, construction order,
media checksums, editorial live-data staleness, and portfolio selection.
Restore uses a hashed preview then creates a new child frame and append-only
audit evidence. Media rows and later fit actuals are intentionally not removed
by scoped restore.

## WP6a Sourcing, Sampling, and Fit Contract

The additive `implement_wp6_production_sampling_fit` migration completes the
first Production segment without implementing costing, orders, or QC:

- supplier capability and MOQ fields plus factory supplier/contact/capability
  relationships support reusable sourcing identity;
- sample rounds, sessions, measurements, and issues are pinned to the same
  garment Freeze Frame; trigger guards reject cross-garment version or POM
  references;
- `sample_round_media` and `fit_session_media` map private media assets to
  explicit evidence roles, ordering, queue/failure state, and retry count;
- `fit_issue_promotions` preserves source issue/session/sample/version lineage
  while creating a task, non-writing POM adjustment candidate, construction
  callout, or version note;
- all new evidence tables use authenticated grants plus the established
  membership-derived RLS policies, and every source/version/POM query has a
  tenant-first index.

The typed production repository mirrors these rules in the canonical browser
workspace. Production Home creates only version-pinned rounds. Fit Review uses
the exact session source for actuals, issues, gallery captures, decisions, and
promotions. Local mobile captures queue in private storage paths and retain
retry state across reload. Freeze Frame production snapshots include this
evidence, while scoped restore keeps physical sample and fit records immutable.
