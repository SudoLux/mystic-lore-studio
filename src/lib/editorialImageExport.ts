import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import {
  EditorialExportSceneCanvas,
  type EditorialExportRenderContext,
} from '../components/lookbook/EditorialExportSceneCanvas';
import type {
  EditorialExportResult,
  EditorialExportSceneSnapshot,
  EditorialExportSnapshot,
  EditorialExportWarning,
} from './editorialExport';
import { resolveEditorialExportImage } from './editorialExportAssets';
import type {
  EditorialBlock,
  EditorialCollection,
  EditorialScene,
  EditorialTheme,
} from '../types/editorial';
import type {
  ApparelProject,
  Fabric,
  LinkedMaterial,
  LocalImageAsset,
  StudioTask,
} from '../types/studio';

export type EditorialImageExportScale = 1 | 2 | 3;
export type EditorialImageExportOptions = Readonly<{
  fileNamePrefix?: string;
  format: 'png';
  includeIndex: boolean;
  scale: EditorialImageExportScale;
}>;

export type EditorialImageExportProgress = Readonly<{
  completed: number;
  message: string;
  total: number;
}>;

export type EditorialImageExportFile = Readonly<{
  blob: Blob;
  fileName: string;
  sceneId: string;
  warnings: readonly EditorialExportWarning[];
}>;

export type EditorialImageExportInput = Readonly<{
  onProgress?: (progress: EditorialImageExportProgress) => void;
  options?: Partial<EditorialImageExportOptions>;
  snapshot: EditorialExportSnapshot;
}>;

export type EditorialImageExportBundle = Readonly<{
  files: readonly EditorialImageExportFile[];
  index: EditorialImageExportIndex;
  options: EditorialImageExportOptions;
}>;

export type EditorialImageExportIndex = Readonly<{
  collectionId: string;
  collectionTitle: string;
  exportedAt: string;
  format: 'png';
  resolution: `${EditorialImageExportScale}x`;
  scenes: readonly Readonly<{
    fileName: string;
    order: number;
    sceneId: string;
    title: string;
    warnings: readonly EditorialExportWarning[];
  }>[];
  warnings: readonly EditorialExportWarning[];
}>;

const DEFAULT_OPTIONS: EditorialImageExportOptions = {
  format: 'png',
  includeIndex: true,
  scale: 2,
};
const SCENE_WIDTH = 1280;
const SCENE_HEIGHT = 720;

/** Renders every ordered snapshot scene and downloads a deterministic ZIP package. */
export async function exportEditorialCollectionImages({
  onProgress,
  options,
  snapshot,
}: EditorialImageExportInput): Promise<EditorialExportResult> {
  assertBrowserExportSupport();
  const bundle = await renderEditorialCollectionImages({ onProgress, options, snapshot });
  onProgress?.({ completed: bundle.files.length, message: 'Packaging image files...', total: snapshot.scenes.length });
  const archiveName = `${safeFilePart(bundle.options.fileNamePrefix || snapshot.collection.title, 'Editorial_Collection')}_Images.zip`;
  const archive = await createEditorialImageArchive(bundle);
  downloadBlob(archive, archiveName);
  const previewFallbackCount = bundle.index.warnings.filter((warning) => warning.code === 'preview-image-fallback').length;
  const qualityNotice = previewFallbackCount > 0
    ? ` ${previewFallbackCount} ${previewFallbackCount === 1 ? 'image used' : 'images used'} an offline preview because a master was unavailable.`
    : '';
  return {
    filename: archiveName,
    format: 'images',
    message: snapshot.scenes.length > 0
      ? `${snapshot.scenes.length} scene ${snapshot.scenes.length === 1 ? 'image' : 'images'} exported in ${archiveName}.${qualityNotice}`
      : `${archiveName} contains collection metadata; there were no scenes to render.`,
  };
}

/** Produces scene image blobs and metadata without downloading or mutating app state. */
export async function renderEditorialCollectionImages({
  onProgress,
  options,
  snapshot,
}: EditorialImageExportInput): Promise<EditorialImageExportBundle> {
  assertBrowserExportSupport();
  const resolvedOptions = normalizeEditorialImageExportOptions(options);
  onProgress?.({ completed: 0, message: 'Preparing linked images and fabrics...', total: snapshot.scenes.length });
  const context = await prepareEditorialExportRenderContext(snapshot);
  const { getFontEmbedCSS } = await import('html-to-image');
  context.fontEmbedCss = await getFontEmbedCSS(document.body).catch(() => '');
  const files: EditorialImageExportFile[] = [];

  try {
    for (const [index, scene] of snapshot.scenes.entries()) {
      onProgress?.({
        completed: index,
        message: `Rendering scene ${index + 1} of ${snapshot.scenes.length}: ${scene.title}`,
        total: snapshot.scenes.length,
      });
      files.push(await renderEditorialSceneImage({ context, index, options: resolvedOptions, scene }));
    }

    return {
      files,
      index: createEditorialImageExportIndex(snapshot, files, resolvedOptions, context.runtimeWarnings),
      options: resolvedOptions,
    };
  } finally {
    context.cleanup();
  }
}

