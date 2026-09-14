# Mystic Lore Studio 2.0 release-candidate screen audit

Audit date: 2026-08-27  
Source: Product Bible page 41 inventory and grouped wireframes on pages 42–56.

The inventory allows grouped screens, tabs, drawers, inspectors, and dialogs;
it does not require every named surface to be a separate route. “Pass” below
means the surface exists and matches the local interaction contract. Normal
authenticated surfaces now read the canonical repository; hosted-beta proof is
tracked separately in the release report.

| Product Bible screen(s) | Current surface and data owner | Primary action and component contract | Responsive and failure-state evidence | RC result |
| --- | --- | --- | --- | --- |
| Sign in / sign up | `AuthScreen`; Supabase Auth | Authenticate or create account; labelled email/password fields and 44 px controls | Loading, configuration, validation, API error, narrow layout | Pass |
| Account recovery | `AuthScreen` + `useAuth`; Supabase Auth | Send recovery link, detect `PASSWORD_RECOVERY`, replace password | Error, success, cancel, keyboard form | Pass; added in RC |
| First-studio setup | `FirstStudioSetupScreen`; `profiles`, `studios`, `studio_members`, `studio_settings` | Create the single-owner studio and canonical unit/currency policy | Retry-safe existing-studio lookup, validation, sign-out recovery, narrow form | Pass; added in RC |
| Today dashboard | `TodayPage`; canonical workspace projection | Open focused garment or Plan; metrics derive from garments, tasks, materials, editorials | Loading/error/offline/empty states; Field Mode; 390 px verified | Pass; canonical cutover added in RC |
| Command palette / create actions | `CanonicalGlobalSearch`; canonical garments, collections, materials, components, editorials, and tasks | ⌘K/Ctrl+K opens canonical record search and route commands | Escape close, empty/no-result states, mobile full-screen palette | Pass; canonical cutover |
| Activity / inbox | `TodayPage`; canonical `change_events` and tasks | Review authored changes and next accountable move | Empty inbox, offline status, labelled activity list | Pass; added in RC |
| Garment library / collection workspace | `GarmentLibraryPage`; garments and collections | Search/filter collections, create collection/garment, open garment | Loading/error/empty/create validation; cards at narrow widths | Pass |
| Garment overview | `CanonicalGarmentWorkspacePage`; garment and relationship projections | Edit identity and move between six garment lenses | Dirty/conflict/offline and destructive-confirmation contracts | Pass |
| Design Studio / moodboard / media library | Garment workspace Design, Moodboard, and Media lenses; design briefs, boards/items, media assets/derivatives/roles | Edit brief, link reusable assets, create board, annotate source | Semantic lists accompany visual workspaces; empty/error/offline states | Pass |
| Technical Studio home | `TechnicalStudioPage`; technical spec/release projection | Open garment technical record and review release health | Desktop table plus labelled mobile detail list; 390 px no overflow | Pass |
| Flats / source files / annotations | `TechnicalStudioPage`; technical flats/files/annotations | Add source-evidenced view, anchor structured annotation, approve/version | Keyboard view controls, semantic annotation list, warning/error states | Pass |
| POM / measurements / grading | `MeasurementStudio`; POM, sets, values, rules, deltas | Edit stable POM, paste/import grid, preview then commit grading | Semantic POM list, row cards, import errors, dirty/conflict states | Pass |
| BOM / component detail | `ReleaseStudio`; linked BOM rows and reusable variants/offers | Link relationship or mark intentional free text; approve/substitute | Missing-link, shortage, cost-impact, empty and narrow states | Pass |
| Construction | `ReleaseStudio`; ordered sections/steps/details/templates | Add/reorder sections and steps, define machine/stitch/seam/callout | Keyboard order alternatives, empty/template/error states | Pass |
| Validation / release / export / history | `ReleaseStudio`; validation runs, waivers, versions, exports | Inspect gates, record governed waiver, release, generate deterministic ZIP | Non-waivable privacy, pending/error stages, manifest and artifact history | Pass locally |
| Production home / suppliers / factories | `ProductionPage`; production repository | Add reusable identity/capability and start pinned sample round | Field Mode, empty/offline/retry, mobile detail list | Pass |
| Sample round / Fit Review | `ProductionPage`; rounds, sessions, POM actuals, issues, media, promotions | Capture evidence, decide fit, promote issue with provenance | Mobile capture, upload retry, changed-POM warning, empty/error states | Pass |
| Cost Sheet / production order | `ProductionPage`; costing and order repository | Model quantity scenario; approve cost; create version-pinned order | Invalid totals, stale release, rounding/currency warnings, row cards | Pass |
| QC / timeline | `ProductionPage`; templates/checks/results/waivers/milestones | Record check evidence and decision; inspect source chronology | Failure/waiver states, severity text, narrow timeline | Pass |
| Material Vault / material detail | `LibraryVaultPage`; materials, variants, ledger, garment usage | Create reusable material and record inventory event | Search/empty/error and narrow detail contracts | Pass |
| Component Library / component detail | `LibraryVaultPage`; components, variants, supplier offers, usage | Create reusable component and inspect downstream use | Search/empty/error and narrow detail contracts | Pass |
| Supplier-item relationships / template library | Library detail + Production supplier/factory panels + Technical template controls | Reuse offer or technical template without copied ownership | Missing offer/template, safe create, application provenance | Pass as grouped surfaces |
| Editorial Library / setup | `EditorialStudioPage`; normalized editorial collections and garment links | Create private collection, select primary garment, approve state | Loading/error/empty/offline and narrow setup | Pass |
| Scene builder / block inspector / viewer | `EditorialStudioPage`; scenes, blocks, assets, Story from System sources | Add/order scene, edit block, inspect exact private viewer | Keyboard ordering, live-data staleness, rights and empty states | Pass |
| Editorial export / private publish state | `EditorialStudioPage`; immutable editorial export evidence | Commit PDF/image export or explicit private publish-state transition | Missing rights/source, stale source, deterministic repeat tests | Pass locally |
| Portfolio manager / profile / project / editorial editors | `PortfolioStudioPage`; private curation relationships | Select/reorder stories and approved technical excerpts | Empty, stale, error, narrow editor states | Pass |
| Public Cut preview / history | `PublicCutPreview`; fresh canonical loader plus atomic Supabase batch adapter | Run privacy scan, stage copied media, then explicit atomic publish/unpublish | Allowlist/denylist, copied media, stale source, zero-partial batch failures, server-refreshed history | Local pass; hosted Storage proof pending |
| Public home / case study / editorial / excerpt / not found | `PublicPortfolioRoute` + `PublicPortfolioPage`; `ml_public` only | Read current immutable snapshot and copied derivative manifest | Anonymous not-published/not-found state; 1280 px no overflow verified | Pass |
| Versions / diff / restore | `VersionsPage`; versions, revisions, events, restore operations | Create Freeze Frame, compare, preview scoped restore, commit new checkpoint | Conflict/fresh-state/offline/protected-dependency states | Pass locally |
| Tasks / calendar / flow | `PlanPage`; canonical tasks, calendar events, garments | Create/update task, add event, move garment phase | Loading/error/offline/conflict/empty; tab semantics; 390 px verified | Pass; canonical grouped screen added in RC |
| AI jobs / candidate review | `AiStudioPage`; AI jobs/input refs/artifacts/acceptance receipts | Run fake-provider job and accept/reject selected fields via domain command | Queued/running/stale/partial/retry/denial/narrow states | Pass locally |
| Settings / sync / recovery | `SettingsPage`, canonical sync indicator, IndexedDB outbox/recovery, reliability signals | Inspect mode/outbox, refresh from cloud, export checksum/media recovery ZIP | Offline/error/conflict/retry/private diagnostics | Local pass; hosted recovery rehearsal pending |

## Browser walkthrough evidence

- Auth screen exposed sign in, sign up, recovery, labelled fields, and disabled
  invalid submit.
- Authenticated 1280 px walkthrough covered Today, command palette, Plan,
  Garment Library, Material Vault, Technical Studio, and Production.
- 390 × 844 walkthrough reported `scrollWidth === innerWidth` for Plan and
  Technical Studio. The first RC pass found overlapping arc-menu hit targets;
  the menu was replaced by a non-overlapping four-column sheet and retested.
- Playwright created an RLS-backed garment, preserved an offline garment across
  provider reload, replayed it once, and loaded both on a second independent
  browser. A separate Studio saw neither record.
- Axe passed six authenticated desktop routes, three 390 × 844 routes, and the
  anonymous portfolio route.
- Anonymous `/portfolio/designer` rendered only the public not-published state
  and never mounted private application chrome.
