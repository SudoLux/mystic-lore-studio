import type {
  CanonicalBomItem,
  CanonicalConstructionDetail,
  CanonicalConstructionSection,
  CanonicalConstructionStep,
  CanonicalReleaseTask,
  CanonicalTemplate,
  CanonicalTemplateApplication,
  CanonicalValidationIssue,
  CanonicalValidationRun,
  CanonicalValidationWaiver,
  CanonicalWorkspaceState,
  TechPackSectionManifestItem,
} from '../workspace';
import {
  componentQuantityUnits,
  materialQuantityUnits,
  quantityUnits,
  releaseRulesetVersion,
  type BomItemInput,
  type ConstructionDetailInput,
  type ConstructionStepInput,
  type ReleaseInput,
  type ReleasePreview,
  type StructuredTechPackSection,
} from './releaseContracts';
import { validateMeasurementSet } from './measurementRepository';
import { checksumText, createTechnicalCheckpoint, validateTechnicalSpec } from './technicalRepository';

export function createBomItem(state: CanonicalWorkspaceState, input: BomItemInput) {
  assertBomInput(state, input);
  const item: CanonicalBomItem = {
    ...record(state.studioId),
    componentVariantId: input.componentVariantId ?? null,
    costImpact: decimal(input.costImpact ?? 0),
    currency: (input.currency ?? 'USD').trim().toUpperCase(),
    description: input.description.trim(),
    intentionalFreeText: input.intentionalFreeText ?? input.itemType === 'custom',
    itemType: input.itemType,
    materialVariantId: input.materialVariantId ?? null,
    placement: input.placement.trim(),
    quantity: decimal(input.quantity),
    shortageQuantity: decimal(input.shortageQuantity ?? 0),
    sortOrder: state.bomItems.filter((candidate) => candidate.specId === input.specId).length,
    specId: input.specId,
    status: input.status ?? (input.shortageQuantity ? 'shortage' : input.itemType === 'custom' ? 'approved' : 'linked'),
    substituteItemId: null,
    supplierItemId: input.supplierItemId ?? null,
    unit: input.unit,
    unitCost: decimal(input.unitCost ?? supplierCost(state, input.supplierItemId)),
  };
  return { item, state: { ...state, bomItems: [...state.bomItems, item] } };
}

export function updateBomItem(state: CanonicalWorkspaceState, itemId: string, patch: Partial<Omit<CanonicalBomItem, 'id' | 'studioId' | 'createdAt' | 'updatedAt' | 'revision' | 'specId' | 'sortOrder'>>) {
  const current = requireBomItem(state, itemId);
  const next = { ...current, ...patch };
  assertBomInput(state, next);
  if (next.substituteItemId) assertSubstitute(state, current, next.substituteItemId);
  const updated = touch({ ...next, description: next.description.trim(), placement: next.placement.trim(), quantity: decimal(next.quantity), shortageQuantity: decimal(next.shortageQuantity), unitCost: decimal(next.unitCost), costImpact: decimal(next.costImpact) });
  return {
    item: updated,
    state: { ...state, bomItems: state.bomItems.map((item) => item.id === itemId ? updated : item) },
  };
}

export function setBomSubstitute(state: CanonicalWorkspaceState, itemId: string, substituteItemId: string | null, costImpact = 0) {
  const current = requireBomItem(state, itemId);
  if (substituteItemId) assertSubstitute(state, current, substituteItemId);
  const updated = touch({ ...current, substituteItemId, costImpact: decimal(costImpact), status: substituteItemId ? 'substituted' as const : current.shortageQuantity > 0 ? 'shortage' as const : 'approved' as const });
  return { item: updated, state: { ...state, bomItems: state.bomItems.map((item) => item.id === itemId ? updated : item) } };
}

export function moveBomItem(state: CanonicalWorkspaceState, itemId: string, direction: -1 | 1) {
  const current = requireBomItem(state, itemId);
  const ordered = state.bomItems.filter((item) => item.specId === current.specId).sort(bySort);
  const index = ordered.findIndex((item) => item.id === itemId);
  const target = index + direction;
  if (target < 0 || target >= ordered.length) return state;
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  const positions = new Map(ordered.map((item, position) => [item.id, position]));
  return { ...state, bomItems: state.bomItems.map((item) => positions.has(item.id) ? touch({ ...item, sortOrder: positions.get(item.id)! }) : item) };
}

