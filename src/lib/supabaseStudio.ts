import { supabase } from './supabase';
import { createSeedStudioData, type StoredProject, type StudioData } from './studioStorage';
import { deleteImageBlob, getImageBlob } from './imageBlobStore';
import type {
  Fabric,
  LinkedMaterial,
  LocalImageAsset,
  LookbookPage,
  StudioNote,
  StudioTask,
  YardageEntry,
} from '../types/studio';
import { normalizeFabricDrape, normalizeWovenKnit } from './fabricMetadata';
import { normalizePortfolioProfile } from './portfolio';
import type { PortfolioProfile } from '../types/portfolio';
import {
  isImageOperation,
  type SyncDeletion,
  type SyncEntity,
  type SyncImagePayload,
  type SyncOperation,
  type SyncPhase,
} from './studioSyncStorage';

const IMAGE_BUCKET = 'project-images';
const SIGNED_URL_SECONDS = 60 * 60;
const DATABASE_TIMEOUT_MS = 15_000;
const IMAGE_TIMEOUT_MS = 45_000;
const RETRY_DELAYS_MS = [1_000, 2_000, 4_000] as const;
const RECORD_BATCH_SIZE = 50;
const IMAGE_CONCURRENCY = 2;
const REQUIRED_TABLES = [
  'profiles',
  'projects',
  'fabrics',
  'materials',
  'tasks',
  'notes',
  'lookbook_pages',
  'yardage_entries',
  'project_images',
  'sync_tombstones',
] as const;

type CloudRow = Record<string, unknown>;
export type CloudTombstone = {
  clientId: string;
  deletedAt: string;
  entity: SyncEntity;
};

export type CloudSnapshot = {
  cloudInitialized: boolean;
  data: StudioData;
  hasCloudData: boolean;
  mediaRepairs: SyncDeletion[];
  tombstones: CloudTombstone[];
};

export type CloudReadinessIssue =
  | 'authentication'
  | 'bucket-missing'
  | 'network'
  | 'object-missing'
  | 'permissions'
  | 'schema-missing'
  | 'timeout'
  | 'unknown';

export type CloudReadiness = {
  issue?: CloudReadinessIssue;
  message: string;
  ready: boolean;
};

export type SyncExecutionFailure = {
  error: string;
  issue: CloudReadinessIssue;
  operationIds: string[];
};

export type SyncExecutionResult = {
  cancelled: boolean;
  completedOperationIds: string[];
  failures: SyncExecutionFailure[];
  imageUpdates: Array<{ image: LocalImageAsset; payload: SyncImagePayload }>;
};

export type SyncExecutionCallbacks = {
  isCancelled?: () => boolean;
  onImageState?: (payload: SyncImagePayload, state: 'uploading') => void;
  onPhase?: (phase: SyncPhase, completed: number, total: number) => void;
};

export async function checkCloudSyncReadiness(
  userId: string,
): Promise<CloudReadiness> {
  const client = requireSupabase();

  try {
    const { data: sessionData, error: sessionError } = await withTimeout(
      client.auth.getSession(),
      DATABASE_TIMEOUT_MS,
      'Supabase authentication timed out.',
    );

    if (sessionError || !sessionData.session || sessionData.session.user.id !== userId) {
      return {
        issue: 'authentication',
        message: 'Your Supabase session expired. Sign in again before syncing.',
        ready: false,
      };
    }

    await Promise.all(
      REQUIRED_TABLES.map((table) =>
        databaseRequest<CloudRow[]>(`validate ${table}`, () =>
          client.from(table).select('id').limit(1),
        ),
      ),
    );
    await databaseRequest<CloudRow[]>('validate portfolio profile storage', () =>
      client.from('profiles').select('portfolio_profile').limit(1),
    );

    await storageRequest('validate image storage', () =>
      client.storage.from(IMAGE_BUCKET).list(`users/${userId}`, { limit: 1 }),
    );

    return {
      message: 'Supabase tables and private image storage are ready.',
      ready: true,
    };
  } catch (error) {
    const cloudError = normalizeCloudError(error);
    return {
      issue: cloudError.issue,
      message: cloudError.message,
      ready: false,
    };
  }
}

export async function markCloudMigrationComplete(userId: string) {
  await databaseRequest('record cloud migration completion', () =>
    requireSupabase().from('profiles').upsert(
      {
        cloud_migration_completed_at: new Date().toISOString(),
        user_id: userId,
      },
      { onConflict: 'user_id' },
    ),
  );
}

export async function fetchCloudStudioData(userId: string): Promise<CloudSnapshot> {
  const client = requireSupabase();
  const tableNames = [
    'projects',
    'fabrics',
    'materials',
    'tasks',
    'notes',
    'lookbook_pages',
    'yardage_entries',
    'project_images',
    'sync_tombstones',
    'profiles',
  ] as const;
  const results = await Promise.all(
    tableNames.map((table) =>
      databaseRequest<CloudRow[]>(`load ${table}`, () =>
        client.from(table).select('*').eq('user_id', userId),
      ),
    ),
  );

  const [
    rawProjectRows,
    rawFabricRows,
    rawMaterialRows,
    rawTaskRows,
    rawNoteRows,
    rawLookbookRows,
    rawYardageRows,
    rawImageRows,
    tombstoneRows,
    profileRows,
  ] = results.map((result) => result ?? []);
  const tombstones = tombstoneRows.map(rowToTombstone);
  const projectRows = activeRows(rawProjectRows, 'project', tombstones);
  const fabricRows = activeRows(rawFabricRows, 'fabric', tombstones);
  let materialRows = activeRows(rawMaterialRows, 'material', tombstones);
  let taskRows = activeRows(rawTaskRows, 'task', tombstones);
  let noteRows = activeRows(rawNoteRows, 'note', tombstones);
  let lookbookRows = activeRows(rawLookbookRows, 'lookbook', tombstones);
  let yardageRows = activeRows(rawYardageRows, 'yardage', tombstones);
  let imageRows = activeRows(rawImageRows, 'project_image', tombstones);
  const projectClientById = idMap(projectRows);
  const fabricClientById = idMap(fabricRows);
  materialRows = materialRows.filter((row) =>
    projectClientById.has(asString(row.project_id)),
  );
  const materialClientById = idMap(materialRows);
  taskRows = taskRows.filter((row) =>
    projectClientById.has(asString(row.project_id)),
  );
  noteRows = noteRows.filter((row) =>
    projectClientById.has(asString(row.project_id)),
  );
  lookbookRows = lookbookRows.filter((row) =>
    projectClientById.has(asString(row.project_id)),
  );
  yardageRows = yardageRows.filter((row) => {
    const projectId = nullableString(row.project_id);
    const materialId = nullableString(row.material_id);
    return fabricClientById.has(asString(row.fabric_id)) &&
      (!projectId || projectClientById.has(projectId)) &&
      (!materialId || materialClientById.has(materialId));
  });
  imageRows = imageRows.filter((row) =>
    projectClientById.has(asString(row.project_id)),
  );
  const projects = projectRows.map(rowToProject);
  const fabricResults = await Promise.all(fabricRows.map(rowToFabric));
  const fabrics = fabricResults.map((result) => result.fabric);
  const linkedMaterials = materialRows.map((row) =>
    rowToMaterial(row, projectClientById, fabricClientById),
  );
  const tasks = taskRows.map((row) =>
    rowToTask(row, projectClientById, materialClientById),
  );
  const notes = noteRows.map((row) => rowToNote(row, projectClientById));
  const lookbookPages = lookbookRows.map((row) =>
    rowToLookbook(row, projectClientById),
  );
  const yardageEntries = yardageRows.map((row) =>
    rowToYardage(row, projectClientById, fabricClientById, materialClientById),
  );

  const projectImageRepairs = await applyProjectImages(
    projects,
    lookbookPages,
    imageRows,
    projectClientById,
  );
  const mediaRepairs = [
    ...fabricResults.flatMap((result) => result.repair ? [result.repair] : []),
    ...projectImageRepairs,
  ];

  const seed = createSeedStudioData();
  const profileRow = profileRows[0];
  const data: StudioData = {
    editorialCollections: [],
    fabrics,
    linkedMaterials,
    lookbookPages,
    notes,
    portfolioProfile: profileRow
      ? normalizePortfolioProfile({
          ...asRecord(profileRow.portfolio_profile),
          updatedAt: asString(
            asRecord(profileRow.portfolio_profile).updatedAt,
            asString(profileRow.updated_at),
          ),
        })
      : seed.portfolioProfile,
    projects,
    settings: seed.settings,
    tasks,
    version: seed.version,
    yardageEntries,
  };

  return {
    cloudInitialized:
      results.slice(0, 8).some((result) => result.length > 0) ||
      tombstones.length > 0 ||
      profileRows.some((row) => Boolean(row.cloud_migration_completed_at)),
    data,
    hasCloudData: results.slice(0, 8).some((result) => result.length > 0),
    mediaRepairs,
    tombstones,
  };
}

