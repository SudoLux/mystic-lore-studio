# ADR-0011: Deterministic Structured Tech Pack

Status: Accepted  
Date: 2026-08-25

## Context

A production tech pack must be reproducible from authoritative structured data.
Generating a visually similar document from current UI state would not prove
which garment version, ruleset, template, files, or rows were approved.

## Decision

- Export is permitted only from a released specification and its protected
  checkpoint. The exporter reads that pinned snapshot rather than mutable live
  records.
- The artifact contains six ordered sections: garment/specification, approved
  flats and annotations, POM/measurements, BOM, construction, and grading/source
  files. Every section records its stable row count and checksum in a manifest.
- Structured JSON uses stable key and row ordering. ZIP entries use fixed
  timestamps and deterministic names. Approved source bytes are included under
  stable paths; generated wall-clock time stays in the export audit record and
  does not alter artifact bytes.
- The export record stores source garment version, ruleset and template
  versions, artifact checksum, canonical private Storage path, generated time,
  approving actor/time, deterministic filename, and section manifest.
- Re-exporting the same released checkpoint and template must produce
  byte-identical output and the same checksum. Changed structured data requires
  a new release before it can enter an approved artifact.
- Generated tech packs remain private Studio assets. Publication is a separate
  future allowlisted projection and cannot reuse the private export path.

## Consequences

The artifact can be verified independently of the screen that generated it,
and repeat generation is evidence rather than a best-effort rendering. Future
PDF or partner-specific renderers may consume the same canonical manifest, but
must preserve the release, source, checksum, and section lineage established
here.
