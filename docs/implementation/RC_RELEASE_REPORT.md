# Mystic Lore Studio 2.0 release report

Audit date: 2026-08-27  
Decision: **BLOCKED — local engineering blockers are removed; isolated hosted-beta evidence is still required.**

| Product Bible gate | Evidence | Command / result | Remaining issue | Severity | Owner |
| --- | --- | --- | --- | --- | --- |
| Data integrity and migration | `evidence/wp10/rc-migration-evidence.json`; 22 ID mappings, 0 skipped, 0 conflicts, 0 unexplained loss; valid material/media/editorial/portfolio links | `npm run db:reset` PASS; `npm run test:rc:migration` PASS; retry 0 inserts / 0 updates / 27 unchanged; checksum stable | Run the device export/import and backup/restore rehearsal in the dedicated hosted beta project | High | Release owner + database operator |
| Canonical schema and authority | `RC_SCHEMA_AUDIT.md`; generated database types; codec registry; repository, cache, and outbox | `npm run validate:schema` PASS: 87 private, 2 public, 230 pgTAP assertions, 7 protected inputs | None locally | None | Engineering |
| Privacy and RLS | Membership, direct-write guard, operation receipt, Storage, Public Cut, and anonymous pgTAP; independent-browser E2E | `npm run test:db` PASS: 7 files / 230 assertions; `npm run test:e2e` PASS | Repeat the unauthorized and anonymous proof against the hosted beta deploy | High | Engineering + security reviewer |
| Versioning and non-destructive restore | Protected Freeze Frame/restore commands, receipt/checksum tests, dependency protection | App and database suites PASS | Hosted complete-garment journey remains to be recorded | Medium | Engineering |
| Release/export/public source pinning | Protected release/export commands and fresh-source Public Cut batch tests | App and database suites PASS, including zero-partial-publication failure cases | Hosted copied-object and publication checksum evidence remains | High | Engineering + release owner |
| AI direct-write prevention | WP9 suite plus protected job/artifact/acceptance command tests | App and pgTAP suites PASS | Hosted cross-device job/artifact journey remains | Medium | Engineering |
| Offline, retry, conflicts, tombstones | IndexedDB cache/outbox, stable dependency replay, disjoint merge, conflict materialization, tombstone RPC | `npm run test:canonical:integration` PASS; `npm run test:e2e` PASS for Supabase outage, reload, replay, and second-device convergence | Physical-device beta capture/reconnect walkthrough remains | Medium | Engineering + QA |
| Governed Public Cut | Fresh canonical preview; private draft, derivative copy, atomic commit, visibility-first unpublish; publication history reloaded from Supabase | `wp10_atomic_public_cut_batch_test.sql` PASS: 25 assertions | Run the batch against beta Storage and its deployed anonymous route | High | Engineering + security reviewer |
| Accessibility | Automated desktop/mobile authenticated routes and anonymous route; semantic canvas/table alternatives | `npm run test:a11y` PASS: 2 Playwright scenarios across 10 route/viewport scans | VoiceOver/Safari, NVDA/Firefox, physical 200% reflow, and touch walkthroughs remain | High | Accessibility owner |
| Reliability and recovery | Local empty DB, interrupted/duplicate migration, offline reload, operation idempotency, second-device reload, runbooks | All local suites PASS | Create beta backup; restore database and Storage separately into a disposable project; compare checksums | High | Release owner + database operator |
| Performance and dependencies | Lazy route chunks; dynamic PDF/ZIP/image/QR imports; deterministic scale fixtures; bundle evidence | `npm run build` PASS; `npm run test:bundle` PASS: largest JS 378,463 B; `npm audit` 0 vulnerabilities | Deployed LCP/INP/CLS, memory, 1,000-row grid, and media-heavy profile remain | High | Frontend performance owner |
| Documentation | Status ledger, ADR index, schema/screen audits, migration/recovery runbooks, beta checklist, limitations, release notes | `git diff --check` required in final gate | Keep the final report blocked until external evidence files pass `npm run audit:beta` | None | Product + Engineering |

## Blocker status

The two original critical engineering blockers are removed locally:

1. Authenticated WP3–WP9 routing now uses `CanonicalWorkspaceProvider` backed by
   Supabase, with IndexedDB used only for recovery, cache, media staging, and
   the outbox. A clean browser stores no canonical private graph in localStorage.
2. Public Cut was already connected to a Supabase adapter, but it was not
   release-safe. It now rebuilds from freshly loaded canonical records and uses
   a two-phase, atomic publication batch.

The candidate remains blocked only on evidence that requires external systems
or physical assistive-technology/device work:

1. Isolated hosted-beta import, shadow comparison, cloud flip, and two-profile
   deployed walkthrough.
2. Isolated database backup/restore plus separate Storage export/restore with
   matching checksums.
3. VoiceOver, NVDA, physical touch/200% reflow, and deployed performance
   measurements.

The configured hosted project `jsjhqnmlgceunlxgenkg` was not migrated or
modified. No 3.0 collaboration scope was added.
