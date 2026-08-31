# V1 → V2 Fabric Recreation

This is a one-time, idempotent recreation of V1 Fabric Vault records inside the
canonical V2 material model. It is not a schema migration and never reads or
writes Supabase Storage.

## Fixed boundaries

- Source is read-only V1 project `jsjhqnmlgceunlxgenkg`.
- Destination is isolated beta project `iahrcupmyjnyyqszrmcx`.
- Service credentials remain in `.env.beta.import.local` and never enter the
  browser, repository, report, or Netlify environment.
- The importer creates or fills only canonical relational records.
- Populated differing V2 values always win and are recorded as conflicts.
- Existing V2-only materials and garment relationships are never deleted.
- Image paths appear in the audit report only. No bytes are downloaded, copied,
  checksummed, uploaded, or attached.
- The recreation never creates a media relationship or copies/deletes an image.
  Material-image links explicitly tagged by the earlier V1 visual import are
  detached so every recreated fabric is ready for a manual V2 upload. The
  underlying private assets and Storage objects remain preserved for recovery;
  genuine V2 media links are never selected by this cleanup.
- Missing, exact-match garment/material links are inserted through the
  service-only `apply_trusted_v1_fabric_relationships` command. The command is
  insert-only, accepts a fixed column allowlist, validates both foreign keys
  against the target Studio, and is unavailable to browser roles.

## Field map

| V1 | Canonical V2 |
| --- | --- |
| `fabrics.name`, `fabric_type`, `fiber_content` | `materials` identity, category, composition |
| color, width, numeric GSM metadata | `material_variants` |
| textile character, care, storage, origin, story | `material_variant_profiles` explicit columns |
| total yardage | deterministic append-only `inventory_entries` opening receipt |
| supplier and cost | normalized `suppliers` and `supplier_items` |
| project/fabric allocation | `garment_materials` when both sides and role map exactly |
| image path | report only |

Descriptive weight labels, color-family labels, and free-form allocation notes
have no exact canonical destination and remain in the report rather than being
hidden in unrelated fields.

## Running

```text
./scripts/run-v1-fabric-recreation.sh --dry-run
./scripts/run-v1-fabric-recreation.sh
```

The first command writes the mandatory dry-run evidence. The second writes the
final report. Repeating either command must not create duplicate materials,
inventory receipts, suppliers, supplier offers, or garment relationships.
