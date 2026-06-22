import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  createFabricInData,
  createLinkedMaterialInData,
  createNoteInData,
  createProjectInData,
  createTaskInData,
  deleteFabricInData,
  deleteLinkedMaterialInData,
  deleteNoteInData,
  deleteProjectInData,
  deleteTaskInData,
  exportStudioData,
  getStudioData,
  hydrateStudioData,
  importStudioData,
  previewStudioDataImport,
  resetStudioData,
  saveStudioData,
  updateFabricInData,
  updateLinkedMaterialInData,
  updateNoteInData,
  updateProjectInData,
  updateProjectPhaseInData,
  updateTaskInData,
  updateTaskStatusInData,
  upsertLookbookPageInData,
  type ImportPreview,
  type StoredProject,
  type StudioData,
  type StudioDataView,
} from '../lib/studioStorage';
import {
  fetchCloudStudioData,
  mergeByNewest,
  pushStudioSnapshot,
} from '../lib/supabaseStudio';
import {
  clearSyncOutbox,
  getMigrationDecision,
  getSyncOutbox,
  hasMeaningfulLocalData,
  preserveLegacyBackup,
  saveSyncOutbox,
  setMigrationDecision,
  type SyncDeletion,
  type SyncStatus,
  type StudioSyncOutbox,
} from '../lib/studioSyncStorage';
import type {
  Fabric,
  LinkedMaterial,
  LocalImageAsset,
  LookbookPage,
  ProjectPhase,
  StudioNote,
  StudioTask,
  TaskStatus,
  YardageEntry,
} from '../types/studio';

type StudioDataContextValue = {
  acceptCloudMigration: () => Promise<void>;
  createFabric: (fabric: Fabric) => void;
  createLinkedMaterial: (linkedMaterial: LinkedMaterial) => void;
  createNote: (note: StudioNote) => void;
  createProject: (project: StoredProject) => void;
  createTask: (task: StudioTask) => void;
  data: StudioDataView;
  deleteFabric: (fabricId: string) => void;
  deleteLinkedMaterial: (linkedMaterialId: string) => void;
  deleteNote: (noteId: string) => void;
  deleteProject: (projectId: string) => void;
  deleteTask: (taskId: string) => void;
  dismissCloudMigration: () => void;
  exportData: () => string;
  importData: (serializedData: string) => void;
  migrationAvailable: boolean;
  migrationInProgress: boolean;
  pendingCount: number;
  previewImportData: (serializedData: string) => ImportPreview;
  rawData: StudioData;
  reopenCloudMigration: () => void;
  resetData: () => void;
  retrySync: () => Promise<void>;
  saveData: (nextData: StudioData) => void;
  saveLookbookPage: (lookbookPage: LookbookPage) => void;
  syncError: string | null;
  syncStatus: SyncStatus;
  updateFabric: (fabric: Fabric) => void;
  updateLinkedMaterial: (linkedMaterial: LinkedMaterial) => void;
  updateNote: (note: StudioNote) => void;
  updateProject: (project: StoredProject) => void;
  updateProjectPhase: (projectId: string, phase: ProjectPhase) => void;
  updateTask: (task: StudioTask) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
};

const StudioDataContext = createContext<StudioDataContextValue | null>(null);

