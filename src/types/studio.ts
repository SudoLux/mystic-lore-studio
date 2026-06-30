export const projectPhases = [
  'Concept',
  'Research',
  'Materials',
  'Pattern Drafting',
  'Sample Sewing',
  'Fitting',
  'Revision',
  'Final Build',
  'Photoshoot',
  'Lookbook Ready',
  'Archived',
] as const;

export const projectStatuses = [
  'Idea',
  'Active',
  'Paused',
  'Blocked',
  'Ready for Production',
  'Completed',
  'Archived',
] as const;

export const garmentTypes = [
  'Jacket',
  'Shirt',
  'Pants',
  'Vest',
  'Dress',
  'Skirt',
  'Top',
  'Shorts',
  'Coat',
  'Cardigan',
  'Hoodie',
  'Accessory',
  'Collection',
  'Other',
] as const;

export type ProjectPhase = (typeof projectPhases)[number];
export type ProjectStatus = (typeof projectStatuses)[number];
export type GarmentType = (typeof garmentTypes)[number];
export type ProjectDifficulty = 'Light' | 'Moderate' | 'Advanced' | 'Masterwork';

export const taskStatuses = [
  'To Do',
  'In Progress',
  'Blocked',
  'Review',
  'Done',
] as const;

export const taskCategories = [
  'Concept',
  'Research',
  'Sketch',
  'Fabric',
  'Pattern',
  'Cutting',
  'Sewing',
  'Fitting',
  'Revision',
  'Trim',
  'Costing',
  'Photography',
  'Lookbook',
  'Client',
  'Admin',
] as const;

export type TaskStatus = (typeof taskStatuses)[number];
export type TaskCategory = (typeof taskCategories)[number];
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export const noteCategories = [
  'Design Note',
  'Construction Note',
  'Pattern Note',
  'Fit Note',
  'Build Log',
  'Client Note',
  'Idea',
] as const;
export type NoteCategory = (typeof noteCategories)[number];
export type FabricWeight = 'Light' | 'Medium' | 'Medium-heavy' | 'Heavy';
export type FabricStatus = 'In Stock' | 'Reserved' | 'Low Stock' | 'Depleted';
export type FabricArchiveStatus =
  | 'Active'
  | 'Reserved'
  | 'Low Yardage'
  | 'Archived'
  | 'Depleted';
export type FabricDrape = 'Fluid' | 'Soft' | 'Balanced' | 'Crisp' | 'Structured';
export type FabricOpacity = 'Sheer' | 'Semi-sheer' | 'Opaque';
export type FabricRarity = 'Core' | 'Seasonal' | 'Rare' | 'One-off' | 'Archive';
export type FabricStretch = 'None' | 'Mechanical' | 'Two-way' | 'Four-way';
export type FabricStorageStatus = 'Filed' | 'Reserved' | 'In Use' | 'Low Yardage' | 'Depleted';
export const materialRoles = [
  'Shell Fabric',
  'Contrast Fabric',
  'Lining',
  'Trim',
  'Buttons',
  'Zippers',
  'Thread',
  'Interfacing',
  'Hardware',
  'Labels',
  'Other',
] as const;
export const materialStatuses = [
  'Needed',
  'Selected',
  'Ordered',
  'In Stock',
  'Reserved',
  'Cut',
  'Used',
  'Need More',
] as const;
export type MaterialRole = (typeof materialRoles)[number];
export type MaterialStatus = (typeof materialStatuses)[number];
export type LinkedMaterialUse =
  | 'Shell Fabric'
  | 'Contrast Fabric'
  | 'Lining'
  | 'Trim'
  | 'Buttons'
  | 'Zippers'
  | 'Thread'
  | 'Interfacing'
  | 'Hardware'
  | 'Labels'
  | 'Other';
export type LookbookPageType =
  | 'Cover'
  | 'Editorial'
  | 'Detail'
  | 'Material Story'
  | 'Lineup'
  | 'Notes';
export type LookbookTemplate =
  | 'Editorial Hero'
  | 'Technical Showcase'
  | 'Development Story';
export type LookbookFieldItem = {
  label: string;
  value: string;
};
export type LocalImageAsset = {
  blobKey?: string;
  dataUrl?: string;
  height?: number;
  id: string;
  mimeType: string;
  name: string;
  objectFit?: 'cover' | 'contain';
  overlayIntensity?: 'auto' | 'light' | 'strong';
  objectPositionX?: number;
  objectPositionY?: number;
  previewBlobKey?: string;
  size: number;
  remoteUrl?: string;
  signedUrlExpiresAt?: string;
  storagePath?: string;
  uploadDataUrl?: string;
  uploadError?: string;
  uploadState?:
    | 'local'
    | 'pending'
    | 'queued'
    | 'uploading'
    | 'uploaded'
    | 'error';
  updatedAt: string;
  width?: number;
  zoom?: number;
};

