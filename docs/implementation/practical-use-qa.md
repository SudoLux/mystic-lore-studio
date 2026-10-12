# Practical-use implementation and QA — 11 October 2026

Implementation and acceptance checks passed for the QA preview, including the actual recovery export/restore. The user authorized committing, pushing and publishing the tested frontend while keeping the retained workspace in shadow verification mode. The older installed official app has one queued change that must be preserved and reconciled before the final authority switch.

## Accounts and data

- Kept **auriumdesigns@gmail.com**, user `50cad3e7-6133-4e2c-bb05-3323df03cdcb`, workspace `586ab26d-9713-46b8-bfff-7534ceab7633`: 7 garments and 41 media records.
- Removed **auriumdesign@gmail.com**, user `8561acbf-3ffc-49ea-aaae-208ce2aa8dbb`, workspace `04c63799-8610-4f0a-aa92-80052cc02877`: 5 garments, no media.
- Administrative removal checked identity, sole ownership, dependent records, publications, storage ownership, foreign references and a fresh export fingerprint before writing. Sessions and content were revoked before Auth removal. Full retained-workspace and storage digests matched before and after. Removed-user claims cannot read, write or provision a workspace.
- Private recovery evidence is in the ignored `.private-backups/account-retirement-2026-10-11/` directory with restricted file permissions. Do not commit its contents.
- `scripts/retire-unwanted-beta-account.mjs` defaults to a guarded dry run. Its explicit apply path has completed; rerunning against the missing account intentionally aborts.

## App behavior

Registration, sign-in and recovery normalize email whitespace and case. Supabase remains the identity authority. Confirmation-aware signup guidance offers sign-in and recovery; synchronous submission guards prevent repeated clicks. Workspace setup serializes concurrent requests and reuses the account's existing owned workspace.

Cloud reads now carry provenance and a confirmation time. Settings shows the signed-in email, workspace ID, backend project, pending changes and last successful sync. Refresh runs on focus, reconnect and visible/online 30-second intervals. Coalesced reads and generation checks protect in-progress edits. Failed requests and unresolved conflicts never report a verified-current workspace. IndexedDB writes wait for transaction completion; uploads retain recoverable bytes, including Safari's ArrayBuffer fallback.

Image delivery uses account/project-scoped signed-link caches, expiry renewal, retry and checksum verification. Logout clears signed-link caches. Missing upload bytes cannot produce a successful metadata commit. Stable media identity avoids image resets during periodic refresh.

Garments, tasks, unused fabrics and draft editorials have individual confirmation and awaited deletion. Server commands enforce ownership, revision checks, idempotent retries, dependency protection and deletion tombstones. Shared media stays intact. Garments and fabrics with protected evidence offer archive; protected tasks can be cancelled through their status control. Archived garments remain available through the Archived filter.

Authenticated startup no longer seeds or imports samples automatically. An empty workspace remains empty. Existing samples in the retained workspace are preserved for manual cleanup. Existing explicit migration/recovery tooling remains available; no new bulk reset or account merge was added.

## Verification

| Check | Result |
|---|---|
| Application tests | 244 passed; 1 existing skipped test |
| Hosted database tests | All 11 suites passed, 293 assertions; fixture transactions rolled back |
| Hosted independent-session QA | 21 checks passed; disposable account/workspace/storage cleaned up |
| Duplicate signup | Identical, normalized mixed-case/whitespace, repeated and simultaneous requests created no second identity |
| Concurrent setup | Exactly one empty workspace |
| Sync and deletion | Cross-session edits, stale revision conflict, acknowledged deletion/retry, tombstone rejection of stale recreation |
| Private access | Anonymous media/workspace denied; separate account denied retained-workspace reads and deletion |
| Existing media | All 41 files downloaded in a fresh member session; 38,711,751 bytes matched stored checksums |
| Production beta build | Passed against `iahrcupmyjnyyqszrmcx` |
| Schema/script/bundle checks | Passed; 89 private and 2 public tables, legacy inputs preserved |
| Hosted preview | Ready; main site's published deploy unchanged |
| Physical device display check | User reports all tested devices match on the initial QA preview; specific devices not individually enumerated |
| Device acceptance | User reports preview actions worked, deletion retest passed, and every preview device has 0 waiting; the older installed official app still has 1 queued change |
| Recovery ZIP export/isolated restore | Passed: actual app export restored 263 mutable records, 181 protected records and 43 files (46,654,585 bytes); fresh member hydration and anonymous denial passed |

Evidence: [backend checks](evidence/practical-use/backend-qa.json), [media verification](evidence/practical-use/retained-media.json), [bundle budget](evidence/practical-use/bundle-budget.json), [preview deployment](evidence/practical-use/preview-deploy.json), [validation](evidence/practical-use/validation.json).

Read-only browser inspection confirmed the hosted authentication screen loads, signup exposes recovery, and recovery navigation works. The 390 × 844 viewport had no horizontal overflow; this is not a physical Safari test. An extra authenticated browser fixture was rejected by automatic approval review because its proposed helper lacked guaranteed cleanup and would print its test password. That helper was not executed. The user subsequently confirmed matching garments and images on all tested devices using the initial QA preview. The user subsequently confirmed preview actions, permanent deletion and empty queues on every preview device. The recovery rehearsal passed; completed backend fixture tests cleaned up correctly. Only the older installed official app still reports a waiting change.

