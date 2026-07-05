import { CircleDot } from 'lucide-react';
import type { LinkedMaterial } from '../../../types/studio';
import { BlockContent, EditorialStage, SceneLabel, ScenePlaceholder } from './ScenePrimitives';
import type { EditorialSceneRendererProps } from './types';

export function FabricScene({ collection, project, scene, theme }: EditorialSceneRendererProps) {
  const materials = project?.linkedMaterials.slice(0, 4) ?? [];
  const cards: Array<LinkedMaterial | undefined> = materials.length > 0
    ? materials
    : Array.from({ length: 4 }, () => undefined);

  return (
    <EditorialStage collection={collection} project={project} theme={theme}>
      <div className="w-full max-w-6xl">
        <SceneLabel label="Fabric Story" />
        <div className="mt-4 grid gap-7 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
          <div>
            <h2 className="font-display text-[clamp(2.3rem,5vw,5rem)] leading-[1.03]">{scene.title}</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-stardust/64 sm:text-lg">
              {project?.colorStory || 'Materials establish the hand, structure, and atmosphere of the garment.'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {cards.map((material, index) => (
              <div className="min-h-28 rounded-xl border border-bronze/25 bg-midnight/44 p-4 backdrop-blur-xl sm:min-h-36 sm:p-5" key={material?.id ?? index}>
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--editorial-accent)]/40 bg-midnight/40 text-[var(--editorial-accent)]">
                  <CircleDot size={15} />
                </span>
                <p className="mt-4 text-sm font-semibold sm:text-base">{material?.materialName ?? `Material study ${index + 1}`}</p>
                <p className="mt-1 text-xs text-stardust/42">{material?.role ?? 'Awaiting material notes'}</p>
              </div>
            ))}
          </div>
        </div>
        {scene.blocks.length > 0 ? <BlockContent blocks={scene.blocks} theme={theme} /> : <ScenePlaceholder label="Material imagery and textile notes can be added in the editor." />}
      </div>
    </EditorialStage>
  );
}