export function bomItemLabel(state: CanonicalWorkspaceState, item: CanonicalBomItem) {
  if (item.itemType === 'material_variant') {
    const variant = state.materialVariants.find((candidate) => candidate.id === item.materialVariantId);
    const material = state.materials.find((candidate) => candidate.id === variant?.materialId);
    return [material?.name, variant?.colorName].filter(Boolean).join(' · ') || item.description;
  }
  if (item.itemType === 'component_variant') {
    const variant = state.componentVariants.find((candidate) => candidate.id === item.componentVariantId);
    const component = state.components.find((candidate) => candidate.id === variant?.componentId);
    return [component?.name, variant?.finish, variant?.size].filter(Boolean).join(' · ') || item.description;
  }
  return item.description;
}

export function createConstructionSection(state: CanonicalWorkspaceState, specId: string, name: string) {
  requireSpec(state, specId);
  if (!name.trim()) throw new Error('Construction section name is required.');
  const section: CanonicalConstructionSection = { ...record(state.studioId), specId, name: name.trim(), sortOrder: state.constructionSections.filter((item) => item.specId === specId).length, status: 'draft' };
  return { section, state: { ...state, constructionSections: [...state.constructionSections, section] } };
}

export function moveConstructionSection(state: CanonicalWorkspaceState, sectionId: string, direction: -1 | 1) {
  const current = state.constructionSections.find((item) => item.id === sectionId);
  if (!current) throw new Error('Construction section not found.');
  const ordered = state.constructionSections.filter((item) => item.specId === current.specId).sort(bySort);
  const index = ordered.findIndex((item) => item.id === sectionId);
  const target = index + direction;
  if (target < 0 || target >= ordered.length) return state;
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  const positions = new Map(ordered.map((item, position) => [item.id, position]));
  return { ...state, constructionSections: state.constructionSections.map((item) => positions.has(item.id) ? touch({ ...item, sortOrder: positions.get(item.id)! }) : item) };
}

export function addConstructionStep(state: CanonicalWorkspaceState, sectionId: string, input: ConstructionStepInput) {
  const section = state.constructionSections.find((item) => item.id === sectionId);
  if (!section) throw new Error('Construction section not found.');
  assertConstructionStep(input);
  const siblings = state.constructionSteps.filter((item) => item.sectionId === sectionId);
  const step: CanonicalConstructionStep = {
    ...record(state.studioId),
    machine: input.machine?.trim() ?? '',
    machineRequired: input.machineRequired ?? false,
    operation: input.operation.trim(),
    seamAllowance: input.seamAllowance == null ? null : decimal(input.seamAllowance),
    sectionId,
    sortOrder: siblings.length,
    status: input.status ?? 'ready',
    stepNumber: siblings.length + 1,
    stitchRequired: input.stitchRequired ?? false,
    stitchSpec: input.stitchSpec?.trim() ?? '',
  };
  return { step, state: { ...state, constructionSteps: [...state.constructionSteps, step] } };
}

export function moveConstructionStep(state: CanonicalWorkspaceState, stepId: string, direction: -1 | 1) {
  const current = requireStep(state, stepId);
  const ordered = state.constructionSteps.filter((item) => item.sectionId === current.sectionId).sort(bySort);
  const index = ordered.findIndex((item) => item.id === stepId);
  const target = index + direction;
  if (target < 0 || target >= ordered.length) return state;
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  const positions = new Map(ordered.map((item, position) => [item.id, position]));
  return { ...state, constructionSteps: state.constructionSteps.map((item) => positions.has(item.id) ? touch({ ...item, sortOrder: positions.get(item.id)!, stepNumber: positions.get(item.id)! + 1 }) : item) };
}

export function addConstructionDetail(state: CanonicalWorkspaceState, stepId: string, input: ConstructionDetailInput) {
  requireStep(state, stepId);
  if (!input.callout.trim()) throw new Error('A visual callout is required.');
  if (input.assetId && !state.mediaAssets.some((item) => item.id === input.assetId)) throw new Error('Construction detail asset not found.');
  if (input.anchor && !normalized(input.anchor)) throw new Error('Construction anchors must be normalized between 0 and 1.');
  const detail: CanonicalConstructionDetail = { ...record(state.studioId), stepId, assetId: input.assetId ?? null, anchor: input.anchor ?? null, callout: input.callout.trim(), severity: input.severity ?? 'info', status: 'open', sortOrder: state.constructionDetails.filter((item) => item.stepId === stepId).length };
  return { detail, state: { ...state, constructionDetails: [...state.constructionDetails, detail] } };
}

