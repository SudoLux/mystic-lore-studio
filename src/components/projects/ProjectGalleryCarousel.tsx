import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type PointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Expand,
  ImagePlus,
  LoaderCircle,
  MoreHorizontal,
  MoveLeft,
  MoveRight,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '../../lib/classes';
import {
  isUsableImageAsset,
  MAX_PROJECT_GALLERY_IMAGES,
} from '../../lib/imageAssets';
import {
  createLocalImageAsset,
  type ImageProcessingError,
} from '../../lib/localImages';
import type { LocalImageAsset } from '../../types/studio';
import { Badge } from '../shared/Badge';
import { BottomSheet } from '../shared/BottomSheet';
import { ImageAdjustModal } from '../shared/ImageAdjustModal';
import { StoredImage } from '../shared/StoredImage';

export type ProjectGalleryCarouselHandle = {
  openFilePicker: () => void;
};

type ProjectGalleryCarouselProps = {
  images?: LocalImageAsset[];
  onChange: (images: LocalImageAsset[]) => void;
};

const galleryControlClassName =
  'inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-bronze/34 bg-midnight/72 px-3 text-sm font-medium text-stardust/82 shadow-[0_12px_32px_rgba(0,0,0,0.28)] backdrop-blur-xl transition duration-200 hover:border-ember/56 hover:bg-stardust/[0.08] hover:text-stardust disabled:cursor-not-allowed disabled:opacity-35';

export const ProjectGalleryCarousel = forwardRef<
  ProjectGalleryCarouselHandle,
  ProjectGalleryCarouselProps
