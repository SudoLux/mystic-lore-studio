# WP10 hardening evidence

Date: 2026-08-27

WP10 is a hardening pass over the existing 2.0 scope. It does not migrate beta
data or expand the private/public product model.

## Responsive work modes

- Desktop retains the rail-plus-workbench layout and now exposes a skip link.
- Tablet sheets use labelled, focus-contained dialogs with Escape close and
  return-focus behavior.
- Production has a mobile-only Field Mode for sourcing, fittings, and QC;
  Editorial has a mobile-only Field Mode for shoots and story capture. Each
  keeps capture, next moves, and queued offline work visible.
- Production and Technical home tables have narrow-screen detail cards. POM is
  backed by its synchronized structured list; flat annotations remain available
  in the semantic annotation list.

## Accessibility manual matrix

| Check | Local evidence | External/manual follow-up |
| --- | --- | --- |
| Keyboard and focus | Skip link, 2px focus, dialog focus trap, Escape, and return focus have automated contract checks | Verify with Safari + VoiceOver after beta is provisioned |
| Zoom/reflow | 390 px cards replace Technical and Production tables | Verify 200% zoom and 320 CSS px on physical touch devices |
| Motion | Reduced-motion override removes long transitions and loops | Confirm editorial viewer transitions with OS reduced motion enabled |
| Screen reader | Native labels, landmarks, live notices, canvas/table alternatives, and labelled dialogs are present | Complete NVDA/Firefox and VoiceOver/Safari walkthroughs with beta fixture data |
| Color and target size | Text labels/icons accompany status; shared small controls are at least 44px | Run axe/Pa11y in the deployed authenticated session |

## Local performance fixtures and baseline

`src/lib/performanceFixtures.ts` provides deterministic, content-free shapes
for 120 large-garment relationships, 1,000 technical grid rows, 180 editorial
assets, 60 public cards, and 300 queued sync operations.
`tests/wp10Hardening.test.ts` measures serializing the combined fixture before
optimization and holds the local result under one second. This is a regression
guard, not browser profiling.

Current production-build baseline on this workstation: main application asset
1,240.98 kB, 326.62 kB gzip. Vite reports the existing >500 kB advisory.
Code-splitting route-sized workbench modules remains a measured beta follow-up;
it was not changed in this hardening pass to avoid altering established routes.

## Private-safe observability

The local-only Reliability Signals panel records bounded operational metadata
for sync failures, migration warnings, export/publication failures, AI job
failures, and uncaught client errors. Context keys and values likely to contain
content, media, names, URLs, prompts, payloads, raw data, or error text are
excluded before storage. The device log may be cleared from Settings.

## Locally verifiable gate

- `npm test -- --run`
- `npm run validate:schema`
- `npm run test:db`
- `npm run build`
- `git diff --check`

External beta checks intentionally deferred: production-device performance
profiling (LCP/INP and memory), authenticated axe/Pa11y scan, physical touch
target review, and VoiceOver/NVDA walkthrough.
