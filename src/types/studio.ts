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
export type FabricWeight = 'Light' | 'Medium' | 'Heavy';
export type FabricStatus = 'In Stock' | 'Reserved' | 'Low Stock' | 'Depleted';
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

export type LinkedMaterial = {
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
};

export type StudioTask = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
  phase: ProjectPhase;
  dueDate?: string;
  linkedMaterialId?: string;
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
  id: string;
  projectId: string;
  title: string;
  pageType: LookbookPageType;
  headline: string;
  body: string;
  layoutHint: string;
};

export type Fabric = {
  id: string;
  name: string;
  supplier: string;
  category: string;
  composition: string;
  colorFamily: string;
  weight: FabricWeight;
  widthInches: number;
  totalYards: number;
  reservedYards: number;
  usedYards: number;
  status: FabricStatus;
  tags: string[];
  notes: string;
};

export type ApparelProject = {
  id: string;
  name: string;
  garmentType: GarmentType;
  phase: ProjectPhase;
  status: ProjectStatus;
  season: string;
  collection: string;
  progress: number;
  priority: TaskPriority;
  summary: string;
  designIntent: string;
  tags: string[];
  startDate: string;
  targetDate?: string;
  linkedMaterials: LinkedMaterial[];
  tasks: StudioTask[];
  notes: StudioNote[];
  lookbookPages: LookbookPage[];
};
