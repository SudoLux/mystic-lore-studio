import { addEditorialBlock } from '../editorial/studioRepository';
import { selectPortfolioProject, updatePortfolioProject } from '../portfolio/publicCutRepository';
import { createPomPoint } from '../technical/measurementRepository';
import { addConstructionStep, createBomItem, createConstructionSection, recordTechPackValidationRun } from '../technical/releaseRepository';
import type { BomItemInput, ConstructionStepInput } from '../technical/releaseContracts';
import { registerFlat } from '../technical/technicalRepository';
import { recordWorkspaceChangeEvents } from '../versioning';
import type {
  AiAcceptanceCommandType,
  AiCandidateField,
  AiCandidatePanelState,
  AiEntityType,
  AiWorkflow,
  CanonicalAiAcceptance,
  CanonicalAiAcceptanceCommand,
  CanonicalAiArtifact,
  CanonicalAiInputRef,
  CanonicalAiJob,
  CanonicalChangeEvent,
  CanonicalRecord,
  CanonicalWorkspaceState,
  TechnicalFlatView,
} from '../workspace';
import type { AcceptAiArtifactInput, AiAcceptanceResult, AiInputReferenceRequest, QueueAiJobInput, RejectAiArtifactInput } from './contracts';
import { generateFakeAiCandidate } from './fakeAiProvider';

const generatedModel = 'deterministic-fake-v1';

export function defaultAiInputRefs(state: CanonicalWorkspaceState, garmentId: string, workflow: AiWorkflow): AiInputReferenceRequest[] {
  const garment = required(state.garments.find((item) => item.id === garmentId), 'Garment');
  const refs: AiInputReferenceRequest[] = [{ entityId: garment.id, entityType: 'garment' }];
  const brief = state.designBriefs.find((item) => item.garmentId === garmentId);
  const spec = state.technicalSpecs.find((item) => item.garmentId === garmentId);
  const version = state.garmentVersions.filter((item) => item.garmentId === garmentId).sort((a, b) => b.versionNo - a.versionNo)[0];
  if (brief && ['bom_assistance', 'editorial_generation', 'portfolio_drafting', 'technical_flat_generation'].includes(workflow)) refs.push({ entityId: brief.id, entityType: 'design_brief' });
  if (spec && ['technical_flat_generation', 'pom_assistance', 'bom_assistance', 'construction_recommendations', 'tech_pack_validation'].includes(workflow)) refs.push({ entityId: spec.id, entityType: 'technical_spec', sourceVersionId: version?.id ?? null });
  if (version && ['editorial_generation', 'portfolio_drafting', 'tech_pack_validation'].includes(workflow)) refs.push({ entityId: version.id, entityType: 'garment_version', sourceVersionId: version.id });
  if (workflow === 'technical_flat_generation' || workflow === 'editorial_generation') {
    const assetId = state.garmentMedia.find((item) => item.garmentId === garmentId)?.assetId;
    if (assetId) refs.push({ entityId: assetId, entityType: 'media_asset' });
  }
  if (workflow === 'bom_assistance') {
    for (const relationship of state.garmentMaterials.filter((item) => item.garmentId === garmentId)) refs.push({ entityId: relationship.variantId, entityType: 'material_variant' });
    for (const relationship of state.garmentComponents.filter((item) => item.garmentId === garmentId)) refs.push({ entityId: relationship.variantId, entityType: 'component_variant' });
  }
  if (workflow === 'construction_recommendations' && spec) {
    for (const flat of state.technicalFlats.filter((item) => item.specId === spec.id)) refs.push({ entityId: flat.id, entityType: 'technical_flat' });
    for (const item of state.bomItems.filter((candidate) => candidate.specId === spec.id)) refs.push({ entityId: item.id, entityType: 'bom_item' });
  }
  if (workflow === 'editorial_generation') {
    const collection = state.editorialCollections.find((item) => item.primaryGarmentId === garmentId);
    if (collection) refs.push({ entityId: collection.id, entityType: 'editorial_collection', sourceVersionId: collection.primaryGarmentVersionId });
  }
  if (workflow === 'portfolio_drafting') {
    const project = state.portfolioProjects.find((item) => item.garmentId === garmentId);
    if (project) refs.push({ entityId: project.id, entityType: 'portfolio_project', sourceVersionId: project.sourceVersionId });
  }
  return [...new Map(refs.map((item) => [`${item.entityType}:${item.entityId}:${item.fieldPath ?? ''}`, item])).values()];
}

