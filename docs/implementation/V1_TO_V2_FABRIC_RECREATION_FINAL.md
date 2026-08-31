# V1 → V2 Fabric Recreation — Final Report

Completed against isolated beta `iahrcupmyjnyyqszrmcx` on 2026-08-30.
V1 `jsjhqnmlgceunlxgenkg` was read-only throughout.

## Outcome

- 12 V1 fabrics discovered; all 12 already had deterministic canonical V2
  material, variant, and profile records from the earlier controlled import.
- 0 duplicate canonical materials created and 0 populated V2 values overwritten.
- 11 supplier relationships matched; 0 suppliers required creation.
- 9 exact garment/material relationships mapped: 4 already existed and 5 were
  inserted through the service-only, insert-only recreation command.
- The idempotent retry found all 9 relationships unchanged.
- 0 image files downloaded, copied, uploaded, or deleted by this recreation.
- 12 material-image links tagged as the earlier V1 visual import were detached.
  Their private asset/Storage evidence remains preserved; genuine V2 uploads
  were not selected. The canonical Fabric Vault now reports 0 attached V1
  fabric images, ready for manual V2 uploads.
- 0 conflicts and 0 ambiguous garment relationships.

The beta Studio contains 18 total materials: the 12 V1 recreations plus 6
V2-only materials, all preserved.

## Fabrics ready for manual image upload

| V1 fabric | V1 identity | Canonical material |
| --- | --- | --- |
| Eddie Bower Poly Span | `fabric-eddie-bower-poly-span-mr17sohs` | `23fc7bb2-68a1-53fe-a18c-b71d932773b7` |
| Mason Chino Twill - Navy Blue | `fabric-mason-chino-twill-navy-blue-mqz0q7bs` | `cc17acad-6449-520d-b7e2-e78530563d13` |
| Southwest Rev Jacard | `fabric-southwest-rev-jacard-mqzqhoje` | `2687dec9-e930-59fb-bca9-cb0ad3048aa3` |
| Fillgree Butter Canvas | `fabric-fillgree-butter-canvas-mqzqx8j5` | `17ba36a1-2d7f-5f9f-9009-415c4a165c96` |
| 11 Wale Corduroy - Bronze | `fabric-11-wale-corduroy-bronze-mqzom2uq` | `32244ba2-1c1d-5e37-a74b-914691d3bc99` |
| Gold Feather Woven | `fabric-gold-feather-woven-mr453k1j` | `4751af29-f00a-5ccb-be5f-61e4285de4d5` |
| Mason Chino Twill - Crimson | `fabric-mason-chino-twill-crimson-mqyuekqt` | `0d5e83ef-1080-5049-be42-b72ca2ed95dc` |
| Cable Knit - Pink | `fabric-able-knit-pink-mr440uab` | `64775643-d679-5b83-86b8-3c3efe200e36` |
| Windowpane Plaid Wool Blend | `fabric-windowpane-plaid-wool-blend-mqx9e54z` | `0b9deb9a-6090-5323-b110-7bd0e1b0a7cd` |
| Giverny Teal Canvas | `fabric-giverny-teal-canvas-mqzr3sd9` | `9d6ae3b4-e3e4-5bc9-a7a5-91c8ce639815` |
| Red Lotus Brocade | `fabric-red-lotus-brocade-mr44ld4b` | `26b73124-52bf-5812-92ca-41d2b2becc9c` |
| Mason Chino Twill - Golden | `fabric-mason-chino-twill-golden-mqz12pzd` | `c7fc13f0-8a0e-5876-8a68-a1700d14a31e` |

## Manual follow-up

- Giverny Teal Canvas has a V1 cost of `$12.99` but no supplier. No supplier
  offer was invented; add a supplier in V2 if that cost should be retained as
  an offer.
- Possible supplier-name duplicates were reported, not merged: Joann’s
  Frabric/Fabric/Fabrics and Fabric Warehouse/Wholesale Direct.
- Upload the desired new image from each fabric’s V2 detail screen.

## Evidence

- Machine-readable dry run:
  `docs/implementation/evidence/wp11/v1-fabric-recreation-dry-run.json`
- Machine-readable final/idempotent state:
  `docs/implementation/evidence/wp11/v1-fabric-recreation-final.json`
- Execution history:
  `docs/implementation/evidence/wp11/v1-fabric-recreation-execution.json`
- Local database suite: 9 files / 269 assertions passed.

