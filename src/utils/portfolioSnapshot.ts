import type {
  EditorialBlock,
  EditorialCollection,
  EditorialJsonValue,
  EditorialScene,
} from '../types/editorial';
import type { PortfolioProfile, PortfolioVisibleSections } from '../types/portfolio';
import type {
  ApparelProject,
  Fabric,
  LocalImageAsset,
} from '../types/studio';
import {
  getPortfolioProjectDescription,
  getPortfolioProjectTitle,
  getSafePortfolioSettings,
  slugifyPortfolioValue,
  sortPortfolioProjects,
} from './portfolioUtils';

export type PortfolioImageSnapshot = Readonly<{
  alt: string;
  caption?: string;
  fit: 'cover' | 'contain';
  height?: number;
  name?: string;
  positionX: number;
  positionY: number;
  reference: string;
  src?: string;
  usage: readonly string[];
  width?: number;
  zoom: number;
}>;

export type PortfolioMaterialSnapshot = Readonly<{
  bestUses: readonly string[];
  category?: string;
  color: string;
  colorHex?: string;
  composition?: string;
  image?: PortfolioImageSnapshot;
  name: string;
  neededYards?: number;
  role?: string;
  usedYards?: number;
}>;

export type PortfolioNoteSnapshot = Readonly<{
  body: string;
  category: string;
  createdAt: string;
  title: string;
}>;

export type PortfolioEditorialBlockSnapshot = Readonly<{
  content: EditorialJsonValue;
  key: string;
  order: number;
  type: EditorialBlock['type'];
}>;

export type PortfolioEditorialSceneSnapshot = Readonly<{
  background: Readonly<{
    imageReference?: string;
    imageUrl?: string;
    overlayColor?: string;
    overlayOpacity?: number;
    type: EditorialScene['background']['type'];
    value?: string;
  }>;
  blocks: readonly PortfolioEditorialBlockSnapshot[];
  description?: string;
  key: string;
  narrativeRole: EditorialScene['narrativeRole'];
  order: number;
  sceneType: EditorialScene['sceneType'];
  subtitle?: string;
  title: string;
  transition: Readonly<{
    direction?: EditorialScene['transition']['direction'];
    durationMs?: number;
    type: EditorialScene['transition']['type'];
  }>;
}>;

export type PortfolioEditorialSnapshot = Readonly<{
  cover: Readonly<{
    accentColor?: string;
    fit: 'cover' | 'contain';
    image?: PortfolioImageSnapshot;
    label?: string;
  }>;
  description: string;
  generatedAt: string;
  images: readonly PortfolioImageSnapshot[];
  key: string;
  scenes: readonly PortfolioEditorialSceneSnapshot[];
  slug: string;
  subtitle: string;
  templateType: EditorialCollection['templateType'];
  themeId: string;
  title: string;
}>;

export type PortfolioProjectSnapshot = Readonly<{
  caseStudy?: Readonly<{
    challenge?: string;
    outcome?: string;
    overview: string;
    processSummary?: string;
    role?: string;
    skills: readonly string[];
    solution?: string;
    tools: readonly string[];
  }>;
  coverImage?: PortfolioImageSnapshot;
  description: string;
  editorials: readonly PortfolioEditorialSnapshot[];
  featured: boolean;
  featuredImages: readonly PortfolioImageSnapshot[];
  generatedAt: string;
  materials: readonly PortfolioMaterialSnapshot[];
  notes: readonly PortfolioNoteSnapshot[];
  overview?: Readonly<{
    collection: string;
    colorStory: string;
    designIntent: string;
    garmentType: string;
    season: string;
    silhouette: string;
    targetWearer: string;
  }>;
  process?: Readonly<{
    phase: string;
    progress: number;
  }>;
  skills: readonly string[];
  slug: string;
  sortOrder?: number;
  title: string;
  updatedAt?: string;
  visibleSections: Readonly<PortfolioVisibleSections>;
}>;

export type PortfolioProfileSnapshot = Readonly<{
  avatar?: PortfolioImageSnapshot;
  bio: string;
  displayName: string;
  email?: string;
  headline: string;
  location?: string;
  resumeUrl?: string;
  usernameSlug: string;
}>;

export type PortfolioHomepageSnapshot = Readonly<{
  editorials: readonly PortfolioEditorialSnapshot[];
  generatedAt: string;
  profile: PortfolioProfileSnapshot;
  projects: readonly PortfolioProjectSnapshot[];
}>;

export type PreparePortfolioProjectSnapshotInput = Readonly<{
  assets: readonly LocalImageAsset[];
  editorialCollections: readonly EditorialCollection[];
  fabrics: readonly Fabric[];
  generatedAt?: string;
  project: ApparelProject;
}>;

