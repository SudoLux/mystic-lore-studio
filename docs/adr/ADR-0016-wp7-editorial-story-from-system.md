# ADR-0016: Canonical Editorial Collections and Story from System

Date: 2026-08-26  
Status: Accepted

## Context

Legacy `LookbookPage` and `EditorialCollection` overlap in purpose but store
stories differently. That makes scenes, media rights, garment relationships,
and exports difficult to version or verify. Editorial must remain a private
studio surface; public use can only happen through a later immutable
publication snapshot.

## Decision

- `editorial_collections` is the canonical private root. Its existing
  `garment_id` remains the primary garment for migration compatibility, while
  `editorial_collection_garments` records one primary and optional supporting
  garments for new work.
- Scenes, blocks, and asset usage stay normalized. JSON is limited to visual
  presentation settings, block content, transitions, and immutable export
  manifests; no garment or asset relationship is hidden in JSON.
- A Story from System block records its source garment, optional garment
  version, source entity, exact field path, and source checksum. The database
  rejects sources outside the collection's garment relationship; the app marks
  changed or missing sources visibly stale before export.
- Editorial drafts, scenes, source assets, and export manifests are private
  under studio membership RLS. `editorial_exports` is append-only and tracks
  checksum, source version, private storage path, and immutable manifest.
- Export and publish are explicit commits. AI is represented only by an
  optional `ai_artifact_id` candidate link; it cannot write an editorial block
  without a user-controlled acceptance command.
- Legacy Lookbook and Editorial input remains retained through the WP7
  transition. The canonical workspace imports both deterministically and keeps
  their ordered scenes, blocks, transition metadata, copy, and asset links.

## Consequences

Editorial collections now participate in Freeze Frame comparison and show
their export dependency on a pinned source version. Portfolio routes and public
publication tables are intentionally unchanged in WP7. A future publication
work package must create a public-safe copied derivative and immutable public
payload; it must never expose private editorial rows.
