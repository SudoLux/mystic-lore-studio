import type { CanonicalWorkspaceState } from '../domains/workspace';

export type StudioRemovalKind = 'garment' | 'material_variant' | 'editorial' | 'task';

/** This preview explains impact; the server rechecks permissions and dependencies. */
export function previewStudioRemoval(state: CanonicalWorkspaceState, kind: StudioRemovalKind, id: string) {
  let blocked: string | null = null;
  let effects = '';
  if (kind === 'garment') {
    const stories = state.editorialCollections.filter((item) => item.primaryGarmentId === id);
    if (state.garmentVersions.some((item) => item.garmentId === id)
      || state.technicalSpecs.some((item) => item.garmentId === id && ['approved', 'released'].includes(item.status))
      || state.portfolioProjects.some((item) => item.garmentId === id && item.visibility !== 'private')
      || stories.some((item) => item.status !== 'draft')
      || state.editorialExports.some((item) => stories.some((story) => story.id === item.collectionId))) {
      blocked = 'This garment has protected evidence or stories. Archive it to remove it from active work.';
    }
    effects = `${state.releaseTasks.filter((item) => item.garmentId === id).length} tasks, ${state.garmentMaterials.filter((item) => item.garmentId === id).length} fabric links, ${state.garmentMedia.filter((item) => item.garmentId === id).length} image links, and ${stories.length} draft stories belong to this garment. Its editable workspace and private portfolio draft will be removed.`;
  } else if (kind === 'material_variant') {
    const links = state.garmentMaterials.filter((item) => item.variantId === id).length;
    const inventory = state.inventoryEntries.filter((item) => item.variantId === id).length;
    if (links || inventory || state.bomItems.some((item) => item.materialVariantId === id)) blocked = 'This fabric has garment, inventory, or production history. Archive it to keep that history safe.';
    effects = `${links} garment links and ${inventory} inventory records. The fabric variant, its editable details, supplier offers, and image links will be removed. Other variants stay intact.`;
  } else if (kind === 'editorial') {
    const story = state.editorialCollections.find((item) => item.id === id);
    const scenes = state.editorialScenes.filter((item) => item.collectionId === id);
    if (story?.status !== 'draft' || state.editorialExports.some((item) => item.collectionId === id)
      || state.portfolioEditorials.some((item) => item.collectionId === id)) blocked = 'Only draft stories without retained exports or portfolio links can be deleted. Archive this story instead.';
    effects = `${scenes.length} scenes and ${state.editorialBlocks.filter((item) => scenes.some((scene) => scene.id === item.sceneId)).length} content blocks will be removed.`;
  } else {
    if (state.fitIssuePromotions.some((item) => item.taskId === id) || state.validationWaivers.some((item) => item.followUpTaskId === id)
      || state.qcWaivers.some((item) => item.followUpTaskId === id)) blocked = 'This task is linked to protected evidence. Cancel it instead of deleting it.';
    effects = 'This task will be removed from the Plan and its garment. The garment and other tasks stay intact.';
  }
  return { blocked, effects };
}
