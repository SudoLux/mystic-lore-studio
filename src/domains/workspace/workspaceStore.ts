import type { StudioData } from '../../lib/studioStorage';
import { buildLegacyCanonicalMigrationPlan } from '../migration';
import type {
  CanonicalAiAcceptance,
  CanonicalAiAcceptanceCommand,
  CanonicalAiArtifact,
  CanonicalAiInputRef,
  CanonicalAiJob,
  CanonicalAnnotation,
  CanonicalBomItem,
  CanonicalCalendarEvent,
  CanonicalCollection,
  CanonicalComponent,
  CanonicalComponentVariant,
  CanonicalConstructionDetail,
  CanonicalConstructionSection,
  CanonicalConstructionStep,
  CanonicalCostItem,
  CanonicalCostSheet,
  CanonicalDesignBrief,
  CanonicalEditorialAsset,
  CanonicalEditorialBlock,
  CanonicalEditorialCollection,
  CanonicalEditorialCollectionGarment,
  CanonicalEditorialExport,
  CanonicalEditorialScene,
  CanonicalFactory,
  CanonicalFitIssue,
  CanonicalFitIssuePromotion,
  CanonicalFitSession,
  CanonicalFitSessionMedia,
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
  CanonicalPortfolioEditorial,
  CanonicalPortfolioProfile,
  CanonicalPortfolioProject,
  CanonicalProductionMilestone,
  CanonicalProductionOrder,
  CanonicalQcInspection,
  CanonicalQcResult,
  CanonicalQcTemplate,
  CanonicalQcTemplateCheck,
  CanonicalQcWaiver,
  CanonicalRecord,
  CanonicalReleaseTask,
  CanonicalSampleRoundMedia,
  CanonicalSupplier,
  CanonicalSupplierItem,
  CanonicalTemplate,
  CanonicalTemplateApplication,
  CanonicalValidationWaiver,
  CanonicalWorkspaceState,
  InventoryEntryType,
  RelationshipOption,
} from './contracts';

const workspaceVersion = 10 as const;