>(function ProjectGalleryCarousel({ images = [], onChange }, ref) {
  const addInputRef = useRef<HTMLInputElement>(null);
  const didSwipeRef = useRef(false);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const usableImages = useMemo(
    () => images.filter(isUsableImageAsset),
    [images],
  );
  const galleryImages = usableImages.slice(0, MAX_PROJECT_GALLERY_IMAGES);
  const overflowImages = usableImages.slice(MAX_PROJECT_GALLERY_IMAGES);
  const [activeImageId, setActiveImageId] = useState(
    galleryImages[0]?.id ?? '',
  );
  const [adjustingImage, setAdjustingImage] =
    useState<LocalImageAsset | null>(null);
  const [isManaging, setIsManaging] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [processedCount, setProcessedCount] = useState(0);
  const [processingTotal, setProcessingTotal] = useState(0);
  const isAutoplayViewport = useMediaQuery('(min-width: 640px)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  const activeIndex = Math.max(
    galleryImages.findIndex((image) => image.id === activeImageId),
    0,
  );
  const activeImage = galleryImages[activeIndex];
  const availableSlots = Math.max(
    MAX_PROJECT_GALLERY_IMAGES - galleryImages.length,
    0,
  );

  useImperativeHandle(ref, () => ({
    openFilePicker: () => {
      if (availableSlots === 0) {
        setNotice('This gallery already holds five images.');
        return;
      }
      addInputRef.current?.click();
    },
  }));

  useEffect(() => {
    if (!galleryImages.some((image) => image.id === activeImageId)) {
      setActiveImageId(galleryImages[0]?.id ?? '');
    }
  }, [activeImageId, galleryImages]);

  const showRelativeImage = (offset: number) => {
    if (galleryImages.length < 2) return;
    const nextIndex =
      (activeIndex + offset + galleryImages.length) % galleryImages.length;
    setActiveImageId(galleryImages[nextIndex].id);
  };

  useEffect(() => {
    if (
      galleryImages.length < 2 ||
      !isAutoplayViewport ||
      prefersReducedMotion ||
      isPaused ||
      isManaging ||
      isViewerOpen ||
      adjustingImage ||
      isProcessing
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      if (!document.hidden) showRelativeImage(1);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [
    activeIndex,
    adjustingImage,
    galleryImages.length,
    isAutoplayViewport,
    isManaging,
    isPaused,
    isProcessing,
    isViewerOpen,
    prefersReducedMotion,
  ]);

  const commitVisibleImages = (nextImages: LocalImageAsset[]) => {
    onChange([...nextImages.slice(0, MAX_PROJECT_GALLERY_IMAGES), ...overflowImages]);
  };

  const handleAddFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = '';
    setNotice(null);

    if (!selectedFiles.length) return;
    if (!availableSlots) {
      setNotice('This gallery already holds five images.');
      return;
    }

    const files = selectedFiles.slice(0, availableSlots);
    setIsProcessing(true);
    setProcessedCount(0);
    setProcessingTotal(files.length);
    const prepared: LocalImageAsset[] = [];
    const failures: string[] = [];

    for (let index = 0; index < files.length; index += 2) {
      const batch = files.slice(index, index + 2);
      const results = await Promise.allSettled(
        batch.map((file) => createLocalImageAsset(file)),
      );
      results.forEach((result, resultIndex) => {
        if (result.status === 'fulfilled') prepared.push(result.value);
        else {
          const error = result.reason as ImageProcessingError;
          failures.push(
            `${batch[resultIndex].name}: ${error.message || 'Could not prepare image.'}`,
          );
        }
      });
      setProcessedCount(Math.min(index + batch.length, files.length));
    }

    if (prepared.length) {
      commitVisibleImages([...galleryImages, ...prepared]);
      setActiveImageId(prepared[0].id);
    }

    const omitted = selectedFiles.length - files.length;
    const messages = [
      omitted > 0
        ? `${omitted} ${omitted === 1 ? 'image was' : 'images were'} not added because the gallery holds five.`
        : null,
      failures.length
        ? `${failures.length} ${failures.length === 1 ? 'image could' : 'images could'} not be prepared.`
        : null,
    ].filter(Boolean);
    setNotice(messages.join(' ') || null);
    setIsProcessing(false);
  };

  const handleReplaceFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !activeImage) return;

    setIsProcessing(true);
    setProcessingTotal(1);
    setProcessedCount(0);
    setNotice(null);
    try {
      const replacement = await createLocalImageAsset(file);
      const nextImages = galleryImages.map((image) =>
        image.id === activeImage.id ? replacement : image,
      );
      setActiveImageId(replacement.id);
      commitVisibleImages(nextImages);
    } catch (caughtError) {
      const error = caughtError as ImageProcessingError;
      setNotice(error.message || 'Could not prepare this replacement image.');
    } finally {
      setProcessedCount(1);
      setIsProcessing(false);
    }
  };

  const removeActiveImage = () => {
    if (!activeImage) return;
    const nextImages = galleryImages.filter((image) => image.id !== activeImage.id);
    const nextActive = nextImages[Math.min(activeIndex, nextImages.length - 1)];
    setActiveImageId(nextActive?.id ?? '');
    commitVisibleImages(nextImages);
    setIsManaging(false);
  };

  const moveActiveImage = (offset: number) => {
    const nextIndex = activeIndex + offset;
    if (!activeImage || nextIndex < 0 || nextIndex >= galleryImages.length) return;
    const nextImages = [...galleryImages];
    [nextImages[activeIndex], nextImages[nextIndex]] = [
      nextImages[nextIndex],
      nextImages[activeIndex],
    ];
    commitVisibleImages(nextImages);
    setIsManaging(false);
  };

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    didSwipeRef.current = false;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: PointerEvent<HTMLElement>) => {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start) return;
    const distanceX = event.clientX - start.x;
    const distanceY = event.clientY - start.y;
    if (Math.abs(distanceX) < 44 || Math.abs(distanceX) <= Math.abs(distanceY)) {
      return;
    }
    didSwipeRef.current = true;
    showRelativeImage(distanceX < 0 ? 1 : -1);
  };

  const handleFocusBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setIsPaused(false);
  };

  const inputs = (
    <>
      <input
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        className="sr-only"
        multiple
        onChange={handleAddFiles}
        ref={addInputRef}
        type="file"
      />
      <input
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        className="sr-only"
        onChange={handleReplaceFile}
        ref={replaceInputRef}
        type="file"
      />
    </>
  );

  if (!activeImage) {
    return inputs;
  }

  const managementActions = (
    <GalleryManagementActions
      activeIndex={activeIndex}
      imageCount={galleryImages.length}
      onAdjust={() => {
        setAdjustingImage(activeImage);
        setIsManaging(false);
      }}
      onMoveLeft={() => moveActiveImage(-1)}
      onMoveRight={() => moveActiveImage(1)}
      onRemove={removeActiveImage}
      onReplace={() => {
        replaceInputRef.current?.click();
        setIsManaging(false);
      }}
    />
  );

  return (
    <>
      {inputs}
      <section
        aria-label="Project gallery"
        aria-roledescription="carousel"
        className="relative overflow-hidden rounded-[1.5rem] border border-bronze/30 bg-[linear-gradient(145deg,rgba(27,58,99,0.2),rgba(10,10,10,0.74),rgba(61,43,31,0.3))] shadow-[0_24px_80px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(237,227,207,0.045)] sm:rounded-[1.75rem]"
        onBlurCapture={handleFocusBlur}
        onFocusCapture={() => setIsPaused(true)}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <header className="flex items-center justify-between gap-3 border-b border-bronze/20 px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="bronze">Project Gallery</Badge>
              <span className="text-xs text-stardust/46">
                {activeIndex + 1} / {galleryImages.length}
              </span>
            </div>
            {overflowImages.length ? (
              <p className="mt-2 text-xs text-ember/78">
                {overflowImages.length} imported image{overflowImages.length === 1 ? '' : 's'} remain preserved beyond the five-image display limit.
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {availableSlots > 0 ? (
              <button
                className={galleryControlClassName}
                disabled={isProcessing}
                onClick={() => addInputRef.current?.click()}
                type="button"
              >
                <ImagePlus aria-hidden="true" size={17} strokeWidth={1.9} />
                <span className="hidden sm:inline">Add Photos</span>
              </button>
            ) : null}
            <button
              aria-expanded={isManaging}
              aria-label="Manage active gallery image"
              className={galleryControlClassName}
              onClick={() => setIsManaging((current) => !current)}
              type="button"
            >
              <MoreHorizontal aria-hidden="true" size={19} strokeWidth={1.9} />
            </button>
          </div>
        </header>

        {notice || isProcessing ? (
          <div
            aria-live="polite"
            className="flex items-center gap-2 border-b border-bronze/16 bg-midnight/34 px-4 py-2.5 text-xs text-stardust/66 sm:px-5"
          >
            {isProcessing ? (
              <LoaderCircle
                aria-hidden="true"
                className="shrink-0 animate-spin text-ember"
                size={15}
                strokeWidth={1.9}
              />
            ) : null}
            <span>
              {isProcessing
                ? `Optimizing ${Math.min(processedCount + 1, processingTotal)} of ${processingTotal}…`
                : notice}
            </span>
            {notice && !isProcessing ? (
              <button
                aria-label="Dismiss gallery message"
                className="ml-auto text-stardust/52 hover:text-stardust"
                onClick={() => setNotice(null)}
                type="button"
              >
                <X aria-hidden="true" size={15} />
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_9rem]">
          <div
            className="group/gallery-stage relative aspect-[4/3] cursor-zoom-in overflow-hidden bg-midnight/64 sm:aspect-[4/3] xl:aspect-video"
            onClick={() => {
              if (didSwipeRef.current) {
                didSwipeRef.current = false;
                return;
              }
              setIsViewerOpen(true);
            }}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            style={{ touchAction: 'pan-y' }}
          >
            <StoredImage
              asset={activeImage}
              className="gallery-image-enter absolute inset-0"
              key={activeImage.id}
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,10,0.16),transparent_28%,transparent_70%,rgba(10,10,10,0.2))]" />
            <div className="pointer-events-none absolute inset-3 rounded-[1.15rem] border border-stardust/10 shadow-[inset_0_0_80px_rgba(10,10,10,0.18)] sm:inset-4 sm:rounded-[1.35rem]" />
            <button
              aria-label="Open gallery image full screen"
              className="absolute bottom-4 right-4 z-20 flex h-11 w-11 items-center justify-center rounded-xl border border-stardust/18 bg-midnight/70 text-stardust/78 shadow-[0_12px_32px_rgba(0,0,0,0.34)] backdrop-blur-xl transition hover:border-ember/54 hover:text-stardust"
              onClick={(event) => {
                event.stopPropagation();
                setIsViewerOpen(true);
              }}
              type="button"
            >
              <Expand aria-hidden="true" size={18} strokeWidth={1.9} />
            </button>
            {galleryImages.length > 1 ? (
              <>
                <CarouselArrow
                  direction="previous"
                  onClick={(event) => {
                    event.stopPropagation();
                    showRelativeImage(-1);
                  }}
                />
                <CarouselArrow
                  direction="next"
                  onClick={(event) => {
                    event.stopPropagation();
                    showRelativeImage(1);
                  }}
                />
              </>
            ) : null}
          </div>

          <div className="studio-scrollbar hidden gap-2 overflow-x-auto border-t border-bronze/20 p-3 sm:flex xl:max-h-[32rem] xl:flex-col xl:overflow-x-hidden xl:overflow-y-auto xl:border-l xl:border-t-0">
            {galleryImages.map((image, index) => (
              <GalleryThumbnail
                active={image.id === activeImage.id}
                image={image}
                index={index}
                key={image.id}
                onClick={() => setActiveImageId(image.id)}
              />
            ))}
          </div>

          {galleryImages.length > 1 ? (
            <div className="flex items-center justify-center gap-2 border-t border-bronze/18 px-4 py-3 sm:hidden">
              {galleryImages.map((image, index) => (
                <button
                  aria-label={`Show gallery image ${index + 1}`}
                  aria-pressed={image.id === activeImage.id}
                  className={cn(
                    'h-2 rounded-full transition-all duration-300',
                    image.id === activeImage.id
                      ? 'w-7 bg-ember shadow-[0_0_14px_rgba(200,155,60,0.38)]'
                      : 'w-2 bg-stardust/24',
                  )}
                  key={image.id}
                  onClick={() => setActiveImageId(image.id)}
                  type="button"
                />
              ))}
            </div>
          ) : null}
        </div>

        {isManaging ? (
          <>
            <BottomSheet
              isOpen
              onClose={() => setIsManaging(false)}
              title={`Manage image ${activeIndex + 1}`}
            >
              {managementActions}
            </BottomSheet>
            <button
              aria-label="Close gallery image menu"
              className="fixed inset-0 z-40 hidden cursor-default bg-transparent lg:block"
              onClick={() => setIsManaging(false)}
              type="button"
            />
            <div className="absolute right-4 top-[4.75rem] z-50 hidden w-72 rounded-2xl border border-bronze/34 bg-[linear-gradient(145deg,rgba(24,22,20,0.98),rgba(10,10,10,0.98))] p-3 shadow-[0_28px_90px_rgba(0,0,0,0.52)] lg:block">
              <p className="px-2 pb-3 text-xs font-medium uppercase tracking-[0.14em] text-stardust/42">
                Image {activeIndex + 1} of {galleryImages.length}
              </p>
              {managementActions}
            </div>
          </>
        ) : null}
      </section>

      {isViewerOpen ? (
        <GalleryViewer
          activeImage={activeImage}
          activeIndex={activeIndex}
          imageCount={galleryImages.length}
          onClose={() => setIsViewerOpen(false)}
          onNext={() => showRelativeImage(1)}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPrevious={() => showRelativeImage(-1)}
        />
      ) : null}

      {adjustingImage ? (
        <ImageAdjustModal
          asset={adjustingImage}
          label={`Gallery image ${activeIndex + 1}`}
          onClose={() => setAdjustingImage(null)}
          onSave={(adjustedImage) => {
            commitVisibleImages(
              galleryImages.map((image) =>
                image.id === adjustedImage.id ? adjustedImage : image,
              ),
            );
            setAdjustingImage(null);
          }}
          previewAspectClassName="aspect-[4/3]"
        />
      ) : null}
    </>
  );
});

