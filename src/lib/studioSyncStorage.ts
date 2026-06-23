import {
  createSeedStudioData,
  type StoredProject,
  type StudioData,
} from './studioStorage';
import {
  cacheRemoteImagePreview,
  deleteDurableSyncState,
  getDurableSyncState,
  hydrateImagePreview,
  migrateLegacyImageBlob,
  saveDurableSyncState,
} from './imageBlobStore';
import type {
  Fabric,
  LinkedMaterial,
  LocalImageAsset,
  LookbookPage,
  StudioNote,
  StudioTask,
  YardageEntry,
} from '../types/studio';

const QUEUE_VERSION = 2;
const PREFIX = 'mystic-lore-studio:sync';
const queueCache = new Map<string, StudioSyncQueue | null>();
const durableWriteChains = new Map<string, Promise<void>>();

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';
export type SyncPhase =
  | 'idle'
  | 'validating'
  | 'preparing'
  | 'uploading-images'
  | 'saving-records'
  | 'verifying';
export type SyncEntity =
  | 'project'
  | 'fabric'
  | 'task'
  | 'note'
  | 'material'
  | 'lookbook'
  | 'project_image'
  | 'fabric_image'
  | 'yardage';
export type SyncAction = 'upsert' | 'delete';

export type SyncDeletion = {
  clientId: string;
  deletedAt: string;
  entity: SyncEntity;
  storagePaths?: string[];
};

export type SyncImagePayload = {
  image: LocalImageAsset;
  order: number;
  ownerId: string;
  ownerType: 'fabric' | 'lookbook' | 'project';
  projectId?: string;
  slotType: string;
};

export type SyncOperation = {
  action: SyncAction;
  attempts: number;
  clientId: string;
  entity: SyncEntity;
  id: string;
  key: string;
  lastError?: string;
  payload?: unknown;
  queuedAt: string;
  storagePaths?: string[];
  updatedAt: string;
};

export type StudioSyncQueue = {
  operations: SyncOperation[];
  revision: number;
  updatedAt: string;
  version: number;
};

type LegacyOutbox = {
  deletions?: SyncDeletion[];
  snapshot?: StudioData;
};

export type MigrationDecision = 'pending' | 'dismissed' | 'completed';

export function getSyncQueue(userId: string): StudioSyncQueue | null {
  if (queueCache.has(userId)) {
    return queueCache.get(userId) ?? null;
  }

  const raw = readJson<StudioSyncQueue | LegacyOutbox>(queueKey(userId));

  if (!raw) {
    return null;
  }

  if ('storage' in raw && raw.storage === 'indexeddb') {
    return null;
  }

  if ('operations' in raw && Array.isArray(raw.operations)) {
    const operations = raw.operations.map((operation) =>
      sanitizeOperation({
        ...operation,
        id: operation.id || `sync-${crypto.randomUUID()}`,
        key: operation.key ?? `${operation.entity}:${operation.clientId}`,
      }),
    );
    const queue = { ...raw, operations, version: QUEUE_VERSION };
    queueCache.set(userId, queue);
    return queue;
  }

  if ('snapshot' in raw && raw.snapshot) {
    const queue = createQueue([
      ...buildMigrationOperations(raw.snapshot),
      ...(raw.deletions ?? []).map(deletionOperation),
    ]);
    saveQueue(userId, queue);
    return queue;
  }

  return null;
}

export async function hydrateSyncQueue(userId: string) {
  const durable = await getDurableSyncState<StudioSyncQueue>(queueKey(userId))
    .catch(() => undefined);

  if (durable?.operations) {
    queueCache.set(userId, durable);
    return durable;
  }

  const local = getSyncQueue(userId);
  queueCache.set(userId, local);
  return local;
}

export function enqueueSyncOperations(
  userId: string,
  operations: SyncOperation[],
) {
  const current = getSyncQueue(userId) ?? createQueue([]);
  const byKey = new Map(current.operations.map((operation) => [operation.key, operation]));

  operations.forEach((operation) => {
    byKey.set(operation.key, {
      ...operation,
      attempts: 0,
      lastError: undefined,
    });
  });

  const queue: StudioSyncQueue = {
    operations: [...byKey.values()],
    revision: current.revision + 1,
    updatedAt: new Date().toISOString(),
    version: QUEUE_VERSION,
  };
  saveQueue(userId, queue);
  return queue;
}

export function removeSyncOperations(userId: string, operationIds: string[]) {
  const current = getSyncQueue(userId);

  if (!current) {
    return null;
  }

  const removed = new Set(operationIds);
  const latest = getSyncQueue(userId) ?? current;
  const operations = latest.operations.filter(
    (operation) => !removed.has(operation.id),
  );

  if (operations.length === 0) {
    clearSyncQueue(userId);
    return null;
  }

  const queue = {
    ...latest,
    operations,
    revision: latest.revision + 1,
    updatedAt: new Date().toISOString(),
  };
  saveQueue(userId, queue);
  return queue;
}

