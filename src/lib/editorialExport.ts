import { projectEditorialImages, projectLinkedEditorialFabrics } from './editorialAssets';
import { getFabricColorHex } from './fabricMetadata';
import { resolveEditorialTheme } from './editorialThemes';
import { normalizeEditorialViewerMode } from './editorialViewerMode';
import type {
  EditorialBlock,
  EditorialBlockType,
  EditorialCollection,
  EditorialJsonObject,
  EditorialJsonValue,
  EditorialScene,
  EditorialTheme,
} from '../types/editorial';
import type { ApparelProject, Fabric, LocalImageAsset } from '../types/studio';

export type EditorialExportFormat = 'images' | 'package' | 'pdf' | 'presentation';
export type EditorialExportStatus = 'idle' | 'preparing' | 'running' | 'success' | 'error';
export type EditorialExportWarningSeverity = 'error' | 'info' | 'warning';
export type EditorialExportWarningCode =
  | 'empty-scene'
  | 'missing-cover-image'
  | 'missing-fabric-asset'
  | 'missing-image-asset'
  | 'unsupported-block-type';

export type EditorialExportOptionDefinition = Readonly<{
  description: string;
  format: EditorialExportFormat;
  label: string;
  requiresAdapter: boolean;
}>;

export type EditorialExportAssetUsage = Readonly<{
  blockId?: string;
  location: 'block' | 'cover' | 'fabric' | 'gallery' | 'scene-background' | 'scene-fabric';
  sceneId?: string;
}>;

export type EditorialExportImageSource = Readonly<{
  blobKey?: string;
  dataUrl?: string;
  externalUrl?: string;
  kind: 'external-url' | 'local-asset' | 'missing';
  previewBlobKey?: string;
  remoteUrl?: string;
  storagePath?: string;
}>;

export type EditorialExportImageAssetSnapshot = Readonly<{
  altText?: string;
  assetId: string;
  available: boolean;
  caption?: string;
  filename?: string;
  height?: number;
  mimeType?: string;
  sizeBytes?: number;
  source: EditorialExportImageSource;
  usages: readonly EditorialExportAssetUsage[];
  width?: number;
}>;

export type EditorialExportFabricAssetSnapshot = Readonly<{
  available: boolean;
  category?: string;
  composition?: string;
  color: Readonly<{
    family?: string;
    hex?: string;
    name?: string;
  }>;
  fabricId: string;
  imageAssetId?: string;
  name: string;
  notes?: string;
  quantity: Readonly<{
    availableYards?: number;
    reservedYards?: number;
    totalYards?: number;
    usedYards?: number;
  }>;
  usages: readonly EditorialExportAssetUsage[];
}>;

export type EditorialExportBlockSnapshot = Readonly<{
  blockId: string;
  blockType: EditorialBlockType;
  caption?: string;
  content: EditorialJsonValue;
  fabricReferences: readonly string[];
  imageReferences: readonly string[];
  index: number;
  label?: string;
  layout: Readonly<{
    alignment?: string;
    columns?: number;
    fit?: string;
    settings: EditorialJsonObject;
  }>;
  notes?: string;
  order: number;
  text?: string;
  warningIds: readonly string[];
}>;

export type EditorialExportSceneSnapshot = Readonly<{
  background: EditorialScene['background'];
  blocks: readonly EditorialExportBlockSnapshot[];
  description?: string;
  fabricFallbacks: readonly NonNullable<EditorialScene['fabricFallbacks']>[number][];
  fabricReferences: readonly string[];
  imageReferences: readonly string[];
  index: number;
  narrativeRole: EditorialScene['narrativeRole'];
  order: number;
  sceneId: string;
  sceneType: EditorialScene['sceneType'];
  subtitle?: string;
  title: string;
  transition: EditorialScene['transition'];
  warningIds: readonly string[];
}>;

export type EditorialExportWarning = Readonly<{
  assetReference?: string;
  blockId?: string;
  code: EditorialExportWarningCode;
  id: string;
  message: string;
  sceneId?: string;
  severity: EditorialExportWarningSeverity;
}>;

export type EditorialExportThemeSnapshot = Readonly<{
  backgroundTreatment: EditorialTheme['backgroundTreatment'];
  cardTreatment: EditorialTheme['cardTreatment'];
  colors: EditorialTheme['colors'];
  id: string;
  name: string;
  sceneSpacing: EditorialTheme['sceneSpacing'];
  transitionStyle: EditorialTheme['transitionStyle'];
  typography: EditorialTheme['typography'];
}>;

