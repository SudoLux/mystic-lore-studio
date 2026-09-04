import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../src/pages/TechnicalStudio/GradingWorkspace.tsx', import.meta.url), 'utf8');
const release = readFileSync(new URL('../src/pages/TechnicalStudio/ReleaseStudio.tsx', import.meta.url), 'utf8');

describe('WP11T-D grading workspace contracts', () => {
  it('keeps grading and files as focused views with grading first', () => {
    expect(release).toContain("useState<'grading' | 'files'>('grading')");
    expect(release).toContain('Files &amp; Release');
    expect(release).toContain('GradingFilesWorkspace');
  });

  it('presents POM-based simple and advanced grade entry with a live preview', () => {
    expect(source).toContain('Simple');
    expect(source).toContain('Advanced');
    expect(source).toContain('Apply across');
    expect(source).toContain('Live preview');
    expect(source).toContain('Resulting graded size run');
    expect(source).toContain('Create Graded Set');
  });

  it('uses the shared display engine and handles manual conflicts before creation', () => {
    expect(source).toContain('formatMeasurementValue');
    expect(source).toContain('parseMeasurementInput');
    expect(source).toContain('Existing size values');
    expect(source).toContain('Manual overrides');
    expect(source).toContain('Keep manual');
    expect(source).toContain('Use grade rule');
    expect(source).toContain('base set remains unchanged');
  });

  it('keeps grade rules authoritative while allowing intentional manual exceptions', () => {
    expect(source).toContain('Math.abs(current.target) > .0001');
    expect(source).toContain("sourceValueDecisions[sourceKey] === undefined");
    expect(source).toContain("[sourceKey]: 'manual'");
    expect(source).toContain("[sourceKey]: 'grade'");
    expect(source).not.toContain('conflicts.length');
  });

  it('keeps fraction entry and layout usable inside scrolling grade tables', () => {
    expect(source).toContain('FRACTION_STEPS');
    expect(source).toContain('createPortal');
    expect(source).toContain('Fraction quick select');
    expect(source).toContain('table-fixed');
    expect(source).toContain('w-[13.5rem]');
    expect(source).toContain('w-[18rem]');
  });

  it('selects a saved rule and reuses it when creating a graded set', () => {
    expect(source).toContain('saveGradeRule');
    expect(source).toContain('setRuleId(savedRuleId)');
    expect(source).toContain('if (ruleId && !ruleDirty) commitGrade');
  });

  it('opens older technical specs safely before their size range is configured', () => {
    expect(source).toContain('Array.isArray(spec.sizeRange) && spec.sizeRange.length');
    expect(source).toContain("[spec.baseSize || 'M']");
    expect(source).toContain('Manage size range');
  });
});
