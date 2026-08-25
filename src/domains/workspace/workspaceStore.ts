import type { StudioData } from '../../lib/studioStorage';
import { buildLegacyCanonicalMigrationPlan } from '../migration';
import type {
  CanonicalAnnotation,
  CanonicalBomItem,
  CanonicalCollection,
  CanonicalComponent,
  CanonicalComponentVariant,
  CanonicalConstructionDetail,
  CanonicalConstructionSection,
  CanonicalConstructionStep,
  CanonicalDesignBrief,
  CanonicalGarment,
  CanonicalGarmentComponent,
  CanonicalGarmentMaterial,
  CanonicalGarmentMedia,
  CanonicalInventoryEntry,
  CanonicalMaterial,
  CanonicalMaterialVariant,
  CanonicalMediaAsset,
  CanonicalMediaDerivative,
  CanonicalMoodboard,
  CanonicalMoodboardItem,
  CanonicalRecord,
  CanonicalReleaseTask,
  CanonicalSupplier,
  CanonicalSupplierItem,
  CanonicalTemplate,
  CanonicalTemplateApplication,
  CanonicalValidationWaiver,
  CanonicalWorkspaceState,
  InventoryEntryType,
  RelationshipOption,
} from './contracts';

const workspaceVersion = 4 as const;

export type CanonicalWorkspaceSeed = {
  data: StudioData;
  ownerUserId: string;
  studioName?: string;
  studioSlug?: string;
};

export type GarmentInput = Pick<CanonicalGarment, 'garmentType' | 'phase' | 'status' | 'title'> & {
  collectionId?: string | null;
};

export type MaterialInput = Pick<CanonicalMaterial, 'category' | 'composition' | 'name'> & {
  colorHex?: string | null;
  colorName?: string;
  width?: number | null;
  widthUnit?: CanonicalMaterialVariant['widthUnit'];
};

export type ComponentInput = Pick<CanonicalComponent, 'category' | 'name'> & {
  color?: string;
  finish?: string;
  size?: string;
};