export function normalizeEditorialImageExportOptions(
  options?: Partial<EditorialImageExportOptions>,
): EditorialImageExportOptions {
  return {
    fileNamePrefix: options?.fileNamePrefix?.trim() || undefined,
    format: 'png',
    includeIndex: options?.includeIndex ?? DEFAULT_OPTIONS.includeIndex,
    scale: options?.scale === 1 || options?.scale === 3 ? options.scale : 2,
  };
}

async function renderEditorialSceneImage({
  context,
  index,
  options,
  scene,
}: {
  context: PreparedEditorialExportRenderContext;
  index: number;
  options: EditorialImageExportOptions;
  scene: EditorialExportSceneSnapshot;
}): Promise<EditorialImageExportFile> {
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  Object.assign(host.style, {
    height: `${SCENE_HEIGHT}px`,
    left: '-20000px',
    overflow: 'hidden',
    pointerEvents: 'none',
    position: 'fixed',
    top: '0',
    width: `${SCENE_WIDTH}px`,
    zIndex: '-1',
  });
  document.body.appendChild(host);
  const root = createRoot(host);

  try {
    flushSync(() => root.render(createElement(EditorialExportSceneCanvas, { context, scene })));
    const sceneSurface = host.querySelector<HTMLElement>('[data-editorial-export-scene]');
    if (!sceneSurface) throw new Error(`Scene "${scene.title}" did not create an export surface.`);
    await waitForSceneAssets(sceneSurface);
    const { toBlob } = await import('html-to-image');
    // Capture the scene surface rather than its off-screen host. Cloning the host
    // also cloned z-index: -1, placing the scene behind html-to-image's background.
    const blob = await toBlob(sceneSurface, {
      backgroundColor: context.theme.colors.background,
      cacheBust: false,
      fontEmbedCSS: context.fontEmbedCss,
      height: SCENE_HEIGHT,
      pixelRatio: options.scale,
      skipAutoScale: true,
      width: SCENE_WIDTH,
    });
    if (!blob) throw new Error(`Scene "${scene.title}" could not be rendered.`);
    await assertSceneImageHasVisibleContent(blob, scene.title);
    return {
      blob,
      fileName: editorialSceneFileName(index, context.snapshot.scenes.length, scene.title),
      sceneId: scene.sceneId,
      warnings: [...context.snapshot.warnings, ...context.runtimeWarnings]
        .filter((warning) => warning.sceneId === scene.sceneId),
    };
  } finally {
    root.unmount();
    host.remove();
  }
}

async function createEditorialImageArchive(
  bundle: EditorialImageExportBundle,
) {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  bundle.files.forEach((file) => zip.file(file.fileName, file.blob));
  if (bundle.options.includeIndex) {
    zip.file('index.json', `${JSON.stringify(bundle.index, null, 2)}\n`);
  }
  if (bundle.files.length === 0) {
    zip.file('No scenes.txt', 'This Editorial Collection had no scenes at export time.\n');
  }
  return zip.generateAsync({ compression: 'DEFLATE', compressionOptions: { level: 6 }, type: 'blob' });
}

function createEditorialImageExportIndex(
  snapshot: EditorialExportSnapshot,
  files: readonly EditorialImageExportFile[],
  options: EditorialImageExportOptions,
  runtimeWarnings: readonly EditorialExportWarning[],
): EditorialImageExportIndex {
  return {
    collectionId: snapshot.collection.id,
    collectionTitle: snapshot.collection.title,
    exportedAt: snapshot.exportedAt,
    format: options.format,
    resolution: `${options.scale}x`,
    scenes: files.map((file, sceneIndex) => ({
      fileName: file.fileName,
      order: sceneIndex + 1,
      sceneId: file.sceneId,
      title: snapshot.scenes[sceneIndex]?.title || 'Untitled scene',
      warnings: file.warnings,
    })),
    warnings: [...snapshot.warnings, ...runtimeWarnings]
      .sort((left, right) => left.id.localeCompare(right.id, 'en')),
  };
}

type PreparedEditorialExportRenderContext = EditorialExportRenderContext & Readonly<{
  cleanup: () => void;
  runtimeWarnings: readonly EditorialExportWarning[];
}> & { fontEmbedCss: string };

