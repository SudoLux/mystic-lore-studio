import type { CanonicalMediaAsset, CanonicalWorkspaceState } from '../domains/workspace';

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
