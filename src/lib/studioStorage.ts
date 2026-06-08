import {
  demoFabrics,
  demoLinkedMaterials,
  demoLookbookPages,
  demoNotes,
  demoProjects,
  demoTasks,
} from '../data/seedData';
import type {
  ApparelProject,
  Fabric,
  LinkedMaterial,
  LookbookPage,
  StudioNote,
  StudioTask,
  TaskStatus,
} from '../types/studio';

export const LOCAL_DATA_VERSION = 2;
const STORAGE_KEY = 'mystic-lore-studio:data';

export type StoredProject = Omit<
  ApparelProject,
  'linkedMaterials' | 'lookbookPages' | 'notes' | 'tasks'
>;

export type StudioData = {
  fabrics: Fabric[];
  linkedMaterials: LinkedMaterial[];
  lookbookPages: LookbookPage[];
  notes: StudioNote[];
  projects: StoredProject[];
  tasks: StudioTask[];
  version: number;
};

export type StudioDataView = Omit<StudioData, 'projects'> & {
  projects: ApparelProject[];
  rawProjects: StoredProject[];
};

export function createSeedStudioData(): StudioData {
  return {
    fabrics: demoFabrics,
    linkedMaterials: demoLinkedMaterials,
    lookbookPages: demoLookbookPages,
    notes: demoNotes,
    projects: demoProjects.map(stripProjectRelations),
    tasks: demoTasks,
    version: LOCAL_DATA_VERSION,
  };
}

export function hydrateStudioData(data: StudioData): StudioDataView {
  return {
    ...data,
    projects: data.projects.map((project) => ({
      ...project,
      linkedMaterials: data.linkedMaterials.filter(
        (material) => material.projectId === project.id,
      ),
      lookbookPages: data.lookbookPages.filter((page) => page.projectId === project.id),
      notes: data.notes.filter((note) => note.projectId === project.id),
      tasks: data.tasks.filter((task) => task.projectId === project.id),
    })),
    rawProjects: data.projects,
  };
}

export function getStudioData(): StudioData {
  if (!canUseLocalStorage()) {
    return createSeedStudioData();
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    const seedData = createSeedStudioData();
    saveStudioData(seedData);
    return seedData;
  }

  try {
    const parsed = JSON.parse(stored) as StudioData;

    if (!isStudioData(parsed)) {
      const seedData = createSeedStudioData();
      saveStudioData(seedData);
      return seedData;
    }

    const migratedData = migrateStudioData(parsed);

    if (migratedData.version !== parsed.version) {
      saveStudioData(migratedData);
    }

    return migratedData;
  } catch {
    const seedData = createSeedStudioData();
    saveStudioData(seedData);
    return seedData;
  }
}

export function saveStudioData(data: StudioData) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function resetStudioData() {
  const seedData = createSeedStudioData();
  saveStudioData(seedData);
  return seedData;
}

export function exportStudioData(data: StudioData) {
  return JSON.stringify(data, null, 2);
}

export function importStudioData(serializedData: string) {
  const parsed = JSON.parse(serializedData) as StudioData;

  if (!isStudioData(parsed)) {
    throw new Error('Imported data is not a valid Mystic Lore Studio backup.');
  }

  return {
    ...parsed,
    version: LOCAL_DATA_VERSION,
  };
}

export function updateProjectPhaseInData(
  data: StudioData,
  projectId: string,
  phase: StoredProject['phase'],
): StudioData {
  return {
    ...data,
    projects: data.projects.map((project) =>
      project.id === projectId ? { ...project, phase } : project,
    ),
  };
}

export function createProjectInData(
  data: StudioData,
  project: StoredProject,
): StudioData {
  return {
    ...data,
    projects: [project, ...data.projects],
  };
}

export function updateProjectInData(
  data: StudioData,
  project: StoredProject,
): StudioData {
  return {
    ...data,
    projects: data.projects.map((currentProject) =>
      currentProject.id === project.id ? project : currentProject,
    ),
  };
}

export function deleteProjectInData(
  data: StudioData,
  projectId: string,
): StudioData {
  return {
    ...data,
    linkedMaterials: data.linkedMaterials.filter(
      (material) => material.projectId !== projectId,
    ),
    lookbookPages: data.lookbookPages.filter((page) => page.projectId !== projectId),
    notes: data.notes.filter((note) => note.projectId !== projectId),
    projects: data.projects.filter((project) => project.id !== projectId),
    tasks: data.tasks.filter((task) => task.projectId !== projectId),
  };
}

export function createFabricInData(data: StudioData, fabric: Fabric): StudioData {
  return {
    ...data,
    fabrics: [fabric, ...data.fabrics],
  };
}

export function updateFabricInData(data: StudioData, fabric: Fabric): StudioData {
  return {
    ...data,
    fabrics: data.fabrics.map((currentFabric) =>
      currentFabric.id === fabric.id ? fabric : currentFabric,
    ),
  };
}

export function deleteFabricInData(
  data: StudioData,
  fabricId: string,
): StudioData {
  return {
    ...data,
    fabrics: data.fabrics.filter((fabric) => fabric.id !== fabricId),
  };
}

export function updateTaskStatusInData(
  data: StudioData,
  taskId: string,
  status: TaskStatus,
): StudioData {
  return {
    ...data,
    tasks: data.tasks.map((task) =>
      task.id === taskId ? { ...task, status } : task,
    ),
  };
}

function stripProjectRelations(project: ApparelProject): StoredProject {
  const { linkedMaterials, lookbookPages, notes, tasks, ...storedProject } = project;

  void linkedMaterials;
  void lookbookPages;
  void notes;
  void tasks;

  return storedProject;
}

function canUseLocalStorage() {
  return typeof window !== 'undefined' && 'localStorage' in window;
}

function migrateStudioData(data: StudioData): StudioData {
  if (data.version === LOCAL_DATA_VERSION) {
    return data;
  }

  const seedProjectById = new Map(
    createSeedStudioData().projects.map((project) => [project.id, project]),
  );

  return {
    ...data,
    projects: data.projects.map((project) =>
      normalizeStoredProject(project, seedProjectById.get(project.id)),
    ),
    version: LOCAL_DATA_VERSION,
  };
}

function normalizeStoredProject(
  project: StoredProject,
  seedProject?: StoredProject,
): StoredProject {
  const partialProject = project as Partial<StoredProject>;

  return {
    ...project,
    colorStory: partialProject.colorStory ?? seedProject?.colorStory ?? '',
    difficulty: partialProject.difficulty ?? seedProject?.difficulty ?? 'Moderate',
    generalNotes:
      partialProject.generalNotes ?? seedProject?.generalNotes ?? '',
    keyFeatures:
      partialProject.keyFeatures ?? seedProject?.keyFeatures ?? project.tags,
    silhouette: partialProject.silhouette ?? seedProject?.silhouette ?? '',
    targetWearer:
      partialProject.targetWearer ?? seedProject?.targetWearer ?? '',
  };
}

function isStudioData(value: StudioData): value is StudioData {
  return Boolean(
    value &&
      Array.isArray(value.projects) &&
      Array.isArray(value.fabrics) &&
      Array.isArray(value.tasks) &&
      Array.isArray(value.notes) &&
      Array.isArray(value.linkedMaterials) &&
      Array.isArray(value.lookbookPages) &&
      typeof value.version === 'number',
  );
}