async function prepareEditorialExportRenderContext(
  snapshot: EditorialExportSnapshot,
): Promise<PreparedEditorialExportRenderContext> {
  const imageById = new Map<string, LocalImageAsset>();
  const runtimeWarnings: EditorialExportWarning[] = [];
  for (const asset of snapshot.imageAssets) {
    const resolved = await resolveEditorialExportImage(asset);
    if (!resolved) continue;
    imageById.set(asset.assetId, {
      dataUrl: resolved.dataUrl,
      height: asset.height,
      id: asset.assetId,
      mimeType: resolved.mimeType,
      name: asset.filename || asset.altText || asset.assetId,
      size: asset.sizeBytes || 0,
      updatedAt: snapshot.exportedAt,
      width: asset.width,
    });
    if (resolved.quality === 'preview') {
      const usageSceneId = asset.usages.find((usage) => usage.sceneId)?.sceneId;
      runtimeWarnings.push({
        assetReference: asset.assetId,
        code: 'preview-image-fallback',
        id: `preview-image-fallback:${asset.assetId}`,
        message: `${asset.filename || asset.altText || 'An editorial image'} used a compact offline preview because its full master was unavailable.`,
        sceneId: usageSceneId,
        severity: 'info',
      });
    }
  }

  const theme: EditorialTheme = {
    ...snapshot.theme,
    createdAt: '',
    description: snapshot.theme.name,
    settings: {},
    updatedAt: '',
  };
  const scenes = snapshot.scenes.map((scene): EditorialScene => ({
    background: { ...scene.background },
    blocks: scene.blocks.map((block): EditorialBlock => ({
      content: structuredClone(block.content),
      id: block.blockId,
      order: block.order,
      sceneId: scene.sceneId,
      settings: structuredClone(block.layout.settings),
      type: block.blockType,
    })),
    collectionId: snapshot.collection.id,
    createdAt: '',
    description: scene.description,
    fabricFallbacks: scene.fabricFallbacks.map((fallback) => ({ ...fallback })),
    fabricIds: [...scene.fabricReferences],
    id: scene.sceneId,
    narrativeRole: scene.narrativeRole,
    order: scene.order,
    sceneType: scene.sceneType,
    subtitle: scene.subtitle,
    title: scene.title,
    transition: { ...scene.transition },
    updatedAt: '',
  }));
  const project = snapshot.project ? snapshotProject(snapshot, imageById) : undefined;
  const coverReference = snapshot.collection.cover.imageReference;
  const selectedCover = coverReference ? imageById.get(coverReference) : undefined;
  const selectedProjectCover = selectedCover && snapshot.project?.imageReferences.includes(selectedCover.id)
    ? selectedCover
    : undefined;
  const fallbackProjectCover = project?.heroImage ?? project?.galleryImages?.[0];
  const externalCover = selectedCover && !selectedProjectCover ? selectedCover : undefined;
  const projectCover = externalCover ? undefined : selectedProjectCover ?? fallbackProjectCover;
  const collection: EditorialCollection = {
    createdAt: snapshot.collection.createdAt || '',
    coverAccentColor: snapshot.collection.cover.accentColor,
    coverImageFit: snapshot.collection.cover.fit,
    coverImageId: projectCover?.id,
    coverImageUrl: externalCover?.dataUrl,
    coverLabel: snapshot.collection.cover.label,
    description: snapshot.collection.description || '',
    id: snapshot.collection.id,
    projectId: snapshot.collection.projectId,
    scenes,
    subtitle: snapshot.collection.subtitle || '',
    templateType: snapshot.collection.templateType,
    themeId: snapshot.theme.id,
    title: snapshot.collection.title,
    updatedAt: snapshot.collection.updatedAt || '',
    viewerMode: snapshot.collection.viewerMode,
  };
  const fabrics = snapshot.fabricAssets.flatMap((fabric): Fabric[] => {
    if (!fabric.available) return [];
    const totalYards = fabric.quantity.totalYards ?? fabric.quantity.availableYards ?? 0;
    return [{
      archiveStatus: 'Active',
      bestUses: [],
      binNumber: '',
      careNotes: '',
      category: fabric.category || 'Textile',
      colorFamily: fabric.color.family || fabric.color.name || 'Neutral',
      composition: fabric.composition || '',
      costPerYard: 0,
      drape: 'Balanced',
      handFeel: '',
      id: fabric.fabricId,
      image: fabric.imageAssetId ? imageById.get(fabric.imageAssetId) : undefined,
      loreNote: fabric.notes || '',
      moodTags: [],
      name: fabric.name,
      notes: fabric.notes || '',
      opacity: 'Opaque',
      primaryColor: fabric.color.name || fabric.color.family || '',
      primaryColorHex: fabric.color.hex,
      purchaseDate: '',
      rarity: 'Core',
      reservedYards: fabric.quantity.reservedYards || 0,
      secondaryColors: [],
      shelf: '',
      status: 'In Stock',
      storageLocation: '',
      storageStatus: 'Filed',
      stretch: 'None',
      structure: '',
      supplier: '',
      tags: [],
      texture: '',
      totalYards,
      updatedAt: snapshot.exportedAt,
      usedYards: fabric.quantity.usedYards || 0,
      weaveOrKnit: '',
      weight: 'Medium',
      widthInches: 0,
    }];
  });
  return {
    cleanup: () => undefined,
    collection,
    fabrics,
    fontEmbedCss: '',
    project,
    runtimeWarnings,
    scenes: new Map(scenes.map((scene) => [scene.id, scene])),
    snapshot,
    theme,
  };
}

