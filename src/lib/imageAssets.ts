import type {
  ApparelProject,
  Fabric,
  LocalImageAsset,
  LookbookPage,
} from '../types/studio';

export const defaultImageDisplay = {
  objectFit: 'cover' as const,
  overlayIntensity: 'auto' as const,
  objectPositionX: 50,
  objectPositionY: 50,
  zoom: 1,
};

export const MAX_PROJECT_GALLERY_IMAGES = 5;

export type ImageDisplaySettings = {
  objectFit: 'cover' | 'contain';
  overlayIntensity: 'auto' | 'light' | 'strong';
  objectPositionX: number;
  objectPositionY: number;
  zoom: number;
};

export function isUsableImageAsset(
  image: LocalImageAsset | null | undefined,
): image is LocalImageAsset {
  return Boolean(
    image &&
      ((typeof image.dataUrl === 'string' &&
        image.dataUrl.startsWith('data:image/')) ||
        (typeof image.remoteUrl === 'string' && image.remoteUrl.startsWith('http')) ||
        Boolean(image.storagePath)) &&
      typeof image.name === 'string' &&
      image.name.trim(),
  );
}

export function getProjectHeroImage(project: ApparelProject) {
  return isUsableImageAsset(project.heroImage) ? project.heroImage : undefined;
}

export function getProjectGalleryImages(project: ApparelProject) {
  return limitProjectGalleryImages(project.galleryImages);
}

export function limitProjectGalleryImages(
  images: LocalImageAsset[] | null | undefined,
) {
  return (images ?? [])
    .filter(isUsableImageAsset)
    .slice(0, MAX_PROJECT_GALLERY_IMAGES);
}

export function getProjectGalleryOverflowCount(project: ApparelProject) {
  return Math.max(
    (project.galleryImages ?? []).filter(isUsableImageAsset).length -
      MAX_PROJECT_GALLERY_IMAGES,
    0,
  );
}

export function getFabricImage(fabric: Fabric | undefined) {
  return isUsableImageAsset(fabric?.image) ? fabric.image : undefined;
}

export function getLookbookHeroImage(
  project: ApparelProject,
  lookbookPage?: LookbookPage,
) {
  return isUsableImageAsset(lookbookPage?.heroImage)
    ? lookbookPage.heroImage
    : getProjectHeroImage(project);
}

export function getImageDisplay(asset: LocalImageAsset): ImageDisplaySettings {
  return {
    objectFit: asset.objectFit === 'contain' ? 'contain' : 'cover',
    overlayIntensity:
      asset.overlayIntensity === 'light' || asset.overlayIntensity === 'strong'
        ? asset.overlayIntensity
        : 'auto',
    objectPositionX: clampNumber(asset.objectPositionX, 50, 0, 100),
    objectPositionY: clampNumber(asset.objectPositionY, 50, 0, 100),
    zoom: clampNumber(asset.zoom, 1, 1, 2.5),
  };
}

function clampNumber(
  value: number | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(value, minimum), maximum);
}