export function setConstructionDetailStatus(state: CanonicalWorkspaceState, detailId: string, status: CanonicalConstructionDetail['status']) {
  if (!state.constructionDetails.some((item) => item.id === detailId)) throw new Error('Construction callout not found.');
  return { ...state, constructionDetails: state.constructionDetails.map((item) => item.id === detailId ? touch({ ...item, status }) : item) };
}

export function captureConstructionTemplate(state: CanonicalWorkspaceState, specId: string, name: string) {
  const spec = requireSpec(state, specId);
  const sections = state.constructionSections.filter((item) => item.specId === specId).sort(bySort).map((section) => ({
    name: section.name,
    steps: state.constructionSteps.filter((step) => step.sectionId === section.id).sort(bySort).map((step) => ({
      operation: step.operation,
      machine: step.machine,
      machineRequired: step.machineRequired,
      stitchSpec: step.stitchSpec,
      stitchRequired: step.stitchRequired,
      seamAllowance: step.seamAllowance,
      details: state.constructionDetails.filter((detail) => detail.stepId === step.id).sort(bySort).map((detail) => ({ assetId: detail.assetId, anchor: detail.anchor, callout: detail.callout, severity: detail.severity })),
    })),
  }));
  if (!sections.length) throw new Error('Add construction sections before capturing a template.');
  const version = Math.max(0, ...state.templates.filter((item) => item.templateType === 'construction' && item.name === name.trim()).map((item) => item.version)) + 1;
  const template: CanonicalTemplate = { ...record(state.studioId), name: name.trim() || 'Construction template', payload: { sourceSpecUnit: spec.unit, sections }, status: 'active', templateType: 'construction', version };
  return { template, state: { ...state, templates: [...state.templates, template] } };
}

export function applyConstructionTemplate(state: CanonicalWorkspaceState, specId: string, templateId: string, actorId: string | null) {
  const spec = requireSpec(state, specId);
  const template = state.templates.find((item) => item.id === templateId && item.templateType === 'construction');
  if (!template) throw new Error('Construction template not found.');
  const payload = template.payload as { sections?: Array<{ name?: string; steps?: Array<ConstructionStepInput & { details?: ConstructionDetailInput[] }> }> };
  if (!Array.isArray(payload.sections) || !payload.sections.length) throw new Error('Construction template has no candidate sections.');
  let next = state;
  const copiedIds: string[] = [];
  for (const candidateSection of payload.sections) {
    const sectionResult = createConstructionSection(next, specId, candidateSection.name ?? 'Untitled section');
    next = sectionResult.state;
    copiedIds.push(sectionResult.section.id);
    for (const candidateStep of candidateSection.steps ?? []) {
      const stepResult = addConstructionStep(next, sectionResult.section.id, candidateStep);
      next = stepResult.state;
      copiedIds.push(stepResult.step.id);
      for (const candidateDetail of candidateStep.details ?? []) {
        const safeAssetId = candidateDetail.assetId && next.mediaAssets.some((item) => item.id === candidateDetail.assetId) ? candidateDetail.assetId : null;
        const detailResult = addConstructionDetail(next, stepResult.step.id, { ...candidateDetail, assetId: safeAssetId });
        next = detailResult.state;
        copiedIds.push(detailResult.detail.id);
      }
    }
  }
  const application: CanonicalTemplateApplication = { ...record(state.studioId), templateId, garmentId: spec.garmentId, appliedBy: actorId, appliedAt: new Date().toISOString(), mapping: { copiedIds, sourceVersion: template.version } };
  return { application, state: { ...next, templateApplications: [...next.templateApplications, application] } };
}

