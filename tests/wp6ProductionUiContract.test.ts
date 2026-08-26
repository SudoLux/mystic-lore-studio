import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const page = readFileSync(new URL('../src/pages/Production/ProductionPage.tsx', import.meta.url), 'utf8');
const mobileNav = readFileSync(new URL('../src/components/layout/MobileNav.tsx', import.meta.url), 'utf8');

describe('WP6 Production UI contracts', () => {
  it('contains Production Home, sample round, and Fit Review contracts', () => {
    for (const label of ['Release to delivery', 'Start a sample round', 'Sampling timeline', 'Fit review', 'Fit decision']) expect(page).toContain(label);
  });

  it('keeps gallery, measurement, issue, decision, task, and promotion affordances accessible', () => {
    for (const label of ['Sample gallery', 'Measurements', 'Issues', 'Promote observation', 'POM candidate', 'Version note']) expect(page).toContain(label);
    expect(page).toContain('<table'); expect(page).toContain('aria-live'); expect(page).toContain('capture="environment"');
  });

  it('provides queue/retry behavior and a reachable Production mobile navigation item', () => {
    expect(page).toContain('Retry'); expect(page).toContain('offline'); expect(mobileNav).toContain("'production'");
  });

  it('contains quantity Cost Sheet, pinned order, QC, waiver, release, and Timeline contracts', () => {
    for (const label of ['Quantity-aware costing', 'Cost Sheet', 'COGS / unit', 'Wholesale', 'Margin', 'Production order', 'Source version stale', 'QC checklist', 'Waive', 'Release decision', 'Production chronology']) expect(page).toContain(label);
    expect(page).toContain('aria-label="Production workspace"');
    expect(page).toContain('overflow-x-auto');
  });
});
