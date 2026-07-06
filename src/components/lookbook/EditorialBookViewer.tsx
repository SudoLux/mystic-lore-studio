import { BookOpen, CircleDot, Ruler, Scissors } from 'lucide-react';
import type { ReactNode } from 'react';
import { projectEditorialImages, projectLinkedEditorialFabrics } from '../../lib/editorialAssets';
import type { EditorialBookSpreadDescriptor } from '../../lib/editorialViewerMode';
import type { EditorialCollection, EditorialTheme } from '../../types/editorial';
import type { ApparelProject, Fabric } from '../../types/studio';
import { FabricColorOrb } from '../fabrics/FabricColorOrb';
import { AdaptiveProjectImage } from '../projects/AdaptiveProjectImage';
import { AdaptiveStoredImage } from '../shared/AdaptiveStoredImage';
import { EditorialBlockList } from './blocks/EditorialBlockRenderer';
import { EditorialSceneRenderer } from './scenes/EditorialSceneRenderer';
import { SceneLabel, SceneNarrative, themeStyle } from './scenes/ScenePrimitives';

type EditorialBookViewerProps = {
  collection: EditorialCollection;
  descriptor: EditorialBookSpreadDescriptor;
  fabrics?: Fabric[];
  isSinglePage: boolean;
  pageIndex: number;
  project?: ApparelProject;
  theme: EditorialTheme;
};

export function EditorialBookViewer({
  collection,
  descriptor,
  fabrics = [],
  isSinglePage,
  pageIndex,
  project,
  theme,
}: EditorialBookViewerProps) {
  if (descriptor.layout === 'full-bleed') {
    return (
      <div className="editorial-book-full-bleed h-full w-full">
        <EditorialSceneRenderer collection={collection} fabrics={fabrics} project={project} scene={descriptor.scene} theme={theme} />
      </div>
    );
  }

  const mediaFirst = descriptor.layout === 'image-text';
  const typographicSplit = Math.max(1, Math.ceil(descriptor.narrativeBlocks.length / 2));
  const left = descriptor.layout === 'typographic'
    ? <NarrativePage blocks={descriptor.narrativeBlocks.slice(0, typographicSplit)} descriptor={descriptor} fabrics={fabrics} project={project} theme={theme} />
    : mediaFirst
      ? <MediaPage collection={collection} descriptor={descriptor} fabrics={fabrics} project={project} theme={theme} />
      : <NarrativePage descriptor={descriptor} fabrics={fabrics} project={project} theme={theme} />;
  const right = descriptor.layout === 'typographic'
    ? <NarrativePage blocks={descriptor.narrativeBlocks.slice(typographicSplit)} descriptor={descriptor} fabrics={fabrics} project={project} showTitle={false} theme={theme} />
    : mediaFirst
      ? <NarrativePage descriptor={descriptor} fabrics={fabrics} project={project} theme={theme} />
      : <MediaPage collection={collection} descriptor={descriptor} fabrics={fabrics} project={project} theme={theme} />;

  return (
    <section
      className="editorial-book-stage editorial-theme-surface relative flex h-full items-center justify-center overflow-hidden"
      data-editorial-theme={theme.id}
      style={themeStyle(theme)}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,color-mix(in_srgb,var(--editorial-accent)_16%,transparent),transparent_30%),linear-gradient(145deg,var(--editorial-background),var(--editorial-surface))]" />
      <div
        className="editorial-book-spread relative z-10"
        data-active-page={pageIndex}
        data-single-page={isSinglePage ? 'true' : 'false'}
      >
        <BookPage active={!isSinglePage || pageIndex === 0} pageNumber={1} side="left">{left}</BookPage>
        <BookPage active={!isSinglePage || pageIndex === 1} pageNumber={2} side="right">{right}</BookPage>
        <span aria-hidden="true" className="editorial-book-gutter" />
      </div>
    </section>
  );
}

function BookPage({ active, children, pageNumber, side }: { active: boolean; children: ReactNode; pageNumber: number; side: 'left' | 'right' }) {
  return (
    <article
      aria-hidden={!active}
      className="editorial-book-page"
      data-active={active ? 'true' : 'false'}
      data-side={side}
    >
      <div className="editorial-book-page-content studio-scrollbar">{children}</div>
      <span className="editorial-book-page-number">{String(pageNumber).padStart(2, '0')}</span>
    </article>
  );
}

function NarrativePage({ blocks, descriptor, fabrics, project, showTitle = true, theme }: Pick<EditorialBookViewerProps, 'descriptor' | 'fabrics' | 'project' | 'theme'> & { blocks?: EditorialBookSpreadDescriptor['narrativeBlocks']; showTitle?: boolean }) {
  const { scene } = descriptor;
  const visibleBlocks = blocks ?? descriptor.narrativeBlocks;
  return (
    <div className="flex min-h-full flex-col justify-center">
      {showTitle ? <><SceneLabel label="Editorial Spread" /><h2 className="font-display mt-5 text-[clamp(2rem,4vw,4.5rem)] leading-[1.04]">{scene.title}</h2><SceneNarrative scene={scene} /></> : <SceneLabel label="Continued" />}
      {visibleBlocks.length > 0 ? (
        <EditorialBlockList
          blocks={visibleBlocks}
          className="mt-7 flex flex-col gap-[var(--editorial-content-gap)]"
          fabrics={fabrics}
          project={project}
          theme={theme}
        />
      ) : (
        <div className="mt-7 max-w-xl">
          <p className="font-display text-[clamp(1.5rem,3vw,2.8rem)] leading-[1.18] text-stardust/82">{showTitle ? 'A story taking shape.' : 'The garment continues beyond the page.'}</p>
          <p className="mt-5 text-sm leading-7 text-stardust/54">{project?.designIntent || project?.summary || 'This spread is ready for its next editorial detail.'}</p>
        </div>
      )}
    </div>
  );
}

