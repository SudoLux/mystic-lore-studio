# ADR-0006: Deterministic Legacy Migration and Read-Through

Status: Accepted

## Context

The WP0 fixture uses stable browser string IDs, embeds fields that do not yet
have a canonical 2.0 owner, and spans project, material, media, task, lookbook,
editorial, portfolio, settings, offline queue, and tombstone behavior. WP2 must
prove a recoverable transition without cutting over routes or deleting that
aggregate.

## Decision

- Canonical UUIDs are RFC UUIDv5 values derived from one fixed Mystic Lore
  migration namespace, the target Studio ID, canonical table, legacy entity,
  and legacy ID. Rebuilding the same plan produces the same IDs and checksum.
- Migration writes are ordered by foreign-key dependency. Mutable rows use
  atomic conflict-key upserts. Studio roots and append-only inventory/audit
  rows use duplicate-safe inserts so a retry fills missing rows without
  rewriting retained history.
- The Studio root is created before the trigger-owned membership/settings
  rows are reconciled. Owner membership conflicts on `(studio_id, user_id)`;
  settings conflicts on `studio_id`.
- Media is deduplicated by checksum while framing, role, and ordering remain
  relationship rows. When the v5 fixture has no byte checksum, the dry run
  uses a deterministic metadata checksum, records the original Storage path,
  and emits an explicit copy-verification warning.
- Legacy lookbook pages receive parallel canonical Editorial Collection rows,
  but both authoring models remain intact until WP7 resolves the overlap.
- Private notes and backup-reminder preferences remain in the preserved legacy
  fixture. They are read through unchanged because WP2 has no canonical note
  owner and the Product Bible classifies backup reminders as device policy.
- Queued offline writes replay before planning. A newer tombstone suppresses a
  stale write. A stale divergent scalar write becomes a machine-readable
  conflict and does not overwrite the current record.
- The current UI is not wired to the adapter. Later work packages can select a
  canonical domain through the typed read-through projection while untouched
  domains continue to use the retained aggregate.

## Recovery Contract

The legacy fixture remains the rollback source until a later domain cutover is
accepted. Interrupted runs restart by rebuilding the deterministic plan and
reapplying stable conflict keys. No public publication rows or public assets are
created by WP2. Server-authored change-event batches require a trusted process;
service credentials are never accepted by the browser adapter.

## Evidence

- `tests/legacyCanonicalMigration.test.ts`
- `docs/implementation/evidence/wp2/legacy-studio-data-v5.migration-report.json`
- `docs/implementation/evidence/wp2/recovery-evidence.json`
