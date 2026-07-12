import { getImageOrientation } from './imageAssets';
import type { EditorialImageContent } from '../types/editorial';
import type { LocalImageAsset } from '../types/studio';

export type EditorialMediaFrame = NonNullable<EditorialImageContent['frame']>;
export type EditorialMediaFitMode = 'smart' | 'cover' | 'contain';

export const editorialMediaFrameOptions: Array<{
  aspectClassName: string;
  label: string;
  value: EditorialMediaFrame;
}> = [
  { aspectClassName: 'aspect-[4/5]', label: 'Portrait', value: 'portrait' },
  { aspectClassName: 'aspect-square', label: 'Square', value: 'square' },
  { aspectClassName: 'aspect-video', label: 'Landscape', value: 'landscape' },
  { aspectClassName: 'aspect-[16/10]', label: 'Full bleed', value: 'full-bleed' },
];

export const editorialMediaFrameChoiceOptions = [
  { label: 'Auto', value: 'auto' },
  ...editorialMediaFrameOptions.map(({ label, value }) => ({ label, value })),
] as const;

export const editorialGalleryLayoutOptions = [
  { label: 'Auto', value: 'auto' },
  { label: 'Feature', value: 'feature' },
  { label: 'Diptych', value: 'diptych' },
  { label: 'Grid', value: 'grid' },
  { label: 'Mosaic', value: 'mosaic' },
] as const;

export function getEditorialFrame(
  frame: EditorialImageContent['frame'] | undefined,
  asset?: Pick<LocalImageAsset, 'height' | 'width'>,
): Exclude<EditorialMediaFrame, 'auto'> {
  if (frame && frame !== 'auto') return frame;
  const orientation = asset ? getImageOrientation(asset) : 'landscape';
  if (orientation === 'portrait') return 'portrait';
  if (orientation === 'square') return 'square';
  return 'landscape';
}

export function editorialFrameAspectClass(
  frame: EditorialImageContent['frame'] | undefined,
  asset?: Pick<LocalImageAsset, 'height' | 'width'>,
) {
  const resolved = getEditorialFrame(frame, asset);
  return editorialMediaFrameOptions.find((option) => option.value === resolved)
    ?.aspectClassName ?? 'aspect-video';
}

export function editorialFitMode(
  content: Pick<EditorialImageContent, 'fit' | 'fitMode'>,
): EditorialMediaFitMode {
  if (content.fitMode === 'cover' || content.fitMode === 'contain') return content.fitMode;
  if (content.fit === 'cover' || content.fit === 'contain') return content.fit;
  return 'smart';
}

export function editorialImageDisplay(
  asset: LocalImageAsset,
  content: Pick<EditorialImageContent, 'fit' | 'fitMode' | 'objectPositionX' | 'objectPositionY' | 'zoom'>,
) {
  const fitMode = editorialFitMode(content);
  const smartFit = getImageOrientation(asset) === 'portrait' ? 'contain' : 'cover';
  return {
    ...asset,
    objectFit: fitMode === 'smart' ? smartFit : fitMode,
    objectPositionX: clamp(content.objectPositionX, asset.objectPositionX ?? 50),
    objectPositionY: clamp(content.objectPositionY, asset.objectPositionY ?? 50),
    zoom: clamp(content.zoom, asset.zoom ?? 1, 1, 2.5),
  } satisfies LocalImageAsset;
}

export function galleryLayoutForCount(
  layout: string | undefined,
  imageCount: number,
) {
  if (layout && layout !== 'auto') return layout;
  if (imageCount <= 1) return 'feature';
  if (imageCount === 2) return 'diptych';
  if (imageCount <= 4) return 'grid';
  return 'mosaic';
}

function clamp(value: number | undefined, fallback: number, minimum = 0, maximum = 100) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, value));
}
