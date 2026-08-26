import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  applyMeasurementCsv,
  commitGradePreview,
  compareMeasurementVersion,
  convertMeasurement,
  createGradeRule,
  createMeasurementSet,
  createPomPoint,
  createSampleRound,
  createSpec,
  createTechnicalCheckpoint,
  measurementWithinTolerance,
  parseMeasurementCsv,
  previewGradeRule,
  recordFitActual,
  restoreMeasurementSelection,
  upsertMeasurementValue,
  validateMeasurementSet,
} from '../src/domains/technical';
import { createCanonicalWorkspace } from '../src/domains/workspace';
import { importStudioData } from '../src/lib/studioStorage';

const fixtureText = readFileSync(new URL('./fixtures/legacy-studio-data-v5.json', import.meta.url), 'utf8');
async function technicalWorkspace() {
  const migrated = await createCanonicalWorkspace({ data: importStudioData(fixtureText), ownerUserId: '10000000-0000-4000-8000-000000000111' });
  const spec = createSpec(migrated, migrated.garments[0].id, 'M', 'cm');
  return { state: spec.state, spec: spec.spec, garment: migrated.garments[0] };
}

describe('WP4 POM, measurement, fit, and grading domain', () => {
  it('hydrates migrated workspaces with typed empty technical collections', async () => {
    const { state } = await technicalWorkspace();
    expect(state.schemaVersion).toBe(8);
    expect(state.pomPoints).toEqual([]);
    expect(state.measurementSets).toEqual([]);
    expect(state.fitMeasurements).toEqual([]);
  });

  it('converts canonical units without drift and supports four decimal precision', () => {
    expect(convertMeasurement(2.54, 'cm', 'in')).toBe(1);
    expect(convertMeasurement(1, 'in', 'mm')).toBe(25.4);
    expect(convertMeasurement(convertMeasurement(12.3456, 'cm', 'in'), 'in', 'cm')).toBeCloseTo(12.3456, 3);
  });

  it('treats plus and minus tolerance boundaries as passing', () => {
    expect(measurementWithinTolerance(10.5, 10, 0.5, 0.25)).toEqual({ variance: 0.5, status: 'pass' });
    expect(measurementWithinTolerance(9.75, 10, 0.5, 0.25)).toEqual({ variance: -0.25, status: 'pass' });
    expect(measurementWithinTolerance(9.7499, 10, 0.5, 0.25).status).toBe('low');
  });

  it('keeps one stable POM identity across targets and sample actuals', async () => {
    const start = await technicalWorkspace();
    const pom = createPomPoint(start.state, { type: 'create_pom', specId: start.spec.id, code: 'CBL', name: 'Center-back length', method: 'Neck seam to hem', anchor: { x: .5, y: .38 } });
    const set = createMeasurementSet(pom.state, start.spec.id, 'Base', 'base');
    const target = upsertMeasurementValue(set.state, { type: 'upsert_measurement', setId: set.set.id, pomPointId: pom.point.id, size: 'M', target: 72.25, tolerancePlus: .5, toleranceMinus: .25 });
    expect(validateMeasurementSet(target.state, set.set.id)).toEqual([]);
    const sample = createSampleRound(target.state, start.garment.id, 'Proto 1');
    const actual = recordFitActual(sample.state, { type: 'record_fit_actual', sampleRoundId: sample.sampleRound.id, setId: set.set.id, pomPointId: pom.point.id, size: 'M', actual: 72.75 });
    expect(actual.fit.variance).toBe(.5);
    expect(actual.state.fitMeasurements[0].pomPointId).toBe(pom.point.id);
    expect(actual.state.pomPoints).toHaveLength(1);
  });

  it('previews grade deltas in both directions and commits a separate set', async () => {
    const start = await technicalWorkspace();
    const pom = createPomPoint(start.state, { type: 'create_pom', specId: start.spec.id, code: 'CH', name: 'Chest', method: 'One inch below armhole', anchor: { x: .5, y: .25 } });
    const set = createMeasurementSet(pom.state, start.spec.id, 'Base', 'base');
    const target = upsertMeasurementValue(set.state, { type: 'upsert_measurement', setId: set.set.id, pomPointId: pom.point.id, size: 'M', target: 56, tolerancePlus: .5, toleranceMinus: .5 });
    const rule = createGradeRule(target.state, { type: 'create_grade_rule', specId: start.spec.id, name: 'Alpha', sizeRange: ['S', 'M', 'L'], values: [{ pomPointId: pom.point.id, fromSize: 'S', toSize: 'M', delta: 2 }, { pomPointId: pom.point.id, fromSize: 'M', toSize: 'L', delta: 2 }] });
    const preview = previewGradeRule(rule.state, set.set.id, rule.rule.id);
    expect(preview.warnings).toEqual([]);
    expect(preview.rows.map((row) => [row.size, row.target])).toEqual([['S', 54], ['M', 56], ['L', 58]]);
    const committed = commitGradePreview(rule.state, set.set.id, rule.rule.id, 'Graded Alpha');
    expect(committed.state.measurementSets).toHaveLength(2);
    expect(committed.state.measurementValues.find((item) => item.setId === set.set.id)?.target).toBe(56);
  });

  it('rejects malformed, over-precise, duplicate, and negative CSV rows without partial mutation', async () => {
    const start = await technicalWorkspace(); const set = createMeasurementSet(start.state, start.spec.id, 'Base', 'base');
    const malformed = 'code,name,method,x,y,size,target,tolerance_plus,tolerance_minus\nCBL,"Length,Neck to hem,0.5,0.4,M,72.12345,0.5,-0.2';
    const parsed = parseMeasurementCsv(malformed);
    expect(parsed.errors.map((error) => error.message).join(' ')).toMatch(/Unclosed|four decimal|non-negative/);
    const applied = applyMeasurementCsv(set.state, start.spec.id, set.set.id, malformed);
    expect(applied.state.pomPoints).toEqual([]);
    expect(applied.state.measurementValues).toEqual([]);
  });

  it('imports valid quoted CSV and preserves existing POM identity', async () => {
    const start = await technicalWorkspace(); const set = createMeasurementSet(start.state, start.spec.id, 'Base', 'base');
    const csv = 'code,name,method,x,y,size,target,tolerance_plus,tolerance_minus\nCBL,"Center, back length","Neck seam, straight to hem",0.5,0.4,M,72.2500,0.5,0.25';
    const applied = applyMeasurementCsv(set.state, start.spec.id, set.set.id, csv);
    expect(applied.errors).toEqual([]);
    expect(applied.state.pomPoints[0]).toMatchObject({ code: 'CBL', name: 'Center, back length' });
    expect(applied.state.measurementValues[0].target).toBe(72.25);
  });

  it('compares and selectively restores rows while retaining later sample evidence', async () => {
    const start = await technicalWorkspace();
    const pom = createPomPoint(start.state, { type: 'create_pom', specId: start.spec.id, code: 'SL', name: 'Sleeve length', method: 'Shoulder to cuff', anchor: { x: .25, y: .32 } });
    const set = createMeasurementSet(pom.state, start.spec.id, 'Base', 'base');
    const target = upsertMeasurementValue(set.state, { type: 'upsert_measurement', setId: set.set.id, pomPointId: pom.point.id, size: 'M', target: 64, tolerancePlus: .4, toleranceMinus: .4 });
    const frozen = await createTechnicalCheckpoint(target.state, start.spec.id);
    const edited = upsertMeasurementValue(frozen.state, { type: 'upsert_measurement', setId: set.set.id, pomPointId: pom.point.id, size: 'M', target: 66, tolerancePlus: .4, toleranceMinus: .4 });
    const sample = createSampleRound(edited.state, start.garment.id, 'Proto 1');
    const withActual = recordFitActual(sample.state, { type: 'record_fit_actual', sampleRoundId: sample.sampleRound.id, setId: set.set.id, pomPointId: pom.point.id, size: 'M', actual: 65 });
    const diffs = compareMeasurementVersion(withActual.state, frozen.version.id, start.spec.id);
    const measurementDiff = diffs.find((item) => item.entity === 'measurement')!;
    const restored = restoreMeasurementSelection(withActual.state, frozen.version.id, crypto.randomUUID(), start.spec.id, { pomPointIds: [], measurementKeys: [measurementDiff.key] }, 'Restore sleeve target');
    expect(restored.state.measurementValues.find((item) => item.pomPointId === pom.point.id)?.target).toBe(64);
    expect(restored.state.fitMeasurements).toEqual(withActual.state.fitMeasurements);
    expect(restored.state.restoreOperations).toHaveLength(1);
  });
});
