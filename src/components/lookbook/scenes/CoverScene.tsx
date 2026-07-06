import { BlockContent, SceneNarrative, themeStyle } from './ScenePrimitives';
import type { EditorialSceneRendererProps } from './types';
import { EditorialCollectionCover } from '../EditorialCollectionCover';

export function CoverScene({
  collection,
  project,
  scene,
  theme,
}: EditorialSceneRendererProps) {
  return (
    <section
      className="editorial-theme-surface editorial-scene-frame relative flex h-full items-end overflow-hidden"
      data-editorial-theme={theme.id}
      style={themeStyle(theme)}
    >
      <EditorialCollectionCover className="absolute inset-0" collection={collection} project={project} />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--editorial-background)_48%,transparent),transparent_60%),linear-gradient(180deg,color-mix(in_srgb,var(--editorial-background)_12%,transparent),transparent_35%,color-mix(in_srgb,var(--editorial-background)_76%,transparent))]" />
      <div className="relative z-10 max-w-4xl">
        <p className="text-[0.64rem] font-semibold uppercase tracking-[0.3em] text-[var(--editorial-accent)] sm:text-xs">
          Mystic Lore Editorial Collection
        </p>
        <h1 className="font-display mt-5 max-w-4xl text-[clamp(2.4rem,8vw,6.8rem)] leading-[0.98] text-stardust [text-shadow:0_8px_42px_rgba(0,0,0,.65)]">
          {collection.title}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-stardust/72 sm:text-xl sm:leading-8">
          {collection.subtitle || project?.name}
        </p>
        <SceneNarrative scene={scene} />
        <BlockContent blocks={scene.blocks} theme={theme} />
      </div>
    </section>
  );
}