export function queueAiJob(state: CanonicalWorkspaceState, input: QueueAiJobInput) {
  if (!input.actorId) throw new Error('An authenticated actor is required.');
  required(state.garments.find((item) => item.id === input.garmentId), 'Garment');
  if (!input.promptTemplateVersion.trim()) throw new Error('A versioned prompt template is required. Raw prompts are not stored in AI jobs.');
  if (!input.inputRefs.length) throw new Error('AI jobs require structured, versioned input references.');
  const idempotencyKey = input.idempotencyKey?.trim() || stableHash(stable({ actorId: input.actorId, garmentId: input.garmentId, inputRefs: input.inputRefs, promptTemplateVersion: input.promptTemplateVersion, workflow: input.workflow }));
  const existing = state.aiJobs.find((item) => item.idempotencyKey === idempotencyKey && item.garmentId === input.garmentId);
  if (existing) return { created: false, job: existing, state };
  const now = new Date().toISOString();
  const jobId = crypto.randomUUID();
  const refs = input.inputRefs.map((request, sortOrder) => buildInputRef(state, jobId, request, sortOrder));
  const sourceChecksum = stableHash(stable(refs.map(({ entityId, entityRevision, entityType, fieldPath, sourceChecksum: checksum, sourceVersionId }) => ({ checksum, entityId, entityRevision, entityType, fieldPath, sourceVersionId }))));
  const retry = input.retryOfJobId ? required(state.aiJobs.find((item) => item.id === input.retryOfJobId), 'Retry source job') : null;
  const job: CanonicalAiJob = {
    ...record(state.studioId, now),
    attemptNo: retry ? retry.attemptNo + 1 : 1,
    completedAt: null,
    errorCode: null,
    garmentId: input.garmentId,
    id: jobId,
    idempotencyKey,
    inputRefIds: refs.map((item) => item.id),
    jobType: input.workflow,
    promptTemplateVersion: input.promptTemplateVersion.trim(),
    provider: 'deterministic_fake',
    requestedBy: input.actorId,
    retryOfJobId: retry?.id ?? null,
    selectedModel: input.selectedModel?.trim() || generatedModel,
    sourceChecksum,
    startedAt: null,
    status: 'queued',
  };
  return { created: true, job, state: { ...state, aiInputRefs: [...state.aiInputRefs, ...refs], aiJobs: [...state.aiJobs, job] } };
}

export function startAiJob(state: CanonicalWorkspaceState, jobId: string) {
  const job = required(state.aiJobs.find((item) => item.id === jobId), 'AI job');
  if (job.status === 'running') return { job, state };
  if (job.status !== 'queued') throw new Error('Only a queued AI job can start.');
  const started = touch({ ...job, startedAt: new Date().toISOString(), status: 'running' as const });
  return { job: started, state: { ...state, aiJobs: replace(state.aiJobs, started) } };
}

export function completeAiJobWithFakeProvider(state: CanonicalWorkspaceState, jobId: string) {
  const job = required(state.aiJobs.find((item) => item.id === jobId), 'AI job');
  if (job.status === 'candidate') {
    const artifact = required(state.aiArtifacts.find((item) => item.jobId === job.id), 'AI artifact');
    return { artifact, job, state };
  }
  if (job.status !== 'running') throw new Error('Start the AI job before generating a candidate.');
  const generated = generateFakeAiCandidate(state, job);
  assertPrivateCandidateBoundary(generated.candidate, state.studioId);
  const now = new Date().toISOString();
  const artifact: CanonicalAiArtifact = {
    ...record(state.studioId, now), acceptanceOperationId: null, acceptedPayloadChecksum: null,
    artifactType: job.jobType, candidate: generated.candidate, candidateChecksum: stableHash(stable(generated.candidate)),
    confidence: generated.confidence, decidedAt: null, decidedBy: null, decision: 'pending', decisionReason: '',
    fields: generated.fields, generatedAt: now, jobId: job.id, provenance: generated.provenance, sourceChecksum: job.sourceChecksum,
  };
  const completed = touch({ ...job, completedAt: now, status: 'candidate' as const });
  return { artifact, job: completed, state: { ...state, aiArtifacts: [...state.aiArtifacts, artifact], aiJobs: replace(state.aiJobs, completed) } };
}

