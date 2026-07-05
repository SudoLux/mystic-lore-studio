import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Layers3,
  Ruler,
  Scissors,
  Sparkles,
} from 'lucide-react';
import { cn } from '../../lib/classes';
import { formatStudioDate } from '../../lib/dates';
import type {
  EditorialBlock,
  EditorialCollection,
  EditorialScene,
} from '../../types/editorial';
import type { ApparelProject, LinkedMaterial, LocalImageAsset } from '../../types/studio';
import { AdaptiveProjectImage } from '../projects/AdaptiveProjectImage';
import { EditorialCollectionCover } from './EditorialCollectionCover';

type ViewerSceneType =
  | 'cover'
  | 'story'
  | 'gallery'
  | 'fabric-story'
  | 'construction'
  | 'technical'
  | 'closing';

type EditorialCollectionViewerProps = {
  collection: EditorialCollection;
  onClose: () => void;
  project?: ApparelProject;
};

export function EditorialCollectionViewer({
  collection,
  onClose,
  project,
}: EditorialCollectionViewerProps) {
  const scenes = useMemo(
    () => [...collection.scenes].sort((a, b) => a.order - b.order),
    [collection.scenes],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<'back' | 'forward'>('forward');
  const activeScene = scenes[activeIndex];

  const goTo = useCallback((nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= scenes.length || nextIndex === activeIndex) return;
    setDirection(nextIndex > activeIndex ? 'forward' : 'back');
    setActiveIndex(nextIndex);
  }, [activeIndex, scenes.length]);

  const previous = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);
  const next = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        previous();
      } else if (event.key === 'ArrowRight' || event.key === ' ') {
        event.preventDefault();
        next();
      } else if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [next, onClose, previous]);

  return createPortal(
    <div className="fixed inset-0 z-[170] overflow-hidden bg-[#050505] text-stardust">
      <header className="absolute inset-x-0 top-0 z-40 flex items-center gap-3 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 sm:pt-5 lg:px-7">
        <button
          aria-label="Exit editorial collection"
          className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-stardust/16 bg-midnight/62 px-3 text-sm text-stardust/78 shadow-[0_12px_36px_rgba(0,0,0,.32)] backdrop-blur-xl transition hover:border-ember/50 hover:text-stardust sm:px-4"
          onClick={onClose}
          type="button"
        >
          <ArrowLeft aria-hidden="true" size={17} />
          <span className="hidden sm:inline">Exit</span>
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-stardust/42">
            {collection.title}
          </p>
          <p className="mt-1 truncate text-xs text-stardust/68">
            {activeScene?.title ?? 'Collection'}
          </p>
        </div>
        <div className="flex h-11 min-w-14 shrink-0 items-center justify-center rounded-full border border-stardust/14 bg-midnight/52 px-3 text-xs tabular-nums text-stardust/68 backdrop-blur-xl">
          {scenes.length > 0 ? `${activeIndex + 1} / ${scenes.length}` : '0 / 0'}
        </div>
      </header>

      <div className="absolute inset-x-3 top-[4.55rem] z-40 flex gap-1.5 sm:inset-x-6 sm:top-[5.2rem] lg:inset-x-8">
        {scenes.map((scene, index) => (
          <button
            aria-label={`Go to scene ${index + 1}: ${scene.title}`}
            className="group h-5 flex-1 py-2"
            key={scene.id}
            onClick={() => goTo(index)}
            type="button"
          >
            <span
              className={cn(
                'block h-0.5 rounded-full transition duration-300',
                index < activeIndex
                  ? 'bg-stardust/50'
                  : index === activeIndex
                    ? 'bg-ember shadow-[0_0_12px_rgba(200,155,60,.58)]'
                    : 'bg-stardust/14 group-hover:bg-stardust/28',
              )}
            />
          </button>
        ))}
      </div>

      <main className="h-full w-full" role="dialog" aria-modal="true" aria-label={`${collection.title} editorial viewer`}>
        {activeScene ? (
          <div
            className={cn(
              'h-full w-full',
              direction === 'forward'
                ? 'editorial-scene-enter-forward'
                : 'editorial-scene-enter-back',
            )}
            key={activeScene.id}
          >
            <ScenePresentation
              collection={collection}
              project={project}
              scene={activeScene}
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-center">
            <div>
              <Layers3 className="mx-auto text-ember" size={28} />
              <h2 className="font-display mt-5 text-2xl">This collection has no scenes yet.</h2>
            </div>
          </div>
        )}
      </main>

      {scenes.length > 0 ? (
        <footer className="absolute inset-x-0 bottom-0 z-40 flex items-end justify-between gap-3 bg-[linear-gradient(180deg,transparent,rgba(5,5,5,.72)_35%,rgba(5,5,5,.96))] px-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-12 sm:px-5 sm:pb-5 lg:px-7">
          <ViewerNavigationButton
            disabled={activeIndex === 0}
            icon={<ChevronLeft size={19} />}
            label="Previous"
            onClick={previous}
            sceneName={scenes[activeIndex - 1]?.title}
          />
          <p className="hidden max-w-sm pb-2 text-center text-[0.62rem] uppercase tracking-[0.18em] text-stardust/32 md:block">
            Use arrow keys to move through the collection
          </p>
          <ViewerNavigationButton
            align="right"
            disabled={activeIndex === scenes.length - 1}
            icon={<ChevronRight size={19} />}
            label="Next"
            onClick={next}
            sceneName={scenes[activeIndex + 1]?.title}
          />
        </footer>
      ) : null}
    </div>,
    document.body,
  );
}

