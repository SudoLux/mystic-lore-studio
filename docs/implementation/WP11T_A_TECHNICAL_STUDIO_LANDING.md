# WP11T-A — Technical Studio Landing Experience

## Outcome

Technical Studio now begins with a garment-led board rather than the dense release report. The existing release queue remains available as a dedicated power view, while Issues collects the same canonical release concerns into a clear work list.

No canonical schema, RLS policy, Storage path, media relationship, release rule, or technical evidence record changed in this pass.

## Presentation model

`technicalLandingGarments` is a read-only selector. It uses the existing release validator with an overview-only checkpoint label, existing active flats, POM points, base measurements, BOM rows, construction records, sample rounds, and technical-spec state.

Technical Readiness is deliberately not a separate score or database field:

- **Not started** — no technical specification exists.
- **In progress** — the specification has begun but less than two-thirds of the six visual rails are complete.
- **Needs attention** — the existing release validator has a critical blocker.
- **Nearly ready** — at least two-thirds of the rails are complete and no critical blocker exists.
- **Release ready** — the existing canonical technical specification is already `released`.

The progress rail reflects Flats, POM / Specs, BOM, Construction, Sample / Evidence, and Release. It is a visual reading of the current records, not a second workflow or approval system.

## Views

- **Garments** is the default image-led technical board. A card opens that garment’s existing Technical Studio route.
- **Release queue** retains dense scanning of technical specification, required flats, readiness, and unresolved work.
- **Issues** aggregates existing release-validator concerns by garment and routes to the relevant garment’s Technical Studio workspace.

The toolbar filters and sorts these same selectors; it never creates duplicate warnings or release records.

## Visual evidence

- Garments: `tests/e2e/wp11t-technical-landing.spec.ts-snapshots/wp11t-technical-garments-desktop-darwin.png`
- Release queue: `tests/e2e/wp11t-technical-landing.spec.ts-snapshots/wp11t-technical-release-queue-desktop-darwin.png`
- Issues: `tests/e2e/wp11t-technical-landing.spec.ts-snapshots/wp11t-technical-issues-desktop-darwin.png`
- Responsive board: iPad and mobile snapshots live alongside the desktop evidence.

## Verification

- Unit tests verify no-spec and released-spec readiness derivation.
- Browser tests cover the three landing views, search, issue navigation, keyboard activation, deep technical routing, and desktop/iPad/mobile layouts.
- Axe checks run over Garments, Release queue, and Issues.
- Production build passes.

## Future polish

- The card currently prioritizes the canonical garment cover. A future technical-asset switcher could surface front/back flats only after enough real flat imagery exists across the Studio; it should remain optional and not replace the garment cover by default.
- Keep monitoring the hosted beta’s existing cloud-sync health separately from this presentation update.
