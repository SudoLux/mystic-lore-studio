# Mainline cutover — 2026-09-13

Status: **HOLD — backups and correct-account device convergence not yet verified.**

## Chrome-to-iPad write test — awaiting iPad observation

- Created one explicit temporary task through Chrome's normal UI:
  `SYNC CHECK — Chrome to iPad`, ID `3a93c9ad-0801-44f1-8290-55551c3dff69`,
  linked to Meridian Shirt, low priority, due September 13. Database confirms
  the task at revision 1, status todo, due instant 2026-09-13 19:00 UTC.
- Chrome outbox returns to zero, but the post-write parity guard reports a
  different authoritative value and blocks cloud cutover. Do not waive it.
- Identified a timestamp-format mismatch: Plan emits `toISOString()` (Z with
  milliseconds); Postgres JSON returns `2026-09-13T19:00:00+00:00`.
  `operationResultHasParity` compares JSON strings literally, including due_at.
  These represent the same instant but fail the current comparison. Full
  mutation parity and a focused regression test are required before fixing.
- Requested iPad read-only confirmation of task visibility; reverse-direction
  completion test is not yet performed. Keep this test record for verification;
  no actual garment instruction was changed, and no duplicate event was created.

## Main-account Chrome verification

- Confirmed Chrome is authenticated as the approved plural-email account.
  Settings shows 0 pending changes, 7 garments, 37 media records, 11 tasks,
  and shadow/verification mode. This is not yet the two-device write test.
- Downloaded the actual main-device recovery archive and copied it into the
  private backup set as `main-device.mlstudio.zip`. ZIP CRC, canonical workspace
  checksum, manifest/workspace agreement, and SHA-256 for all 37 media entries
  pass. Studio identity is `586ab26d-9713-46b8-bfff-7534ceab7633`.
- Archive SHA-256:
  `ea61526769bab1258f07f16a336410b7444f83f002e31bf8ec897b71a0604d52`.
- Requested same-account sign-in on an independent phone/iPad for the remaining
  convergence test. No test record, account removal, merge, or deploy occurred.

## Resumed after Docker recovery

- User confirmed `auriumdesigns@gmail.com` as the main account and requested
  removal of the accidental singular-email login. Preserve and inspect that
  account's queued work before removal; no account has been deleted/disabled.
- Docker 29.7.2 now responds. Schema and data dumps completed in the ignored,
  private `.private-backups/cutover-20260913-XlaKRI` directory. Data includes
  authentication, Storage metadata, application schemas, and migration history.
- Separately downloaded and SHA-256/readback-verified all 46 Storage objects
  (49,816,848 bytes). Original bucket/path metadata is in storage-manifest.json.
- Backup files exist, but a full restore rehearsal and active-device recovery
  export verification remain required. Data dump reports circular foreign keys;
  do not restore directly into the live database to test recovery.
- Local pgTAP tests now pass: 9 files, 269 assertions. No live database tests
  or cloud mutations were run. Database backup SHA-256:
  schema `67de2120c59d3c36194f9f4101738d22432aa28b85699d4c10a6b55103aeac67`;
  data `c6b2bc26331995c580d444c8d01cb5b917c7207d30239037fbad71f8c563022a`;
  Storage manifest `c19fdd7487a52ab731d67e9e37faf7ec8f6ce738c26b78efba2fe48d2cd7006b`.

## Corrected destination and account audit

- The original live site, `https://mystic-lore-studio.netlify.app`, must receive
  V2. The beta site remains staging; it is not the permanent user-facing URL.
  The earlier instructions below to switch the beta site's production branch
  are superseded: configure and verify the original main site for the cutover.
- The earlier 5-versus-12 garment comparison used database-wide totals and
  was not a same-Studio comparison. There are two differently owned Studios:
  the previously inspected browser account has 5 garments, 0 media, 10 tasks;
  the imported V2 account has 7 garments, 37 media, 11 tasks. Do not merge
  their queues or memberships automatically. The 42 pending changes belong
  to the former browser session, not proof that the imported account is blocked.
- Account confirmation was requested privately; correct-account browser
  convergence remains untested. No user sessions or workspace authority changed.
- V1 SQL connector timed out twice, although its project reports healthy.
  Read-only Data API fallback succeeded: 7 projects, 12 fabrics, 21 images.
  All 12 source fabric names match unique materials in the imported Studio;
  six of seven garment names match. No matched source row has a newer timestamp.
  Names/timestamps are preliminary evidence, not full field/media equivalence.