Existing advisor findings were not silently counted as resolved: legacy public functions have broad anonymous execution grants, one legacy function has a mutable search path, and leaked-password protection is disabled. The tested canonical private access boundaries passed. Review the legacy functions/auth configuration separately before general public onboarding.

## Device acceptance and release gates

The initial preview display check is accepted per the user’s response, recorded in `evidence/practical-use/device-acceptance.json`. This confirms matching garments/images, not the full action matrix or empty queues. Use the latest draft URL in `evidence/practical-use/preview-deploy.json`. Sign in as **auriumdesigns@gmail.com** on Mac, iPhone Safari, iPad Safari and each installed web app. Verify Settings shows workspace `586ab26d-9713-46b8-bfff-7534ceab7633` and project `iahrcupmyjnyyqszrmcx`. All devices should show the same 7 garments and expected images before making disposable test changes.

1. Create a clearly named test garment/task, edit it on another device and verify changes arrive after refresh or within 30 seconds while visible. Upload a disposable image and verify a fresh session displays it.
2. Interrupt an upload and disconnect during an edit. Reload offline, reconnect, and verify the edit/upload recovers without false success or lost queued work.
3. Edit the same record concurrently on two devices and resolve the visible conflict. Verify subsequent edits use the resolved state.
4. Preview and delete disposable garments/tasks/unused fabrics/draft stories. Reload all devices, including a previously stale session. Deleted records must stay deleted and shared images must remain available. Protected evidence should block deletion and present the available archive/cancel path.
5. Verify fresh sign-in, session refresh, expired signed-image-link renewal, sign-out/account changes, recovery navigation and repeated signup clicks. Do not enter real sample data until these pass.
6. Download the recovery ZIP and exercise the established restore/import procedure in an isolated test workspace, checking record relationships and media checksums. Do not restore over the retained workspace during acceptance.
7. Confirm **every device** reports no pending edits/uploads or unresolved conflicts. Browser queues are device-local; backend checks alone cannot prove this gate.

Only after all gates pass: export the retained workspace, verify its exact identity and current mode, switch **only** its studio-settings `canonicalPersistence` from `shadow` to `cloud` through trusted administrative tooling, and publish the tested beta build to the primary Netlify site `3216e913-f78e-4b48-9040-a531830e7b1a`. The local Netlify state points to a different beta site: do not use it implicitly for this release. Repeat identity, images, deletion and sync checks on the primary URL. Preserve the previous deployment and recovery export for rollback.

The migration `20261011192337_practical_use_setup_and_cleanup.sql` is already applied in the existing beta project. No authority switch or production-site deployment has been performed.


## Follow-up: Archive and permanent deletion

The user reports Archive works as intended, while permanent deletion produced errors. Archive changes the garment status in the same private cloud workspace and hides it from the active Garment Library filter. Images, links and history remain; use **Garment Library → Filters → Status → Archived** to find it. It does not free media storage.

An app-style rollback test reproduced a deletion defect: garment-scoped audit entries had an optional foreign key that PostgreSQL clears when the garment is deleted, and the append-only trigger rejected that automatic pointer update. Earlier API fixtures used a null garment scope and missed this case. Migration `20261011224333_allow_deleted_garment_audit_detachment.sql` now permits only nested foreign-key updates that clear that pointer after the root is gone, with all other event fields unchanged. Direct history changes and payload modifications remain forbidden. Protected garment versions and approved/released evidence still block deletion.

All eleven suites (293 assertions) passed with the correction. The function was backed up, the migration applied with retained-identity/data guards, and eight regression assertions passed against the applied function. No retained garments, media records or image links were modified by applying the fix. See [deletion evidence](evidence/practical-use/garment-delete-fix.json). The exact error from the user's device was not supplied, so this reproduced bug is a possible explanation, not a confirmed trace of that specific click. The user subsequently confirmed permanent deletion is working on their device. That retest gate is accepted; recovery restore also passed and every preview queue is clear. The older installed official app queue remains open. The user authorized the frontend production update while retaining shadow verification mode.


## Follow-up: Preview versus installed official app

The user confirmed the one waiting change belongs only to the older installed official app. All preview sessions show 0 waiting, and deletion matches across preview devices. Each web origin has independent caches and queues, so the older app's remaining local edit is not evidence of a preview sync failure. Its queue must be backed up/inspected and reconciled during the official-app upgrade before the final workspace authority switch. No browser data was cleared and no cloud authority was changed.

The actual preview's recovery export was downloaded through the app and restored into a fresh local Supabase environment on separate ports. ZIP CRC, the source workspace checksum, all mutable record identities and fields, protected payloads, media bytes, authenticated hydration and anonymous denials passed. The restoration included a separate local setup event in addition to preserved source history. The recovery importer now checks existing objects before retransmitting a large duplicate upload and distinguishes download failures from checksum differences. A Storage timeout during an earlier duplicate-upload retry was resolved by that preflight; the final local restore/retry passed. No hosted data was changed. See [restore evidence](evidence/practical-use/recovery-restore.json).


## Authorized frontend release

The user approved: “yes lets commit, push and publish now.” Publish the tested frontend to the primary official site and preserve all browser caches/outboxes. Keep `canonicalPersistence` at `shadow`; no authority transition is included in this release. After the older installed app receives the updated code, inspect/reconcile its preserved waiting change and repeat primary-site checks before a separate final authority switch.
