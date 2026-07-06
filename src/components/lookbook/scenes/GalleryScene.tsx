import { cn } from '../../../lib/classes';
import type { LocalImageAsset } from '../../../types/studio';
import { AdaptiveProjectImage } from '../../projects/AdaptiveProjectImage';
import { BlockContent, projectImages, SceneLabel, SceneNarrative, themeStyle } from './ScenePrimitives';
import type { EditorialSceneRendererProps } from './types';

export function GalleryScene({ collection, fabrics, project, scene, theme }: EditorialSceneRendererProps) {
  const images = projectImages(project, collection);
  return (
    <section
      className="editorial-theme-surface editorial-scene-frame relative h-full overflow-hidden bg-[var(--editorial-background)]"
      data-editorial-theme={theme.id}
      style={themeStyle(theme)}
    >
      <div className="mx-auto flex h-full max-w-7xl flex-col">
        <div className="mb-4 flex items-end justify-between gap-4 sm:mb-6">
          <div>
            <SceneLabel label="Gallery" />
            <h2 className="font-display mt-2 text-2xl sm:text-4xl">{scene.title}</h2>
            <SceneNarrative scene={scene} />
          </div>
          <span className="text-xs text-stardust/38">{images.length} project images</span>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2 sm:gap-3 lg:grid-cols-[1.5fr_.75fr_.75fr] lg:grid-rows-1">
          {[0, 1, 2].map((index) => (
            <GalleryFrame image={images[index]} index={index} key={index} />
          ))}
        </div>
        {scene.blocks.length > 0 ? <BlockContent blocks={scene.blocks} fabrics={fabrics} project={project} theme={theme} /> : null}
      </div>
    </section>
  );
}

function GalleryFrame({ image, index }: { image?: LocalImageAsset; index: number }) {
  return (
    <div className={cn(
      'relative min-h-0 overflow-hidden rounded-lg border border-stardust/12 bg-[linear-gradient(145deg,rgba(27,58,99,.32),rgba(10,10,10,.92),rgba(154,108,60,.26))]',
      index === 0 ? 'row-span-2 lg:row-span-1' : '',
    )}>
      {image ? <AdaptiveProjectImage asset={image} className="absolute inset-0" mode="primary" /> : null}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_50%,rgba(5,5,5,.5))]" />
      {!image ? (
        <span className="absolute left-4 top-4 text-[0.58rem] uppercase tracking-[0.18em] text-stardust/38">Image {index + 1}</span>
      ) : null}
    </div>
  );
}
