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
  checkCloudSyncReadiness,
  executeSyncOperations,
  fetchCloudStudioData,
  markCloudMigrationComplete,
  mergeByNewest,
} from '../lib/supabaseStudio';
import {
  buildDataSyncOperations,
  buildMigrationOperations,
  enqueueSyncOperations,
  failedSyncOperationCount,
  getMigrationDecision,
  getSyncQueue,
  hasMeaningfulLocalData,
  hydrateSyncQueue,
  markSyncOperationsFailed,
  migrateQueuedImagePayloads,
  migrateStudioImagePayloads,
  preserveLegacyBackup,
  removeSyncOperations,
  setMigrationDecision,
  syncQueueCount,
  type SyncDeletion,
  type SyncImagePayload,
  type SyncPhase,
  type SyncStatus,
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

export type SyncProgress = {
  completed: number;
  total: number;
};

type StudioDataContextValue = {
  acceptCloudMigration: () => Promise<void>;
  cancelSync: () => void;
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
  failedOperationCount: number;
  importData: (serializedData: string) => void;
  lastSyncedAt: string | null;
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
  syncPhase: SyncPhase;
  syncProgress: SyncProgress;
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
  const initialQueue = getSyncQueue(userId);
  const [pendingCount, setPendingCount] = useState(() =>
    syncQueueCount(initialQueue),
  );
  const [failedOperationCount, setFailedOperationCount] = useState(() =>
    failedSyncOperationCount(initialQueue),
  );
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncPhase, setSyncPhase] = useState<SyncPhase>('idle');
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    completed: 0,
    total: syncQueueCount(initialQueue),
  });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('syncing');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const cloudReadyRef = useRef(false);
  const readinessConfirmedRef = useRef(false);
  const migrationInProgressRef = useRef(false);
  const cancelRequestedRef = useRef(false);
  const flushPromiseRef = useRef<Promise<boolean> | null>(null);
  const flushFunctionRef = useRef<() => Promise<boolean>>(() =>
    Promise.resolve(false),
  );
  const rawDataRef = useRef(rawData);

  const saveLocalData = useCallback(
    (nextData: StudioData) => {
      rawDataRef.current = nextData;
      saveStudioData(nextData, userId);
      setRawData(nextData);
    },
    [userId],
  );

  const refreshQueueState = useCallback(() => {
    const queue = getSyncQueue(userId);
    setPendingCount(syncQueueCount(queue));
    setFailedOperationCount(failedSyncOperationCount(queue));
    return queue;
  }, [userId]);

  const applyImageState = useCallback(
    (
      payload: SyncImagePayload,
      state: LocalImageAsset['uploadState'],
      error?: string,
      replacement?: LocalImageAsset,
    ) => {
      saveLocalData(
        replaceImage(rawDataRef.current, payload, (image) => ({
          ...(replacement ?? image),
          uploadError: error,
          uploadState: state,
        })),
      );
    },
    [saveLocalData],
  );

  const performQueueDrain = useCallback(async () => {
    if (!navigator.onLine) {
      setSyncStatus('offline');
      setSyncPhase('idle');
      return false;
    }

    cancelRequestedRef.current = false;
    setSyncError(null);
    setSyncStatus('syncing');

    if (!readinessConfirmedRef.current) {
      setSyncPhase('validating');
      const readiness = await checkCloudSyncReadiness(userId);

      if (!readiness.ready) {
        setSyncError(readiness.message);
        setSyncStatus('error');
        setSyncPhase('idle');
        setMigrationInProgress(false);
        migrationInProgressRef.current = false;
        readinessConfirmedRef.current = false;
        return false;
      }

      readinessConfirmedRef.current = true;
      cloudReadyRef.current = true;
    }

    while (!cancelRequestedRef.current) {
      await migrateQueuedImagePayloads(userId);
      const queue = refreshQueueState();

      if (!queue || queue.operations.length === 0) {
        break;
      }

      const execution = await executeSyncOperations(
        userId,
        queue.operations,
        {
          isCancelled: () => cancelRequestedRef.current,
          onImageState: (payload, state) => applyImageState(payload, state),
          onPhase: (phase, completed, total) => {
            setSyncPhase(phase);
            setSyncProgress({ completed, total });
          },
        },
      );

      if (execution.completedOperationIds.length > 0) {
        removeSyncOperations(userId, execution.completedOperationIds);
      }
      execution.imageUpdates.forEach(({ image, payload }) =>
        applyImageState(payload, 'uploaded', undefined, image),
      );

      if (execution.failures.length > 0) {
        execution.failures.forEach((failure) => {
          const failedQueue = getSyncQueue(userId);
          const failedIds = new Set(failure.operationIds);
          failedQueue?.operations
            .filter(
              (operation) =>
                failedIds.has(operation.id) && operation.payload,
            )
            .forEach((operation) => {
              if (
                operation.entity === 'project_image' ||
                operation.entity === 'fabric_image'
              ) {
                applyImageState(
                  operation.payload as SyncImagePayload,
                  'error',
                  failure.error,
                );
              }
            });
          markSyncOperationsFailed(
            userId,
            failure.operationIds,
            failure.error,
          );
        });
        refreshQueueState();
        setSyncError(execution.failures[0].error);
        setSyncStatus('error');
        setSyncPhase('idle');
        setMigrationInProgress(false);
        migrationInProgressRef.current = false;
        return false;
      }

      refreshQueueState();

      if (execution.cancelled) {
        setSyncStatus('offline');
        setSyncPhase('idle');
        setMigrationInProgress(false);
        migrationInProgressRef.current = false;
        return false;
      }
    }

    if (cancelRequestedRef.current) {
      setSyncStatus('offline');
      setSyncPhase('idle');
      setMigrationInProgress(false);
      migrationInProgressRef.current = false;
      return false;
    }

    if (migrationInProgressRef.current) {
      setSyncPhase('verifying');
      const cloud = await fetchCloudStudioData(userId);

      if (!getSyncQueue(userId)) {
        saveLocalData(mergeByNewest(cloud.data, rawDataRef.current));
      }
      await markCloudMigrationComplete(userId);
      setMigrationDecision(userId, 'completed');
      setMigrationInProgress(false);
      migrationInProgressRef.current = false;
    }

    setPendingCount(0);
    setFailedOperationCount(0);
    setSyncProgress({ completed: 0, total: 0 });
    setSyncPhase('idle');
    setSyncStatus('synced');
    setSyncError(null);
    setLastSyncedAt(new Date().toISOString());
    return true;
  }, [applyImageState, refreshQueueState, saveLocalData, userId]);

  const flushQueue = useCallback(() => {
    if (flushPromiseRef.current) {
      return flushPromiseRef.current;
    }

    let completedSuccessfully = false;
    const promise = performQueueDrain().then((completed) => {
      completedSuccessfully = completed;
      return completed;
    }).catch((error) => {
      setSyncError(errorMessage(error));
      setSyncStatus(navigator.onLine ? 'error' : 'offline');
      setSyncPhase('idle');
      setMigrationInProgress(false);
      migrationInProgressRef.current = false;
      return false;
    }).finally(() => {
      flushPromiseRef.current = null;

      if (
        completedSuccessfully &&
        getSyncQueue(userId) &&
        navigator.onLine &&
        !cancelRequestedRef.current
      ) {
        window.setTimeout(() => void flushFunctionRef.current(), 0);
      }
    });
    flushPromiseRef.current = promise;
    return promise;
  }, [performQueueDrain, userId]);
  flushFunctionRef.current = flushQueue;

  const refreshCloud = useCallback(async () => {
    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }

    setSyncStatus('syncing');
    setSyncPhase('validating');
    setSyncError(null);
    const readiness = await checkCloudSyncReadiness(userId);

    if (!readiness.ready) {
      setSyncError(readiness.message);
      setSyncStatus('error');
      setSyncPhase('idle');
      readinessConfirmedRef.current = false;
      return;
    }

    readinessConfirmedRef.current = true;
    cloudReadyRef.current = true;

    if (getSyncQueue(userId)) {
      await flushQueue();
      return;
    }

    try {
      const cloud = await fetchCloudStudioData(userId);
      const meaningful = hasMeaningfulLocalData(rawDataRef.current);
      const migrationPending = getMigrationDecision(userId) === 'pending';

      if (!cloud.hasCloudData && meaningful && migrationPending) {
        setMigrationAvailable(true);
        setSyncStatus('offline');
        setSyncPhase('idle');
        return;
      }

      if (cloud.hasCloudData) {
        preserveLegacyBackup(userId);
        const merged = mergeByNewest(cloud.data, rawDataRef.current);
        const resolved = {
          ...merged,
          settings: rawDataRef.current.settings,
        };
        saveLocalData(resolved);
        setMigrationDecision(userId, 'completed');

        const localNewerOperations = buildDataSyncOperations(
          cloud.data,
          resolved,
        );
        if (localNewerOperations.length > 0) {
          const queue = enqueueSyncOperations(userId, localNewerOperations);
          setPendingCount(syncQueueCount(queue));
          setFailedOperationCount(failedSyncOperationCount(queue));
          await flushQueue();
          return;
        }
      }

      setSyncStatus('synced');
      setSyncPhase('idle');
      setLastSyncedAt(new Date().toISOString());
    } catch (error) {
      setSyncError(errorMessage(error));
      setSyncStatus(navigator.onLine ? 'error' : 'offline');
      setSyncPhase('idle');
    }
  }, [flushQueue, saveLocalData, userId]);

  useEffect(() => {
    let active = true;

    void hydrateSyncQueue(userId)
      .then((queue) => {
        if (!active) return;
        setPendingCount(syncQueueCount(queue));
        setFailedOperationCount(failedSyncOperationCount(queue));
        return migrateStudioImagePayloads(rawDataRef.current);
      })
      .then((migrated) => {
        if (!active || !migrated) return;
        saveLocalData(mergeMigratedImagePayloads(rawDataRef.current, migrated));
        return migrateQueuedImagePayloads(userId);
      })
      .then(() => {
        if (active) void refreshCloud();
      })
      .catch((error) => {
        if (!active) return;
        setSyncError(errorMessage(error));
        setSyncStatus('error');
      });

    const refresh = () =>
      void (getSyncQueue(userId) ? flushQueue() : refreshCloud());
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    return () => {
      active = false;
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
    };
  }, [flushQueue, refreshCloud, saveLocalData, userId]);

  const commitData = useCallback(
    (nextData: StudioData, deletions: SyncDeletion[] = []) => {
      const current = rawDataRef.current;
      const stamped = stampChangedRecords(current, nextData);
      const withYardage = appendYardageAuditEntries(current, stamped);
      const allDeletions = [
        ...deletions,
        ...collectImageDeletions(current, withYardage),
      ];
      const operations = buildDataSyncOperations(
        current,
        withYardage,
        allDeletions,
      );
      saveLocalData(withYardage);

      if (
        operations.length > 0 &&
        (cloudReadyRef.current ||
          getMigrationDecision(userId) === 'completed' ||
          Boolean(getSyncQueue(userId)))
      ) {
        const queue = enqueueSyncOperations(userId, operations);
        setPendingCount(syncQueueCount(queue));
        setFailedOperationCount(failedSyncOperationCount(queue));
        void flushQueue();
      } else if (
        hasMeaningfulLocalData(withYardage) &&
        getMigrationDecision(userId) === 'pending'
      ) {
        setMigrationAvailable(true);
        setSyncStatus('offline');
      }
    },
    [flushQueue, saveLocalData, userId],
  );

  const mutate = useCallback(
    (
      mutation: (current: StudioData) => StudioData,
      deletions: SyncDeletion[] = [],
    ) => commitData(mutation(rawDataRef.current), deletions),
    [commitData],
  );

  const acceptCloudMigration = useCallback(async () => {
    setMigrationAvailable(false);
    setMigrationInProgress(true);
    migrationInProgressRef.current = true;
    setSyncError(null);
    setSyncStatus('syncing');
    setSyncPhase('validating');

    try {
      const readiness = await checkCloudSyncReadiness(userId);

      if (!readiness.ready) {
        setSyncError(readiness.message);
        setSyncStatus('error');
        setSyncPhase('idle');
        setMigrationInProgress(false);
        migrationInProgressRef.current = false;
        readinessConfirmedRef.current = false;
        return;
      }

      readinessConfirmedRef.current = true;
      cloudReadyRef.current = true;
      setSyncPhase('preparing');
      preserveLegacyBackup(userId);
      const migrated = await migrateStudioImagePayloads(rawDataRef.current);
      const migrationData = mergeMigratedImagePayloads(
        rawDataRef.current,
        migrated,
      );
      saveLocalData(migrationData);
      const queue = enqueueSyncOperations(
        userId,
        buildMigrationOperations(migrationData),
      );
      setPendingCount(syncQueueCount(queue));
      setFailedOperationCount(failedSyncOperationCount(queue));
      setSyncProgress({ completed: 0, total: syncQueueCount(queue) });
      void flushQueue();
    } catch (error) {
      setSyncError(errorMessage(error));
      setSyncStatus(navigator.onLine ? 'error' : 'offline');
      setSyncPhase('idle');
      setMigrationInProgress(false);
      migrationInProgressRef.current = false;
      readinessConfirmedRef.current = false;
    }
  }, [flushQueue, saveLocalData, userId]);

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
    cancelRequestedRef.current = false;
    readinessConfirmedRef.current = false;
    const queue = getSyncQueue(userId);

    if (queue) {
      const resetOperations = queue.operations.map((operation) => ({
        ...operation,
        attempts: 0,
        lastError: undefined,
      }));
      enqueueSyncOperations(userId, resetOperations);
      await flushQueue();
    } else {
      await refreshCloud();
    }
  }, [flushQueue, refreshCloud, userId]);

  const cancelSync = useCallback(() => {
    cancelRequestedRef.current = true;
    setMigrationInProgress(false);
    migrationInProgressRef.current = false;
    setSyncPhase('idle');
    setSyncStatus('offline');
    setSyncError(null);
  }, []);

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
    cancelSync,
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
    failedOperationCount,
    importData,
    lastSyncedAt,
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
    syncPhase,
    syncProgress,
    syncStatus,
    updateFabric,
    updateLinkedMaterial,
    updateNote,
    updateProject,
    updateProjectPhase,
    updateTask,
    updateTaskStatus,
  }), [acceptCloudMigration, cancelSync, createFabric, createLinkedMaterial, createNote, createProject, createTask, deleteFabric, deleteLinkedMaterial, deleteNote, deleteProject, deleteTask, dismissCloudMigration, exportData, failedOperationCount, importData, lastSyncedAt, migrationAvailable, migrationInProgress, pendingCount, previewImportData, rawData, reopenCloudMigration, resetData, retrySync, saveData, saveLookbookPage, syncError, syncPhase, syncProgress, syncStatus, updateFabric, updateLinkedMaterial, updateNote, updateProject, updateProjectPhase, updateTask, updateTaskStatus]);

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
    ['createdAt', 'updatedAt', 'remoteUrl', 'signedUrlExpiresAt', 'uploadError', 'uploadState'].includes(key)
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

