# WP11P-E — Plan Integration, Polish & QA

## Outcome

Flow, Tasks, and Calendar now operate as three connected views over the same canonical garment, task, and calendar-event records:

- Flow answers where the garment is.
- Tasks answers what needs to happen.
- Calendar answers when it happens.

No schema, RLS, Storage, media relationship, or sync-authority change was introduced in this pass.

## Integration completed

- Flow open-task counts now open Tasks with that garment applied as a presentation-only filter.
- The filter is visible, reversible, and does not create or alter task records.
- Task garment references and Calendar garment references continue to open the same canonical garment workspace.
- Calendar task entries still open the canonical task detail drawer; editing a due date moves the same task projection.
- Completing a task updates its Calendar treatment without creating an event copy.
- The shared Plan header is the single primary location for New task / New event, removing repeated actions inside the Tasks and Calendar workbenches.
- Small task and calendar image contexts use canonical thumbnail derivatives. Missing-image fallbacks are now compact and contain no nested retry control.
- The Calendar notes migration now preserves the existing material profile/media write allowlist. This repairs a migration-order regression without widening permissions or changing the schema.

## Responsive and accessibility checks

Verified at:

- large desktop
- 13-inch laptop (1440 × 900)
- iPad landscape (1194 × 834)
- iPad portrait (834 × 1194)
- mobile (390 × 844)

Flow retains intentional horizontal movement instead of compressing its columns. Tasks keeps its grouped mobile treatment. Calendar stacks the selected-day agenda below the month grid on narrow screens. Automated WCAG A/AA checks run on all three Plan views.

The final checks passed: 189 unit tests, 16 canonical persistence tests, 269 database/RLS assertions, 9 full Plan browser regressions, 2 focused WP11P-E integration tests, the app-wide accessibility suite, schema validation, script type-checking, bundle budget, and production build.

## Visual evidence

- `tests/e2e/wp11p-plan-integration.spec.ts-snapshots/wp11p-e-flow-desktop-darwin.png`
- `tests/e2e/wp11p-plan-integration.spec.ts-snapshots/wp11p-e-tasks-filtered-desktop-darwin.png`
- `tests/e2e/wp11p-plan-integration.spec.ts-snapshots/wp11p-e-calendar-desktop-darwin.png`
- `tests/e2e/wp11p-plan-integration.spec.ts-snapshots/wp11p-e-calendar-mobile-darwin.png`

## Remaining future polish

- Calendar drag-to-reschedule remains intentionally deferred until a pointer, touch, keyboard, and rollback model can be proven equally reliable. Explicit date editing remains canonical and safe.
- The hosted beta should be checked after deployment for an empty outbox and a fully synchronized badge. A hosted sync warning is an operational state, not a Plan presentation regression.
- Real garment photography should be rechecked on the hosted beta at mobile network speed to confirm derivative availability and cache warmth; local tests verify selection behavior and bounded thumbnail delivery but do not reproduce every production-network condition.
