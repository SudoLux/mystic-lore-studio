import { convertMeasurement, type MeasurementUnit } from '../domains/technical';

/**
 * Measurements are persisted as one numeric value in the technical spec's unit.
 * This module only converts that number at the display boundary; it never writes a
 * formatted value back to the canonical record.
 */
export type MeasurementDisplayFormat = 'in-fractions' | 'in-decimal' | 'cm' | 'mm';

const FRACTION_GLYPHS: Record<string, string> = {
  '1/2': '½', '1/3': '⅓', '2/3': '⅔', '1/4': '¼', '3/4': '¾',
  '1/5': '⅕', '2/5': '⅖', '3/5': '⅗', '4/5': '⅘',
  '1/6': '⅙', '5/6': '⅚', '1/8': '⅛', '3/8': '⅜', '5/8': '⅝', '7/8': '⅞',
};

const SUPERSCRIPTS: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
const SUBSCRIPTS: Record<string, string> = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };
const UNICODE_FRACTIONS: Record<string, string> = Object.fromEntries(Object.entries(FRACTION_GLYPHS).map(([fraction, glyph]) => [glyph, fraction]));

export const FRACTION_STEPS = [0, 1 / 8, 1 / 4, 3 / 8, 1 / 2, 5 / 8, 3 / 4, 7 / 8] as const;

export function displayUnit(format: MeasurementDisplayFormat): MeasurementUnit {
  if (format === 'cm') return 'cm';
  if (format === 'mm') return 'mm';
  return 'in';
}

export function formatMeasurementValue(value: number, canonicalUnit: MeasurementUnit, format: MeasurementDisplayFormat) {
  const displayed = convertMeasurement(value, canonicalUnit, displayUnit(format));
  if (format === 'in-fractions') return formatInchesFraction(displayed);
  return formatDecimal(displayed, format === 'mm' ? 3 : 4);
}

export function formatMeasurementWithUnit(value: number, canonicalUnit: MeasurementUnit, format: MeasurementDisplayFormat) {
  const label = formatMeasurementValue(value, canonicalUnit, format);
  return format.startsWith('in-') ? `${label}″` : `${label} ${format}`;
}

export function formatToleranceMagnitude(value: number, canonicalUnit: MeasurementUnit, format: MeasurementDisplayFormat) {
  return `±${formatMeasurementValue(value, canonicalUnit, format)}`;
}

export function measurementAccessibleText(value: number, canonicalUnit: MeasurementUnit, format: MeasurementDisplayFormat) {
  const displayed = convertMeasurement(value, canonicalUnit, displayUnit(format));
  if (format !== 'in-fractions') return `${formatDecimal(displayed, format === 'mm' ? 3 : 4)} ${format === 'in-decimal' ? 'inches' : format}`;
  const sign = displayed < 0 ? 'negative ' : '';
  const absolute = Math.abs(displayed);
  const whole = Math.floor(absolute + 1e-8);
  const sixteenths = Math.round((absolute - whole) * 16);
  const adjustedWhole = whole + (sixteenths === 16 ? 1 : 0);
  const remainder = sixteenths === 16 ? 0 : sixteenths;
  if (!remainder) return `${sign}${adjustedWhole} inches`;
  const divisor = remainder % 8 === 0 ? 2 : remainder % 4 === 0 ? 4 : remainder % 2 === 0 ? 8 : 16;
  const numerator = remainder / (16 / divisor);
  const fractionWords: Record<string, string> = {
    '1/2': 'one-half', '1/4': 'one-quarter', '3/4': 'three-quarters', '1/8': 'one-eighth', '3/8': 'three-eighths',
    '5/8': 'five-eighths', '7/8': 'seven-eighths', '1/16': 'one-sixteenth', '3/16': 'three-sixteenths',
    '5/16': 'five-sixteenths', '7/16': 'seven-sixteenths', '9/16': 'nine-sixteenths', '11/16': 'eleven-sixteenths',
    '13/16': 'thirteen-sixteenths', '15/16': 'fifteen-sixteenths',
  };
  const fraction = fractionWords[`${numerator}/${divisor}`] ?? `${numerator} ${divisor}ths`;
  return `${sign}${adjustedWhole ? `${adjustedWhole} and ` : ''}${fraction} inches`;
}

