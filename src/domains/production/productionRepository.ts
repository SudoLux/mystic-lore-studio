import type {
  CanonicalConstructionDetail,
  CanonicalCostItem,
  CanonicalCostSheet,
  CanonicalFactory,
  CanonicalFitIssue,
  CanonicalFitIssuePromotion,
  CanonicalFitMeasurement,
  CanonicalFitSession,
  CanonicalFitSessionMedia,
  CanonicalMediaAsset,
  CanonicalProductionMilestone,
  CanonicalProductionOrder,
  CanonicalQcInspection,
  CanonicalQcResult,
  CanonicalQcTemplate,
  CanonicalQcTemplateCheck,
  CanonicalQcWaiver,
  CanonicalReleaseTask,
  CanonicalSampleRound,
  CanonicalSampleRoundMedia,
  CanonicalSupplier,
  CanonicalWorkspaceState,
  EvidenceCaptureStatus,
  ProductionTimelineEvent,
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

export function calculateCostScenario(items: CanonicalCostItem[], quantityBasis: number, wholesaleUnitPrice: number) {
  if (!Number.isInteger(quantityBasis) || quantityBasis <= 0) throw new Error('Quantity scenario must be a positive whole number.');
  if (!Number.isFinite(wholesaleUnitPrice) || wholesaleUnitPrice < 0) throw new Error('Wholesale price must be a non-negative amount.');
  const calculatedTotal = round4(items.reduce((sum, item) => sum + item.total * (item.basis === 'per_unit' ? quantityBasis : 1), 0));
  const cogsPerUnit = round4(calculatedTotal / quantityBasis);
  const marginPercent = wholesaleUnitPrice > 0 ? round4(((wholesaleUnitPrice - cogsPerUnit) / wholesaleUnitPrice) * 100) : 0;
  return { calculatedTotal, cogsPerUnit, marginPercent, wholesaleUnitPrice: round4(wholesaleUnitPrice) };
}

export function createCostSheet(state: CanonicalWorkspaceState, input: { currency: string; garmentId: string; garmentVersionId: string; name: string; quantityBasis: number; wholesaleUnitPrice: number }) {
  requireReleasedVersion(state, input.garmentId, input.garmentVersionId);
  const currency = requireCurrency(input.currency);
  if (!input.name.trim()) throw new Error('Cost sheet name is required.');
  const totals = calculateCostScenario([], input.quantityBasis, input.wholesaleUnitPrice);
  const costSheet: CanonicalCostSheet = { ...record(state.studioId), approvedAt: null, approvedBy: null, currency, garmentId: input.garmentId, garmentVersionId: input.garmentVersionId, name: input.name.trim(), quantityBasis: input.quantityBasis, status: 'draft', ...totals };
  return { costSheet, state: normalizeWorkspace({ ...state, costSheets: [...state.costSheets, costSheet] }) };
}

export function addCostItem(state: CanonicalWorkspaceState, input: { basis: CanonicalCostItem['basis']; bomItemId?: string | null; category: CanonicalCostItem['category']; componentVariantId?: string | null; costSheetId: string; description: string; materialVariantId?: string | null; quantity: number; unitCost: number; wastePercent?: number }) {
  const sheet = requireCostSheet(state, input.costSheetId);
  if (sheet.status !== 'draft') throw new Error('Approved cost sheets are immutable; create a new scenario instead.');
  if (!input.description.trim()) throw new Error('Cost item description is required.');
  for (const [label, value] of [['Quantity', input.quantity], ['Unit cost', input.unitCost], ['Waste', input.wastePercent ?? 0]] as const) if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be a non-negative number.`);
  const wastePercent = round4(input.wastePercent ?? 0); if (wastePercent > 100) throw new Error('Waste cannot exceed 100%.');
  if (input.bomItemId && !state.bomItems.some((item) => item.id === input.bomItemId)) throw new Error('Linked BOM row must be in this studio.');
  if (input.materialVariantId && !state.materialVariants.some((item) => item.id === input.materialVariantId)) throw new Error('Material variant must be in this studio.');
  if (input.componentVariantId && !state.componentVariants.some((item) => item.id === input.componentVariantId)) throw new Error('Component variant must be in this studio.');
  const total = round4(input.quantity * input.unitCost * (1 + wastePercent / 100));
  const item: CanonicalCostItem = { ...record(state.studioId), basis: input.basis, bomItemId: input.bomItemId ?? null, category: input.category, componentVariantId: input.componentVariantId ?? null, costSheetId: sheet.id, currency: sheet.currency, description: input.description.trim(), materialVariantId: input.materialVariantId ?? null, quantity: round4(input.quantity), sortOrder: state.costItems.filter((row) => row.costSheetId === sheet.id).length, total, unitCost: round4(input.unitCost), wastePercent };
  const costItems = [...state.costItems, item];
  const nextSheet = recalculateSheet(sheet, costItems);
  return { costSheet: nextSheet, item, state: normalizeWorkspace({ ...state, costItems, costSheets: replace(state.costSheets, nextSheet) }) };
}

export function setCostSheetScenario(state: CanonicalWorkspaceState, costSheetId: string, quantityBasis: number, wholesaleUnitPrice: number) {
  const current = requireCostSheet(state, costSheetId); if (current.status !== 'draft') throw new Error('Approved cost sheets are immutable; create a new scenario instead.');
  const totals = calculateCostScenario(state.costItems.filter((item) => item.costSheetId === current.id), quantityBasis, wholesaleUnitPrice);
  const costSheet = touch({ ...current, quantityBasis, ...totals });
  return { costSheet, state: normalizeWorkspace({ ...state, costSheets: replace(state.costSheets, costSheet) }) };
}

export function approveCostSheet(state: CanonicalWorkspaceState, actorId: string, costSheetId: string) {
  const current = requireCostSheet(state, costSheetId); const items = state.costItems.filter((item) => item.costSheetId === current.id);
  if (!items.length || current.calculatedTotal <= 0 || current.cogsPerUnit <= 0) throw new Error('A cost sheet needs valid cost items before approval.');
  if (current.wholesaleUnitPrice <= 0 || current.marginPercent < 0 || current.marginPercent > 100) throw new Error('Wholesale and margin totals are invalid.');
  const costSheet = touch({ ...current, approvedAt: new Date().toISOString(), approvedBy: actorId, status: 'approved' as const });
  return { costSheet, state: normalizeWorkspace({ ...state, costSheets: replace(state.costSheets, costSheet) }) };
}

export function createProductionOrder(state: CanonicalWorkspaceState, actorId: string, input: { costSheetId: string; factoryId: string; garmentId: string; garmentVersionId: string; orderCode: string; quantity: number; targetDeliveryDate?: string | null; targetShipDate?: string | null; targetStartDate?: string | null }) {
  requireReleasedVersion(state, input.garmentId, input.garmentVersionId);
  const costSheet = requireCostSheet(state, input.costSheetId); if (costSheet.status !== 'approved' || costSheet.garmentVersionId !== input.garmentVersionId) throw new Error('Production orders require an approved cost sheet for the same released version.');
  if (!state.factories.some((item) => item.id === input.factoryId && item.status === 'active')) throw new Error('Production factory must be active in this studio.');
  const orderCode = input.orderCode.trim().toUpperCase(); if (!/^[A-Z0-9][A-Z0-9._-]{1,63}$/.test(orderCode)) throw new Error('Order code must be 2–64 letters, numbers, dots, underscores, or hyphens.');
  if (state.productionOrders.some((item) => item.orderCode === orderCode)) throw new Error('Order code already exists.');
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) throw new Error('Order quantity must be a positive whole number.');
  const productionOrder: CanonicalProductionOrder = { ...record(state.studioId), approvedAt: new Date().toISOString(), approvedBy: actorId, costSheetId: costSheet.id, factoryId: input.factoryId, garmentId: input.garmentId, garmentVersionId: input.garmentVersionId, orderCode, placedAt: null, quantity: input.quantity, status: 'approved', targetDeliveryDate: input.targetDeliveryDate ?? null, targetShipDate: input.targetShipDate ?? null, targetStartDate: input.targetStartDate ?? null };
  return { productionOrder, state: normalizeWorkspace({ ...state, productionOrders: [...state.productionOrders, productionOrder] }) };
}

export function addProductionMilestone(state: CanonicalWorkspaceState, input: { name: string; ownerId?: string | null; productionOrderId: string; targetDate?: string | null }) {
  requireProductionOrder(state, input.productionOrderId); if (!input.name.trim()) throw new Error('Milestone name is required.');
  const milestone: CanonicalProductionMilestone = { ...record(state.studioId), completedAt: null, name: input.name.trim(), ownerId: input.ownerId ?? null, productionOrderId: input.productionOrderId, sortOrder: state.productionMilestones.filter((item) => item.productionOrderId === input.productionOrderId).length, status: 'pending', targetDate: input.targetDate ?? null };
  return { milestone, state: normalizeWorkspace({ ...state, productionMilestones: [...state.productionMilestones, milestone] }) };
}

export function updateProductionOrderStatus(state: CanonicalWorkspaceState, productionOrderId: string, status: CanonicalProductionOrder['status']) {
  const current = requireProductionOrder(state, productionOrderId);
  const transitions: Record<CanonicalProductionOrder['status'], CanonicalProductionOrder['status'][]> = { approved: ['placed', 'cancelled'], cancelled: [], closed: [], draft: ['approved', 'cancelled'], in_production: ['shipped', 'cancelled'], placed: ['in_production', 'cancelled'], received: ['closed'], shipped: ['received'] };
  if (!transitions[current.status].includes(status)) throw new Error(`Order cannot move from ${current.status} to ${status}.`);
  const productionOrder = touch({ ...current, placedAt: status === 'placed' && !current.placedAt ? new Date().toISOString() : current.placedAt, status });
  return { productionOrder, state: normalizeWorkspace({ ...state, productionOrders: replace(state.productionOrders, productionOrder) }) };
}

export function updateProductionMilestone(state: CanonicalWorkspaceState, milestoneId: string, status: CanonicalProductionMilestone['status']) {
  const current = state.productionMilestones.find((item) => item.id === milestoneId); if (!current) throw new Error('Production milestone not found.');
  const milestone = touch({ ...current, completedAt: status === 'complete' ? new Date().toISOString() : null, status });
  return { milestone, state: normalizeWorkspace({ ...state, productionMilestones: replace(state.productionMilestones, milestone) }) };
}

export function isProductionOrderStale(state: CanonicalWorkspaceState, productionOrderId: string) {
  const order = requireProductionOrder(state, productionOrderId);
  const newest = state.garmentVersions.filter((item) => item.garmentId === order.garmentId).sort((a, b) => b.versionNo - a.versionNo)[0];
  return Boolean(newest && newest.id !== order.garmentVersionId);
}

export function createQcTemplate(state: CanonicalWorkspaceState, input: { checks: Array<{ checkCode: string; description?: string; method?: string; name: string; required?: boolean; severity: CanonicalQcTemplateCheck['severity'] }>; name: string }) {
  if (!input.name.trim() || !input.checks.length) throw new Error('QC template name and at least one check are required.');
  const version = Math.max(0, ...state.qcTemplates.filter((item) => item.name.toLowerCase() === input.name.trim().toLowerCase()).map((item) => item.version)) + 1;
  const template: CanonicalQcTemplate = { ...record(state.studioId), name: input.name.trim(), status: 'active', version };
  const checks = input.checks.map((inputCheck, sortOrder): CanonicalQcTemplateCheck => { const checkCode = inputCheck.checkCode.trim().toUpperCase(); if (!/^[A-Z0-9][A-Z0-9._-]{1,63}$/.test(checkCode) || !inputCheck.name.trim()) throw new Error('Every QC check needs a valid code and name.'); return { ...record(state.studioId), checkCode, description: inputCheck.description?.trim() ?? '', method: inputCheck.method?.trim() ?? '', name: inputCheck.name.trim(), required: inputCheck.required ?? true, severity: inputCheck.severity, sortOrder, templateId: template.id }; });
  if (new Set(checks.map((item) => item.checkCode)).size !== checks.length) throw new Error('QC check codes must be unique within a template.');
  return { checks, state: normalizeWorkspace({ ...state, qcTemplateChecks: [...state.qcTemplateChecks, ...checks], qcTemplates: [...state.qcTemplates, template] }), template };
}

export function startQcInspection(state: CanonicalWorkspaceState, input: { productionOrderId: string; templateId: string }) {
  const order = requireProductionOrder(state, input.productionOrderId); const template = state.qcTemplates.find((item) => item.id === input.templateId && item.status === 'active');
  if (!template) throw new Error('Choose an active QC template.');
  const checks = state.qcTemplateChecks.filter((item) => item.templateId === template.id); if (!checks.length) throw new Error('QC template has no checks.');
  const inspection: CanonicalQcInspection = { ...record(state.studioId), decidedAt: null, decidedBy: null, garmentVersionId: order.garmentVersionId, inspectedAt: null, inspectedBy: null, productionOrderId: order.id, releaseDecision: 'pending', status: 'draft', templateId: template.id, templateVersion: template.version };
  const results = checks.map((check): CanonicalQcResult => ({ ...record(state.studioId), checkCode: check.checkCode, evidenceAssetId: null, inspectionId: inspection.id, issueTaskId: null, notes: '', productionOrderId: order.id, result: 'pending', severity: check.severity, templateCheckId: check.id }));
  return { inspection, results, state: normalizeWorkspace({ ...state, qcInspections: [...state.qcInspections, inspection], qcResults: [...state.qcResults, ...results] }) };
}

export function recordQcResult(state: CanonicalWorkspaceState, actorId: string, input: { evidenceAssetId?: string | null; notes?: string; qcResultId: string; result: Exclude<CanonicalQcResult['result'], 'pending' | 'waived'> }) {
  const current = requireQcResult(state, input.qcResultId); const inspection = requireInspection(state, current.inspectionId);
  if (inspection.status === 'decided') throw new Error('A decided inspection cannot be edited.');
  if (input.evidenceAssetId && !state.mediaAssets.some((item) => item.id === input.evidenceAssetId)) throw new Error('QC evidence must be a private Studio asset.');
  const qcResult = touch({ ...current, evidenceAssetId: input.evidenceAssetId ?? null, notes: input.notes?.trim() ?? '', result: input.result });
  const updatedInspection = touch({ ...inspection, inspectedAt: new Date().toISOString(), inspectedBy: actorId, status: 'in_review' as const });
  return { inspection: updatedInspection, qcResult, state: normalizeWorkspace({ ...state, qcInspections: replace(state.qcInspections, updatedInspection), qcResults: replace(state.qcResults, qcResult) }) };
}

export function waiveQcResult(state: CanonicalWorkspaceState, actorId: string, input: { followUpTaskTitle: string; qcResultId: string; reason: string }) {
  const current = requireQcResult(state, input.qcResultId); const inspection = requireInspection(state, current.inspectionId); const order = requireProductionOrder(state, inspection.productionOrderId);
  if (current.result !== 'fail' && current.result !== 'conditional') throw new Error('Only a failed or conditional QC result can be waived.');
  if (!input.reason.trim() || !input.followUpTaskTitle.trim()) throw new Error('A waiver requires a reason and follow-up task.');
  const task: CanonicalReleaseTask = { ...record(state.studioId), assigneeId: null, description: `QC waiver ${current.checkCode}: ${input.reason.trim()}`, dueAt: null, garmentId: order.garmentId, priority: current.severity === 'critical' ? 'urgent' : 'high', sortOrder: state.releaseTasks.filter((item) => item.garmentId === order.garmentId).length, status: 'todo', title: input.followUpTaskTitle.trim() };
  const qcResult = touch({ ...current, issueTaskId: task.id, result: 'waived' as const });
  const waiver: CanonicalQcWaiver = { ...record(state.studioId), actorId, affectedCheckCode: current.checkCode, followUpTaskId: task.id, inspectionId: inspection.id, qcResultId: current.id, reason: input.reason.trim(), waivedAt: new Date().toISOString() };
  return { qcResult, task, waiver, state: normalizeWorkspace({ ...state, qcResults: replace(state.qcResults, qcResult), qcWaivers: [...state.qcWaivers, waiver], releaseTasks: [...state.releaseTasks, task] }) };
}

export function decideQcInspection(state: CanonicalWorkspaceState, actorId: string, input: { decision: Exclude<CanonicalQcInspection['releaseDecision'], 'pending'>; inspectionId: string }) {
  const current = requireInspection(state, input.inspectionId); const order = requireProductionOrder(state, current.productionOrderId);
  const checks = state.qcTemplateChecks.filter((item) => item.templateId === current.templateId); const results = state.qcResults.filter((item) => item.inspectionId === current.id);
  const unresolved = checks.filter((check) => check.required).filter((check) => !results.some((result) => result.checkCode === check.checkCode && ['pass', 'not_applicable', 'waived'].includes(result.result)));
  if (input.decision === 'approve' && unresolved.length) throw new Error(`Release blocked: ${unresolved.length} required QC check${unresolved.length === 1 ? '' : 's'} need a pass or waiver.`);
  const inspection = touch({ ...current, decidedAt: new Date().toISOString(), decidedBy: actorId, releaseDecision: input.decision, status: 'decided' as const });
  const productionOrder = input.decision === 'approve' ? touch({ ...order, status: 'closed' as const }) : order;
  return { inspection, productionOrder, state: normalizeWorkspace({ ...state, productionOrders: replace(state.productionOrders, productionOrder), qcInspections: replace(state.qcInspections, inspection) }) };
}

export function productionTimeline(state: CanonicalWorkspaceState, garmentId: string): ProductionTimelineEvent[] {
  const orders = state.productionOrders.filter((item) => item.garmentId === garmentId); const orderIds = new Set(orders.map((item) => item.id));
  const events: ProductionTimelineEvent[] = [
    ...state.sampleRounds.filter((item) => item.garmentId === garmentId).map((item) => ({ date: item.requestedAt ?? item.createdAt, entityId: item.id, kind: 'sample' as const, label: `Sample round ${item.roundNo} · ${item.sampleType}`, status: item.status })),
    ...state.fitSessions.filter((item) => state.sampleRounds.some((round) => round.id === item.sampleRoundId && round.garmentId === garmentId)).map((item) => ({ date: item.fitDate, entityId: item.id, kind: 'fit' as const, label: 'Fit review', status: item.decision ?? item.status })),
    ...state.costSheets.filter((item) => item.garmentId === garmentId).map((item) => ({ date: item.approvedAt ?? item.createdAt, entityId: item.id, kind: 'cost' as const, label: `${item.name} · ${item.quantityBasis} units`, status: item.status })),
    ...orders.map((item) => ({ date: item.placedAt ?? item.createdAt, entityId: item.id, kind: 'order' as const, label: `Order ${item.orderCode}`, status: item.status })),
    ...state.productionMilestones.filter((item) => orderIds.has(item.productionOrderId)).map((item) => ({ date: item.completedAt ?? item.targetDate ?? item.createdAt, entityId: item.id, kind: 'milestone' as const, label: item.name, status: item.status })),
    ...state.qcInspections.filter((item) => orderIds.has(item.productionOrderId)).map((item) => ({ date: item.decidedAt ?? item.inspectedAt ?? item.createdAt, entityId: item.id, kind: 'qc' as const, label: 'QC inspection', status: item.releaseDecision })),
  ];
  return events.sort((a, b) => a.date.localeCompare(b.date) || a.entityId.localeCompare(b.entityId));
}

function requireGarmentVersion(state: CanonicalWorkspaceState, garmentId: string, versionId: string) { if (!state.garmentVersions.some((item) => item.id === versionId && item.garmentId === garmentId)) throw new Error('Sample rounds must pin a Freeze Frame of this garment.'); }
function requireReleasedVersion(state: CanonicalWorkspaceState, garmentId: string, versionId: string) { requireGarmentVersion(state, garmentId, versionId); if (!state.technicalSpecs.some((item) => item.garmentId === garmentId && item.status === 'released' && item.releaseVersionId === versionId)) throw new Error('Choose the garment version from an approved technical release.'); }
function requireCostSheet(state: CanonicalWorkspaceState, id: string) { const sheet = state.costSheets.find((item) => item.id === id); if (!sheet) throw new Error('Cost sheet not found.'); return sheet; }
function requireProductionOrder(state: CanonicalWorkspaceState, id: string) { const order = state.productionOrders.find((item) => item.id === id); if (!order) throw new Error('Production order not found.'); return order; }
function requireInspection(state: CanonicalWorkspaceState, id: string) { const inspection = state.qcInspections.find((item) => item.id === id); if (!inspection) throw new Error('QC inspection not found.'); return inspection; }
function requireQcResult(state: CanonicalWorkspaceState, id: string) { const result = state.qcResults.find((item) => item.id === id); if (!result) throw new Error('QC result not found.'); return result; }
function requireSample(state: CanonicalWorkspaceState, id: string) { const sample = state.sampleRounds.find((item) => item.id === id); if (!sample) throw new Error('Sample round not found.'); return sample; }
function requireSession(state: CanonicalWorkspaceState, id: string) { const session = state.fitSessions.find((item) => item.id === id); if (!session) throw new Error('Fit session not found.'); return session; }
function record(studioId: string): RecordMeta { const timestamp = new Date().toISOString(); return { createdAt: timestamp, id: crypto.randomUUID(), revision: 1, studioId, updatedAt: timestamp }; }
function touch<T extends RecordMeta>(value: T): T { return { ...value, revision: value.revision + 1, updatedAt: new Date().toISOString() }; }
function replace<T extends { id: string }>(rows: T[], next: T) { return [...rows.filter((item) => item.id !== next.id), next]; }
function round4(value: number) { return Math.round((value + Number.EPSILON) * 10000) / 10000; }
function requireCurrency(value: string) { const currency = value.trim().toUpperCase(); if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Currency must be a three-letter ISO code.'); return currency; }
function recalculateSheet(sheet: CanonicalCostSheet, allItems: CanonicalCostItem[]) { return touch({ ...sheet, ...calculateCostScenario(allItems.filter((item) => item.costSheetId === sheet.id), sheet.quantityBasis, sheet.wholesaleUnitPrice) }); }
function cleanOrNull(value: string | null | undefined) { return value?.trim() || null; }
function nonNegativeOrNull(value: number | null | undefined, label: string) { if (value === null || value === undefined) return null; if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be a non-negative number.`); return value; }
function positiveOrNull(value: number | null | undefined, label: string) { if (value === null || value === undefined) return null; if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be greater than zero.`); return value; }