export function StudioDataProvider({
  children,
  userId,
}: {
  children: ReactNode;
  userId: string;
}) {
  const [rawData, setRawData] = useState<StudioData>(() => getStudioData(userId));
  const [migrationAvailable, setMigrationAvailable] = useState(false);
  const [migrationInProgress, setMigrationInProgress] = useState(false);
  const [pendingCount, setPendingCount] = useState(() =>
    outboxCount(getSyncOutbox(userId)),
  );
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('syncing');
  const cloudReadyRef = useRef(false);
  const flushingRef = useRef(false);
  const rawDataRef = useRef(rawData);

  const saveLocalData = useCallback(
    (nextData: StudioData) => {
      rawDataRef.current = nextData;
      saveStudioData(nextData, userId);
      setRawData(nextData);
    },
    [userId],
  );

  const flushOutbox = useCallback(async () => {
    if (flushingRef.current) return false;
    const outbox = getSyncOutbox(userId);
    setPendingCount(outboxCount(outbox));
    if (!outbox) return true;
    if (!navigator.onLine) {
      setSyncStatus('offline');
      return false;
    }

    flushingRef.current = true;
    setSyncError(null);
    setSyncStatus('syncing');

    try {
      const cloud = await fetchCloudStudioData(userId);
      const merged = applyDeletionTombstones(
        mergeByNewest(cloud.data, outbox.snapshot),
        effectiveDeletions(cloud.data, outbox.deletions),
      );
      const deletions = effectiveDeletions(cloud.data, outbox.deletions);
      const synced = await pushStudioSnapshot(userId, merged, deletions);
      clearSyncOutbox(userId);
      cloudReadyRef.current = true;
      setMigrationDecision(userId, 'completed');
      setMigrationAvailable(false);
      setPendingCount(0);
      setSyncStatus('synced');
      saveLocalData(synced);
      return true;
    } catch (error) {
      setSyncError(errorMessage(error));
      setSyncStatus(navigator.onLine ? 'error' : 'offline');
      return false;
    } finally {
      flushingRef.current = false;
    }
  }, [saveLocalData, userId]);

  const refreshCloud = useCallback(async () => {
    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }

    setSyncError(null);
    setSyncStatus('syncing');

    try {
      const cloud = await fetchCloudStudioData(userId);
      const outbox = getSyncOutbox(userId);

      if (cloud.hasCloudData) {
        preserveLegacyBackup(userId);
        cloudReadyRef.current = true;
        if (outbox) {
          await flushOutbox();
        } else {
          saveLocalData({
            ...cloud.data,
            settings: rawDataRef.current.settings,
          });
          setSyncStatus('synced');
        }
        return;
      }

      const meaningful = hasMeaningfulLocalData(rawDataRef.current);
      setMigrationAvailable(
        meaningful && getMigrationDecision(userId) === 'pending',
      );
      setSyncStatus('offline');
    } catch (error) {
      setSyncError(errorMessage(error));
      setSyncStatus(navigator.onLine ? 'error' : 'offline');
    }
  }, [flushOutbox, saveLocalData, userId]);

  useEffect(() => {
    void refreshCloud();
    const refresh = () =>
      void (getSyncOutbox(userId) ? flushOutbox() : refreshCloud());
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
    };
  }, [flushOutbox, refreshCloud, userId]);

  const commitData = useCallback(
    (nextData: StudioData, deletions: SyncDeletion[] = []) => {
      const current = rawDataRef.current;
      const stamped = stampChangedRecords(current, nextData);
      const withYardage = appendYardageAuditEntries(current, stamped);
      const allDeletions = [
        ...deletions,
        ...collectImageDeletions(current, withYardage),
      ];
      saveLocalData(withYardage);

      if (cloudReadyRef.current) {
        const outbox = saveSyncOutbox(userId, withYardage, allDeletions);
        setPendingCount(outboxCount(outbox));
        void flushOutbox();
      } else if (
        hasMeaningfulLocalData(withYardage) &&
        getMigrationDecision(userId) === 'pending'
      ) {
        setMigrationAvailable(true);
        setSyncStatus('offline');
      }
    },
    [flushOutbox, saveLocalData, userId],
  );

  const mutate = useCallback(
    (
      mutation: (current: StudioData) => StudioData,
      deletions: SyncDeletion[] = [],
    ) => commitData(mutation(rawDataRef.current), deletions),
    [commitData],
  );

  const acceptCloudMigration = useCallback(async () => {
    setMigrationInProgress(true);
    cloudReadyRef.current = true;
    const outbox = saveSyncOutbox(userId, rawDataRef.current);
    setPendingCount(outboxCount(outbox));
    const succeeded = await flushOutbox();
    if (succeeded) setMigrationDecision(userId, 'completed');
    setMigrationInProgress(false);
  }, [flushOutbox, userId]);

  const dismissCloudMigration = useCallback(() => {
    setMigrationDecision(userId, 'dismissed');
    setMigrationAvailable(false);
    setSyncStatus('offline');
  }, [userId]);

  const reopenCloudMigration = useCallback(() => {
    setMigrationDecision(userId, 'pending');
    if (hasMeaningfulLocalData(rawDataRef.current)) {
      setMigrationAvailable(true);
    }
  }, [userId]);

  const retrySync = useCallback(async () => {
    if (getSyncOutbox(userId)) await flushOutbox();
    else await refreshCloud();
  }, [flushOutbox, refreshCloud, userId]);

  const saveData = useCallback((data: StudioData) => commitData(data), [commitData]);
  const resetData = useCallback(() => saveLocalData(resetStudioData(userId)), [saveLocalData, userId]);
  const exportData = useCallback(() => exportStudioData(rawData), [rawData]);
  const importData = useCallback((value: string) => commitData(importStudioData(value)), [commitData]);
  const previewImportData = useCallback((value: string) => previewStudioDataImport(value), []);

  const createProject = useCallback((project: StoredProject) => mutate((data) => createProjectInData(data, project)), [mutate]);
  const createFabric = useCallback((fabric: Fabric) => mutate((data) => createFabricInData(data, fabric)), [mutate]);
  const createLinkedMaterial = useCallback((material: LinkedMaterial) => mutate((data) => createLinkedMaterialInData(data, material)), [mutate]);
  const createTask = useCallback((task: StudioTask) => mutate((data) => createTaskInData(data, task)), [mutate]);
  const createNote = useCallback((note: StudioNote) => mutate((data) => createNoteInData(data, note)), [mutate]);
  const updateProject = useCallback((project: StoredProject) => mutate((data) => updateProjectInData(data, project)), [mutate]);
  const updateFabric = useCallback((fabric: Fabric) => mutate((data) => updateFabricInData(data, fabric)), [mutate]);
  const updateLinkedMaterial = useCallback((material: LinkedMaterial) => mutate((data) => updateLinkedMaterialInData(data, material)), [mutate]);
  const updateTask = useCallback((task: StudioTask) => mutate((data) => updateTaskInData(data, task)), [mutate]);
  const updateNote = useCallback((note: StudioNote) => mutate((data) => updateNoteInData(data, note)), [mutate]);
  const updateProjectPhase = useCallback((projectId: string, phase: ProjectPhase) => mutate((data) => updateProjectPhaseInData(data, projectId, phase)), [mutate]);
  const updateTaskStatus = useCallback((taskId: string, status: TaskStatus) => mutate((data) => updateTaskStatusInData(data, taskId, status)), [mutate]);
  const saveLookbookPage = useCallback((page: LookbookPage) => mutate((data) => upsertLookbookPageInData(data, page)), [mutate]);

  const deleteProject = useCallback((projectId: string) => {
    const project = rawDataRef.current.projects.find((item) => item.id === projectId);
    mutate((data) => deleteProjectInData(data, projectId), [
      deletion('project', projectId, projectImagePaths(rawDataRef.current, project)),
    ]);
  }, [mutate]);
  const deleteFabric = useCallback((fabricId: string) => {
    const fabric = rawDataRef.current.fabrics.find((item) => item.id === fabricId);
    mutate((data) => deleteFabricInData(data, fabricId), [deletion('fabric', fabricId, fabric?.image?.storagePath ? [fabric.image.storagePath] : [])]);
  }, [mutate]);
  const deleteLinkedMaterial = useCallback((id: string) => mutate((data) => deleteLinkedMaterialInData(data, id), [deletion('material', id)]), [mutate]);
  const deleteNote = useCallback((id: string) => mutate((data) => deleteNoteInData(data, id), [deletion('note', id)]), [mutate]);
  const deleteTask = useCallback((id: string) => mutate((data) => deleteTaskInData(data, id), [deletion('task', id)]), [mutate]);

  const value = useMemo<StudioDataContextValue>(() => ({
    acceptCloudMigration,
    createFabric,
    createLinkedMaterial,
    createNote,
    createProject,
    createTask,
    data: hydrateStudioData(rawData),
    deleteFabric,
    deleteLinkedMaterial,
    deleteNote,
    deleteProject,
    deleteTask,
    dismissCloudMigration,
    exportData,
    importData,
    migrationAvailable,
    migrationInProgress,
    pendingCount,
    previewImportData,
    rawData,
    reopenCloudMigration,
    resetData,
    retrySync,
    saveData,
    saveLookbookPage,
    syncError,
    syncStatus,
    updateFabric,
    updateLinkedMaterial,
    updateNote,
    updateProject,
    updateProjectPhase,
    updateTask,
    updateTaskStatus,
  }), [acceptCloudMigration, createFabric, createLinkedMaterial, createNote, createProject, createTask, deleteFabric, deleteLinkedMaterial, deleteNote, deleteProject, deleteTask, dismissCloudMigration, exportData, importData, migrationAvailable, migrationInProgress, pendingCount, previewImportData, rawData, reopenCloudMigration, resetData, retrySync, saveData, saveLookbookPage, syncError, syncStatus, updateFabric, updateLinkedMaterial, updateNote, updateProject, updateProjectPhase, updateTask, updateTaskStatus]);

  return <StudioDataContext.Provider value={value}>{children}</StudioDataContext.Provider>;
}

