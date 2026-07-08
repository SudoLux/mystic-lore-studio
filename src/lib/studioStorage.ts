import {
  demoFabrics,
  demoLinkedMaterials,
  demoLookbookPages,
  demoNotes,
  demoProjects,
  demoTasks,
} from '../data/seedData';
import {
  calculateFabricYardage,
  getDerivedFabricArchiveStatus,
  getDerivedFabricStatus,
  getDerivedFabricStorageStatus,
} from './yardage';
import { normalizeFabricDrape, normalizeWovenKnit } from './fabricMetadata';
import { normalizePortfolioProjectSettings } from './portfolio';
import type {
  ApparelProject,
  Fabric,
  FabricDetailsInput,
  LinkedMaterial,
  LookbookPage,
  ProjectDetailsInput,
  ProjectHeroImageIntent,
  StudioNote,
  StudioTask,
  TaskStatus,
  YardageEntry,
} from '../types/studio';
import type { EditorialCollection } from '../types/editorial';

export const LOCAL_DATA_VERSION = 5;
const STORAGE_KEY = 'mystic-lore-studio:data';
const USER_STORAGE_PREFIX = `${STORAGE_KEY}:user`;

export type AppSettings = {
  backupReminderCadenceDays: number;
  backupReminderCopy: string;
  updatedAt: string;
};

export type StoredProject = Omit<
  ApparelProject,
  'linkedMaterials' | 'lookbookPages' | 'notes' | 'tasks'
>;

export type StudioData = {
  editorialCollections: EditorialCollection[];
  fabrics: Fabric[];
  linkedMaterials: LinkedMaterial[];
  lookbookPages: LookbookPage[];
  notes: StudioNote[];
  projects: StoredProject[];
  settings: AppSettings;
  tasks: StudioTask[];
  version: number;
  yardageEntries: YardageEntry[];
};

export type LocalCacheWriteResult =
  | { status: 'saved' }
  | { error: string; status: 'quota-exceeded' | 'unavailable' };

export type ImportPreview = {
  editorialCollections: number;
  fabrics: number;
  linkedMaterials: number;
  lookbooks: number;
  notes: number;
  projects: number;
  tasks: number;
  version: number;
};

export type StudioDataView = Omit<StudioData, 'projects'> & {
  projects: ApparelProject[];
  rawProjects: StoredProject[];
};

