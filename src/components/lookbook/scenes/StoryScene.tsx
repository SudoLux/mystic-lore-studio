import { BlockContent, EditorialStage, SceneLabel, SceneNarrative, ScenePlaceholder } from './ScenePrimitives';
import type { EditorialSceneRendererProps } from './types';

export function StoryScene({ authoring, collection, fabrics, project, scene, theme }: EditorialSceneRendererProps) {
  return (
    <EditorialStage collection={collection} project={project} scene={scene} theme={theme}>
      <div className="grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
        <div>
          <SceneLabel label="Story" />
          <h2 className="font-display mt-5 text-[clamp(2.4rem,6vw,5.5rem)] leading-[1.03]">{scene.title}</h2>
          <SceneNarrative scene={scene} />
        </div>
        <div className="border-l border-[var(--editorial-accent)]/30 pl-5 sm:pl-8">
          {scene.blocks.length > 0 ? (
            <BlockContent authoring={authoring} blocks={scene.blocks} fabrics={fabrics} project={project} prominent theme={theme} />
          ) : (
            <>
              <p className="text-lg leading-8 text-stardust/76 sm:text-2xl sm:leading-10">
                {scene.title.toLowerCase().includes('inspiration')
                  ? project?.designIntent || collection.description
                  : collection.description || project?.summary}
              </p>
              <ScenePlaceholder label="Story copy and supporting notes will appear here." />
            </>
          )}
        </div>
      </div>
    </EditorialStage>
  );
}