function CarouselArrow({
  direction,
  onClick,
}: {
  direction: 'next' | 'previous';
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const Icon = direction === 'previous' ? ChevronLeft : ChevronRight;
  return (
    <button
      aria-label={`${direction === 'previous' ? 'Previous' : 'Next'} gallery image`}
      className={cn(
        'absolute top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl border border-stardust/18 bg-midnight/68 text-stardust/80 shadow-[0_12px_32px_rgba(0,0,0,0.34)] backdrop-blur-xl transition hover:border-ember/54 hover:text-stardust',
        direction === 'previous' ? 'left-4' : 'right-4',
      )}
      onClick={onClick}
      type="button"
    >
      <Icon aria-hidden="true" size={21} strokeWidth={1.9} />
    </button>
  );
}

function GalleryThumbnail({
  active,
  image,
  index,
  onClick,
}: {
  active: boolean;
  image: LocalImageAsset;
  index: number;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={`Show gallery image ${index + 1}`}
      aria-pressed={active}
      className={cn(
        'relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-xl border bg-midnight/52 transition duration-200 xl:w-full',
        active
          ? 'border-ember/74 shadow-[0_0_22px_rgba(200,155,60,0.18)]'
          : 'border-bronze/24 opacity-58 hover:border-bronze/54 hover:opacity-100',
      )}
      onClick={onClick}
      type="button"
    >
      <StoredImage asset={image} className="absolute inset-0" />
      <span className="absolute bottom-1.5 left-1.5 flex h-6 min-w-6 items-center justify-center rounded-lg border border-stardust/14 bg-midnight/72 px-1.5 text-[0.65rem] text-stardust/80 backdrop-blur-lg">
        {index + 1}
      </span>
    </button>
  );
}

function GalleryManagementActions({
  activeIndex,
  imageCount,
  onAdjust,
  onMoveLeft,
  onMoveRight,
  onRemove,
  onReplace,
}: {
  activeIndex: number;
  imageCount: number;
  onAdjust: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onRemove: () => void;
  onReplace: () => void;
}) {
  return (
    <div className="grid gap-2">
      <ManagementButton icon={SlidersHorizontal} label="Adjust framing" onClick={onAdjust} />
      <ManagementButton icon={RotateCcw} label="Replace image" onClick={onReplace} />
      <div className="grid grid-cols-2 gap-2">
        <ManagementButton
          disabled={activeIndex === 0}
          icon={MoveLeft}
          label="Move left"
          onClick={onMoveLeft}
        />
        <ManagementButton
          disabled={activeIndex === imageCount - 1}
          icon={MoveRight}
          label="Move right"
          onClick={onMoveRight}
        />
      </div>
      <ManagementButton danger icon={Trash2} label="Remove image" onClick={onRemove} />
    </div>
  );
}

function ManagementButton({
  danger = false,
  disabled = false,
  icon: Icon,
  label,
  onClick,
}: {
  danger?: boolean;
  disabled?: boolean;
  icon: typeof SlidersHorizontal;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        'flex min-h-11 items-center gap-3 rounded-xl border px-3 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-30',
        danger
          ? 'border-ember/34 bg-ember/8 text-ember hover:bg-ember/14'
          : 'border-bronze/24 bg-midnight/42 text-stardust/76 hover:border-ember/46 hover:text-stardust',
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Icon aria-hidden="true" size={17} strokeWidth={1.9} />
      {label}
    </button>
  );
}

function GalleryViewer({
  activeImage,
  activeIndex,
  imageCount,
  onClose,
  onNext,
  onPointerDown,
  onPointerUp,
  onPrevious,
}: {
  activeImage: LocalImageAsset;
  activeIndex: number;
  imageCount: number;
  onClose: () => void;
  onNext: () => void;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPrevious: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && imageCount > 1) onPrevious();
      if (event.key === 'ArrowRight' && imageCount > 1) onNext();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [imageCount, onClose, onNext, onPrevious]);

  const viewerImage = {
    ...activeImage,
    objectFit: 'contain' as const,
    objectPositionX: 50,
    objectPositionY: 50,
    zoom: 1,
  };

  return createPortal(
    <div
      aria-label="Project gallery viewer"
      aria-modal="true"
      className="fixed inset-0 z-[140] flex flex-col bg-midnight/96 p-3 text-stardust backdrop-blur-2xl sm:p-5"
      onClick={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
      role="dialog"
    >
      <div className="flex items-center justify-between gap-3 pb-3 sm:pb-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-ember">
            Project Gallery
          </p>
          <p className="mt-1 text-sm text-stardust/58">
            {activeIndex + 1} of {imageCount}
          </p>
        </div>
        <button
          autoFocus
          aria-label="Close project gallery viewer"
          className={galleryControlClassName}
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" size={19} strokeWidth={1.9} />
        </button>
      </div>
      <div
        className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-bronze/24 bg-black/46"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        style={{ touchAction: 'pan-y' }}
      >
        <StoredImage
          asset={viewerImage}
          className="gallery-image-enter absolute inset-0 p-2 sm:p-5"
          key={activeImage.id}
        />
        {imageCount > 1 ? (
          <>
            <button
              aria-label="Previous gallery image"
              className={cn(galleryControlClassName, 'absolute left-3 top-1/2 -translate-y-1/2')}
              onClick={onPrevious}
              type="button"
            >
              <ArrowLeft aria-hidden="true" size={19} strokeWidth={1.9} />
            </button>
            <button
              aria-label="Next gallery image"
              className={cn(galleryControlClassName, 'absolute right-3 top-1/2 -translate-y-1/2')}
              onClick={onNext}
              type="button"
            >
              <ArrowRight aria-hidden="true" size={19} strokeWidth={1.9} />
            </button>
          </>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handleChange = () => setMatches(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}
