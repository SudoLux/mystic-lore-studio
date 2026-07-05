import { Sparkles } from 'lucide-react';
import { BlockContent, EditorialStage, SceneLabel } from './ScenePrimitives';
import type { EditorialSceneRendererProps } from './types';

export function ClosingScene({ collection, project, scene, theme }: EditorialSceneRendererProps) {
  return (
    <EditorialStage collection={collection} project={project} theme={theme}>
      <div className="mx-auto max-w-4xl text-center">
        <Sparkles className="mx-auto text-[var(--editorial-accent)]" size={24} />
        <SceneLabel label="Closing" />
        <h2 className="font-display mt-5 text-[clamp(2.5rem,7vw,6rem)] leading-[1]">{scene.title}</h2>
        {scene.blocks.length > 0 ? (
          <BlockContent blocks={scene.blocks} prominent theme={theme} />
        ) : (
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-stardust/64 sm:text-xl">
            {project?.generalNotes || collection.description || 'The garment story continues beyond the final frame.'}
          </p>
        )}
        <p className="mt-9 text-[0.62rem] uppercase tracking-[0.28em] text-[var(--editorial-accent)] opacity-75">Mystic Lore Studio</p>
      </div>
    </EditorialStage>
  );
}
