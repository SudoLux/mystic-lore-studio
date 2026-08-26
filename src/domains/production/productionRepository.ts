import type {
  CanonicalConstructionDetail,
  CanonicalFactory,
  CanonicalFitIssue,
  CanonicalFitIssuePromotion,
  CanonicalFitMeasurement,
  CanonicalFitSession,
  CanonicalFitSessionMedia,
  CanonicalMediaAsset,
  CanonicalReleaseTask,
  CanonicalSampleRound,
  CanonicalSampleRoundMedia,
  CanonicalSupplier,
  CanonicalWorkspaceState,
  EvidenceCaptureStatus,
} from '../workspace';
import { normalizeWorkspace } from '../workspace';

type RecordMeta = { createdAt: string; id: string; revision: number; studioId: string; updatedAt: string };
export type PromotionInput = {
  constructionStepId?: string;
  issueId: string;
  note?: string;
  pomPointId?: string;
  task?: Pick<CanonicalReleaseTask, 'description' | 'priority' | 'title'>;
  type: CanonicalFitIssuePromotion['promotionType'];
};

export function createSupplier(state: CanonicalWorkspaceState, input: Pick<CanonicalSupplier, 'capabilities' | 'defaultLeadTimeDays' | 'minimumOrderQuantity' | 'name' | 'supplierType'>) {
  if (!input.name.trim()) throw new Error('Supplier name is required.');
  const supplier: CanonicalSupplier = { ...record(state.studioId), capabilities: input.capabilities, defaultLeadTimeDays: nonNegativeOrNull(input.defaultLeadTimeDays, 'Lead time'), minimumOrderQuantity: positiveOrNull(input.minimumOrderQuantity, 'Minimum order quantity'), name: input.name.trim(), status: 'active', supplierType: input.supplierType };
  return { supplier, state: normalizeWorkspace({ ...state, suppliers: [...state.suppliers, supplier] }) };
}

export function createFactory(state: CanonicalWorkspaceState, input: Pick<CanonicalFactory, 'capabilities' | 'leadTimeDays' | 'minimumOrderQuantity' | 'name' | 'supplierId'> & Partial<Pick<CanonicalFactory, 'contactEmail' | 'contactName' | 'phone'>>) {
  if (!input.name.trim()) throw new Error('Factory name is required.');
  if (input.supplierId && !state.suppliers.some((item) => item.id === input.supplierId)) throw new Error('Factory supplier must be in this studio.');
  const factory: CanonicalFactory = { ...record(state.studioId), capabilities: input.capabilities, contactEmail: cleanOrNull(input.contactEmail), contactName: cleanOrNull(input.contactName), leadTimeDays: nonNegativeOrNull(input.leadTimeDays, 'Lead time'), minimumOrderQuantity: positiveOrNull(input.minimumOrderQuantity, 'Minimum order quantity'), name: input.name.trim(), phone: cleanOrNull(input.phone), status: 'active', supplierId: input.supplierId ?? null };
  return { factory, state: normalizeWorkspace({ ...state, factories: [...state.factories, factory] }) };
}

export function createSampleRound(state: CanonicalWorkspaceState, input: { factoryId?: string | null; garmentId: string; garmentVersionId: string; notes?: string; sampleType: string }) {
  requireGarmentVersion(state, input.garmentId, input.garmentVersionId);
  if (input.factoryId && !state.factories.some((item) => item.id === input.factoryId)) throw new Error('Sample factory must be in this studio.');
  if (!input.sampleType.trim()) throw new Error('Sample type is required.');
  const roundNo = state.sampleRounds.filter((item) => item.garmentId === input.garmentId).reduce((largest, item) => Math.max(largest, item.roundNo), 0) + 1;
  const sample: CanonicalSampleRound = { ...record(state.studioId), factoryId: input.factoryId ?? null, garmentId: input.garmentId, garmentVersionId: input.garmentVersionId, notes: input.notes?.trim() ?? '', receivedAt: null, requestedAt: new Date().toISOString(), roundNo, sampleType: input.sampleType.trim(), status: 'requested' };
  return { sample, state: normalizeWorkspace({ ...state, sampleRounds: [...state.sampleRounds, sample] }) };
}