export type PreparePortfolioHomepageSnapshotInput = Readonly<{
  assets: readonly LocalImageAsset[];
  editorialCollections: readonly EditorialCollection[];
  fabrics?: readonly Fabric[];
  generatedAt?: string;
  portfolioProfile: PortfolioProfile;
  projects: readonly ApparelProject[];
}>;

export function preparePortfolioProjectSnapshot({
  assets,
  editorialCollections,
  fabrics,
  generatedAt = new Date().toISOString(),
  project,
}: PreparePortfolioProjectSnapshotInput): PortfolioProjectSnapshot | null {
  const settings = getSafePortfolioSettings(project);
  if (!settings.isPublic) return null;

  const assetMap = createAssetMap(assets, project);
  const selectedCoverId = settings.portfolioCoverImageId
    || project.heroImage?.id
    || project.galleryImages?.[0]?.id;
  const coverImage = selectedCoverId
    ? snapshotSelectedImage(selectedCoverId, assetMap, 'project-cover')
    : undefined;
  const featuredImages = settings.visibleSections.gallery
    ? settings.featuredPortfolioImageIds.map((assetId, index) =>
        snapshotSelectedImage(assetId, assetMap, `project-gallery-${index + 1}`),
      )
    : [];
  const attachedEditorials = settings.visibleSections.editorials
    ? settings.attachedEditorialCollectionIds
        .map((collectionId) => editorialCollections.find((collection) => collection.id === collectionId))
        .filter((collection): collection is EditorialCollection => Boolean(collection))
        .map((collection) => preparePortfolioEditorialSnapshot(collection, [...assetMap.values()], generatedAt))
    : [];

  const snapshot: PortfolioProjectSnapshot = {
    caseStudy: {
      challenge: settings.portfolioChallenge,
      outcome: settings.portfolioOutcome,
      overview: settings.portfolioOverview || getPortfolioProjectDescription(project),
      processSummary: settings.portfolioProcessSummary,
      role: settings.portfolioRole,
      skills: settings.portfolioSkills?.length
        ? [...settings.portfolioSkills]
        : settings.visibleSections.skills ? [...project.keyFeatures] : [],
      solution: settings.portfolioSolution,
      tools: [...(settings.portfolioTools ?? [])],
    },
    coverImage,
    description: getPortfolioProjectDescription(project),
    editorials: attachedEditorials,
    featured: settings.featured,
    featuredImages,
    generatedAt,
    materials: settings.visibleSections.materials
      ? snapshotProjectMaterials(project, fabrics)
      : [],
    notes: settings.visibleSections.notes
      ? project.notes.map((note) => ({
          body: note.body,
          category: note.category,
          createdAt: note.createdAt,
          title: note.title,
        }))
      : [],
    overview: settings.visibleSections.overview
      ? {
          collection: project.collection,
          colorStory: project.colorStory,
          designIntent: project.designIntent,
          garmentType: project.garmentType,
          season: project.season,
          silhouette: project.silhouette,
          targetWearer: project.targetWearer,
        }
      : undefined,
    process: settings.visibleSections.process
      ? { phase: project.phase, progress: project.progress }
      : undefined,
    skills: settings.visibleSections.skills
      ? settings.portfolioSkills?.length
        ? [...settings.portfolioSkills]
        : [...project.keyFeatures]
      : [],
    slug: settings.portfolioSlug,
    sortOrder: settings.sortOrder,
    title: getPortfolioProjectTitle(project),
    updatedAt: project.updatedAt,
    visibleSections: { ...settings.visibleSections },
  };

  return deepFreeze(snapshot);
}

export function preparePortfolioHomepageSnapshot({
  assets,
  editorialCollections,
  fabrics = [],
  generatedAt = new Date().toISOString(),
  portfolioProfile,
  projects,
}: PreparePortfolioHomepageSnapshotInput): PortfolioHomepageSnapshot {
  const projectSnapshots = sortPortfolioProjects(projects)
    .map((project) => preparePortfolioProjectSnapshot({
      assets,
      editorialCollections,
      fabrics,
      generatedAt,
      project,
    }))
    .filter((project): project is PortfolioProjectSnapshot => project !== null);
  const editorials = uniqueEditorials(
    projectSnapshots.flatMap((project) => project.editorials),
  );
  const avatar = portfolioProfile.avatarImageId
    ? snapshotSelectedImage(
        portfolioProfile.avatarImageId,
        new Map(assets.map((asset) => [asset.id, asset])),
        'portfolio-avatar',
      )
    : undefined;

  return deepFreeze({
    editorials,
    generatedAt,
    profile: {
      avatar,
      bio: portfolioProfile.bio,
      displayName: portfolioProfile.displayName,
      email: portfolioProfile.email,
      headline: portfolioProfile.headline,
      location: portfolioProfile.location,
      resumeUrl: portfolioProfile.resumeUrl,
      usernameSlug: slugifyPortfolioValue(portfolioProfile.usernameSlug),
    },
    projects: projectSnapshots,
  });
}

