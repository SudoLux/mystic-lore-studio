import type {
  CanonicalFlatAnnotation,
  CanonicalGarmentVersion,
  CanonicalTechPackExport,
  CanonicalTechnicalFlat,
  CanonicalTechnicalSpec,
  CanonicalValidationIssue,
  CanonicalValidationRun,
  CanonicalWorkspaceState,
  FreezeFrameKind,
  TechnicalFlatView,
} from '../workspace';
import { flatViewOptions, requiredFlatViews, technicalRulesetVersion, type FlatComparison, type TechnicalCommand } from './contracts';

export function executeTechnicalCommand(state: CanonicalWorkspaceState, command: TechnicalCommand) {
  if (command.type === 'create_spec') return createSpec(state, command.garmentId, command.baseSize, command.unit).state;
  if (command.type === 'register_flat') return registerFlat(state, command.specId, command.assetId, command.view, command.versionLabel).state;
  if (command.type === 'add_annotation') return addFlatAnnotation(state, command).state;
  if (command.type === 'set_annotation_status') return setAnnotationStatus(state, command.annotationId, command.status);
  if (command.type === 'approve_flat') return approveFlat(state, command.flatId, command.approvedBy ?? null);
  return recordValidationRun(state, command.specId).state;
}

export function createSpec(state: CanonicalWorkspaceState, garmentId: string, baseSize: string, unit: 'mm' | 'cm' | 'in') {
  const existing = state.technicalSpecs.find((item) => item.garmentId === garmentId);
  if (existing) return { spec: existing, state };
  if (!state.garments.some((item) => item.id === garmentId)) throw new Error('The garment does not exist in this studio.');
  const spec: CanonicalTechnicalSpec = { ...record(state.studioId), garmentId, status: 'draft', baseSize: baseSize.trim() || 'M', unit, revisionLabel: 'A', releaseVersionId: null, releaseValidationRunId: null, releasedBy: null, releasedAt: null };
  return { spec, state: { ...state, technicalSpecs: [...state.technicalSpecs, spec] } };
}

export function registerFlat(state: CanonicalWorkspaceState, specId: string, assetId: string, view: TechnicalFlatView, versionLabel: string) {
  const spec = state.technicalSpecs.find((item) => item.id === specId);
  if (!spec) throw new Error('Create a technical specification before adding flats.');
  if (!flatViewOptions.includes(view)) throw new Error('Unsupported flat view.');
  if (!state.mediaAssets.some((item) => item.id === assetId)) throw new Error('The flat must reference a stored media asset.');
  const nextSort = state.technicalFlats.filter((item) => item.specId === specId && item.view === view).length;
  const flat: CanonicalTechnicalFlat = { ...record(state.studioId), specId, view, assetId, source: 'uploaded', approvedAt: null, approvedBy: null, sortOrder: nextSort };
  const technicalFile = { ...record(state.studioId), specId, assetId, fileType: 'reference' as const, versionLabel, isSource: true };
  return { flat, state: { ...state, technicalFiles: [...state.technicalFiles, technicalFile], technicalFlats: [...state.technicalFlats, flat] } };
}

export function addFlatAnnotation(state: CanonicalWorkspaceState, command: Extract<TechnicalCommand, { type: 'add_annotation' }>) {
  if (!state.technicalFlats.some((item) => item.id === command.flatId)) throw new Error('The flat does not exist.');
  if (command.anchor.x < 0 || command.anchor.x > 1 || command.anchor.y < 0 || command.anchor.y > 1) throw new Error('Annotation anchors must be normalized between 0 and 1.');
  const annotation: CanonicalFlatAnnotation = { ...record(state.studioId), flatId: command.flatId, anchor: command.anchor, label: command.label.trim(), detail: command.detail?.trim() ?? '', severity: command.severity, status: 'open', sortOrder: state.flatAnnotations.filter((item) => item.flatId === command.flatId).length };
  return { annotation, state: { ...state, flatAnnotations: [...state.flatAnnotations, annotation] } };
}

