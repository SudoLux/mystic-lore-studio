import type { CanonicalWorkspaceState } from '../workspace';
import type { CanonicalMutableEntity, CanonicalMutation } from './contracts';

type WorkspaceArrayKey = {
  [K in keyof CanonicalWorkspaceState]: CanonicalWorkspaceState[K] extends unknown[] ? K : never
}[keyof CanonicalWorkspaceState];

export type CanonicalCodec = {
  table: string;
  stateKey: WorkspaceArrayKey | null;
  mutable: boolean;
  entityType?: CanonicalMutableEntity;
  aliases?: Record<string, string>;
};

const commonJsonAliases: Record<string, string> = {
  anchor: 'anchor_json',
  background: 'background_json',
  candidate: 'candidate_json',
  capabilities: 'capabilities_json',
  caseStudy: 'case_study_json',
  confidence: 'confidence_json',
  content: 'content_json',
  dependencies: 'dependency_json',
  diagramAnchor: 'diagram_anchor_json',
  exportSettings: 'export_settings_json',
  fieldManifest: 'field_manifest_json',
  issues: 'issues_json',
  layout: 'layout_json',
  manifest: 'manifest_json',
  mapping: 'mapping_json',
  mediaManifest: 'media_manifest_json',
  modelProfile: 'model_profile_json',
  payload: 'payload_json',
  position: 'position_json',
  provenance: 'provenance_json',
  rights: 'rights_json',
  scope: 'scope_json',
  sectionManifest: 'section_manifest_json',
  selectedKeys: 'selected_keys_json',
  settings: 'settings_json',
  snapshot: 'snapshot_json',
  spec: 'spec_json',
  transition: 'transition_json',
  usage: 'usage_json',
};

const codec = (
  stateKey: WorkspaceArrayKey | null,
  table: string,
  mutable = true,
  aliases: Record<string, string> = {},
): CanonicalCodec => ({
  aliases: { ...commonJsonAliases, ...aliases },
  entityType: mutable ? table as CanonicalMutableEntity : undefined,
  mutable,
  stateKey,
  table,
});

/**
 * One explicit registry owns every WP3-WP9 collection. Relationship selections
 * are materialized into their join tables below; no relationship is serialized
 * into a JSON transport column.
 */