export async function createCanonicalWorkspace(seed: CanonicalWorkspaceSeed) {
  const plan = await buildLegacyCanonicalMigrationPlan({
    data: seed.data,
    generatedAt: deterministicGeneratedAt(seed.data),
    ownerUserId: seed.ownerUserId,
    sourceId: 'wp3-browser-canonical-import',
    studioName: seed.studioName ?? 'Mystic Lore Studio',
    studioSlug: seed.studioSlug ?? 'mystic-lore-studio',
  });
  const rows = (table: string): unknown[] =>
    (plan.batches as unknown as Array<{ rows: unknown[]; table: string }>).find((batch) => batch.table === table)?.rows ?? [];
  const revision = 1;
  const base = <T extends { created_at: string; id: string; studio_id: string; updated_at?: string }>(row: T) => ({
    createdAt: row.created_at,
    id: row.id,
    revision,
    studioId: row.studio_id,
    updatedAt: row.updated_at ?? row.created_at,
  });
  const studioId = (rows('garments')[0] as { studio_id?: string } | undefined)?.studio_id
    ?? (rows('materials')[0] as { studio_id?: string } | undefined)?.studio_id
    ?? (plan.batches.find((batch) => batch.table === 'studios')?.rows[0] as { id?: string } | undefined)?.id
    ?? createId();

  return normalizeWorkspace({
    annotations: rows('design_annotations').map((row) => {
      const value = row as { asset_id: string; body: string; garment_id: string; status: CanonicalAnnotation['status']; created_at: string; id: string; studio_id: string; updated_at: string };
      return { ...base(value), assetId: value.asset_id, body: value.body, garmentId: value.garment_id, status: value.status };
    }),
    bomItems: [] as CanonicalBomItem[],
    collections: rows('collections').map((row) => {
      const value = row as { created_at: string; id: string; name: string; season: string | null; sort_order: number; status: CanonicalCollection['status']; studio_id: string; updated_at: string };
      return { ...base(value), name: value.name, season: value.season, sortOrder: value.sort_order, status: value.status };
    }),
    componentVariants: [] as CanonicalComponentVariant[],
    components: [] as CanonicalComponent[],
    constructionDetails: [] as CanonicalConstructionDetail[],
    constructionSections: [] as CanonicalConstructionSection[],
    constructionSteps: [] as CanonicalConstructionStep[],
    designBriefs: rows('design_briefs').map((row) => {
      const value = row as { color_story: string; created_at: string; garment_id: string; id: string; intent: string; key_features: string[]; silhouette: string; studio_id: string; target_wearer: string; updated_at: string };
      return { ...base(value), colorStory: value.color_story, garmentId: value.garment_id, intent: value.intent, keyFeatures: value.key_features, silhouette: value.silhouette, targetWearer: value.target_wearer };
    }),
    garmentComponents: [] as CanonicalGarmentComponent[],
    flatAnnotations: [],
    garmentVersions: [],
    gradeRuleValues: [],
    gradeRules: [],
    garmentMaterials: rows('garment_materials').map((row) => {
      const value = row as { created_at: string; garment_id: string; id: string; placement: string | null; required_quantity: number; reserved_quantity: number; role: string; status: CanonicalGarmentMaterial['status']; studio_id: string; unit: CanonicalGarmentMaterial['unit']; updated_at: string; variant_id: string };
      return { ...base(value), garmentId: value.garment_id, placement: value.placement, requiredQuantity: value.required_quantity, reservedQuantity: value.reserved_quantity, role: value.role, status: value.status, unit: value.unit, variantId: value.variant_id };
    }),
    garmentMedia: rows('garment_media').map((row) => {
      const value = row as { asset_id: string; created_at: string; garment_id: string; id: string; role: CanonicalGarmentMedia['role']; sort_order: number; studio_id: string; updated_at: string };
      return { ...base(value), assetId: value.asset_id, garmentId: value.garment_id, role: value.role, sortOrder: value.sort_order };
    }),
    garments: rows('garments').map((row) => {
      const value = row as { collection_id: string | null; created_at: string; garment_code: string; garment_type: string; id: string; phase: CanonicalGarment['phase']; status: CanonicalGarment['status']; studio_id: string; title: string; updated_at: string };
      return { ...base(value), collectionId: value.collection_id, garmentCode: value.garment_code, garmentType: value.garment_type, phase: value.phase, status: value.status, title: value.title };
    }),
    inventoryEntries: rows('inventory_entries').map((row) => {
      const value = row as { created_at: string; entry_type: InventoryEntryType; id: string; note: string | null; occurred_at: string; quantity: number; studio_id: string; unit: CanonicalInventoryEntry['unit']; variant_id: string };
      return { ...base(value), entryType: value.entry_type, note: value.note, occurredAt: value.occurred_at, quantity: value.quantity, unit: value.unit, variantId: value.variant_id };
    }),
    materialVariants: rows('material_variants').map((row) => {
      const value = row as { color_hex: string | null; color_name: string; created_at: string; id: string; material_id: string; sku: string; status: CanonicalMaterialVariant['status']; studio_id: string; updated_at: string; weight_gsm: number | null; width: number | null; width_unit: CanonicalMaterialVariant['widthUnit'] };
      return { ...base(value), colorHex: value.color_hex, colorName: value.color_name, materialId: value.material_id, sku: value.sku, status: value.status, weightGsm: value.weight_gsm, width: value.width, widthUnit: value.width_unit };
    }),
    materials: rows('materials').map((row) => {
      const value = row as { category: string; composition: string; created_at: string; id: string; material_code: string; name: string; status: CanonicalMaterial['status']; studio_id: string; updated_at: string };
      return { ...base(value), category: value.category, composition: value.composition, materialCode: value.material_code, name: value.name, status: value.status };
    }),
    mediaAssets: rows('media_assets').map((row) => {
      const value = row as { checksum: string; created_at: string; height: number | null; id: string; mime_type: string; original_filename: string; rights_json: CanonicalMediaAsset['rights']; size_bytes: number; storage_path: string; studio_id: string; updated_at: string; width: number | null };
      return { ...base(value), checksum: value.checksum, height: value.height, mimeType: value.mime_type, name: value.original_filename, rights: value.rights_json, sizeBytes: value.size_bytes, storagePath: value.storage_path, width: value.width };
    }),
    mediaDerivatives: rows('media_derivatives').map((row) => {
      const value = row as { checksum: string; created_at: string; id: string; source_asset_id: string; storage_path: string; studio_id: string; updated_at: string; variant: CanonicalMediaDerivative['variant'] };
      return { ...base(value), assetId: value.source_asset_id, checksum: value.checksum, storagePath: value.storage_path, variant: value.variant };
    }),
    moodboardItems: rows('inspiration_items').map((row) => {
      const value = row as { asset_id: string; board_id: string; caption: string; created_at: string; id: string; position_json: Record<string, unknown>; sort_order: number; studio_id: string; updated_at: string };
      return { ...base(value), assetId: value.asset_id, boardId: value.board_id, caption: value.caption ?? '', position: value.position_json, sortOrder: value.sort_order };
    }),
    moodboards: rows('inspiration_boards').map((row) => {
      const value = row as { created_at: string; garment_id: string; id: string; layout_json: Record<string, unknown>; sort_order: number; studio_id: string; title: string; updated_at: string };
      return { ...base(value), garmentId: value.garment_id, layout: value.layout_json, sortOrder: value.sort_order, title: value.title };
    }),
    measurementSets: [],
    measurementValues: [],
    pomPoints: [],
    restoreOperations: [],
    releaseTasks: [] as CanonicalReleaseTask[],
    sampleRounds: [],
    fitMeasurements: [],
    schemaVersion: workspaceVersion,
    studioId,
    supplierItems: [] as CanonicalSupplierItem[],
    suppliers: [] as CanonicalSupplier[],
    templates: [] as CanonicalTemplate[],
    templateApplications: [] as CanonicalTemplateApplication[],
    technicalFiles: [],
    technicalFlats: [],
    technicalSpecs: [],
    techPackExports: [],
    validationRuns: [],
    validationWaivers: [] as CanonicalValidationWaiver[],
  });
}