export function receiveSampleRound(state: CanonicalWorkspaceState, sampleRoundId: string) {
  const current = requireSample(state, sampleRoundId);
  const sample = touch({ ...current, receivedAt: new Date().toISOString(), status: 'received' as const });
  return { sample, state: normalizeWorkspace({ ...state, sampleRounds: replace(state.sampleRounds, sample) }) };
}

export function createFitSession(state: CanonicalWorkspaceState, input: { fitDate?: string; modelProfile?: Record<string, unknown>; sampleRoundId: string; summary?: string }) {
  const sample = requireSample(state, input.sampleRoundId);
  if (!sample.garmentVersionId) throw new Error('Pin the sample to a garment version before recording fit evidence.');
  const session: CanonicalFitSession = { ...record(state.studioId), decision: null, decisionNote: '', fitDate: input.fitDate ?? new Date().toISOString().slice(0, 10), garmentVersionId: sample.garmentVersionId, modelProfile: input.modelProfile ?? {}, sampleRoundId: sample.id, status: 'draft', summary: input.summary?.trim() ?? '' };
  return { session, state: normalizeWorkspace({ ...state, fitSessions: [...state.fitSessions, session] }) };
}

export function recordFitMeasurement(state: CanonicalWorkspaceState, input: { actual: number; expectedRevision?: number; fitSessionId: string; pomPointId: string; size: string }) {
  if (!Number.isFinite(input.actual) || input.actual < 0) throw new Error('Actual measurement must be a non-negative decimal.');
  const session = requireSession(state, input.fitSessionId); const sample = requireSample(state, session.sampleRoundId);
  const point = state.pomPoints.find((item) => item.id === input.pomPointId);
  const spec = point && state.technicalSpecs.find((item) => item.id === point.specId);
  if (!point || !spec || spec.garmentId !== sample.garmentId) throw new Error('Select a stable POM from this sampled garment.');
  const target = state.measurementValues.find((item) => item.pomPointId === point.id && item.size === input.size);
  if (!target) throw new Error(`No target exists for ${point.code} at size ${input.size}.`);
  const existing = state.fitMeasurements.find((item) => item.fitSessionId === session.id && item.pomPointId === point.id && item.size === input.size);
  if (existing && input.expectedRevision !== undefined && existing.revision !== input.expectedRevision) throw new Error('Fit actual changed elsewhere. Review the conflict before saving.');
  const measurement: CanonicalFitMeasurement = existing
    ? touch({ ...existing, actual: round4(input.actual), garmentVersionId: session.garmentVersionId, variance: round4(input.actual - target.target) })
    : { ...record(state.studioId), actual: round4(input.actual), fitSessionId: session.id, garmentVersionId: session.garmentVersionId, pomPointId: point.id, sampleRoundId: sample.id, size: input.size.trim(), variance: round4(input.actual - target.target) };
  return { measurement, state: normalizeWorkspace({ ...state, fitMeasurements: replace(state.fitMeasurements, measurement) }) };
}

export function createFitIssue(state: CanonicalWorkspaceState, input: { area: string; fitSessionId: string; observation: string; pomPointId?: string | null; severity: CanonicalFitIssue['severity'] }) {
  const session = requireSession(state, input.fitSessionId); const sample = requireSample(state, session.sampleRoundId);
  if (!input.area.trim() || !input.observation.trim()) throw new Error('Area and observed fit issue are required.');
  if (input.pomPointId) {
    const point = state.pomPoints.find((item) => item.id === input.pomPointId);
    const spec = point && state.technicalSpecs.find((item) => item.id === point.specId);
    if (!point || !spec || spec.garmentId !== sample.garmentId) throw new Error('Issue POM must belong to the sampled garment.');
  }
  const issue: CanonicalFitIssue = { ...record(state.studioId), area: input.area.trim(), fitSessionId: session.id, garmentVersionId: session.garmentVersionId, observation: input.observation.trim(), ownerTaskId: null, pomPointId: input.pomPointId ?? null, resolution: null, severity: input.severity, status: 'open' };
  return { issue, state: normalizeWorkspace({ ...state, fitIssues: [...state.fitIssues, issue] }) };
}

