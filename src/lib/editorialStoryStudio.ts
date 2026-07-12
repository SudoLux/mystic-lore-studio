import { createEditorialBlock } from './editorialBlocks';
import type {
  EditorialBlock,
  EditorialCollection,
  EditorialNarrativeRole,
  EditorialScene,
  EditorialSceneType,
} from '../types/editorial';
import type { ApparelProject } from '../types/studio';

export type EditorialSceneRecipeId =
  | 'opening-statement'
  | 'inspiration-story'
  | 'material-study'
  | 'making-process'
  | 'hero-editorial'
  | 'detail-study'
  | 'technical-breakdown'
  | 'reflection-closing'
  | 'blank-scene';

export type EditorialSceneRecipe = {
  description: string;
  id: EditorialSceneRecipeId;
  narrativeRole: EditorialNarrativeRole;
  prompt: string;
  sceneType: EditorialSceneType;
  title: string;
};

export type EditorialCompositionPreset = {
  description: string;
  id: string;
  label: string;
  layout: 'feature' | 'diptych' | 'grid' | 'mosaic';
  mediaPlacement: 'background' | 'feature' | 'split' | 'stack';
};

export type EditorialCanvasSelection =
  | { kind: 'scene' }
  | { blockId: string; kind: 'block' }
  | { blockId: string; imageIndex?: number; kind: 'media' };

export type EditorialSceneReadiness = {
  message: boolean;
  supportingDetail: boolean;
  visual: boolean;
};

export const editorialSceneRecipes: EditorialSceneRecipe[] = [
  { description: 'A confident title, short premise, and defining image.', id: 'opening-statement', narrativeRole: 'introduction', prompt: 'What should someone understand before the story begins?', sceneType: 'cover', title: 'Opening Statement' },
  { description: 'Connect the garment to a reference, memory, or idea.', id: 'inspiration-story', narrativeRole: 'context', prompt: 'What idea or reference shaped this garment?', sceneType: 'story', title: 'Inspiration Story' },
  { description: 'Explain why the cloth, color, and hand matter.', id: 'material-study', narrativeRole: 'supporting', prompt: 'How did the material change the design?', sceneType: 'fabric-story', title: 'Material Study' },
  { description: 'Show development, construction, fitting, and revision.', id: 'making-process', narrativeRole: 'development', prompt: 'What construction choice best demonstrates your skill?', sceneType: 'construction', title: 'Making Process' },
  { description: 'Let the strongest finished photography lead.', id: 'hero-editorial', narrativeRole: 'highlight', prompt: 'What should the viewer feel before reading an explanation?', sceneType: 'gallery', title: 'Hero Editorial' },
  { description: 'Reward a closer look at finish and signature details.', id: 'detail-study', narrativeRole: 'resolution', prompt: 'Which details prove the care behind the garment?', sceneType: 'gallery', title: 'Detail Study' },
  { description: 'Present specifications, measurements, or fit decisions.', id: 'technical-breakdown', narrativeRole: 'development', prompt: 'What technical decision would matter to a design team?', sceneType: 'technical', title: 'Technical Breakdown' },
  { description: 'Close with the result, lesson, or next direction.', id: 'reflection-closing', narrativeRole: 'closing', prompt: 'What did this project prove or teach you?', sceneType: 'closing', title: 'Reflection & Closing' },
  { description: 'Start with an open scene and build it your way.', id: 'blank-scene', narrativeRole: 'supporting', prompt: 'What is the single idea this scene needs to communicate?', sceneType: 'custom', title: 'Blank Scene' },
];

export function createSceneFromRecipe(
  collectionId: string,
  order: number,
  recipeId: EditorialSceneRecipeId,
  timestamp = new Date().toISOString(),
): EditorialScene {
  const recipe = editorialSceneRecipes.find((item) => item.id === recipeId) ?? editorialSceneRecipes[8];
  const sceneId = `editorial-scene-${crypto.randomUUID()}`;
  const blocks = starterBlocks(sceneId, recipe);
  return {
    background: { type: recipe.sceneType === 'cover' ? 'gradient' : 'color', value: recipe.sceneType === 'cover' ? 'mystic-editorial' : '#0A0A0A' },
    blocks,
    collectionId,
    createdAt: timestamp,
    description: '',
    id: sceneId,
    layout: { compositionId: recipe.sceneType === 'gallery' ? 'feature-lead' : undefined, density: 'balanced', mediaPlacement: recipe.sceneType === 'cover' ? 'background' : 'split' },
    narrativeRole: recipe.narrativeRole,
    order,
    sceneType: recipe.sceneType,
    subtitle: '',
    title: recipe.title,
    transition: { durationMs: 600, type: order === 0 ? 'none' : 'fade' },
    updatedAt: timestamp,
  };
}

export function editorialScenePrompt(scene: EditorialScene) {
  const exact = editorialSceneRecipes.find((recipe) => recipe.sceneType === scene.sceneType);
  if (exact) return exact.prompt;
  if (scene.narrativeRole === 'closing') return 'What should the audience carry with them after this scene?';
  return 'What is the single idea this scene needs to communicate?';
}

export function editorialProjectSuggestion(scene: EditorialScene, project?: ApparelProject) {
  if (!project) return '';
  if (['fabric-story', 'materials'].includes(scene.sceneType)) {
    const linked = project.linkedMaterials?.map((material) => material.materialName).filter(Boolean).slice(0, 3) ?? [];
    return linked.length ? `Material direction: ${linked.join(', ')}.` : '';
  }
  if (['construction', 'process', 'technical'].includes(scene.sceneType)) {
    return project.designIntent || project.summary || '';
  }
  if (['closing', 'credits'].includes(scene.sceneType)) {
    return project.generalNotes || project.summary || '';
  }
  return project.designIntent || project.summary || '';
}

