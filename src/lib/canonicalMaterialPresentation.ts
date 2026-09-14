import type { CanonicalMaterialVariantMedia, CanonicalMediaAsset, CanonicalWorkspaceState } from '../domains/workspace';

export type CanonicalMaterialImageFraming = {
  objectFit: 'cover' | 'contain';
  objectPositionX: number;
  objectPositionY: number;
  zoom: number;
};

export const defaultCanonicalMaterialImageFraming: CanonicalMaterialImageFraming = {
  objectFit: 'cover',
  objectPositionX: 50,
  objectPositionY: 50,
  zoom: 1,
};

export function canonicalMaterialVariantMedia(
  state: CanonicalWorkspaceState,
  variantId: string,
): CanonicalMediaAsset[] {
  const assets = new Map(state.mediaAssets.map((asset) => [asset.id, asset]));
  const priority = ['swatch', 'detail', 'reference'];
  return (state.materialVariantMedia ?? [])
    .filter((relation) => relation.variantId === variantId)
    .sort((left, right) => priority.indexOf(left.role) - priority.indexOf(right.role)
      || left.sortOrder - right.sortOrder || left.id.localeCompare(right.id))
    .map((relation) => assets.get(relation.assetId))
    .filter((asset): asset is CanonicalMediaAsset => Boolean(asset?.mimeType.startsWith('image/')));
}

export function canonicalMaterialVariantCover(state: CanonicalWorkspaceState, variantId: string) {
  return canonicalMaterialVariantMedia(state, variantId)[0] ?? null;
}

export function canonicalMaterialVariantCoverRelation(
  state: CanonicalWorkspaceState,
  variantId: string,
): CanonicalMaterialVariantMedia | null {
  const priority = ['swatch', 'detail', 'reference'];
  return [...(state.materialVariantMedia ?? [])]
    .filter((relation) => relation.variantId === variantId)
    .sort((left, right) => priority.indexOf(left.role) - priority.indexOf(right.role)
      || left.sortOrder - right.sortOrder || left.id.localeCompare(right.id))[0] ?? null;
}

export function canonicalMaterialImageFraming(
  relation: CanonicalMaterialVariantMedia | null | undefined,
): CanonicalMaterialImageFraming {
  const input = relation?.framing ?? {};
  return {
    objectFit: input.objectFit === 'contain' ? 'contain' : 'cover',
    objectPositionX: boundedNumber(input.objectPositionX, 50, 0, 100),
    objectPositionY: boundedNumber(input.objectPositionY, 50, 0, 100),
    zoom: boundedNumber(input.zoom, 1, 1, 2.5),
  };
}

function boundedNumber(value: unknown, fallback: number, minimum: number, maximum: number) {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.min(maximum, Math.max(minimum, numeric));
}
