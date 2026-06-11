import type {
  ApparelProject,
  Fabric,
  LocalImageAsset,
  LookbookPage,
} from '../types/studio';

export function isUsableImageAsset(
  image: LocalImageAsset | null | undefined,
): image is LocalImageAsset {
  return Boolean(
    image &&
      typeof image.dataUrl === 'string' &&
      image.dataUrl.startsWith('data:image/') &&
      typeof image.name === 'string' &&
      image.name.trim(),
  );
}

export function getProjectHeroImage(project: ApparelProject) {
  return isUsableImageAsset(project.heroImage) ? project.heroImage : undefined;
}

export function getProjectGalleryImages(project: ApparelProject) {
  return (project.galleryImages ?? []).filter(isUsableImageAsset);
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
