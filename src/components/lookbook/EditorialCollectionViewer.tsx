import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Layers3 } from 'lucide-react';
import { cn } from '../../lib/classes';
import { resolveEditorialTheme } from '../../lib/editorialThemes';
import type { EditorialCollection } from '../../types/editorial';
import type { ApparelProject } from '../../types/studio';
import { EditorialSceneRenderer } from './scenes/EditorialSceneRenderer';

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
  const theme = useMemo(
    () => resolveEditorialTheme(collection.themeId),
    [collection.themeId],
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
      <ViewerHeader
        activeIndex={activeIndex}
        collection={collection}
        onClose={onClose}
        sceneTitle={activeScene?.title}
        total={scenes.length}
      />

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
                    ? 'shadow-[0_0_12px_color-mix(in_srgb,var(--viewer-accent)_58%,transparent)]'
                    : 'bg-stardust/14 group-hover:bg-stardust/28',
              )}
              style={index === activeIndex ? { backgroundColor: theme.colors.accent, '--viewer-accent': theme.colors.accent } as CSSProperties : undefined}
            />
          </button>
        ))}
      </div>

      <main
        aria-label={`${collection.title} editorial viewer`}
        aria-modal="true"
        className="h-full w-full"
        role="dialog"
      >
        {activeScene ? (
          <div
            className={cn(
              'h-full w-full',
              `editorial-scene-transition-${theme.transitionStyle.type}`,
              `editorial-scene-direction-${direction}`,
            )}
            key={activeScene.id}
            style={{
              '--editorial-transition-duration': `${theme.transitionStyle.durationMs}ms`,
              '--editorial-transition-easing': theme.transitionStyle.easing,
            } as CSSProperties}
          >
            <EditorialSceneRenderer
              collection={collection}
              project={project}
              scene={activeScene}
              theme={theme}
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

function ViewerHeader({
  activeIndex,
  collection,
  onClose,
  sceneTitle,
  total,
}: {
  activeIndex: number;
  collection: EditorialCollection;
  onClose: () => void;
  sceneTitle?: string;
  total: number;
}) {
  return (
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
        <p className="mt-1 truncate text-xs text-stardust/68">{sceneTitle ?? 'Collection'}</p>
      </div>
      <div className="flex h-11 min-w-14 shrink-0 items-center justify-center rounded-full border border-stardust/14 bg-midnight/52 px-3 text-xs tabular-nums text-stardust/68 backdrop-blur-xl">
        {total > 0 ? `${activeIndex + 1} / ${total}` : '0 / 0'}
      </div>
    </header>
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