export function markSyncOperationsFailed(
  userId: string,
  operationIds: string[],
  error: string,
) {
  const current = getSyncQueue(userId);

  if (!current) {
    return null;
  }

  const failed = new Set(operationIds);
  const queue = {
    ...current,
    operations: current.operations.map((operation) =>
      failed.has(operation.id)
        ? {
            ...operation,
            attempts: operation.attempts + 1,
            lastError: error,
            updatedAt: new Date().toISOString(),
          }
        : operation,
    ),
    revision: current.revision + 1,
    updatedAt: new Date().toISOString(),
  };
  saveQueue(userId, queue);
  return queue;
}

export function clearSyncQueue(userId: string) {
  queueCache.set(userId, null);
  window.localStorage.removeItem(queueKey(userId));
  enqueueDurableWrite(queueKey(userId), () =>
    deleteDurableSyncState(queueKey(userId)),
  );
}

export function syncQueueCount(queue: StudioSyncQueue | null) {
  return queue?.operations.length ?? 0;
}

export function failedSyncOperationCount(queue: StudioSyncQueue | null) {
  return queue?.operations.filter((operation) => operation.lastError).length ?? 0;
}

export function buildMigrationOperations(data: StudioData) {
  return [
    ...data.projects.map((project) =>
      upsertOperation('project', stripProjectImages(project)!),
    ),
    ...data.fabrics.map((fabric) =>
      upsertOperation('fabric', stripFabricImage(fabric)!),
    ),
    ...data.linkedMaterials.map((material) => upsertOperation('material', material)),
    ...data.tasks.map((task) => upsertOperation('task', task)),
    ...data.notes.map((note) => upsertOperation('note', note)),
    ...data.lookbookPages.map((page) =>
      upsertOperation('lookbook', stripLookbookImage(page)!),
    ),
    ...data.yardageEntries.map((entry) => upsertOperation('yardage', entry)),
    ...imageOperations(data),
  ];
}

export function buildDataSyncOperations(
  current: StudioData,
  next: StudioData,
  deletions: SyncDeletion[] = [],
) {
  return [
    ...changedRecords('project', current.projects, next.projects, stripProjectImages),
    ...changedRecords('fabric', current.fabrics, next.fabrics, stripFabricImage),
    ...changedRecords('material', current.linkedMaterials, next.linkedMaterials),
    ...changedRecords('task', current.tasks, next.tasks),
    ...changedRecords('note', current.notes, next.notes),
    ...changedRecords('lookbook', current.lookbookPages, next.lookbookPages, stripLookbookImage),
    ...changedRecords('yardage', current.yardageEntries, next.yardageEntries),
    ...changedImages(current, next),
    ...deletions.map(deletionOperation),
  ];
}

export async function migrateQueuedImagePayloads(userId: string) {
  const current = getSyncQueue(userId);

  if (!current) {
    return null;
  }

  let changed = false;
  const operations = await Promise.all(
    current.operations.map(async (operation) => {
      if (!isImageOperation(operation) || operation.action !== 'upsert') {
        return operation;
      }

      const payload = operation.payload as SyncImagePayload;
      const image = await migrateLegacyImageBlob(payload.image);

      if (image === payload.image) {
        return operation;
      }

      changed = true;
      return { ...operation, payload: { ...payload, image } };
    }),
  );

  if (!changed) {
    return current;
  }

  const queue = {
    ...current,
    operations,
    revision: current.revision + 1,
    updatedAt: new Date().toISOString(),
  };
  saveQueue(userId, queue);
  return queue;
}

export async function migrateStudioImagePayloads(
  data: StudioData,
  cacheRemotePreviews = false,
) {
  const migrate = async (image: LocalImageAsset) => {
    const migrated = await migrateLegacyImageBlob(image);
    return cacheRemotePreviews
      ? cacheRemoteImagePreview(migrated)
      : hydrateImagePreview(migrated);
  };
  const migrateOptional = (image: LocalImageAsset | undefined) =>
    image ? migrate(image) : Promise.resolve(undefined);
  const projects = await Promise.all(
    data.projects.map(async (project) => ({
      ...project,
      galleryImages: await Promise.all(
        (project.galleryImages ?? []).map(migrate),
      ),
      heroImage: await migrateOptional(project.heroImage),
    })),
  );
  const fabrics = await Promise.all(
    data.fabrics.map(async (fabric) => ({
      ...fabric,
      image: await migrateOptional(fabric.image),
    })),
  );
  const lookbookPages = await Promise.all(
    data.lookbookPages.map(async (page) => ({
      ...page,
      heroImage: await migrateOptional(page.heroImage),
    })),
  );

  return { ...data, fabrics, lookbookPages, projects };
}