export async function refreshSignedImageUrl(storagePath: string) {
  const data = await storageRequest('refresh image access', () =>
    requireSupabase()
      .storage.from(IMAGE_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_SECONDS),
  );

  return data.signedUrl;
}

export async function executeSyncOperations(
  userId: string,
  operations: SyncOperation[],
  callbacks: SyncExecutionCallbacks = {},
): Promise<SyncExecutionResult> {
  const result: SyncExecutionResult = {
    cancelled: false,
    completedOperationIds: [],
    failures: [],
    imageUpdates: [],
  };
  let executableOperations = operations;

  try {
    const tombstones = await fetchCloudTombstones(userId);
    const tombstoneByKey = tombstoneMap(tombstones);
    const suppressed = operations.filter((operation) => {
      if (operation.action !== 'upsert') return false;
      const tombstone = tombstoneByKey.get(operation.key);
      return tombstone && Date.parse(tombstone.deletedAt) >= Date.parse(operation.updatedAt);
    });
    const suppressedIds = new Set(suppressed.map((operation) => operation.id));
    result.completedOperationIds.push(...suppressedIds);
    executableOperations = operations.filter(
      (operation) => !suppressedIds.has(operation.id),
    );
  } catch (error) {
    return failedResult(result, operations, error);
  }

  const upserts = executableOperations.filter((operation) => operation.action === 'upsert');
  const deletions = executableOperations.filter((operation) => operation.action === 'delete');
  const recordUpserts = upserts.filter((operation) => !isImageOperation(operation));
  const imageUpserts = upserts.filter(isImageOperation);
  const total = operations.length;

  callbacks.onPhase?.('preparing', 0, total);

  let maps: CloudIdMaps;

  try {
    maps = await fetchCloudIdMaps(userId);
  } catch (error) {
    return failedResult(result, operations, error);
  }

  callbacks.onPhase?.('saving-records', 0, total);

  for (const entity of RECORD_UPSERT_ORDER) {
    const entityOperations = recordUpserts.filter(
      (operation) => operation.entity === entity,
    );

    for (const batch of chunks(entityOperations, RECORD_BATCH_SIZE)) {
      if (batch.length === 0) continue;
      if (callbacks.isCancelled?.()) {
        result.cancelled = true;
        return result;
      }

      try {
        await upsertOperationBatch(userId, entity, batch, maps);
        result.completedOperationIds.push(...batch.map((operation) => operation.id));
        callbacks.onPhase?.(
          'saving-records',
          result.completedOperationIds.length,
          total,
        );
      } catch (error) {
        return failedResult(result, batch, error);
      }
    }
  }

  if (imageUpserts.length > 0) {
    callbacks.onPhase?.(
      'uploading-images',
      result.completedOperationIds.length,
      total,
    );
    const imageResults = await mapWithConcurrency(
      imageUpserts,
      IMAGE_CONCURRENCY,
      async (operation) => {
        if (callbacks.isCancelled?.()) {
          return { cancelled: true as const, operation };
        }

        try {
          callbacks.onImageState?.(
            operation.payload as SyncImagePayload,
            'uploading',
          );
          const update = await upsertImageOperation(userId, operation, maps);
          return { operation, update };
        } catch (error) {
          return { error, operation };
        }
      },
    );

    imageResults.forEach((imageResult) => {
      if ('cancelled' in imageResult) {
        result.cancelled = true;
        return;
      }

      if ('error' in imageResult) {
        const cloudError = normalizeCloudError(imageResult.error);
        result.failures.push({
          error: cloudError.message,
          issue: cloudError.issue,
          operationIds: [imageResult.operation.id],
        });
        return;
      }

      result.completedOperationIds.push(imageResult.operation.id);
      result.imageUpdates.push(imageResult.update);
      callbacks.onPhase?.(
        'uploading-images',
        result.completedOperationIds.length,
        total,
      );
    });
  }

  callbacks.onPhase?.(
    'saving-records',
    result.completedOperationIds.length,
    total,
  );
  const orderedDeletions = [...deletions].sort(
    (left, right) =>
      DELETE_ORDER.indexOf(left.entity) - DELETE_ORDER.indexOf(right.entity),
  );

  for (const operation of orderedDeletions) {
    if (callbacks.isCancelled?.()) {
      result.cancelled = true;
      return result;
    }

    try {
      await executeDeleteOperation(userId, operation);
      result.completedOperationIds.push(operation.id);
      callbacks.onPhase?.(
        'saving-records',
        result.completedOperationIds.length,
        total,
      );
    } catch (error) {
      const cloudError = normalizeCloudError(error);
      result.failures.push({
        error: cloudError.message,
        issue: cloudError.issue,
        operationIds: [operation.id],
      });
    }
  }

  return result;
}