function replaceImage(
  data: StudioData,
  payload: SyncImagePayload,
  replace: (image: LocalImageAsset) => LocalImageAsset,
): StudioData {
  if (payload.ownerType === 'fabric') {
    return {
      ...data,
      fabrics: data.fabrics.map((fabric) =>
        fabric.id === payload.ownerId && fabric.image
          ? { ...fabric, image: replace(fabric.image) }
          : fabric,
      ),
    };
  }

  if (payload.ownerType === 'lookbook') {
    return {
      ...data,
      lookbookPages: data.lookbookPages.map((page) =>
        page.id === payload.ownerId && page.heroImage
          ? { ...page, heroImage: replace(page.heroImage) }
          : page,
      ),
    };
  }

  return {
    ...data,
    projects: data.projects.map((project) => {
      if (project.id !== payload.ownerId) return project;
      return {
        ...project,
        galleryImages: project.galleryImages?.map((image) =>
          image.id === payload.image.id ? replace(image) : image,
        ),
        heroImage:
          project.heroImage?.id === payload.image.id
            ? replace(project.heroImage)
            : project.heroImage,
      };
    }),
  };
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

function mergeMigratedImagePayloads(base: StudioData, migrated: StudioData) {
  const migratedImages = new Map<string, LocalImageAsset>();
  migrated.projects.forEach((project) => {
    if (project.heroImage) migratedImages.set(project.heroImage.id, project.heroImage);
    project.galleryImages?.forEach((image) => migratedImages.set(image.id, image));
  });
  migrated.lookbookPages.forEach((page) => {
    if (page.heroImage) migratedImages.set(page.heroImage.id, page.heroImage);
  });
  migrated.fabrics.forEach((fabric) => {
    if (fabric.image) migratedImages.set(fabric.image.id, fabric.image);
  });
  const replace = (image: LocalImageAsset | undefined) =>
    image ? migratedImages.get(image.id) ?? image : undefined;

  return {
    ...base,
    fabrics: base.fabrics.map((fabric) => ({
      ...fabric,
      image: replace(fabric.image),
    })),
    lookbookPages: base.lookbookPages.map((page) => ({
      ...page,
      heroImage: replace(page.heroImage),
    })),
    projects: base.projects.map((project) => ({
      ...project,
      galleryImages: project.galleryImages?.map((image) => replace(image)!),
      heroImage: replace(project.heroImage),
    })),
  };
}

function deletion(entity: SyncDeletion['entity'], clientId: string, storagePaths: string[] = []): SyncDeletion {
  return { clientId, deletedAt: new Date().toISOString(), entity, storagePaths };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Cloud sync failed. Local data is still available.';
}
