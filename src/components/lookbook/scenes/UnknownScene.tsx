import { Layers3 } from 'lucide-react';
import { BlockContent, EditorialStage, SceneLabel, SceneNarrative, ScenePlaceholder } from './ScenePrimitives';
import type { EditorialSceneRendererProps } from './types';

export function UnknownScene({ collection, project, scene, theme }: EditorialSceneRendererProps) {
  return (
    <EditorialStage collection={collection} project={project} theme={theme}>
      <div className="mx-auto max-w-3xl text-center">
        <Layers3 className="mx-auto text-[var(--editorial-accent)]" size={26} />
        <SceneLabel label="Editorial Scene" />
        <h2 className="font-display mt-5 text-[clamp(2.3rem,6vw,5rem)] leading-[1.04]">{scene.title}</h2>
        <SceneNarrative centered scene={scene} />
        {scene.blocks.length > 0 ? (
          <BlockContent blocks={scene.blocks} prominent theme={theme} />
        ) : (
          <ScenePlaceholder label="This scene type is ready for a future renderer." />
        )}
      </div>
    </EditorialStage>
  );
}