export type CanonicalWorkspaceSeed = {
  data: StudioData;
  ownerUserId: string;
  studioId?: string;
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
    studioId: seed.studioId,
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
    aiAcceptanceCommands: [] as CanonicalAiAcceptanceCommand[],
    aiAcceptances: [] as CanonicalAiAcceptance[],
    aiArtifacts: [] as CanonicalAiArtifact[],
    aiInputRefs: [] as CanonicalAiInputRef[],
    aiJobs: [] as CanonicalAiJob[],
    annotations: rows('design_annotations').map((row) => {
      const value = row as { asset_id: string; body: string; garment_id: string; status: CanonicalAnnotation['status']; created_at: string; id: string; studio_id: string; updated_at: string };
      return { ...base(value), assetId: value.asset_id, body: value.body, garmentId: value.garment_id, status: value.status };
    }),
    bomItems: [] as CanonicalBomItem[],
    calendarEvents: [] as CanonicalCalendarEvent[],
    changeEvents: [],
    collections: rows('collections').map((row) => {
      const value = row as { created_at: string; id: string; name: string; season: string | null; sort_order: number; status: CanonicalCollection['status']; studio_id: string; updated_at: string };
      return { ...base(value), name: value.name, season: value.season, sortOrder: value.sort_order, status: value.status };
    }),
    componentVariants: [] as CanonicalComponentVariant[],
    components: [] as CanonicalComponent[],
    constructionDetails: [] as CanonicalConstructionDetail[],
    constructionSections: [] as CanonicalConstructionSection[],
    constructionSteps: [] as CanonicalConstructionStep[],
    costItems: [] as CanonicalCostItem[],
    costSheets: [] as CanonicalCostSheet[],
    designBriefs: rows('design_briefs').map((row) => {
      const value = row as { color_story: string; created_at: string; garment_id: string; id: string; intent: string; key_features: string[]; silhouette: string; studio_id: string; target_wearer: string; updated_at: string };
      return { ...base(value), colorStory: value.color_story, garmentId: value.garment_id, intent: value.intent, keyFeatures: value.key_features, silhouette: value.silhouette, targetWearer: value.target_wearer };
    }),
    entityRevisions: [],
    editorialAssets: rows('editorial_assets').map((row) => {
      const value = row as { asset_id: string; collection_id: string; created_at: string; id: string; role: string; sort_order: number; studio_id: string; updated_at: string; usage_json: Record<string, unknown> };
      return { ...base(value), assetId: value.asset_id, collectionId: value.collection_id, role: value.role, sortOrder: value.sort_order, usage: value.usage_json ?? {} } satisfies CanonicalEditorialAsset;
    }),
    editorialBlocks: rows('editorial_blocks').map((row) => {
      const value = row as { block_type: string; content_json: Record<string, unknown>; created_at: string; id: string; scene_id: string; settings_json: Record<string, unknown>; sort_order: number; studio_id: string; updated_at: string };
      return { ...base(value), aiArtifactId: null, blockType: value.block_type, content: value.content_json?.value && typeof value.content_json.value === 'object' ? value.content_json.value as Record<string, unknown> : value.content_json ?? {}, liveSource: null, sceneId: value.scene_id, settings: value.settings_json ?? {}, sortOrder: value.sort_order, sourceChecksum: null, sourceEntityId: null, sourceFieldPath: null, sourceGarmentId: null, sourceVersionId: null, staleness: 'current' } satisfies CanonicalEditorialBlock;
    }),
    editorialCollectionGarments: rows('editorial_collections').map((row, sortOrder) => {
      const value = row as { created_at: string; garment_id: string; id: string; studio_id: string; updated_at: string };
      return { ...base({ ...value, id: crypto.randomUUID() }), collectionId: value.id, garmentId: value.garment_id, role: 'primary', sortOrder } satisfies CanonicalEditorialCollectionGarment;
    }),
    editorialCollections: rows('editorial_collections').map((row) => {
      const value = row as { created_at: string; garment_id: string; id: string; status: CanonicalEditorialCollection['status']; studio_id: string; template_type: string; theme_id: string | null; title: string; updated_at: string };
      return { ...base(value), approvedAt: null, approvedBy: null, description: '', exportSettings: {}, primaryGarmentId: value.garment_id, primaryGarmentVersionId: null, publishedAt: null, publishedBy: null, status: value.status === 'approved' ? 'approved' : 'draft', subtitle: '', templateType: value.template_type, themeId: value.theme_id, title: value.title, transition: {} } satisfies CanonicalEditorialCollection;
    }),
    editorialExports: [] as CanonicalEditorialExport[],
    editorialScenes: rows('editorial_scenes').map((row) => {
      const value = row as { collection_id: string; created_at: string; id: string; scene_type: string; sort_order: number; studio_id: string; title: string | null; transition_json: Record<string, unknown>; updated_at: string };
      const metadata = value.transition_json ?? {};
      return { ...base(value), background: metadata.background as Record<string, unknown> ?? {}, collectionId: value.collection_id, description: String(metadata.description ?? ''), narrativeRole: String(metadata.narrativeRole ?? 'supporting'), sceneType: value.scene_type, sortOrder: value.sort_order, subtitle: String(metadata.subtitle ?? ''), title: value.title ?? 'Untitled scene', transition: metadata.transition as Record<string, unknown> ?? {} } satisfies CanonicalEditorialScene;
    }),
    factories: [] as CanonicalFactory[],
    fitIssuePromotions: [] as CanonicalFitIssuePromotion[],
    fitIssues: [] as CanonicalFitIssue[],
    fitSessionMedia: [] as CanonicalFitSessionMedia[],
    fitSessions: [] as CanonicalFitSession[],
    garmentComponents: [] as CanonicalGarmentComponent[],
    conflicts: [],
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
      const value = row as { checksum: string; created_at: string; height: number | null; id: string; mime_type: string; size_bytes: number; source_asset_id: string; storage_path: string; studio_id: string; updated_at: string; variant: CanonicalMediaDerivative['variant']; width: number | null };
      return { ...base(value), assetId: value.source_asset_id, checksum: value.checksum, height: value.height, mimeType: value.mime_type, sizeBytes: value.size_bytes, storagePath: value.storage_path, variant: value.variant, width: value.width };
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
    portfolioEditorials: rows('portfolio_editorials').map((row) => {
      const value = row as { collection_id: string; created_at: string; profile_id: string; revision?: number; slug: string; sort_order: number; studio_id: string; updated_at: string; visibility: CanonicalPortfolioEditorial['visibility'] };
      return { ...base({ ...value, id: `${value.profile_id}:${value.collection_id}` }), collectionId: value.collection_id, profileId: value.profile_id, selectedAssetIds: [], selectedSceneIds: [], slug: value.slug, sortOrder: value.sort_order, sourceVersionId: null, visibility: value.visibility } satisfies CanonicalPortfolioEditorial;
    }),
    portfolioProfiles: rows('portfolio_profiles').map((row) => {
      const value = row as { bio: string; created_at: string; headline: string; id: string; status: CanonicalPortfolioProfile['status']; studio_id: string; updated_at: string; username_slug: string };
      return { ...base(value), avatarAssetId: seed.data.portfolioProfile.avatarImageId || null, bio: value.bio ?? '', displayName: seed.data.portfolioProfile.displayName || 'Mystic Lore Portfolio', email: seed.data.portfolioProfile.email ?? '', headline: value.headline ?? '', location: seed.data.portfolioProfile.location ?? '', resumePublicUrl: seed.data.portfolioProfile.resumeUrl ?? '', status: value.status, usernameSlug: value.username_slug } satisfies CanonicalPortfolioProfile;
    }),
    portfolioProjects: rows('portfolio_projects').map((row) => {
      const value = row as { case_study_json: { legacyPortfolioSettings?: Record<string, unknown> }; created_at: string; garment_id: string; id: string; profile_id: string; slug: string; sort_order: number; studio_id: string; updated_at: string; visibility: CanonicalPortfolioProject['visibility'] };
      const settings = value.case_study_json.legacyPortfolioSettings ?? {};
      return { ...base(value), caseStudy: { challenge: String(settings.portfolioChallenge ?? ''), outcome: String(settings.portfolioOutcome ?? ''), overview: String(settings.portfolioOverview ?? ''), processSummary: String(settings.portfolioProcessSummary ?? ''), role: String(settings.portfolioRole ?? ''), skills: Array.isArray(settings.portfolioSkills) ? settings.portfolioSkills.map(String) : [], solution: String(settings.portfolioSolution ?? ''), tools: Array.isArray(settings.portfolioTools) ? settings.portfolioTools.map(String) : [] }, featured: Boolean(settings.featured), garmentId: value.garment_id, includeTechnicalExcerpt: false, profileId: value.profile_id, selectedAssetIds: Array.isArray(settings.featuredPortfolioImageIds) ? settings.featuredPortfolioImageIds.map(String) : [], slug: value.slug, sortOrder: value.sort_order, sourceVersionId: null, visibility: value.visibility } satisfies CanonicalPortfolioProject;
    }),
    portfolioTechnicalExcerpts: [],
    publications: [],
    productionMilestones: [] as CanonicalProductionMilestone[],
    productionOrders: [] as CanonicalProductionOrder[],
    qcInspections: [] as CanonicalQcInspection[],
    qcResults: [] as CanonicalQcResult[],
    qcTemplateChecks: [] as CanonicalQcTemplateCheck[],
    qcTemplates: [] as CanonicalQcTemplate[],
    qcWaivers: [] as CanonicalQcWaiver[],
    restoreOperations: [],
    releaseTasks: rows('tasks').map((row) => {
      const value = row as { assignee_id?: string | null; created_at: string; description: string; due_at: string | null; garment_id: string | null; id: string; priority: CanonicalReleaseTask['priority']; sort_order: number; status: CanonicalReleaseTask['status']; studio_id: string; title: string; updated_at: string };
      return { ...base(value), assigneeId: value.assignee_id ?? null, description: value.description, dueAt: value.due_at, garmentId: value.garment_id ?? '', priority: value.priority, sortOrder: value.sort_order, status: value.status, title: value.title } satisfies CanonicalReleaseTask;
    }),
    sampleRoundMedia: [] as CanonicalSampleRoundMedia[],
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
    versionDependencies: [],
    versionEditorial: [],
    versionPortfolio: [],
  });
}