const RECORD_UPSERT_ORDER: SyncEntity[] = [
  'profile',
  'project',
  'fabric',
  'material',
  'task',
  'note',
  'lookbook',
  'yardage',
];
const DELETE_ORDER: SyncEntity[] = [
  'project_image',
  'fabric_image',
  'task',
  'note',
  'yardage',
  'lookbook',
  'material',
  'project',
  'fabric',
];
const TABLE_BY_ENTITY: Partial<Record<SyncEntity, string>> = {
  fabric: 'fabrics',
  lookbook: 'lookbook_pages',
  material: 'materials',
  note: 'notes',
  profile: 'profiles',
  project: 'projects',
  project_image: 'project_images',
  task: 'tasks',
  yardage: 'yardage_entries',
};

type CloudIdMaps = {
  fabrics: Map<string, string>;
  materials: Map<string, string>;
  projects: Map<string, string>;
};

async function fetchCloudIdMaps(userId: string): Promise<CloudIdMaps> {
  const [projects, fabrics, materials] = await Promise.all([
    fetchUuidMap('projects', userId),
    fetchUuidMap('fabrics', userId),
    fetchUuidMap('materials', userId),
  ]);

  return { fabrics, materials, projects };
}

async function upsertOperationBatch(
  userId: string,
  entity: SyncEntity,
  operations: SyncOperation[],
  maps: CloudIdMaps,
) {
  const table = TABLE_BY_ENTITY[entity];

  if (!table) {
    throw new Error(`Unsupported sync entity: ${entity}.`);
  }

  const rows = operations.map((operation) =>
    operationPayload(userId, entity, operation.payload, maps),
  );
  if (entity === 'profile') {
    await databaseRequest('save portfolio profile', () =>
      requireSupabase()
        .from(table)
        .upsert(rows, { onConflict: 'user_id' }),
    );
    return;
  }

  const returned = await databaseRequest<CloudRow[]>(`save ${entity}`, () =>
    requireSupabase()
      .from(table)
      .upsert(rows, { onConflict: 'user_id,client_id' })
      .select('id,client_id'),
  );

  if (entity === 'project' || entity === 'fabric' || entity === 'material') {
    const target =
      entity === 'project'
        ? maps.projects
        : entity === 'fabric'
          ? maps.fabrics
          : maps.materials;
    returned.forEach((row) =>
      target.set(asString(row.client_id), asString(row.id)),
    );
  }
}

function operationPayload(
  userId: string,
  entity: SyncEntity,
  payload: unknown,
  maps: CloudIdMaps,
) {
  switch (entity) {
    case 'profile':
      return profilePayload(userId, payload as PortfolioProfile & { id: string });
    case 'project':
      return projectPayload(userId, payload as StoredProject);
    case 'fabric':
      return fabricPayload(userId, payload as Fabric);
    case 'material':
      return materialPayload(
        userId,
        payload as LinkedMaterial,
        maps.projects,
        maps.fabrics,
      );
    case 'task':
      return taskPayload(
        userId,
        payload as StudioTask,
        maps.projects,
        maps.materials,
      );
    case 'note':
      return notePayload(userId, payload as StudioNote, maps.projects);
    case 'lookbook':
      return lookbookPayload(userId, payload as LookbookPage, maps.projects);
    case 'yardage':
      return yardagePayload(
        userId,
        payload as YardageEntry,
        maps.projects,
        maps.fabrics,
        maps.materials,
      );
    default:
      throw new Error(`Unsupported record payload: ${entity}.`);
  }
}

function profilePayload(
  userId: string,
  profile: PortfolioProfile & { id: string },
) {
  const { id: _id, ...portfolioProfile } = profile;
  return {
    portfolio_profile: portfolioProfile,
    updated_at: profile.updatedAt || now(),
    user_id: userId,
  };
}

async function upsertImageOperation(
  userId: string,
  operation: SyncOperation,
  maps: CloudIdMaps,
) {
  const payload = operation.payload as SyncImagePayload;
  const uploaded = await uploadImageAsset(userId, payload);

  if (operation.entity === 'fabric_image') {
    const fabricRows = await databaseRequest<CloudRow[]>(
      'load fabric image metadata',
      () =>
        requireSupabase()
          .from('fabrics')
          .select('metadata')
          .eq('user_id', userId)
          .eq('client_id', payload.ownerId)
          .limit(1),
    );
    await databaseRequest('save fabric image metadata', () =>
      requireSupabase()
        .from('fabrics')
        .update(
          fabricImageUpdatePayload(
            uploaded,
            asRecord(fabricRows[0]?.metadata),
          ),
        )
        .eq('user_id', userId)
        .eq('client_id', payload.ownerId),
    );
    await clearOlderTombstone(
      userId,
      'fabric_image',
      payload.image.id,
      payload.image.updatedAt,
    );
  } else {
    const projectId = payload.projectId
      ? maps.projects.get(payload.projectId)
      : undefined;

    await databaseRequest('save project image metadata', () =>
      requireSupabase()
        .from('project_images')
        .upsert(
          imagePayload(
            userId,
            projectId,
            uploaded,
            payload.slotType,
            payload.order,
          ),
          { onConflict: 'user_id,client_id' },
        ),
    );
  }

  if (payload.image.blobKey) {
    await deleteImageBlob(payload.image.blobKey).catch(() => undefined);
  }

  return { image: uploaded, payload };
}

async function uploadImageAsset(userId: string, payload: SyncImagePayload) {
  const image = payload.image;

  if (image.storagePath && !image.blobKey && !image.uploadDataUrl) {
    return {
      ...image,
      uploadError: undefined,
      uploadState: 'uploaded' as const,
    };
  }

  const blob = await imageUploadBlob(image);

  if (!blob) {
    throw new Error(`The queued image ${image.name} is missing its local upload data.`);
  }

  const mimeType = getUploadMimeType(blob.type || image.mimeType);
  const extension =
    mimeType === 'image/webp' ? 'webp' : mimeType === 'image/png' ? 'png' : 'jpg';
  const ownerPath =
    payload.ownerType === 'fabric'
      ? `fabrics/${payload.ownerId}`
      : `projects/${payload.projectId ?? payload.ownerId}`;
  const storagePath = `users/${userId}/${ownerPath}/${image.id}.${extension}`;

  await storageRequest(`upload ${image.name}`, () =>
    requireSupabase()
      .storage.from(IMAGE_BUCKET)
      .upload(storagePath, blob, { contentType: mimeType, upsert: true }),
  );

  return {
    ...image,
    blobKey: undefined,
    mimeType,
    size: blob.size,
    storagePath,
    uploadDataUrl: undefined,
    uploadError: undefined,
    uploadState: 'uploaded' as const,
    updatedAt: new Date().toISOString(),
  };
}

