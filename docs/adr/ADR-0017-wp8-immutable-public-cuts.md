# ADR-0017: Immutable Public Cuts and Anonymous Route Isolation

Date: 2026-08-26  
Status: Accepted

## Context

Portfolio curation needs approved garment, editorial, media, and optional
technical evidence, but the private Studio graph also contains tasks, notes,
fit issues, costs, supplier and factory identities, working files, full
technical records, and raw AI inputs. Filtering that graph at anonymous render
time would make every future private field a potential disclosure.

## Decision

- Portfolio profile, project, editorial-scene, editorial-asset, project-asset,
  and technical-excerpt selections are canonical private records protected by
  Studio membership RLS. Core selections are relationships, not JSON arrays.
- A Public Cut builder copies only allowlisted profile, case-study, approved
  process, selected editorial, and optional released technical-excerpt fields.
  A recursive denylist independently rejects private key classes at both the
  application and database boundaries.
- Every project or editorial selection is pinned to an exact garment Freeze
  Frame. A changed current source marks the selection stale; publish never
  silently repoints it. Publish and unpublish require fresh server state.
- Public media must originate from a rights-cleared `portfolio` or `export`
  derivative. The copied record retains source asset, source derivative,
  checksum, rights-check time, and a new
  `publications/{publication_id}/{publication_asset_id}/...` path.
- `ml_public.publications` is the only anonymous data source. Each payload is
  immutable and checksum-addressed; an update creates new profile/project/
  editorial rows. Unpublish changes visibility state but retains history.
- The anonymous route imports no private repository or workspace provider and
  queries only current, public, non-unpublished rows in `ml_public`. The Studio
  preview renders the same `PublicPortfolioPage` component and sanitized
  payload used by the anonymous route.
- The full technical graph is never published. An optional technical excerpt
  must be explicitly curated from a released Technical Studio spec pinned to
  the same source version.

## Consequences

Adding a new public field requires an explicit builder decision, privacy test,
and database allowlist review. Private schema growth does not expand anonymous
output automatically. Publication history and copied derivatives consume more
storage than a live filtered view, but released pages remain reproducible and
unaffected by later private edits. AI workflow implementation remains deferred
to WP9; raw inputs and prompts are denied by default.
