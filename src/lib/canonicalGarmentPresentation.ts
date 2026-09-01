import type {
  CanonicalGarment,
  CanonicalMediaAsset,
  CanonicalMoodboardItem,
  CanonicalWorkspaceState,
} from '../domains/workspace';

const coverRolePriority = ['hero', 'gallery', 'design', 'editorial', 'portfolio', 'sample', 'detail', 'reference', 'flat'] as const;

export function canonicalGarmentMedia(
  state: CanonicalWorkspaceState,
  garmentId: string,
): CanonicalMediaAsset[] {
  const assets = new Map(state.mediaAssets.map((asset) => [asset.id, asset]));
  return state.garmentMedia
    .filter((relation) => relation.garmentId === garmentId)
    .sort((left, right) => {
      const leftRole = coverRolePriority.indexOf(left.role);
      const rightRole = coverRolePriority.indexOf(right.role);
      return leftRole - rightRole || left.sortOrder - right.sortOrder || left.id.localeCompare(right.id);
    })
    .map((relation) => assets.get(relation.assetId))
    .filter((asset): asset is CanonicalMediaAsset => Boolean(asset?.mimeType.startsWith('image/')));
}

export function canonicalGarmentCover(state: CanonicalWorkspaceState, garmentId: string) {
  return canonicalGarmentMedia(state, garmentId)[0] ?? null;
}

export type CanonicalInspirationReference = {
  asset: CanonicalMediaAsset;
  item: CanonicalMoodboardItem;
};

/**
 * Keeps the garment workspace visual field grounded in the canonical
 * moodboard ordering rather than the broader garment-media role ordering.
 */
export function canonicalInspirationReferences(
  state: CanonicalWorkspaceState,
  garmentId: string,
): CanonicalInspirationReference[] {
  const boardOrder = new Map(
    state.moodboards
      .filter((board) => board.garmentId === garmentId)
      .sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id))
      .map((board, index) => [board.id, index]),
  );
  const assets = new Map(state.mediaAssets.map((asset) => [asset.id, asset]));
  const seenAssetIds = new Set<string>();

  return state.moodboardItems
    .filter((item) => boardOrder.has(item.boardId))
    .sort((left, right) => {
      const boardDifference = (boardOrder.get(left.boardId) ?? 0) - (boardOrder.get(right.boardId) ?? 0);
      return boardDifference || left.sortOrder - right.sortOrder || left.id.localeCompare(right.id);
    })
    .flatMap((item) => {
      const asset = assets.get(item.assetId);
      if (!asset?.mimeType.startsWith('image/') || seenAssetIds.has(item.assetId)) return [];
      seenAssetIds.add(item.assetId);
      return [{ asset, item }];
    });
}

export type GarmentSwatch = {
  colorHex: string | null;
  colorName: string;
  id: string;
  materialName: string;
};

export function canonicalGarmentSwatches(
  state: CanonicalWorkspaceState,
  garmentId: string,
  limit = 4,
): GarmentSwatch[] {
  const variants = new Map(state.materialVariants.map((variant) => [variant.id, variant]));
  const materials = new Map(state.materials.map((material) => [material.id, material]));
  const seen = new Set<string>();
  const swatches: GarmentSwatch[] = [];

  for (const relation of state.garmentMaterials
    .filter((item) => item.garmentId === garmentId)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id))) {
    const variant = variants.get(relation.variantId);
    if (!variant || seen.has(variant.id)) continue;
    const material = materials.get(variant.materialId);
    seen.add(variant.id);
    swatches.push({
      colorHex: safeSwatchColor(variant.colorHex),
      colorName: variant.colorName || 'Unspecified color',
      id: variant.id,
      materialName: material?.name ?? 'Material',
    });
    if (swatches.length === limit) break;
  }
  return swatches;
}

export function recommendedGarmentAction(garment: CanonicalGarment) {
  return ({
    brief: { detail: 'Shape the intent, silhouette, and first visual references.', label: 'Continue the brief' },
    design: { detail: 'Refine the design story and select the strongest imagery.', label: 'Continue designing' },
    materials: { detail: 'Confirm the fabric and component choices that define the piece.', label: 'Review materials' },
    technical: { detail: 'Advance flats, measurements, construction, and release readiness.', label: 'Open Technical Studio' },
    sampling: { detail: 'Review the latest sample evidence and resolve the next fit decision.', label: 'Review sample & fit' },
    production: { detail: 'Check the current order, milestone, costing, and quality signals.', label: 'Continue production' },
    story: { detail: 'Build the editorial story from approved garment facts and imagery.', label: 'Continue the story' },
    portfolio: { detail: 'Curate the public-facing case study and final presentation.', label: 'Review portfolio' },
  } as const)[garment.phase];
}

export function recentCanonicalGarments(garments: CanonicalGarment[]) {
  return [...garments].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt) || right.createdAt.localeCompare(left.createdAt) || left.title.localeCompare(right.title));
}

function safeSwatchColor(value: string | null) {
  if (!value) return null;
  return /^#[0-9a-f]{3,8}$/i.test(value) ? value : null;
}
