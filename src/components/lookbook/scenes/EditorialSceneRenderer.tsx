import type { ComponentType } from 'react';
import type { EditorialSceneType } from '../../../types/editorial';
import { ClosingScene } from './ClosingScene';
import { ConstructionScene } from './ConstructionScene';
import { CoverScene } from './CoverScene';
import { FabricScene } from './FabricScene';
import { GalleryScene } from './GalleryScene';
import { StoryScene } from './StoryScene';
import { TechnicalScene } from './TechnicalScene';
import type { EditorialSceneRendererProps } from './types';
import { UnknownScene } from './UnknownScene';

const sceneRenderers: Partial<
  Record<EditorialSceneType, ComponentType<EditorialSceneRendererProps>>
> = {
  closing: ClosingScene,
  construction: ConstructionScene,
  cover: CoverScene,
  credits: ClosingScene,
  detail: GalleryScene,
  'fabric-story': FabricScene,
  gallery: GalleryScene,
  look: GalleryScene,
  materials: FabricScene,
  opening: StoryScene,
  process: ConstructionScene,
  story: StoryScene,
  technical: TechnicalScene,
};

export function EditorialSceneRenderer(props: EditorialSceneRendererProps) {
  const Renderer = sceneRenderers[props.scene.sceneType] ?? UnknownScene;
  return <Renderer {...props} />;
}
