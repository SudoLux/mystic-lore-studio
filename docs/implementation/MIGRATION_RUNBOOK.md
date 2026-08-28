# Mystic Lore Studio 2.0 migration and authority runbook

Status: local migration/cutover proof passes; hosted isolated-beta run pending.

## Non-negotiable safety boundary

- Never run `db:reset` against a hosted project.
- Never put a service-role key in Vite, browser code, screenshots, logs, or a
  committed file.
- Never target `jsjhqnmlgceunlxgenkg` during beta preparation. The importer
  rejects that project reference.
- Preserve the source export, media, migration report, and local recovery cache
  for at least 30 days after beta acceptance.
- Do not create public snapshots by importing local publication rows. Rebuild
  them through fresh canonical Public Cut commands.

## Local proof

Run:

```text
npm run db:reset
npm run validate:schema
npm run test:db
npm run test:rc:migration
npm run test:canonical:integration
npm run test:e2e
```

Expected evidence includes exact round trip, zero unexplained loss, valid
relationships, completed interruption recovery, stable duplicate checksum,
ordinary UI RLS writes, offline replay, and second-device convergence.

## Create the device recovery package

In Settings, choose the Studio recovery export. The `.mlstudio.zip` contains:

- `workspace.json` with the canonical graph;
- `manifest.json` with the workspace checksum and every included media blob;
- private media blobs currently retained in IndexedDB.

Keep a second copy outside the deploy workspace. Do not edit the archive.

## Isolated beta import

Provision a dedicated Supabase project and apply the ordered migrations through
the approved deployment process. Set only the beta environment variables in a
trusted operator shell:

```text
ML_BETA_SUPABASE_URL=<beta URL>
ML_BETA_SUPABASE_SERVICE_ROLE_KEY=<beta service-role key>
ML_BETA_PROJECT_REF=<beta project ref>
ML_BETA_OWNER_USER_ID=<beta owner UUID>
ML_BETA_DEVICE_EXPORT=<absolute path to .mlstudio.zip>
ML_BETA_CONFIRM_ISOLATED=true
npm run beta:import-device
```

The importer verifies workspace/media checksums, loads the beta table manifest,
maps actor columns to the beta owner, imports normalized mutable and protected
evidence in dependency order, restores circular version/validation pins through
the service-only finalizer, and leaves the Studio in `shadow`. It aborts if the
target has already accepted cloud authority.

Retain its machine-readable counts, relationships, warnings, and checksums.
Investigate every warning before continuing.

## Shadow and switch

1. Keep the beta Studio in `shadow`.
2. Exercise one complete garment across design, technical, production,
   editorial, portfolio, and AI acceptance.
3. After every scenario compare normalized rows, relationships, revisions,
   change events, media checksums, exports, and publication history.
4. Resolve every queued conflict; confirm the outbox is empty.
5. Rebuild and publish the Public Cut from fresh beta source rows.
6. Flip the whole Studio—not individual domains—to `cloud` in
   `studio_settings.version_policy`.
7. Repeat the journey with two independent authorized profiles, an unauthorized
   account, and an anonymous session.

## Abort and rollback

Abort on any privacy leak, missing media, unknown skipped record, checksum
difference, broken relationship, duplicate audit event, partial publication,
or queued conflict that cannot be explained.

Before the first accepted cloud write, correct the input and rerun the
idempotent import while keeping recovery copies. After the first accepted cloud
write, enable maintenance mode and recover the database/Storage. Do not switch
authority back to a stale browser cache.