export function normalizeWorkspace(state: CanonicalWorkspaceState): CanonicalWorkspaceState {
  return {
    ...state,
    annotations: [...state.annotations],
    bomItems: [...state.bomItems].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)),
    collections: [...state.collections].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    componentVariants: [...state.componentVariants],
    components: [...state.components].sort((a, b) => a.name.localeCompare(b.name)),
    constructionDetails: [...state.constructionDetails].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)),
    constructionSections: [...state.constructionSections].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)),
    constructionSteps: [...state.constructionSteps].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)),
    designBriefs: [...state.designBriefs],
    flatAnnotations: [...state.flatAnnotations],
    garmentVersions: [...state.garmentVersions],
    gradeRuleValues: [...state.gradeRuleValues],
    gradeRules: [...state.gradeRules],
    garmentComponents: [...state.garmentComponents],
    garmentMaterials: [...state.garmentMaterials],
    garmentMedia: [...state.garmentMedia].sort((a, b) => a.sortOrder - b.sortOrder),
    garments: [...state.garments].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    inventoryEntries: [...state.inventoryEntries].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    materialVariants: [...state.materialVariants],
    materials: [...state.materials].sort((a, b) => a.name.localeCompare(b.name)),
    mediaAssets: [...state.mediaAssets].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    mediaDerivatives: [...state.mediaDerivatives],
    moodboardItems: [...state.moodboardItems].sort((a, b) => a.sortOrder - b.sortOrder),
    moodboards: [...state.moodboards].sort((a, b) => a.sortOrder - b.sortOrder),
    measurementSets: [...state.measurementSets],
    measurementValues: [...state.measurementValues],
    pomPoints: [...state.pomPoints].sort((a, b) => a.sortOrder - b.sortOrder),
    restoreOperations: [...state.restoreOperations],
    releaseTasks: [...state.releaseTasks],
    sampleRounds: [...state.sampleRounds],
    fitMeasurements: [...state.fitMeasurements],
    supplierItems: [...state.supplierItems],
    suppliers: [...state.suppliers].sort((a, b) => a.name.localeCompare(b.name)),
    templates: [...state.templates].sort((a, b) => a.name.localeCompare(b.name)),
    templateApplications: [...state.templateApplications],
    technicalFiles: [...state.technicalFiles],
    technicalFlats: [...state.technicalFlats],
    technicalSpecs: [...state.technicalSpecs],
    techPackExports: [...state.techPackExports],
    validationRuns: [...state.validationRuns],
    validationWaivers: [...state.validationWaivers],
  };
}

