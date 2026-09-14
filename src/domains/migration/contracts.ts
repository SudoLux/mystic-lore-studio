import type { StudioData } from '../../lib/studioStorage';
import type { SyncOperation } from '../../lib/studioSyncStorage';

export type CanonicalMigrationTable = keyof CanonicalRowsByTable;

export type CanonicalRowsByTable = {
  profiles: Array<{
    id: string;
    user_id: string;
    display_name: string;
    locale: string;
    created_at: string;
    updated_at: string;
  }>;
  studios: Array<{
    id: string;
    owner_user_id: string;
    name: string;
    slug: string;
    timezone: string;
    created_at: string;
    updated_at: string;
  }>;
  studio_members: Array<{
    id: string;
    studio_id: string;
    user_id: string;
    role: 'owner';
    status: 'active';
    joined_at: string;
    created_at: string;
    updated_at: string;
  }>;
  studio_settings: Array<{
    studio_id: string;
    units: 'mm' | 'cm' | 'in';
    currency: string;
    version_policy: Record<string, unknown>;
    ai_policy: Record<string, unknown>;
    created_at: string;
    updated_at: string;
  }>;
  collections: Array<{
    id: string;
    studio_id: string;
    name: string;
    season: string | null;
    status: 'active' | 'archived' | 'complete' | 'draft' | 'on_hold';
    sort_order: number;
    created_at: string;
    updated_at: string;
  }>;
  garments: Array<{
    id: string;
    studio_id: string;
    collection_id: string | null;
    garment_code: string;
    title: string;
    garment_type: string;
    status: 'active' | 'approved' | 'archived' | 'cancelled' | 'draft' | 'on_hold' | 'released';
    phase: 'brief' | 'design' | 'materials' | 'portfolio' | 'production' | 'sampling' | 'story' | 'technical';
    created_at: string;
    updated_at: string;
  }>;
  tags: Array<{
    id: string;
    studio_id: string;
    name: string;
    color: string | null;
    scope: 'garment';
    created_at: string;
    updated_at: string;
  }>;
  garment_tags: Array<{
    studio_id: string;
    garment_id: string;
    tag_id: string;
    created_at: string;
  }>;
  design_briefs: Array<{
    id: string;
    studio_id: string;
    garment_id: string;
    intent: string;
    target_wearer: string;
    silhouette: string;
    color_story: string;
    key_features: string[];
    created_at: string;
    updated_at: string;
  }>;
  media_assets: Array<{
    id: string;
    studio_id: string;
    created_by: string;
    storage_path: string;
    original_filename: string;
    mime_type: string;
    size_bytes: number;
    checksum: string;
    rights_json: Record<string, unknown>;
    width: number | null;
    height: number | null;
    created_at: string;
    updated_at: string;
  }>;
  garment_media: Array<{
    id: string;
    studio_id: string;
    garment_id: string;
    asset_id: string;
    role: 'design' | 'editorial' | 'gallery' | 'hero';
    sort_order: number;
    framing_json: Record<string, unknown>;
    created_at: string;
    updated_at: string;
  }>;
  materials: Array<{
    id: string;
    studio_id: string;
    material_code: string;
    name: string;
    category: string;
    composition: string;
    status: 'active' | 'archived' | 'inactive';
    created_at: string;
    updated_at: string;
  }>;
  material_variants: Array<{
    id: string;
    studio_id: string;
    material_id: string;
    color_name: string;
    color_hex: string | null;
    width: number | null;
    width_unit: 'in' | null;
    weight_gsm: number | null;
    sku: string;
    status: 'active' | 'archived' | 'inactive';
    created_at: string;
    updated_at: string;
  }>;
  inventory_entries: Array<{
    id: string;
    studio_id: string;
    variant_id: string;
    entry_type: 'adjust' | 'consume' | 'receive' | 'release' | 'reserve' | 'return';
    quantity: number;
    unit: 'yd';
    occurred_at: string;
    actor_id: string;
    note: string | null;
    created_at: string;
  }>;
  garment_materials: Array<{
    id: string;
    studio_id: string;
    garment_id: string;
    variant_id: string;
    role: string;
    placement: string | null;
    required_quantity: number;
    reserved_quantity: number;
    unit: 'yd';
    status: 'consumed' | 'issued' | 'planned' | 'released' | 'reserved';
    created_at: string;
    updated_at: string;
  }>;
  editorial_collections: Array<{
    id: string;
    studio_id: string;
    garment_id: string;
    title: string;
    template_type: string;
    theme_id: string | null;
    status: 'draft';
    created_at: string;
    updated_at: string;
  }>;
  editorial_scenes: Array<{
    id: string;
    studio_id: string;
    collection_id: string;
    scene_type: string;
    title: string | null;
    sort_order: number;
    transition_json: Record<string, unknown>;
    created_at: string;
    updated_at: string;
  }>;
  editorial_blocks: Array<{
    id: string;
    studio_id: string;
    scene_id: string;
    block_type: string;
    content_json: Record<string, unknown>;
    settings_json: Record<string, unknown>;
    sort_order: number;
    created_at: string;
    updated_at: string;
  }>;
  editorial_assets: Array<{
    id: string;
    studio_id: string;
    collection_id: string;
    asset_id: string;
    role: string;
    usage_json: Record<string, unknown>;
    sort_order: number;
    created_at: string;
    updated_at: string;
  }>;
  portfolio_profiles: Array<{
    id: string;
    studio_id: string;
    username_slug: string;
    headline: string;
    bio: string;
    status: 'draft' | 'ready';
    created_at: string;
    updated_at: string;
  }>;
  portfolio_projects: Array<{
    id: string;
    studio_id: string;
    profile_id: string;
    garment_id: string;
    slug: string;
    case_study_json: Record<string, unknown>;
    visibility: 'private' | 'published' | 'ready';
    sort_order: number;
    created_at: string;
    updated_at: string;
  }>;
  portfolio_editorials: Array<{
    studio_id: string;
    profile_id: string;
    collection_id: string;
    slug: string;
    visibility: 'private' | 'published' | 'ready';
    sort_order: number;
    created_at: string;
    updated_at: string;
  }>;
  tasks: Array<{
    id: string;
    studio_id: string;
    garment_id: string | null;
    title: string;
    description: string;
    status: 'blocked' | 'cancelled' | 'done' | 'in_progress' | 'todo';
    priority: 'high' | 'low' | 'medium' | 'urgent';
    due_at: string | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
  }>;
  sync_tombstones: Array<{
    id: string;
    studio_id: string;
    user_id: string;
    entity_type: string;
    client_id: string;
    deleted_at: string;
    created_at: string;
    updated_at: string;
  }>;
  change_events: Array<{
    id: string;
    studio_id: string;
    garment_id: string | null;
    origin: 'migration';
    actor_id: string;
    operation_id: string;
    entity_type: string;
    entity_id: string;
    operation: 'create' | 'delete' | 'update';
    json_patch: unknown[];
    inverse_patch: unknown[];
    occurred_at: string;
    created_at: string;
  }>;
};

