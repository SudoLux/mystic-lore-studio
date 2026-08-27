import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createCanonicalWorkspace } from '../src/domains/workspace';
import { createPerformanceFixture, measureFixture } from '../src/lib/performanceFixtures';
import { importStudioData } from '../src/lib/studioStorage';

const fixtureText = readFileSync(new URL('./fixtures/legacy-studio-data-v5.json', import.meta.url), 'utf8');
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const shell = read('../src/components/layout/AppShell.tsx');
const styles = read('../src/styles/index.css');
const fieldMode = read('../src/components/shared/FieldModePanel.tsx');
const dialog = read('../src/components/shared/useDialogA11y.ts');
const technical = read('../src/pages/TechnicalStudio/TechnicalStudioPage.tsx');
const production = read('../src/pages/Production/ProductionPage.tsx');
const observability = read('../src/lib/observability.ts');

describe('WP10 responsive, accessibility, performance, and observability contracts', () => {
  it('keeps a keyboard skip route, reduced-motion override, 44px controls, and focus visibility', () => {
    expect(shell).toContain('Skip to main content');
    expect(shell).toContain('id="main-content"');
    expect(styles).toContain('prefers-reduced-motion: reduce');
    expect(styles).toContain(':focus-visible');
    expect(styles).toContain('.skip-link');
    expect(read('../src/components/shared/Button.tsx')).toContain("min-h-11");
  });

  it('uses focus-contained dialogs and semantic alternatives for canvases and narrow tables', () => {
    for (const token of ['Escape', 'focusableSelector', 'previousFocusRef']) expect(dialog).toContain(token);
    expect(technical).toContain('Technical release gate details');
    expect(technical).toContain('flat-canvas-help');
    expect(production).toContain('Sampling timeline details');
    expect(fieldMode).toContain('Field mode');
    expect(fieldMode).toContain('Capture and review work stays on this device');
  });

  it('keeps client diagnostics operational-only and rejects content-bearing context keys', () => {
    for (const token of ['blockedContextKey', 'prompt', 'payload', 'error messages', 'maxEvents = 75']) expect(observability).toContain(token);
  });

  it('creates measurable large-record, 1,000-row, image-heavy, public, and sync fixtures before optimization', async () => {
    const state = await createCanonicalWorkspace({ data: importStudioData(fixtureText), ownerUserId: '10000000-0000-4000-8000-000000000111' });
    const measured = measureFixture(() => JSON.stringify(createPerformanceFixture(state)));
    const parsed = JSON.parse(measured.value) as ReturnType<typeof createPerformanceFixture>;
    expect(parsed.technicalGridRows).toHaveLength(1_000);
    expect(parsed.largeGarmentAssets).toHaveLength(120);
    expect(parsed.imageHeavyEditorialAssets).toHaveLength(180);
    expect(parsed.publicCards).toHaveLength(60);
    expect(parsed.syncQueue).toHaveLength(300);
    expect(measured.durationMs).toBeLessThan(1_000);
  });
});
