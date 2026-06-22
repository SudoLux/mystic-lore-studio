import { supabase } from './supabase';
import { createSeedStudioData, type StoredProject, type StudioData } from './studioStorage';
import type {
  Fabric,
  LinkedMaterial,
  LocalImageAsset,
  LookbookPage,
  StudioNote,
  StudioTask,
  YardageEntry,
} from '../types/studio';
import type { SyncDeletion } from './studioSyncStorage';

const IMAGE_BUCKET = 'project-images';
const SIGNED_URL_SECONDS = 60 * 60;

type CloudRow = Record<string, unknown>;
type CloudSnapshot = {
  data: StudioData;
  hasCloudData: boolean;
};

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
  ] as const;
  const results = await Promise.all(
    tableNames.map((table) =>
      client.from(table).select('*').eq('user_id', userId),
    ),
  );

  results.forEach((result, index) => {
    if (result.error) {
      throw new Error(`Could not load ${tableNames[index]}: ${result.error.message}`);
    }
  });

  const [projectRows, fabricRows, materialRows, taskRows, noteRows, lookbookRows, yardageRows, imageRows] =
    results.map((result) => (result.data ?? []) as CloudRow[]);
  const projectClientById = idMap(projectRows);
  const fabricClientById = idMap(fabricRows);
  const materialClientById = idMap(materialRows);
  const projects = projectRows.map(rowToProject);
  const fabrics = await Promise.all(fabricRows.map(rowToFabric));
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

  await applyProjectImages(
    projects,
    lookbookPages,
    imageRows,
    projectClientById,
  );

  const seed = createSeedStudioData();
  const data: StudioData = {
    fabrics,
    linkedMaterials,
    lookbookPages,
    notes,
    projects,
    settings: seed.settings,
    tasks,
    version: seed.version,
    yardageEntries,
  };

  return {
    data,
    hasCloudData: tableNames.some((_, index) => (results[index].data?.length ?? 0) > 0),
  };
}

export async function refreshSignedImageUrl(storagePath: string) {
  const { data, error } = await requireSupabase()
    .storage.from(IMAGE_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_SECONDS);

  if (error) {
    throw new Error(`Could not refresh image access: ${error.message}`);
  }

  return data.signedUrl;
}

export async function pushStudioSnapshot(
  userId: string,
  snapshot: StudioData,
  deletions: SyncDeletion[] = [],
) {
  const client = requireSupabase();
  const prepared = await uploadSnapshotImages(userId, snapshot);
  const projects = prepared.projects.map((project) => projectPayload(userId, project));
  const fabrics = prepared.fabrics.map((fabric) => fabricPayload(userId, fabric));

  await upsertRows('projects', projects);
  await upsertRows('fabrics', fabrics);

  const projectIds = await fetchUuidMap('projects', userId);
  const fabricIds = await fetchUuidMap('fabrics', userId);
  const materials = prepared.linkedMaterials.map((material) =>
    materialPayload(userId, material, projectIds, fabricIds),
  );

  await upsertRows('materials', materials);
  const materialIds = await fetchUuidMap('materials', userId);

  await Promise.all([
    upsertRows(
      'tasks',
      prepared.tasks.map((task) => taskPayload(userId, task, projectIds, materialIds)),
    ),
    upsertRows(
      'notes',
      prepared.notes.map((note) => notePayload(userId, note, projectIds)),
    ),
    upsertRows(
      'lookbook_pages',
      prepared.lookbookPages.map((page) => lookbookPayload(userId, page, projectIds)),
    ),
    upsertRows(
      'yardage_entries',
      prepared.yardageEntries.map((entry) =>
        yardagePayload(userId, entry, projectIds, fabricIds, materialIds),
      ),
    ),
    upsertRows('project_images', projectImagePayloads(userId, prepared, projectIds)),
  ]);

  await applyDeletions(userId, deletions);

  const { error: profileError } = await client.from('profiles').upsert(
    {
      cloud_migration_completed_at: new Date().toISOString(),
      user_id: userId,
    },
    { onConflict: 'user_id' },
  );

  if (profileError) {
    throw new Error(`Could not record cloud migration: ${profileError.message}`);
  }

  return prepared;
}