- Stable-ID verification subsequently matched all seven V1 projects to the
  imported Studio. The unmatched name is a renamed record: V1 Riōnyn Jacket
  resolves to V2 Rōnyn Cardigan. No missing garment identity was found.
- Database inspection found no ordinary public/private table without RLS,
  and no anonymous SELECT grants on private ordinary tables. The security
  advisor flags a legacy mutable search_path, legacy anonymous-callable
  SECURITY DEFINER functions, authenticated privileged functions, and disabled
  leaked-password protection. The two inspected legacy RPCs explicitly reject
  missing auth.uid() and scope writes to that user; this is not a full access test.
- Docker info still stalls and opening Docker Desktop times out. The diagnostic
  was cancelled; no new successful backup or local DB test is claimed.
- Node **22.17.0** was located and used for a fresh successful test run
  (218 passed / 1 skipped), production build/typecheck, schema validator, and
  bundle budget. This supersedes the earlier Node-22-runtime verification gap.

## Verified without changing cloud data

- Target remains `iahrcupmyjnyyqszrmcx`, served by
  `https://mystic-lore-studio-2-beta.netlify.app`. No new database or import.
- Feature HEAD: `306f73f7d588675078532bea737b70d21aae1cec`.
- After fetching origin, main still contains two merge commits absent from
  feature HEAD (`989acb5`, `7ff5360`). The earlier fast-forward claim was wrong.
  `git merge-tree --write-tree HEAD origin/main` succeeds; resulting tree
  `2cb15312b76ef045e6b5cff080d035c6be6be113` has no content differences from
  feature HEAD. Neither branch was moved.
- Repository runtime metadata now specifies Node 22, consistent with
  `netlify.toml`. Netlify UI runtime setting still needs verification/update.
- Remote migration `20260829000554` has identical SQL to repository
  `20260829000058` after trimming the final newline:
  MD5 `d5aacf102635f9441fa4281b06116108`.
- Remote migration `20260830075139` is byte-identical to repository
  `20260830073211`: MD5 `3480ffe3d1941ffd1b255a2b86f3746f`.
- Inventory identity-column UPDATE privilege exists; no inventory UPDATE RLS
  policy exists. Both material recovery tables have enabled and forced RLS.
- Remote `calendar_events.notes`, `technical_specs.size_system`, and
  `technical_specs.size_range_json` are absent. Their migrations remain pending.
- Existing remote technical specs currently use base size M. The size-range
  migration's non-M default/backfill edge case must be reviewed before reuse
  on databases containing non-M base sizes.
- No private ordinary table was found with RLS disabled. This is an inspection,
  not a substitute for authenticated/unauthorized/anonymous integration tests.

## Recovery and convergence blockers

- The authenticated in-app browser shows shadow/verification mode, 42 pending
  operations, and an interrupted canonical-operation conflict. It shows five
  garments, zero media, and ten tasks.
- Database aggregate counts are twelve garments, 37 media records, 21 tasks,
  and 46 Storage objects. This comparison does not prove which individual
  records differ. Never clear or replay the local graph over cloud blindly.
- Settings reported a recovery copy generated with zero verified media.
  The downloaded archive has not yet been located/checksum-verified, and it
  cannot serve as the cloud media backup or as proof of the Safari device's
  current work being backed up.
- Schema dump stalled at the Docker-dependent dump stage. Docker info also
  stalled, and opening Docker Desktop timed out. Both diagnostic command
  sessions were cancelled. The zero-byte files in `/private/tmp` are **not
  backups**. No complete DB or Storage backup is claimed.

## Remaining gates, in order

1. Restore functioning backup tooling; create and verify a durable private
   DB/schema/history/Storage recovery set. Archive the actual active-device
   Settings recovery export, including its pending operations/recovery needs.
2. Inspect queued operations against cloud receipts and revisions. Preserve
   any genuine unsynced work; obtain a designer decision for ambiguous edits.
3. After backup verification, repair only the proven equivalent migration
   versions, apply the two pending migrations, and verify complete parity,
   grants, exposed schemas, RLS, Storage policies, and local DB tests.
4. Confirm deployed environment project identity and Auth redirect settings.
   Prove same-account independent-device convergence and private media access,
   then confirm unauthorized/anonymous denial and zero pending operations.
