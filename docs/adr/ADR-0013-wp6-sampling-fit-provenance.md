# ADR-0013: Version-pinned sampling and fit provenance

Date: 2026-08-26  
Status: Accepted

## Context

Physical samples and fit observations become production decisions only when a
future collaborator can identify the garment version, stable point of measure,
factory, and visual evidence that informed them. A sample must not become a
back door to mutate technical data or a hidden attachment list that cannot be
audited later.

## Decision

- A `sample_round` may be planned before a Freeze Frame is selected, but a
  production-created round pins `garment_version_id` at creation.
- Every `fit_session`, fit measurement, and fit issue carries the same pinned
  version. Database triggers reject a version, sample, POM, or garment mismatch.
- Fit media uses explicit `sample_round_media` and `fit_session_media` rows
  linked to private canonical `media_assets`. Queue, failure, retry count, and
  sort identity are structured evidence, not canvas or JSON-only state.
- A `fit_issue_promotion` maps a source issue to exactly one task, POM
  adjustment candidate, construction callout, or version note. A candidate
  never edits a POM directly.
- Supplier and factory capabilities use an extensible object only for the
  capability vocabulary; suppliers, factories, samples, versions, POMs,
  evidence, and promotion targets remain normalized relationships.
- The browser mirror preserves queued evidence locally, exposes retry state,
  and records every mutation through the WP5 append-only ledger.

## Consequences

Sample and fit decisions can be replayed against their exact garment version,
stable POM identity, and media checksum. Scoped restore will retain physical
fit evidence. WP6a intentionally excludes cost sheets, production orders, and
QC; those later records can consume the same pinned Freeze Frame contract.
