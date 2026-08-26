import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createFreezeFrame } from '../src/domains/versioning';
import {
  attachFitEvidence,
  createFactory,
  createFitIssue,
  createFitSession,
  createSampleRound,
  createSupplier,
  decideFitSession,
  promoteFitIssue,
  recordFitMeasurement,
  updateEvidenceCaptureStatus,
} from '../src/domains/production';
import { createCanonicalWorkspace, type CanonicalMediaAsset, type CanonicalWorkspaceState } from '../src/domains/workspace';
import { createMeasurementSet, createPomPoint, updatePomPoint, upsertMeasurementValue } from '../src/domains/technical';
import { importStudioData } from '../src/lib/studioStorage';

const fixtureText = readFileSync(new URL('./fixtures/legacy-studio-data-v5.json', import.meta.url), 'utf8');
const actorId = '10000000-0000-4000-8000-000000000111';
async function workspace() { return createCanonicalWorkspace({ data: importStudioData(fixtureText), ownerUserId: actorId }); }

describe('WP6 sourcing, sample, and fit provenance', () => {
  it('pins the sample and fit session to a garment Freeze Frame', async () => {
    const start = await workspace(); const garment = start.garments[0];
    const frozen = await createFreezeFrame(start, { actorId, expectedRevision: garment.revision, garmentId: garment.id, label: 'Fit source', scope: 'technical' });
    const supplier = createSupplier(frozen.state, { capabilities: { embroidery: true }, defaultLeadTimeDays: 21, minimumOrderQuantity: 40, name: 'Atelier One', supplierType: 'mixed' });
    const factory = createFactory(supplier.state, { capabilities: { cutAndSew: true }, leadTimeDays: 28, minimumOrderQuantity: 40, name: 'Factory One', supplierId: supplier.supplier.id });
    const round = createSampleRound(factory.state, { factoryId: factory.factory.id, garmentId: garment.id, garmentVersionId: frozen.version.id, sampleType: 'Proto' });
    const session = createFitSession(round.state, { sampleRoundId: round.sample.id });
    expect(round.sample.garmentVersionId).toBe(frozen.version.id);
    expect(session.session.garmentVersionId).toBe(frozen.version.id);
    expect(() => createSampleRound(session.state, { garmentId: garment.id, garmentVersionId: 'not-a-frame', sampleType: 'Bad' })).toThrow(/Freeze Frame/);
  });

  it('records actuals against a stable POM and refuses an unrelated point', async () => {
    const { state, session, garment } = await preparedFit();
    const spec = { ...record(state, 'spec-a'), baseSize: 'M', garmentId: garment.id, releaseValidationRunId: null, releaseVersionId: null, releasedAt: null, releasedBy: null, revisionLabel: 'A', status: 'draft' as const, unit: 'cm' as const };
    let next = { ...state, technicalSpecs: [...state.technicalSpecs, spec] };
    const pom = createPomPoint(next, { type: 'create_pom', specId: spec.id, code: 'P01', name: 'Chest', method: '1 cm below armhole', anchor: { x: .5, y: .3 } }); next = pom.state;
    const set = createMeasurementSet(next, spec.id, 'Base'); next = set.state;
    next = upsertMeasurementValue(next, { type: 'upsert_measurement', setId: set.set.id, pomPointId: pom.point.id, size: 'M', target: 56, toleranceMinus: 1, tolerancePlus: 1 }).state;
    const recorded = recordFitMeasurement(next, { actual: 57.25, fitSessionId: session.id, pomPointId: pom.point.id, size: 'M' });
    expect(recorded.measurement).toMatchObject({ fitSessionId: session.id, garmentVersionId: session.garmentVersionId, variance: 1.25 });
    expect(() => recordFitMeasurement(recorded.state, { actual: 10, fitSessionId: session.id, pomPointId: 'missing', size: 'M' })).toThrow(/stable POM/);
  });

  it('preserves source provenance when an issue is promoted to a task, candidate, callout, or version note', async () => {
    const { state, session, garment } = await preparedFit();
    const issue = createFitIssue(state, { area: 'Shoulder', fitSessionId: session.id, observation: 'Shoulder pitch pulls forward.', severity: 'high' });
    const task = promoteFitIssue(issue.state, actorId, { issueId: issue.issue.id, task: { description: issue.issue.observation, priority: 'high', title: 'Correct shoulder pitch' }, type: 'task' });
    const note = promoteFitIssue(task.state, actorId, { issueId: issue.issue.id, note: 'Carry into next design review.', type: 'version_note' });
    expect(task.promotion).toMatchObject({ garmentId: garment.id, garmentVersionId: session.garmentVersionId, promotionType: 'task', taskId: expect.any(String) });
    expect(note.promotion).toMatchObject({ fitIssueId: issue.issue.id, promotionType: 'version_note', status: 'applied' });
    expect(task.state.fitIssues.find((item) => item.id === issue.issue.id)?.ownerTaskId).toBe(task.promotion.taskId);
  });

  it('keeps offline evidence queued, retryable, and local to the source session', async () => {
    const { state, session } = await preparedFit();
    const asset: CanonicalMediaAsset = { ...record(state, 'asset-a'), checksum: 'a'.repeat(64), height: null, localBlobKey: 'production-evidence:asset-a', mimeType: 'image/jpeg', name: 'fit.jpg', rights: { source: 'private mobile fit capture' }, sizeBytes: 10, storagePath: `studios/${state.studioId}/samples/evidence/asset-a/fit.jpg`, storageState: 'queued', width: null };
    const attached = attachFitEvidence(state, { asset, captureStatus: 'queued', fitSessionId: session.id });
    const retried = updateEvidenceCaptureStatus(attached.state, { evidenceId: attached.evidence.id, status: 'uploaded', target: 'session' });
    expect(attached.evidence.captureStatus).toBe('queued');
    expect(retried.fitSessionMedia[0]).toMatchObject({ captureStatus: 'uploaded', fitSessionId: session.id, retryCount: 1 });
  });

  it('records decisions without expanding into costing, order, or QC commands', async () => {
    const { state, session } = await preparedFit();
    const decided = decideFitSession(state, { decision: 'revise', note: 'Increase bicep ease.', sessionId: session.id });
    expect(decided.session).toMatchObject({ decision: 'revise', status: 'decided' });
    expect(readFileSync(new URL('../src/domains/production/productionRepository.ts', import.meta.url), 'utf8')).not.toMatch(/costSheet|productionOrder|qcResult/i);
  });

  it('supports multiple rounds while keeping a changed POM reference and offline evidence stable', async () => {
    const { state, session, garment } = await preparedFit();
    const nextRound = createSampleRound(state, { garmentId: garment.id, garmentVersionId: session.garmentVersionId, sampleType: 'Revision' });
    expect(nextRound.sample.roundNo).toBe(2);
    const spec = { ...record(state, 'spec-b'), baseSize: 'M', garmentId: garment.id, releaseValidationRunId: null, releaseVersionId: null, releasedAt: null, releasedBy: null, revisionLabel: 'A', status: 'draft' as const, unit: 'cm' as const };
    let next = { ...state, technicalSpecs: [...state.technicalSpecs, spec] };
    const pom = createPomPoint(next, { type: 'create_pom', specId: spec.id, code: 'P02', name: 'Waist', method: 'At narrowest point', anchor: { x: .5, y: .5 } }); next = pom.state;
    const set = createMeasurementSet(next, spec.id, 'Base'); next = set.state;
    next = upsertMeasurementValue(next, { type: 'upsert_measurement', setId: set.set.id, pomPointId: pom.point.id, size: 'M', target: 44, toleranceMinus: 1, tolerancePlus: 1 }).state;
    const actual = recordFitMeasurement(next, { actual: 43, fitSessionId: session.id, pomPointId: pom.point.id, size: 'M' });
    const renamed = updatePomPoint(actual.state, pom.point.id, { name: 'High waist' });
    expect(renamed.fitMeasurements[0].pomPointId).toBe(pom.point.id);
    expect(() => recordFitMeasurement(actual.state, { actual: 42, expectedRevision: 99, fitSessionId: session.id, pomPointId: pom.point.id, size: 'M' })).toThrow(/conflict/);
    expect(JSON.parse(JSON.stringify(actual.state)).fitMeasurements[0].fitSessionId).toBe(session.id);
  });
});

async function preparedFit() {
  const start = await workspace(); const garment = start.garments[0];
  const frozen = await createFreezeFrame(start, { actorId, expectedRevision: garment.revision, garmentId: garment.id, label: 'Sampling source', scope: 'technical' });
  const round = createSampleRound(frozen.state, { garmentId: garment.id, garmentVersionId: frozen.version.id, sampleType: 'Proto' });
  const fit = createFitSession(round.state, { sampleRoundId: round.sample.id });
  return { garment, session: fit.session, state: fit.state };
}

function record(state: CanonicalWorkspaceState, id: string) { const now = '2026-08-26T12:00:00.000Z'; return { createdAt: now, id, revision: 1, studioId: state.studioId, updatedAt: now }; }