export function normalizeWorkspace(state: CanonicalWorkspaceState): CanonicalWorkspaceState {
  return {
    ...state,
    aiAcceptanceCommands: [...state.aiAcceptanceCommands].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)),
    aiAcceptances: [...state.aiAcceptances].sort((a, b) => b.acceptedAt.localeCompare(a.acceptedAt)),
    aiArtifacts: [...state.aiArtifacts].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt)),
    aiInputRefs: [...state.aiInputRefs].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)),
    aiJobs: [...state.aiJobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    annotations: [...state.annotations],
    bomItems: [...state.bomItems].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)),
    calendarEvents: [...state.calendarEvents].sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id)),
    changeEvents: [...state.changeEvents].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.id.localeCompare(b.id)),
    collections: [...state.collections].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    componentVariants: [...state.componentVariants],
    components: [...state.components].sort((a, b) => a.name.localeCompare(b.name)),
    constructionDetails: [...state.constructionDetails].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)),
    constructionSections: [...state.constructionSections].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)),
    constructionSteps: [...state.constructionSteps].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)),
    costItems: [...state.costItems].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)),
    costSheets: [...state.costSheets].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    designBriefs: [...state.designBriefs],
    entityRevisions: [...state.entityRevisions],
    editorialAssets: [...state.editorialAssets].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)),
    editorialBlocks: [...state.editorialBlocks].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)),
    editorialCollectionGarments: [...state.editorialCollectionGarments].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)),
    editorialCollections: [...state.editorialCollections].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title)),
    editorialExports: [...state.editorialExports].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt)),
    editorialScenes: [...state.editorialScenes].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)),
    factories: [...state.factories].sort((a, b) => a.name.localeCompare(b.name)),
    fitIssuePromotions: [...state.fitIssuePromotions],
    fitIssues: [...state.fitIssues],
    fitSessionMedia: [...state.fitSessionMedia].sort((a, b) => a.sortOrder - b.sortOrder),
    fitSessions: [...state.fitSessions].sort((a, b) => b.fitDate.localeCompare(a.fitDate)),
    flatAnnotations: [...state.flatAnnotations],
    garmentVersions: [...state.garmentVersions],
    gradeRuleValues: [...state.gradeRuleValues],
    gradeRules: [...state.gradeRules],
    garmentComponents: [...state.garmentComponents],
    garmentMaterials: [...state.garmentMaterials],
    garmentMedia: [...state.garmentMedia].sort((a, b) => a.sortOrder - b.sortOrder),
    garments: [...state.garments].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    conflicts: [...state.conflicts],
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
    portfolioEditorials: [...state.portfolioEditorials].sort((a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug)),
    portfolioProfiles: [...state.portfolioProfiles],
    portfolioProjects: [...state.portfolioProjects].sort((a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug)),
    portfolioTechnicalExcerpts: [...state.portfolioTechnicalExcerpts],
    publications: [...state.publications].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
    productionMilestones: [...state.productionMilestones].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)),
    productionOrders: [...state.productionOrders].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    qcInspections: [...state.qcInspections].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    qcResults: [...state.qcResults],
    qcTemplateChecks: [...state.qcTemplateChecks].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)),
    qcTemplates: [...state.qcTemplates].sort((a, b) => a.name.localeCompare(b.name) || b.version - a.version),
    qcWaivers: [...state.qcWaivers].sort((a, b) => b.waivedAt.localeCompare(a.waivedAt)),
    restoreOperations: [...state.restoreOperations],
    releaseTasks: [...state.releaseTasks],
    sampleRoundMedia: [...state.sampleRoundMedia].sort((a, b) => a.sortOrder - b.sortOrder),
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
    versionDependencies: [...state.versionDependencies],
    versionEditorial: [...state.versionEditorial].sort((a, b) => a.sortOrder - b.sortOrder),
    versionPortfolio: [...state.versionPortfolio].sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