export function setAnnotationStatus(state: CanonicalWorkspaceState, annotationId: string, status: CanonicalFlatAnnotation['status']) {
  return { ...state, flatAnnotations: state.flatAnnotations.map((item) => item.id === annotationId ? touch({ ...item, status }) : item) };
}

export function activeFlat(state: CanonicalWorkspaceState, specId: string, view: TechnicalFlatView) {
  return state.technicalFlats.filter((item) => item.specId === specId && item.view === view).sort((a, b) => b.sortOrder - a.sortOrder || b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}

export function validateTechnicalSpec(state: CanonicalWorkspaceState, specId: string, exportReadiness = false): CanonicalValidationIssue[] {
  const issues: CanonicalValidationIssue[] = [];
  for (const view of requiredFlatViews) {
    const flat = activeFlat(state, specId, view);
    if (!flat) { issues.push({ code: 'missing_required_view', field: view, message: `${title(view)} flat is required.`, severity: 'error' }); continue; }
    const mapping = state.technicalFiles.find((item) => item.specId === specId && item.assetId === flat.assetId && item.isSource);
    const asset = state.mediaAssets.find((item) => item.id === flat.assetId);
    if (!mapping || !asset?.checksum || !asset.localBlobKey) issues.push({ code: 'missing_source_mapping', entityId: flat.id, field: `${view}.source`, message: `${title(view)} needs a stored source file and checksum.`, severity: 'error' });
    if (state.flatAnnotations.some((item) => item.flatId === flat.id && item.severity === 'critical' && item.status === 'open')) issues.push({ code: 'unresolved_critical_annotation', entityId: flat.id, field: `${view}.annotations`, message: `${title(view)} has unresolved critical annotations.`, severity: 'error' });
    if (exportReadiness && !flat.approvedAt) issues.push({ code: 'unapproved_required_view', entityId: flat.id, field: `${view}.approval`, message: `${title(view)} must be approved before export.`, severity: 'error' });
  }
  return issues;
}

export function approveFlat(state: CanonicalWorkspaceState, flatId: string, approvedBy: string | null) {
  const flat = state.technicalFlats.find((item) => item.id === flatId);
  if (!flat) throw new Error('The flat does not exist.');
  const issues = validateSingleFlat(state, flat);
  if (issues.length) throw new Error(issues[0].message);
  const approved = { ...state, technicalFlats: state.technicalFlats.map((item) => item.id === flatId ? touch({ ...item, approvedAt: new Date().toISOString(), approvedBy }) : item) };
  const ready = validateTechnicalSpec(approved, flat.specId, true).length === 0;
  return { ...approved, technicalSpecs: approved.technicalSpecs.map((item) => item.id === flat.specId ? touch({ ...item, status: ready ? 'approved' as const : 'in_review' as const }) : item) };
}

export function recordValidationRun(state: CanonicalWorkspaceState, specId: string) {
  const issues = validateTechnicalSpec(state, specId, true);
  const run: CanonicalValidationRun = { ...record(state.studioId), specId, garmentVersionId: null, status: issues.length ? 'failed' : 'passed', rulesetVersion: technicalRulesetVersion, issues, ranAt: new Date().toISOString(), actorId: null };
  return { run, state: { ...state, validationRuns: [...state.validationRuns, run] } };
}

export function prepareFlatComparison(state: CanonicalWorkspaceState, specId: string, view: TechnicalFlatView): FlatComparison | null {
  const revisions = state.technicalFlats.filter((item) => item.specId === specId && item.view === view).sort((a, b) => b.sortOrder - a.sortOrder);
  if (!revisions[0]) return null;
  const entry = (flat: CanonicalTechnicalFlat) => ({ assetId: flat.assetId, checksum: state.mediaAssets.find((asset) => asset.id === flat.assetId)?.checksum ?? '', flatId: flat.id, revisionLabel: state.technicalFiles.find((file) => file.specId === specId && file.assetId === flat.assetId)?.versionLabel ?? '?' });
  return { current: entry(revisions[0]), previous: revisions[1] ? entry(revisions[1]) : null, view };
}

export async function createTechnicalCheckpoint(state: CanonicalWorkspaceState, specId: string, label?: string, options: { actorId?: string | null; kind?: FreezeFrameKind; notes?: string } = {}) {
  const spec = state.technicalSpecs.find((item) => item.id === specId);
  if (!spec) throw new Error('Technical specification not found.');
  const garment = state.garments.find((item) => item.id === spec.garmentId)!;
  const flats = requiredFlatViews.map((view) => activeFlat(state, specId, view));
  const setIds = new Set(state.measurementSets.filter((item) => item.specId === specId).map((item) => item.id));
  const ruleIds = new Set(state.gradeRules.filter((item) => item.specId === specId).map((item) => item.id));
  const sectionIds = new Set(state.constructionSections.filter((item) => item.specId === specId).map((item) => item.id));
  const stepIds = new Set(state.constructionSteps.filter((item) => sectionIds.has(item.sectionId)).map((item) => item.id));
  const pomIds = new Set(state.pomPoints.filter((item) => item.specId === specId).map((item) => item.id));
  const sourceFiles = state.technicalFiles.filter((item) => item.specId === specId).sort((a, b) => a.id.localeCompare(b.id));
  const sourceAssetIds = new Set(sourceFiles.map((item) => item.assetId));
  const bomItems = state.bomItems.filter((item) => item.specId === specId).sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
  const referencedSupplierItemIds = new Set(bomItems.flatMap((item) => item.supplierItemId ? [item.supplierItemId] : []));
  const snapshot = {
    garment: { id: garment.id, code: garment.garmentCode, revision: garment.revision },
    spec: { id: spec.id, revisionLabel: spec.revisionLabel, unit: spec.unit },
    flats: flats.map((flat) => ({ view: flat?.view, checksum: state.mediaAssets.find((asset) => asset.id === flat?.assetId)?.checksum, annotations: state.flatAnnotations.filter((item) => item.flatId === flat?.id) })),
    pomPoints: state.pomPoints.filter((item) => item.specId === specId),
    measurementSets: state.measurementSets.filter((item) => item.specId === specId),
    measurementValues: state.measurementValues.filter((item) => setIds.has(item.setId)),
    gradeRules: state.gradeRules.filter((item) => item.specId === specId),
    gradeRuleValues: state.gradeRuleValues.filter((item) => ruleIds.has(item.gradeRuleId)),
    sampleRounds: state.sampleRounds.filter((item) => item.garmentId === garment.id),
    fitMeasurements: state.fitMeasurements.filter((item) => pomIds.has(item.pomPointId)),
    bomItems,
    bomCatalog: {
      materialVariants: state.materialVariants.filter((item) => bomItems.some((bom) => bom.materialVariantId === item.id)),
      componentVariants: state.componentVariants.filter((item) => bomItems.some((bom) => bom.componentVariantId === item.id)),
      supplierItems: state.supplierItems.filter((item) => referencedSupplierItemIds.has(item.id)),
      suppliers: state.suppliers.filter((item) => state.supplierItems.some((offer) => referencedSupplierItemIds.has(offer.id) && offer.supplierId === item.id)),
    },
    constructionSections: state.constructionSections.filter((item) => item.specId === specId).sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)),
    constructionSteps: state.constructionSteps.filter((item) => sectionIds.has(item.sectionId)).sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)),
    constructionDetails: state.constructionDetails.filter((item) => stepIds.has(item.stepId)).sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)),
    technicalFiles: sourceFiles,
    technicalFileAssets: state.mediaAssets.filter((item) => sourceAssetIds.has(item.id)).map((item) => ({ assetId: item.id, checksum: item.checksum, mimeType: item.mimeType, name: item.name, sizeBytes: item.sizeBytes })),
    templateApplications: state.templateApplications.filter((item) => item.garmentId === garment.id),
  };
  const versionSnapshot = {
    ...snapshot,
    domains: {
      technical: {
        bomItems: snapshot.bomItems,
        constructionDetails: snapshot.constructionDetails,
        constructionSections: snapshot.constructionSections,
        constructionSteps: snapshot.constructionSteps,
        flatAnnotations: state.flatAnnotations.filter((item) => state.technicalFlats.some((flat) => flat.specId === specId && flat.id === item.flatId)),
        gradeRuleValues: snapshot.gradeRuleValues,
        gradeRules: snapshot.gradeRules,
        measurementSets: snapshot.measurementSets,
        measurementValues: snapshot.measurementValues,
        mediaAssets: state.mediaAssets.filter((item) => sourceAssetIds.has(item.id)),
        pomPoints: snapshot.pomPoints,
        technicalFiles: snapshot.technicalFiles,
        technicalFlats: state.technicalFlats.filter((item) => item.specId === specId),
        technicalSpecs: [spec],
      },
    },
    garment: { ...garment, code: garment.garmentCode },
    schemaVersion: 1,
    scope: 'technical',
  };
  const checksum = await checksumText(stableStringify(versionSnapshot));
  const versionNo = state.garmentVersions.filter((item) => item.garmentId === garment.id).length + 1;
  const parentVersionId = state.garmentVersions.filter((item) => item.garmentId === garment.id).sort((a, b) => b.versionNo - a.versionNo)[0]?.id ?? null;
  const version: CanonicalGarmentVersion = {
    ...record(state.studioId),
    baseRevision: garment.revision,
    checksum,
    createdBy: options.actorId ?? null,
    garmentId: garment.id,
    kind: options.kind ?? 'named',
    label: label?.trim() || `Technical v${versionNo}`,
    notes: options.notes?.trim() ?? '',
    parentVersionId,
    scope: 'technical',
    snapshot: versionSnapshot,
    versionNo,
  };
  return { version, state: { ...state, garmentVersions: [...state.garmentVersions, version] } };
}