export function failAiJob(state: CanonicalWorkspaceState, jobId: string, errorCode: string) {
  const job = required(state.aiJobs.find((item) => item.id === jobId), 'AI job');
  const failed = touch({ ...job, completedAt: new Date().toISOString(), errorCode: errorCode.trim() || 'provider_failed', status: 'failed' as const });
  return { job: failed, state: { ...state, aiJobs: replace(state.aiJobs, failed) } };
}

export function retryAiJob(state: CanonicalWorkspaceState, jobId: string, actorId: string, idempotencyKey?: string) {
  const job = required(state.aiJobs.find((item) => item.id === jobId), 'AI job');
  const requests = state.aiInputRefs.filter((item) => job.inputRefIds.includes(item.id)).map((item) => ({ entityId: item.entityId, entityType: item.entityType, fieldPath: item.fieldPath, sourceVersionId: item.sourceVersionId }));
  return queueAiJob(state, { actorId, garmentId: job.garmentId, idempotencyKey: idempotencyKey ?? `${job.idempotencyKey}:retry:${job.attemptNo + 1}`, inputRefs: requests, promptTemplateVersion: job.promptTemplateVersion, retryOfJobId: job.id, selectedModel: job.selectedModel, workflow: job.jobType });
}

export function aiCandidatePanelState(state: CanonicalWorkspaceState, job: CanonicalAiJob, artifact: CanonicalAiArtifact | null): AiCandidatePanelState {
  if (!artifact) return job.status;
  if (artifact.decision === 'accepted') return 'accepted';
  if (artifact.decision === 'rejected') return 'rejected';
  return aiArtifactSourcesFresh(state, artifact) ? 'candidate' : 'modified_after_generation';
}

export function aiArtifactSourcesFresh(state: CanonicalWorkspaceState, artifact: CanonicalAiArtifact) {
  const job = state.aiJobs.find((item) => item.id === artifact.jobId);
  if (!job || job.sourceChecksum !== artifact.sourceChecksum || !job.inputRefIds.length) return false;
  return job.inputRefIds.every((id) => {
    const inputRef = state.aiInputRefs.find((item) => item.id === id);
    if (!inputRef) return false;
    const entity = entityRecord(state, inputRef.entityType, inputRef.entityId);
    return Boolean(entity && entity.revision === inputRef.entityRevision && referenceChecksum(entity, inputRef.fieldPath, inputRef.sourceVersionId) === inputRef.sourceChecksum);
  });
}