export function addCollection(state: CanonicalWorkspaceState, name: string, season = '') {
  const record: CanonicalCollection = {
    ...newRecord(state.studioId), name: name.trim(), season: season.trim() || null,
    sortOrder: state.collections.length, status: 'draft',
  };
  return { state: normalizeWorkspace({ ...state, collections: [...state.collections, record] }), record };
}

export function addTask(
  state: CanonicalWorkspaceState,
  input: Pick<CanonicalReleaseTask, 'description' | 'dueAt' | 'garmentId' | 'priority' | 'title'>,
) {
  const record: CanonicalReleaseTask = {
    ...newRecord(state.studioId),
    assigneeId: null,
    description: input.description.trim(),
    dueAt: input.dueAt,
    garmentId: input.garmentId,
    priority: input.priority,
    sortOrder: state.releaseTasks.length,
    status: 'todo',
    title: input.title.trim(),
  };
  return { record, state: normalizeWorkspace({ ...state, releaseTasks: [...state.releaseTasks, record] }) };
}

export function updateTaskStatus(
  state: CanonicalWorkspaceState,
  taskId: string,
  status: CanonicalReleaseTask['status'],
) {
  return normalizeWorkspace({
    ...state,
    releaseTasks: state.releaseTasks.map((task) => (
      task.id === taskId ? touch({ ...task, status }) : task
    )),
  });
}

