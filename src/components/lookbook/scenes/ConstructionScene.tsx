import { Scissors } from 'lucide-react';
import { BlockContent, EditorialStage, SceneLabel, SceneNarrative } from './ScenePrimitives';
import type { EditorialSceneRendererProps } from './types';

export function ConstructionScene({ collection, project, scene, theme }: EditorialSceneRendererProps) {
  const tasks = project?.tasks
    .filter((task) => ['Pattern', 'Cutting', 'Sewing', 'Fitting', 'Revision'].includes(task.category))
    .slice(0, 4) ?? [];
  const cards = tasks.length > 0 ? tasks : ['Pattern', 'Cutting', 'Assembly', 'Fitting'];

  return (
    <EditorialStage collection={collection} project={project} theme={theme}>
      <div className="w-full max-w-6xl">
        <SceneLabel label="Construction" />
        <h2 className="font-display mt-4 text-[clamp(2.4rem,5vw,5rem)] leading-none">{scene.title}</h2>
        <SceneNarrative scene={scene} />
        <div className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3">
          {cards.map((task, index) => (
            <div className="rounded-xl border border-bronze/24 bg-[linear-gradient(145deg,rgba(237,227,207,.045),rgba(10,10,10,.52))] p-4 sm:p-5" key={typeof task === 'string' ? task : task.id}>
              <div className="flex items-center justify-between text-[var(--editorial-accent)]">
                <Scissors size={16} />
                <span className="text-[0.62rem] tracking-[0.14em]">0{index + 1}</span>
              </div>
              <p className="mt-5 text-sm font-semibold">{typeof task === 'string' ? task : task.title}</p>
              <p className="mt-2 text-xs leading-5 text-stardust/42">{typeof task === 'string' ? 'Process notes ready to be added.' : task.status}</p>
            </div>
          ))}
        </div>
        {scene.blocks.length > 0 ? <BlockContent blocks={scene.blocks} theme={theme} /> : null}
      </div>
    </EditorialStage>
  );
}
