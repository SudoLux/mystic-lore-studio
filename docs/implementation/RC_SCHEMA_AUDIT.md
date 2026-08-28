# Mystic Lore Studio 2.0 release-candidate schema and authority audit

Audit date: 2026-08-27  
Automated inventory: 87 `ml_private` tables, 2 `ml_public` projection tables,
230 pgTAP assertions, and 7 hash-protected legacy inputs.

## Domain ownership matrix

| Domain | Canonical owner | Persistence and protection | RC result |
| --- | --- | --- | --- |
| Identity/catalog | `studios`, membership, settings, collections, garments, tags | Membership-derived RLS; Studio-wide mode in `version_policy`; stable IDs and tenant indexes | Local pass |
| Design/media/libraries | Design briefs, boards, assets/derivatives, material/component variants, supplier offers | Normalized codec rows; private Storage staging/deduplication; relational joins | Local pass |
| Technical | Specs, flats/annotations/files, POM, measurements, grading, BOM, construction, validation, exports | Operation RPC for ordinary rows; dedicated release/export/waiver commands; source/version/checksum pins | Local pass |
| Production | Suppliers/factories, samples/fit, costing, orders, milestones, QC/tasks | Released-version pins; evidence media staging; dedicated QC decisions/waivers | Local pass |
| Editorial | Collections/scenes/blocks/assets and export evidence | Primary/supporting garment joins; live-source revision/staleness; protected export command | Local pass |
| Portfolio and public | Private curation plus `ml_public` sanitized snapshots/assets | Fresh canonical preview; private batch; copied rights-cleared derivatives; atomic publish; visibility-first unpublish | Local pass |
| Versioning/workflow | Versions, entity revisions, change events, restore operations, tasks/calendar | Append-only evidence; protected restore/Freeze Frame; scoped replay and dependency warnings | Local pass |
| Governed AI | Jobs/input refs, immutable artifacts/media, decisions and acceptance receipts | Generic lifecycle/direct writes denied; acceptance uses normal domain operation then governed receipt | Local pass |
| Sync/recovery | Operation receipts, tombstones, IndexedDB outbox/cache/recovery, trusted device finalizer | Static entity/column allowlist; atomic revision preflight; request checksum idempotency; service-only import pins | Local pass; hosted rehearsal pending |

## Canonical application authority

Authenticated routing mounts `CanonicalWorkspaceProvider` without mounting the
legacy `StudioDataProvider`. The provider has three Studio-wide modes:

- `local-recovery`: read-only migration or emergency inspection;
- `shadow`: optimistic UI plus Supabase persistence and parity comparison;
- `cloud`: Supabase is authoritative and IndexedDB is cache/outbox only.

Every WP3–WP9 mutable collection is represented in the codec registry. Join
tables remain relational. Hydration uses stable 500-row pagination until a page
returns fewer than 500 rows, so the API row limit cannot truncate 1,000-row
measurement sets.

Ordinary commands produce normalized `CanonicalOperation` mutations. The
security-invoker RPC preflights all revisions, applies the complete group,
derives audit events from before/after rows, creates deletion tombstones, and
stores a unique Studio/operation receipt in the same transaction. Client table
and column selection comes from a checked-in allowlist; no client identifier is
interpolated into SQL. Direct browser DML is rejected in shadow and cloud mode.

Protected actions require an empty outbox and a fresh server reload. Freeze
Frame, restore, release, export, QC, and governed AI transitions use dedicated
commands rather than the generic mutation surface.

## Public boundary correction

The earlier audit statement that Portfolio UI did not invoke its Supabase
adapter was inaccurate. The adapter was wired, but the preview source was
browser-local and the publication set was not atomic. The corrected boundary:

1. Reload private canonical sources and build the exact preview.
2. Begin an anonymous-invisible private batch after membership, freshness,
   privacy, version, revision, and checksum checks.
3. Copy only rights-cleared derivatives to publication-specific paths.
4. Atomically publish the complete set and retire the former current set.
5. On unpublish, remove anonymous visibility before retryable object cleanup.

Anonymous routes query only `ml_public`; they never hydrate the private graph.

## Verification

- `npm run validate:schema`: 87 private tables, 2 public tables, 230 declared
  database assertions, 7 protected legacy inputs.
- `npm run db:reset`: all ordered migrations apply to an empty local database.
- `npm run test:db`: 7 files and 230 assertions pass.
- `npm run test:canonical:integration`: 9 cache/codec/pagination/outbox tests
  pass, including a 1,000-row operation group.
- `npm run test:e2e`: normal UI RLS write, backend outage/reload/replay,
  second-device convergence, unauthorized isolation, and anonymous route pass.

No local Critical schema or authority finding remains. The hosted beta and
recovery proof remains an external release gate.
