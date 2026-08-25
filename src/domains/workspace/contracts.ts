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
  templateType: 'pom' | 'measurement' | 'grading' | 'bom' | 'construction' | 'validation';
  version: number;
};

export type CanonicalWorkspaceState = {
  annotations: CanonicalAnnotation[];
  collections: CanonicalCollection[];
  componentVariants: CanonicalComponentVariant[];
  components: CanonicalComponent[];
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
  schemaVersion: 1;
  studioId: string;
  suppliers: CanonicalSupplier[];
  supplierItems: CanonicalSupplierItem[];
  templates: CanonicalTemplate[];
};

export type WorkspaceSyncState = 'loading' | 'ready' | 'offline' | 'conflict' | 'error';

export type RelationshipOption = {
  detail: string;
  id: string;
  inUseBy: string[];
  label: string;
  status?: string;
};