export type LinkedMaterial = {
  createdAt?: string;
  id: string;
  fabricId?: string;
  materialName: string;
  projectId: string;
  role: MaterialRole;
  status: MaterialStatus;
  neededYards: number;
  reservedYards: number;
  usedYards: number;
  notes?: string;
  updatedAt?: string;
};

export type StudioTask = {
  createdAt?: string;
  id: string;
  projectId: string;
  title: string;
  description: string;
  notes?: string;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
  phase: ProjectPhase;
  dueDate?: string;
  linkedMaterialId?: string;
  updatedAt?: string;
};

export type StudioNote = {
  id: string;
  projectId: string;
  title: string;
  body: string;
  category: NoteCategory;
  createdAt: string;
  updatedAt?: string;
};

export type LookbookPage = {
  createdAt?: string;
  credits?: LookbookFieldItem[];
  designNotes?: string[];
  displaySpecs?: LookbookFieldItem[];
  garmentStory?: string;
  heroImage?: LocalImageAsset;
  id: string;
  materialNotes?: string[];
  projectId: string;
  stylingNotes?: string[];
  subheadline?: string;
  template?: LookbookTemplate;
  title: string;
  pageType: LookbookPageType;
  headline: string;
  body: string;
  layoutHint: string;
  updatedAt?: string;
};

export type YardageEntry = {
  createdAt: string;
  fabricId: string;
  id: string;
  materialId?: string;
  notes?: string;
  occurredAt: string;
  projectId?: string;
  type: 'Reserved' | 'Used' | 'Released' | 'Adjusted';
  updatedAt: string;
  yards: number;
};

export type Fabric = {
  createdAt?: string;
  id: string;
  name: string;
  supplier: string;
  category: string;
  composition: string;
  colorFamily: string;
  primaryColor: string;
  primaryColorHex?: string;
  secondaryColors: string[];
  weight: FabricWeight;
  weightGsm?: number;
  weightInputUnit?: 'gsm' | 'oz';
  drape: FabricDrape;
  weaveOrKnit: string;
  stretch: FabricStretch;
  opacity: FabricOpacity;
  handFeel: string;
  image?: LocalImageAsset;
  texture: string;
  structure: string;
  widthInches: number;
  totalYards: number;
  reservedYards: number;
  usedYards: number;
  status: FabricStatus;
  archiveStatus: FabricArchiveStatus;
  rarity: FabricRarity;
  purchaseDate: string;
  costPerYard: number;
  storageLocation: string;
  binNumber: string;
  shelf: string;
  storageStatus: FabricStorageStatus;
  bestUses: string[];
  careNotes: string;
  moodTags: string[];
  tags: string[];
  loreNote: string;
  notes: string;
  updatedAt: string;
};

export type FabricDetailsInput = Omit<Fabric, 'id' | 'image'>;

export type ApparelProject = {
  createdAt?: string;
  id: string;
  name: string;
  garmentType: GarmentType;
  phase: ProjectPhase;
  status: ProjectStatus;
  season: string;
  collection: string;
  progress: number;
  priority: TaskPriority;
  difficulty: ProjectDifficulty;
  summary: string;
  designIntent: string;
  targetWearer: string;
  silhouette: string;
  keyFeatures: string[];
  colorStory: string;
  generalNotes: string;
  galleryImages?: LocalImageAsset[];
  heroImage?: LocalImageAsset;
  tags: string[];
  startDate: string;
  targetDate?: string;
  updatedAt?: string;
  linkedMaterials: LinkedMaterial[];
  tasks: StudioTask[];
  notes: StudioNote[];
  lookbookPages: LookbookPage[];
};

export type ProjectDetailsInput = Omit<
  ApparelProject,
  | 'createdAt'
  | 'galleryImages'
  | 'heroImage'
  | 'id'
  | 'linkedMaterials'
  | 'lookbookPages'
  | 'notes'
  | 'tasks'
  | 'updatedAt'
>;

export type ProjectHeroImageIntent =
  | { type: 'unchanged' }
  | { image: LocalImageAsset; type: 'set' }
  | { type: 'remove' };
