# Mystic Lore Studio 2.0 backup and recovery runbook

## Recovery set

Keep these as one timestamped set:

- device `.mlstudio.zip` and its manifest checksum;
- legacy JSON export and protected representative fixture;
- beta database backup/clone evidence;
- private `studio-assets` object manifest and downloaded bytes;
- current public `portfolio-assets` manifest and downloaded bytes;
- migration/import reports, operation receipts, row counts, and relationship
  checksums;
- deployed application revision and environment identity.

Supabase database backups include Storage object metadata, not the stored file
bytes. Database recovery is therefore incomplete until Storage is exported,
restored, and checksum-verified separately.

## Local rehearsal already proven

The local migration stops after five batches, resumes from stable identities,
and converges to the same canonical checksum. A duplicate run performs zero
inserts and zero updates. The operation RPC separately proves request-checksum
idempotency, atomic multi-row preflight, tombstones, and direct-write rejection.

## Hosted beta rehearsal

1. Confirm the exact project reference is the dedicated beta—not
   `jsjhqnmlgceunlxgenkg`—and name the operator.
2. Record pre-backup database row counts and Storage object paths, sizes, and
   checksums.
3. Take the database backup/clone according to the beta project’s Supabase plan.
4. Export private and public Storage bytes separately without changing paths.
5. Restore the database into a disposable recovery project.
6. Restore Storage into its separate recovery buckets.
7. Apply the matching deploy preview configuration and authenticate.
8. Compare database and Storage checksums, relationships, versions, receipts,
   publications, and anonymous visibility.
9. Record the result in `evidence/wp10/beta-external/backup-restore.json`.

## Incident choices

### Import or sync failure before cloud acceptance

Leave the beta Studio in `shadow`, stop protected actions, preserve the outbox
and recovery archive, correct the input/codec issue, and retry idempotently.

### Failure after cloud acceptance

Enable maintenance mode, retain diagnostic metadata without private payloads,
and recover the database/Storage set. Never bulk-delete around an unexplained
relationship or replay a stale browser graph as authority.

### Released, exported, ordered, or public evidence

Do not mutate immutable artifacts. Restore creates a new checkpoint; republish
creates a new Public Cut. Unpublish removes anonymous database visibility first
and retries copied-object cleanup separately.

## Acceptance

Recovery passes only when restored database and Storage checksums match,
authorized login loads the same graph, protected source pins remain intact, and
anonymous routes expose only the restored current sanitized snapshots.
