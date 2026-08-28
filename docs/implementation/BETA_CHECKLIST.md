# Mystic Lore Studio 2.0 beta checklist

Release decision: **BLOCKED pending hosted and physical-device evidence**

## Passed locally

- [x] All 2.0 migrations apply to an empty local database.
- [x] Schema validation passes with 87 private tables, 2 public projection
  tables, 230 pgTAP assertions, and 7 protected legacy inputs.
- [x] Representative legacy migration round-trips with zero unexplained loss;
  interruption and duplicate retry converge without revision churn.
- [x] Generated Supabase TypeScript types and the WP3–WP9 codec registry are
  checked in.
- [x] Normal authenticated edits commit through the security-invoker,
  statically allowlisted `commit_canonical_operation` RPC.
- [x] Direct browser writes, cross-Studio writes, anonymous writes, and
  reviewer writes are denied.
- [x] IndexedDB holds cache, outbox, recovery copies, and staged media; a clean
  browser has no `canonical-wp3` localStorage graph.
- [x] A Supabase outage preserves an optimistic edit across provider reload;
  reconnect replays it once and a second independent browser loads it.
- [x] Protected Freeze Frame, restore, release, export, QC, and AI evidence uses
  dedicated fresh-state commands.
- [x] Public Cut preview reloads canonical source data and publish/unpublish
  uses private staged batches with atomic promotion and visibility-first
  removal.
- [x] Route-level lazy loading and dynamic PDF/ZIP/image/QR imports keep every
  generated JavaScript chunk below 500 KiB.
- [x] Authenticated desktop/mobile and anonymous axe scans pass locally.
- [x] `npm audit` reports zero known dependency vulnerabilities.
- [x] Legacy fixtures, device exports, and recovery caches remain preserved.

## Required in the isolated hosted beta

- [x] Provision the dedicated Supabase beta project
  `iahrcupmyjnyyqszrmcx`; all 24 migrations are applied. Do not target
  `jsjhqnmlgceunlxgenkg`.
- [x] Publish the first beta build at
  `https://mystic-lore-studio-2-beta.netlify.app` using the isolated beta
  browser configuration.
- [ ] Authorize Netlify's GitHub connection for automatic deployments from
  `feature/ml-studio-2.0`, then add the beta URL to Supabase Auth redirect URLs.
- [ ] Export the current device from Settings, run `npm run beta:import-device`
  with the isolated confirmation, and retain its machine report.
- [ ] Run shadow scenarios for one complete garment across design, technical,
  production, editorial, portfolio, and AI; compare rows, relationships,
  revisions, events, media, exports, and publications after each scenario.
- [ ] Flip only the beta Studio to `cloud` after exact parity and an empty
  outbox.
- [ ] Prove two authorized profiles, an unauthorized account, and an anonymous
  session against the deployed beta.
- [ ] Rehearse a database restore into a disposable project and restore Storage
  separately; record matching checksums.
- [ ] Complete VoiceOver/Safari, NVDA/Firefox, 200% reflow, and physical touch
  walkthroughs.
- [ ] Record deployed LCP p75, INP p75, CLS p75, memory, image loading, public
  routes, and the 1,000-row technical grid.
- [ ] Place the four signed evidence JSON files described under
  `evidence/wp10/beta-external/` and run `npm run audit:beta`.
- [ ] Preserve legacy exports and local recovery caches for 30 days after beta
  acceptance.

After the first accepted cloud-mode write, rollback means maintenance mode and
database/Storage recovery. It does not mean reverting authority to a stale
browser cache. No 3.0 collaboration behavior is included.
