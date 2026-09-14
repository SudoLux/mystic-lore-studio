# ADR-0008: WP4 Technical Flat Source Evidence

Status: Accepted  
Date: 2026-08-24

## Context

Technical flats must remain reviewable and reproducible. A rendered canvas is
not a source of truth: it cannot safely own annotation text, workflow state,
source identity, or export provenance.

## Decision

- `technical_specs` is the garment-owned technical root.
- Each flat revision references one `media_assets` source and one
  `technical_files` mapping. Original bytes are stored durably in IndexedDB for
  offline work and retain the canonical private Storage target path.
- Front and Back are the WP4-foundation required view set. Later requirements
  may add views without changing revision identity.
- Annotation anchors, labels, severity, and resolution status are records;
  canvas markers only render those records.
- Approval is rejected without a stored/checksummed source or while a critical
  annotation remains open.
- A Technical checkpoint freezes garment/spec/flat checksums before export.
  Export rows retain template ID/version, source revision, checksum, and the
  deterministic filename. The first artifact is a deterministic ZIP containing
  source files plus a manifest.

## Consequences

The browser workspace remains offline-capable while matching the accepted SQL
ownership model. Cloud upload can replay the retained private Storage path
without changing the domain identity. POM, BOM, grading, and construction stay
outside this decision and WP4 foundation segment.