export function acceptAiArtifact(state: CanonicalWorkspaceState, input: AcceptAiArtifactInput): AiAcceptanceResult {
  assertWriter(input.actorId, input.actorRole);
  if (input.online === false) throw new Error('AI acceptance requires fresh server state and cannot be queued offline.');
  const artifact = required(state.aiArtifacts.find((item) => item.id === input.artifactId), 'AI artifact');
  const existingAcceptance = state.aiAcceptances.find((item) => item.artifactId === artifact.id);
  if (artifact.decision === 'accepted' && existingAcceptance && input.operationId === existingAcceptance.operationId) return { acceptance: existingAcceptance, artifact, domainChangeEventIds: state.aiAcceptanceCommands.filter((item) => item.acceptanceId === existingAcceptance.id).map((item) => item.changeEventId), state };
  if (artifact.decision !== 'pending') throw new Error('This AI candidate already has a final decision.');
  if (!aiArtifactSourcesFresh(state, artifact)) throw new Error('AI candidate sources changed after generation. Review a new candidate before accepting.');
  if (input.decisionNote.trim().length < 8) throw new Error('Explain the acceptance decision in at least 8 characters.');
  const selected = unique(input.selectedFieldKeys);
  if (!selected.length) throw new Error('Select at least one candidate field to accept.');
  const fieldMap = new Map(artifact.fields.map((item) => [item.key, item]));
  if (selected.some((key) => !fieldMap.has(key))) throw new Error('The field selection contains an unknown candidate field.');
  if (artifact.fields.some((item) => !item.safeForPartialAcceptance) && selected.length !== artifact.fields.length) throw new Error('This candidate must be accepted as one validated unit.');
  const operationId = input.operationId ?? crypto.randomUUID();
  const applied = applyCandidate(state, artifact, selected, input.actorId);
  const withDomainEvents = recordWorkspaceChangeEvents(state, applied.state, { actorId: input.actorId, operationId, origin: 'ai_acceptance' });
  const domainEvents = withDomainEvents.changeEvents.filter((item) => item.operationId === operationId && item.origin === 'ai_acceptance');
  if (!domainEvents.length) throw new Error('AI acceptance did not emit a normal domain change event.');
  const acceptedPayloadChecksum = stableHash(stable({ candidateChecksum: artifact.candidateChecksum, selected: selected.map((key) => ({ key, value: valueAtCandidateField(artifact, fieldMap.get(key)!) })) }));
  const now = new Date().toISOString();
  const acceptance: CanonicalAiAcceptance = { ...record(state.studioId, now), acceptedAt: now, acceptedPayloadChecksum, actorId: input.actorId, artifactId: artifact.id, candidateChecksum: artifact.candidateChecksum, decisionNote: input.decisionNote.trim(), operationId, sourceChecksum: artifact.sourceChecksum };
  const receiptEvents = receiptEventsForWorkflow(artifact.artifactType, domainEvents);
  if (!receiptEvents.length) throw new Error('AI acceptance could not prove the typed domain command result.');
  const commands: CanonicalAiAcceptanceCommand[] = selected.map((fieldKey, sortOrder) => {
    const event = artifact.artifactType === 'tech_pack_validation' ? receiptEvents[0] : receiptEvents[Math.min(sortOrder, receiptEvents.length - 1)];
    return { ...record(state.studioId, now), acceptanceId: acceptance.id, changeEventId: event.id, commandType: commandTypeFor(artifact.artifactType), fieldKey, sortOrder, targetEntityId: event.entityId, targetEntityType: event.entityType };
  });
  const decided = touch({ ...artifact, acceptanceOperationId: operationId, acceptedPayloadChecksum, decidedAt: now, decidedBy: input.actorId, decision: 'accepted' as const, decisionReason: input.decisionNote.trim() });
  const job = required(withDomainEvents.aiJobs.find((item) => item.id === artifact.jobId), 'AI job');
  const acceptedJob = touch({ ...job, completedAt: job.completedAt ?? now, status: 'accepted' as const });
  const acceptanceEvent = aiDecisionEvent(withDomainEvents, decided, acceptedJob.garmentId, input.actorId, operationId, 'accepted', domainEvents.map((item) => item.id));
  return { acceptance, artifact: decided, domainChangeEventIds: domainEvents.map((item) => item.id), state: { ...withDomainEvents, aiAcceptanceCommands: [...withDomainEvents.aiAcceptanceCommands, ...commands], aiAcceptances: [...withDomainEvents.aiAcceptances, acceptance], aiArtifacts: replace(withDomainEvents.aiArtifacts, decided), aiJobs: replace(withDomainEvents.aiJobs, acceptedJob), changeEvents: [...withDomainEvents.changeEvents, acceptanceEvent] } };
}

