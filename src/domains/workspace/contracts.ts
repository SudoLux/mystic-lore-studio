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
  height: number | null;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  variant: 'thumbnail' | 'display' | 'editorial' | 'portfolio' | 'technical' | 'export';
  width: number | null;
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

export type CanonicalMaterialVariantProfile = CanonicalRecord & {
  bestUses: string[];
  binNumber: string;
  careNotes: string;
  countryOfOrigin: string;
  drape: string;
  handFeel: string;
  loreNote: string;
  moodTags: string[];
  opacity: string;
  privateNotes: string;
  purchaseDate: string | null;
  rarity: string;
  secondaryColors: string[];
  shelf: string;
  storageLocation: string;
  storageStatus: string;
  stretch: string;
  structure: string;
  texture: string;
  variantId: string;
  weaveOrKnit: string;
};

export type CanonicalMaterialVariantMedia = CanonicalRecord & {
  assetId: string;
  framing: Record<string, unknown>;
  role: 'swatch' | 'detail' | 'reference';
  sortOrder: number;
  variantId: string;
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
  capabilities: Record<string, unknown>;
  defaultLeadTimeDays: number | null;
  minimumOrderQuantity: number | null;
  name: string;
  status: 'prospect' | 'active' | 'paused' | 'archived';
  supplierType: 'material' | 'component' | 'service' | 'mixed';
};

