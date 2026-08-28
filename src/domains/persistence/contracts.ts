import type {
  CanonicalChangeOrigin,
  CanonicalWorkspaceState,
} from '../workspace';

export type CanonicalMutableEntity =
  | 'collections' | 'garments' | 'suppliers' | 'factories'
  | 'design_briefs' | 'inspiration_boards' | 'inspiration_items'
  | 'media_assets' | 'garment_media' | 'media_derivatives'
  | 'design_annotations' | 'materials' | 'material_variants'
  | 'inventory_entries' | 'garment_materials' | 'components'
  | 'component_variants' | 'garment_components' | 'supplier_items'
  | 'technical_specs' | 'technical_flats' | 'flat_annotations'
  | 'technical_files' | 'pom_points' | 'measurement_sets'
  | 'measurement_values' | 'grade_rules' | 'grade_rule_values'
  | 'fit_measurements' | 'bom_items' | 'construction_sections'
  | 'construction_steps' | 'construction_details' | 'technical_templates'
  | 'sample_rounds' | 'sample_round_media' | 'fit_sessions'
  | 'fit_session_media' | 'fit_issues' | 'fit_issue_promotions'
  | 'cost_sheets' | 'cost_items' | 'production_orders'
  | 'production_milestones' | 'qc_templates' | 'qc_template_checks'
  | 'qc_inspections' | 'qc_results' | 'qc_waivers'
  | 'editorial_collections' | 'editorial_collection_garments'
  | 'editorial_scenes' | 'editorial_blocks' | 'editorial_assets'
  | 'portfolio_profiles' | 'portfolio_projects' | 'portfolio_project_assets'
  | 'portfolio_editorials' | 'portfolio_editorial_scenes'
  | 'portfolio_editorial_assets' | 'portfolio_technical_excerpts'
  | 'tasks' | 'calendar_events' | 'ai_jobs' | 'ai_job_input_refs';

export type CanonicalMutation = {
  entityType: CanonicalMutableEntity;
  entityId: string;
  action: 'insert' | 'update' | 'delete';
  baseRevision: number | null;
  row: Record<string, unknown> | null;
};

export type CanonicalOperation = {
  operationId: string;
  studioId: string;
  garmentId: string | null;
  origin: CanonicalChangeOrigin;
  mutations: CanonicalMutation[];
  queuedAt: string;
};

export type CanonicalServerConflict = {
  entityType: CanonicalMutableEntity;
  entityId: string;
  expectedRevision: number | null;
  currentRevision: number | null;
  currentRow: Record<string, unknown> | null;
  reason: 'already_exists' | 'missing_or_denied' | 'stale_revision';
};

export type CanonicalAuthoritativeRow = {
  entityType: CanonicalMutableEntity;
  entityId: string;
  row: Record<string, unknown> | null;
};

export type CanonicalCommitResult =
  | {
    status: 'applied' | 'duplicate';
    authoritativeRows: CanonicalAuthoritativeRow[];
    eventIds: string[];
    operationId: string;
  }
  | {
    status: 'conflict';
    conflicts: CanonicalServerConflict[];
    authoritativeRows: CanonicalAuthoritativeRow[];
  };

export type CanonicalCommitHandle = {
  operationId: string;
  committed: Promise<CanonicalCommitResult>;
};

export type CanonicalPersistenceMode = 'local-recovery' | 'shadow' | 'cloud';

export type CanonicalOutboxEntry = {
  operation: CanonicalOperation;
  baseRows: Record<string, Record<string, unknown> | null>;
  localRows: Record<string, Record<string, unknown> | null>;
  dependencyIds: string[];
  attempts: number;
  status: 'pending' | 'sending' | 'conflict' | 'failed';
  lastError: string | null;
  conflicts: CanonicalServerConflict[];
};

export type CanonicalMigrationReport = {
  sourceKey: string;
  studioId: string;
  createdAt: string;
  sourceChecksum: string;
  collectionCounts: Record<string, number>;
  relationshipWarnings: string[];
  operationIds: string[];
  recoveryCopyKey: string;
  localStorageRemoved: boolean;
};

export interface CanonicalWorkspaceRepository {
  hydrate(studioId: string): Promise<CanonicalWorkspaceState>;
  dispatch(operation: CanonicalOperation): CanonicalCommitHandle;
  flush(): Promise<void>;
  refresh(): Promise<CanonicalWorkspaceState>;
}