export function registerExport(state: CanonicalWorkspaceState, input: Omit<CanonicalTechPackExport, keyof ReturnType<typeof record>>) {
  const exportRecord: CanonicalTechPackExport = { ...record(state.studioId), ...input };
  return { exportRecord, state: { ...state, techPackExports: [...state.techPackExports, exportRecord] } };
}

export function deterministicExportFilename(garmentCode: string, versionNo: number, templateVersion: number, checksum: string, format: 'pdf' | 'zip') {
  const safe = garmentCode.trim().replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-|-$/g, '') || 'garment';
  return `${safe}-tech-v${String(versionNo).padStart(3, '0')}-template-v${templateVersion}-${checksum.slice(0, 8)}.${format}`;
}

export async function checksumText(text: string) { const bytes = new TextEncoder().encode(text); const digest = await crypto.subtle.digest('SHA-256', bytes); return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join(''); }
function validateSingleFlat(state: CanonicalWorkspaceState, flat: CanonicalTechnicalFlat) { const asset = state.mediaAssets.find((item) => item.id === flat.assetId); const file = state.technicalFiles.find((item) => item.specId === flat.specId && item.assetId === flat.assetId && item.isSource); if (!asset?.storagePath || !asset.checksum || !file) return [{ message: 'Store and map the source file before approval.' }]; if (state.flatAnnotations.some((item) => item.flatId === flat.id && item.severity === 'critical' && item.status === 'open')) return [{ message: 'Resolve critical annotations before approval.' }]; return []; }
function record(studioId: string) { const now = new Date().toISOString(); return { createdAt: now, id: crypto.randomUUID(), revision: 1, studioId, updatedAt: now }; }
function touch<T extends { revision: number; updatedAt: string }>(value: T) { return { ...value, revision: value.revision + 1, updatedAt: new Date().toISOString() }; }
function title(value: string) { return value[0].toUpperCase() + value.slice(1); }
function stableStringify(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`; if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(',')}}`; return JSON.stringify(value); }
