import { getFabricColorHex } from './fabricMetadata';
import type { EditorialFabricFallback } from '../types/editorial';
import type { ApparelProject, Fabric, LinkedMaterial, LocalImageAsset } from '../types/studio';

export type LinkedEditorialFabric = {
  fabric: Fabric;
  material: LinkedMaterial;
};

export function projectEditorialImages(project?: ApparelProject) {
  if (!project) return [];
  return [project.heroImage, ...(project.galleryImages ?? [])]
    .filter((image): image is LocalImageAsset => Boolean(image))
    .filter((image, index, images) => images.findIndex((item) => item.id === image.id) === index);
}

export function resolveProjectEditorialImage(project: ApparelProject | undefined, assetId?: string) {
  if (!assetId) return undefined;
  return projectEditorialImages(project).find((image) => image.id === assetId);
}

export function projectLinkedEditorialFabrics(
  project: ApparelProject | undefined,
  fabrics: Fabric[] = [],
): LinkedEditorialFabric[] {
  if (!project) return [];
  const fabricById = new Map(fabrics.map((fabric) => [fabric.id, fabric]));
  const seen = new Set<string>();
  return project.linkedMaterials.flatMap((material) => {
    if (!material.fabricId || seen.has(material.fabricId)) return [];
    const fabric = fabricById.get(material.fabricId);
    if (!fabric) return [];
    seen.add(material.fabricId);
    return [{ fabric, material }];
  });
}

export function fabricEditorialFallback(
  fabric: Fabric,
  material?: LinkedMaterial,
): EditorialFabricFallback {
  return {
    colorHex: getFabricColorHex(fabric),
    composition: fabric.composition,
    fabricId: fabric.id,
    name: fabric.name,
    notes: material?.notes || fabric.loreNote || fabric.notes || undefined,
  };
}
