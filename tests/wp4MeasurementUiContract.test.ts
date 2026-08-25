import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const source = readFileSync(new URL('../src/pages/TechnicalStudio/MeasurementStudio.tsx', import.meta.url), 'utf8');

describe('WP4 POM and measurement UI contracts', () => {
  it('synchronizes accessible POM markers with a keyboard point list', () => { expect(source).toContain('POMCanvas'); expect(source).toContain('Keyboard point list'); expect(source).toContain('aria-pressed'); expect(source).toContain('diagramAnchor'); });
  it('uses native keyboard editing with visible dirty and conflict states', () => { expect(source).toContain("event.key === 'Enter'"); expect(source).toContain("event.key === 'Escape'"); expect(source).toContain('dirty · Enter saves'); expect(source).toContain('conflict · Esc resets'); });
  it('provides explicit units, tabular numerals, paste validation, and row-card fallback', () => { expect(source).toContain('Converted display'); expect(source).toContain('tabular-nums'); expect(source).toContain('onPaste'); expect(source).toContain('md:hidden'); expect(source).toContain('Validate paste'); });
  it('previews grading before a non-destructive commit', () => { expect(source).toContain('Preview before commit'); expect(source).toContain('Commit as new set'); expect(source).toContain('base set is unchanged'); });
  it('supports structural selection restore while retaining sample evidence', () => { expect(source).toContain('Structural compare and selective restore'); expect(source).toContain('Restore selected'); expect(source).toContain('never deletes later fit actuals'); });
});
