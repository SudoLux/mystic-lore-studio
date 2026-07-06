import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Layers3,
  Maximize2,
  Minimize2,
  Pause,
  PanelsTopLeft,
  Play,
} from 'lucide-react';
import { cn } from '../../lib/classes';
import { normalizeEditorialPlayback } from '../../lib/editorialPlayback';
import { resolveEditorialTheme } from '../../lib/editorialThemes';
import { normalizeEditorialViewerMode, resolveEditorialBookSpread } from '../../lib/editorialViewerMode';
import type { EditorialCollection, EditorialViewerMode } from '../../types/editorial';
import type { ApparelProject, Fabric } from '../../types/studio';
import { EditorialBookViewer } from './EditorialBookViewer';
import { EditorialSceneRenderer } from './scenes/EditorialSceneRenderer';

type EditorialCollectionViewerProps = {
  collection: EditorialCollection;
  fabrics?: Fabric[];
  onClose: () => void;
  project?: ApparelProject;
};

const EXIT_DURATION_MS = 150;
const PROGRESS_TICK_MS = 100;

export function EditorialCollectionViewer({
  collection,
  fabrics = [],
  onClose,
  project,
}: EditorialCollectionViewerProps) {
  const scenes = useMemo(() => [...collection.scenes].sort((a, b) => a.order - b.order), [collection.scenes]);
  const theme = useMemo(() => resolveEditorialTheme(collection.themeId), [collection.themeId]);
  const playback = useMemo(() => normalizeEditorialPlayback(collection), [collection]);
  const spreads = useMemo(() => scenes.map(resolveEditorialBookSpread), [scenes]);
  const viewerRef = useRef<HTMLDivElement>(null);
  const transitionTimersRef = useRef<number[]>([]);
  const chromeTimerRef = useRef<number | undefined>(undefined);
  const transitionLockedRef = useRef(false);
  const intentionalFullscreenExitRef = useRef(false);
  const wasFullscreenRef = useRef(false);
  const resumeAfterVisibilityRef = useRef(false);
  const lastTickRef = useRef(Date.now());
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [bookPageIndex, setBookPageIndex] = useState(0);
  const [direction, setDirection] = useState<'back' | 'forward'>('forward');
  const [isExiting, setIsExiting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(playback.autoPlay && scenes.length > 1);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isChromeVisible, setIsChromeVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isSinglePageBook, setIsSinglePageBook] = useState(false);
  const [viewerMode, setViewerMode] = useState<EditorialViewerMode>(normalizeEditorialViewerMode(collection));
  const activeScene = scenes[activeIndex];
  const activeSpread = spreads[activeIndex];
  const activePageCount = viewerMode === 'book' && isSinglePageBook ? activeSpread?.pageCount ?? 1 : 1;
  const activeUnitDurationMs = playback.sceneDurationMs / activePageCount;
  const sceneProgress = playback.sceneDurationMs > 0
    ? Math.min(1, (bookPageIndex * activeUnitDurationMs + elapsedMs) / playback.sceneDurationMs)
    : 0;
  const isAtEnd = activeIndex === scenes.length - 1 && bookPageIndex >= activePageCount - 1;

  const scheduleChromeFade = useCallback(() => {
    window.clearTimeout(chromeTimerRef.current);
    if (!window.matchMedia('(min-width: 1024px) and (orientation: landscape)').matches) return;
    chromeTimerRef.current = window.setTimeout(() => setIsChromeVisible(false), 3000);
  }, []);

  const revealChrome = useCallback(() => {
    setIsChromeVisible(true);
    scheduleChromeFade();
  }, [scheduleChromeFade]);

  const goTo = useCallback((nextIndex: number, targetPage = 0) => {
    if (
      nextIndex < 0
      || nextIndex >= scenes.length
      || nextIndex === activeIndex
      || transitionLockedRef.current
    ) return;
    revealChrome();
    setElapsedMs(0);
    setDirection(nextIndex > activeIndex ? 'forward' : 'back');
    if (reducedMotion) {
      setActiveIndex(nextIndex);
      setBookPageIndex(targetPage);
      return;
    }

    transitionLockedRef.current = true;
    setIsExiting(true);
    const exitTimer = window.setTimeout(() => {
      setActiveIndex(nextIndex);
      setBookPageIndex(targetPage);
      setIsExiting(false);
      const unlockTimer = window.setTimeout(() => {
        transitionLockedRef.current = false;
      }, theme.transitionStyle.durationMs);
      transitionTimersRef.current.push(unlockTimer);
    }, EXIT_DURATION_MS);
    transitionTimersRef.current.push(exitTimer);
  }, [activeIndex, reducedMotion, revealChrome, scenes.length, theme.transitionStyle.durationMs]);

  const goToBookPage = useCallback((nextPage: number) => {
    if (nextPage < 0 || nextPage >= activePageCount || nextPage === bookPageIndex || transitionLockedRef.current) return;
    revealChrome();
    setElapsedMs(0);
    setDirection(nextPage > bookPageIndex ? 'forward' : 'back');
    if (reducedMotion) {
      setBookPageIndex(nextPage);
      return;
    }
    transitionLockedRef.current = true;
    setIsExiting(true);
    const exitTimer = window.setTimeout(() => {
      setBookPageIndex(nextPage);
      setIsExiting(false);
      const unlockTimer = window.setTimeout(() => {
        transitionLockedRef.current = false;
      }, theme.transitionStyle.durationMs);
      transitionTimersRef.current.push(unlockTimer);
    }, EXIT_DURATION_MS);
    transitionTimersRef.current.push(exitTimer);
  }, [activePageCount, bookPageIndex, reducedMotion, revealChrome, theme.transitionStyle.durationMs]);

  const previous = useCallback(() => {
    if (viewerMode === 'book' && isSinglePageBook && bookPageIndex > 0) {
      goToBookPage(bookPageIndex - 1);
      return;
    }
    const previousIndex = activeIndex - 1;
    const previousPage = viewerMode === 'book' && isSinglePageBook
      ? Math.max(0, (spreads[previousIndex]?.pageCount ?? 1) - 1)
      : 0;
    goTo(previousIndex, previousPage);
  }, [activeIndex, bookPageIndex, goTo, goToBookPage, isSinglePageBook, spreads, viewerMode]);

  const next = useCallback(() => {
    if (viewerMode === 'book' && isSinglePageBook && bookPageIndex < activePageCount - 1) {
      goToBookPage(bookPageIndex + 1);
      return;
    }
    goTo(activeIndex + 1, 0);
  }, [activeIndex, activePageCount, bookPageIndex, goTo, goToBookPage, isSinglePageBook, viewerMode]);

  const toggleViewerMode = useCallback(() => {
    revealChrome();
    setElapsedMs(0);
    setBookPageIndex(0);
    setViewerMode((current) => current === 'book' ? 'editorial' : 'book');
  }, [revealChrome]);

  const requestClose = useCallback(async () => {
    if (document.fullscreenElement) {
      intentionalFullscreenExitRef.current = true;
      await document.exitFullscreen().catch(() => undefined);
    }
    onClose();
  }, [onClose]);

  const toggleFullscreen = useCallback(async () => {
    revealChrome();
    if (document.fullscreenElement) {
      intentionalFullscreenExitRef.current = true;
      await document.exitFullscreen().catch(() => undefined);
      return;
    }
    intentionalFullscreenExitRef.current = false;
    await viewerRef.current?.requestFullscreen().catch(() => undefined);
  }, [revealChrome]);

  const togglePlayback = useCallback(() => {
    revealChrome();
    if (isAtEnd && elapsedMs >= activeUnitDurationMs) {
      setElapsedMs(0);
    }
    lastTickRef.current = Date.now();
    setIsPlaying((current) => !current);
  }, [activeUnitDurationMs, elapsedMs, isAtEnd, revealChrome]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    viewerRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      transitionTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(chromeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px), (orientation: portrait)');
    const update = () => setIsSinglePageBook(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    setCanFullscreen(Boolean(document.fullscreenEnabled && viewerRef.current?.requestFullscreen));
    const onFullscreenChange = () => {
      const active = document.fullscreenElement === viewerRef.current;
      setIsFullscreen(active);
      if (wasFullscreenRef.current && !active) {
        if (intentionalFullscreenExitRef.current) intentionalFullscreenExitRef.current = false;
        else onClose();
      }
      wasFullscreenRef.current = active;
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, [onClose]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      revealChrome();
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        previous();
      } else if (event.key === 'ArrowRight' || event.key === ' ') {
        event.preventDefault();
        next();
      } else if (event.key === 'Escape' && !document.fullscreenElement) {
        event.preventDefault();
        void requestClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [next, previous, requestClose, revealChrome]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) {
        resumeAfterVisibilityRef.current = isPlaying;
        if (isPlaying) setIsPlaying(false);
      } else if (resumeAfterVisibilityRef.current) {
        resumeAfterVisibilityRef.current = false;
        lastTickRef.current = Date.now();
        setIsPlaying(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying || scenes.length < 2) return;
    lastTickRef.current = Date.now();
    const timer = window.setInterval(() => {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;
      setElapsedMs((current) => Math.min(activeUnitDurationMs, current + delta));
    }, PROGRESS_TICK_MS);
    return () => window.clearInterval(timer);
  }, [activeUnitDurationMs, isPlaying, scenes.length]);

  useEffect(() => {
    if (!isPlaying || elapsedMs < activeUnitDurationMs) return;
    if (isAtEnd) {
      setIsPlaying(false);
      revealChrome();
      return;
    }
    next();
  }, [activeUnitDurationMs, elapsedMs, isAtEnd, isPlaying, next, revealChrome]);

  useEffect(() => {
    if (viewerMode !== 'book' || !isSinglePageBook || bookPageIndex < activePageCount) return;
    setBookPageIndex(Math.max(0, activePageCount - 1));
  }, [activePageCount, bookPageIndex, isSinglePageBook, viewerMode]);

  useEffect(() => {
    revealChrome();
  }, [revealChrome]);

  return createPortal(
    <div
      aria-label={`${collection.title} editorial viewer`}
      aria-modal="true"
      className="editorial-viewer fixed inset-0 z-[170] overflow-hidden bg-[#050505] text-stardust outline-none"
      data-chrome={isChromeVisible ? 'visible' : 'hidden'}
      onFocusCapture={revealChrome}
      onPointerDown={revealChrome}
      onPointerMove={revealChrome}
      onTouchEnd={(event) => {
        const start = touchStartRef.current;
        const touch = event.changedTouches[0];
        touchStartRef.current = null;
        if (!start || !touch) return;
        const deltaX = touch.clientX - start.x;
        const deltaY = touch.clientY - start.y;
        if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
        if (deltaX < 0) next();
        else previous();
      }}
      onTouchStart={(event) => {
        const touch = event.touches[0];
        if (touch) touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      }}
      ref={viewerRef}
      role="dialog"
      tabIndex={-1}
    >
      <ViewerHeader
        activeIndex={activeIndex}
        canFullscreen={canFullscreen}
        collection={collection}
        isFullscreen={isFullscreen}
        isPlaying={isPlaying}
        pageCount={activePageCount}
        pageIndex={bookPageIndex}
        onClose={() => void requestClose()}
        onToggleFullscreen={() => void toggleFullscreen()}
        onTogglePlayback={togglePlayback}
        onToggleViewerMode={toggleViewerMode}
        sceneTitle={activeScene?.title}
        total={scenes.length}
        viewerMode={viewerMode}
      />

      <ViewerProgress
        activeIndex={activeIndex}
        progress={sceneProgress}
        scenes={scenes}
        themeAccent={theme.colors.accent}
        onNavigate={goTo}
      />

      <main className="h-full w-full">
        {activeScene ? (
          <div
            className={cn(
              'h-full w-full',
              isExiting
                ? `editorial-scene-exit editorial-scene-direction-${direction}`
                : `editorial-scene-transition-${theme.transitionStyle.type} editorial-scene-direction-${direction}`,
            )}
            key={`${activeScene.id}-${viewerMode}-${bookPageIndex}`}
            style={{
              '--editorial-transition-duration': `${theme.transitionStyle.durationMs}ms`,
              '--editorial-transition-easing': theme.transitionStyle.easing,
            } as CSSProperties}
          >
            {viewerMode === 'book' && activeSpread ? (
              <EditorialBookViewer
                collection={collection}
                descriptor={activeSpread}
                fabrics={fabrics}
                isSinglePage={isSinglePageBook}
                pageIndex={bookPageIndex}
                project={project}
                theme={theme}
              />
            ) : (
              <EditorialSceneRenderer collection={collection} fabrics={fabrics} project={project} scene={activeScene} theme={theme} />
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-center">
            <div><Layers3 className="mx-auto text-ember" size={28} /><h2 className="font-display mt-5 text-2xl">This collection has no scenes yet.</h2></div>
          </div>
        )}
      </main>

      {scenes.length > 0 ? (
        <footer className="editorial-viewer-chrome editorial-viewer-chrome-bottom absolute inset-x-0 bottom-0 z-40 flex items-end justify-between gap-3 bg-[linear-gradient(180deg,transparent,rgba(5,5,5,.68)_38%,rgba(5,5,5,.94))] px-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-12 sm:px-5 sm:pb-5 lg:px-7">
          <ViewerNavigationButton disabled={activeIndex === 0 && bookPageIndex === 0} icon={<ChevronLeft size={19} />} label="Previous" onClick={previous} sceneName={bookPageIndex > 0 ? `${activeScene?.title} · Page ${bookPageIndex}` : scenes[activeIndex - 1]?.title} />
          <p className="hidden max-w-sm pb-2 text-center text-[0.62rem] uppercase tracking-[0.18em] text-stardust/32 md:block">Space to advance · arrows to navigate</p>
          <ViewerNavigationButton align="right" disabled={isAtEnd} icon={<ChevronRight size={19} />} label="Next" onClick={next} sceneName={bookPageIndex < activePageCount - 1 ? `${activeScene?.title} · Page ${bookPageIndex + 2}` : scenes[activeIndex + 1]?.title} />
        </footer>
      ) : null}
    </div>,
    document.body,
  );
}

function ViewerHeader({
  activeIndex,
  canFullscreen,
  collection,
  isFullscreen,
  isPlaying,
  pageCount,
  pageIndex,
  onClose,
  onToggleFullscreen,
  onTogglePlayback,
  onToggleViewerMode,
  sceneTitle,
  total,
  viewerMode,
}: {
  activeIndex: number;
  canFullscreen: boolean;
  collection: EditorialCollection;
  isFullscreen: boolean;
  isPlaying: boolean;
  pageCount: number;
  pageIndex: number;
  onClose: () => void;
  onToggleFullscreen: () => void;
  onTogglePlayback: () => void;
  onToggleViewerMode: () => void;
  sceneTitle?: string;
  total: number;
  viewerMode: EditorialViewerMode;
}) {
  return (
    <header className="editorial-viewer-chrome editorial-viewer-chrome-top absolute inset-x-0 top-0 z-40 flex items-center gap-2 bg-[linear-gradient(180deg,rgba(5,5,5,.68),transparent)] px-3 pb-8 pt-[max(0.75rem,env(safe-area-inset-top))] sm:gap-3 sm:px-5 sm:pt-5 lg:px-7">
      <ViewerChromeButton icon={<ArrowLeft size={17} />} label="Exit editorial collection" onClick={onClose}><span className="hidden sm:inline">Exit</span></ViewerChromeButton>
      <div className="min-w-0 flex-1 text-center">
        <p className="truncate text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-stardust/42">{collection.title}</p>
        <p className="mt-1 truncate text-xs text-stardust/68">{sceneTitle ?? 'Collection'}</p>
      </div>
      {total > 1 ? <ViewerChromeButton icon={isPlaying ? <Pause size={16} /> : <Play size={16} />} label={isPlaying ? 'Pause auto-play' : 'Play collection'} onClick={onTogglePlayback} /> : null}
      <ViewerChromeButton
        icon={viewerMode === 'book' ? <PanelsTopLeft size={16} /> : <BookOpen size={16} />}
        label={viewerMode === 'book' ? 'Switch to Editorial Mode' : 'Switch to Book Mode'}
        onClick={onToggleViewerMode}
      />
      {canFullscreen ? <ViewerChromeButton icon={isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />} label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} onClick={onToggleFullscreen} /> : null}
      <div className="flex h-11 min-w-14 shrink-0 flex-col items-center justify-center rounded-full border border-stardust/14 bg-midnight/52 px-3 text-xs tabular-nums text-stardust/68 backdrop-blur-xl">
        <span>{total > 0 ? `${activeIndex + 1} / ${total}` : '0 / 0'}</span>
        {viewerMode === 'book' && pageCount > 1 ? <span className="text-[0.5rem] uppercase tracking-[0.08em] text-stardust/38">Page {pageIndex + 1}/{pageCount}</span> : null}
      </div>
    </header>
  );
}

function ViewerChromeButton({ children, icon, label, onClick }: { children?: ReactNode; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button aria-label={label} className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-stardust/16 bg-midnight/62 px-3 text-sm text-stardust/78 shadow-[0_12px_36px_rgba(0,0,0,.28)] backdrop-blur-xl transition hover:border-ember/50 hover:text-stardust sm:px-4" onClick={onClick} title={label} type="button">
      {icon}{children}
    </button>
  );
}

function ViewerProgress({ activeIndex, onNavigate, progress, scenes, themeAccent }: { activeIndex: number; onNavigate: (index: number) => void; progress: number; scenes: EditorialCollection['scenes']; themeAccent: string }) {
  return (
    <div className="editorial-viewer-chrome editorial-viewer-chrome-top absolute inset-x-3 top-[4.55rem] z-40 flex gap-1.5 sm:inset-x-6 sm:top-[5.2rem] lg:inset-x-8">
      {scenes.map((scene, index) => {
        const fill = index < activeIndex ? 1 : index === activeIndex ? progress : 0;
        return (
          <button aria-label={`Go to scene ${index + 1}: ${scene.title}`} className="group h-5 flex-1 py-2" key={scene.id} onClick={() => onNavigate(index)} type="button">
            <span className="relative block h-0.5 overflow-hidden rounded-full bg-stardust/14 group-hover:bg-stardust/24">
              <span className="absolute inset-0 origin-left scale-x-[var(--scene-progress)] rounded-full shadow-[0_0_12px_color-mix(in_srgb,var(--viewer-accent)_58%,transparent)] transition-transform duration-100 ease-linear" style={{ '--scene-progress': fill, '--viewer-accent': themeAccent, backgroundColor: themeAccent } as CSSProperties} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ViewerNavigationButton({ align = 'left', disabled, icon, label, onClick, sceneName }: { align?: 'left' | 'right'; disabled: boolean; icon: ReactNode; label: string; onClick: () => void; sceneName?: string }) {
  return (
    <button className={cn('flex min-h-12 min-w-12 items-center gap-2 rounded-full border border-stardust/16 bg-midnight/68 px-3 text-stardust/74 backdrop-blur-xl transition hover:border-ember/48 hover:text-stardust disabled:pointer-events-none disabled:opacity-24 sm:min-w-40 sm:px-4', align === 'right' ? 'flex-row-reverse text-right' : 'text-left')} disabled={disabled} onClick={onClick} type="button">
      {icon}
      <span className="hidden min-w-0 sm:block"><span className="block text-[0.58rem] uppercase tracking-[0.16em] text-stardust/38">{label}</span><span className="mt-0.5 block truncate text-xs">{sceneName}</span></span>
    </button>
  );
}