export const canonicalCodecRegistry = [
  codec('collections', 'collections'),
  codec('garments', 'garments'),
  codec('suppliers', 'suppliers'),
  codec('factories', 'factories'),
  codec('designBriefs', 'design_briefs'),
  codec('moodboards', 'inspiration_boards'),
  codec('moodboardItems', 'inspiration_items'),
  codec('mediaAssets', 'media_assets', true, { name: 'original_filename' }),
  codec('garmentMedia', 'garment_media'),
  codec('mediaDerivatives', 'media_derivatives', true, { assetId: 'source_asset_id' }),
  codec('annotations', 'design_annotations'),
  codec('materials', 'materials'),
  codec('materialVariants', 'material_variants'),
  codec('inventoryEntries', 'inventory_entries'),
  codec('garmentMaterials', 'garment_materials'),
  codec('components', 'components'),
  codec('componentVariants', 'component_variants'),
  codec('garmentComponents', 'garment_components'),
  codec('supplierItems', 'supplier_items'),
  codec('technicalSpecs', 'technical_specs'),
  codec('technicalFlats', 'technical_flats'),
  codec('flatAnnotations', 'flat_annotations'),
  codec('technicalFiles', 'technical_files'),
  codec('pomPoints', 'pom_points'),
  codec('measurementSets', 'measurement_sets'),
  codec('measurementValues', 'measurement_values'),
  codec('gradeRules', 'grade_rules', true, { sizeRange: 'size_range_json' }),
  codec('gradeRuleValues', 'grade_rule_values'),
  codec('fitMeasurements', 'fit_measurements'),
  codec('bomItems', 'bom_items'),
  codec('constructionSections', 'construction_sections'),
  codec('constructionSteps', 'construction_steps'),
  codec('constructionDetails', 'construction_details'),
  codec('templates', 'technical_templates'),
  codec('templateApplications', 'template_applications', false),
  codec('validationRuns', 'validation_runs', false, { actorId: 'created_by', issues: 'result_json', ranAt: 'created_at' }),
  codec('validationWaivers', 'validation_waivers', false),
  codec('techPackExports', 'tech_pack_exports', false),
  codec('garmentVersions', 'garment_versions', false, { kind: 'version_kind' }),
  codec('entityRevisions', 'entity_revisions', false, { scope: 'scope' }),
  codec('changeEvents', 'change_events', false, { relatedOperationIds: 'related_operation_ids' }),
  codec('restoreOperations', 'restore_operations', false),
  codec('sampleRounds', 'sample_rounds'),
  codec('sampleRoundMedia', 'sample_round_media'),
  codec('fitSessions', 'fit_sessions'),
  codec('fitSessionMedia', 'fit_session_media'),
  codec('fitIssues', 'fit_issues'),
  codec('fitIssuePromotions', 'fit_issue_promotions'),
  codec('costSheets', 'cost_sheets', true, { marginPercent: 'margin_pct' }),
  codec('costItems', 'cost_items', true, { wastePercent: 'waste_pct' }),
  codec('productionOrders', 'production_orders'),
  codec('productionMilestones', 'production_milestones'),
  codec('qcTemplates', 'qc_templates'),
  codec('qcTemplateChecks', 'qc_template_checks'),
  codec('qcInspections', 'qc_inspections'),
  codec('qcResults', 'qc_results'),
  codec('qcWaivers', 'qc_waivers', false),
  codec('editorialCollections', 'editorial_collections', true, { primaryGarmentId: 'garment_id' }),
  codec('editorialCollectionGarments', 'editorial_collection_garments'),
  codec('editorialScenes', 'editorial_scenes'),
  codec('editorialBlocks', 'editorial_blocks'),
  codec('editorialAssets', 'editorial_assets'),
  codec('editorialExports', 'editorial_exports', false),
  codec('portfolioProfiles', 'portfolio_profiles', true, { email: 'public_email' }),
  codec('portfolioProjects', 'portfolio_projects'),
  codec(null, 'portfolio_project_assets'),
  codec('portfolioEditorials', 'portfolio_editorials'),
  codec(null, 'portfolio_editorial_scenes'),
  codec(null, 'portfolio_editorial_assets'),
  codec('portfolioTechnicalExcerpts', 'portfolio_technical_excerpts', true, { projectId: 'portfolio_project_id' }),
  codec('releaseTasks', 'tasks'),
  codec('calendarEvents', 'calendar_events'),
  codec('aiJobs', 'ai_jobs', true, { jobType: 'job_type', promptTemplateVersion: 'prompt_version', selectedModel: 'model' }),
  codec('aiInputRefs', 'ai_job_input_refs', true, { jobId: 'ai_job_id' }),
  codec('aiArtifacts', 'ai_artifacts', false, { artifactType: 'artifact_type', jobId: 'ai_job_id', fields: 'field_manifest_json' }),
  codec('aiAcceptances', 'ai_artifact_acceptances', false, { artifactId: 'ai_artifact_id' }),
  codec('aiAcceptanceCommands', 'ai_acceptance_commands', false),
] as const satisfies readonly CanonicalCodec[];

export const privateHydrationCodecs = canonicalCodecRegistry;

const omittedClientFields = new Set([
  'inputRefIds', 'localBlobKey', 'storageState', 'selectedAssetIds',
  'selectedSceneIds', 'includeTechnicalExcerpt',
]);

const serverOwnedClientFields: Record<string, Set<string>> = {
  ai_jobs: new Set(['requestedBy', 'status', 'startedAt', 'completedAt', 'errorCode']),
  cost_sheets: new Set(['approvedBy']),
  design_annotations: new Set(['authorId']),
  editorial_collections: new Set(['approvedBy', 'publishedBy']),
  fit_issue_promotions: new Set(['createdBy']),
  inventory_entries: new Set(['actorId']),
  media_assets: new Set(['createdBy']),
  portfolio_technical_excerpts: new Set(['approvedBy']),
  production_orders: new Set(['approvedBy']),
  qc_inspections: new Set(['inspectedBy', 'releaseDecision', 'decidedBy', 'decidedAt']),
  qc_results: new Set(['inspectedBy']),
  technical_flats: new Set(['approvedBy']),
  technical_specs: new Set(['releaseVersionId', 'releaseValidationRunId', 'releasedBy', 'releasedAt']),
};