export function getMigrationDecision(userId: string): MigrationDecision {
  return (
    window.localStorage.getItem(migrationKey(userId)) as MigrationDecision | null
  ) ?? 'pending';
}

export function setMigrationDecision(
  userId: string,
  decision: MigrationDecision,
) {
  try {
    window.localStorage.setItem(migrationKey(userId), decision);
  } catch {
    // Cloud data determines migration eligibility when localStorage is full.
  }
}

export async function preserveLegacyBackup(userId: string) {
  const legacyKey = 'mystic-lore-studio:data';
  const serializedData = window.localStorage.getItem(legacyKey);

  if (!serializedData) return false;

  const key = backupKey(userId);
  const durableKey = `${key}:indexeddb`;
  const existing = await getDurableSyncState<string>(durableKey).catch(
    () => undefined,
  );

  if (existing !== serializedData) {
    await saveDurableSyncState(durableKey, serializedData);
  }

  const verified = await getDurableSyncState<string>(durableKey);
  if (verified !== serializedData) {
    throw new Error('The legacy device backup could not be verified.');
  }

  window.localStorage.removeItem(legacyKey);

  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({
        preservedAt: new Date().toISOString(),
        sourceKey: legacyKey,
        storage: 'indexeddb',
      }),
    );
  } catch {
    // The verified IndexedDB backup remains authoritative without the marker.
  }

  return true;
}

export function isUntouchedSeedData(data: StudioData) {
  return stableStringify(toComparableData(data)) ===
    stableStringify(toComparableData(createSeedStudioData()));
}

export function hasMeaningfulLocalData(data: StudioData) {
  return !isUntouchedSeedData(data);
}

export function isImageOperation(operation: SyncOperation) {
  return operation.entity === 'project_image' || operation.entity === 'fabric_image';
}

function changedRecords<T extends { id: string }>(
  entity: SyncEntity,
  current: T[],
  next: T[],
  prepare: (record: T) => unknown = (record) => record,
) {
  const currentById = new Map(current.map((record) => [record.id, record]));

  return next
    .filter((record) =>
      stableStringify(prepare(currentById.get(record.id) as T)) !==
      stableStringify(prepare(record)),
    )
    .map((record) =>
      upsertOperation(entity, prepare(record) as { id: string }),
    );
}

function changedImages(current: StudioData, next: StudioData) {
  const currentByKey = new Map(
    imageOperations(current).map((operation) => [operation.key, operation]),
  );

  return imageOperations(next).filter((operation) => {
    const previous = currentByKey.get(operation.key);
    return !previous ||
      stableStringify(imageSyncPayload(previous.payload)) !==
        stableStringify(imageSyncPayload(operation.payload));
  });
}

function imageSyncPayload(payload: unknown) {
  return JSON.parse(
    JSON.stringify(payload, (key, value) =>
      [
        'blobKey',
        'dataUrl',
        'previewBlobKey',
        'remoteUrl',
        'signedUrlExpiresAt',
        'uploadDataUrl',
        'uploadError',
        'uploadState',
      ].includes(key)
        ? undefined
        : value,
    ),
  );
}

function imageOperations(data: StudioData) {
  const operations: SyncOperation[] = [];

  data.projects.forEach((project) => {
    if (project.heroImage) {
      operations.push(imageOperation(project.heroImage, 'project', project.id, 'hero', 0));
    }
    project.galleryImages?.forEach((image, index) => {
      operations.push(
        imageOperation(image, 'project', project.id, `gallery:${index}`, index),
      );
    });
  });
  data.lookbookPages.forEach((page) => {
    if (page.heroImage) {
      operations.push(
        imageOperation(
          page.heroImage,
          'lookbook',
          page.id,
          `lookbook:${page.id}:hero`,
          0,
          page.projectId,
        ),
      );
    }
  });
  data.fabrics.forEach((fabric) => {
    if (fabric.image) {
      operations.push(imageOperation(fabric.image, 'fabric', fabric.id, 'fabric', 0));
    }
  });

  return operations;
}

function imageOperation(
  image: LocalImageAsset,
  ownerType: SyncImagePayload['ownerType'],
  ownerId: string,
  slotType: string,
  order: number,
  projectId = ownerType === 'project' ? ownerId : undefined,
) {
  const entity = ownerType === 'fabric' ? 'fabric_image' : 'project_image';
  return createOperation(entity, 'upsert', image.id, {
    image,
    order,
    ownerId,
    ownerType,
    projectId,
    slotType,
  } satisfies SyncImagePayload);
}