export function useStudioData() {
  const context = useContext(StudioDataContext);
  if (!context) throw new Error('useStudioData must be used inside StudioDataProvider.');
  return context;
}

function stampChangedRecords(current: StudioData, next: StudioData): StudioData {
  return {
    ...next,
    fabrics: stampCollection(current.fabrics, next.fabrics),
    linkedMaterials: stampCollection(current.linkedMaterials, next.linkedMaterials),
    lookbookPages: stampCollection(current.lookbookPages, next.lookbookPages),
    notes: stampCollection(current.notes, next.notes),
    projects: stampCollection(current.projects, next.projects),
    tasks: stampCollection(current.tasks, next.tasks),
    yardageEntries: stampCollection(current.yardageEntries, next.yardageEntries),
  };
}

function stampCollection<T extends { id: string; createdAt?: string; updatedAt?: string }>(current: T[], next: T[]) {
  const currentById = new Map(current.map((item) => [item.id, item]));
  const timestamp = new Date().toISOString();
  return next.map((item) => {
    const previous = currentById.get(item.id);
    if (previous && comparable(previous) === comparable(item)) return previous;
    return {
      ...item,
      createdAt: previous?.createdAt ?? item.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
  });
}

function comparable(value: unknown) {
  return JSON.stringify(value, (key, item) =>
    ['createdAt', 'updatedAt', 'remoteUrl', 'signedUrlExpiresAt', 'uploadState'].includes(key)
      ? undefined
      : item,
  );
}

function appendYardageAuditEntries(current: StudioData, next: StudioData): StudioData {
  const previousById = new Map(current.linkedMaterials.map((item) => [item.id, item]));
  const entries: YardageEntry[] = [];
  next.linkedMaterials.forEach((material) => {
    const previous = previousById.get(material.id);
    if (!material.fabricId) return;
    const timestamp = new Date().toISOString();
    const reservedDelta = material.reservedYards - (previous?.reservedYards ?? 0);
    const usedDelta = material.usedYards - (previous?.usedYards ?? 0);
    if (reservedDelta !== 0) entries.push(yardageEntry(material, reservedDelta > 0 ? 'Reserved' : 'Released', Math.abs(reservedDelta), timestamp));
    if (usedDelta !== 0) entries.push(yardageEntry(material, usedDelta > 0 ? 'Used' : 'Adjusted', Math.abs(usedDelta), timestamp));
  });
  return entries.length ? { ...next, yardageEntries: [...entries, ...next.yardageEntries] } : next;
}

function yardageEntry(material: LinkedMaterial, type: YardageEntry['type'], yards: number, timestamp: string): YardageEntry {
  return {
    createdAt: timestamp,
    fabricId: material.fabricId!,
    id: `yardage-${crypto.randomUUID()}`,
    materialId: material.id,
    occurredAt: timestamp,
    projectId: material.projectId,
    type,
    updatedAt: timestamp,
    yards,
  };
}

function collectImageDeletions(current: StudioData, next: StudioData): SyncDeletion[] {
  const currentImages = imageMap(current);
  const nextImages = imageMap(next);
  const projectImageDeletions = [...currentImages.entries()]
    .filter(([id]) => !nextImages.has(id))
    .map(([id, image]) => deletion('project_image', id, image.storagePath ? [image.storagePath] : []));
  const nextFabricImages = new Set(
    next.fabrics.map((fabric) => fabric.image?.id).filter(Boolean),
  );
  const fabricImageDeletions = current.fabrics
    .map((fabric) => fabric.image)
    .filter(
      (image): image is LocalImageAsset =>
        Boolean(image && !nextFabricImages.has(image.id)),
    )
    .map((image) =>
      deletion(
        'fabric_image',
        image.id,
        image.storagePath ? [image.storagePath] : [],
      ),
    );
  return [...projectImageDeletions, ...fabricImageDeletions];
}

function imageMap(data: StudioData) {
  const images = new Map<string, LocalImageAsset>();
  data.projects.forEach((project) => {
    if (project.heroImage) images.set(project.heroImage.id, project.heroImage);
    project.galleryImages?.forEach((image) => images.set(image.id, image));
  });
  data.lookbookPages.forEach((page) => {
    if (page.heroImage) images.set(page.heroImage.id, page.heroImage);
  });
  return images;
}

function projectImagePaths(data: StudioData, project?: StoredProject) {
  if (!project) return [];
  return [
    project.heroImage,
    ...(project.galleryImages ?? []),
    ...data.lookbookPages
      .filter((page) => page.projectId === project.id)
      .map((page) => page.heroImage),
  ]
    .map((image) => image?.storagePath)
    .filter((path): path is string => Boolean(path));
}

function effectiveDeletions(
  cloud: StudioData,
  deletions: SyncDeletion[],
) {
  const collections: Partial<
    Record<SyncDeletion['entity'], Array<{ id: string; updatedAt?: string }>>
  > = {
    fabric: cloud.fabrics,
    lookbook: cloud.lookbookPages,
    material: cloud.linkedMaterials,
    note: cloud.notes,
    project: cloud.projects,
    task: cloud.tasks,
    yardage: cloud.yardageEntries,
  };

  return deletions.filter((deletion) => {
    const record = collections[deletion.entity]?.find(
      (item) => item.id === deletion.clientId,
    );
    return !record ||
      Date.parse(deletion.deletedAt) >= Date.parse(record.updatedAt ?? '1970-01-01');
  });
}

function deletion(entity: SyncDeletion['entity'], clientId: string, storagePaths: string[] = []): SyncDeletion {
  return { clientId, deletedAt: new Date().toISOString(), entity, storagePaths };
}

function applyDeletionTombstones(data: StudioData, deletions: SyncDeletion[]): StudioData {
  const deleted = (entity: SyncDeletion['entity']) =>
    new Set(deletions.filter((item) => item.entity === entity).map((item) => item.clientId));
  const imageIds = deleted('project_image');
  return {
    ...data,
    fabrics: data.fabrics.filter((item) => !deleted('fabric').has(item.id)),
    linkedMaterials: data.linkedMaterials.filter((item) => !deleted('material').has(item.id)),
    lookbookPages: data.lookbookPages
      .filter((item) => !deleted('lookbook').has(item.id))
      .map((page) => page.heroImage && imageIds.has(page.heroImage.id) ? { ...page, heroImage: undefined } : page),
    notes: data.notes.filter((item) => !deleted('note').has(item.id)),
    projects: data.projects
      .filter((item) => !deleted('project').has(item.id))
      .map((project) => ({
        ...project,
        galleryImages: project.galleryImages?.filter((image) => !imageIds.has(image.id)),
        heroImage: project.heroImage && imageIds.has(project.heroImage.id) ? undefined : project.heroImage,
      })),
    tasks: data.tasks.filter((item) => !deleted('task').has(item.id)),
    yardageEntries: data.yardageEntries.filter((item) => !deleted('yardage').has(item.id)),
  };
}

function outboxCount(outbox: StudioSyncOutbox | null) {
  return outbox ? 1 + outbox.deletions.length : 0;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Cloud sync failed. Local data is still available.';
}