export function createSeedStudioData(): StudioData {
  return {
    editorialCollections: [],
    fabrics: demoFabrics,
    linkedMaterials: demoLinkedMaterials,
    lookbookPages: demoLookbookPages,
    notes: demoNotes,
    projects: demoProjects.map(stripProjectRelations).map((project) =>
      normalizeStoredProject(project),
    ),
    settings: createDefaultAppSettings(),
    tasks: demoTasks,
    version: LOCAL_DATA_VERSION,
    yardageEntries: [],
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

export function getStudioData(userId?: string): StudioData {
  if (!canUseLocalStorage()) {
    return createSeedStudioData();
  }

  const stored = window.localStorage.getItem(getStorageKey(userId));
  const legacyStored = userId
    ? window.localStorage.getItem(STORAGE_KEY)
    : null;
  const storedValue = stored ?? legacyStored;

  if (!storedValue) {
    const seedData = createSeedStudioData();
    saveStudioData(seedData, userId);
    return seedData;
  }

  try {
    const parsed = JSON.parse(storedValue);

    if (!isStudioDataLike(parsed)) {
      const seedData = createSeedStudioData();
      saveStudioData(seedData, userId);
      return seedData;
    }

    const migratedData = migrateStudioData(parsed);

    if (migratedData.version !== parsed.version) {
      saveStudioData(migratedData, userId);
    }

    return migratedData;
  } catch {
    const seedData = createSeedStudioData();
    saveStudioData(seedData, userId);
    return seedData;
  }
}

export function saveStudioData(
  data: StudioData,
  userId?: string,
): LocalCacheWriteResult {
  if (!canUseLocalStorage()) {
    return {
      error: 'Offline cache is unavailable in this browser.',
      status: 'unavailable',
    };
  }

  try {
    window.localStorage.setItem(
      getStorageKey(userId),
      JSON.stringify(stripEphemeralImageUrls(data)),
    );
    return { status: 'saved' };
  } catch (error) {
    if (isQuotaExceededError(error)) {
      return {
        error:
          'Cloud data is safe, but this device could not update its offline cache because browser storage is full.',
        status: 'quota-exceeded',
      };
    }

    return {
      error: 'Cloud data is safe, but this device could not update its offline cache.',
      status: 'unavailable',
    };
  }
}

export function resetStudioData(userId?: string) {
  const seedData = createSeedStudioData();
  saveStudioData(seedData, userId);
  return seedData;
}

export function exportStudioData(data: StudioData) {
  return JSON.stringify(
    {
      ...normalizeStudioData(data),
      exportedAt: new Date().toISOString(),
    },
    null,
    2,
  );
}

export function importStudioData(serializedData: string) {
  return parseStudioDataBackup(serializedData);
}

export function previewStudioDataImport(serializedData: string): ImportPreview {
  const data = parseStudioDataBackup(serializedData);

  return {
    editorialCollections: data.editorialCollections.length,
    fabrics: data.fabrics.length,
    linkedMaterials: data.linkedMaterials.length,
    lookbooks: data.lookbookPages.length,
    notes: data.notes.length,
    projects: data.projects.length,
    tasks: data.tasks.length,
    version: data.version,
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

export function updateProjectDetailsInData(
  data: StudioData,
  projectId: string,
  details: ProjectDetailsInput,
  heroImageIntent: ProjectHeroImageIntent = { type: 'unchanged' },
): StudioData {
  return {
    ...data,
    projects: data.projects.map((project) => {
      if (project.id !== projectId) return project;

      const heroImage = heroImageIntent.type === 'set'
        ? heroImageIntent.image
        : heroImageIntent.type === 'remove'
          ? undefined
          : project.heroImage;

      return {
        ...project,
        ...details,
        galleryImages: project.galleryImages,
        heroImage,
        id: project.id,
      };
    }),
  };
}

export function deleteProjectInData(
  data: StudioData,
  projectId: string,
): StudioData {
  return {
    ...data,
    editorialCollections: data.editorialCollections.filter(
      (collection) => collection.projectId !== projectId,
    ),
    linkedMaterials: data.linkedMaterials.filter(
      (material) => material.projectId !== projectId,
    ),
    lookbookPages: data.lookbookPages.filter((page) => page.projectId !== projectId),
    notes: data.notes.filter((note) => note.projectId !== projectId),
    projects: data.projects.filter((project) => project.id !== projectId),
    tasks: data.tasks.filter((task) => task.projectId !== projectId),
    yardageEntries: data.yardageEntries.map((entry) =>
      entry.projectId === projectId
        ? { ...entry, projectId: undefined }
        : entry,
    ),
  };
}

export function createEditorialCollectionInData(
  data: StudioData,
  collection: EditorialCollection,
): StudioData {
  return {
    ...data,
    editorialCollections: [collection, ...data.editorialCollections],
  };
}

export function updateEditorialCollectionInData(
  data: StudioData,
  collection: EditorialCollection,
): StudioData {
  return {
    ...data,
    editorialCollections: data.editorialCollections.map((currentCollection) =>
      currentCollection.id === collection.id ? collection : currentCollection,
    ),
  };
}

export function deleteEditorialCollectionInData(
  data: StudioData,
  collectionId: string,
): StudioData {
  return {
    ...data,
    editorialCollections: data.editorialCollections.filter(
      (collection) => collection.id !== collectionId,
    ),
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

export function updateFabricDetailsInData(
  data: StudioData,
  fabricId: string,
  details: FabricDetailsInput,
): StudioData {
  return {
    ...data,
    fabrics: data.fabrics.map((fabric) =>
      fabric.id === fabricId
        ? { ...fabric, ...details, id: fabric.id, image: fabric.image }
        : fabric,
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
    linkedMaterials: data.linkedMaterials.map((material) =>
      material.fabricId === fabricId
        ? { ...material, fabricId: undefined }
        : material,
    ),
    yardageEntries: data.yardageEntries.filter(
      (entry) => entry.fabricId !== fabricId,
    ),
  };
}

export function createTaskInData(data: StudioData, task: StudioTask): StudioData {
  return {
    ...data,
    tasks: [task, ...data.tasks],
  };
}

export function updateTaskInData(data: StudioData, task: StudioTask): StudioData {
  return {
    ...data,
    tasks: data.tasks.map((currentTask) =>
      currentTask.id === task.id ? task : currentTask,
    ),
  };
}

export function deleteTaskInData(data: StudioData, taskId: string): StudioData {
  return {
    ...data,
    tasks: data.tasks.filter((task) => task.id !== taskId),
  };
}

export function createNoteInData(data: StudioData, note: StudioNote): StudioData {
  return {
    ...data,
    notes: [note, ...data.notes],
  };
}

export function updateNoteInData(data: StudioData, note: StudioNote): StudioData {
  return {
    ...data,
    notes: data.notes.map((currentNote) =>
      currentNote.id === note.id ? note : currentNote,
    ),
  };
}

export function deleteNoteInData(data: StudioData, noteId: string): StudioData {
  return {
    ...data,
    notes: data.notes.filter((note) => note.id !== noteId),
  };
}

export function upsertLookbookPageInData(
  data: StudioData,
  lookbookPage: LookbookPage,
): StudioData {
  const pageExists = data.lookbookPages.some(
    (page) => page.id === lookbookPage.id,
  );

  return {
    ...data,
    lookbookPages: pageExists
      ? data.lookbookPages.map((page) =>
          page.id === lookbookPage.id ? lookbookPage : page,
        )
      : [lookbookPage, ...data.lookbookPages],
  };
}

export function createLinkedMaterialInData(
  data: StudioData,
  linkedMaterial: LinkedMaterial,
): StudioData {
  return syncFabricYardageState({
    ...data,
    linkedMaterials: [linkedMaterial, ...data.linkedMaterials],
  });
}

export function updateLinkedMaterialInData(
  data: StudioData,
  linkedMaterial: LinkedMaterial,
): StudioData {
  return syncFabricYardageState({
    ...data,
    linkedMaterials: data.linkedMaterials.map((currentMaterial) =>
      currentMaterial.id === linkedMaterial.id ? linkedMaterial : currentMaterial,
    ),
  });
}

export function deleteLinkedMaterialInData(
  data: StudioData,
  linkedMaterialId: string,
): StudioData {
  return syncFabricYardageState({
    ...data,
    linkedMaterials: data.linkedMaterials.filter(
      (material) => material.id !== linkedMaterialId,
    ),
    tasks: data.tasks.map((task) =>
      task.linkedMaterialId === linkedMaterialId
        ? { ...task, linkedMaterialId: undefined }
        : task,
    ),
    yardageEntries: data.yardageEntries.map((entry) =>
      entry.materialId === linkedMaterialId
        ? { ...entry, materialId: undefined }
        : entry,
    ),
  });
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
  const normalizedData = normalizeStudioData(data);

  if (normalizedData.version === LOCAL_DATA_VERSION) {
    return normalizedData;
  }

  const seedProjectById = new Map(
    createSeedStudioData().projects.map((project) => [project.id, project]),
  );

  return {
    ...normalizedData,
    projects: normalizedData.projects.map((project) =>
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
    portfolio: normalizePortfolioProjectSettings(
      partialProject.portfolio,
      project.name,
      project.updatedAt,
    ),
    silhouette: partialProject.silhouette ?? seedProject?.silhouette ?? '',
    targetWearer:
      partialProject.targetWearer ?? seedProject?.targetWearer ?? '',
  };
}

function syncFabricYardageState(data: StudioData): StudioData {
  return {
    ...data,
    fabrics: data.fabrics.map((fabric) => {
      const summary = calculateFabricYardage(
        fabric,
        data.linkedMaterials,
        data.projects,
      );
      const archiveStatus = getDerivedFabricArchiveStatus(
        fabric.archiveStatus,
        summary,
      );
      const storageStatus = getDerivedFabricStorageStatus(
        fabric.storageStatus,
        summary,
      );
      const hasInventoryChange =
        archiveStatus !== fabric.archiveStatus ||
        storageStatus !== fabric.storageStatus ||
        summary.reservedYards !== fabric.reservedYards ||
        summary.usedYards !== fabric.usedYards;

      return {
        ...fabric,
        archiveStatus,
        reservedYards: summary.reservedYards,
        status: getDerivedFabricStatus(summary, storageStatus),
        storageStatus,
        usedYards: summary.usedYards,
        updatedAt: hasInventoryChange ? todayString() : fabric.updatedAt,
      };
    }),
  };
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function parseStudioDataBackup(serializedData: string): StudioData {
  let parsed: unknown;

  try {
    parsed = JSON.parse(serializedData);
  } catch {
    throw new Error('This file is not valid JSON. Choose a Mystic Lore Studio backup file.');
  }

  if (!isStudioDataLike(parsed)) {
    throw new Error(
      'This JSON file is missing required studio data arrays. Choose a Mystic Lore Studio backup file.',
    );
  }

  return migrateStudioData(parsed);
}

function normalizeStudioData(data: StudioData): StudioData {
  return {
    ...data,
    editorialCollections: Array.isArray(data.editorialCollections)
      ? data.editorialCollections
      : [],
    fabrics: data.fabrics.map(normalizeFabricRecord),
    projects: data.projects.map((project) => normalizeStoredProject(project)),
    settings: normalizeAppSettings(data.settings),
    version: typeof data.version === 'number' ? data.version : LOCAL_DATA_VERSION,
    yardageEntries: Array.isArray(data.yardageEntries)
      ? data.yardageEntries
      : [],
  };
}

function normalizeFabricRecord(fabric: Fabric): Fabric {
  return {
    ...fabric,
    drape: normalizeFabricDrape(fabric.drape),
    weaveOrKnit: normalizeWovenKnit(fabric.weaveOrKnit),
  };
}

function createDefaultAppSettings(): AppSettings {
  return {
    backupReminderCadenceDays: 14,
    backupReminderCopy:
      'Export a fresh backup after major project, fabric, task, or editorial collection updates.',
    updatedAt: todayString(),
  };
}

function normalizeAppSettings(settings?: Partial<AppSettings>): AppSettings {
  const defaultSettings = createDefaultAppSettings();

  return {
    backupReminderCadenceDays:
      typeof settings?.backupReminderCadenceDays === 'number'
        ? settings.backupReminderCadenceDays
        : defaultSettings.backupReminderCadenceDays,
    backupReminderCopy:
      typeof settings?.backupReminderCopy === 'string' &&
      settings.backupReminderCopy.trim().length > 0
        ? settings.backupReminderCopy
        : defaultSettings.backupReminderCopy,
    updatedAt:
      typeof settings?.updatedAt === 'string'
        ? settings.updatedAt
        : defaultSettings.updatedAt,
  };
}

function isStudioDataLike(value: unknown): value is StudioData {
  if (!isRecord(value)) {
    return false;
  }

  return Boolean(
    Array.isArray(value.projects) &&
      Array.isArray(value.fabrics) &&
      Array.isArray(value.tasks) &&
      Array.isArray(value.notes) &&
      Array.isArray(value.linkedMaterials) &&
      Array.isArray(value.lookbookPages) &&
      typeof value.version === 'number',
  );
}

export function getLegacyStudioData() {
  if (!canUseLocalStorage()) {
    return null;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored);
    return isStudioDataLike(parsed) ? migrateStudioData(parsed) : null;
  } catch {
    return null;
  }
}

function getStorageKey(userId?: string) {
  return userId ? `${USER_STORAGE_PREFIX}:${userId}` : STORAGE_KEY;
}

function stripEphemeralImageUrls(data: StudioData): StudioData {
  const cleanImage = <T extends {
    blobKey?: string;
    dataUrl?: string;
    previewBlobKey?: string;
    remoteUrl?: string;
    signedUrlExpiresAt?: string;
    storagePath?: string;
    uploadDataUrl?: string;
  }>(
    image: T | undefined,
  ) => {
    if (!image) return image;
    const {
      dataUrl,
      remoteUrl: _remoteUrl,
      signedUrlExpiresAt: _expiresAt,
      uploadDataUrl,
      ...stored
    } = image;
    return {
      ...stored,
      dataUrl:
        image.previewBlobKey || image.storagePath ? undefined : dataUrl,
      uploadDataUrl:
        image.blobKey || image.storagePath ? undefined : uploadDataUrl,
    } as T;
  };

  return {
    ...data,
    fabrics: data.fabrics.map((fabric) => ({
      ...fabric,
      image: cleanImage(fabric.image),
    })),
    lookbookPages: data.lookbookPages.map((page) => ({
      ...page,
      heroImage: cleanImage(page.heroImage),
    })),
    projects: data.projects.map((project) => ({
      ...project,
      galleryImages: project.galleryImages?.map((image) => cleanImage(image)!),
      heroImage: cleanImage(project.heroImage),
    })),
  };
}

function isQuotaExceededError(error: unknown) {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error.code === 22 ||
      error.code === 1014)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