export function validateRelease(state: CanonicalWorkspaceState, specId: string, options: { checkpointLabel: string; templateId: string }): ReleasePreview {
  requireSpec(state, specId);
  const issues: CanonicalValidationIssue[] = validateTechnicalSpec(state, specId, true).map((issue) => ({ ...issue, domain: 'flats', severity: issue.code === 'unresolved_critical_annotation' ? 'critical' : issue.severity, waivable: issue.code === 'unresolved_critical_annotation' }));
  const points = state.pomPoints.filter((item) => item.specId === specId);
  if (!points.length) issues.push(issue('pom.missing_points', 'pom', 'pomPoints', 'At least one stable POM point is required.', 'error'));
  for (const point of points) if (!point.method.trim()) issues.push(issue('pom.missing_method', 'pom', `${point.id}.method`, `${point.code} needs a measurement method.`, 'error', point.id));
  const baseSet = state.measurementSets.find((item) => item.specId === specId && item.sampleType === 'base');
  if (!baseSet) issues.push(issue('measurements.missing_base_set', 'measurements', 'measurementSets', 'A base measurement set is required.', 'error'));
  else for (const invalid of validateMeasurementSet(state, baseSet.id)) issues.push(issue(`measurements.${invalid.code}`, 'measurements', `${invalid.pomPointId ?? baseSet.id}`, invalid.message, 'error', invalid.pomPointId));
  issues.push(...validateBom(state, specId));
  issues.push(...validateConstruction(state, specId));
  const sourceFiles = state.technicalFiles.filter((item) => item.specId === specId && item.isSource);
  if (!sourceFiles.length) issues.push(issue('files.missing_source', 'files', 'technicalFiles', 'At least one stored source file is required.', 'error'));
  for (const source of sourceFiles) {
    const asset = state.mediaAssets.find((item) => item.id === source.assetId);
    if (!asset?.checksum || !asset.storagePath) issues.push(issue('files.source_unavailable', 'files', source.id, `${source.versionLabel || 'Source file'} is not durably available.`, 'error', source.id));
    if (asset && !asset.rights.source && !asset.rights.license) issues.push(issue('privacy.source_rights_missing', 'privacy', asset.id, `${asset.name} needs rights or provenance before release.`, 'critical', asset.id, false));
  }
  if (!options.checkpointLabel.trim()) issues.push(issue('release.checkpoint_label', 'release', 'checkpointLabel', 'Name the release checkpoint.', 'error'));
  const template = state.templates.find((item) => item.id === options.templateId && item.templateType === 'tech_pack' && item.status === 'active');
  if (!template) issues.push(issue('release.template_required', 'release', 'templateId', 'Select an active tech-pack template.', 'error'));
  const unique = [...new Map(issues.map((item) => [`${item.code}:${item.entityId ?? item.field}`, item])).values()];
  return { issues: unique, blocking: unique, waivable: unique.filter((item) => item.waivable && item.domain !== 'privacy') };
}

/**
 * Records the same deterministic release-rule evaluation used by the manual
 * release gate without releasing, waiving, or changing technical records.
 */
export function recordTechPackValidationRun(state: CanonicalWorkspaceState, specId: string, actorId: string) {
  const templateId = state.templates.find((item) => item.templateType === 'tech_pack' && item.status === 'active')?.id ?? '';
  const preview = validateRelease(state, specId, { checkpointLabel: 'AI validation review', templateId });
  const hasBlocking = preview.issues.some((item) => item.severity === 'critical' || item.severity === 'error');
  const hasWarnings = preview.issues.some((item) => item.severity === 'warning');
  const run: CanonicalValidationRun = {
    ...record(state.studioId),
    actorId,
    garmentVersionId: null,
    issues: preview.issues,
    ranAt: new Date().toISOString(),
    rulesetVersion: releaseRulesetVersion,
    specId,
    status: hasBlocking ? 'failed' : hasWarnings ? 'warning' : 'passed',
  };
  return { preview, run, state: { ...state, validationRuns: [...state.validationRuns, run] } };
}

