import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const source = readFileSync(new URL('../src/pages/TechnicalStudio/MeasurementStudio.tsx', import.meta.url), 'utf8');
const pom = readFileSync(new URL('../src/pages/TechnicalStudio/PomWorkspace.tsx', import.meta.url), 'utf8');

describe('WP4 POM and measurement UI contracts', () => {
  it('maps accessible POM markers onto the canonical Front and Back flat sources', () => { expect(pom).toContain("activeFlat(state, specId, view)"); expect(pom).toContain('technicalPreviewUrl'); expect(pom).toContain('aria-pressed'); expect(pom).toContain('pointView(point)'); expect(pom).not.toContain('GarmentDiagram'); });
  it('places normalized, view-specific anchors without exposing coordinate fields', () => { expect(pom).toContain('normalizedAnchor'); expect(pom).toContain("view: PomView"); expect(pom).toContain('Place on canvas'); expect(pom).not.toContain('Anchor X'); expect(pom).not.toContain('Anchor Y'); });
  it('keeps the canvas, list, and inspector synchronized', () => { expect(pom).toContain('POM INSPECTOR'); expect(pom).toContain('onHover={setHoveredId}'); expect(pom).toContain('scrollIntoView'); expect(pom).toContain('Re-place'); });
  it('uses native keyboard editing with visible dirty and conflict states', () => { expect(source).toContain("event.key === 'Enter'"); expect(source).toContain("event.key === 'Escape'"); expect(source).toContain('dirty · Enter saves'); expect(source).toContain('conflict · Esc resets'); });
  it('provides explicit units, tabular numerals, paste validation, and row-card fallback', () => { expect(source).toContain('Converted display'); expect(source).toContain('tabular-nums'); expect(source).toContain('onPaste'); expect(source).toContain('md:hidden'); expect(source).toContain('Validate paste'); });
  it('previews grading before a non-destructive commit', () => { expect(source).toContain('Preview before commit'); expect(source).toContain('Commit as new set'); expect(source).toContain('base set is unchanged'); });
  it('supports structural selection restore while retaining sample evidence', () => { expect(source).toContain('Structural compare and selective restore'); expect(source).toContain('Restore selected'); expect(source).toContain('never deletes later fit actuals'); });
});