export type CanonicalMigrationBatch = {
  [TTable in CanonicalMigrationTable]: {
    access: TTable extends 'change_events' ? 'server' : 'client';
    onConflict: string;
    rows: CanonicalRowsByTable[TTable];
    table: TTable;
    writeMode: TTable extends 'change_events' | 'inventory_entries' | 'studios'
      ? 'insert-ignore'
      : 'upsert';
  }
}[CanonicalMigrationTable];

export type LegacyMigrationTombstone = {
  clientId: string;
  deletedAt: string;
  entity: string;
};

export type LegacyMigrationInput = {
  currency?: string;
  data: StudioData;
  generatedAt: string;
  ownerUserId: string;
  queuedWrites?: SyncOperation[];
  sourceId: string;
  studioId?: string;
  studioName: string;
  studioSlug: string;
  timezone?: string;
  tombstones?: LegacyMigrationTombstone[];
  units?: 'mm' | 'cm' | 'in';
};

export type MigrationNotice = {
  code: string;
  entity?: string;
  legacyId?: string;
  message: string;
};

export type MigrationIdMapping = {
  canonicalId: string;
  canonicalTable: CanonicalMigrationTable;
  legacyEntity: string;
  legacyId: string;
};

export type MigrationConflict = {
  clientId: string;
  entity: string;
  fields: Array<{
    before?: unknown;
    field: string;
    local: unknown;
    remote: unknown;
  }>;
  operationId: string;
  resolution: 'remote-retained';
};

export type MigrationReport = {
  schemaVersion: 'ml-studio-wp2-migration-report-v1';
  source: {
    checksum: string;
    id: string;
    version: number;
  };
  target: {
    ownerUserId: string;
    schema: 'ml_private';
    studioId: string;
  };
  rowCounts: {
    canonical: Record<string, number>;
    legacy: Record<string, number>;
  };
  idMappings: MigrationIdMapping[];
  warnings: MigrationNotice[];
  skippedRecords: MigrationNotice[];
  conflicts: MigrationConflict[];
  checksums: {
    canonicalPlan: string;
    roundTrip: string;
    source: string;
  };
  roundTrip: {
    exact: boolean;
    intentionalDifferences: string[];
    unexplainedDataLoss: number;
  };
  recovery: {
    deterministicIds: true;
    idempotentUpserts: true;
    legacyFixtureRetained: true;
    retryMode: 'resume-by-stable-upsert';
  };
  settingsPolicy: {
    canonicalStudioPolicy: string[];
    deviceOnlyLegacyFields: string[];
  };
  editorialLookbookOverlaps: Array<{
    editorialCollectionId: string;
    lookbookPageId: string;
    policy: 'preserve-both-until-wp7';
  }>;
};

export type CanonicalMigrationPlan = {
  batches: CanonicalMigrationBatch[];
  report: MigrationReport;
  retention: {
    effectiveData: StudioData;
    originalData: StudioData;
  };
};

export class LegacyMigrationValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Legacy migration input is invalid: ${issues.join(' ')}`);
    this.name = 'LegacyMigrationValidationError';
  }
}