export async function releaseTechnicalSpec(state: CanonicalWorkspaceState, input: ReleaseInput) {
  if (!input.actorId) throw new Error('Release requires an authenticated actor.');
  const preview = validateRelease(state, input.specId, input);
  const duplicateWaiver = input.waivers.find((waiver, index) => input.waivers.findIndex((item) => item.ruleCode === waiver.ruleCode) !== index);
  if (duplicateWaiver) throw new Error(`Rule ${duplicateWaiver.ruleCode} may be waived only once.`);
  for (const waiver of input.waivers) {
    const matching = preview.issues.find((item) => item.code === waiver.ruleCode);
    if (!matching) throw new Error(`Waiver rule ${waiver.ruleCode} is not present in this validation run.`);
    if (matching.domain === 'privacy' || !matching.waivable) throw new Error(`${waiver.ruleCode} cannot be waived.`);
    if (waiver.reason.trim().length < 8) throw new Error('Waiver reasons must explain the release decision.');
    if (!waiver.followUpTaskTitle.trim()) throw new Error('Every waiver requires a follow-up task.');
  }
  const waivedCodes = new Set(input.waivers.map((item) => item.ruleCode));
  const blockers = preview.issues.filter((item) => !waivedCodes.has(item.code));
  if (blockers.length) throw new Error(blockers[0].message);
  const checkpoint = await createTechnicalCheckpoint(state, input.specId, input.checkpointLabel, { actorId: input.actorId, kind: 'release', notes: `Protected technical release for ${input.specId}` });
  const now = new Date().toISOString();
  const run: CanonicalValidationRun = { ...record(state.studioId), actorId: input.actorId, garmentVersionId: checkpoint.version.id, issues: preview.issues, ranAt: now, rulesetVersion: releaseRulesetVersion, specId: input.specId, status: input.waivers.length ? 'warning' : 'passed' };
  const spec = requireSpec(state, input.specId);
  const tasks: CanonicalReleaseTask[] = input.waivers.map((waiver, index) => ({ ...record(state.studioId), assigneeId: input.actorId, description: `Release waiver for ${waiver.ruleCode}: ${waiver.reason.trim()}`, dueAt: null, garmentId: spec.garmentId, priority: 'high', sortOrder: state.releaseTasks.filter((task) => task.garmentId === spec.garmentId).length + index, status: 'todo', title: waiver.followUpTaskTitle.trim() }));
  const waivers: CanonicalValidationWaiver[] = input.waivers.map((waiver, index) => ({ ...record(state.studioId), actorId: input.actorId, domain: preview.issues.find((item) => item.code === waiver.ruleCode)!.domain as CanonicalValidationWaiver['domain'], followUpTaskId: tasks[index].id, reason: waiver.reason.trim(), ruleCode: waiver.ruleCode, specId: input.specId, validationRunId: run.id, waivedAt: now }));
  const releasedSpec = touch({ ...spec, releaseValidationRunId: run.id, releaseVersionId: checkpoint.version.id, releasedAt: now, releasedBy: input.actorId, status: 'released' as const });
  const next = {
    ...state,
    garmentVersions: [...state.garmentVersions, checkpoint.version],
    releaseTasks: [...state.releaseTasks, ...tasks],
    technicalSpecs: state.technicalSpecs.map((item) => item.id === spec.id ? releasedSpec : item),
    validationRuns: [...state.validationRuns, run],
    validationWaivers: [...state.validationWaivers, ...waivers],
  };
  return { preview, run, state: next, tasks, version: checkpoint.version, waivers };
}

export function validateBom(state: CanonicalWorkspaceState, specId: string) {
  const items = state.bomItems.filter((item) => item.specId === specId).sort(bySort);
  const issues: CanonicalValidationIssue[] = [];
  if (!items.length) return [issue('bom.missing_items', 'bom', 'bomItems', 'At least one BOM item is required.', 'error')];
  for (const item of items) {
    if (!item.description.trim()) issues.push(issue('bom.description', 'bom', `${item.id}.description`, 'BOM description is required.', 'error', item.id));
    if (!item.placement.trim()) issues.push(issue('bom.placement', 'bom', `${item.id}.placement`, `${item.description || 'BOM item'} needs a placement.`, 'error', item.id));
    if (!(item.quantity > 0) || !quantityUnits.includes(item.unit)) issues.push(issue('bom.quantity_unit', 'bom', `${item.id}.quantity`, `${item.description || 'BOM item'} needs a positive quantity and valid unit.`, 'error', item.id));
    if (!validBomUnit(item.itemType, item.unit)) issues.push(issue('bom.unit_mismatch', 'bom', `${item.id}.unit`, `${item.unit} is not valid for this ${item.itemType.replace('_', ' ')}.`, 'error', item.id));
    if (item.itemType === 'custom' && !item.intentionalFreeText) issues.push(issue('bom.unintentional_free_text', 'bom', `${item.id}.intentionalFreeText`, 'Free-text BOM rows must be explicitly intentional.', 'error', item.id));
    if (item.itemType === 'material_variant' && !state.materialVariants.some((variant) => variant.id === item.materialVariantId)) issues.push(issue('bom.missing_material_link', 'bom', `${item.id}.materialVariantId`, `${item.description} needs a material variant link.`, 'error', item.id));
    if (item.itemType === 'component_variant' && !state.componentVariants.some((variant) => variant.id === item.componentVariantId)) issues.push(issue('bom.missing_component_link', 'bom', `${item.id}.componentVariantId`, `${item.description} needs a component variant link.`, 'error', item.id));
    if (item.supplierItemId && !supplierMatchesItem(state, item)) issues.push(issue('bom.supplier_mismatch', 'bom', `${item.id}.supplierItemId`, `${item.description} has a supplier offer for a different variant.`, 'error', item.id));
    if (item.itemType !== 'custom' && matchingOffers(state, item).length > 0 && !item.supplierItemId) issues.push(issue('bom.missing_supplier_offer', 'bom', `${item.id}.supplierItemId`, `${item.description} has supplier offers but none is selected.`, 'warning', item.id, true));
    if (item.substituteItemId && !state.bomItems.some((candidate) => candidate.id === item.substituteItemId && candidate.specId === specId && candidate.id !== item.id)) issues.push(issue('bom.invalid_substitute', 'bom', `${item.id}.substituteItemId`, `${item.description} has an invalid substitute.`, 'error', item.id));
    if (item.status === 'draft') issues.push(issue('bom.status_incomplete', 'bom', `${item.id}.status`, `${item.description} needs a resolved status.`, 'error', item.id));
    if (item.shortageQuantity > 0 || item.status === 'shortage') issues.push(issue('bom.shortage', 'bom', `${item.id}.shortageQuantity`, `${item.description} has a shortage of ${item.shortageQuantity} ${item.unit}.`, 'warning', item.id, true));
  }
  return issues;
}