export function addCalendarEvent(
  state: CanonicalWorkspaceState,
  input: Pick<CanonicalCalendarEvent, 'endsAt' | 'eventType' | 'garmentId' | 'startsAt' | 'title'>,
) {
  if (input.endsAt && input.endsAt < input.startsAt) {
    throw new Error('Calendar event end must be after its start.');
  }
  const record: CanonicalCalendarEvent = {
    ...newRecord(state.studioId),
    assigneeId: null,
    endsAt: input.endsAt,
    eventType: input.eventType.trim() || 'studio',
    garmentId: input.garmentId,
    startsAt: input.startsAt,
    title: input.title.trim(),
  };
  return { record, state: normalizeWorkspace({ ...state, calendarEvents: [...state.calendarEvents, record] }) };
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
  if (state.garmentVersions.some((item) => item.garmentId === garmentId)) {
    throw new Error('This garment has protected Freeze Frames or downstream evidence and cannot be deleted.');
  }
  const boardIds = new Set(state.moodboards.filter((item) => item.garmentId === garmentId).map((item) => item.id));
  const specIds = new Set(state.technicalSpecs.filter((item) => item.garmentId === garmentId).map((item) => item.id));
  const flatIds = new Set(state.technicalFlats.filter((item) => specIds.has(item.specId)).map((item) => item.id));
  const pomIds = new Set(state.pomPoints.filter((item) => specIds.has(item.specId)).map((item) => item.id));
  const setIds = new Set(state.measurementSets.filter((item) => specIds.has(item.specId)).map((item) => item.id));
  const ruleIds = new Set(state.gradeRules.filter((item) => specIds.has(item.specId)).map((item) => item.id));
  const sampleRoundIds = new Set(state.sampleRounds.filter((item) => item.garmentId === garmentId).map((item) => item.id));
  const fitSessionIds = new Set(state.fitSessions.filter((item) => sampleRoundIds.has(item.sampleRoundId)).map((item) => item.id));
  const fitIssueIds = new Set(state.fitIssues.filter((item) => fitSessionIds.has(item.fitSessionId)).map((item) => item.id));
  const sectionIds = new Set(state.constructionSections.filter((item) => specIds.has(item.specId)).map((item) => item.id));
  const stepIds = new Set(state.constructionSteps.filter((item) => sectionIds.has(item.sectionId)).map((item) => item.id));
  const runIds = new Set(state.validationRuns.filter((item) => specIds.has(item.specId)).map((item) => item.id));
  const costSheetIds = new Set(state.costSheets.filter((item) => item.garmentId === garmentId).map((item) => item.id));
  const productionOrderIds = new Set(state.productionOrders.filter((item) => item.garmentId === garmentId).map((item) => item.id));
  const qcInspectionIds = new Set(state.qcInspections.filter((item) => productionOrderIds.has(item.productionOrderId)).map((item) => item.id));
  return normalizeWorkspace({
    ...state,
    annotations: state.annotations.filter((item) => item.garmentId !== garmentId),
    bomItems: state.bomItems.filter((item) => !specIds.has(item.specId)),
    calendarEvents: state.calendarEvents.filter((item) => item.garmentId !== garmentId),
    constructionDetails: state.constructionDetails.filter((item) => !stepIds.has(item.stepId)),
    constructionSections: state.constructionSections.filter((item) => !specIds.has(item.specId)),
    constructionSteps: state.constructionSteps.filter((item) => !sectionIds.has(item.sectionId)),
    costItems: state.costItems.filter((item) => !costSheetIds.has(item.costSheetId)),
    costSheets: state.costSheets.filter((item) => item.garmentId !== garmentId),
    garmentComponents: state.garmentComponents.filter((item) => item.garmentId !== garmentId),
    designBriefs: state.designBriefs.filter((item) => item.garmentId !== garmentId),
    fitIssuePromotions: state.fitIssuePromotions.filter((item) => !fitIssueIds.has(item.fitIssueId)),
    fitIssues: state.fitIssues.filter((item) => !fitSessionIds.has(item.fitSessionId)),
    fitSessionMedia: state.fitSessionMedia.filter((item) => !fitSessionIds.has(item.fitSessionId)),
    fitSessions: state.fitSessions.filter((item) => !sampleRoundIds.has(item.sampleRoundId)),
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
    productionMilestones: state.productionMilestones.filter((item) => !productionOrderIds.has(item.productionOrderId)),
    productionOrders: state.productionOrders.filter((item) => item.garmentId !== garmentId),
    qcInspections: state.qcInspections.filter((item) => !productionOrderIds.has(item.productionOrderId)),
    qcResults: state.qcResults.filter((item) => !qcInspectionIds.has(item.inspectionId)),
    qcWaivers: state.qcWaivers.filter((item) => !qcInspectionIds.has(item.inspectionId)),
    restoreOperations: state.restoreOperations.filter((item) => item.garmentId !== garmentId),
    releaseTasks: state.releaseTasks.filter((item) => item.garmentId !== garmentId),
    sampleRoundMedia: state.sampleRoundMedia.filter((item) => !sampleRoundIds.has(item.sampleRoundId)),
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
function deterministicGeneratedAt(data: StudioData) {
  return [data.portfolioProfile.updatedAt, data.projects[0]?.updatedAt]
    .find((value): value is string => Boolean(value && Number.isFinite(Date.parse(value))))
    ?? '2026-08-24T00:00:00.000Z';
}
