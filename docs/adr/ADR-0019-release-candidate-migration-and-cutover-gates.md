# ADR-0019: Release-candidate migration and cutover gates

- Status: Accepted; browser-authority blocker resolved by ADR-0020
- Date: 2026-08-27
- Decision owners: Product and Engineering

## Context

The final audit had to prove the representative legacy migration through the
same `SupabaseCanonicalMigrationStore` used by a trusted migration process. The
rehearsal exposed two facts that unit tests alone did not show:

1. `service_role` could not resolve `ml_private`, so server-authored migration
   batches could not run through the production store.
2. Blind PostgREST upserts advanced canonical revision and `updated_at` values
   on a retry even when the candidate row was unchanged.

The repository also contains a complete canonical schema and pure typed domain
commands, but the private application workspace still hydrates and commits its
2.0 graph in browser local storage. That is not an acceptable cross-device
cutover and must not be described as a completed release.

## Decision

- Grant `service_role` schema usage plus `SELECT`, `INSERT`, and `UPDATE` on
  `ml_private`, with no bulk `DELETE` grant and no access to `ml_internal`.
- Grant the trusted role read-only access to `ml_public` for isolation checks;
  the migration runner cannot create a Public Cut.
- Before an upsert, compare candidate-owned fields and skip an identical row.
  Server-managed `created_at`, `updated_at`, and `revision` do not make an
  otherwise identical migration row different.
- Keep the representative legacy fixture and recovery evidence. Never use a
  destructive reset outside the local rehearsal stack.
- Mark the 2.0 release blocked until private canonical screens read and write
  through Supabase-backed repositories with queue/retry/conflict behavior. That
  condition is implemented locally by ADR-0020; hosted-beta proof remains.

## Consequences

- The trusted rehearsal now survives a completed-batch interruption and a
  duplicate pass without inserting or updating rows.
- The migration service cannot delete canonical data or publish snapshots.
- RLS and public/private tests remain independent from trusted migration
  privileges.
- The release report must distinguish local implementation proof from hosted
  operational proof. ADR-0020 removes the local application-cutover blocker but
  does not waive isolated beta, recovery, accessibility, or performance gates.