export function encodeCanonicalRecord(codecEntry: CanonicalCodec, record: Record<string, unknown>) {
  const encoded: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (omittedClientFields.has(key)
      || serverOwnedClientFields[codecEntry.table]?.has(key)
      || key === 'createdAt' || key === 'updatedAt' || key === 'revision'
      || key === 'id' || key === 'studioId') continue;
    const column = codecEntry.aliases?.[key] ?? camelToSnake(key);
    encoded[column] = codecEntry.table === 'validation_runs' && key === 'issues'
      ? { issues: value }
      : value;
  }
  return encoded;
}

/** Server-only recovery encoding. Callers must still filter against a static
 * table column manifest before using the trusted migration role. */
export function encodeCanonicalMigrationRecord(codecEntry: CanonicalCodec, record: Record<string, unknown>) {
  const encoded: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (omittedClientFields.has(key) || key === 'selectedMeasurementKeys' || key === 'selectedPomPointIds') continue;
    const column = codecEntry.aliases?.[key] ?? camelToSnake(key);
    encoded[column] = value;
  }
  if (codecEntry.table === 'validation_runs') encoded.result_json = { issues: record.issues ?? [] };
  if (['change_events', 'garment_versions', 'restore_operations'].includes(codecEntry.table)) {
    encoded.scope_json = typeof record.scope === 'object' ? record.scope : { domain: record.scope ?? 'all' };
  }
  return encoded;
}

export function decodeCanonicalRecord(codecEntry: CanonicalCodec, row: Record<string, unknown>) {
  const inverseAliases = Object.fromEntries(
    Object.entries(codecEntry.aliases ?? {}).map(([client, column]) => [column, client]),
  );
  const decoded: Record<string, unknown> = {};
  for (const [column, value] of Object.entries(row)) {
    const key = inverseAliases[column] ?? snakeToCamel(column);
    decoded[key] = value;
  }
  const createdAt = String(decoded.createdAt ?? decoded.occurredAt ?? decoded.generatedAt ?? new Date(0).toISOString());
  decoded.createdAt = createdAt;
  decoded.updatedAt = String(decoded.updatedAt ?? createdAt);
  decoded.revision = Number(decoded.revision ?? decoded.resultRevision ?? 1);

  if (codecEntry.table === 'change_events') {
    const scope = decoded.scope;
    decoded.scope = typeof scope === 'object' && scope && 'domain' in scope
      ? String((scope as { domain: unknown }).domain)
      : 'all';
  }
  if (codecEntry.table === 'garment_versions' || codecEntry.table === 'restore_operations') {
    const scope = decoded.scope;
    decoded.scope = typeof scope === 'object' && scope && 'domain' in scope
      ? String((scope as { domain: unknown }).domain)
      : 'all';
  }
  if (codecEntry.table === 'restore_operations') {
    const selectedKeys = Array.isArray(decoded.selectedKeys) ? decoded.selectedKeys.map(String) : [];
    decoded.selectedKeys = selectedKeys;
    decoded.selectedMeasurementKeys = selectedIds(selectedKeys, 'measurementValues');
    decoded.selectedPomPointIds = selectedIds(selectedKeys, 'pomPoints');
  }
  if (codecEntry.table === 'validation_runs') {
    const result = decoded.issues;
    decoded.issues = result && typeof result === 'object' && !Array.isArray(result) && 'issues' in result
      ? (result as { issues: unknown }).issues
      : [];
  }
  if (codecEntry.table === 'media_assets') decoded.storageState = 'uploaded';
  if (codecEntry.table === 'editorial_blocks') {
    decoded.content = decoded.content ?? {};
    decoded.settings = decoded.settings ?? {};
  }
  if (codecEntry.table === 'portfolio_projects') {
    decoded.selectedAssetIds = [];
    decoded.includeTechnicalExcerpt = false;
  }
  if (codecEntry.table === 'portfolio_editorials') {
    decoded.selectedAssetIds = [];
    decoded.selectedSceneIds = [];
    decoded.sourceVersionId = decoded.sourceVersionId ?? null;
  }
  return decoded;
}