async function imageUploadBlob(image: LocalImageAsset) {
  if (image.blobKey) {
    const blob = await getImageBlob(image.blobKey);
    if (blob) return blob;
  }

  const source = image.uploadDataUrl ?? image.dataUrl;
  return source ? dataUrlToBlob(source) : null;
}

function fabricImageUpdatePayload(
  image: LocalImageAsset,
  currentMetadata: Record<string, unknown>,
) {
  return {
    image_filename: image.name,
    image_fit: image.objectFit ?? 'cover',
    image_height: image.height ?? null,
    image_mime_type: image.mimeType,
    image_path: image.storagePath,
    image_position_x: image.objectPositionX ?? 50,
    image_position_y: image.objectPositionY ?? 50,
    image_size_bytes: image.size,
    image_width: image.width ?? null,
    image_zoom: image.zoom ?? 1,
    metadata: {
      ...currentMetadata,
      image: {
        id: image.id,
        overlayIntensity: image.overlayIntensity,
        updatedAt: image.updatedAt,
      },
    },
    updated_at: image.updatedAt,
  };
}

async function executeDeleteOperation(userId: string, operation: SyncOperation) {
  await recordCloudTombstone(userId, operation);

  const table = TABLE_BY_ENTITY[operation.entity];
  if (operation.entity === 'fabric_image' && operation.ownerId) {
    await databaseRequest('clear deleted fabric image metadata', () =>
      requireSupabase().rpc('clear_fabric_image_if_matches', {
        p_fabric_client_id: operation.ownerId,
        p_image_client_id: operation.clientId,
        p_storage_path: operation.storagePaths?.[0] ?? null,
      }),
    );
  } else if (table) {
    await databaseRequest(`delete ${operation.entity}`, () =>
      requireSupabase()
        .from(table)
        .delete()
        .eq('user_id', userId)
        .eq('client_id', operation.clientId),
    );
  }

  if (operation.storagePaths?.length) {
    try {
      await storageRequest('delete image data', () =>
        requireSupabase().storage.from(IMAGE_BUCKET).remove(operation.storagePaths!),
      );
    } catch (error) {
      if (!isMissingStorageObject(error)) throw error;
    }
  }
}

function failedResult(
  result: SyncExecutionResult,
  operations: SyncOperation[],
  error: unknown,
) {
  const cloudError = normalizeCloudError(error);
  result.failures.push({
    error: cloudError.message,
    issue: cloudError.issue,
    operationIds: operations.map((operation) => operation.id),
  });
  return result;
}

export function mergeByNewest(
  cloud: StudioData,
  local: StudioData,
  options: {
    cloudInitialized?: boolean;
    tombstones?: CloudTombstone[];
  } = {},
): StudioData {
  const tombstones = options.tombstones ?? [];
  const cloudInitialized = options.cloudInitialized ?? true;
  const cloudProjects = new Map(cloud.projects.map((project) => [project.id, project]));
  const cloudFabrics = new Map(cloud.fabrics.map((fabric) => [fabric.id, fabric]));
  const cloudLookbooks = new Map(cloud.lookbookPages.map((page) => [page.id, page]));
  const localProjects = new Map(local.projects.map((project) => [project.id, project]));
  const localFabrics = new Map(local.fabrics.map((fabric) => [fabric.id, fabric]));
  const localLookbooks = new Map(local.lookbookPages.map((page) => [page.id, page]));
  const projects = mergeRecords(
    'project',
    cloud.projects,
    local.projects,
    tombstones,
    cloudInitialized,
  ).map((project) => ({
    ...project,
    editorialImages: cloudProjects.has(project.id)
      ? cloudProjects.get(project.id)?.editorialImages
      : localProjects.get(project.id)?.editorialImages,
    galleryImages: cloudProjects.has(project.id)
      ? cloudProjects.get(project.id)?.galleryImages
      : localProjects.get(project.id)?.galleryImages,
    heroImage: cloudProjects.has(project.id)
      ? cloudProjects.get(project.id)?.heroImage
      : localProjects.get(project.id)?.heroImage,
  }));
  const fabrics = mergeRecords(
    'fabric',
    cloud.fabrics,
    local.fabrics,
    tombstones,
    cloudInitialized,
  ).map((fabric) => ({
    ...fabric,
    image: cloudFabrics.has(fabric.id)
      ? cloudFabrics.get(fabric.id)?.image
      : localFabrics.get(fabric.id)?.image,
  }));
  const lookbookPages = mergeRecords(
    'lookbook',
    cloud.lookbookPages,
    local.lookbookPages,
    tombstones,
    cloudInitialized,
  ).map((page) => ({
    ...page,
    heroImage: cloudLookbooks.has(page.id)
      ? cloudLookbooks.get(page.id)?.heroImage
      : localLookbooks.get(page.id)?.heroImage,
  }));

  return mergeLocalImageCache({
    ...cloud,
    editorialCollections: local.editorialCollections,
    fabrics,
    linkedMaterials: mergeRecords('material', cloud.linkedMaterials, local.linkedMaterials, tombstones, cloudInitialized),
    lookbookPages,
    notes: mergeRecords('note', cloud.notes, local.notes, tombstones, cloudInitialized),
    portfolioProfile: newerProfile(cloud.portfolioProfile, local.portfolioProfile),
    projects,
    settings: local.settings,
    tasks: mergeRecords('task', cloud.tasks, local.tasks, tombstones, cloudInitialized),
    version: Math.max(cloud.version, local.version),
    yardageEntries: mergeRecords('yardage', cloud.yardageEntries, local.yardageEntries, tombstones, cloudInitialized),
  }, local);
}

function newerProfile(cloud: PortfolioProfile, local: PortfolioProfile) {
  return timestamp(cloud) >= timestamp(local) ? cloud : local;
}

function mergeLocalImageCache(data: StudioData, local: StudioData): StudioData {
  const localImages = new Map<string, LocalImageAsset>();
  local.projects.forEach((project) => {
    if (project.heroImage) localImages.set(project.heroImage.id, project.heroImage);
    project.galleryImages?.forEach((image) => localImages.set(image.id, image));
    project.editorialImages?.forEach((image) => localImages.set(image.id, image));
  });
  local.fabrics.forEach((fabric) => {
    if (fabric.image) localImages.set(fabric.image.id, fabric.image);
  });
  local.lookbookPages.forEach((page) => {
    if (page.heroImage) localImages.set(page.heroImage.id, page.heroImage);
  });

  const mergeImage = (image: LocalImageAsset | undefined) => {
    if (!image) return image;
    const cached = localImages.get(image.id);
    return cached
      ? {
          ...image,
          dataUrl: image.dataUrl ?? cached.dataUrl,
          previewBlobKey: image.previewBlobKey ?? cached.previewBlobKey,
        }
      : image;
  };

  return {
    ...data,
    fabrics: data.fabrics.map((fabric) => ({
      ...fabric,
      image: mergeImage(fabric.image),
    })),
    lookbookPages: data.lookbookPages.map((page) => ({
      ...page,
      heroImage: mergeImage(page.heroImage),
    })),
    projects: data.projects.map((project) => ({
      ...project,
      editorialImages: project.editorialImages?.map((image) => mergeImage(image)!),
      galleryImages: project.galleryImages?.map((image) => mergeImage(image)!),
      heroImage: mergeImage(project.heroImage),
    })),
  };
}

