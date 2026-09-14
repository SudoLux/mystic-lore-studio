import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../src/pages/TechnicalStudio/MeasurementsWorkspace.tsx', import.meta.url), 'utf8');

describe('WP11T measurement workspace contract', () => {
  it('uses one graded spec sheet with a clear base-size column and a separate fit review', () => {
    expect(source).toContain("type Mode = 'spec' | 'fit'");
    expect(source).toContain("{size}{size === spec.baseSize ? ' · BASE' : ''}");
    expect(source).toContain('Sample actuals against approved spec');
    expect(source).toContain('sticky left-0');
  });

  it('keeps units as presentation, including apparel fractional-inch entry and output', () => {
    expect(source).toContain('Inches · Fractions');
    expect(source).toContain('Centimeters · Decimal');
    expect(source).toContain('parseDisplayMeasurement');
    expect(source).toContain('toFraction');
    expect(source).toContain('convertMeasurement');
  });

  it('moves CSV and checkpoint work out of the primary grid while preserving canonical pathways', () => {
    expect(source).toContain('Import measurements');
    expect(source).toContain('Save a new version');
    expect(source).toContain('compareMeasurementVersion');
    expect(source).toContain('restoreSelection');
  });
});