export function validateConstruction(state: CanonicalWorkspaceState, specId: string) {
  const sections = state.constructionSections.filter((item) => item.specId === specId).sort(bySort);
  const issues: CanonicalValidationIssue[] = [];
  if (!sections.length) return [issue('construction.missing_sections', 'construction', 'constructionSections', 'At least one ordered construction section is required.', 'error')];
  for (const section of sections) {
    const steps = state.constructionSteps.filter((item) => item.sectionId === section.id).sort(bySort);
    if (!steps.length) issues.push(issue('construction.empty_section', 'construction', section.id, `${section.name} needs at least one operation.`, 'error', section.id));
    for (const step of steps) {
      if (!step.operation.trim()) issues.push(issue('construction.missing_operation', 'construction', `${step.id}.operation`, `Step ${step.stepNumber} needs an operation.`, 'error', step.id));
      if (step.machineRequired && !step.machine.trim()) issues.push(issue('construction.missing_machine', 'construction', `${step.id}.machine`, `${step.operation} requires a machine specification.`, 'error', step.id));
      if (step.stitchRequired && !step.stitchSpec.trim()) issues.push(issue('construction.missing_stitch', 'construction', `${step.id}.stitchSpec`, `${step.operation} requires a stitch or seam specification.`, 'error', step.id));
      if (step.status === 'draft') issues.push(issue('construction.step_draft', 'construction', `${step.id}.status`, `${step.operation} is still draft.`, 'error', step.id));
      for (const detail of state.constructionDetails.filter((item) => item.stepId === step.id && item.status === 'open')) {
        const severity = detail.severity === 'critical' ? 'critical' : 'warning';
        issues.push(issue(`construction.open_${detail.severity}_callout`, 'construction', `${detail.id}.status`, detail.callout, severity, detail.id, true));
      }
    }
  }
  return issues;
}

export async function buildStructuredTechPack(state: CanonicalWorkspaceState, specId: string, garmentVersionId: string, templateId: string) {
  const spec = requireSpec(state, specId);
  if (spec.status !== 'released' || spec.releaseVersionId !== garmentVersionId) throw new Error('Generate the tech pack from the approved release version.');
  const version = state.garmentVersions.find((item) => item.id === garmentVersionId && item.garmentId === spec.garmentId);
  if (!version) throw new Error('Approved garment release version not found.');
  const template = state.templates.find((item) => item.id === templateId && item.templateType === 'tech_pack' && item.status === 'active');
  if (!template) throw new Error('Active tech-pack template not found.');
  const snapshot = version.snapshot;
  const sections: StructuredTechPackSection[] = [
    { id: 'overview', title: 'Garment and specification', records: { garment: snapshot.garment, spec: snapshot.spec } },
    { id: 'flats', title: 'Approved flats and annotations', records: { flats: snapshot.flats } },
    { id: 'pom_measurements', title: 'POM and measurements', records: { pomPoints: snapshot.pomPoints, measurementSets: snapshot.measurementSets, measurementValues: snapshot.measurementValues, sampleRounds: snapshot.sampleRounds, fitMeasurements: snapshot.fitMeasurements } },
    { id: 'bom', title: 'Bill of materials', records: { items: snapshot.bomItems, catalog: snapshot.bomCatalog } },
    { id: 'construction', title: 'Construction sequence', records: { sections: snapshot.constructionSections, steps: snapshot.constructionSteps, details: snapshot.constructionDetails } },
    { id: 'grading_files', title: 'Grading and source files', records: { gradeRules: snapshot.gradeRules, gradeRuleValues: snapshot.gradeRuleValues, technicalFiles: snapshot.technicalFiles, technicalFileAssets: snapshot.technicalFileAssets } },
  ];
  const sectionManifest: TechPackSectionManifestItem[] = [];
  for (const section of sections) sectionManifest.push({ checksum: await checksumText(stableStringify(section.records)), id: section.id, recordCount: countRecords(section.records), title: section.title });
  return { sectionManifest, sections, spec, template, version };
}

