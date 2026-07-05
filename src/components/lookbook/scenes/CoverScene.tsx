import { BlockContent, themeStyle } from './ScenePrimitives';
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
      className="relative flex h-full items-end overflow-hidden px-5 pb-28 pt-28 sm:px-9 sm:pb-32 lg:px-[7vw] lg:pb-[14vh]"
      style={themeStyle(theme)}
    >
      <EditorialCollectionCover className="absolute inset-0" collection={collection} project={project} />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,5,5,.48),transparent_60%),linear-gradient(180deg,rgba(5,5,5,.12),transparent_35%,rgba(5,5,5,.76))]" />
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
        <BlockContent blocks={scene.blocks} theme={theme} />
      </div>
    </section>
  );
}