export function decideFitSession(state: CanonicalWorkspaceState, input: { decision: NonNullable<CanonicalFitSession['decision']>; note: string; sessionId: string }) {
  const current = requireSession(state, input.sessionId); const sample = requireSample(state, current.sampleRoundId);
  const session = touch({ ...current, decision: input.decision, decisionNote: input.note.trim(), status: 'decided' as const });
  const sampleStatus: CanonicalSampleRound['status'] = input.decision === 'approve' ? 'approved' : input.decision === 'reject' ? 'rejected' : 'reviewed';
  const updatedSample = touch({ ...sample, status: sampleStatus });
  return { session, state: normalizeWorkspace({ ...state, fitSessions: replace(state.fitSessions, session), sampleRounds: replace(state.sampleRounds, updatedSample) }) };
}

export function attachSampleEvidence(state: CanonicalWorkspaceState, input: { asset: CanonicalMediaAsset; captureStatus?: EvidenceCaptureStatus; sampleRoundId: string }) {
  requireSample(state, input.sampleRoundId);
  const evidence: CanonicalSampleRoundMedia = { ...record(state.studioId), assetId: input.asset.id, captureStatus: input.captureStatus ?? 'queued', capturedAt: new Date().toISOString(), retryCount: 0, role: 'sample', sampleRoundId: input.sampleRoundId, sortOrder: state.sampleRoundMedia.filter((item) => item.sampleRoundId === input.sampleRoundId).length };
  return { evidence, state: normalizeWorkspace({ ...state, mediaAssets: replace(state.mediaAssets, input.asset), sampleRoundMedia: [...state.sampleRoundMedia, evidence] }) };
}

export function attachFitEvidence(state: CanonicalWorkspaceState, input: { asset: CanonicalMediaAsset; captureStatus?: EvidenceCaptureStatus; fitSessionId: string; role?: CanonicalFitSessionMedia['role'] }) {
  requireSession(state, input.fitSessionId);
  const evidence: CanonicalFitSessionMedia = { ...record(state.studioId), assetId: input.asset.id, captureStatus: input.captureStatus ?? 'queued', capturedAt: new Date().toISOString(), fitSessionId: input.fitSessionId, retryCount: 0, role: input.role ?? 'fit', sortOrder: state.fitSessionMedia.filter((item) => item.fitSessionId === input.fitSessionId).length };
  return { evidence, state: normalizeWorkspace({ ...state, fitSessionMedia: [...state.fitSessionMedia, evidence], mediaAssets: replace(state.mediaAssets, input.asset) }) };
}

export function updateEvidenceCaptureStatus(state: CanonicalWorkspaceState, input: { evidenceId: string; status: EvidenceCaptureStatus; target: 'sample' | 'session' }) {
  const rows = input.target === 'sample' ? state.sampleRoundMedia : state.fitSessionMedia;
  const current = rows.find((item) => item.id === input.evidenceId);
  if (!current) throw new Error('Evidence record not found.');
  if (input.target === 'sample') {
    const next = touch({ ...(current as CanonicalSampleRoundMedia), captureStatus: input.status, retryCount: input.status === 'uploaded' ? current.retryCount + 1 : current.retryCount });
    return normalizeWorkspace({ ...state, sampleRoundMedia: replace(state.sampleRoundMedia, next) });
  }
  const next = touch({ ...(current as CanonicalFitSessionMedia), captureStatus: input.status, retryCount: input.status === 'uploaded' ? current.retryCount + 1 : current.retryCount });
  return normalizeWorkspace({ ...state, fitSessionMedia: replace(state.fitSessionMedia, next) });
}

