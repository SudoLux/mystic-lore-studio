# ADR-0012: Append-Only Freeze Frames and Structural Restore

Status: Accepted  
Date: 2026-08-25

## Context

Garment work crosses design, technical, production, editorial, and portfolio
domains. A timestamped copy or screenshot cannot explain which structured rows
changed, who accepted them, which release consumed them, or what a restore
would do to downstream evidence. Rewriting old records would invalidate
released tech packs and published snapshots.

## Decision

- High-value garment mutations append one or more `change_events` grouped by a
  stable operation ID. Each event records actor, origin, garment, entity,
  operation, scope, base/result revision, reversible patch evidence, and time.
- A Freeze Frame is a named, hashed `garment_versions` snapshot of one scope:
  all, design, technical, production, editorial, or portfolio. Frames form a
  garment-local parent chain. Named, release, and restore kinds are explicit.
- `change_events`, `entity_revisions`, and `restore_operations` are append-only.
  Freeze Frames are immutable and deletion is restricted while current,
  parented, or referenced by a release, export, order, or publication.
- Comparison is domain-aware. It addresses stable fields and ordered rows,
  POM/measurement identity, BOM substitutions and cost impact, construction
  order, asset checksums, editorial live-data staleness, and portfolio asset
  selection.
- Restore follows proposal, preview, commit. Preview hashes the selected patch
  and lists affected records, pinned dependencies, production consequences,
  and public consequences. Commit requires a fresh online garment revision,
  creates a new child Freeze Frame, and records replay and inverse evidence.
- Restoring technical structure never deletes later sample actuals or private
  media evidence. Released/public artifacts remain pinned to their source
  Frame until a separate release or publication command is accepted.
- Different-field concurrent edits merge into one event that references both
  source operation IDs; competing edits
  to the same scalar become an explicit base/local/server conflict. Ordered
  children merge by stable ID and fractional sort identity. Media deduplicates
  by checksum while retaining relationships. A tombstone provisionally wins
  over an edit, with recovery represented as a new revision.
- Release, publication, and restore are never blindly queued offline. The
  database command locks the garment and rejects stale expected revisions.

## Consequences

History is reproducible and reviewable instead of being an undo stack. Restore
creates new evidence, so older releases and Public Cuts remain truthful. The
browser repository mirrors the command model for current canonical screens;
the Supabase functions and constraints remain authoritative once cloud-backed
canonical persistence is enabled. Long-lived branching, production planning,
and editorial cutover remain outside WP5.
