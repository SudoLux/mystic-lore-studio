import type {
  Fabric,
  FabricArchiveStatus,
  FabricStatus,
  FabricStorageStatus,
  LinkedMaterial,
} from '../types/studio';

type AllocationProject = {
  id: string;
  status?: string;
};

export type FabricYardageSummary = {
  activeAllocations: LinkedMaterial[];
  availableYards: number;
  linkedAllocations: LinkedMaterial[];
  remainingYards: number;
  reservedYards: number;
  totalYards: number;
  usedYards: number;
};

export const LOW_YARDAGE_THRESHOLD = 5;

export function calculateFabricYardage(
  fabric: Fabric,
  linkedMaterials: LinkedMaterial[],
  projects: AllocationProject[] = [],
): FabricYardageSummary {
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const linkedAllocations = linkedMaterials.filter(
    (allocation) => allocation.fabricId === fabric.id,
  );
  const activeAllocations = linkedAllocations.filter((allocation) => {
    const project = projectById.get(allocation.projectId);

    return !project || project.status !== 'Archived';
  });
  const reservedYards = sumYards(activeAllocations, 'reservedYards');
  const usedYards = sumYards(linkedAllocations, 'usedYards');
  const remainingYards = fabric.totalYards - usedYards;
  const availableYards = fabric.totalYards - reservedYards - usedYards;

  return {
    activeAllocations,
    availableYards,
    linkedAllocations,
    remainingYards,
    reservedYards,
    totalYards: fabric.totalYards,
    usedYards,
  };
}

export function hasInsufficientYardage(
  allocation: LinkedMaterial,
  summary?: FabricYardageSummary,
) {
  return Boolean(summary && allocation.neededYards > 0 && allocation.neededYards > summary.availableYards);
}

export function isLowYardage(summary: FabricYardageSummary) {
  return summary.availableYards > 0 && summary.availableYards < LOW_YARDAGE_THRESHOLD;
}

export function getDerivedFabricArchiveStatus(
  currentStatus: FabricArchiveStatus,
  summary: FabricYardageSummary,
): FabricArchiveStatus {
  if (summary.availableYards <= 0) {
    return 'Depleted';
  }

  if (isLowYardage(summary)) {
    return 'Low Yardage';
  }

  if (currentStatus === 'Archived' || currentStatus === 'Reserved') {
    return currentStatus;
  }

  return 'Active';
}

export function getDerivedFabricStorageStatus(
  currentStatus: FabricStorageStatus,
  summary: FabricYardageSummary,
): FabricStorageStatus {
  if (summary.availableYards <= 0) {
    return 'Depleted';
  }

  if (isLowYardage(summary)) {
    return 'Low Yardage';
  }

  if (
    currentStatus === 'Filed' ||
    currentStatus === 'Low Yardage' ||
    currentStatus === 'Depleted'
  ) {
    return 'Filed';
  }

  return currentStatus;
}

export function getDerivedFabricStatus(
  summary: FabricYardageSummary,
  storageStatus?: FabricStorageStatus,
): FabricStatus {
  if (summary.availableYards <= 0 || storageStatus === 'Depleted') {
    return 'Depleted';
  }

  if (isLowYardage(summary) || storageStatus === 'Low Yardage') {
    return 'Low Stock';
  }

  if (summary.reservedYards > 0 || storageStatus === 'Reserved') {
    return 'Reserved';
  }

  return 'In Stock';
}

function sumYards(
  allocations: LinkedMaterial[],
  key: 'reservedYards' | 'usedYards',
) {
  return allocations.reduce((total, allocation) => total + allocation[key], 0);
}