export type EditorialExportSnapshot = Readonly<{
  collection: Readonly<{
    authorName?: string;
    brandName: string;
    cover: Readonly<{
      accentColor?: string;
      fit: 'contain' | 'cover';
      imageReference?: string;
      label?: string;
    }>;
    createdAt?: string;
    description?: string;
    id: string;
    projectId: string;
    subtitle?: string;
    templateType: EditorialCollection['templateType'];
    title: string;
    updatedAt?: string;
    viewerMode: ReturnType<typeof normalizeEditorialViewerMode>;
  }>;
  exportedAt: string;
  fabricAssets: readonly EditorialExportFabricAssetSnapshot[];
  imageAssets: readonly EditorialExportImageAssetSnapshot[];
  project?: Readonly<{
    collection?: string;
    colorStory?: string;
    designIntent?: string;
    difficulty: ApparelProject['difficulty'];
    garmentType: ApparelProject['garmentType'];
    generalNotes?: string;
    id: string;
    imageReferences: readonly string[];
    linkedMaterials: readonly Readonly<{
      fabricId?: string;
      id: string;
      materialName: string;
      neededYards: number;
      notes?: string;
      reservedYards: number;
      role: ApparelProject['linkedMaterials'][number]['role'];
      status: ApparelProject['linkedMaterials'][number]['status'];
      usedYards: number;
    }>[];
    name: string;
    phase: ApparelProject['phase'];
    progress: number;
    season?: string;
    summary?: string;
    targetDate?: string;
    tasks: readonly Readonly<{
      category: ApparelProject['tasks'][number]['category'];
      id: string;
      status: ApparelProject['tasks'][number]['status'];
      title: string;
    }>[];
  }>;
  scenes: readonly EditorialExportSceneSnapshot[];
  theme: EditorialExportThemeSnapshot;
  version: 1;
  warnings: readonly EditorialExportWarning[];
}>;

export type PrepareEditorialExportSnapshotInput = Readonly<{
  authorName?: string;
  brandName?: string;
  collection: EditorialCollection;
  exportedAt?: string;
  fabrics?: readonly Fabric[];
  images?: readonly LocalImageAsset[];
  project?: ApparelProject;
  theme?: EditorialTheme;
}>;

/** Backward-compatible name consumed by exporter adapters. */
export type EditorialExportPreparation = EditorialExportSnapshot;

export type EditorialExportResult = Readonly<{
  filename?: string;
  format: EditorialExportFormat;
  message?: string;
}>;

export type EditorialExportAdapterContext = Readonly<{
  imageOptions?: Readonly<{
    format: 'png';
    includeIndex: boolean;
    scale: 1 | 2 | 3;
  }>;
  onProgress?: (message: string) => void;
}>;

export type EditorialExportAdapter = Readonly<{
  format: Exclude<EditorialExportFormat, 'presentation'>;
  run: (
    snapshot: EditorialExportSnapshot,
    context?: EditorialExportAdapterContext,
  ) => Promise<EditorialExportResult>;
}>;

export type EditorialExportAdapters = Partial<
  Record<EditorialExportAdapter['format'], EditorialExportAdapter>
>;

export const editorialExportOptions: readonly EditorialExportOptionDefinition[] = [
  { description: 'Prepare a paginated, print-ready version of the collection.', format: 'pdf', label: 'Export PDF', requiresAdapter: true },
  { description: 'Render presentation scenes as a sequence of image files.', format: 'images', label: 'Export Images', requiresAdapter: true },
  { description: 'Open the collection in its cinematic full-screen viewer.', format: 'presentation', label: 'Presentation Mode', requiresAdapter: false },
  { description: 'Bundle collection data and linked media for future sharing.', format: 'package', label: 'Shareable Package', requiresAdapter: true },
];

const supportedExportBlockTypes = new Set<EditorialBlockType>([
  'callout', 'credits', 'divider', 'fabricSwatch', 'gallery', 'heading', 'image',
  'materials', 'measurementTable', 'paragraph', 'quote', 'spacer', 'specifications', 'text',
]);

type ImageReference = {
  altText?: string;
  assetId: string;
  caption?: string;
  externalUrl?: string;
  usage: EditorialExportAssetUsage;
};

type FabricReference = {
  fabricId: string;
  usage: EditorialExportAssetUsage;
};

