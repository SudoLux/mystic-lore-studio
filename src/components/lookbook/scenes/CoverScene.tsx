import { BlockContent, SceneNarrative, themeStyle } from './ScenePrimitives';
import type { EditorialSceneRendererProps } from './types';
import { EditorialPosterArtwork } from '../EditorialPosterArtwork';

export function CoverScene({
  collection,
  fabrics,
  project,
  scene,
  theme,
}: EditorialSceneRendererProps) {
  return (
    <section className="editorial-theme-surface h-full overflow-hidden" data-editorial-theme={theme.id} style={themeStyle(theme)}>
      <EditorialPosterArtwork className="h-full" collection={collection} project={project} variant="viewer">
        <div className="max-w-4xl">
        <SceneNarrative scene={scene} />
        <BlockContent blocks={scene.blocks} fabrics={fabrics} project={project} theme={theme} />
        </div>
      </EditorialPosterArtwork>
    </section>
  );
}
