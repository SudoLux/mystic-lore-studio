import { Ruler } from 'lucide-react';
import { formatStudioDate } from '../../../lib/dates';
import { BlockContent, EditorialStage, SceneLabel, SceneNarrative, ScenePlaceholder } from './ScenePrimitives';
import type { EditorialSceneRendererProps } from './types';

export function TechnicalScene({ collection, project, scene, theme }: EditorialSceneRendererProps) {
  const details = [
    ['Garment', project?.garmentType ?? 'Not specified'],
    ['Phase', project?.phase ?? 'Not specified'],
    ['Difficulty', project?.difficulty ?? 'Not specified'],
    ['Progress', project ? `${project.progress}%` : 'Not specified'],
    ['Target', formatStudioDate(project?.targetDate, { day: 'numeric', month: 'short', year: 'numeric' }, 'Not scheduled')],
    ['Materials', `${project?.linkedMaterials.length ?? 0} linked`],
  ];

  return (
    <EditorialStage collection={collection} project={project} theme={theme}>
      <div className="w-full max-w-6xl">
        <SceneLabel label="Technical" />
        <div className="mt-4 grid gap-7 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
          <div>
            <Ruler className="text-[var(--editorial-accent)]" size={25} />
            <h2 className="font-display mt-5 text-[clamp(2.3rem,5vw,5rem)] leading-[1.02]">{scene.title}</h2>
            <SceneNarrative scene={scene} />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
            {details.map(([label, value]) => (
              <div className="editorial-theme-card border p-4" key={label}>
                <p className="text-[0.6rem] uppercase tracking-[0.16em] text-stardust/38">{label}</p>
                <p className="mt-2 text-sm font-semibold text-stardust sm:text-base">{value}</p>
              </div>
            ))}
          </div>
        </div>
        {scene.blocks.length > 0 ? <BlockContent blocks={scene.blocks} theme={theme} /> : <ScenePlaceholder label="Specifications and technical blocks will appear here." />}
      </div>
    </EditorialStage>
  );
}