function MediaPage({ collection, descriptor, fabrics, project, theme }: Pick<EditorialBookViewerProps, 'collection' | 'descriptor' | 'fabrics' | 'project' | 'theme'>) {
  if (descriptor.layout === 'fabric') return <FabricSpreadPage descriptor={descriptor} fabrics={fabrics} project={project} />;
  if (descriptor.layout === 'technical') return <TechnicalSpreadPage descriptor={descriptor} project={project} />;

  if (descriptor.mediaBlocks.length > 0) {
    return (
      <EditorialBlockList
        blocks={descriptor.mediaBlocks}
        className="flex min-h-full flex-col justify-center gap-3"
        fabrics={fabrics}
        project={project}
        theme={theme}
      />
    );
  }

  const images = projectEditorialImages(project);
  if (descriptor.layout === 'gallery') {
    const visible = images.slice(0, 4);
    return (
      <div className="grid min-h-full grid-cols-2 grid-rows-2 gap-2">
        {(visible.length ? visible : Array.from({ length: 4 }, () => undefined)).map((image, index) => (
          <div className="relative overflow-hidden rounded-md border border-stardust/10 bg-midnight/36" key={image?.id ?? index}>
            {image ? <AdaptiveProjectImage asset={image} className="absolute inset-0" mode="compact" /> : <BookMediaPlaceholder />}
          </div>
        ))}
      </div>
    );
  }

  const image = images.find((item) => item.id === collection.coverImageId) ?? images[0];
  return (
    <div className="relative min-h-full overflow-hidden rounded-md border border-stardust/10 bg-midnight/36">
      {image ? <AdaptiveProjectImage asset={image} className="absolute inset-0" mode="primary" /> : <BookMediaPlaceholder />}
    </div>
  );
}

function FabricSpreadPage({ descriptor, fabrics = [], project }: Pick<EditorialBookViewerProps, 'descriptor' | 'fabrics' | 'project'>) {
  const linked = projectLinkedEditorialFabrics(project, fabrics);
  const selectedIds = descriptor.scene.fabricIds?.slice(0, 4);
  const records = selectedIds?.length
    ? selectedIds.map((id) => linked.find(({ fabric }) => fabric.id === id)).filter(Boolean)
    : linked.slice(0, 4);
  return (
    <div className="grid min-h-full grid-cols-2 gap-2 content-center">
      {(records.length ? records : Array.from({ length: 4 }, () => undefined)).map((record, index) => (
        <article className="editorial-theme-card relative min-h-36 overflow-hidden border p-4" key={record?.fabric.id ?? index}>
          {record?.fabric.image ? <div className="absolute inset-0 opacity-24"><AdaptiveStoredImage asset={record.fabric.image} mode="compact" /></div> : null}
          <div className="relative z-10">
            {record ? <FabricColorOrb className="h-8 w-8" fabric={record.fabric} label={`${record.fabric.name} color`} /> : <CircleDot className="text-[var(--editorial-accent)]" size={22} />}
            <h3 className="mt-5 text-sm font-semibold">{record?.fabric.name ?? 'Material study'}</h3>
            <p className="mt-2 text-xs leading-5 text-stardust/45">{record?.material.role ?? record?.fabric.composition ?? 'Awaiting textile notes'}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function TechnicalSpreadPage({ descriptor, project }: Pick<EditorialBookViewerProps, 'descriptor' | 'project'>) {
  const construction = ['construction', 'process'].includes(descriptor.scene.sceneType);
  const rows = construction
    ? (project?.tasks.slice(0, 6).map((task) => [task.title, task.status]) ?? [])
    : [
        ['Garment', project?.garmentType ?? 'Not specified'],
        ['Phase', project?.phase ?? 'Not specified'],
        ['Difficulty', project?.difficulty ?? 'Not specified'],
        ['Progress', project ? `${project.progress}%` : 'Not specified'],
        ['Materials', `${project?.linkedMaterials.length ?? 0} linked`],
        ['Season', project?.season ?? 'Not specified'],
      ];
  const Icon = construction ? Scissors : Ruler;
  return (
    <div className="flex min-h-full flex-col justify-center">
      <Icon className="text-[var(--editorial-accent)]" size={24} />
      <p className="mt-4 text-[0.62rem] uppercase tracking-[0.2em] text-[var(--editorial-accent)]">{construction ? 'Construction Ledger' : 'Technical Record'}</p>
      <div className="mt-6 grid grid-cols-2 gap-2">
        {(rows.length ? rows : [['Process', 'Ready for notes']]).map(([label, value], index) => (
          <div className="editorial-theme-card border p-4" key={`${label}-${index}`}>
            <p className="text-[0.58rem] uppercase tracking-[0.14em] text-stardust/38">{label}</p>
            <p className="mt-2 text-sm font-semibold">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BookMediaPlaceholder() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_35%_25%,color-mix(in_srgb,var(--editorial-accent)_22%,transparent),transparent_30%),linear-gradient(145deg,var(--editorial-surface),var(--editorial-background))] text-center">
      <BookOpen className="text-[var(--editorial-accent)] opacity-60" size={28} />
      <span className="mt-3 text-[0.6rem] uppercase tracking-[0.2em] text-stardust/36">Image study</span>
    </div>
  );
}