export function formatInchesFraction(value: number) {
  const sign = value < 0 ? '−' : '';
  const absolute = Math.abs(value);
  const whole = Math.floor(absolute + 1e-8);
  const sixteenths = Math.round((absolute - whole) * 16);
  const adjustedWhole = whole + (sixteenths === 16 ? 1 : 0);
  const remainder = sixteenths === 16 ? 0 : sixteenths;
  if (!remainder) return `${sign}${adjustedWhole}`;
  const divisor = remainder % 8 === 0 ? 2 : remainder % 4 === 0 ? 4 : remainder % 2 === 0 ? 8 : 16;
  const numerator = remainder / (16 / divisor);
  return `${sign}${adjustedWhole ? `${adjustedWhole} ` : ''}${formatFraction(numerator, divisor)}`;
}

export function parseMeasurementInput(input: string): number | null {
  let normalized = input.trim()
    .replace(/[″”]/g, '')
    .replace(/\b(inches?|in|cm|mm)\b/gi, '')
    .replace(/−/g, '-')
    .replace(/\s+/g, ' ');
  if (!normalized) return null;
  for (const [glyph, fraction] of Object.entries(UNICODE_FRACTIONS)) normalized = normalized.replaceAll(glyph, ` ${fraction}`);
  normalized = normalized.replace(/([⁰¹²³⁴⁵⁶⁷⁸⁹]+)\s*[⁄/]\s*([₀₁₂₃₄₅₆₇₈₉]+)/g, (_, numerator, denominator) => ` ${fromSuperscript(numerator)}/${fromSubscript(denominator)}`);
  normalized = normalized.trim().replace(/\s+/g, ' ');
  const mixed = normalized.match(/^([+-]?(?:\d+(?:\.\d+)?|\.\d+))?\s*(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const whole = Number(mixed[1] || 0);
    const numerator = Number(mixed[2]);
    const denominator = Number(mixed[3]);
    if (!Number.isFinite(whole) || !Number.isInteger(numerator) || !Number.isInteger(denominator) || denominator <= 0 || numerator < 0) return null;
    const fraction = numerator / denominator;
    return Number.isFinite(fraction) ? whole < 0 ? whole - fraction : whole + fraction : null;
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function parseDisplayMeasurement(input: string, canonicalUnit: MeasurementUnit, format: MeasurementDisplayFormat) {
  const parsed = parseMeasurementInput(input);
  if (parsed === null || parsed < 0) return null;
  return convertMeasurement(parsed, displayUnit(format), canonicalUnit);
}

export function adjustMeasurementValue(value: number | undefined, canonicalUnit: MeasurementUnit, direction: 1 | -1) {
  const current = value ?? 0;
  const eighthInCanonical = convertMeasurement(1 / 8, 'in', canonicalUnit);
  return Math.max(0, Math.round((current + direction * eighthInCanonical) * 10000) / 10000);
}

function formatFraction(numerator: number, denominator: number) {
  const glyph = FRACTION_GLYPHS[`${numerator}/${denominator}`];
  if (glyph) return glyph;
  return `${[...String(numerator)].map((digit) => SUPERSCRIPTS[digit]).join('')}⁄${[...String(denominator)].map((digit) => SUBSCRIPTS[digit]).join('')}`;
}

function fromSuperscript(value: string) {
  return [...value].map((digit) => Object.entries(SUPERSCRIPTS).find(([, glyph]) => glyph === digit)?.[0] ?? '').join('');
}

function fromSubscript(value: string) {
  return [...value].map((digit) => Object.entries(SUBSCRIPTS).find(([, glyph]) => glyph === digit)?.[0] ?? '').join('');
}

function formatDecimal(value: number, precision: number) {
  return value.toFixed(precision).replace(/\.?0+$/, '');
}