async function withSignedUrl(image: LocalImageAsset, storagePath: string) {
  const signedUrl = await refreshSignedImageUrl(storagePath);

  return {
    ...image,
    remoteUrl: signedUrl,
    signedUrlExpiresAt: new Date(Date.now() + SIGNED_URL_SECONDS * 1000).toISOString(),
  };
}

async function applyProjectImages(
  projects: StoredProject[],
  lookbooks: LookbookPage[],
  rows: CloudRow[],
  projectClientById: Map<string, string>,
) {
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const lookbookById = new Map(lookbooks.map((page) => [page.id, page]));
  const editorialByProject = new Map<string, Array<{ image: LocalImageAsset; order: number }>>();
  const galleryByProject = new Map<string, Array<{ image: LocalImageAsset; order: number }>>();

  const repairs = await Promise.all(
    rows.map(async (row) => {
      const projectId = projectClientById.get(asString(row.project_id));
      const storagePath = asString(row.storage_path);

      if (!projectId || !storagePath) {
        return imageRepair(row, storagePath ? [storagePath] : []);
      }

      let image: LocalImageAsset;
      try {
        image = await withSignedUrl(rowToImage(row), storagePath);
      } catch (error) {
        if (!isMissingStorageObject(error)) throw error;
        return imageRepair(row, [storagePath]);
      }
      const slot = asString(row.slot_type);
      const project = projectById.get(projectId);

      if (slot === 'hero' && project) {
        project.heroImage = image;
      } else if (slot.startsWith('gallery') && project) {
        const gallery = galleryByProject.get(projectId) ?? [];
        gallery.push({ image, order: asNumber(row.display_order, gallery.length) });
        galleryByProject.set(projectId, gallery);
      } else if (slot.startsWith('editorial') && project) {
        const editorial = editorialByProject.get(projectId) ?? [];
        editorial.push({ image, order: asNumber(row.display_order, editorial.length) });
        editorialByProject.set(projectId, editorial);
      } else if (slot.startsWith('lookbook:')) {
        const lookbookId = slot.split(':')[1];
        const page = lookbookById.get(lookbookId);
        if (page) page.heroImage = image;
      }
      return undefined;
    }),
  );

  galleryByProject.forEach((gallery, projectId) => {
    const project = projectById.get(projectId);
    if (project) project.galleryImages = gallery.sort((a, b) => a.order - b.order).map(({ image }) => image);
  });
  editorialByProject.forEach((editorial, projectId) => {
    const project = projectById.get(projectId);
    if (project) {
      project.editorialImages = editorial
        .sort((a, b) => a.order - b.order)
        .map(({ image }) => image)
        .slice(0, 30);
    }
  });

  return repairs.filter((repair): repair is SyncDeletion => Boolean(repair));
}

function imageRepair(row: CloudRow, storagePaths: string[]): SyncDeletion {
  return {
    clientId: asString(row.client_id),
    deletedAt: new Date().toISOString(),
    entity: 'project_image',
    storagePaths,
  };
}

function imagePayload(
  userId: string,
  projectId: string | undefined,
  image: LocalImageAsset,
  slotType: string,
  order: number,
) {
  if (!projectId) throw new Error('Image project is missing from cloud data.');
  return {
    client_id: image.id,
    display_order: order,
    filename: image.name,
    fit: image.objectFit ?? 'cover',
    height: image.height ?? null,
    metadata: {
      overlayIntensity: image.overlayIntensity ?? 'auto',
    },
    mime_type: image.mimeType,
    position_x: image.objectPositionX ?? 50,
    position_y: image.objectPositionY ?? 50,
    project_id: projectId,
    size_bytes: image.size,
    slot_type: slotType,
    storage_path: image.storagePath,
    updated_at: image.updatedAt,
    user_id: userId,
    width: image.width ?? null,
    zoom: image.zoom ?? 1,
  };
}

async function fetchUuidMap(table: string, userId: string) {
  const data = await databaseRequest<CloudRow[]>(`resolve ${table}`, () =>
    requireSupabase()
      .from(table)
      .select('id,client_id')
      .eq('user_id', userId),
  );
  return new Map(
    data.map((row) => [asString(row.client_id), asString(row.id)]),
  );
}

async function fetchCloudTombstones(userId: string) {
  const rows = await databaseRequest<CloudRow[]>('load sync tombstones', () =>
    requireSupabase()
      .from('sync_tombstones')
      .select('entity,client_id,deleted_at')
      .eq('user_id', userId),
  );
  return rows.map(rowToTombstone);
}

async function recordCloudTombstone(
  userId: string,
  operation: SyncOperation,
) {
  void userId;
  await databaseRequest(`record ${operation.entity} deletion`, () =>
    requireSupabase().rpc('record_sync_tombstone', {
      p_client_id: operation.clientId,
      p_deleted_at: operation.updatedAt,
      p_entity: operation.entity,
    }),
  );
}

async function clearOlderTombstone(
  userId: string,
  entity: SyncEntity,
  clientId: string,
  updatedAt: string,
) {
  await databaseRequest(`clear restored ${entity} deletion`, () =>
    requireSupabase()
      .from('sync_tombstones')
      .delete()
      .eq('user_id', userId)
      .eq('entity', entity)
      .eq('client_id', clientId)
      .lt('deleted_at', updatedAt),
  );
}

function projectPayload(userId: string, project: StoredProject) {
  const { editorialImages: _editorial, galleryImages: _gallery, heroImage: _hero, ...metadata } = project;
  return {
    client_id: project.id,
    collection_name: project.collection,
    color_story: project.colorStory,
    description: project.summary,
    design_intent: project.designIntent,
    difficulty: project.difficulty,
    due_date: project.targetDate ?? null,
    garment_type: project.garmentType,
    general_notes: project.generalNotes,
    key_features: project.keyFeatures,
    metadata,
    priority: project.priority,
    progress: project.progress,
    season: project.season,
    silhouette: project.silhouette,
    start_date: project.startDate,
    status: project.status,
    target_wearer: project.targetWearer,
    title: project.name,
    updated_at: project.updatedAt ?? now(),
    user_id: userId,
    workflow_phase: project.phase,
  };
}

