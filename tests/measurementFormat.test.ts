import { describe, expect, it } from 'vitest';
import { convertMeasurement } from '../src/domains/technical';
import { formatInchesFraction, formatMeasurementValue, formatToleranceMagnitude, parseMeasurementInput, parseDisplayMeasurement } from '../src/lib/measurementFormat';

describe('measurement display and entry formatting', () => {
  it('renders apparel fractions with typographic glyphs', () => {
    expect(formatInchesFraction(12.5)).toBe('12 ½');
    expect(formatInchesFraction(12.375)).toBe('12 ⅜');
    expect(formatInchesFraction(12.125)).toBe('12 ⅛');
    expect(formatInchesFraction(12.0625)).toBe('12 ¹⁄₁₆');
  });

  it('parses practical fraction, decimal, and glyph entry forms', () => {
    expect(parseMeasurementInput('12')).toBe(12);
    expect(parseMeasurementInput('12.50')).toBe(12.5);
    expect(parseMeasurementInput('12 1/2')).toBe(12.5);
    expect(parseMeasurementInput('12½')).toBe(12.5);
    expect(parseMeasurementInput('12 3/8')).toBe(12.375);
    expect(parseMeasurementInput('3/8')).toBe(0.375);
    expect(parseMeasurementInput('⅜')).toBe(0.375);
    expect(parseMeasurementInput('.375')).toBe(0.375);
    expect(parseMeasurementInput('twelve')).toBeNull();
    expect(parseMeasurementInput('3/0')).toBeNull();
  });

  it('keeps the canonical physical value stable while formats change', () => {
    const canonicalCm = 31.75;
    expect(formatMeasurementValue(canonicalCm, 'cm', 'in-fractions')).toBe('12 ½');
    expect(formatMeasurementValue(canonicalCm, 'cm', 'in-decimal')).toBe('12.5');
    expect(formatMeasurementValue(canonicalCm, 'cm', 'cm')).toBe('31.75');
    expect(parseDisplayMeasurement('12 ½', 'cm', 'in-fractions')).toBe(31.75);
    expect(parseDisplayMeasurement('31.75', 'cm', 'cm')).toBe(31.75);
    expect(formatMeasurementValue(convertMeasurement(canonicalCm, 'cm', 'in'), 'in', 'in-fractions')).toBe('12 ½');
  });

  it('uses the same conversion engine for tolerances', () => {
    expect(formatToleranceMagnitude(0.125, 'in', 'in-fractions')).toBe('±⅛');
    expect(formatToleranceMagnitude(0.125, 'in', 'in-decimal')).toBe('±0.125');
    expect(formatToleranceMagnitude(0.125, 'in', 'cm')).toBe('±0.3175');
  });
});