export function materializeMutableRows(state: CanonicalWorkspaceState) {
  const rows = new Map<string, { codec: CanonicalCodec; record: Record<string, unknown> }>();
  for (const entry of canonicalCodecRegistry) {
    if (!entry.mutable || !entry.stateKey || !entry.entityType) continue;
    const records = state[entry.stateKey] as unknown[];
    for (const value of records) {
      const record = value as Record<string, unknown>;
      rows.set(`${entry.entityType}:${String(record.id)}`, { codec: entry, record });
    }
  }

  for (const project of state.portfolioProjects) {
    project.selectedAssetIds.forEach((assetId, index) => {
      const id = stableUuid(`portfolio-project-asset:${project.id}:${assetId}`);
      const entry = canonicalCodecRegistry.find((item) => item.table === 'portfolio_project_assets')!;
      rows.set(`portfolio_project_assets:${id}`, { codec: entry, record: {
        altText: '', assetId, createdAt: project.createdAt, id,
        portfolioProjectId: project.id, revision: 1,
        role: index === 0 ? 'cover' : 'gallery', sortOrder: index,
        studioId: state.studioId, updatedAt: project.updatedAt,
      } });
    });
  }
  for (const editorial of state.portfolioEditorials) {
    editorial.selectedSceneIds.forEach((sceneId, index) => {
      const id = stableUuid(`portfolio-editorial-scene:${editorial.id}:${sceneId}`);
      const entry = canonicalCodecRegistry.find((item) => item.table === 'portfolio_editorial_scenes')!;
      rows.set(`portfolio_editorial_scenes:${id}`, { codec: entry, record: {
        collectionId: editorial.collectionId, createdAt: editorial.createdAt,
        id, profileId: editorial.profileId, revision: 1, sceneId,
        sortOrder: index, studioId: state.studioId, updatedAt: editorial.updatedAt,
      } });
    });
    editorial.selectedAssetIds.forEach((assetId, index) => {
      const id = stableUuid(`portfolio-editorial-asset:${editorial.id}:${assetId}`);
      const entry = canonicalCodecRegistry.find((item) => item.table === 'portfolio_editorial_assets')!;
      rows.set(`portfolio_editorial_assets:${id}`, { codec: entry, record: {
        altText: '', assetId, collectionId: editorial.collectionId,
        createdAt: editorial.createdAt, id, profileId: editorial.profileId,
        revision: 1, role: 'editorial', sortOrder: index,
        studioId: state.studioId, updatedAt: editorial.updatedAt,
      } });
    });
  }
  return rows;
}

export function buildCanonicalMutations(
  before: CanonicalWorkspaceState,
  after: CanonicalWorkspaceState,
): CanonicalMutation[] {
  const beforeRows = materializeMutableRows(before);
  const afterRows = materializeMutableRows(after);
  const mutations: CanonicalMutation[] = [];

  for (const [key, afterValue] of afterRows) {
    const beforeValue = beforeRows.get(key);
    const row = encodeCanonicalRecord(afterValue.codec, afterValue.record);
    if (!beforeValue) {
      mutations.push({ action: 'insert', baseRevision: null, entityId: String(afterValue.record.id), entityType: afterValue.codec.entityType!, row });
      continue;
    }
    const beforeRow = encodeCanonicalRecord(beforeValue.codec, beforeValue.record);
    if (stableJson(beforeRow) !== stableJson(row)) {
      mutations.push({
        action: 'update', baseRevision: Number(beforeValue.record.revision ?? 1),
        entityId: String(afterValue.record.id), entityType: afterValue.codec.entityType!, row: changedColumns(beforeRow, row),
      });
    }
  }
  for (const [key, beforeValue] of beforeRows) {
    if (afterRows.has(key)) continue;
    if (!deleteAllowedEntities.has(beforeValue.codec.entityType!)) {
      const archived = archiveRemovedRoot(beforeValue.codec.entityType!, beforeValue.record);
      if (archived) {
        mutations.push({
          action: 'update', baseRevision: Number(beforeValue.record.revision ?? 1),
          entityId: String(beforeValue.record.id), entityType: beforeValue.codec.entityType!,
          row: encodeCanonicalRecord(beforeValue.codec, archived),
        });
      }
      continue;
    }
    mutations.push({
      action: 'delete', baseRevision: Number(beforeValue.record.revision ?? 1),
      entityId: String(beforeValue.record.id), entityType: beforeValue.codec.entityType!, row: null,
    });
  }
  return mutations;
}

function changedColumns(before: Record<string, unknown>, after: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(after).filter(([key, value]) => stableJson(before[key]) !== stableJson(value)));
}