/**
 * Produces the stable, read-only source model for every future editorial exporter.
 * Inputs are never mutated. Supply exportedAt in tests for byte-for-byte deterministic output.
 */
export function prepareEditorialExportSnapshot({
  authorName,
  brandName = 'Mystic Lore Studio',
  collection,
  exportedAt = new Date().toISOString(),
  fabrics = [],
  images,
  project,
  theme,
}: PrepareEditorialExportSnapshotInput): EditorialExportSnapshot {
  const availableImages = [...(images ?? projectEditorialImages(project))];
  const availableFabrics = [...fabrics];
  const resolvedTheme = theme ?? resolveEditorialTheme(collection.themeId);
  const warnings = new Map<string, EditorialExportWarning>();
  const imageReferences = new Map<string, ImageReference[]>();
  const fabricReferences = new Map<string, FabricReference[]>();
  const fabricFallbacks = new Map(
    collection.scenes.flatMap((scene) => scene.fabricFallbacks ?? []).map((fallback) => [fallback.fabricId, fallback]),
  );
  const linkedFabrics = projectLinkedEditorialFabrics(project, availableFabrics);
  const orderedScenes = [...collection.scenes].sort(compareOrderedRecords);

  const addWarning = (warning: Omit<EditorialExportWarning, 'id'>) => {
    const id = warningId(warning);
    if (!warnings.has(id)) warnings.set(id, { ...warning, id });
    return id;
  };
  const addImageReference = (reference: ImageReference) => {
    const current = imageReferences.get(reference.assetId) ?? [];
    if (!current.some((item) => usageKey(item.usage) === usageKey(reference.usage))) current.push(reference);
    imageReferences.set(reference.assetId, current);
  };
  const addFabricReference = (reference: FabricReference) => {
    const current = fabricReferences.get(reference.fabricId) ?? [];
    if (!current.some((item) => usageKey(item.usage) === usageKey(reference.usage))) current.push(reference);
    fabricReferences.set(reference.fabricId, current);
  };

  const coverReference = collection.coverImageId
    ? collection.coverImageId
    : collection.coverImageUrl
      ? externalAssetId(collection.coverImageUrl)
      : availableImages[0]?.id;
  if (coverReference) {
    addImageReference({
      assetId: coverReference,
      externalUrl: collection.coverImageUrl,
      usage: { location: 'cover' },
    });
    if (collection.coverImageId && !availableImages.some((image) => image.id === collection.coverImageId)) {
      addWarning({ assetReference: collection.coverImageId, code: 'missing-cover-image', message: `Cover image ${collection.coverImageId} is unavailable.`, severity: 'warning' });
    }
  }

  const scenes = orderedScenes.map((scene, sceneIndex): EditorialExportSceneSnapshot => {
    const sceneWarningIds: string[] = [];
    const sceneImageReferences = new Set<string>();
    const sceneFabricReferences = new Set<string>();
    const orderedBlocks = [...scene.blocks].sort(compareOrderedRecords);

    if (orderedBlocks.length === 0) {
      sceneWarningIds.push(addWarning({ code: 'empty-scene', message: `Scene “${scene.title}” has no content blocks.`, sceneId: scene.id, severity: 'info' }));
    }

    const backgroundReference = scene.background.imageId
      ? scene.background.imageId
      : scene.background.imageUrl
        ? externalAssetId(scene.background.imageUrl)
        : undefined;
    if (backgroundReference) {
      sceneImageReferences.add(backgroundReference);
      addImageReference({ assetId: backgroundReference, externalUrl: scene.background.imageUrl, usage: { location: 'scene-background', sceneId: scene.id } });
      if (scene.background.imageId && !availableImages.some((image) => image.id === scene.background.imageId)) {
        sceneWarningIds.push(addWarning({ assetReference: scene.background.imageId, code: 'missing-image-asset', message: `Scene background image ${scene.background.imageId} is unavailable.`, sceneId: scene.id, severity: 'warning' }));
      }
    }

    const selectedFabricIds = scene.fabricIds?.length
      ? scene.fabricIds
      : ['fabric-story', 'materials'].includes(scene.sceneType)
        ? linkedFabrics.slice(0, 4).map(({ fabric }) => fabric.id)
        : [];
    selectedFabricIds.forEach((fabricId) => {
      sceneFabricReferences.add(fabricId);
      addFabricReference({ fabricId, usage: { location: 'scene-fabric', sceneId: scene.id } });
      if (!availableFabrics.some((fabric) => fabric.id === fabricId)) {
        sceneWarningIds.push(addWarning({ assetReference: fabricId, code: 'missing-fabric-asset', message: `Fabric ${fabricId} referenced by “${scene.title}” is unavailable.`, sceneId: scene.id, severity: 'warning' }));
      }
    });

    if (['detail', 'gallery', 'look'].includes(scene.sceneType)) {
      availableImages.forEach((image) => {
        sceneImageReferences.add(image.id);
        addImageReference({ assetId: image.id, usage: { location: 'gallery', sceneId: scene.id } });
      });
    }

    const blocks = orderedBlocks.map((block, blockIndex) => {
      const snapshot = snapshotBlock(block, blockIndex, scene, availableImages, availableFabrics, addWarning, addImageReference, addFabricReference);
      snapshot.imageReferences.forEach((reference) => sceneImageReferences.add(reference));
      snapshot.fabricReferences.forEach((reference) => sceneFabricReferences.add(reference));
      sceneWarningIds.push(...snapshot.warningIds);
      return snapshot;
    });

    return {
      background: cloneJson(scene.background),
      blocks,
      description: cleanOptional(scene.description),
      fabricFallbacks: (scene.fabricFallbacks ?? []).map((fallback) => ({ ...fallback })),
      fabricReferences: [...sceneFabricReferences].sort(compareStrings),
      imageReferences: [...sceneImageReferences].sort(compareStrings),
      index: sceneIndex,
      narrativeRole: scene.narrativeRole,
      order: scene.order,
      sceneId: scene.id,
      sceneType: scene.sceneType,
      subtitle: cleanOptional(scene.subtitle),
      title: scene.title,
      transition: cloneJson(scene.transition),
      warningIds: uniqueSorted(sceneWarningIds),
    };
  });

  const fabricAssets = [...fabricReferences.entries()]
    .sort(([left], [right]) => compareStrings(left, right))
    .map(([fabricId, references]): EditorialExportFabricAssetSnapshot => {
      const fabric = availableFabrics.find((item) => item.id === fabricId);
      const fallback = fabricFallbacks.get(fabricId);
      if (fabric?.image) addImageReference({ assetId: fabric.image.id, usage: { location: 'fabric' } });
      return {
        available: Boolean(fabric),
        category: fabric?.category,
        composition: cleanOptional(fabric?.composition || fallback?.composition),
        color: {
          family: fabric?.colorFamily,
          hex: fabric ? getFabricColorHex(fabric) : fallback?.colorHex,
          name: fabric?.primaryColor || fabric?.colorFamily,
        },
        fabricId,
        imageAssetId: fabric?.image?.id,
        name: fabric?.name ?? fallback?.name ?? 'Unavailable fabric',
        notes: cleanOptional(fabric?.loreNote || fabric?.notes || fallback?.notes),
        quantity: {
          availableYards: fabric ? fabric.totalYards - fabric.reservedYards - fabric.usedYards : undefined,
          reservedYards: fabric?.reservedYards,
          totalYards: fabric?.totalYards,
          usedYards: fabric?.usedYards,
        },
        usages: references.map(({ usage }) => usage).sort(compareUsages),
      };
    });

  const allImages = [...availableImages, ...availableFabrics.flatMap((fabric) => fabric.image ? [fabric.image] : [])];
  const imageAssets = [...imageReferences.entries()]
    .sort(([left], [right]) => compareStrings(left, right))
    .map(([assetId, references]): EditorialExportImageAssetSnapshot => {
      const asset = allImages.find((item) => item.id === assetId);
      const externalUrl = references.find((reference) => reference.externalUrl)?.externalUrl;
      const usages = references.map(({ usage }) => usage).sort(compareUsages);
      const altText = references.map((reference) => reference.altText).find(Boolean);
      const caption = references.map((reference) => reference.caption).find(Boolean);
      return {
        altText,
        assetId,
        available: Boolean(asset || externalUrl),
        caption,
        filename: asset?.name,
        height: asset?.height,
        mimeType: asset?.mimeType,
        sizeBytes: asset?.size,
        source: asset
          ? { blobKey: asset.blobKey, dataUrl: asset.dataUrl, kind: 'local-asset', previewBlobKey: asset.previewBlobKey, remoteUrl: asset.remoteUrl, storagePath: asset.storagePath }
          : externalUrl
            ? { externalUrl, kind: 'external-url' }
            : { kind: 'missing' },
        usages,
        width: asset?.width,
      };
    });

  const snapshot: EditorialExportSnapshot = {
    collection: {
      authorName: cleanOptional(authorName),
      brandName,
      cover: {
        accentColor: cleanOptional(collection.coverAccentColor),
        fit: collection.coverImageFit === 'contain' ? 'contain' : 'cover',
        imageReference: coverReference,
        label: cleanOptional(collection.coverLabel),
      },
      createdAt: cleanOptional(collection.createdAt),
      description: cleanOptional(collection.description),
      id: collection.id,
      projectId: collection.projectId,
      subtitle: cleanOptional(collection.subtitle),
      templateType: collection.templateType,
      title: collection.title,
      updatedAt: cleanOptional(collection.updatedAt),
      viewerMode: normalizeEditorialViewerMode(collection),
    },
    exportedAt,
    fabricAssets,
    imageAssets,
    project: project ? {
      collection: cleanOptional(project.collection),
      colorStory: cleanOptional(project.colorStory),
      designIntent: cleanOptional(project.designIntent),
      difficulty: project.difficulty,
      garmentType: project.garmentType,
      generalNotes: cleanOptional(project.generalNotes),
      id: project.id,
      imageReferences: availableImages.map((image) => image.id),
      linkedMaterials: project.linkedMaterials.map((material) => ({
        fabricId: material.fabricId,
        id: material.id,
        materialName: material.materialName,
        neededYards: material.neededYards,
        notes: cleanOptional(material.notes),
        reservedYards: material.reservedYards,
        role: material.role,
        status: material.status,
        usedYards: material.usedYards,
      })),
      name: project.name,
      phase: project.phase,
      progress: project.progress,
      season: cleanOptional(project.season),
      summary: cleanOptional(project.summary),
      targetDate: cleanOptional(project.targetDate),
      tasks: project.tasks.map((task) => ({ category: task.category, id: task.id, status: task.status, title: task.title })),
    } : undefined,
    scenes,
    theme: snapshotTheme(resolvedTheme),
    version: 1,
    warnings: [...warnings.values()].sort((left, right) => compareStrings(left.id, right.id)),
  };
  return deepFreeze(snapshot);
}

