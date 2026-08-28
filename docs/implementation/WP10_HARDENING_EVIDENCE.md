# WP10 hardening and blocker-removal evidence

Date: 2026-08-27

## Responsive and accessibility evidence

- Desktop retains the rail/workbench layout and skip link.
- Tablet sheets use labelled, focus-contained dialogs with Escape and
  return-focus behavior.
- Production and Editorial expose capture-first mobile Field Mode.
- Wide Technical and Production data has a narrow-screen card/list alternative;
  canvases retain synchronized semantic lists.
- Compact brand artwork has image semantics, Production selects have explicit
  names, and the sampling timeline can be keyboard-scrolled in Safari.
- `npm run test:a11y` passes authenticated Projects, Technical, Production,
  Editorial, Portfolio, and Settings routes at desktop size; Projects,
  Production, and Settings at 390 × 844; and the anonymous portfolio route.

The remaining manual matrix is external: VoiceOver/Safari, NVDA/Firefox,
physical 200% reflow/touch, and OS reduced-motion walkthroughs against the beta
fixture.

## Reliability and offline evidence

The canonical provider persists no private graph in localStorage. IndexedDB
stores the last Studio/mode, normalized workspace cache, dependency-ordered
outbox, base/local conflict rows, recovery copies, and staged media blobs.

`npm run test:e2e` proves:

- a normal garment UI command reaches the operation RPC through RLS;
- a Supabase-only outage keeps an optimistic garment across provider reload;
- reconnect replays the operation once;
- a second independent authenticated browser loads both records;
- a different Studio account loads neither record; and
- an anonymous portfolio route never mounts the private shell.

The test keeps the app origin available while Supabase transport is unavailable,
which matches an installed/open application shell. A first-ever offline cold
start with no cached application or Studio is not supported.

## Performance and dependency evidence

Deterministic fixtures cover 120 large-garment relationships, 1,000 technical
grid rows, 180 editorial assets, 60 public cards, and 300 queued operations.
They remain regression guards, not field telemetry.

Route-level lazy loading now separates every major Studio area. PDF, ZIP,
image-export, and QR libraries are dynamically imported. The current local
production build contains 36 JavaScript chunks:

- largest JavaScript chunk: 378,463 bytes (500 KiB budget);
- largest CSS chunk: 268,707 bytes (350 KiB budget);
- largest image: 199,758 bytes (250 KiB budget);
- total built assets plus index: 1,681,294 bytes.

The machine-readable result is `evidence/wp10/bundle-budget.json` and
`npm run test:bundle` enforces the budgets. `npm audit` reports zero known
vulnerabilities after non-forced transitive remediation.

Deployed LCP/INP/CLS, memory, grid, and media profiles remain external.

## Private-safe observability

Reliability Signals record bounded operational metadata for sync, migration,
export, publication, AI, and client failures. Keys and values likely to contain
names, prompts, payloads, URLs, raw media, or record content are excluded.

## Locally verifiable gates

```text
npm run db:reset
npm run validate:schema
npm run test:db
npm run test:rc:migration
npm run test:canonical:integration
npm test -- --run
npm run test:e2e
npm run test:a11y
npm run build
npm run test:bundle
```

`npm run audit:beta` intentionally fails until isolated hosted, recovery,
assistive-technology, and deployed-performance evidence is supplied.
