# WP11G sync and V1 visual recovery evidence

Date: 2026-08-30  
Local decision: Pass  
Hosted decision: Migration applied; credentialed visual import and device acceptance pending

## Implemented

- Existing queued garment uploads are now admitted only at the member-owned
  private `studios/{studioId}/garments/...` path.
- Cached workspace data remains usable during sync errors. The status clearly
  distinguishes device-saved pending work, offline state, conflict, and sync.
- Material photographs and textile profiles are canonical relational records.
- The Material Vault resolves canonical photos and supports direct fabric-image
  upload without attaching the asset to a garment.
- The trusted importer is source/destination pinned, checksum-verifying,
  interruption-safe, retry-safe, ambiguity-blocking, and V2-preserving.
- Device recovery import includes both new material tables.

## Local evidence

| Gate | Result |
| --- | --- |
| Schema validation | Pass: 89 private tables, 2 public tables, 252 assertions |
| Database/RLS | Pass: 8 files, 252 assertions |
| Canonical integration | Pass: 15 tests |
| Application | Pass: 34 files, 163 tests; 1 external test skipped |
| RC migration rehearsal | Pass: interruption recovery, exact round trip, stable retry checksum |
| Importer/script type check | Pass |
| Production build | Pass |
| Bundle budget | Pass: largest JS 387,268 bytes |

## Hosted acceptance still required

1. Confirm the six preserved outbox operations replay and the outbox reaches
   zero without deleting browser data.
2. Dry-run, then execute the trusted V1 visual import and retain its JSON report.
3. Confirm parity: 7 heroes, 14 supporting garment images, 12 fabric images,
   ordered relationships, fabric-detail coverage, and inventory totals.
4. Upload a new garment and fabric image, then confirm a second authorized
   browser loads the same workspace. Keep the Studio in `shadow`.

The ordered migration `wp11g_material_visual_recovery` was applied successfully
to beta project `iahrcupmyjnyyqszrmcx` on 2026-08-30. Hosted inspection confirms
both material tables and the member-only `garments` Storage path allowlist.