/** Compatibility wrapper for existing panel and adapter callers. */
export function prepareEditorialCollectionExport(
  collection: EditorialCollection,
  project: ApparelProject | undefined,
  fabrics: Fabric[] = [],
  exportedAt?: string,
) {
  return prepareEditorialExportSnapshot({ collection, exportedAt, fabrics, project });
}

function snapshotBlock(
  block: EditorialBlock,
  index: number,
  scene: EditorialScene,
  images: readonly LocalImageAsset[],
  fabrics: readonly Fabric[],
  addWarning: (warning: Omit<EditorialExportWarning, 'id'>) => string,
  addImageReference: (reference: ImageReference) => void,
  addFabricReference: (reference: FabricReference) => void,
): EditorialExportBlockSnapshot {
  const content = cloneJson(block.content as EditorialJsonValue);
  const record = isJsonObject(content) ? content : undefined;
  const imageIds = new Set<string>();
  const fabricIds = new Set<string>();
  const warningIds: string[] = [];
  const usage: EditorialExportAssetUsage = { blockId: block.id, location: block.type === 'gallery' ? 'gallery' : 'block', sceneId: scene.id };

  collectContentReferences(content, ({ altText, assetId, caption, externalUrl }) => {
    imageIds.add(assetId);
    addImageReference({ altText, assetId, caption, externalUrl, usage });
    if (!externalUrl && !images.some((image) => image.id === assetId)) {
      warningIds.push(addWarning({ assetReference: assetId, blockId: block.id, code: 'missing-image-asset', message: `Image ${assetId} referenced by block ${block.id} is unavailable.`, sceneId: scene.id, severity: 'warning' }));
    }
  }, (fabricId) => {
    fabricIds.add(fabricId);
    addFabricReference({ fabricId, usage });
    if (!fabrics.some((fabric) => fabric.id === fabricId)) {
      warningIds.push(addWarning({ assetReference: fabricId, blockId: block.id, code: 'missing-fabric-asset', message: `Fabric ${fabricId} referenced by block ${block.id} is unavailable.`, sceneId: scene.id, severity: 'warning' }));
    }
  });
  if (block.type === 'image' && typeof content === 'string' && content.trim()) {
    const assetId = externalAssetId(content);
    imageIds.add(assetId);
    addImageReference({ assetId, externalUrl: content, usage });
  }
  if (!supportedExportBlockTypes.has(block.type)) {
    warningIds.push(addWarning({ blockId: block.id, code: 'unsupported-block-type', message: `Block type “${block.type}” may require an export fallback.`, sceneId: scene.id, severity: 'warning' }));
  }

  return {
    blockId: block.id,
    blockType: block.type,
    caption: record ? cleanOptional(stringValue(record.caption)) : undefined,
    content,
    fabricReferences: [...fabricIds].sort(compareStrings),
    imageReferences: [...imageIds],
    index,
    label: record ? cleanOptional(stringValue(record.label) || stringValue(record.eyebrow) || stringValue(record.attribution) || stringValue(record.title)) : undefined,
    layout: {
      alignment: record ? cleanOptional(stringValue(record.align)) : undefined,
      columns: record && typeof record.columns === 'number' ? record.columns : undefined,
      fit: record ? cleanOptional(stringValue(record.fit)) : undefined,
      settings: cloneJson(block.settings),
    },
    notes: record ? cleanOptional(stringValue(record.notes)) : undefined,
    order: block.order,
    text: cleanOptional(exportText(content)),
    warningIds: uniqueSorted(warningIds),
  };
}