function snapshotProject(
  snapshot: EditorialExportSnapshot,
  imageById: ReadonlyMap<string, LocalImageAsset>,
): ApparelProject {
  const project = snapshot.project!;
  const heroImage = project.imageReferences[0]
    ? imageById.get(project.imageReferences[0])
    : undefined;
  const galleryImages = project.imageReferences
    .slice(1)
    .map((reference) => imageById.get(reference))
    .filter((image): image is LocalImageAsset => Boolean(image));
  const materials: LinkedMaterial[] = project.linkedMaterials.map((material) => ({
    ...material,
    projectId: project.id,
  }));
  const tasks: StudioTask[] = project.tasks.map((task) => ({
    ...task,
    description: '',
    phase: project.phase,
    priority: 'Medium',
    projectId: project.id,
  }));
  return {
    collection: project.collection || '',
    colorStory: project.colorStory || '',
    designIntent: project.designIntent || '',
    difficulty: project.difficulty,
    galleryImages,
    garmentType: project.garmentType,
    generalNotes: project.generalNotes || '',
    heroImage,
    id: project.id,
    keyFeatures: [],
    linkedMaterials: materials,
    lookbookPages: [],
    name: project.name,
    notes: [],
    phase: project.phase,
    priority: 'Medium',
    progress: project.progress,
    season: project.season || '',
    silhouette: '',
    startDate: '',
    status: 'Active',
    summary: project.summary || '',
    tags: [],
    targetDate: project.targetDate,
    targetWearer: '',
    tasks,
  };
}

function editorialSceneFileName(index: number, total: number, title: string) {
  const digits = Math.max(2, String(Math.max(total, 1)).length);
  return `${String(index + 1).padStart(digits, '0')}_${safeFilePart(title, 'Untitled_Scene')}.png`;
}

function safeFilePart(value: string, fallback: string) {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 72);
  return normalized || fallback;
}

async function waitForSceneAssets(host: HTMLElement) {
  await document.fonts?.ready;
  const images = [...host.querySelectorAll('img')];
  // Export canvases are intentionally off-screen, so browser lazy-loading would
  // otherwise leave their images unresolved until after capture.
  images.forEach((image) => { image.loading = 'eager'; });
  await Promise.all(images.map((image) => {
    if (image.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const finish = () => resolve();
      image.addEventListener('load', finish, { once: true });
      image.addEventListener('error', finish, { once: true });
      window.setTimeout(finish, 2_000);
    });
  }));
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

async function assertSceneImageHasVisibleContent(
  blob: Blob,
  sceneTitle: string,
) {
  if (typeof createImageBitmap !== 'function') return;
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 27;
    const renderingContext = canvas.getContext('2d', { willReadFrequently: true });
    if (!renderingContext) return;
    renderingContext.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const pixels = renderingContext.getImageData(0, 0, canvas.width, canvas.height).data;
    const minimum = [255, 255, 255];
    const maximum = [0, 0, 0];
    let opaqueSamples = 0;

    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 3] < 16) continue;
      opaqueSamples += 1;
      for (let channel = 0; channel < 3; channel += 1) {
        minimum[channel] = Math.min(minimum[channel], pixels[index + channel]);
        maximum[channel] = Math.max(maximum[channel], pixels[index + channel]);
      }
    }

    const colorRange = maximum.reduce(
      (total, value, channel) => total + value - minimum[channel],
      0,
    );
    if (opaqueSamples === 0 || colorRange < 18) {
      throw new Error(`Scene "${sceneTitle}" rendered without visible content. Please retry the export.`);
    }
  } finally {
    bitmap.close();
  }
}

function assertBrowserExportSupport() {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    throw new Error('Image export is only available in a browser.');
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