function ScenePresentation({
  collection,
  project,
  scene,
}: {
  collection: EditorialCollection;
  project?: ApparelProject;
  scene: EditorialScene;
}) {
  const type = resolveViewerSceneType(scene);

  if (type === 'cover') {
    return <CoverScene collection={collection} project={project} scene={scene} />;
  }
  if (type === 'gallery') {
    return <GalleryScene collection={collection} project={project} scene={scene} />;
  }
  if (type === 'fabric-story') {
    return <FabricScene collection={collection} project={project} scene={scene} />;
  }
  if (type === 'construction') {
    return <ConstructionScene collection={collection} project={project} scene={scene} />;
  }
  if (type === 'technical') {
    return <TechnicalScene collection={collection} project={project} scene={scene} />;
  }
  if (type === 'closing') {
    return <ClosingScene collection={collection} project={project} scene={scene} />;
  }
  return <StoryScene collection={collection} project={project} scene={scene} />;
}

function CoverScene({ collection, project, scene }: SceneProps) {
  return (
    <section className="relative flex h-full items-end overflow-hidden px-5 pb-28 pt-28 sm:px-9 sm:pb-32 lg:px-[7vw] lg:pb-[14vh]">
      <EditorialCollectionCover className="absolute inset-0" collection={collection} project={project} />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,5,5,.48),transparent_60%),linear-gradient(180deg,rgba(5,5,5,.12),transparent_35%,rgba(5,5,5,.76))]" />
      <div className="relative z-10 max-w-4xl">
        <p className="text-[0.64rem] font-semibold uppercase tracking-[0.3em] text-ember sm:text-xs">Mystic Lore Editorial Collection</p>
        <h1 className="font-display mt-5 max-w-4xl text-[clamp(2.4rem,8vw,6.8rem)] leading-[0.98] text-stardust [text-shadow:0_8px_42px_rgba(0,0,0,.65)]">
          {collection.title}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-stardust/72 sm:text-xl sm:leading-8">
          {collection.subtitle || project?.name}
        </p>
        <BlockContent blocks={scene.blocks} />
      </div>
    </section>
  );
}