export type CanonicalFactory = CanonicalRecord & {
  capabilities: Record<string, unknown>;
  contactEmail: string | null;
  contactName: string | null;
  leadTimeDays: number | null;
  minimumOrderQuantity: number | null;
  name: string;
  phone: string | null;
  status: 'prospect' | 'active' | 'paused' | 'archived';
  supplierId: string | null;
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
export type FreezeFrameScope = 'all' | 'design' | 'technical' | 'production' | 'editorial' | 'portfolio';
export type FreezeFrameKind = 'named' | 'release' | 'restore';
export type CanonicalGarmentVersion = CanonicalRecord & {
  baseRevision: number;
  checksum: string;
  createdBy: string | null;
  garmentId: string;
  kind: FreezeFrameKind;
  label: string;
  notes: string;
  parentVersionId: string | null;
  scope: FreezeFrameScope;
  snapshot: Record<string, unknown>;
  versionNo: number;
};
export type CanonicalEntityRevision = CanonicalRecord & { garmentVersionId: string; entityType: string; entityId: string; operation: 'create' | 'update' | 'delete' | 'restore'; snapshot: Record<string, unknown>; checksum: string; scope: FreezeFrameScope };
export type CanonicalJsonPatch = { op: 'add' | 'replace' | 'remove'; path: string; value?: unknown };
export type CanonicalChangeOrigin = 'user' | 'sync' | 'migration' | 'ai_acceptance' | 'restore' | 'publication' | 'system';
export type CanonicalChangeEvent = CanonicalRecord & { actorId: string | null; baseRevision: number | null; entityId: string; entityType: string; garmentId: string | null; inversePatch: CanonicalJsonPatch[]; jsonPatch: CanonicalJsonPatch[]; occurredAt: string; operation: 'create' | 'update' | 'delete' | 'restore' | 'publish' | 'unpublish' | 'role_change' | 'accept_ai'; operationId: string; origin: CanonicalChangeOrigin; relatedOperationIds: string[]; resultRevision: number | null; scope: FreezeFrameScope };
export type AiWorkflow = 'technical_flat_generation' | 'pom_assistance' | 'bom_assistance' | 'construction_recommendations' | 'tech_pack_validation' | 'editorial_generation' | 'portfolio_drafting';
export type AiJobStatus = 'queued' | 'running' | 'candidate' | 'accepted' | 'rejected' | 'failed' | 'cancelled';
export type AiArtifactDecision = 'pending' | 'accepted' | 'rejected';
export type AiEntityType = 'garment' | 'garment_version' | 'design_brief' | 'media_asset' | 'technical_spec' | 'technical_flat' | 'technical_template' | 'pom_point' | 'measurement_set' | 'bom_item' | 'construction_step' | 'validation_run' | 'material_variant' | 'component_variant' | 'editorial_collection' | 'portfolio_project';
export type AiAcceptanceCommandType = 'technical.register-flat' | 'measurement.create-pom' | 'bom.create-item' | 'construction.create-section' | 'construction.add-step' | 'technical.run-validation' | 'editorial.add-block' | 'portfolio.update-project';
export type AiCandidateField = { key: string; label: string; path: string; safeForPartialAcceptance: boolean; summary: string };
export type CanonicalAiJob = CanonicalRecord & {
  attemptNo: number;
  completedAt: string | null;
  errorCode: string | null;
  garmentId: string;
  idempotencyKey: string;
  inputRefIds: string[];
  jobType: AiWorkflow;
  promptTemplateVersion: string;
  provider: 'deterministic_fake' | 'configured_provider';
  requestedBy: string;
  retryOfJobId: string | null;
  selectedModel: string;
  sourceChecksum: string;
  startedAt: string | null;
  status: AiJobStatus;
};
export type CanonicalAiInputRef = CanonicalRecord & {
  entityId: string;
  entityRevision: number;
  entityType: AiEntityType;
  fieldPath: string;
  jobId: string;
  sortOrder: number;
  sourceChecksum: string;
  sourceVersionId: string | null;
};
export type CanonicalAiArtifact = CanonicalRecord & {
  acceptanceOperationId: string | null;
  acceptedPayloadChecksum: string | null;
  artifactType: AiWorkflow;
  candidate: Record<string, unknown>;
  candidateChecksum: string;
  confidence: Record<string, { context: string; level: 'low' | 'medium' | 'high' }>;
  decidedAt: string | null;
  decidedBy: string | null;
  decision: AiArtifactDecision;
  decisionReason: string;
  fields: AiCandidateField[];
  generatedAt: string;
  jobId: string;
  provenance: Record<string, unknown>;
  sourceChecksum: string;
};
export type CanonicalAiAcceptance = CanonicalRecord & {
  acceptedAt: string;
  acceptedPayloadChecksum: string;
  actorId: string;
  artifactId: string;
  candidateChecksum: string;
  decisionNote: string;
  operationId: string;
  sourceChecksum: string;
};
export type CanonicalAiAcceptanceCommand = CanonicalRecord & {
  acceptanceId: string;
  changeEventId: string;
  commandType: AiAcceptanceCommandType;
  fieldKey: string;
  sortOrder: number;
  targetEntityId: string;
  targetEntityType: string;
};
export type AiCandidatePanelState = AiJobStatus | 'modified_after_generation';
export type VersionDependencyKind = 'release' | 'export' | 'order' | 'publication';
export type CanonicalVersionDependency = { artifactId: string; kind: VersionDependencyKind; label: string; versionId: string };
export type CanonicalConflict = CanonicalRecord & { baseValue: unknown; entityId: string; entityType: string; field: string; garmentId: string; localOperationId: string; localValue: unknown; remoteOperationId: string; remoteValue: unknown; resolution: 'pending' | 'local' | 'remote' | 'custom'; resolvedValue?: unknown };
export type CanonicalEditorialVersionProjection = CanonicalRecord & { garmentId: string; liveDataStaleness: 'current' | 'source_changed' | 'media_missing' | 'privacy_blocked'; sortOrder: number; title: string };
export type EditorialCollectionStatus = 'draft' | 'in_review' | 'ready' | 'approved' | 'published' | 'retired' | 'archived';
export type EditorialLiveSource = 'garment' | 'design_brief' | 'material' | 'technical_spec' | 'measurement_set' | 'construction_step' | 'production_timeline' | 'garment_version';
export type CanonicalEditorialCollection = CanonicalRecord & { primaryGarmentId: string; primaryGarmentVersionId: string | null; title: string; subtitle: string; description: string; templateType: string; themeId: string | null; transition: Record<string, unknown>; exportSettings: Record<string, unknown>; status: EditorialCollectionStatus; approvedAt: string | null; approvedBy: string | null; publishedAt: string | null; publishedBy: string | null };
export type CanonicalEditorialCollectionGarment = CanonicalRecord & { collectionId: string; garmentId: string; role: 'primary' | 'supporting'; sortOrder: number };
export type CanonicalEditorialScene = CanonicalRecord & { collectionId: string; sceneType: string; title: string; subtitle: string; description: string; narrativeRole: string; background: Record<string, unknown>; transition: Record<string, unknown>; sortOrder: number };
export type CanonicalEditorialBlock = CanonicalRecord & { sceneId: string; blockType: string; content: Record<string, unknown>; settings: Record<string, unknown>; sortOrder: number; liveSource: EditorialLiveSource | null; sourceGarmentId: string | null; sourceVersionId: string | null; sourceEntityId: string | null; sourceFieldPath: string | null; sourceChecksum: string | null; staleness: 'current' | 'source_changed' | 'missing_source'; aiArtifactId: string | null };
export type CanonicalEditorialAsset = CanonicalRecord & { collectionId: string; assetId: string; role: string; usage: Record<string, unknown>; sortOrder: number };
export type CanonicalEditorialExport = CanonicalRecord & { collectionId: string; collectionRevision: number; format: 'pdf' | 'image'; checksum: string; storagePath: string; sourceGarmentVersionId: string | null; manifest: Record<string, unknown>; generatedAt: string; approvedAt: string | null; approvedBy: string | null };
export type CanonicalPortfolioVersionProjection = CanonicalRecord & { caseStudy: string; garmentId: string; selectedAssetIds: string[]; sortOrder: number; visibility: 'private' | 'ready' | 'published' };
export type PortfolioVisibility = 'private' | 'ready' | 'published';
export type CanonicalPortfolioProfile = CanonicalRecord & {
  avatarAssetId: string | null;
  bio: string;
  displayName: string;
  email: string;
  headline: string;
  location: string;
  resumePublicUrl: string;
  status: 'draft' | 'ready' | 'archived';
  usernameSlug: string;
};
export type CanonicalPortfolioProject = CanonicalRecord & {
  caseStudy: { challenge: string; outcome: string; overview: string; processSummary: string; role: string; skills: string[]; solution: string; tools: string[] };
  featured: boolean;
  garmentId: string;
  includeTechnicalExcerpt: boolean;
  profileId: string;
  selectedAssetIds: string[];
  slug: string;
  sortOrder: number;
  sourceVersionId: string | null;
  visibility: PortfolioVisibility;
};
export type CanonicalPortfolioEditorial = CanonicalRecord & {
  collectionId: string;
  profileId: string;
  selectedAssetIds: string[];
  selectedSceneIds: string[];
  slug: string;
  sortOrder: number;
  sourceVersionId: string | null;
  visibility: PortfolioVisibility;
};
export type CanonicalPortfolioTechnicalExcerpt = CanonicalRecord & {
  approvedAt: string;
  garmentVersionId: string;
  profileId: string;
  projectId: string;
  publicDownloadAssetId: string | null;
  summary: string;
  title: string;
  visible: boolean;
};
export type PublicationType = 'profile' | 'project' | 'editorial';
export type CanonicalPublication = CanonicalRecord & {
  checksum: string;
  createdBy: string;
  isCurrent: boolean;
  isPublic: boolean;
  mediaManifest: CanonicalPublicationAssetManifest[];
  profileId: string;
  publicPath: string;
  publicationType: PublicationType;
  publishedAt: string;
  snapshot: Record<string, unknown>;
  sourceId: string;
  sourceRevision: number;
  sourceVersionId: string | null;
  unpublishedAt: string | null;
};
export type CanonicalPublicationAssetManifest = {
  altText: string;
  checksum: string;
  copiedFromChecksum: string;
  mimeType: string;
  publicationAssetId: string;
  publicStoragePath: string;
  role: string;
  sourceAssetId: string;
  sourceDerivativeId: string;
};
export type TechPackSectionManifestItem = { checksum: string; id: string; recordCount: number; title: string };
export type CanonicalTechPackExport = CanonicalRecord & { specId: string; garmentVersionId: string; exportAssetId: string; format: 'pdf' | 'zip'; checksum: string; templateId: string; templateVersion: number; sourceRevisionLabel: string; deterministicFilename: string; rulesetVersion: string; storagePath: string; generatedAt: string; sectionManifest: TechPackSectionManifestItem[]; approvedBy: string | null; approvedAt: string | null };
export type CanonicalPomPoint = CanonicalRecord & { specId: string; code: string; name: string; method: string; diagramAnchor: { x: number; y: number }; sortOrder: number };
export type CanonicalMeasurementSet = CanonicalRecord & { specId: string; name: string; sampleType: string | null; baseSize: string; status: 'draft' | 'in_review' | 'approved' | 'superseded' };
export type CanonicalMeasurementValue = CanonicalRecord & { setId: string; pomPointId: string; size: string; target: number; tolerancePlus: number; toleranceMinus: number };
export type CanonicalGradeRule = CanonicalRecord & { specId: string; name: string; sizeRange: string[]; status: 'draft' | 'approved' | 'superseded' };
export type CanonicalGradeRuleValue = CanonicalRecord & { gradeRuleId: string; pomPointId: string; fromSize: string; toSize: string; delta: number };
export type CanonicalSampleRound = CanonicalRecord & { factoryId: string | null; garmentId: string; garmentVersionId: string | null; notes: string; receivedAt: string | null; requestedAt: string | null; roundNo: number; sampleType: string; status: 'planned' | 'requested' | 'in_progress' | 'received' | 'reviewed' | 'approved' | 'rejected' };
export type CanonicalFitSession = CanonicalRecord & { decision: 'revise' | 'approve' | 'reject' | 'hold' | null; decisionNote: string; fitDate: string; garmentVersionId: string; modelProfile: Record<string, unknown>; sampleRoundId: string; status: 'draft' | 'in_review' | 'decided'; summary: string };
export type CanonicalFitMeasurement = CanonicalRecord & { actual: number; fitSessionId: string | null; garmentVersionId: string | null; pomPointId: string; sampleRoundId: string; size: string; variance: number };
export type CanonicalFitIssue = CanonicalRecord & { area: string; fitSessionId: string; garmentVersionId: string; observation: string; ownerTaskId: string | null; pomPointId: string | null; resolution: string | null; severity: 'low' | 'medium' | 'high' | 'critical'; status: 'open' | 'planned' | 'resolved' | 'accepted' };
export type EvidenceCaptureStatus = 'queued' | 'uploaded' | 'failed';
export type CanonicalSampleRoundMedia = CanonicalRecord & { assetId: string; captureStatus: EvidenceCaptureStatus; capturedAt: string; retryCount: number; role: 'sample' | 'detail' | 'fit' | 'reference'; sampleRoundId: string; sortOrder: number };
export type CanonicalFitSessionMedia = CanonicalRecord & { assetId: string; captureStatus: EvidenceCaptureStatus; capturedAt: string; fitSessionId: string; retryCount: number; role: 'fit' | 'detail' | 'reference' | 'mark_up'; sortOrder: number };
export type CanonicalFitIssuePromotion = CanonicalRecord & { candidate: Record<string, unknown>; constructionDetailId: string | null; createdBy: string | null; fitIssueId: string; garmentId: string; garmentVersionId: string; note: string; pomPointId: string | null; promotionType: 'task' | 'pom_adjustment_candidate' | 'construction_callout' | 'version_note'; resolvedAt: string | null; status: 'candidate' | 'applied' | 'dismissed'; taskId: string | null };
export type CostCategory = 'material' | 'trim' | 'labor' | 'overhead' | 'freight';
export type CanonicalCostSheet = CanonicalRecord & { approvedAt: string | null; approvedBy: string | null; calculatedTotal: number; cogsPerUnit: number; currency: string; garmentId: string; garmentVersionId: string; marginPercent: number; name: string; quantityBasis: number; status: 'draft' | 'approved' | 'superseded'; wholesaleUnitPrice: number };
export type CanonicalCostItem = CanonicalRecord & { basis: 'per_unit' | 'per_order'; bomItemId: string | null; category: CostCategory; componentVariantId: string | null; costSheetId: string; currency: string; description: string; materialVariantId: string | null; quantity: number; sortOrder: number; total: number; unitCost: number; wastePercent: number };
export type ProductionOrderStatus = 'draft' | 'approved' | 'placed' | 'in_production' | 'shipped' | 'received' | 'closed' | 'cancelled';
export type CanonicalProductionOrder = CanonicalRecord & { approvedAt: string | null; approvedBy: string | null; costSheetId: string; factoryId: string; garmentId: string; garmentVersionId: string; orderCode: string; placedAt: string | null; quantity: number; status: ProductionOrderStatus; targetDeliveryDate: string | null; targetShipDate: string | null; targetStartDate: string | null };
export type CanonicalProductionMilestone = CanonicalRecord & { completedAt: string | null; name: string; ownerId: string | null; productionOrderId: string; sortOrder: number; status: 'pending' | 'in_progress' | 'blocked' | 'complete' | 'cancelled'; targetDate: string | null };
export type QcSeverity = 'low' | 'medium' | 'high' | 'critical';
export type CanonicalQcTemplate = CanonicalRecord & { name: string; status: 'draft' | 'active' | 'archived'; version: number };
export type CanonicalQcTemplateCheck = CanonicalRecord & { checkCode: string; description: string; method: string; name: string; required: boolean; severity: QcSeverity; sortOrder: number; templateId: string };
export type CanonicalQcInspection = CanonicalRecord & { decidedAt: string | null; decidedBy: string | null; garmentVersionId: string; inspectedAt: string | null; inspectedBy: string | null; productionOrderId: string; releaseDecision: 'pending' | 'approve' | 'hold' | 'reject'; status: 'draft' | 'in_review' | 'decided'; templateId: string; templateVersion: number };
export type CanonicalQcResult = CanonicalRecord & { checkCode: string; evidenceAssetId: string | null; inspectionId: string; issueTaskId: string | null; notes: string; productionOrderId: string; result: 'pending' | 'pass' | 'fail' | 'conditional' | 'waived' | 'not_applicable'; severity: QcSeverity; templateCheckId: string };
export type CanonicalQcWaiver = CanonicalRecord & { actorId: string; affectedCheckCode: string; followUpTaskId: string; inspectionId: string; qcResultId: string; reason: string; waivedAt: string };
export type ProductionTimelineEvent = { date: string; entityId: string; kind: 'sample' | 'fit' | 'cost' | 'order' | 'milestone' | 'qc'; label: string; status: string };
export type CanonicalRestoreOperation = CanonicalRecord & { actorId: string | null; baseRevision: number; dependencies: CanonicalVersionDependency[]; garmentId: string; inversePatch: CanonicalJsonPatch[]; previewChecksum: string; reason: string; replayPatch: CanonicalJsonPatch[]; resultRevision: number; resultVersionId: string; scope: FreezeFrameScope; selectedKeys: string[]; selectedMeasurementKeys: string[]; selectedPomPointIds: string[]; sourceVersionId: string };
export type CanonicalBomItem = CanonicalRecord & { specId: string; itemType: 'material_variant' | 'component_variant' | 'custom'; materialVariantId: string | null; componentVariantId: string | null; intentionalFreeText: boolean; description: string; quantity: number; unit: CanonicalInventoryEntry['unit']; placement: string; supplierItemId: string | null; substituteItemId: string | null; status: 'draft' | 'linked' | 'approved' | 'shortage' | 'substituted'; shortageQuantity: number; unitCost: number; currency: string; costImpact: number; sortOrder: number };
export type CanonicalConstructionSection = CanonicalRecord & { specId: string; name: string; sortOrder: number; status: 'draft' | 'approved' | 'superseded' };
export type CanonicalConstructionStep = CanonicalRecord & { sectionId: string; stepNumber: number; operation: string; machine: string; machineRequired: boolean; stitchSpec: string; stitchRequired: boolean; seamAllowance: number | null; status: 'draft' | 'ready' | 'approved'; sortOrder: number };
export type CanonicalConstructionDetail = CanonicalRecord & { stepId: string; assetId: string | null; anchor: { x: number; y: number } | null; callout: string; severity: 'info' | 'warning' | 'critical'; status: 'open' | 'resolved' | 'dismissed'; sortOrder: number };
export type CanonicalTemplateApplication = CanonicalRecord & { templateId: string; garmentId: string; appliedBy: string | null; appliedAt: string; mapping: { copiedIds: string[]; sourceVersion: number } };
export type CanonicalReleaseTask = CanonicalRecord & { garmentId: string; title: string; description: string; status: 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled'; priority: 'low' | 'medium' | 'high' | 'urgent'; dueAt: string | null; assigneeId: string | null; sortOrder: number };
export type CanonicalCalendarEvent = CanonicalRecord & { assigneeId: string | null; endsAt: string | null; eventType: string; garmentId: string | null; startsAt: string; title: string };
export type CanonicalValidationWaiver = CanonicalRecord & { specId: string; validationRunId: string; ruleCode: string; domain: Exclude<ValidationDomain, 'privacy'>; reason: string; actorId: string; followUpTaskId: string; waivedAt: string };

export type CanonicalWorkspaceState = {
  aiAcceptanceCommands: CanonicalAiAcceptanceCommand[];
  aiAcceptances: CanonicalAiAcceptance[];
  aiArtifacts: CanonicalAiArtifact[];
  aiInputRefs: CanonicalAiInputRef[];
  aiJobs: CanonicalAiJob[];
  annotations: CanonicalAnnotation[];
  bomItems: CanonicalBomItem[];
  calendarEvents: CanonicalCalendarEvent[];
  changeEvents: CanonicalChangeEvent[];
  collections: CanonicalCollection[];
  componentVariants: CanonicalComponentVariant[];
  components: CanonicalComponent[];
  constructionDetails: CanonicalConstructionDetail[];
  constructionSections: CanonicalConstructionSection[];
  constructionSteps: CanonicalConstructionStep[];
  costItems: CanonicalCostItem[];
  costSheets: CanonicalCostSheet[];
  designBriefs: CanonicalDesignBrief[];
  entityRevisions: CanonicalEntityRevision[];
  editorialAssets: CanonicalEditorialAsset[];
  editorialBlocks: CanonicalEditorialBlock[];
  editorialCollectionGarments: CanonicalEditorialCollectionGarment[];
  editorialCollections: CanonicalEditorialCollection[];
  editorialExports: CanonicalEditorialExport[];
  editorialScenes: CanonicalEditorialScene[];
  factories: CanonicalFactory[];
  fitIssuePromotions: CanonicalFitIssuePromotion[];
  fitIssues: CanonicalFitIssue[];
  garmentComponents: CanonicalGarmentComponent[];
  garmentMaterials: CanonicalGarmentMaterial[];
  garmentMedia: CanonicalGarmentMedia[];
  garments: CanonicalGarment[];
  conflicts: CanonicalConflict[];
  inventoryEntries: CanonicalInventoryEntry[];
  materialVariants: CanonicalMaterialVariant[];
  materialVariantMedia: CanonicalMaterialVariantMedia[];
  materialVariantProfiles: CanonicalMaterialVariantProfile[];
  materials: CanonicalMaterial[];
  mediaAssets: CanonicalMediaAsset[];
  mediaDerivatives: CanonicalMediaDerivative[];
  moodboardItems: CanonicalMoodboardItem[];
  moodboards: CanonicalMoodboard[];
  flatAnnotations: CanonicalFlatAnnotation[];
  fitSessionMedia: CanonicalFitSessionMedia[];
  fitSessions: CanonicalFitSession[];
  garmentVersions: CanonicalGarmentVersion[];
  gradeRuleValues: CanonicalGradeRuleValue[];
  gradeRules: CanonicalGradeRule[];
  measurementSets: CanonicalMeasurementSet[];
  measurementValues: CanonicalMeasurementValue[];
  pomPoints: CanonicalPomPoint[];
  portfolioEditorials: CanonicalPortfolioEditorial[];
  portfolioProfiles: CanonicalPortfolioProfile[];
  portfolioProjects: CanonicalPortfolioProject[];
  portfolioTechnicalExcerpts: CanonicalPortfolioTechnicalExcerpt[];
  publications: CanonicalPublication[];
  productionMilestones: CanonicalProductionMilestone[];
  productionOrders: CanonicalProductionOrder[];
  qcInspections: CanonicalQcInspection[];
  qcResults: CanonicalQcResult[];
  qcTemplateChecks: CanonicalQcTemplateCheck[];
  qcTemplates: CanonicalQcTemplate[];
  qcWaivers: CanonicalQcWaiver[];
  restoreOperations: CanonicalRestoreOperation[];
  releaseTasks: CanonicalReleaseTask[];
  sampleRoundMedia: CanonicalSampleRoundMedia[];
  sampleRounds: CanonicalSampleRound[];
  fitMeasurements: CanonicalFitMeasurement[];
  schemaVersion: 10;
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
  versionDependencies: CanonicalVersionDependency[];
  versionEditorial: CanonicalEditorialVersionProjection[];
  versionPortfolio: CanonicalPortfolioVersionProjection[];
};

export type WorkspaceChangeContext = {
  actorId: string;
  operationId?: string;
  origin?: CanonicalChangeOrigin;
  skipAutoLedger?: boolean;
};

export type WorkspaceSyncState = 'loading' | 'ready' | 'offline' | 'conflict' | 'error';

export type RelationshipOption = {
  detail: string;
  id: string;
  inUseBy: string[];
  label: string;
  status?: string;
};