export function rejectAiArtifact(state: CanonicalWorkspaceState, input: RejectAiArtifactInput) {
  assertWriter(input.actorId, input.actorRole);
  const artifact = required(state.aiArtifacts.find((item) => item.id === input.artifactId), 'AI artifact');
  if (artifact.decision === 'rejected' && artifact.decisionReason === input.decisionNote.trim()) return { artifact, state };
  if (artifact.decision !== 'pending') throw new Error('This AI candidate already has a final decision.');
  if (input.decisionNote.trim().length < 8) throw new Error('Explain the rejection decision in at least 8 characters.');
  const now = new Date().toISOString();
  const operationId = crypto.randomUUID();
  const rejected = touch({ ...artifact, decidedAt: now, decidedBy: input.actorId, decision: 'rejected' as const, decisionReason: input.decisionNote.trim() });
  const job = required(state.aiJobs.find((item) => item.id === artifact.jobId), 'AI job');
  const rejectedJob = touch({ ...job, completedAt: job.completedAt ?? now, status: 'rejected' as const });
  const event = aiDecisionEvent(state, rejected, job.garmentId, input.actorId, operationId, 'rejected', []);
  return { artifact: rejected, state: { ...state, aiArtifacts: replace(state.aiArtifacts, rejected), aiJobs: replace(state.aiJobs, rejectedJob), changeEvents: [...state.changeEvents, event] } };
}

export function inspectAiSources(state: CanonicalWorkspaceState, job: CanonicalAiJob) { return job.inputRefIds.map((id) => state.aiInputRefs.find((item) => item.id === id)).filter((item): item is CanonicalAiInputRef => Boolean(item)); }

export function assertPrivateCandidateBoundary(value: unknown, studioId: string) {
  walk(value, (key, candidate) => {
    const normalized = key.replace(/[^a-z0-9]/gi, '').toLowerCase();
    if (['prompt', 'prompttext', 'rawprompt', 'publicstoragepath', 'publicationpayload'].includes(normalized)) throw new Error(`AI candidate contains forbidden boundary field: ${key}.`);
    if (typeof candidate === 'string' && (/^(?:publications\/|portfolio-assets\/)/.test(candidate) || candidate.includes('/object/public/portfolio-assets/'))) throw new Error('AI candidate media cannot target a public storage path.');
    if (normalized === 'storagepath' && typeof candidate === 'string' && !candidate.startsWith(`studios/${studioId}/`)) throw new Error('AI-generated media must remain in the private Studio asset path.');
  });
}

function applyCandidate(state: CanonicalWorkspaceState, artifact: CanonicalAiArtifact, selected: string[], actorId: string) {
  let next = state;
  const payload = artifact.candidate;
  if (artifact.artifactType === 'technical_flat_generation') {
    for (const item of selectedObjects(payload.flats, selected)) next = registerFlat(next, text(item.specId), text(item.assetId), text(item.view) as TechnicalFlatView, text(item.versionLabel)).state;
  } else if (artifact.artifactType === 'pom_assistance') {
    for (const item of selectedObjects(payload.points, selected)) next = createPomPoint(next, { anchor: point(item.anchor), code: text(item.code), method: text(item.method), name: text(item.name), specId: text(item.specId), type: 'create_pom' }).state;
  } else if (artifact.artifactType === 'bom_assistance') {
    for (const item of selectedObjects(payload.items, selected)) next = createBomItem(next, item as unknown as BomItemInput).state;
  } else if (artifact.artifactType === 'construction_recommendations') {
    const selectedSteps = selectedObjects(payload.steps, selected);
    let sectionId = optionalText(selectedSteps[0]?.sectionId);
    if (!sectionId) { const created = createConstructionSection(next, text(selectedSteps[0]?.specId), text(selectedSteps[0]?.sectionName)); next = created.state; sectionId = created.section.id; }
    for (const item of selectedSteps) next = addConstructionStep(next, sectionId, item as unknown as ConstructionStepInput).state;
  } else if (artifact.artifactType === 'tech_pack_validation') {
    next = recordTechPackValidationRun(next, text(payload.specId), actorId).state;
  } else if (artifact.artifactType === 'editorial_generation') {
    for (const item of selectedObjects(payload.blocks, selected)) { const added = addEditorialBlock(next, text(item.sceneId), text(item.blockType), object(item.content)); next = { ...added.state, editorialBlocks: added.state.editorialBlocks.map((block) => block.id === added.block.id ? { ...block, aiArtifactId: artifact.id } : block) }; }
  } else {
    const values = object(payload.values);
    const caseStudy = Object.fromEntries(selected.map((key) => [key.replace(/^portfolio:/, ''), text(values[key.replace(/^portfolio:/, '')])]));
    const projectId = optionalText(payload.projectId);
    next = projectId ? updatePortfolioProject(next, projectId, { caseStudy }).state : selectPortfolioProject(next, text(payload.profileId), required(next.aiJobs.find((item) => item.id === artifact.jobId), 'AI job').garmentId, caseStudy).state;
  }
  return { state: next };
}