function collectContentReferences(
  value: EditorialJsonValue,
  onImage: (reference: Omit<ImageReference, 'usage'>) => void,
  onFabric: (fabricId: string) => void,
) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item) => collectContentReferences(item, onImage, onFabric));
    return;
  }
  const assetId = stringValue(value.assetId);
  const url = stringValue(value.url);
  if (assetId || url) {
    onImage({
      altText: cleanOptional(stringValue(value.alt) || stringValue(value.assetName)),
      assetId: assetId || externalAssetId(url),
      caption: cleanOptional(stringValue(value.caption)),
      externalUrl: cleanOptional(url),
    });
  }
  const fabricId = stringValue(value.fabricId);
  if (fabricId) onFabric(fabricId);
  Object.keys(value).sort(compareStrings).forEach((key) => collectContentReferences(value[key], onImage, onFabric));
}

function snapshotTheme(theme: EditorialTheme): EditorialExportThemeSnapshot {
  return {
    backgroundTreatment: { ...theme.backgroundTreatment },
    cardTreatment: { ...theme.cardTreatment },
    colors: { ...theme.colors },
    id: theme.id,
    name: theme.name,
    sceneSpacing: { ...theme.sceneSpacing },
    transitionStyle: { ...theme.transitionStyle },
    typography: { ...theme.typography },
  };
}

