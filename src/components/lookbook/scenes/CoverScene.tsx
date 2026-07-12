import { BlockContent, SceneNarrative, themeStyle } from './ScenePrimitives';
import type { EditorialSceneRendererProps } from './types';
import { EditorialPosterArtwork } from '../EditorialPosterArtwork';

export function CoverScene({
  authoring,
  collection,
  fabrics,
  project,
  scene,
  theme,
}: EditorialSceneRendererProps) {
  const sceneCoverCollection = scene.background.imageId || scene.background.imageUrl
    ? {
        ...collection,
        coverImageId: scene.background.imageId || undefined,
        coverImageUrl: scene.background.imageUrl || undefined,
      }
    : collection;
  return (
    <section className="editorial-theme-surface h-full overflow-hidden" data-editorial-theme={theme.id} style={themeStyle(theme)}>
      <EditorialPosterArtwork className="h-full" collection={sceneCoverCollection} project={project} variant="viewer">
        <div className="max-w-4xl">
        <SceneNarrative scene={scene} />
        <BlockContent authoring={authoring} blocks={scene.blocks} fabrics={fabrics} project={project} theme={theme} />
        </div>
      </EditorialPosterArtwork>
    </section>
  );
}