export function addCollection(state: CanonicalWorkspaceState, name: string, season = '') {
  const record: CanonicalCollection = {
    ...newRecord(state.studioId), name: name.trim(), season: season.trim() || null,
    sortOrder: state.collections.length, status: 'draft',
  };
  return { state: normalizeWorkspace({ ...state, collections: [...state.collections, record] }), record };
}

export function addGarment(state: CanonicalWorkspaceState, input: GarmentInput) {
  const record: CanonicalGarment = {
    ...newRecord(state.studioId), collectionId: input.collectionId ?? null,
    garmentCode: nextCode(state, 'ML'), garmentType: input.garmentType,
    phase: input.phase, status: input.status, title: input.title.trim(),
  };
  const brief: CanonicalDesignBrief = {
    ...newRecord(state.studioId), colorStory: '', garmentId: record.id, intent: '', keyFeatures: [], silhouette: '', targetWearer: '',
  };
  return { state: normalizeWorkspace({ ...state, designBriefs: [...state.designBriefs, brief], garments: [...state.garments, record] }), record, brief };
}

/** Adds a garment and its required one-to-one design brief. */
export function addGarmentWithBrief(state: CanonicalWorkspaceState, input: GarmentInput) {
  const record: CanonicalGarment = {
    ...newRecord(state.studioId), collectionId: input.collectionId ?? null,
    garmentCode: nextCode(state, 'ML'), garmentType: input.garmentType,
    phase: input.phase, status: input.status, title: input.title.trim(),
  };
  const brief: CanonicalDesignBrief = {
    ...newRecord(state.studioId), colorStory: '', garmentId: record.id, intent: '', keyFeatures: [], silhouette: '', targetWearer: '',
  };
  return { state: normalizeWorkspace({ ...state, designBriefs: [...state.designBriefs, brief], garments: [...state.garments, record] }), record, brief };
}

export function updateBrief(state: CanonicalWorkspaceState, garmentId: string, patch: Partial<Omit<CanonicalDesignBrief, keyof CanonicalRecord | 'garmentId'>>) {
  const existing = state.designBriefs.find((brief) => brief.garmentId === garmentId);
  const next = existing
    ? touch({ ...existing, ...patch })
    : { ...newRecord(state.studioId), colorStory: '', garmentId, intent: '', keyFeatures: [], silhouette: '', targetWearer: '', ...patch };
  return normalizeWorkspace({ ...state, designBriefs: [...state.designBriefs.filter((brief) => brief.garmentId !== garmentId), next] });
}

export function updateGarment(state: CanonicalWorkspaceState, id: string, patch: Partial<GarmentInput>) {
  return normalizeWorkspace({ ...state, garments: state.garments.map((garment) => garment.id === id ? touch({ ...garment, ...patch }) : garment) });
}

