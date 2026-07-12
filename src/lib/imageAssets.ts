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
export const MAX_PROJECT_EDITORIAL_IMAGES = 30;

export const PROJECT_HERO_RESPONSIVE_ASPECT_CLASS =
  'aspect-[4/5] sm:aspect-[4/3] lg:aspect-[3/4]';
export const PROJECT_GALLERY_RESPONSIVE_ASPECT_CLASS =
  'aspect-[4/5] sm:aspect-[4/3] xl:aspect-video';
export const PROJECT_LIBRARY_CARD_ASPECT_CLASS = 'aspect-[5/2]';
export const PROJECT_DASHBOARD_BAND_ASPECT_CLASS = 'aspect-[4/1]';
export const PROJECT_MOBILE_CARD_ASPECT_CLASS = 'aspect-square';

export type ImageAdjustmentContext =
  | 'projectGallery'
  | 'projectHero'
  | 'standard';

export type ProjectImageSurfaceDefinition = {
  aspectRatio: number;
  id: 'cards' | 'desktop' | 'phone' | 'tablet';
  label: string;
  ratioLabel: string;
  renderMode: 'cards' | 'primary';
};

export const projectHeroImageSurfaces: ProjectImageSurfaceDefinition[] = [
  {
    aspectRatio: 4 / 5,
    id: 'phone',
    label: 'Phone',
    ratioLabel: '4:5',
    renderMode: 'primary',
  },
  {
    aspectRatio: 4 / 3,
    id: 'tablet',
    label: 'Tablet',
    ratioLabel: '4:3',
    renderMode: 'primary',
  },
  {
    aspectRatio: 3 / 4,
    id: 'desktop',
    label: 'Desktop',
    ratioLabel: '3:4',
    renderMode: 'primary',
  },
  {
    aspectRatio: 4 / 3,
    id: 'cards',
    label: 'Cards',
    ratioLabel: 'Crop check',
    renderMode: 'cards',
  },
];

export const projectGalleryImageSurfaces: ProjectImageSurfaceDefinition[] = [
  {
    aspectRatio: 4 / 5,
    id: 'phone',
    label: 'Phone',
    ratioLabel: '4:5',
    renderMode: 'primary',
  },
  {
    aspectRatio: 4 / 3,
    id: 'tablet',
    label: 'Tablet',
    ratioLabel: '4:3',
    renderMode: 'primary',
  },
  {
    aspectRatio: 16 / 9,
    id: 'desktop',
    label: 'Desktop',
    ratioLabel: '16:9',
    renderMode: 'primary',
  },
];

export function getProjectImageSurfaces(
  context: Exclude<ImageAdjustmentContext, 'standard'>,
) {
  return context === 'projectGallery'
    ? projectGalleryImageSurfaces
    : projectHeroImageSurfaces;
}

export type ImageDisplaySettings = {
  objectFit: 'cover' | 'contain';
  overlayIntensity: 'auto' | 'light' | 'strong';
  objectPositionX: number;
  objectPositionY: number;
  zoom: number;
};

export type ImageOrientation = 'landscape' | 'portrait' | 'square';

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

export function getImageOrientation(
  asset: Pick<LocalImageAsset, 'height' | 'width'>,
): ImageOrientation {
  if (!asset.width || !asset.height) return 'landscape';
  const ratio = asset.width / asset.height;
  if (ratio <= 0.86) return 'portrait';
  if (ratio >= 1.16) return 'landscape';
  return 'square';
}

export function getRecommendedProjectImageDisplay(
  asset: Pick<LocalImageAsset, 'height' | 'width'>,
): Pick<
  LocalImageAsset,
  'objectFit' | 'objectPositionX' | 'objectPositionY' | 'zoom'
> {
  return {
    objectFit:
      getImageOrientation(asset) === 'portrait' ? 'contain' : 'cover',
    objectPositionX: 50,
    objectPositionY: 50,
    zoom: 1,
  };
}

export function applyRecommendedProjectImageDisplay(
  asset: LocalImageAsset,
): LocalImageAsset {
  return {
    ...asset,
    ...getRecommendedProjectImageDisplay(asset),
    updatedAt: new Date().toISOString(),
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