5. Open/review/test the exact PR integration, merge to main, switch Netlify's
   production branch, verify deployed commit and repeat convergence tests.
6. Preserve feature branch, verified recovery set, and rollback deployment for
   30 days. Never restore browser-local authority after accepted live writes.

No migration repair, cloud schema mutation, authority switch, merge, push, or
Netlify production-branch change has been performed in this attempt.

## Local checks rerun

- `npm test`: 218 passed, one skipped (46 passing files, one skipped).
- `npm run build`: passed, including TypeScript project checking.
- `npm run validate:schema`: passed (89 private / 2 public tables, 252 static
  pgTAP assertions). Actual local database/RLS execution remains blocked.
- `git diff --check`: passed; package/lockfile Node engine metadata agrees.
- Checks ran on the installed Node 26.8.1 runtime. Node 22 release-runtime
  verification remains required; metadata alone does not switch the runtime.
- No lint command is configured in this repository.

## September 13 evening verification — supersedes earlier blockers above

- The intended production URL is the ORIGINAL `mystic-lore-studio.netlify.app`.
  The beta URL remains staging. Do not replace this decision with the earlier
  proposal to make the beta URL primary.
- Primary account is `auriumdesigns@gmail.com`: Studio
  `586ab26d-9713-46b8-bfff-7534ceab7633`, seven garments and 37 media.
  The five-garment/42-pending browser session belonged to the DIFFERENT login
  `auriumdesign@gmail.com`; aggregate database counts were not comparable to
  either single Studio. Preserve that login's unsynced work before removal.
- Chrome created `SYNC CHECK — Chrome to iPad`; user confirmed it on iPad,
  completed it there, and cloud revision advanced to two with status done.
  Chrome's Completed archive showed the same task after reload. This proves
  round-trip convergence for that task, not background realtime delivery or
  the still-pending new-image upload test.
- A false post-write warning compared ISO `Z` timestamps with PostgreSQL's
  equivalent `+00:00` representation. Added narrowly scoped timestamp parity
  normalization for task due dates and calendar start/end dates. Real changes,
  nulls, missing rows, server conflicts and microsecond differences still fail.
  Nine focused tests pass. Hosted retest remains pending deployment.
- Private ignored recovery directory: `.private-backups/cutover-20260913-XlaKRI`.
  It contains schema/data/history/Auth/Storage metadata, all 46 Storage blobs,
  and the verified main-device recovery ZIP (seven garments/37 media).
  The rehearsal exposed omitted `ml_public` objects; added public schema/data
  and managed auth/storage/history schema archives before continuing.
- Restored into the isolated Docker database `cutover_rehearsal_20260913`.
  All 135 COPY tables / 929 rows match the archive by sorted-content SHA256;
  341 foreign keys verified. Cloud and existing local Studio data were not
  used as restore targets. Private restore scripts/logs remain with the backup.
- SQL-identical migration pairs were verified with trailing-newline-normalized
  MD5: inventory `d5aacf102635f9441fa4281b06116108`; visual recovery
  `f7adb715120f2092e2775f34d9e43819`. Repaired remote history to repository
  versions `20260829000058` and `20260830073211`, retiring only their alternate
  history labels. No application objects were replayed for those pairs.
- Tested the two pending migrations on the restored copy, then applied
  `20260902011308` and `20260902095159` to V2 with seeds/roles/Vault excluded.
  All 31 repository migration versions now match remote. Verified notes and
  size fields exist. Current remote specs both have base M, so the known
  non-M initial-default edge case does not affect this application target.
- Remote read-only role tests: unrelated authenticated identity sees zero
  private garments/tasks/images; anon is denied private-schema access and sees
  zero private Storage objects. These are database-policy checks, not yet a
  complete hosted HTTP/Auth/media end-to-end test.
- Node 22.17.0: 227 tests passed, one skipped; TypeScript/build, schema validation,
  bundle budgets and whitespace checks pass. Local DB/RLS: 269 tests across
  nine files passed. Repository has no lint command/configuration.

Remaining before merge: deploy/retest timestamp fix on beta; confirm main/beta
environment and Auth redirects, new private-media upload/retrieval on both
devices, recovery of the accidental login's pending work before deletion,
rollout-authority readiness and final exact-commit PR checks. No main merge,
main deployment, account deletion or authority switch has happened.