export function preparePortfolioEditorialSnapshot(
  editorialCollection: EditorialCollection,
  assets: readonly LocalImageAsset[] = [],
  generatedAt = new Date().toISOString(),
): PortfolioEditorialSnapshot {
  const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
  const imageReferences = new Map<string, EditorialImageReference>();
  const registerImage = (reference: EditorialImageReference) => {
    if (!reference.assetId && !reference.url) return undefined;
    const key = reference.assetId
      ? `asset:${stableHash(reference.assetId)}`
      : `external:${stableHash(reference.url ?? '')}`;
    const current = imageReferences.get(key);
    if (current) {
      current.usage.push(...reference.usage);
      if (!current.alt && reference.alt) current.alt = reference.alt;
      if (!current.caption && reference.caption) current.caption = reference.caption;
      return key;
    }
    imageReferences.set(key, { ...reference, usage: [...reference.usage] });
    return key;
  };

  let coverReference: string | undefined;
  if (editorialCollection.coverImageId || editorialCollection.coverImageUrl) {
    coverReference = registerImage({
      assetId: editorialCollection.coverImageId,
      alt: `${editorialCollection.title} cover`,
      url: editorialCollection.coverImageUrl,
      usage: ['editorial-cover'],
    });
  }

  const scenes = stableOrder(editorialCollection.scenes).map((scene, sceneIndex) => {
    const sceneKey = `scene-${sceneIndex + 1}`;
    let backgroundReference: string | undefined;
    if (scene.background.imageId || scene.background.imageUrl) {
      backgroundReference = registerImage({
        assetId: scene.background.imageId,
        alt: `${scene.title} background`,
        url: scene.background.imageUrl,
        usage: [`${sceneKey}-background`],
      });
    }
    const blocks = stableOrder(scene.blocks).map((block, blockIndex) => {
      const blockKey = `${sceneKey}-block-${blockIndex + 1}`;
      return {
        content: snapshotEditorialBlockContent(block, blockKey, registerImage),
        key: blockKey,
        order: blockIndex,
        type: block.type,
      } satisfies PortfolioEditorialBlockSnapshot;
    });
    return {
      background: {
        imageReference: backgroundReference,
        overlayColor: scene.background.overlayColor,
        overlayOpacity: scene.background.overlayOpacity,
        type: scene.background.type,
        value: scene.background.value,
      },
      blocks,
      description: scene.description,
      key: sceneKey,
      narrativeRole: scene.narrativeRole,
      order: sceneIndex,
      sceneType: scene.sceneType,
      subtitle: scene.subtitle,
      title: scene.title,
      transition: {
        direction: scene.transition.direction,
        durationMs: scene.transition.durationMs,
        type: scene.transition.type,
      },
    } satisfies PortfolioEditorialSceneSnapshot;
  });

  const images = [...imageReferences.entries()].map(([reference, image]) =>
    snapshotEditorialImage(reference, image, assetMap),
  );
  const coverImage = coverReference
    ? images.find((image) => image.reference === coverReference)
    : undefined;

  return deepFreeze({
    cover: {
      accentColor: editorialCollection.coverAccentColor,
      fit: editorialCollection.coverImageFit ?? 'cover',
      image: coverImage,
      label: editorialCollection.coverLabel,
    },
    description: editorialCollection.description,
    generatedAt,
    images,
    key: `editorial:${stableHash(editorialCollection.id)}`,
    scenes,
    slug: slugifyPortfolioValue(editorialCollection.title),
    subtitle: editorialCollection.subtitle,
    templateType: editorialCollection.templateType,
    themeId: editorialCollection.themeId,
    title: editorialCollection.title,
  });
}

type EditorialImageReference = {
  alt?: string;
  assetId?: string;
  caption?: string;
  usage: string[];
  url?: string;
};

function snapshotProjectMaterials(
  project: ApparelProject,
  fabrics: readonly Fabric[],
): PortfolioMaterialSnapshot[] {
  const fabricMap = new Map(fabrics.map((fabric) => [fabric.id, fabric]));
  return project.linkedMaterials.map((material) => {
    const fabric = material.fabricId ? fabricMap.get(material.fabricId) : undefined;
    return {
      bestUses: fabric ? [...fabric.bestUses] : [],
      category: fabric?.category,
      color: fabric?.primaryColor || fabric?.colorFamily || '',
      colorHex: fabric?.primaryColorHex,
      composition: fabric?.composition,
      image: fabric?.image
        ? snapshotImage(fabric.image, [`material:${material.role}`])
        : undefined,
      name: fabric?.name || material.materialName,
      neededYards: material.neededYards,
      role: material.role,
      usedYards: material.usedYards,
    };
  });
}