function fabricPayload(userId: string, fabric: Fabric) {
  const { image: _image, ...metadata } = fabric;
  const image = fabric.image;
  return {
    archive_status: fabric.archiveStatus,
    best_uses: fabric.bestUses,
    bin_number: fabric.binNumber,
    care_notes: fabric.careNotes,
    client_id: fabric.id,
    color_family: fabric.colorFamily,
    cost_per_yard: fabric.costPerYard,
    drape: fabric.drape,
    fabric_type: fabric.category,
    fiber_content: fabric.composition,
    hand_feel: fabric.handFeel,
    image_filename: image?.name ?? null,
    image_fit: image?.objectFit ?? null,
    image_height: image?.height ?? null,
    image_mime_type: image?.mimeType ?? null,
    image_path: image?.storagePath ?? null,
    image_position_x: image?.objectPositionX ?? null,
    image_position_y: image?.objectPositionY ?? null,
    image_size_bytes: image?.size ?? null,
    image_width: image?.width ?? null,
    image_zoom: image?.zoom ?? null,
    lore_note: fabric.loreNote,
    metadata: {
      ...metadata,
      image: image
        ? {
            id: image.id,
            overlayIntensity: image.overlayIntensity,
            updatedAt: image.updatedAt,
          }
        : null,
    },
    mood_tags: fabric.moodTags,
    name: fabric.name,
    opacity: fabric.opacity,
    primary_color: fabric.primaryColor,
    purchase_date: fabric.purchaseDate,
    rarity: fabric.rarity,
    secondary_colors: fabric.secondaryColors,
    shelf: fabric.shelf,
    storage_location: fabric.storageLocation,
    storage_status: fabric.storageStatus,
    stretch: fabric.stretch,
    structure: fabric.structure,
    supplier: fabric.supplier,
    texture: fabric.texture,
    updated_at: fabric.updatedAt,
    user_id: userId,
    weave_or_knit: fabric.weaveOrKnit,
    weight: fabric.weight,
    width_inches: fabric.widthInches,
    yardage_total: fabric.totalYards,
  };
}

function materialPayload(userId: string, material: LinkedMaterial, projects: Map<string, string>, fabrics: Map<string, string>) {
  return {
    client_id: material.id,
    fabric_id: material.fabricId ? fabrics.get(material.fabricId) ?? null : null,
    material_name: material.materialName,
    metadata: material,
    notes: material.notes ?? null,
    project_id: requiredId(projects, material.projectId, 'material project'),
    role: material.role,
    status: material.status,
    updated_at: material.updatedAt ?? now(),
    user_id: userId,
    yardage_needed: material.neededYards,
    yardage_reserved: material.reservedYards,
    yardage_used: material.usedYards,
  };
}

function taskPayload(userId: string, task: StudioTask, projects: Map<string, string>, materials: Map<string, string>) {
  return {
    category: task.category,
    client_id: task.id,
    description: task.description,
    due_date: task.dueDate ?? null,
    material_id: task.linkedMaterialId ? materials.get(task.linkedMaterialId) ?? null : null,
    metadata: task,
    notes: task.notes ?? null,
    priority: task.priority,
    project_id: requiredId(projects, task.projectId, 'task project'),
    status: task.status,
    title: task.title,
    updated_at: task.updatedAt ?? now(),
    user_id: userId,
  };
}

function notePayload(userId: string, note: StudioNote, projects: Map<string, string>) {
  return {
    body: note.body,
    category: note.category,
    client_id: note.id,
    metadata: note,
    project_id: requiredId(projects, note.projectId, 'note project'),
    title: note.title,
    updated_at: note.updatedAt ?? note.createdAt,
    user_id: userId,
  };
}

function lookbookPayload(userId: string, page: LookbookPage, projects: Map<string, string>) {
  const { heroImage: _hero, ...data } = page;
  return {
    client_id: page.id,
    data,
    project_id: requiredId(projects, page.projectId, 'lookbook project'),
    updated_at: page.updatedAt ?? now(),
    user_id: userId,
  };
}

function yardagePayload(userId: string, entry: YardageEntry, projects: Map<string, string>, fabrics: Map<string, string>, materials: Map<string, string>) {
  return {
    client_id: entry.id,
    entry_type: entry.type,
    fabric_id: requiredId(fabrics, entry.fabricId, 'yardage fabric'),
    material_id: entry.materialId ? materials.get(entry.materialId) ?? null : null,
    metadata: entry,
    notes: entry.notes ?? null,
    occurred_at: entry.occurredAt,
    project_id: entry.projectId ? projects.get(entry.projectId) ?? null : null,
    updated_at: entry.updatedAt,
    user_id: userId,
    yardage: entry.yards,
  };
}

function rowToProject(row: CloudRow): StoredProject {
  const metadata = asRecord(row.metadata);
  return {
    ...(metadata as StoredProject),
    collection: asString(row.collection_name),
    colorStory: asString(row.color_story),
    createdAt: asString(row.created_at),
    designIntent: asString(row.design_intent),
    difficulty: asString(row.difficulty) as StoredProject['difficulty'],
    garmentType: asString(row.garment_type) as StoredProject['garmentType'],
    generalNotes: asString(row.general_notes),
    id: asString(row.client_id),
    keyFeatures: asStringArray(row.key_features),
    name: asString(row.title),
    phase: asString(row.workflow_phase) as StoredProject['phase'],
    priority: asString(row.priority) as StoredProject['priority'],
    progress: asNumber(row.progress),
    season: asString(row.season),
    silhouette: asString(row.silhouette),
    startDate: asString(row.start_date),
    status: asString(row.status) as StoredProject['status'],
    summary: asString(row.description),
    tags: asStringArray(metadata.tags),
    targetDate: nullableString(row.due_date) ?? undefined,
    targetWearer: asString(row.target_wearer),
    updatedAt: asString(row.updated_at),
  };
}