export function addMaterial(state: CanonicalWorkspaceState, input: MaterialInput) {
  const material: CanonicalMaterial = { ...newRecord(state.studioId), category: input.category, composition: input.composition, materialCode: nextCode(state, 'MAT'), name: input.name.trim(), status: 'active' };
  const variant: CanonicalMaterialVariant = { ...newRecord(state.studioId), colorHex: input.colorHex ?? null, colorName: input.colorName ?? '', materialId: material.id, sku: `${material.materialCode}-01`, status: 'active', weightGsm: null, width: input.width ?? null, widthUnit: input.widthUnit ?? null };
  return { state: normalizeWorkspace({ ...state, materials: [...state.materials, material], materialVariants: [...state.materialVariants, variant] }), material, variant };
}

export function addComponent(state: CanonicalWorkspaceState, input: ComponentInput) {
  const component: CanonicalComponent = { ...newRecord(state.studioId), category: input.category, componentCode: nextCode(state, 'CMP'), name: input.name.trim(), spec: {}, status: 'active' };
  const variant: CanonicalComponentVariant = { ...newRecord(state.studioId), color: input.color ?? '', componentId: component.id, finish: input.finish ?? '', size: input.size ?? '', sku: `${component.componentCode}-01`, status: 'active' };
  return { state: normalizeWorkspace({ ...state, components: [...state.components, component], componentVariants: [...state.componentVariants, variant] }), component, variant };
}

export function addTemplate(
  state: CanonicalWorkspaceState,
  input: Pick<CanonicalTemplate, 'name' | 'templateType'>,
) {
  const record: CanonicalTemplate = {
    ...newRecord(state.studioId),
    name: input.name.trim(),
    payload: {},
    status: 'draft',
    templateType: input.templateType,
    version: 1,
  };
  return { state: normalizeWorkspace({ ...state, templates: [...state.templates, record] }), record };
}

export function attachMaterial(state: CanonicalWorkspaceState, garmentId: string, variantId: string, role: string, placement = '') {
  const existing = state.garmentMaterials.find((item) => item.garmentId === garmentId && item.variantId === variantId && item.role === role && item.placement === (placement || null));
  if (existing) return { state, relationship: existing };
  const relationship: CanonicalGarmentMaterial = { ...newRecord(state.studioId), garmentId, placement: placement || null, requiredQuantity: 0, reservedQuantity: 0, role, status: 'planned', unit: 'yd', variantId };
  return { state: normalizeWorkspace({ ...state, garmentMaterials: [...state.garmentMaterials, relationship] }), relationship };
}

export function attachComponent(state: CanonicalWorkspaceState, garmentId: string, variantId: string, placement = '') {
  const existing = state.garmentComponents.find((item) => item.garmentId === garmentId && item.variantId === variantId && item.placement === (placement || null));
  if (existing) return { state, relationship: existing };
  const relationship: CanonicalGarmentComponent = { ...newRecord(state.studioId), garmentId, placement: placement || null, quantity: 1, status: 'planned', unit: 'each', variantId };
  return { state: normalizeWorkspace({ ...state, garmentComponents: [...state.garmentComponents, relationship] }), relationship };
}

export function recordInventory(state: CanonicalWorkspaceState, variantId: string, entryType: InventoryEntryType, quantity: number, note = '') {
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Inventory ledger quantities must be positive.');
  const entry: CanonicalInventoryEntry = { ...newRecord(state.studioId), entryType, note: note || null, occurredAt: new Date().toISOString(), quantity, unit: 'yd', variantId };
  return { state: normalizeWorkspace({ ...state, inventoryEntries: [...state.inventoryEntries, entry] }), entry };
}

export function createMoodboard(state: CanonicalWorkspaceState, garmentId: string, title = 'Reference field') {
  const board: CanonicalMoodboard = { ...newRecord(state.studioId), garmentId, layout: {}, sortOrder: state.moodboards.filter((item) => item.garmentId === garmentId).length, title };
  return { state: normalizeWorkspace({ ...state, moodboards: [...state.moodboards, board] }), board };
}