function upsertOperation(entity: SyncEntity, record: { id: string }) {
  return createOperation(entity, 'upsert', record.id, record);
}

function deletionOperation(deletion: SyncDeletion) {
  return createOperation(
    deletion.entity,
    'delete',
    deletion.clientId,
    undefined,
    deletion.storagePaths,
    deletion.deletedAt,
  );
}

function createOperation(
  entity: SyncEntity,
  action: SyncAction,
  clientId: string,
  payload?: unknown,
  storagePaths?: string[],
  timestamp = new Date().toISOString(),
): SyncOperation {
  return {
    action,
    attempts: 0,
    clientId,
    entity,
    id: `sync-${crypto.randomUUID()}`,
    key: `${entity}:${clientId}`,
    payload,
    queuedAt: timestamp,
    storagePaths,
    updatedAt: timestamp,
  };
}

function sanitizeOperation(operation: SyncOperation) {
  if (operation.action !== 'upsert' || !operation.payload) return operation;

  if (operation.entity === 'project') {
    return {
      ...operation,
      payload: stripProjectImages(operation.payload as StoredProject),
    };
  }

  if (operation.entity === 'fabric') {
    return {
      ...operation,
      payload: stripFabricImage(operation.payload as Fabric),
    };
  }

  if (operation.entity === 'lookbook') {
    return {
      ...operation,
      payload: stripLookbookImage(operation.payload as LookbookPage),
    };
  }

  return operation;
}

function createQueue(operations: SyncOperation[]): StudioSyncQueue {
  return {
    operations,
    revision: 1,
    updatedAt: new Date().toISOString(),
    version: QUEUE_VERSION,
  };
}

function saveQueue(userId: string, queue: StudioSyncQueue) {
  queueCache.set(userId, queue);
  const key = queueKey(userId);
  enqueueDurableWrite(key, () => saveDurableSyncState(key, queue), () => {
    try {
      window.localStorage.removeItem(key);
      window.localStorage.setItem(
        key,
        JSON.stringify({
          operationCount: queue.operations.length,
          revision: queue.revision,
          storage: 'indexeddb',
          updatedAt: queue.updatedAt,
          version: queue.version,
        }),
      );
    } catch {
      // IndexedDB remains authoritative when localStorage is already full.
    }
  });
}

function enqueueDurableWrite(
  key: string,
  write: () => Promise<void>,
  onSuccess?: () => void,
) {
  const previous = durableWriteChains.get(key) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(write)
    .then(onSuccess)
    .catch(() => undefined);
  durableWriteChains.set(key, next);
}

function stripProjectImages(project: StoredProject | undefined) {
  if (!project) return project;
  const { galleryImages: _gallery, heroImage: _hero, ...record } = project;
  return record;
}

function stripFabricImage(fabric: Fabric | undefined) {
  if (!fabric) return fabric;
  const { image: _image, ...record } = fabric;
  return record;
}

function stripLookbookImage(page: LookbookPage | undefined) {
  if (!page) return page;
  const { heroImage: _hero, ...record } = page;
  return record;
}

function toComparableData(data: StudioData) {
  const clean = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map(clean);
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .filter(
            ([key]) =>
              ![
                'createdAt',
                'updatedAt',
                'remoteUrl',
                'signedUrlExpiresAt',
                'uploadError',
                'uploadState',
              ].includes(key),
          )
          .map(([key, item]) => [key, clean(item)]),
      );
    }

    return value;
  };

  return clean({
    fabrics: data.fabrics,
    linkedMaterials: data.linkedMaterials,
    lookbookPages: data.lookbookPages,
    notes: data.notes,
    projects: data.projects,
    tasks: data.tasks,
    yardageEntries: data.yardageEntries,
  });
}

function stableStringify(value: unknown) {
  return JSON.stringify(sortObject(value));
}

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, sortObject(item)]),
    );
  }

  return value;
}

function readJson<T>(key: string): T | null {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function queueKey(userId: string) {
  return `${PREFIX}:outbox:${userId}`;
}

function migrationKey(userId: string) {
  return `${PREFIX}:migration:${userId}:v2`;
}

function backupKey(userId: string) {
  return `${PREFIX}:legacy-backup:${userId}`;
}

// These imports anchor payload types for operation consumers without widening
// operation payloads to arbitrary application records.
export type SyncRecordPayload =
  | StoredProject
  | Fabric
  | LinkedMaterial
  | StudioTask
  | StudioNote
  | LookbookPage
  | YardageEntry;
