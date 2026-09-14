# Mystic Lore Studio 2.0 release-candidate notes

Release state: **local blocker removal complete; beta promotion blocked on
isolated hosted and physical-device evidence.**

## Product delivered

- Garment-centered design, reusable libraries, Technical Studio, production,
  Editorial Collections, Portfolio/Public Cuts, versioning, and governed AI.
- Responsive workbench and capture-first Field Mode with semantic canvas/table
  alternatives and private-safe observability.

## System-of-record cutover

- Generated and checked in Supabase schema types.
- Added one normalized codec registry for every WP3–WP9 collection and join.
- Replaced normal authenticated browser-local authority with a Supabase-backed
  canonical repository coordinated by `CanonicalWorkspaceProvider`.
- Added stable pagination, IndexedDB cache/outbox/recovery/media staging,
  optimistic edits, dependency replay, idempotent retry, disjoint-field merge,
  conflict review, and tombstone reload.
- Added the statically allowlisted, revision-preflighted, security-invoker
  operation RPC with atomic audit events and retry receipts.
- Added dedicated fresh-state commands for Freeze Frames, restore, release,
  exports, QC decisions/waivers, and AI lifecycle/evidence.
- Added a trusted, isolated-beta device importer that verifies the Studio export
  and media checksums and refuses the configured production project.

## Public Cut correction

The earlier audit incorrectly said the Portfolio UI did not invoke its cloud
adapter. It did; the actual defects were browser-local preview authority and a
non-atomic publication set. Public Cut now reloads canonical source records,
stages an invisible private batch, copies rights-cleared derivatives, commits
the entire set atomically, and removes anonymous visibility before unpublish
cleanup.

## Hardening and proof

- Added Playwright cross-device/offline/privacy tests and axe route scans.
- Added route-level lazy loading and dynamic PDF/ZIP/image/QR imports.
- Added enforced build budgets; the largest JavaScript chunk is 378,463 bytes.
- Remediated transitive dependency advisories without forced major upgrades;
  `npm audit` reports zero vulnerabilities.
- Expanded database coverage to 230 pgTAP assertions across seven files.

## Still required

Provision a dedicated hosted beta, run the import/shadow/cloud journey, restore
database and Storage into a disposable project, complete assistive-technology
walkthroughs, and record deployed performance. The current hosted project
`jsjhqnmlgceunlxgenkg` was left untouched. No 3.0 collaboration features were
added.