export function attachAsset(state: CanonicalWorkspaceState, garmentId: string, assetId: string, role: CanonicalGarmentMedia['role']) {
  const existing = state.garmentMedia.find((item) => item.garmentId === garmentId && item.assetId === assetId && item.role === role);
  if (existing) return { state, relation: existing };
  const relation: CanonicalGarmentMedia = { ...newRecord(state.studioId), assetId, garmentId, role, sortOrder: state.garmentMedia.filter((item) => item.garmentId === garmentId && item.role === role).length };
  return { state: normalizeWorkspace({ ...state, garmentMedia: [...state.garmentMedia, relation] }), relation };
}

export function attachMoodboardItem(state: CanonicalWorkspaceState, boardId: string, assetId: string, caption = '') {
  const existing = state.moodboardItems.find((item) => item.boardId === boardId && item.assetId === assetId);
  if (existing) return { state, item: existing };
  const item: CanonicalMoodboardItem = { ...newRecord(state.studioId), assetId, boardId, caption, position: {}, sortOrder: state.moodboardItems.filter((candidate) => candidate.boardId === boardId).length };
  return { state: normalizeWorkspace({ ...state, moodboardItems: [...state.moodboardItems, item] }), item };
}

export function deleteGarment(state: CanonicalWorkspaceState, garmentId: string) {
  const boardIds = new Set(state.moodboards.filter((item) => item.garmentId === garmentId).map((item) => item.id));
  const specIds = new Set(state.technicalSpecs.filter((item) => item.garmentId === garmentId).map((item) => item.id));
  const flatIds = new Set(state.technicalFlats.filter((item) => specIds.has(item.specId)).map((item) => item.id));
  const pomIds = new Set(state.pomPoints.filter((item) => specIds.has(item.specId)).map((item) => item.id));
  const setIds = new Set(state.measurementSets.filter((item) => specIds.has(item.specId)).map((item) => item.id));
  const ruleIds = new Set(state.gradeRules.filter((item) => specIds.has(item.specId)).map((item) => item.id));
  const sampleRoundIds = new Set(state.sampleRounds.filter((item) => item.garmentId === garmentId).map((item) => item.id));
  const sectionIds = new Set(state.constructionSections.filter((item) => specIds.has(item.specId)).map((item) => item.id));
  const stepIds = new Set(state.constructionSteps.filter((item) => sectionIds.has(item.sectionId)).map((item) => item.id));
  const runIds = new Set(state.validationRuns.filter((item) => specIds.has(item.specId)).map((item) => item.id));
  return normalizeWorkspace({
    ...state,
    annotations: state.annotations.filter((item) => item.garmentId !== garmentId),
    bomItems: state.bomItems.filter((item) => !specIds.has(item.specId)),
    constructionDetails: state.constructionDetails.filter((item) => !stepIds.has(item.stepId)),
    constructionSections: state.constructionSections.filter((item) => !specIds.has(item.specId)),
    constructionSteps: state.constructionSteps.filter((item) => !sectionIds.has(item.sectionId)),
    garmentComponents: state.garmentComponents.filter((item) => item.garmentId !== garmentId),
    designBriefs: state.designBriefs.filter((item) => item.garmentId !== garmentId),
    garmentMaterials: state.garmentMaterials.filter((item) => item.garmentId !== garmentId),
    garmentMedia: state.garmentMedia.filter((item) => item.garmentId !== garmentId),
    garments: state.garments.filter((item) => item.id !== garmentId),
    moodboards: state.moodboards.filter((item) => item.garmentId !== garmentId),
    moodboardItems: state.moodboardItems.filter((item) => !boardIds.has(item.boardId)),
    flatAnnotations: state.flatAnnotations.filter((item) => !flatIds.has(item.flatId)),
    garmentVersions: state.garmentVersions.filter((item) => item.garmentId !== garmentId),
    gradeRuleValues: state.gradeRuleValues.filter((item) => !ruleIds.has(item.gradeRuleId)),
    gradeRules: state.gradeRules.filter((item) => !specIds.has(item.specId)),
    measurementSets: state.measurementSets.filter((item) => !specIds.has(item.specId)),
    measurementValues: state.measurementValues.filter((item) => !setIds.has(item.setId)),
    pomPoints: state.pomPoints.filter((item) => !pomIds.has(item.id)),
    restoreOperations: state.restoreOperations.filter((item) => item.garmentId !== garmentId),
    releaseTasks: state.releaseTasks.filter((item) => item.garmentId !== garmentId),
    sampleRounds: state.sampleRounds.filter((item) => item.garmentId !== garmentId),
    fitMeasurements: state.fitMeasurements.filter((item) => !sampleRoundIds.has(item.sampleRoundId)),
    techPackExports: state.techPackExports.filter((item) => !specIds.has(item.specId)),
    technicalFiles: state.technicalFiles.filter((item) => !specIds.has(item.specId)),
    technicalFlats: state.technicalFlats.filter((item) => !specIds.has(item.specId)),
    technicalSpecs: state.technicalSpecs.filter((item) => item.garmentId !== garmentId),
    templateApplications: state.templateApplications.filter((item) => item.garmentId !== garmentId),
    validationRuns: state.validationRuns.filter((item) => !specIds.has(item.specId)),
    validationWaivers: state.validationWaivers.filter((item) => !runIds.has(item.validationRunId)),
  });
}