function StoryScene({ collection, project, scene }: SceneProps) {
  return (
    <EditorialStage collection={collection} project={project}>
      <div className="grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
        <div>
          <SceneNumberLabel label="Story" />
          <h2 className="font-display mt-5 text-[clamp(2.4rem,6vw,5.5rem)] leading-[1.03]">{scene.title}</h2>
        </div>
        <div className="border-l border-ember/28 pl-5 sm:pl-8">
          {scene.blocks.length > 0 ? (
            <BlockContent blocks={scene.blocks} prominent />
          ) : (
            <>
              <p className="text-lg leading-8 text-stardust/76 sm:text-2xl sm:leading-10">
                {scene.title.toLowerCase().includes('inspiration')
                  ? project?.designIntent || collection.description
                  : collection.description || project?.summary}
              </p>
              <ScenePlaceholder label="Story copy and supporting notes will appear here." />
            </>
          )}
        </div>
      </div>
    </EditorialStage>
  );
}

function GalleryScene({ collection, project, scene }: SceneProps) {
  const images = projectImages(project, collection);
  return (
    <section className="relative h-full overflow-hidden bg-[#070707] px-3 pb-24 pt-24 sm:px-6 sm:pb-28 sm:pt-28 lg:px-8">
      <div className="mx-auto flex h-full max-w-7xl flex-col">
        <div className="mb-4 flex items-end justify-between gap-4 sm:mb-6">
          <div>
            <SceneNumberLabel label="Gallery" />
            <h2 className="font-display mt-2 text-2xl sm:text-4xl">{scene.title}</h2>
          </div>
          <span className="text-xs text-stardust/38">{images.length || 0} project images</span>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2 sm:gap-3 lg:grid-cols-[1.5fr_.75fr_.75fr] lg:grid-rows-1">
          {[0, 1, 2].map((index) => (
            <GalleryFrame image={images[index]} index={index} key={index} />
          ))}
        </div>
        {scene.blocks.length > 0 ? <BlockContent blocks={scene.blocks} /> : null}
      </div>
    </section>
  );
}

