# ADR-0021: Relational material visuals and non-destructive V1 recovery

Status: Accepted  
Date: 2026-08-30

## Decision

Material photographs use `material_variant_media` relationships to canonical
private `media_assets`. Ordered role and framing belong to the relationship,
not the image bytes. Extended textile and storage details use the explicit
one-to-one `material_variant_profiles` record.

The V1 visual recovery process is a trusted, idempotent import from the pinned
V1 project into the isolated beta. It fills missing V2 fields and relationships
but never overwrites an existing differing V2 value. Ambiguous name/composition
matches stop the import. Every copied object is verified by SHA-256.

## Consequences

- Fabric images can be reused and ordered without hiding relationships in JSON.
- V1 remains read-only and no public publication is produced by recovery.
- Browser material edits use the same canonical operation RPC and RLS boundary
  as other WP3–WP9 domains.
- The import requires trusted local credentials and leaves the Studio in
  `shadow` until outbox and second-device evidence pass.

