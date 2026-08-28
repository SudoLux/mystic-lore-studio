# Mystic Lore Studio 2.0 known limitations

| Severity | Limitation | Impact | Owner / resolution |
| --- | --- | --- | --- |
| High | Dedicated hosted beta import, shadow parity, cloud flip, and deploy walkthrough have not run | Local proof cannot establish the operational state of a real beta environment | Release owner + engineering; provision an isolated project and run the beta checklist |
| High | Hosted database backup/restore and separate Storage restore have not run | Recovery-point and media-object integrity remain unproven outside local fixtures | Database operator; restore into a disposable project and compare recorded checksums |
| High | VoiceOver/Safari, NVDA/Firefox, physical-device 200% reflow/touch, and deployed authenticated scans remain external | Automated local WCAG checks do not replace assistive-technology sign-off | Accessibility owner |
| High | Deployed LCP, INP, CLS, memory, 1,000-row grid, and media-heavy measurements are absent | Local serialization and bundle budgets cannot predict field performance | Frontend performance owner |
| Medium | The browser outage test isolates Supabase transport while the application shell remains available | A first-ever cold start with neither a cached shell nor a cached Studio cannot work offline | QA; verify the deployed caching strategy and document supported cold-start behavior |
| Low | Some compatibility labels still say “Projects”, “Fabric Vault”, or “Stats” | Terminology is not fully aligned with Today/Garments/Libraries/Plan while recovery paths remain | Product design after beta cutover |

The former Critical browser-local authority and non-atomic Public Cut findings
are resolved locally. This document does not mark the release ready: all High
external gates must pass and `npm run audit:beta` must return `PASS`.