function FabricScene({ collection, project, scene }: SceneProps) {
  const materials = project?.linkedMaterials.slice(0, 4) ?? [];
  const materialCards: Array<LinkedMaterial | undefined> = materials.length > 0
    ? materials
    : Array.from({ length: 4 }, () => undefined);
  return (
    <EditorialStage collection={collection} project={project}>
      <div className="w-full max-w-6xl">
        <SceneNumberLabel label="Fabric Story" />
        <div className="mt-4 grid gap-7 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
          <div>
            <h2 className="font-display text-[clamp(2.3rem,5vw,5rem)] leading-[1.03]">{scene.title}</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-stardust/64 sm:text-lg">
              {project?.colorStory || 'Materials establish the hand, structure, and atmosphere of the garment.'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {materialCards.map((material, index) => (
              <div className="min-h-28 rounded-xl border border-bronze/25 bg-midnight/44 p-4 backdrop-blur-xl sm:min-h-36 sm:p-5" key={material ? material.id : index}>
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-ember/34 bg-ember/10 text-ember">
                  <CircleDot size={15} />
                </span>
                <p className="mt-4 text-sm font-semibold sm:text-base">{material ? material.materialName : `Material study ${index + 1}`}</p>
                <p className="mt-1 text-xs text-stardust/42">{material ? material.role : 'Awaiting material notes'}</p>
              </div>
            ))}
          </div>
        </div>
        {scene.blocks.length > 0 ? <BlockContent blocks={scene.blocks} /> : <ScenePlaceholder label="Material imagery and textile notes can be added in the editor." />}
      </div>
    </EditorialStage>
  );
}

function ConstructionScene({ collection, project, scene }: SceneProps) {
  const tasks = project?.tasks
    .filter((task) => ['Pattern', 'Cutting', 'Sewing', 'Fitting', 'Revision'].includes(task.category))
    .slice(0, 4) ?? [];
  return (
    <EditorialStage collection={collection} project={project}>
      <div className="w-full max-w-6xl">
        <SceneNumberLabel label="Construction" />
        <h2 className="font-display mt-4 text-[clamp(2.4rem,5vw,5rem)] leading-none">{scene.title}</h2>
        <div className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3">
          {(tasks.length > 0 ? tasks : ['Pattern', 'Cutting', 'Assembly', 'Fitting']).map((task, index) => (
            <div className="rounded-xl border border-bronze/24 bg-[linear-gradient(145deg,rgba(237,227,207,.045),rgba(10,10,10,.52))] p-4 sm:p-5" key={typeof task === 'string' ? task : task.id}>
              <div className="flex items-center justify-between text-ember">
                <Scissors size={16} />
                <span className="text-[0.62rem] tracking-[0.14em]">0{index + 1}</span>
              </div>
              <p className="mt-5 text-sm font-semibold">{typeof task === 'string' ? task : task.title}</p>
              <p className="mt-2 text-xs leading-5 text-stardust/42">{typeof task === 'string' ? 'Process notes ready to be added.' : task.status}</p>
            </div>
          ))}
        </div>
        {scene.blocks.length > 0 ? <BlockContent blocks={scene.blocks} /> : null}
      </div>
    </EditorialStage>
  );
}

function TechnicalScene({ collection, project, scene }: SceneProps) {
  const details = [
    ['Garment', project?.garmentType ?? 'Not specified'],
    ['Phase', project?.phase ?? 'Not specified'],
    ['Difficulty', project?.difficulty ?? 'Not specified'],
    ['Progress', project ? `${project.progress}%` : 'Not specified'],
    ['Target', formatStudioDate(project?.targetDate, { day: 'numeric', month: 'short', year: 'numeric' }, 'Not scheduled')],
    ['Materials', `${project?.linkedMaterials.length ?? 0} linked`],
  ];
  return (
    <EditorialStage collection={collection} project={project}>
      <div className="w-full max-w-6xl">
        <SceneNumberLabel label="Technical" />
        <div className="mt-4 grid gap-7 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
          <div>
            <Ruler className="text-ember" size={25} />
            <h2 className="font-display mt-5 text-[clamp(2.3rem,5vw,5rem)] leading-[1.02]">{scene.title}</h2>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
            {details.map(([label, value]) => (
              <div className="rounded-xl border border-bronze/22 bg-midnight/46 p-4 backdrop-blur-xl" key={label}>
                <p className="text-[0.6rem] uppercase tracking-[0.16em] text-stardust/38">{label}</p>
                <p className="mt-2 text-sm font-semibold text-stardust sm:text-base">{value}</p>
              </div>
            ))}
          </div>
        </div>
        {scene.blocks.length > 0 ? <BlockContent blocks={scene.blocks} /> : <ScenePlaceholder label="Specifications and technical blocks will appear here." />}
      </div>
    </EditorialStage>
  );
}

function ClosingScene({ collection, project, scene }: SceneProps) {
  return (
    <EditorialStage collection={collection} project={project} centered>
      <div className="mx-auto max-w-4xl text-center">
        <Sparkles className="mx-auto text-ember" size={24} />
        <SceneNumberLabel label="Closing" />
        <h2 className="font-display mt-5 text-[clamp(2.5rem,7vw,6rem)] leading-[1]">{scene.title}</h2>
        {scene.blocks.length > 0 ? (
          <BlockContent blocks={scene.blocks} prominent />
        ) : (
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-stardust/64 sm:text-xl">
            {project?.generalNotes || collection.description || 'The garment story continues beyond the final frame.'}
          </p>
        )}
        <p className="mt-9 text-[0.62rem] uppercase tracking-[0.28em] text-ember/72">Mystic Lore Studio</p>
      </div>
    </EditorialStage>
  );
}

type SceneProps = {
  collection: EditorialCollection;
  project?: ApparelProject;
  scene: EditorialScene;
};

function EditorialStage({
  centered = false,
  children,
  collection,
  project,
}: {
  centered?: boolean;
  children: ReactNode;
  collection: EditorialCollection;
  project?: ApparelProject;
}) {
  return (
    <section className={cn('relative flex h-full overflow-y-auto px-5 pb-28 pt-28 sm:px-9 sm:pb-32 lg:px-[7vw]', centered ? 'items-center' : 'items-center')}>
      <div className="absolute inset-0 opacity-35">
        <EditorialCollectionCover collection={collection} project={project} />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_22%,rgba(45,92,107,.24),transparent_28%),linear-gradient(120deg,rgba(5,5,5,.78),rgba(5,5,5,.9)_58%,rgba(35,23,15,.82))] backdrop-blur-xl" />
      <div className="relative z-10 mx-auto w-full">{children}</div>
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

function BlockContent({
  blocks,
  prominent = false,
}: {
  blocks: EditorialBlock[];
  prominent?: boolean;
}) {
  if (blocks.length === 0) return null;
  return (
    <div className="mt-6 space-y-4">
      {[...blocks].sort((a, b) => a.order - b.order).map((block) => (
        <div
          className={cn(
            'max-w-3xl leading-7 text-stardust/68',
            prominent ? 'text-lg sm:text-xl sm:leading-9' : 'text-sm sm:text-base',
            block.type === 'quote' ? 'border-l border-ember/50 pl-5 italic' : '',
          )}
          key={block.id}
        >
          {editorialBlockText(block)}
        </div>
      ))}
    </div>
  );
}

function ViewerNavigationButton({
  align = 'left',
  disabled,
  icon,
  label,
  onClick,
  sceneName,
}: {
  align?: 'left' | 'right';
  disabled: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  sceneName?: string;
}) {
  return (
    <button
      className={cn(
        'flex min-h-12 min-w-12 items-center gap-2 rounded-full border border-stardust/16 bg-midnight/68 px-3 text-stardust/74 backdrop-blur-xl transition hover:border-ember/48 hover:text-stardust disabled:pointer-events-none disabled:opacity-24 sm:min-w-40 sm:px-4',
        align === 'right' ? 'flex-row-reverse text-right' : 'text-left',
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {icon}
      <span className="hidden min-w-0 sm:block">
        <span className="block text-[0.58rem] uppercase tracking-[0.16em] text-stardust/38">{label}</span>
        <span className="mt-0.5 block truncate text-xs">{sceneName}</span>
      </span>
    </button>
  );
}

function SceneNumberLabel({ label }: { label: string }) {
  return <p className="mt-3 text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-ember sm:text-xs">{label}</p>;
}

function ScenePlaceholder({ label }: { label: string }) {
  return (
    <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-stardust/12 bg-midnight/34 px-3 py-2 text-xs text-stardust/38 backdrop-blur-xl">
      <Sparkles size={13} className="text-ember/62" />
      {label}
    </div>
  );
}

function resolveViewerSceneType(scene: EditorialScene): ViewerSceneType {
  if (scene.sceneType === 'cover') return 'cover';
  if (scene.sceneType === 'gallery' || scene.sceneType === 'look' || scene.sceneType === 'detail') return 'gallery';
  if (scene.sceneType === 'fabric-story' || scene.sceneType === 'materials') return 'fabric-story';
  if (scene.sceneType === 'construction' || scene.sceneType === 'process') return 'construction';
  if (scene.sceneType === 'technical') return 'technical';
  if (scene.sceneType === 'closing' || scene.sceneType === 'credits') return 'closing';
  return 'story';
}

function projectImages(project: ApparelProject | undefined, collection: EditorialCollection) {
  if (!project) return [];
  const images = [project.heroImage, ...(project.galleryImages ?? [])]
    .filter((image): image is LocalImageAsset => Boolean(image));
  const unique = images.filter((image, index) => images.findIndex((candidate) => candidate.id === image.id) === index);
  return [...unique].sort((a, b) => {
    if (a.id === collection.coverImageId) return -1;
    if (b.id === collection.coverImageId) return 1;
    return 0;
  });
}

function editorialBlockText(block: EditorialBlock) {
  if (typeof block.content === 'string') return block.content;
  if (typeof block.content === 'number' || typeof block.content === 'boolean') return String(block.content);
  if (block.content === null) return 'Editorial content';
  if (Array.isArray(block.content)) {
    return block.content.map((item) => typeof item === 'string' ? item : JSON.stringify(item)).join(' · ');
  }
  const preferredKeys = ['title', 'heading', 'text', 'body', 'quote', 'caption', 'value'];
  for (const key of preferredKeys) {
    const value = block.content[key];
    if (typeof value === 'string') return value;
  }
  return JSON.stringify(block.content);
}