function exportText(value: EditorialJsonValue): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (!value) return '';
  if (Array.isArray(value)) return value.map(exportText).filter(Boolean).join(' · ');
  for (const key of ['text', 'body', 'quote', 'heading', 'title', 'value']) {
    const candidate = value[key];
    if (typeof candidate === 'string') return candidate;
  }
  return '';
}

function warningId(warning: Omit<EditorialExportWarning, 'id'>) {
  return [warning.code, warning.sceneId, warning.blockId, warning.assetReference]
    .filter(Boolean)
    .join(':')
    .replace(/[^a-zA-Z0-9:_-]/g, '-');
}

function usageKey(usage: EditorialExportAssetUsage) {
  return [usage.location, usage.sceneId, usage.blockId].filter(Boolean).join(':');
}

function compareOrderedRecords(left: { id: string; order: number }, right: { id: string; order: number }) {
  return left.order - right.order || compareStrings(left.id, right.id);
}

function compareStrings(left: string, right: string) {
  return left.localeCompare(right, 'en');
}

function compareUsages(left: EditorialExportAssetUsage, right: EditorialExportAssetUsage) {
  return compareStrings(usageKey(left), usageKey(right));
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort(compareStrings);
}

function externalAssetId(url: string) {
  return `external:${url}`;
}

function cleanOptional(value?: string) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function stringValue(value: EditorialJsonValue | undefined) {
  return typeof value === 'string' ? value : '';
}

function isJsonObject(value: EditorialJsonValue): value is EditorialJsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneJson<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => cloneJson(item)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort(compareStrings).map((key) => [key, cloneJson((value as Record<string, unknown>)[key])])) as T;
  }
  return value;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value as Record<string, unknown>).forEach((item) => deepFreeze(item));
    Object.freeze(value);
  }
  return value;
}
