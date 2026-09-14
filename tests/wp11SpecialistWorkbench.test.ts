import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const shared = readFileSync('src/components/shared/SpecialistWorkbench.tsx', 'utf8');
const styles = readFileSync('src/styles/index.css', 'utf8');
const technical = readFileSync('src/pages/TechnicalStudio/TechnicalStudioPage.tsx', 'utf8');
const flats = readFileSync('src/pages/TechnicalStudio/FlatsWorkspace.tsx', 'utf8');
const technicalLanding = readFileSync('src/pages/TechnicalStudio/TechnicalStudioLanding.tsx', 'utf8');
const production = readFileSync('src/pages/Production/ProductionPage.tsx', 'utf8');
const editorial = readFileSync('src/pages/EditorialStudio/EditorialStudioPage.tsx', 'utf8');
const portfolio = readFileSync('src/pages/PortfolioStudio/PortfolioStudioPage.tsx', 'utf8');
const versions = readFileSync('src/pages/Versions/VersionsPage.tsx', 'utf8');

describe('WP11E calm specialist workbenches', () => {
  it('provides one canonical garment context with imagery, phase, next move, and quick actions', () => {
    expect(shared).toContain('data-testid="specialist-garment-context"');
    expect(shared).toContain('CanonicalMediaImage');
    expect(shared).toContain('garment.phase');
    expect(shared).toContain('recommendedGarmentAction');
    expect(shared).toContain('workbench-quick-action');
  });

  it('uses the shared workbench context across specialist domains', () => {
    for (const source of [technical, production, editorial, portfolio, versions]) {
      expect(source).toContain('GarmentWorkbenchContext');
      expect(source.includes('SpecialistWorkbench') || source.includes('specialist-workbench')).toBe(true);
    }
    expect(technical).toContain("{ id: 'bom', label: 'BOM' }");
    expect(technical).toContain("{ id: 'construction', label: 'Construction' }");
    expect(technical).toContain("{ id: 'release', label: 'Tech pack' }");
    expect(production).toContain("{ id: 'order', label: 'Order & QC' }");
  });

  it('reduces visual chrome while retaining tables, fields, and semantic mobile alternatives', () => {
    expect(styles).toContain('.specialist-workbench .atelier-panel');
    expect(styles).toContain('.specialist-workbench table');
    expect(styles).toContain('.specialist-workbench .field');
    expect(styles).toContain('.workbench-tabs');
    expect(technicalLanding).toContain('Technical release queue details');
    expect(technicalLanding).toContain('Technical Studio');
    expect(technicalLanding).toContain('Technical readiness');
    expect(production).toContain('Sampling timeline details');
    expect(flats).toContain('flat-canvas-help');
  });
});