const deleteAllowedEntities = new Set<CanonicalMutableEntity>([
  'collections', 'design_briefs', 'inspiration_boards', 'inspiration_items',
  'garment_media', 'media_derivatives', 'design_annotations', 'material_variants',
  'garment_materials', 'component_variants', 'garment_components', 'supplier_items',
  'technical_flats', 'flat_annotations', 'technical_files', 'pom_points',
  'measurement_sets', 'measurement_values', 'grade_rules', 'grade_rule_values',
  'fit_measurements', 'bom_items', 'construction_sections', 'construction_steps',
  'construction_details', 'sample_rounds', 'sample_round_media', 'fit_sessions',
  'fit_session_media', 'fit_issues', 'fit_issue_promotions', 'cost_sheets', 'cost_items',
  'production_milestones', 'qc_template_checks', 'qc_inspections', 'qc_results',
  'editorial_collection_garments', 'editorial_scenes', 'editorial_blocks',
  'editorial_assets', 'portfolio_project_assets', 'portfolio_editorial_scenes',
  'portfolio_editorial_assets', 'portfolio_technical_excerpts', 'tasks',
  'calendar_events', 'ai_job_input_refs',
]);

function archiveRemovedRoot(entityType: CanonicalMutableEntity, record: Record<string, unknown>) {
  const status = entityType === 'garments' || entityType === 'collections'
    ? 'archived'
    : entityType === 'materials' || entityType === 'components'
      ? 'archived'
      : entityType === 'suppliers' || entityType === 'factories'
        ? 'archived'
        : null;
  if (!status) return null;
  return { ...record, archivedAt: new Date().toISOString(), status };
}

export function canonicalMutableSnapshot(state: CanonicalWorkspaceState) {
  return Object.fromEntries([...materializeMutableRows(state).entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => [key, encodeCanonicalRecord(value.codec, value.record)]));
}

export function applyPortfolioJoins(
  state: CanonicalWorkspaceState,
  joins: Record<string, Record<string, unknown>[]>,
) {
  const projectAssets = joins.portfolio_project_assets ?? [];
  const editorialScenes = joins.portfolio_editorial_scenes ?? [];
  const editorialAssets = joins.portfolio_editorial_assets ?? [];
  return {
    ...state,
    aiJobs: state.aiJobs.map((job) => ({
      ...job,
      inputRefIds: state.aiInputRefs
        .filter((input) => input.jobId === job.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((input) => input.id),
    })),
    portfolioProjects: state.portfolioProjects.map((project) => ({
      ...project,
      selectedAssetIds: projectAssets
        .filter((item) => item.portfolio_project_id === project.id)
        .sort(bySortOrder).map((item) => String(item.asset_id)),
    })),
    portfolioEditorials: state.portfolioEditorials.map((editorial) => ({
      ...editorial,
      selectedAssetIds: editorialAssets
        .filter((item) => item.profile_id === editorial.profileId && item.collection_id === editorial.collectionId)
        .sort(bySortOrder).map((item) => String(item.asset_id)),
      selectedSceneIds: editorialScenes
        .filter((item) => item.profile_id === editorial.profileId && item.collection_id === editorial.collectionId)
        .sort(bySortOrder).map((item) => String(item.scene_id)),
    })),
  };
}

function bySortOrder(a: Record<string, unknown>, b: Record<string, unknown>) {
  return Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
}

function selectedIds(keys: string[], collection: string) {
  return keys.flatMap((key) => {
    const [, candidateCollection, entityId] = key.split(':');
    return candidateCollection === collection && entityId ? [entityId] : [];
  });
}

function camelToSnake(value: string) {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function snakeToCamel(value: string) {
  return value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function stableUuid(seed: string) {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let index = 0; index < seed.length; index += 1) {
    h1 = Math.imul(h1 ^ seed.charCodeAt(index), 0x01000193);
    h2 = Math.imul(h2 ^ seed.charCodeAt(index), 0x85ebca6b);
  }
  const raw = `${hex(h1)}${hex(h2)}${hex(h1 ^ h2)}${hex(Math.imul(h1, h2))}`.slice(0, 32).split('');
  raw[12] = '4';
  raw[16] = ((parseInt(raw[16], 16) & 0x3) | 0x8).toString(16);
  return `${raw.slice(0, 8).join('')}-${raw.slice(8, 12).join('')}-${raw.slice(12, 16).join('')}-${raw.slice(16, 20).join('')}-${raw.slice(20).join('')}`;
}

function hex(value: number) {
  return (value >>> 0).toString(16).padStart(8, '0');
}