async function rowToFabric(
  row: CloudRow,
): Promise<{ fabric: Fabric; repair?: SyncDeletion }> {
  const metadata = asRecord(row.metadata);
  const fabric = { ...(metadata as Fabric), id: asString(row.client_id), updatedAt: asString(row.updated_at) };
  fabric.drape = normalizeFabricDrape(fabric.drape);
  fabric.weaveOrKnit = normalizeWovenKnit(fabric.weaveOrKnit);
  const storagePath = nullableString(row.image_path);
  const imageMeta = asRecord(metadata.image);
  if (storagePath) {
    const image: LocalImageAsset = {
      dataUrl: nullableString(imageMeta.offlinePreviewDataUrl) ?? undefined,
      height: optionalNumber(row.image_height),
      id: asString(imageMeta.id, `fabric-image-${fabric.id}`),
      mimeType: asString(row.image_mime_type, 'image/webp'),
      name: asString(row.image_filename, fabric.name),
      objectFit: asString(row.image_fit, 'cover') as 'cover' | 'contain',
      objectPositionX: asNumber(row.image_position_x, 50),
      objectPositionY: asNumber(row.image_position_y, 50),
      overlayIntensity: asString(imageMeta.overlayIntensity, 'auto') as LocalImageAsset['overlayIntensity'],
      size: asNumber(row.image_size_bytes),
      storagePath,
      updatedAt: asString(imageMeta.updatedAt, fabric.updatedAt),
      width: optionalNumber(row.image_width),
      zoom: asNumber(row.image_zoom, 1),
    };
    try {
      fabric.image = await withSignedUrl(image, storagePath);
    } catch (error) {
      if (!isMissingStorageObject(error)) throw error;
      return {
        fabric,
        repair: {
          clientId: image.id,
          deletedAt: new Date().toISOString(),
          entity: 'fabric_image',
          ownerId: fabric.id,
          storagePaths: [storagePath],
        },
      };
    }
  }
  return { fabric };
}

function rowToMaterial(row: CloudRow, projects: Map<string, string>, fabrics: Map<string, string>): LinkedMaterial {
  const metadata = asRecord(row.metadata);
  return {
    ...(metadata as LinkedMaterial),
    createdAt: asString(row.created_at),
    fabricId: nullableMappedId(row.fabric_id, fabrics),
    id: asString(row.client_id),
    materialName: asString(row.material_name),
    neededYards: asNumber(row.yardage_needed),
    notes: nullableString(row.notes) ?? undefined,
    projectId: mappedId(row.project_id, projects),
    reservedYards: asNumber(row.yardage_reserved),
    role: asString(row.role) as LinkedMaterial['role'],
    status: asString(row.status) as LinkedMaterial['status'],
    updatedAt: asString(row.updated_at),
    usedYards: asNumber(row.yardage_used),
  };
}

function rowToTask(row: CloudRow, projects: Map<string, string>, materials: Map<string, string>): StudioTask {
  return {
    ...(asRecord(row.metadata) as StudioTask),
    createdAt: asString(row.created_at),
    id: asString(row.client_id),
    linkedMaterialId: nullableMappedId(row.material_id, materials),
    projectId: mappedId(row.project_id, projects),
    updatedAt: asString(row.updated_at),
  };
}

function rowToNote(row: CloudRow, projects: Map<string, string>): StudioNote {
  return {
    ...(asRecord(row.metadata) as StudioNote),
    createdAt: asString(row.created_at),
    id: asString(row.client_id),
    projectId: mappedId(row.project_id, projects),
    updatedAt: asString(row.updated_at),
  };
}

function rowToLookbook(row: CloudRow, projects: Map<string, string>): LookbookPage {
  return {
    ...(asRecord(row.data) as LookbookPage),
    createdAt: asString(row.created_at),
    id: asString(row.client_id),
    projectId: mappedId(row.project_id, projects),
    updatedAt: asString(row.updated_at),
  };
}

function rowToYardage(row: CloudRow, projects: Map<string, string>, fabrics: Map<string, string>, materials: Map<string, string>): YardageEntry {
  return {
    ...(asRecord(row.metadata) as YardageEntry),
    createdAt: asString(row.created_at),
    fabricId: mappedId(row.fabric_id, fabrics),
    id: asString(row.client_id),
    materialId: nullableMappedId(row.material_id, materials),
    projectId: nullableMappedId(row.project_id, projects),
    updatedAt: asString(row.updated_at),
  };
}

function rowToImage(row: CloudRow): LocalImageAsset {
  const metadata = asRecord(row.metadata);
  return {
    dataUrl: nullableString(metadata.offlinePreviewDataUrl) ?? undefined,
    height: optionalNumber(row.height),
    id: asString(row.client_id),
    mimeType: asString(row.mime_type, 'image/webp'),
    name: asString(row.filename, 'Project image'),
    objectFit: asString(row.fit, 'cover') as 'cover' | 'contain',
    objectPositionX: asNumber(row.position_x, 50),
    objectPositionY: asNumber(row.position_y, 50),
    overlayIntensity: asString(metadata.overlayIntensity, 'auto') as LocalImageAsset['overlayIntensity'],
    size: asNumber(row.size_bytes),
    storagePath: asString(row.storage_path),
    updatedAt: asString(row.updated_at),
    width: optionalNumber(row.width),
    zoom: asNumber(row.zoom, 1),
  };
}

function mergeRecords<T extends { id: string; updatedAt?: string }>(
  entity: SyncEntity,
  cloud: T[],
  local: T[],
  tombstones: CloudTombstone[],
  cloudInitialized: boolean,
) {
  const merged = new Map(cloud.map((record) => [record.id, record]));
  const deletions = tombstoneMap(tombstones);
  local.forEach((record) => {
    const current = merged.get(record.id);
    const deletion = deletions.get(`${entity}:${record.id}`);
    if (deletion && Date.parse(deletion.deletedAt) >= timestamp(record)) {
      merged.delete(record.id);
      return;
    }
    if (current && timestamp(record) > timestamp(current)) {
      merged.set(record.id, record);
      return;
    }
    if (!current && (!cloudInitialized || Boolean(deletion))) {
      merged.set(record.id, record);
    }
  });
  return [...merged.values()];
}

function rowToTombstone(row: CloudRow): CloudTombstone {
  return {
    clientId: asString(row.client_id),
    deletedAt: asString(row.deleted_at),
    entity: asString(row.entity) as SyncEntity,
  };
}

function tombstoneMap(tombstones: CloudTombstone[]) {
  return new Map(
    tombstones.map((tombstone) => [
      `${tombstone.entity}:${tombstone.clientId}`,
      tombstone,
    ]),
  );
}

function activeRows(
  rows: CloudRow[],
  entity: SyncEntity,
  tombstones: CloudTombstone[],
) {
  const deletions = tombstoneMap(tombstones);
  return rows.filter((row) => {
    const deletion = deletions.get(`${entity}:${asString(row.client_id)}`);
    return !deletion || Date.parse(deletion.deletedAt) < timestamp({
      createdAt: asString(row.created_at),
      updatedAt: asString(row.updated_at),
    });
  });
}

function timestamp(record: { updatedAt?: string; createdAt?: string }) {
  return Date.parse(record.updatedAt ?? record.createdAt ?? '1970-01-01') || 0;
}

async function dataUrlToBlob(dataUrl: string) {
  const response = await fetch(dataUrl);

  if (!response.ok) {
    throw new Error('Could not prepare the optimized image for upload.');
  }

  return response.blob();
}