export async function generateDeterministicTechPack(
  state: CanonicalWorkspaceState,
  specId: string,
  garmentVersionId: string,
  templateId: string,
  loadSource: (assetId: string) => Promise<Blob | Uint8Array | null>,
) {
  const structured = await buildStructuredTechPack(state, specId, garmentVersionId, templateId);
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const fixedDate = new Date('1980-01-01T00:00:00.000Z');
  for (const [index, section] of structured.sections.entries()) zip.file(`sections/${String(index + 1).padStart(2, '0')}-${section.id}.json`, stableStringify(section.records), { createFolders: false, date: fixedDate });
  const snapshot = structured.version.snapshot as { technicalFiles?: Array<{ assetId: string; id: string; isSource: boolean; versionLabel: string }>; technicalFileAssets?: Array<{ assetId: string; checksum: string; mimeType: string; name: string; sizeBytes: number }> };
  const sourceManifest: Array<{ assetId: string; checksum: string; mimeType: string; name: string; sizeBytes: number; versionLabel: string }> = [];
  const sources = (snapshot.technicalFiles ?? []).filter((item) => item.isSource).sort((a, b) => a.assetId.localeCompare(b.assetId));
  for (const [index, source] of sources.entries()) {
    const asset = (snapshot.technicalFileAssets ?? []).find((item) => item.assetId === source.assetId);
    if (!asset) throw new Error(`Source manifest is missing asset ${source.assetId}.`);
    const bytes = await loadSource(source.assetId);
    if (!bytes) throw new Error(`${asset.name} source bytes are unavailable.`);
    const name = `${String(index + 1).padStart(2, '0')}-${safeFilename(asset.name)}`;
    zip.file(`sources/${name}`, bytes, { binary: true, createFolders: false, date: fixedDate });
    sourceManifest.push({ ...asset, versionLabel: source.versionLabel });
  }
  const manifest = {
    format: 'mystic-lore-tech-pack',
    schemaVersion: 1,
    rulesetVersion: releaseRulesetVersion,
    sourceGarmentVersion: { checksum: structured.version.checksum, id: structured.version.id, label: structured.version.label, versionNo: structured.version.versionNo },
    template: { id: structured.template.id, name: structured.template.name, version: structured.template.version },
    sections: structured.sectionManifest,
    sources: sourceManifest,
  };
  zip.file('manifest.json', stableStringify(manifest), { createFolders: false, date: fixedDate });
  const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 9 }, platform: 'UNIX' });
  return { bytes, checksum: await checksumBytes(bytes), manifest, sectionManifest: structured.sectionManifest };
}

export function validBomUnit(itemType: CanonicalBomItem['itemType'], unit: CanonicalBomItem['unit']) {
  if (itemType === 'component_variant') return componentQuantityUnits.includes(unit);
  if (itemType === 'material_variant') return materialQuantityUnits.includes(unit);
  return quantityUnits.includes(unit);
}

function assertBomInput(state: CanonicalWorkspaceState, input: BomItemInput | CanonicalBomItem) {
  requireSpec(state, input.specId);
  if (!input.description.trim()) throw new Error('BOM description is required.');
  if (!(input.quantity > 0) || !Number.isFinite(input.quantity)) throw new Error('BOM quantity must be greater than zero.');
  if (!validBomUnit(input.itemType, input.unit)) throw new Error(`${input.unit} is not valid for ${input.itemType.replace('_', ' ')} rows.`);
  if (input.itemType === 'custom') {
    if (!input.intentionalFreeText) throw new Error('Custom BOM rows must be explicitly marked intentional free text.');
    if (input.materialVariantId || input.componentVariantId) throw new Error('Intentional free text cannot also hide a canonical variant link.');
  } else if (input.intentionalFreeText) throw new Error('Linked BOM rows cannot be marked free text.');
  if (input.itemType === 'material_variant' && (!input.materialVariantId || !state.materialVariants.some((item) => item.id === input.materialVariantId))) throw new Error('Select an existing material variant.');
  if (input.itemType === 'component_variant' && (!input.componentVariantId || !state.componentVariants.some((item) => item.id === input.componentVariantId))) throw new Error('Select an existing component variant.');
  if (input.supplierItemId) {
    const candidate = { ...input, id: 'candidate' } as CanonicalBomItem;
    if (!supplierMatchesItem(state, candidate)) throw new Error('The supplier offer must reference the selected variant.');
  }
  if ((input.shortageQuantity ?? 0) < 0 || (input.unitCost ?? 0) < 0) throw new Error('Shortage and unit cost cannot be negative.');
}

