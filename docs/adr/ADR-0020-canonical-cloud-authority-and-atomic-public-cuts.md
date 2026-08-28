# ADR-0020: Canonical cloud authority and atomic Public Cuts

- Status: Accepted for Studio 2.0 beta preparation
- Date: 2026-08-27
- Decision owners: Product, Engineering, and Security

## Context

The first release-candidate audit proved the schema and domain logic but found
that the private WP3–WP9 graph remained browser-authoritative. The Public Cut
UI already invoked a Supabase adapter, contrary to the original audit wording,
but it built from browser-local source state and could not publish a complete
profile/project/editorial set atomically.

## Decision

- Supabase is the canonical private system of record. IndexedDB is limited to
  cache, dependency-ordered outbox, media staging, and recovery copies.
- Rollout mode is Studio-wide in `studio_settings.version_policy`: read-only
  `local-recovery`, compare-and-persist `shadow`, or authoritative `cloud`.
- One explicit codec registry maps domain records to normalized rows and join
  tables. JSON remains limited to approved layouts, settings, patches,
  candidates, and immutable manifests/snapshots.
- Ordinary UI writes use a security-invoker operation RPC. A checked-in table
  and column allowlist, not client SQL identifiers, defines the mutation
  surface. The RPC preflights all revisions before any write and creates audit
  events, tombstones, and idempotency receipts in the same transaction.
- Direct browser DML is rejected in shadow/cloud mode. Trusted import remains a
  separate service-only, non-destructive path.
- Protected release, restore, export, QC, publication, and AI actions require a
  fresh server read and an empty outbox, then use dedicated commands.
- Public Cut uses a private two-phase batch. It validates freshly loaded source
  rows, stages rights-cleared copied derivatives, atomically publishes the
  complete set, and removes anonymous visibility before object cleanup.
- The isolated beta importer refuses the known production project reference,
  verifies device/media checksums, and leaves the Studio in shadow.

## Consequences

- Ordinary cross-device reads and writes exercise membership RLS.
- Offline edits can converge idempotently; disjoint scalar changes may merge,
  while overlapping, order, delete/edit, and stale-version conflicts require
  designer review.
- No public route needs or may hydrate the private garment graph.
- After the first accepted cloud-mode write, rollback is maintenance plus
  database/Storage recovery, not browser authority reversal.
- Realtime collaboration, presence, comments, and multi-user co-editing remain
  explicitly outside 2.0.