export function materialAvailableQuantity(state: CanonicalWorkspaceState, variantId: string) {
  return state.inventoryEntries.filter((entry) => entry.variantId === variantId).reduce((total, entry) => {
    const multiplier = entry.entryType === 'receive' || entry.entryType === 'return' ? 1 : entry.entryType === 'adjust' ? 1 : -1;
    return total + multiplier * entry.quantity;
  }, 0);
}

export function relationshipOptions(state: CanonicalWorkspaceState, kind: 'material' | 'component' | 'asset'): RelationshipOption[] {
  if (kind === 'material') return state.materialVariants.map((variant) => {
    const material = state.materials.find((item) => item.id === variant.materialId);
    const uses = state.garmentMaterials.filter((item) => item.variantId === variant.id).map((item) => state.garments.find((garment) => garment.id === item.garmentId)?.title ?? 'Deleted garment');
    return { detail: `${material?.category ?? 'Material'} · ${materialAvailableQuantity(state, variant.id)} yd available`, id: variant.id, inUseBy: uses, label: [material?.name, variant.colorName].filter(Boolean).join(' · '), status: variant.status };
  });
  if (kind === 'component') return state.componentVariants.map((variant) => {
    const component = state.components.find((item) => item.id === variant.componentId);
    const uses = state.garmentComponents.filter((item) => item.variantId === variant.id).map((item) => state.garments.find((garment) => garment.id === item.garmentId)?.title ?? 'Deleted garment');
    return { detail: `${component?.category ?? 'Component'} · ${variant.finish || 'standard finish'}`, id: variant.id, inUseBy: uses, label: [component?.name, variant.size].filter(Boolean).join(' · '), status: variant.status };
  });
  return state.mediaAssets.map((asset) => ({ detail: asset.rights.license ?? 'Rights not recorded', id: asset.id, inUseBy: state.garmentMedia.filter((item) => item.assetId === asset.id).map((item) => state.garments.find((garment) => garment.id === item.garmentId)?.title ?? 'Deleted garment'), label: asset.name }));
}

function newRecord(studioId: string) {
  const timestamp = new Date().toISOString();
  return { createdAt: timestamp, id: createId(), revision: 1, studioId, updatedAt: timestamp };
}

function touch<T extends CanonicalRecord>(record: T): T { return { ...record, revision: record.revision + 1, updatedAt: new Date().toISOString() }; }
function createId() { return globalThis.crypto?.randomUUID?.() ?? `wp3-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`; }
function nextCode(state: CanonicalWorkspaceState, prefix: string) { return `${prefix}-${String(state.garments.length + state.materials.length + state.components.length + 1).padStart(3, '0')}`; }
function deterministicGeneratedAt(data: StudioData) { return data.portfolioProfile.updatedAt ?? data.projects[0]?.updatedAt ?? '2026-08-24T00:00:00.000Z'; }