function assertConstructionStep(input: ConstructionStepInput) {
  if (!input.operation.trim()) throw new Error('Construction operation is required.');
  if (input.machineRequired && !input.machine?.trim()) throw new Error('This operation requires a machine specification.');
  if (input.stitchRequired && !input.stitchSpec?.trim()) throw new Error('This operation requires a stitch or seam specification.');
  if (input.seamAllowance != null && (!Number.isFinite(input.seamAllowance) || input.seamAllowance < 0)) throw new Error('Seam allowance cannot be negative.');
}

function assertSubstitute(state: CanonicalWorkspaceState, item: CanonicalBomItem, substituteId: string) {
  const substitute = state.bomItems.find((candidate) => candidate.id === substituteId);
  if (!substitute || substitute.specId !== item.specId || substitute.id === item.id) throw new Error('A substitute must be another BOM row in the same specification.');
}

function matchingOffers(state: CanonicalWorkspaceState, item: Pick<CanonicalBomItem, 'itemType' | 'materialVariantId' | 'componentVariantId'>) {
  return state.supplierItems.filter((offer) => item.itemType === 'material_variant' ? offer.materialVariantId === item.materialVariantId : item.itemType === 'component_variant' ? offer.componentVariantId === item.componentVariantId : false);
}

function supplierMatchesItem(state: CanonicalWorkspaceState, item: Pick<CanonicalBomItem, 'itemType' | 'materialVariantId' | 'componentVariantId' | 'supplierItemId'>) {
  return matchingOffers(state, item).some((offer) => offer.id === item.supplierItemId);
}

function supplierCost(state: CanonicalWorkspaceState, supplierItemId?: string | null) { return state.supplierItems.find((item) => item.id === supplierItemId)?.unitCost ?? 0; }
function requireBomItem(state: CanonicalWorkspaceState, id: string) { const item = state.bomItems.find((candidate) => candidate.id === id); if (!item) throw new Error('BOM item not found.'); return item; }
function requireStep(state: CanonicalWorkspaceState, id: string) { const step = state.constructionSteps.find((candidate) => candidate.id === id); if (!step) throw new Error('Construction step not found.'); return step; }
function requireSpec(state: CanonicalWorkspaceState, id: string) { const spec = state.technicalSpecs.find((candidate) => candidate.id === id); if (!spec) throw new Error('Technical specification not found.'); return spec; }
function normalized(anchor: { x: number; y: number }) { return Number.isFinite(anchor.x) && Number.isFinite(anchor.y) && anchor.x >= 0 && anchor.x <= 1 && anchor.y >= 0 && anchor.y <= 1; }
function bySort<T extends { id: string; sortOrder: number }>(a: T, b: T) { return a.sortOrder - b.sortOrder || a.id.localeCompare(b.id); }
function decimal(value: number) { if (!Number.isFinite(value)) throw new Error('Numeric value is invalid.'); return Number(value.toFixed(4)); }
function record(studioId: string) { const now = new Date().toISOString(); return { createdAt: now, id: crypto.randomUUID(), revision: 1, studioId, updatedAt: now }; }
function touch<T extends { revision: number; updatedAt: string }>(value: T): T { return { ...value, revision: value.revision + 1, updatedAt: new Date().toISOString() }; }
function issue(code: string, domain: NonNullable<CanonicalValidationIssue['domain']>, field: string, message: string, severity: CanonicalValidationIssue['severity'], entityId?: string, waivable = false): CanonicalValidationIssue { return { code, domain, entityId, field, message, severity, waivable }; }
function countRecords(value: unknown): number { if (Array.isArray(value)) return value.length; if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).reduce<number>((total, item) => total + (Array.isArray(item) ? item.length : item == null ? 0 : 1), 0); return value == null ? 0 : 1; }
function safeFilename(value: string) { return value.trim().replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-|-$/g, '') || 'source'; }
export function stableStringify(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`; if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(',')}}`; return JSON.stringify(value) ?? 'null'; }
async function checksumBytes(bytes: Uint8Array) { const copy = Uint8Array.from(bytes); const digest = await crypto.subtle.digest('SHA-256', copy.buffer); return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join(''); }