function getUploadMimeType(value: string): 'image/jpeg' | 'image/png' | 'image/webp' {
  if (value === 'image/webp' || value === 'image/png') {
    return value;
  }

  return 'image/jpeg';
}

type RequestErrorLike = {
  code?: string;
  message?: string;
  status?: number;
  statusCode?: number | string;
};

class CloudSyncRequestError extends Error {
  issue: CloudReadinessIssue;
  retryable: boolean;

  constructor(
    message: string,
    issue: CloudReadinessIssue,
    retryable = false,
  ) {
    super(message);
    this.name = 'CloudSyncRequestError';
    this.issue = issue;
    this.retryable = retryable;
  }
}

async function databaseRequest<T>(
  label: string,
  factory: () => PromiseLike<{ data: T | null; error: RequestErrorLike | null }>,
) {
  return requestWithRetry(async () => {
    const result = await factory();

    if (result.error) {
      throw requestError(result.error, label);
    }

    return result.data ?? ([] as T);
  }, DATABASE_TIMEOUT_MS, `Database request timed out while trying to ${label}.`);
}

async function storageRequest<T>(
  label: string,
  factory: () => PromiseLike<{ data: T | null; error: RequestErrorLike | null }>,
) {
  return requestWithRetry(async () => {
    const result = await factory();

    if (result.error) {
      throw requestError(result.error, label);
    }

    return result.data as T;
  }, IMAGE_TIMEOUT_MS, `Image request timed out while trying to ${label}.`);
}

async function requestWithRetry<T>(
  factory: () => Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await withTimeout(factory(), timeoutMs, timeoutMessage);
    } catch (error) {
      const cloudError = normalizeCloudError(error);
      lastError = cloudError;

      if (!cloudError.retryable || attempt === RETRY_DELAYS_MS.length) {
        throw cloudError;
      }

      await delay(RETRY_DELAYS_MS[attempt]);
    }
  }

  throw normalizeCloudError(lastError);
}

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(
      () => reject(new CloudSyncRequestError(message, 'timeout', true)),
      timeoutMs,
    );

    Promise.resolve(promise).then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function requestError(error: RequestErrorLike, label: string) {
  const status = Number(error.status ?? error.statusCode ?? 0);
  const rawMessage = error.message ?? `Could not ${label}.`;
  const message = `Could not ${label}: ${rawMessage}`;

  if (error.code === 'PGRST205' || rawMessage.includes('schema cache')) {
    return new CloudSyncRequestError(
      'Cloud sync is not installed in Supabase yet. Apply both Mystic Lore Studio SQL migrations, then retry.',
      'schema-missing',
    );
  }

  if (rawMessage.toLowerCase().includes('bucket not found')) {
    return new CloudSyncRequestError(
      'The private project-images bucket is missing. Apply the cloud sync Storage migration, then retry.',
      'bucket-missing',
    );
  }

  if (
    status === 404 ||
    rawMessage.toLowerCase().includes('object not found') ||
    rawMessage.toLowerCase().includes('not found') && label.includes('image access')
  ) {
    return new CloudSyncRequestError(
      `Could not ${label}: the stored image object no longer exists.`,
      'object-missing',
    );
  }

  if (status === 401) {
    return new CloudSyncRequestError(
      'Your Supabase session expired. Sign in again before syncing.',
      'authentication',
    );
  }

  if (status === 403 || rawMessage.toLowerCase().includes('row-level security')) {
    return new CloudSyncRequestError(
      `Supabase denied access while trying to ${label}. Check the Mystic Lore Studio RLS policies.`,
      'permissions',
    );
  }

  return new CloudSyncRequestError(
    message,
    status === 0 || status === 408 || status === 429 || status >= 500
      ? 'network'
      : 'unknown',
    status === 0 || status === 408 || status === 429 || status >= 500,
  );
}

function normalizeCloudError(error: unknown) {
  if (error instanceof CloudSyncRequestError) {
    return error;
  }

  const record =
    error && typeof error === 'object' ? (error as RequestErrorLike) : {};
  const message =
    error instanceof Error
      ? error.message
      : record.message ?? 'Cloud sync failed unexpectedly.';
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('schema cache') || lowerMessage.includes("table 'public.")) {
    return new CloudSyncRequestError(
      'Cloud sync is not installed in Supabase yet. Apply both Mystic Lore Studio SQL migrations, then retry.',
      'schema-missing',
    );
  }

  if (lowerMessage.includes('bucket not found')) {
    return new CloudSyncRequestError(
      'The private project-images bucket is missing. Apply the cloud sync Storage migration, then retry.',
      'bucket-missing',
    );
  }


  if (lowerMessage.includes('object not found')) {
    return new CloudSyncRequestError(message, 'object-missing');
  }

  if (lowerMessage.includes('timed out')) {
    return new CloudSyncRequestError(message, 'timeout', true);
  }

  if (
    lowerMessage.includes('failed to fetch') ||
    lowerMessage.includes('network') ||
    lowerMessage.includes('load failed')
  ) {
    return new CloudSyncRequestError(
      'Supabase could not be reached. Your changes remain queued locally and will retry when the connection returns.',
      'network',
      true,
    );
  }

  return new CloudSyncRequestError(message, 'unknown');
}

function isMissingStorageObject(error: unknown) {
  return normalizeCloudError(error).issue === 'object-missing';
}

function delay(milliseconds: number | undefined) {
  return new Promise<void>((resolve) =>
    window.setTimeout(resolve, milliseconds ?? 0),
  );
}

function chunks<T>(values: T[], size: number) {
  const result: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }

  return result;
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  worker: (value: T) => Promise<R>,
) {
  const results = new Array<R>(values.length);
  let nextIndex = 0;

  const runners = Array.from(
    { length: Math.min(concurrency, values.length) },
    async () => {
      while (nextIndex < values.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await worker(values[index]);
      }
    },
  );

  await Promise.all(runners);
  return results;
}

function idMap(rows: CloudRow[]) {
  return new Map(rows.map((row) => [asString(row.id), asString(row.client_id)]));
}

function requiredId(map: Map<string, string>, clientId: string, label: string) {
  const id = map.get(clientId);
  if (!id) throw new Error(`Could not resolve ${label} ${clientId}.`);
  return id;
}

function mappedId(value: unknown, map: Map<string, string>) {
  return map.get(asString(value)) ?? '';
}

function nullableMappedId(value: unknown, map: Map<string, string>) {
  const id = nullableString(value);
  return id ? map.get(id) : undefined;
}

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured. Using local cache only.');
  return supabase;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function nullableString(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function asNumber(value: unknown, fallback = 0) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function optionalNumber(value: unknown) {
  const number = asNumber(value, Number.NaN);
  return Number.isFinite(number) ? number : undefined;
}

function now() {
  return new Date().toISOString();
}