function receiptEventsForWorkflow(workflow: AiWorkflow, events: CanonicalChangeEvent[]) {
  const expected: Record<AiWorkflow, string[]> = { bom_assistance: ['bom_item'], construction_recommendations: ['construction_step'], editorial_generation: ['editorial_block'], pom_assistance: ['pom_point'], portfolio_drafting: ['portfolio_project'], tech_pack_validation: ['validation_run'], technical_flat_generation: ['technical_flat'] };
  return events.filter((item) => expected[workflow].includes(item.entityType));
}

function commandTypeFor(workflow: AiWorkflow): AiAcceptanceCommandType {
  const commands: Record<AiWorkflow, AiAcceptanceCommandType> = { bom_assistance: 'bom.create-item', construction_recommendations: 'construction.add-step', editorial_generation: 'editorial.add-block', pom_assistance: 'measurement.create-pom', portfolio_drafting: 'portfolio.update-project', tech_pack_validation: 'technical.run-validation', technical_flat_generation: 'technical.register-flat' };
  return commands[workflow];
}

function buildInputRef(state: CanonicalWorkspaceState, jobId: string, request: AiInputReferenceRequest, sortOrder: number): CanonicalAiInputRef {
  const entity = required(entityRecord(state, request.entityType, request.entityId), `AI input ${request.entityType}`);
  if (entity.studioId !== state.studioId) throw new Error('AI input references must belong to the active Studio.');
  if (request.sourceVersionId && !state.garmentVersions.some((item) => item.id === request.sourceVersionId)) throw new Error('AI source version must belong to the active Studio.');
  const now = new Date().toISOString(); const fieldPath = request.fieldPath?.trim() ?? '';
  return { ...record(state.studioId, now), entityId: entity.id, entityRevision: entity.revision, entityType: request.entityType, fieldPath, jobId, sortOrder, sourceChecksum: referenceChecksum(entity, fieldPath, request.sourceVersionId ?? null), sourceVersionId: request.sourceVersionId ?? null };
}

function entityRecord(state: CanonicalWorkspaceState, type: AiEntityType, id: string): CanonicalRecord | null {
  const collections: Record<AiEntityType, CanonicalRecord[]> = { bom_item: state.bomItems, component_variant: state.componentVariants, construction_step: state.constructionSteps, design_brief: state.designBriefs, editorial_collection: state.editorialCollections, garment: state.garments, garment_version: state.garmentVersions, material_variant: state.materialVariants, measurement_set: state.measurementSets, media_asset: state.mediaAssets, pom_point: state.pomPoints, portfolio_project: state.portfolioProjects, technical_flat: state.technicalFlats, technical_spec: state.technicalSpecs, technical_template: state.templates, validation_run: state.validationRuns };
  return collections[type].find((item) => item.id === id) ?? null;
}

function referenceChecksum(entity: CanonicalRecord, fieldPath: string, sourceVersionId: string | null) { return stableHash(stable({ entity: fieldPath ? readPath(entity, fieldPath) : entity, fieldPath, sourceVersionId })); }

