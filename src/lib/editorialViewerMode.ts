import type {
  EditorialBlock,
  EditorialCollection,
  EditorialScene,
  EditorialViewerMode,
} from '../types/editorial';

export type EditorialBookSpreadLayout =
  | 'fabric'
  | 'full-bleed'
  | 'gallery'
  | 'image-text'
  | 'technical'
  | 'text-image'
  | 'typographic';

export type EditorialBookSpreadDescriptor = {
  layout: EditorialBookSpreadLayout;
  mediaBlocks: EditorialBlock[];
  narrativeBlocks: EditorialBlock[];
  pageCount: 1 | 2;
  scene: EditorialScene;
};

const mediaBlockTypes = new Set(['gallery', 'image']);
const dataBlockTypes = new Set(['fabricSwatch', 'materials', 'measurementTable', 'specifications']);

export function normalizeEditorialViewerMode(
  collection?: Pick<EditorialCollection, 'viewerMode'>,
): EditorialViewerMode {
  return collection?.viewerMode === 'book' ? 'book' : 'editorial';
}

export function resolveEditorialBookSpread(
  scene: EditorialScene,
  sceneIndex: number,
): EditorialBookSpreadDescriptor {
  const blocks = [...scene.blocks].sort((a, b) => a.order - b.order);
  const mediaBlocks = blocks.filter((block) => mediaBlockTypes.has(block.type));
  const dataBlocks = blocks.filter((block) => dataBlockTypes.has(block.type));
  const narrativeBlocks = blocks.filter(
    (block) => !mediaBlockTypes.has(block.type) && !dataBlockTypes.has(block.type),
  );

  if (['cover', 'closing', 'credits'].includes(scene.sceneType)) {
    return { layout: 'full-bleed', mediaBlocks: [], narrativeBlocks: blocks, pageCount: 1, scene };
  }
  if (['gallery', 'look', 'detail'].includes(scene.sceneType)) {
    return { layout: 'gallery', mediaBlocks, narrativeBlocks: [...narrativeBlocks, ...dataBlocks], pageCount: 2, scene };
  }
  if (['fabric-story', 'materials'].includes(scene.sceneType)) {
    return { layout: 'fabric', mediaBlocks, narrativeBlocks: [...narrativeBlocks, ...dataBlocks], pageCount: 2, scene };
  }
  if (['construction', 'process', 'technical'].includes(scene.sceneType)) {
    return { layout: 'technical', mediaBlocks, narrativeBlocks: [...narrativeBlocks, ...dataBlocks], pageCount: 2, scene };
  }
  if (mediaBlocks.length > 0) {
    return {
      layout: sceneIndex % 2 === 0 ? 'image-text' : 'text-image',
      mediaBlocks,
      narrativeBlocks: [...narrativeBlocks, ...dataBlocks],
      pageCount: 2,
      scene,
    };
  }
  return { layout: 'typographic', mediaBlocks: [], narrativeBlocks: blocks, pageCount: 2, scene };
}