export function getEditorialSceneReadiness(
  scene: EditorialScene,
  context?: { collection?: EditorialCollection; project?: ApparelProject },
): EditorialSceneReadiness {
  const orderedBlocks = [...scene.blocks].sort((left, right) => left.order - right.order);
  const coverVisual = scene.sceneType === 'cover' && Boolean(
    context?.collection?.coverImageId
    || context?.collection?.coverImageUrl
    || context?.project?.heroImage,
  );
  const visual = coverVisual || Boolean(scene.background.imageId || scene.background.imageUrl) || orderedBlocks.some((block) => {
    if (block.type === 'image') return contentAssetId(block) || contentUrl(block);
    if (block.type === 'gallery') return galleryCount(block) > 0;
    if (block.type === 'fabricSwatch' || block.type === 'materials') return true;
    return false;
  });
  const message = Boolean(scene.subtitle?.trim() || scene.description?.trim()) || orderedBlocks.some((block) => {
    if (!['heading', 'paragraph', 'quote', 'callout', 'text'].includes(block.type)) return false;
    return blockText(block).length > 0;
  });
  return {
    message,
    supportingDetail: orderedBlocks.length > 1 || Boolean(scene.fabricIds?.length),
    visual,
  };
}

export function editorialVisualCount(
  scene: EditorialScene,
  context?: { collection?: EditorialCollection; project?: ApparelProject },
) {
  const coverCount = scene.sceneType === 'cover' && Boolean(
    context?.collection?.coverImageId
    || context?.collection?.coverImageUrl
    || context?.project?.heroImage,
  ) ? 1 : 0;
  return scene.blocks.reduce((count, block) => {
    if (block.type === 'image') return count + (contentAssetId(block) || contentUrl(block) ? 1 : 0);
    if (block.type === 'gallery') return count + galleryCount(block);
    return count;
  }, coverCount || scene.background.imageId || scene.background.imageUrl ? 1 : 0);
}

export function editorialCompositionSuggestions(imageCount: number): EditorialCompositionPreset[] {
  if (imageCount <= 1) return [
    { description: 'One image leads with room for narrative copy.', id: 'feature-lead', label: 'Feature Frame', layout: 'feature', mediaPlacement: 'feature' },
    { description: 'A cinematic image fills the scene edge to edge.', id: 'full-bleed', label: 'Full Bleed', layout: 'feature', mediaPlacement: 'background' },
    { description: 'Image and story share the scene with equal weight.', id: 'image-story', label: 'Image + Story', layout: 'feature', mediaPlacement: 'split' },
  ];
  if (imageCount === 2) return [
    { description: 'Two photographs share equal visual weight.', id: 'balanced-diptych', label: 'Balanced Diptych', layout: 'diptych', mediaPlacement: 'split' },
    { description: 'A dominant image is supported by a second detail.', id: 'lead-detail', label: 'Lead + Detail', layout: 'mosaic', mediaPlacement: 'feature' },
    { description: 'A clean vertical rhythm for portrait photography.', id: 'stacked-pair', label: 'Stacked Pair', layout: 'diptych', mediaPlacement: 'stack' },
  ];
  if (imageCount <= 4) return [
    { description: 'A lead image with supporting frames.', id: 'editorial-feature-grid', label: 'Feature Grid', layout: 'mosaic', mediaPlacement: 'feature' },
    { description: 'An even arrangement for comparison and sequence.', id: 'balanced-grid', label: 'Balanced Grid', layout: 'grid', mediaPlacement: 'split' },
    { description: 'A looser rhythm with varied frame sizes.', id: 'story-mosaic', label: 'Story Mosaic', layout: 'mosaic', mediaPlacement: 'stack' },
  ];
  return [
    { description: 'Varied scale creates a campaign-like visual rhythm.', id: 'campaign-mosaic', label: 'Campaign Mosaic', layout: 'mosaic', mediaPlacement: 'feature' },
    { description: 'Every image receives equal documentary weight.', id: 'contact-sheet', label: 'Contact Sheet', layout: 'grid', mediaPlacement: 'split' },
    { description: 'One image leads while the sequence supports it.', id: 'hero-sequence', label: 'Hero Sequence', layout: 'mosaic', mediaPlacement: 'stack' },
  ];
}

function starterBlocks(sceneId: string, recipe: EditorialSceneRecipe): EditorialBlock[] {
  if (recipe.id === 'blank-scene' || recipe.sceneType === 'cover' || recipe.sceneType === 'gallery') return [];
  const heading = createEditorialBlock(sceneId, 'heading', 0);
  const paragraph = createEditorialBlock(sceneId, 'paragraph', 1);
  heading.content = { align: 'left', eyebrow: recipe.title, level: 2, text: recipe.prompt };
  paragraph.content = { align: 'left', text: 'Add the part of the story only you can tell.' };
  return [heading, paragraph];
}

function contentRecord(block: EditorialBlock) {
  return block.content && typeof block.content === 'object' && !Array.isArray(block.content)
    ? block.content as Record<string, unknown>
    : {};
}

function contentAssetId(block: EditorialBlock) {
  const value = contentRecord(block).assetId;
  return typeof value === 'string' ? value : '';
}

function contentUrl(block: EditorialBlock) {
  const value = contentRecord(block).url;
  return typeof value === 'string' ? value : '';
}

function galleryCount(block: EditorialBlock) {
  const images = contentRecord(block).images;
  return Array.isArray(images) ? images.length : 0;
}

function blockText(block: EditorialBlock) {
  const content = contentRecord(block);
  for (const key of ['text', 'body', 'title', 'caption']) {
    const value = content[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}