export function mergeByNewest(cloud: StudioData, local: StudioData): StudioData {
  return {
    ...cloud,
    fabrics: mergeRecords(cloud.fabrics, local.fabrics),
    linkedMaterials: mergeRecords(cloud.linkedMaterials, local.linkedMaterials),
    lookbookPages: mergeRecords(cloud.lookbookPages, local.lookbookPages),
    notes: mergeRecords(cloud.notes, local.notes),
    projects: mergeRecords(cloud.projects, local.projects),
    settings: local.settings,
    tasks: mergeRecords(cloud.tasks, local.tasks),
    version: Math.max(cloud.version, local.version),
    yardageEntries: mergeRecords(cloud.yardageEntries, local.yardageEntries),
  };
}

async function uploadSnapshotImages(userId: string, data: StudioData): Promise<StudioData> {
  const projects = await Promise.all(
    data.projects.map(async (project) => ({
      ...project,
      galleryImages: await Promise.all(
        (project.galleryImages ?? []).map((image) =>
          uploadImage(userId, `projects/${project.id}`, image),
        ),
      ),
      heroImage: project.heroImage
        ? await uploadImage(userId, `projects/${project.id}`, project.heroImage)
        : undefined,
    })),
  );
  const fabrics = await Promise.all(
    data.fabrics.map(async (fabric) => ({
      ...fabric,
      image: fabric.image
        ? await uploadImage(userId, `fabrics/${fabric.id}`, fabric.image)
        : undefined,
    })),
  );
  const lookbookPages = await Promise.all(
    data.lookbookPages.map(async (page) => ({
      ...page,
      heroImage: page.heroImage
        ? await uploadImage(userId, `projects/${page.projectId}`, page.heroImage)
        : undefined,
    })),
  );

  return { ...data, fabrics, lookbookPages, projects };
}

async function uploadImage(userId: string, parentPath: string, image: LocalImageAsset) {
  if (image.storagePath && !image.uploadDataUrl && image.uploadState !== 'pending') {
    return image.remoteUrl ? image : withSignedUrl(image, image.storagePath);
  }

  const source = image.uploadDataUrl ?? image.dataUrl;

  if (!source) {
    return image;
  }

  const storagePath = `users/${userId}/${parentPath}/${image.id}.webp`;
  const blob = await dataUrlToWebpBlob(source);
  const { error } = await requireSupabase()
    .storage.from(IMAGE_BUCKET)
    .upload(storagePath, blob, { contentType: 'image/webp', upsert: true });

  if (error) {
    throw new Error(`Could not upload ${image.name}: ${error.message}`);
  }

  return withSignedUrl(
    {
      ...image,
      mimeType: 'image/webp',
      size: blob.size,
      storagePath,
      uploadDataUrl: undefined,
      uploadState: 'uploaded' as const,
      updatedAt: new Date().toISOString(),
    },
    storagePath,
  );
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
  const galleryByProject = new Map<string, Array<{ image: LocalImageAsset; order: number }>>();

  await Promise.all(
    rows.map(async (row) => {
      const projectId = projectClientById.get(asString(row.project_id));
      const storagePath = asString(row.storage_path);

      if (!projectId || !storagePath) return;

      const image = await withSignedUrl(rowToImage(row), storagePath);
      const slot = asString(row.slot_type);
      const project = projectById.get(projectId);

      if (slot === 'hero' && project) {
        project.heroImage = image;
      } else if (slot.startsWith('gallery') && project) {
        const gallery = galleryByProject.get(projectId) ?? [];
        gallery.push({ image, order: asNumber(row.display_order, gallery.length) });
        galleryByProject.set(projectId, gallery);
      } else if (slot.startsWith('lookbook:')) {
        const lookbookId = slot.split(':')[1];
        const page = lookbookById.get(lookbookId);
        if (page) page.heroImage = image;
      }
    }),
  );

  galleryByProject.forEach((gallery, projectId) => {
    const project = projectById.get(projectId);
    if (project) project.galleryImages = gallery.sort((a, b) => a.order - b.order).map(({ image }) => image);
  });
}