function snapshotSelectedImage(
  assetId: string,
  assets: ReadonlyMap<string, LocalImageAsset>,
  usage: string,
): PortfolioImageSnapshot {
  const asset = assets.get(assetId);
  return asset
    ? snapshotImage(asset, [usage])
    : {
        alt: 'Image unavailable',
        fit: 'cover',
        positionX: 50,
        positionY: 50,
        reference: `asset:${stableHash(assetId)}`,
        usage: [usage],
        zoom: 1,
      };
}

function snapshotImage(
  asset: LocalImageAsset,
  usage: string[],
  alt = asset.name,
  caption?: string,
): PortfolioImageSnapshot {
  return {
    alt,
    caption,
    fit: asset.objectFit ?? 'cover',
    height: asset.height,
    name: asset.name,
    positionX: asset.objectPositionX ?? 50,
    positionY: asset.objectPositionY ?? 50,
    reference: `asset:${stableHash(asset.id)}`,
    src: asset.remoteUrl ?? asset.dataUrl,
    usage: uniqueStrings(usage),
    width: asset.width,
    zoom: asset.zoom ?? 1,
  };
}

function snapshotEditorialImage(
  reference: string,
  image: EditorialImageReference,
  assets: ReadonlyMap<string, LocalImageAsset>,
): PortfolioImageSnapshot {
  const asset = image.assetId ? assets.get(image.assetId) : undefined;
  if (asset) {
    return {
      ...snapshotImage(asset, image.usage, image.alt || asset.name, image.caption),
      reference,
    };
  }
  return {
    alt: image.alt ?? 'Image unavailable',
    caption: image.caption,
    fit: 'cover',
    positionX: 50,
    positionY: 50,
    reference,
    src: image.url,
    usage: uniqueStrings(image.usage),
    zoom: 1,
  };
}

function snapshotEditorialBlockContent(
  block: EditorialBlock,
  usage: string,
  register: (reference: EditorialImageReference) => string | undefined,
): EditorialJsonValue {
  const cloned = cloneEditorialValue(block.content);
  if (!isRecord(cloned)) return cloned;
  const content = cloned as Record<string, EditorialJsonValue>;
  if (block.type === 'image') {
    const reference = register({
      alt: stringValue(content.alt),
      assetId: stringValue(content.assetId),
      caption: stringValue(content.caption),
      url: stringValue(content.url),
      usage: [usage],
    });
    delete content.assetId;
    delete content.url;
    if (reference) content.imageReference = reference;
  }
  if (block.type === 'gallery' && Array.isArray(content.images)) {
    content.images = content.images.map((item, index) => {
      if (!isRecord(item)) return item;
      const image = item as Record<string, EditorialJsonValue>;
      const reference = register({
        alt: stringValue(item.alt),
        assetId: stringValue(item.assetId),
        caption: stringValue(item.caption),
        url: stringValue(item.url),
        usage: [`${usage}-gallery-${index + 1}`],
      });
      delete image.assetId;
      delete image.url;
      if (reference) image.imageReference = reference;
      return image;
    });
  }
  if (block.type === 'fabricSwatch') {
    const fabricId = stringValue(content.fabricId);
    delete content.fabricId;
    if (fabricId) content.fabricReference = `fabric:${stableHash(fabricId)}`;
  }
  return content;
}

function createAssetMap(
  assets: readonly LocalImageAsset[],
  project: ApparelProject,
): Map<string, LocalImageAsset> {
  const map = new Map(assets.map((asset) => [asset.id, asset]));
  if (project.heroImage) map.set(project.heroImage.id, project.heroImage);
  project.galleryImages?.forEach((image) => map.set(image.id, image));
  return map;
}

function uniqueEditorials(
  editorials: readonly PortfolioEditorialSnapshot[],
): PortfolioEditorialSnapshot[] {
  const seen = new Set<string>();
  return editorials.filter((editorial) => {
    const key = editorial.key;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function stableOrder<T extends { order: number }>(items: readonly T[]): T[] {
  return items
    .map((item, index) => ({ index, item }))
    .sort((left, right) => left.item.order - right.item.order || left.index - right.index)
    .map(({ item }) => item);
}

function cloneEditorialValue(value: EditorialBlock['content']): EditorialJsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => cloneEditorialValue(item));
  const clone: Record<string, EditorialJsonValue> = {};
  Object.entries(value).forEach(([key, item]) => {
    if (item !== undefined) clone[key] = cloneEditorialValue(item);
  });
  return clone;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach((child) => deepFreeze(child));
    Object.freeze(value);
  }
  return value;
}
