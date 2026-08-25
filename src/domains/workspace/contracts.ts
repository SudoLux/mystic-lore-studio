/**
 * WP3's browser-side representation of the canonical garment graph. This is
 * intentionally a typed subset of the accepted SQL schema: it is enough for
 * the Garment and Library routes, while Technical/Production remain owned by
 * their later work packages.
 */
export type CanonicalRecord = {
  createdAt: string;
  id: string;
  revision: number;
  studioId: string;
  updatedAt: string;
};

export type CanonicalCollection = CanonicalRecord & {
  name: string;
  season: string | null;
  sortOrder: number;
  status: 'active' | 'archived' | 'complete' | 'draft' | 'on_hold';
};

export type CanonicalGarment = CanonicalRecord & {
  collectionId: string | null;
  garmentCode: string;
  garmentType: string;
  phase: 'brief' | 'design' | 'materials' | 'technical' | 'sampling' | 'production' | 'story' | 'portfolio';
  status: 'draft' | 'active' | 'on_hold' | 'approved' | 'released' | 'archived' | 'cancelled';
  title: string;
};

export type CanonicalDesignBrief = CanonicalRecord & {
  colorStory: string;
  garmentId: string;
  intent: string;
  keyFeatures: string[];
  silhouette: string;
  targetWearer: string;
};

export type CanonicalMediaAsset = CanonicalRecord & {
  checksum: string;
  height: number | null;
  mimeType: string;
  name: string;
  rights: { credit?: string; expiresAt?: string; license?: string; source?: string };
  sizeBytes: number;
  storagePath: string;
  width: number | null;
  localBlobKey?: string;
  storageState?: 'queued' | 'stored' | 'uploaded';
};

export type CanonicalMediaDerivative = CanonicalRecord & {
  assetId: string;
  checksum: string;
  storagePath: string;
  variant: 'thumbnail' | 'display' | 'editorial' | 'portfolio' | 'technical' | 'export';
};

export type CanonicalGarmentMedia = CanonicalRecord & {
  assetId: string;
  garmentId: string;
  role: 'hero' | 'gallery' | 'design' | 'flat' | 'sample' | 'detail' | 'editorial' | 'portfolio' | 'reference';
  sortOrder: number;
};

export type CanonicalMoodboard = CanonicalRecord & {
  garmentId: string;
  layout: Record<string, unknown>;
  sortOrder: number;
  title: string;
};

export type CanonicalMoodboardItem = CanonicalRecord & {
  assetId: string;
  boardId: string;
  caption: string;
  position: Record<string, unknown>;
  sortOrder: number;
};

export type CanonicalAnnotation = CanonicalRecord & {
  assetId: string;
  body: string;
  garmentId: string;
  status: 'open' | 'resolved' | 'dismissed';
};

export type CanonicalMaterial = CanonicalRecord & {
  category: string;
  composition: string;
  materialCode: string;
  name: string;
  status: 'active' | 'inactive' | 'archived';
};

export type CanonicalMaterialVariant = CanonicalRecord & {
  colorHex: string | null;
  colorName: string;
  materialId: string;
  sku: string;
  status: 'active' | 'inactive' | 'archived';
  weightGsm: number | null;
  width: number | null;
  widthUnit: 'mm' | 'cm' | 'in' | null;
};

export type InventoryEntryType = 'receive' | 'reserve' | 'release' | 'consume' | 'return' | 'adjust';
export type CanonicalInventoryEntry = CanonicalRecord & {
  entryType: InventoryEntryType;
  note: string | null;
  occurredAt: string;
  quantity: number;
  unit: 'mm' | 'cm' | 'm' | 'in' | 'yd' | 'g' | 'kg' | 'oz' | 'lb' | 'each' | 'pair' | 'set' | 'roll';
  variantId: string;
};

export type CanonicalGarmentMaterial = CanonicalRecord & {
  garmentId: string;
  placement: string | null;
  requiredQuantity: number;
  reservedQuantity: number;
  role: string;
  status: 'planned' | 'reserved' | 'issued' | 'consumed' | 'released';
  unit: CanonicalInventoryEntry['unit'];
  variantId: string;
};

export type CanonicalComponent = CanonicalRecord & {
  category: string;
  componentCode: string;
  name: string;
  spec: Record<string, unknown>;
  status: 'active' | 'inactive' | 'archived';
};

export type CanonicalComponentVariant = CanonicalRecord & {
  color: string;
  componentId: string;
  finish: string;
  size: string;
  sku: string;
  status: 'active' | 'inactive' | 'archived';
};

export type CanonicalGarmentComponent = CanonicalRecord & {
  garmentId: string;
  placement: string | null;
  quantity: number;
  status: 'planned' | 'reserved' | 'issued' | 'consumed' | 'released';
  unit: CanonicalInventoryEntry['unit'];
  variantId: string;
};

