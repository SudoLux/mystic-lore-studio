# WP11F Visual Regression and Accessibility Report

Audit date: 2026-08-29

## Outcome

WP11F completes the shared production-polish pass for the Studio experience. The garment remains the visual subject, specialist tools enter through a calmer workbench, and system details move behind quieter language and progressive disclosure.

No database migration, generated database type, RLS policy, cloud-sync transport, media relationship, Storage policy, or publication command was changed in this work package.

## Coverage

The automated visual matrix covers Dashboard, Garment Library, Garment Workspace, Material Vault, Technical Studio, Production, Editorial, Portfolio, Versions, Studio Assistant, Settings, and the primary public route.

Every authenticated route was exercised at:

- 13-inch laptop: 1280 × 800
- iPad portrait: 1024 × 1366
- iPad landscape: 1366 × 1024
- Mobile: 390 × 844

The route checks require a visible page title, a usable main landmark, and no horizontal page overflow. Focused screenshot baselines also cover the Studio Assistant and Settings surfaces.

## Visual recovery changes

1. Loading now uses content-shaped atelier skeletons instead of generic nested panels.
2. Route movement, controls, and image reveals use one restrained motion language with reduced-motion fallbacks.
3. Primary actions use an accessible, consistent atelier-gold treatment; disabled actions are visually quiet without becoming illegible.
4. Image loading communicates progress while preserving canonical media sources and image relationships.
5. Mobile Garment Library and Material Vault now retain their page identity and hierarchy.
6. Editorial empty states lead with the creative next step instead of exposing a sparse work surface.
7. Versions, Studio Assistant, Settings, Technical Studio, Production, Portfolio, Plan, and Today use designer-facing language while retaining their existing behavior.
8. Technical reliability details remain available in Settings under an advanced disclosure rather than dominating the page.

## Accessibility summary

The automated axe route matrix passes for the major authenticated Studio routes, key mobile routes, and the anonymous public route.

Issues found and corrected during WP11F:

- Hidden garment and material upload inputs lacked accessible names.
- The active material tab had insufficient contrast.
- Primary and selected gold controls needed a brighter foreground/background pairing.
- Disabled controls inherited an inaccessible gold treatment.
- Route opacity animation briefly created low-contrast text during automated inspection.

Keyboard focus styles, semantic main landmarks, reduced-motion behavior, and canonical canvas/list alternatives remain intact.

Manual assistive-technology evidence is still a human release activity: VoiceOver with Safari, NVDA with Firefox, physical 200% reflow, and a touch-device walkthrough should be recorded against the deployed beta before final promotion.

## Verification results

- `npm run test:visual`: PASS, 5 visual/responsive scenarios
- `npm run test:a11y`: PASS, 2 route-matrix scenarios
- `npm test -- --run`: PASS, 162 tests; 1 intentionally skipped external check
- `npm run test:e2e`: PASS, 2 authenticated/offline/public browser scenarios
- `npm run test:canonical:integration`: PASS, 15 repository integration tests
- `npm run validate:schema`: PASS, 87 private tables, 2 public projection tables, 239 pgTAP assertions, and 7 preserved legacy inputs
- `npm run test:db`: PASS, 7 files and 239 database/RLS assertions
- `npm run build`: PASS
- `npm run test:bundle`: PASS; largest JavaScript chunk 385,433 bytes, largest CSS chunk 281,120 bytes, and largest image 199,758 bytes
- `git diff --check`: PASS

## Screenshot evidence

Before and after captures are stored under:

- `docs/screenshots/wp11f/before/`
- `docs/screenshots/wp11f/after/`
- `docs/screenshots/wp11f/after/responsive/`

The final set includes Dashboard, Garment Library, Garment Workspace, Material Vault, Technical Studio, Production, Editorial, Portfolio, Versions, Studio Assistant, Settings, and the four target responsive sizes.

## Remaining future polish

1. Replace the audit garment's empty media placeholders with a rights-cleared, media-rich garment fixture so crop behavior can be judged with real imagery on every device.
2. Record the outstanding physical-device and assistive-technology walkthroughs on the deployed beta.
3. Add stress captures for unusually long garment names, large editorial collections, and heavily populated specialist tables.
4. Continue shortening deep specialist-workbench helper copy only where user testing shows hesitation; do not remove the underlying evidence or controls.

## Release interpretation

WP11F removes the identified presentation-layer inconsistencies without changing the canonical system of record. Automated visual, accessibility, application, build, schema, and database results should be read alongside this report; deployment and physical-device validation remain separate release-owner actions.
