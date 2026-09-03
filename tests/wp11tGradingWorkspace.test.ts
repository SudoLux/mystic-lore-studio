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
    expect(source).toContain('Manual conflicts');
    expect(source).toContain('Keep manual');
    expect(source).toContain('Use grade rule');
    expect(source).toContain('base set remains unchanged');
  });

  it('opens older technical specs safely before their size range is configured', () => {
    expect(source).toContain('Array.isArray(spec.sizeRange) && spec.sizeRange.length');
    expect(source).toContain("[spec.baseSize || 'M']");
    expect(source).toContain('Manage size range');
  });
});