export type CanonicalSupplier = CanonicalRecord & {
  defaultLeadTimeDays: number | null;
  name: string;
  status: 'prospect' | 'active' | 'paused' | 'archived';
  supplierType: 'material' | 'component' | 'service' | 'mixed';
};

export type CanonicalSupplierItem = CanonicalRecord & {
  componentVariantId: string | null;
  currency: string;
  isPreferred: boolean;
  leadTimeDays: number | null;
  materialVariantId: string | null;
  sku: string;
  supplierId: string;
  unitCost: number;
};

export type CanonicalTemplate = CanonicalRecord & {
  name: string;
  status: 'draft' | 'active' | 'archived';
  payload: Record<string, unknown>;
  templateType: 'pom' | 'measurement' | 'grading' | 'bom' | 'construction' | 'validation' | 'tech_pack';
  version: number;
};

export type TechnicalFlatView = 'front' | 'back' | 'left' | 'right' | 'inside' | 'detail' | 'other';
export type CanonicalTechnicalSpec = CanonicalRecord & { garmentId: string; status: 'draft' | 'in_review' | 'approved' | 'released' | 'superseded'; baseSize: string; unit: 'mm' | 'cm' | 'in'; revisionLabel: string; releaseVersionId: string | null; releaseValidationRunId: string | null; releasedBy: string | null; releasedAt: string | null };
export type CanonicalTechnicalFlat = CanonicalRecord & { specId: string; view: TechnicalFlatView; assetId: string; source: 'uploaded' | 'drawn' | 'generated' | 'derived'; approvedAt: string | null; approvedBy: string | null; sortOrder: number };
export type CanonicalFlatAnnotation = CanonicalRecord & { flatId: string; anchor: { x: number; y: number }; label: string; detail: string; severity: 'info' | 'warning' | 'critical'; status: 'open' | 'resolved' | 'dismissed'; sortOrder: number };
export type CanonicalTechnicalFile = CanonicalRecord & { specId: string; assetId: string; fileType: 'pattern' | 'cad' | 'illustrator' | 'spreadsheet' | 'pdf' | 'reference' | 'other'; versionLabel: string; isSource: boolean };
export type ValidationDomain = 'flats' | 'pom' | 'measurements' | 'bom' | 'construction' | 'files' | 'privacy' | 'release';
export type CanonicalValidationIssue = { code: string; domain?: ValidationDomain; entityId?: string; field: string; message: string; severity: 'error' | 'warning' | 'critical'; waivable?: boolean };
export type CanonicalValidationRun = CanonicalRecord & { specId: string; garmentVersionId: string | null; status: 'passed' | 'failed' | 'warning' | 'error'; rulesetVersion: string; issues: CanonicalValidationIssue[]; ranAt: string; actorId: string | null };
export type CanonicalGarmentVersion = CanonicalRecord & { garmentId: string; versionNo: number; label: string; scope: 'technical'; checksum: string; snapshot: Record<string, unknown> };
export type TechPackSectionManifestItem = { checksum: string; id: string; recordCount: number; title: string };
export type CanonicalTechPackExport = CanonicalRecord & { specId: string; garmentVersionId: string; exportAssetId: string; format: 'pdf' | 'zip'; checksum: string; templateId: string; templateVersion: number; sourceRevisionLabel: string; deterministicFilename: string; rulesetVersion: string; storagePath: string; generatedAt: string; sectionManifest: TechPackSectionManifestItem[]; approvedBy: string | null; approvedAt: string | null };
export type CanonicalPomPoint = CanonicalRecord & { specId: string; code: string; name: string; method: string; diagramAnchor: { x: number; y: number }; sortOrder: number };
export type CanonicalMeasurementSet = CanonicalRecord & { specId: string; name: string; sampleType: string | null; baseSize: string; status: 'draft' | 'in_review' | 'approved' | 'superseded' };
export type CanonicalMeasurementValue = CanonicalRecord & { setId: string; pomPointId: string; size: string; target: number; tolerancePlus: number; toleranceMinus: number };
export type CanonicalGradeRule = CanonicalRecord & { specId: string; name: string; sizeRange: string[]; status: 'draft' | 'approved' | 'superseded' };
export type CanonicalGradeRuleValue = CanonicalRecord & { gradeRuleId: string; pomPointId: string; fromSize: string; toSize: string; delta: number };
export type CanonicalSampleRound = CanonicalRecord & { garmentId: string; garmentVersionId: string | null; roundNo: number; sampleType: string; status: 'planned' | 'requested' | 'in_progress' | 'received' | 'reviewed' | 'approved' | 'rejected'; receivedAt: string | null };
export type CanonicalFitMeasurement = CanonicalRecord & { sampleRoundId: string; pomPointId: string; size: string; actual: number; variance: number };
export type CanonicalRestoreOperation = CanonicalRecord & { garmentId: string; sourceVersionId: string; resultVersionId: string; selectedPomPointIds: string[]; selectedMeasurementKeys: string[]; reason: string };
export type CanonicalBomItem = CanonicalRecord & { specId: string; itemType: 'material_variant' | 'component_variant' | 'custom'; materialVariantId: string | null; componentVariantId: string | null; intentionalFreeText: boolean; description: string; quantity: number; unit: CanonicalInventoryEntry['unit']; placement: string; supplierItemId: string | null; substituteItemId: string | null; status: 'draft' | 'linked' | 'approved' | 'shortage' | 'substituted'; shortageQuantity: number; unitCost: number; currency: string; costImpact: number; sortOrder: number };
export type CanonicalConstructionSection = CanonicalRecord & { specId: string; name: string; sortOrder: number; status: 'draft' | 'approved' | 'superseded' };
export type CanonicalConstructionStep = CanonicalRecord & { sectionId: string; stepNumber: number; operation: string; machine: string; machineRequired: boolean; stitchSpec: string; stitchRequired: boolean; seamAllowance: number | null; status: 'draft' | 'ready' | 'approved'; sortOrder: number };
export type CanonicalConstructionDetail = CanonicalRecord & { stepId: string; assetId: string | null; anchor: { x: number; y: number } | null; callout: string; severity: 'info' | 'warning' | 'critical'; status: 'open' | 'resolved' | 'dismissed'; sortOrder: number };
export type CanonicalTemplateApplication = CanonicalRecord & { templateId: string; garmentId: string; appliedBy: string | null; appliedAt: string; mapping: { copiedIds: string[]; sourceVersion: number } };
export type CanonicalReleaseTask = CanonicalRecord & { garmentId: string; title: string; description: string; status: 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled'; priority: 'low' | 'medium' | 'high' | 'urgent'; dueAt: string | null; assigneeId: string | null; sortOrder: number };
export type CanonicalValidationWaiver = CanonicalRecord & { specId: string; validationRunId: string; ruleCode: string; domain: Exclude<ValidationDomain, 'privacy'>; reason: string; actorId: string; followUpTaskId: string; waivedAt: string };

export type CanonicalWorkspaceState = {
  annotations: CanonicalAnnotation[];
  bomItems: CanonicalBomItem[];
  collections: CanonicalCollection[];
  componentVariants: CanonicalComponentVariant[];
  components: CanonicalComponent[];
  constructionDetails: CanonicalConstructionDetail[];
  constructionSections: CanonicalConstructionSection[];
  constructionSteps: CanonicalConstructionStep[];
  designBriefs: CanonicalDesignBrief[];
  garmentComponents: CanonicalGarmentComponent[];
  garmentMaterials: CanonicalGarmentMaterial[];
  garmentMedia: CanonicalGarmentMedia[];
  garments: CanonicalGarment[];
  inventoryEntries: CanonicalInventoryEntry[];
  materialVariants: CanonicalMaterialVariant[];
  materials: CanonicalMaterial[];
  mediaAssets: CanonicalMediaAsset[];
  mediaDerivatives: CanonicalMediaDerivative[];
  moodboardItems: CanonicalMoodboardItem[];
  moodboards: CanonicalMoodboard[];
  flatAnnotations: CanonicalFlatAnnotation[];
  garmentVersions: CanonicalGarmentVersion[];
  gradeRuleValues: CanonicalGradeRuleValue[];
  gradeRules: CanonicalGradeRule[];
  measurementSets: CanonicalMeasurementSet[];
  measurementValues: CanonicalMeasurementValue[];
  pomPoints: CanonicalPomPoint[];
  restoreOperations: CanonicalRestoreOperation[];
  releaseTasks: CanonicalReleaseTask[];
  sampleRounds: CanonicalSampleRound[];
  fitMeasurements: CanonicalFitMeasurement[];
  schemaVersion: 4;
  studioId: string;
  suppliers: CanonicalSupplier[];
  supplierItems: CanonicalSupplierItem[];
  templates: CanonicalTemplate[];
  templateApplications: CanonicalTemplateApplication[];
  technicalFiles: CanonicalTechnicalFile[];
  technicalFlats: CanonicalTechnicalFlat[];
  technicalSpecs: CanonicalTechnicalSpec[];
  techPackExports: CanonicalTechPackExport[];
  validationRuns: CanonicalValidationRun[];
  validationWaivers: CanonicalValidationWaiver[];
};

export type WorkspaceSyncState = 'loading' | 'ready' | 'offline' | 'conflict' | 'error';

export type RelationshipOption = {
  detail: string;
  id: string;
  inUseBy: string[];
  label: string;
  status?: string;
};