export function promoteFitIssue(state: CanonicalWorkspaceState, actorId: string, input: PromotionInput) {
  const issue = state.fitIssues.find((item) => item.id === input.issueId); if (!issue) throw new Error('Fit issue not found.');
  const session = requireSession(state, issue.fitSessionId); const sample = requireSample(state, session.sampleRoundId);
  let next = state; let taskId: string | null = null; let pomPointId: string | null = null; let constructionDetailId: string | null = null;
  const note = input.note?.trim() ?? '';
  if (input.type === 'task') {
    if (!input.task?.title.trim()) throw new Error('Task title is required.');
    const task: CanonicalReleaseTask = { ...record(state.studioId), assigneeId: null, description: input.task.description?.trim() ?? issue.observation, dueAt: null, garmentId: sample.garmentId, priority: input.task.priority ?? 'high', sortOrder: state.releaseTasks.filter((item) => item.garmentId === sample.garmentId).length, status: 'todo', title: input.task.title.trim() };
    taskId = task.id; next = { ...next, releaseTasks: [...next.releaseTasks, task] };
  } else if (input.type === 'pom_adjustment_candidate') {
    pomPointId = input.pomPointId ?? issue.pomPointId;
    if (!pomPointId || !state.pomPoints.some((item) => item.id === pomPointId)) throw new Error('A stable POM is required for an adjustment candidate.');
  } else if (input.type === 'construction_callout') {
    const step = state.constructionSteps.find((item) => item.id === input.constructionStepId);
    if (!step) throw new Error('Choose a construction step for the callout.');
    const section = state.constructionSections.find((item) => item.id === step.sectionId); const spec = section && state.technicalSpecs.find((item) => item.id === section.specId);
    if (!spec || spec.garmentId !== sample.garmentId) throw new Error('Construction step must belong to the sampled garment.');
    const detail: CanonicalConstructionDetail = { ...record(state.studioId), anchor: null, assetId: null, callout: note || issue.observation, severity: issue.severity === 'critical' ? 'critical' : issue.severity === 'high' ? 'warning' : 'info', sortOrder: state.constructionDetails.filter((item) => item.stepId === step.id).length, status: 'open', stepId: step.id };
    constructionDetailId = detail.id; next = { ...next, constructionDetails: [...next.constructionDetails, detail] };
  }
  const promotion: CanonicalFitIssuePromotion = { ...record(state.studioId), candidate: { sourceSessionId: session.id, sourceSampleRoundId: sample.id }, constructionDetailId, createdBy: actorId, fitIssueId: issue.id, garmentId: sample.garmentId, garmentVersionId: issue.garmentVersionId, note, pomPointId, promotionType: input.type, resolvedAt: input.type === 'version_note' ? new Date().toISOString() : null, status: input.type === 'version_note' ? 'applied' : 'candidate', taskId };
  const updatedIssue = input.type === 'task' ? touch({ ...issue, ownerTaskId: taskId, status: 'planned' as const }) : issue;
  return { promotion, state: normalizeWorkspace({ ...next, fitIssuePromotions: [...next.fitIssuePromotions, promotion], fitIssues: replace(next.fitIssues, updatedIssue) }) };
}

function requireGarmentVersion(state: CanonicalWorkspaceState, garmentId: string, versionId: string) { if (!state.garmentVersions.some((item) => item.id === versionId && item.garmentId === garmentId)) throw new Error('Sample rounds must pin a Freeze Frame of this garment.'); }
function requireSample(state: CanonicalWorkspaceState, id: string) { const sample = state.sampleRounds.find((item) => item.id === id); if (!sample) throw new Error('Sample round not found.'); return sample; }
function requireSession(state: CanonicalWorkspaceState, id: string) { const session = state.fitSessions.find((item) => item.id === id); if (!session) throw new Error('Fit session not found.'); return session; }
function record(studioId: string): RecordMeta { const timestamp = new Date().toISOString(); return { createdAt: timestamp, id: crypto.randomUUID(), revision: 1, studioId, updatedAt: timestamp }; }
function touch<T extends RecordMeta>(value: T): T { return { ...value, revision: value.revision + 1, updatedAt: new Date().toISOString() }; }
function replace<T extends { id: string }>(rows: T[], next: T) { return [...rows.filter((item) => item.id !== next.id), next]; }
function round4(value: number) { return Math.round((value + Number.EPSILON) * 10000) / 10000; }
function cleanOrNull(value: string | null | undefined) { return value?.trim() || null; }
function nonNegativeOrNull(value: number | null | undefined, label: string) { if (value === null || value === undefined) return null; if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be a non-negative number.`); return value; }
function positiveOrNull(value: number | null | undefined, label: string) { if (value === null || value === undefined) return null; if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be greater than zero.`); return value; }
