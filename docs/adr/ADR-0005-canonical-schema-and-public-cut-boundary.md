# ADR-0005: Isolate the Canonical Schema and Immutable Public Cut

Status: Accepted

## Context

Mystic Lore Studio already has owner-scoped tables in `public`, including names
that overlap the Product Bible's canonical names. The current application,
offline queue, legacy fixture, and public portfolio loader depend on those
structures. Reusing or renaming them during WP2A would create an implicit data
migration and violate the staged migration decision in ADR-0003.

The 2.0 graph must also be collaboration-ready, enforce tenant relationships in
the database, keep sensitive technical and commercial data private, and permit
anonymous portfolio reads without granting anonymous access to source rows.

## Decision

1. Keep all legacy tables, functions, policies, and buckets unchanged.
2. Create canonical private tables in `ml_private` and immutable public
   projections in `ml_public`.
3. Keep SECURITY DEFINER membership and lifecycle helpers in non-exposed
   `ml_internal`, with empty `search_path`, explicit `auth.uid()` checks, and
   narrow execute grants.
4. Put `studio_id` on every tenant-owned private row and use composite
   tenant/identity foreign keys so cross-studio links fail even when a caller is
   a valid member of both studios.
5. Automatically create the initial active owner membership and settings row
   after a Studio is created. Reserve reviewer/viewer roles as read-only until
   collaboration UX is implemented.
6. Use one Studio measurement preference and one owning unit per technical
   spec. Conversion is a display/export concern rather than mixed row storage.
7. Store current and historical public cuts in `ml_public.publications`.
   Snapshot payload, media manifest, checksum, source/version identity, and
   public path are immutable. Updating a public page creates a new row.
8. Put private objects under `studio-assets/studios/{studio_id}/...`. Put only
   copied public-safe derivatives under
   `portfolio-assets/publications/{publication_id}/{publication_asset_id}/...`.
9. Require public copied objects to be removed before an unpublication state
   transition can complete. Preserve publication rows and manifests as audit
   history.
10. Keep JSONB only for settings, layouts/anchors, patches, mappings, results,
    provenance, and immutable snapshots. Core relationships use constrained
    columns and foreign keys.

## Consequences

- WP2A is additive and does not switch application behavior.
- Future read-through adapters can adopt one domain at a time without table
  name collisions.
- Every private Data API query is membership-filtered at the database layer.
- A guessed ID cannot form a cross-studio canonical relationship.
- Public routes can receive a deliberately smaller projection without private
  table grants.
- Publication builders must stage a snapshot and copied derivatives before
  finalization; unpublication must remove those copied objects first.
- Immutable version/export/audit rows are server-command authored. The client
  receives select access but cannot forge them directly.
- The schemas must be included in each environment's exposed-schema
  configuration. RLS and explicit grants still determine access.
- Existing legacy duplication remains until Prompt 02B and later domain
  cutovers prove migration parity.

## Rejected Alternatives

- **Rename or repurpose legacy `public` tables.** Rejected because it would mix
  schema foundation with data migration and break current storage adapters.
- **Prefix every canonical table in `public`.** Rejected because schema-level
  privacy and publication boundaries are clearer and easier to audit.
- **Store the public portfolio as a view over private records.** Rejected
  because publication must remain reproducible, reviewable, and immune to
  accidental live private-field exposure.
- **Use user ownership on every canonical row.** Rejected because it would make
  collaboration a destructive future rewrite rather than an RLS policy change.
- **Use JSONB IDs for flexible relationships.** Rejected because it removes
  referential integrity and makes cross-studio isolation harder to prove.

## Verification

- Deterministic repository validation checks the complete table map, RLS and
  storage policy coverage, JSONB allowlist, legacy checksums, and unchanged UI
  references.
- `supabase/tests/ml_studio_2_rls_test.sql` covers same-studio access,
  cross-studio denial, reviewer read-only access, anonymous private denial,
  current-public-only reads, payload privacy, storage policy installation,
  immutability, and unpublication history.
- A real empty-database reset plus pgTAP execution remains the authoritative SQL
  runtime gate.
