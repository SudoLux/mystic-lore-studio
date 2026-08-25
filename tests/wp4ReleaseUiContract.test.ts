import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const page = readFileSync(new URL('../src/pages/TechnicalStudio/ReleaseStudio.tsx', import.meta.url), 'utf8');
const shell = readFileSync(new URL('../src/pages/TechnicalStudio/TechnicalStudioPage.tsx', import.meta.url), 'utf8');

describe('WP4 BOM, construction, release, and export UI contracts', () => {
  it('exposes the complete Technical Studio sequence without entering versioning work', () => {
    for (const section of ['bom', 'construction', 'grading-files', 'release']) expect(shell).toContain(`'${section}'`);
    expect(shell).toContain('Grading & files');
  });

  it('keeps BOM links, intentional free text, supplier offers, substitutes, shortages, and cost visible', () => {
    for (const label of ['Item type', 'intentional free text', 'Supplier offer', 'Approved substitute BOM row', 'Shortage', 'Cost impact', 'Component detail']) expect(page).toContain(label);
    expect(page).toContain('RelationshipPicker');
    expect(page).toContain('md:hidden');
  });

  it('provides stable sequence ordering plus keyboard move controls and anchored detail records', () => {
    expect(page).toContain('draggable');
    expect(page).toContain('Move ${step.operation} up');
    expect(page).toContain('Move ${step.operation} down');
    expect(page).toContain('Move section ${section.name} up');
    expect(page).toContain('Move section ${section.name} down');
    expect(page).toContain('Anchor X');
    expect(page).toContain('stable detail');
    expect(page).toContain('Template applications');
  });

  it('shows grouped validation, audited waivers, non-waivable privacy, and export stages', () => {
    for (const label of ['Request audited waiver', 'Follow-up task', 'Non-waivable privacy', 'Release commit', 'Export panel', 'Section manifest prepared', 'Approved artifact recorded']) expect(page).toContain(label);
    expect(page).toContain('aria-live="polite"');
  });

  it('labels AI output as candidates and keeps human domain commands as the commit path', () => {
    expect(page.match(/AI may propose candidate|AI construction recommendations/g)?.length).toBe(2);
    expect(page).not.toContain('acceptAI');
    expect(page).not.toContain('direct AI');
  });
});