function aiDecisionEvent(state: CanonicalWorkspaceState, artifact: CanonicalAiArtifact, garmentId: string, actorId: string, operationId: string, decision: 'accepted' | 'rejected', relatedOperationIds: string[]): CanonicalChangeEvent {
  const now = new Date().toISOString(); const garment = state.garments.find((item) => item.id === garmentId);
  return { ...record(state.studioId, now), actorId, baseRevision: garment?.revision ?? null, entityId: artifact.id, entityType: 'ai_artifact', garmentId, inversePatch: [{ op: 'replace', path: '/decision', value: 'pending' }], jsonPatch: [{ op: 'replace', path: '/decision', value: decision }], occurredAt: now, operation: decision === 'accepted' ? 'accept_ai' : 'update', operationId, origin: decision === 'accepted' ? 'ai_acceptance' : 'user', relatedOperationIds, resultRevision: garment?.revision ?? null, scope: 'all' };
}

function selectedObjects(value: unknown, selected: string[]) { return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object' && selected.includes(text((item as Record<string, unknown>).key)))) : []; }
function valueAtCandidateField(artifact: CanonicalAiArtifact, field: AiCandidateField) {
  const direct = readPath(artifact.candidate, field.path);
  if (direct !== undefined) return direct;
  const keyedCandidate = findKeyedCandidate(artifact.candidate, field.key);
  if (keyedCandidate !== undefined) return keyedCandidate;
  if (field.key.startsWith('portfolio:')) return readPath(artifact.candidate, `values.${field.key.slice('portfolio:'.length)}`);
  return undefined;
}
function readPath(value: unknown, path: string): unknown { return path.split('.').filter(Boolean).reduce((current, key) => current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined, value); }
function findKeyedCandidate(value: unknown, fieldKey: string): unknown {
  if (Array.isArray(value)) {
    for (const item of value) {
      const match = findKeyedCandidate(item, fieldKey);
      if (match !== undefined) return match;
    }
    return undefined;
  }
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Record<string, unknown>;
  if (candidate.key === fieldKey) return candidate;
  for (const child of Object.values(candidate)) {
    const match = findKeyedCandidate(child, fieldKey);
    if (match !== undefined) return match;
  }
  return undefined;
}
function point(value: unknown) { const candidate = object(value); const x = Number(candidate.x); const y = Number(candidate.y); if (![x, y].every((item) => Number.isFinite(item) && item >= 0 && item <= 1)) throw new Error('AI POM anchor is invalid.'); return { x, y }; }
function object(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown) { return typeof value === 'string' ? value : ''; }
function optionalText(value: unknown) { const result = text(value); return result || null; }
function unique<T>(values: T[]) { return [...new Set(values)]; }
function required<T>(value: T | null | undefined, label: string): T { if (!value) throw new Error(`${label} not found.`); return value; }
function assertWriter(actorId: string, role: 'owner' | 'editor' | 'reviewer' | 'viewer') { if (!actorId) throw new Error('An authenticated actor is required.'); if (!['owner', 'editor'].includes(role)) throw new Error('Only a Studio owner or editor can decide AI candidates.'); }
function replace<T extends { id: string }>(values: T[], value: T) { return values.map((item) => item.id === value.id ? value : item); }
function record(studioId: string, at = new Date().toISOString()) { return { createdAt: at, id: crypto.randomUUID(), revision: 1, studioId, updatedAt: at }; }
function touch<T extends { revision: number; updatedAt: string }>(value: T): T { return { ...value, revision: value.revision + 1, updatedAt: new Date().toISOString() }; }
function stable(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`; if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`; return JSON.stringify(value) ?? 'null'; }
function stableHash(value: string) { let a = 0x811c9dc5; let b = 0x9e3779b9; for (let index = 0; index < value.length; index += 1) { const code = value.charCodeAt(index); a = Math.imul(a ^ code, 16777619); b = Math.imul(b ^ (code + index), 2246822519); } const block = ((a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0')); return block.repeat(4); }
function walk(value: unknown, visitor: (key: string, value: unknown) => void) { if (Array.isArray(value)) { value.forEach((item) => walk(item, visitor)); return; } if (!value || typeof value !== 'object') return; for (const [key, child] of Object.entries(value as Record<string, unknown>)) { visitor(key, child); walk(child, visitor); } }