function projectImagePayloads(
  userId: string,
  data: StudioData,
  projectIds: Map<string, string>,
) {
  const rows: Record<string, unknown>[] = [];

  data.projects.forEach((project) => {
    if (project.heroImage?.storagePath) {
      rows.push(imagePayload(userId, projectIds.get(project.id), project.heroImage, 'hero', 0));
    }
    project.galleryImages?.forEach((image, index) => {
      if (image.storagePath) {
        rows.push(imagePayload(userId, projectIds.get(project.id), image, `gallery:${index}`, index));
      }
    });
  });
  data.lookbookPages.forEach((page) => {
    if (page.heroImage?.storagePath) {
      rows.push(
        imagePayload(
          userId,
          projectIds.get(page.projectId),
          page.heroImage,
          `lookbook:${page.id}:hero`,
          0,
        ),
      );
    }
  });

  return rows;
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
      offlinePreviewDataUrl: image.dataUrl,
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

async function applyDeletions(userId: string, deletions: SyncDeletion[]) {
  const client = requireSupabase();
  const tableByEntity: Partial<Record<SyncDeletion['entity'], string>> = {
    fabric: 'fabrics',
    lookbook: 'lookbook_pages',
    material: 'materials',
    note: 'notes',
    project: 'projects',
    project_image: 'project_images',
    task: 'tasks',
    yardage: 'yardage_entries',
  };

  for (const deletion of deletions) {
    if (deletion.storagePaths?.length) {
      const { error } = await client.storage.from(IMAGE_BUCKET).remove(deletion.storagePaths);
      if (error) throw new Error(`Could not remove image: ${error.message}`);
    }

    const table = tableByEntity[deletion.entity];
    if (!table) continue;
    const { error } = await client
      .from(table)
      .delete()
      .eq('user_id', userId)
      .eq('client_id', deletion.clientId);
    if (error) throw new Error(`Could not delete ${deletion.entity}: ${error.message}`);
  }
}

async function upsertRows(table: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const { error } = await requireSupabase()
    .from(table)
    .upsert(rows, { onConflict: 'user_id,client_id' });
  if (error) throw new Error(`Could not sync ${table}: ${error.message}`);
}

async function fetchUuidMap(table: string, userId: string) {
  const { data, error } = await requireSupabase()
    .from(table)
    .select('id,client_id')
    .eq('user_id', userId);
  if (error) throw new Error(`Could not resolve ${table}: ${error.message}`);
  return new Map(
    ((data ?? []) as CloudRow[]).map((row) => [asString(row.client_id), asString(row.id)]),
  );
}

function projectPayload(userId: string, project: StoredProject) {
  const { galleryImages: _gallery, heroImage: _hero, ...metadata } = project;
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
            offlinePreviewDataUrl: image.dataUrl,
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

async function rowToFabric(row: CloudRow): Promise<Fabric> {
  const metadata = asRecord(row.metadata);
  const fabric = { ...(metadata as Fabric), id: asString(row.client_id), updatedAt: asString(row.updated_at) };
  const storagePath = nullableString(row.image_path);
  const imageMeta = asRecord(metadata.image);
  if (storagePath) {
    fabric.image = await withSignedUrl(
      {
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
      },
      storagePath,
    );
  }
  return fabric;
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

function mergeRecords<T extends { id: string; updatedAt?: string }>(cloud: T[], local: T[]) {
  const merged = new Map(cloud.map((record) => [record.id, record]));
  local.forEach((record) => {
    const current = merged.get(record.id);
    if (!current || timestamp(record) > timestamp(current)) merged.set(record.id, record);
  });
  return [...merged.values()];
}

function timestamp(record: { updatedAt?: string; createdAt?: string }) {
  return Date.parse(record.updatedAt ?? record.createdAt ?? '1970-01-01') || 0;
}

async function dataUrlToWebpBlob(dataUrl: string) {
  if (dataUrl.startsWith('data:image/webp')) return fetch(dataUrl).then((response) => response.blob());
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('Could not convert a legacy image.'));
    element.src = dataUrl;
  });
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not prepare a legacy image.');
  context.drawImage(image, 0, 0);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode a legacy image.'))),
      'image/webp',
      0.82,
    ),
  );
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
