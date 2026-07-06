import { CircleDot } from 'lucide-react';
import { projectLinkedEditorialFabrics } from '../../../lib/editorialAssets';
import type { EditorialFabricFallback } from '../../../types/editorial';
import type { Fabric, LinkedMaterial } from '../../../types/studio';
import { FabricColorOrb } from '../../fabrics/FabricColorOrb';
import { AdaptiveStoredImage } from '../../shared/AdaptiveStoredImage';
import { BlockContent, EditorialStage, SceneLabel, SceneNarrative, ScenePlaceholder } from './ScenePrimitives';
import type { EditorialSceneRendererProps } from './types';

type FabricCardRecord = {
  fallback?: EditorialFabricFallback;
  fabric?: Fabric;
  material?: LinkedMaterial;
};

export function FabricScene({ collection, fabrics = [], project, scene, theme }: EditorialSceneRendererProps) {
  const linkedFabrics = projectLinkedEditorialFabrics(project, fabrics);
  const cards: Array<FabricCardRecord | undefined> = scene.fabricIds?.length
    ? scene.fabricIds.slice(0, 4).map((fabricId) => {
        const linked = linkedFabrics.find(({ fabric }) => fabric.id === fabricId);
        return linked
          ? { fabric: linked.fabric, material: linked.material }
          : { fallback: scene.fabricFallbacks?.find((item) => item.fabricId === fabricId) };
      })
    : linkedFabrics.slice(0, 4).map(({ fabric, material }) => ({ fabric, material }));
  const visibleCards = cards.length > 0 ? cards : Array.from({ length: 4 }, () => undefined);

  return (
    <EditorialStage collection={collection} project={project} theme={theme}>
      <div className="w-full max-w-6xl">
        <SceneLabel label="Fabric Story" />
        <div className="mt-4 grid gap-7 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
          <div>
            <h2 className="font-display text-[clamp(2.3rem,5vw,5rem)] leading-[1.03]">{scene.title}</h2>
            <SceneNarrative scene={scene} />
            <p className="mt-5 max-w-xl text-base leading-7 text-stardust/64 sm:text-lg">
              {project?.colorStory || 'Materials establish the hand, structure, and atmosphere of the garment.'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {visibleCards.map((record, index) => (
              <FabricStoryCard key={record?.fabric?.id ?? record?.fallback?.fabricId ?? index} record={record} />
            ))}
          </div>
        </div>
        {scene.blocks.length > 0 ? (
          <BlockContent blocks={scene.blocks} fabrics={fabrics} project={project} theme={theme} />
        ) : (
          <ScenePlaceholder label="Material imagery and textile notes can be added in the editor." />
        )}
      </div>
    </EditorialStage>
  );
}

function FabricStoryCard({ record }: { record?: FabricCardRecord }) {
  const fabric = record?.fabric;
  const fallback = record?.fallback;
  const name = fabric?.name ?? fallback?.name;
  const composition = fabric?.composition ?? fallback?.composition;
  const unavailable = !fabric && Boolean(fallback);
  const orbFabric = fabric ?? {
    colorFamily: fallback?.name ?? 'Bronze',
    primaryColor: fallback?.name ?? '',
    primaryColorHex: fallback?.colorHex,
  };

  return (
    <article className="editorial-theme-card relative min-h-32 overflow-hidden border p-4 sm:min-h-40 sm:p-5">
      {fabric?.image ? (
        <div className="absolute inset-0 opacity-28">
          <AdaptiveStoredImage asset={fabric.image} mode="compact" />
        </div>
      ) : null}
      <div className="relative z-10">
        {name ? (
          <FabricColorOrb className="h-8 w-8" fabric={orbFabric} label={`${name} color`} />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--editorial-accent)]/40 bg-midnight/40 text-[var(--editorial-accent)]"><CircleDot size={15} /></span>
        )}
        <p className="mt-4 text-sm font-semibold sm:text-base">{name ?? 'Material study'}</p>
        <p className="mt-1 text-xs text-stardust/48">{record?.material?.role ?? composition ?? 'Awaiting material notes'}</p>
        {composition && record?.material?.role ? <p className="mt-1 text-[0.68rem] text-stardust/36">{composition}</p> : null}
        {unavailable ? <p className="mt-2 text-[0.58rem] uppercase tracking-[0.14em] text-amber-200/62">Source unavailable</p> : null}
      </div>
    </article>
  );
}
