import { cn } from '../../../lib/classes';
import type { LocalImageAsset } from '../../../types/studio';
import { AdaptiveProjectImage } from '../../projects/AdaptiveProjectImage';
import { BlockContent, projectImages, SceneLabel, SceneNarrative, themeStyle } from './ScenePrimitives';
import type { EditorialSceneRendererProps } from './types';

export function GalleryScene({ authoring, collection, fabrics, project, scene, theme }: EditorialSceneRendererProps) {
  const orderedBlocks = [...scene.blocks].sort((left, right) => left.order - right.order);
  const hasConfiguredMedia = orderedBlocks.some((block) => {
    if (block.type === 'image') return Boolean(record(block.content).assetId || record(block.content).url);
    if (block.type === 'gallery') return Array.isArray(record(block.content).images) && (record(block.content).images as unknown[]).length > 0;
    return false;
  });
  const fallbackImages = projectImages(project, collection).slice(0, 6);

  return (
    <section
      className="editorial-theme-surface editorial-scene-frame relative h-full overflow-y-auto bg-[var(--editorial-background)]"
      data-editorial-theme={theme.id}
      style={themeStyle(theme)}
    >
      <div className="mx-auto flex min-h-full max-w-7xl flex-col">
        <div className="mb-4 flex shrink-0 items-end justify-between gap-4 sm:mb-6">
          <div>
            <SceneLabel label="Gallery" />
            <h2 className="font-display mt-2 text-2xl sm:text-4xl">{scene.title}</h2>
            <SceneNarrative scene={scene} />
          </div>
          <span className="text-xs text-stardust/38">{hasConfiguredMedia ? 'Composed media' : `${fallbackImages.length} project images`}</span>
        </div>

        {hasConfiguredMedia ? (
          <BlockContent authoring={authoring} blocks={orderedBlocks} fabrics={fabrics} project={project} theme={theme} />
        ) : (
          <FallbackGallery images={fallbackImages} />
        )}
      </div>
    </section>
  );
}

function FallbackGallery({ images }: { images: LocalImageAsset[] }) {
  const visible = images.length ? images.slice(0, 3) : Array.from({ length: 3 }, () => undefined);
  return (
    <div className="grid min-h-[18rem] flex-1 grid-cols-2 grid-rows-2 gap-2 sm:gap-3 lg:grid-cols-[1.5fr_.75fr_.75fr] lg:grid-rows-1">
      {visible.map((image, index) => (
        <div className={cn('relative min-h-0 overflow-hidden rounded-lg border border-stardust/12 bg-[linear-gradient(145deg,rgba(27,58,99,.32),rgba(10,10,10,.92),rgba(154,108,60,.26))]', index === 0 ? 'row-span-2 lg:row-span-1' : '')} key={image?.id ?? index}>
          {image ? <AdaptiveProjectImage asset={image} className="absolute inset-0" mode="primary" /> : null}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_50%,rgba(5,5,5,.5))]" />
          {!image ? <span className="absolute left-4 top-4 text-[0.58rem] uppercase tracking-[0.18em] text-stardust/38">Add image {index + 1}</span> : null}
        </div>
      ))}
    </div>
  );
}

function record(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
