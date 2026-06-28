import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  Focus,
  Grid2X2,
  Minus,
  Monitor,
  Plus,
  RotateCcw,
  Smartphone,
  Tablet,
  X,
} from 'lucide-react';
import { cn } from '../../lib/classes';
import {
  defaultImageDisplay,
  getImageDisplay,
  getProjectImageSurfaces,
  PROJECT_DASHBOARD_BAND_ASPECT_CLASS,
  PROJECT_LIBRARY_CARD_ASPECT_CLASS,
  PROJECT_MOBILE_CARD_ASPECT_CLASS,
  type ImageAdjustmentContext,
  type ProjectImageSurfaceDefinition,
} from '../../lib/imageAssets';
import type { LocalImageAsset } from '../../types/studio';
import { AdaptiveProjectImage } from './AdaptiveProjectImage';

type ProjectImageFramingStudioProps = {
  asset: LocalImageAsset;
  context: Exclude<ImageAdjustmentContext, 'standard'>;
  label: string;
  onClose: () => void;
  onSave: (asset: LocalImageAsset) => void;
  smartFitValues?: Partial<LocalImageAsset>;
};

type Point = { x: number; y: number };

type Gesture =
  | {
      kind: 'drag';
      pointerId: number;
      startPoint: Point;
      startPosition: Point;
    }
  | {
      kind: 'pinch';
      startDistance: number;
      startZoom: number;
    };

const surfaceIcons = {
  cards: Grid2X2,
  desktop: Monitor,
  phone: Smartphone,
  tablet: Tablet,
};

export function ProjectImageFramingStudio({
  asset,
  context,
  label,
  onClose,
  onSave,
  smartFitValues,
}: ProjectImageFramingStudioProps) {
  const surfaces = useMemo(() => getProjectImageSurfaces(context), [context]);
  const [draft, setDraft] = useState<LocalImageAsset>(() => ({
    ...asset,
    ...getImageDisplay(asset),
  }));
  const [activeSurfaceId, setActiveSurfaceId] = useState(() =>
    getInitialSurfaceId(surfaces),
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const activeSurface =
    surfaces.find((surface) => surface.id === activeSurfaceId) ?? surfaces[0];
  const display = getImageDisplay(draft);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const updateDraft = (values: Partial<LocalImageAsset>) => {
    setDraft((current) => ({ ...current, ...values }));
  };

  const applySmartFit = () => {
    updateDraft(
      smartFitValues ?? {
        ...defaultImageDisplay,
        overlayIntensity: display.overlayIntensity,
      },
    );
  };

  const setZoom = (value: number) => {
    updateDraft({ zoom: clamp(value, 1, 2.5) });
  };

  return createPortal(
    <div
      aria-label={`Adjust ${label}`}
      aria-modal="true"
      className="fixed inset-0 z-[130] h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_14%_12%,rgba(200,155,60,0.12),transparent_28%),radial-gradient(circle_at_88%_16%,rgba(45,92,107,0.18),transparent_30%),rgba(6,6,6,0.97)] text-stardust backdrop-blur-xl"
      role="dialog"
    >
      <div className="mx-auto flex h-full max-w-[96rem] flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-bronze/22 px-4 py-3 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="text-[0.62rem] font-medium uppercase tracking-[0.16em] text-ember">
              Framing Studio
            </p>
            <h2 className="mt-1 truncate text-lg font-semibold sm:text-xl">
              {label}
            </h2>
          </div>
          <button
            aria-label="Close image framing studio"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-bronze/30 bg-midnight/54 text-stardust/72 transition hover:border-ember/50 hover:text-stardust"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={1.9} />
          </button>
        </header>

        <main className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_23rem]">
          <section className="flex min-h-0 flex-col border-bronze/20 p-3 sm:p-5 lg:border-r lg:p-7">
            <SurfaceSelector
              activeSurfaceId={activeSurface.id}
              onSelect={setActiveSurfaceId}
              surfaces={surfaces}
            />
            <div className="mt-3 min-h-0 flex-1 sm:mt-4">
              <InteractivePreview
                asset={draft}
                onChange={updateDraft}
                surface={activeSurface}
              />
            </div>
            <p className="mt-2 shrink-0 text-center text-[0.68rem] text-stardust/44 sm:text-xs">
              Drag to position. Pinch with two fingers to zoom.
            </p>
          </section>

          <aside className="studio-scrollbar max-h-[42dvh] shrink-0 overflow-y-auto border-t border-bronze/20 bg-midnight/28 p-3 sm:p-4 lg:max-h-none lg:min-h-0 lg:border-t-0 lg:p-6">
            <div className="grid gap-3 lg:gap-5">
              {activeSurface.renderMode === 'cards' ? (
                <div className="rounded-xl border border-teal/28 bg-teal/10 px-3 py-2 text-xs leading-5 text-stardust/64">
                  Cards always fill their frame. Your focal point and zoom are shared across each crop.
                </div>
              ) : (
                <ControlGroup label="Frame treatment">
                  <div className="grid grid-cols-2 rounded-xl border border-bronze/28 bg-midnight/48 p-1">
                    <ModeButton
                      active={display.objectFit === 'contain'}
                      label="Full Garment"
                      onClick={() => updateDraft({ objectFit: 'contain', zoom: 1 })}
                    />
                    <ModeButton
                      active={display.objectFit === 'cover'}
                      label="Fill Frame"
                      onClick={() => updateDraft({ objectFit: 'cover' })}
                    />
                  </div>
                </ControlGroup>
              )}

              <ControlGroup label="Scale">
                <div className="grid grid-cols-[3rem_1fr_3rem] items-center gap-2">
                  <IconButton
                    disabled={display.zoom <= 1}
                    label="Zoom out"
                    onClick={() => setZoom(display.zoom - 0.1)}
                  >
                    <Minus aria-hidden="true" size={18} strokeWidth={2} />
                  </IconButton>
                  <div className="flex h-11 items-center justify-center rounded-xl border border-bronze/24 bg-midnight/42 text-sm font-medium text-ember">
                    {display.zoom.toFixed(2)}×
                  </div>
                  <IconButton
                    disabled={display.zoom >= 2.5}
                    label="Zoom in"
                    onClick={() => setZoom(display.zoom + 0.1)}
                  >
                    <Plus aria-hidden="true" size={18} strokeWidth={2} />
                  </IconButton>
                </div>
              </ControlGroup>

              <div className="grid grid-cols-2 gap-2">
                <ActionButton
                  icon={<Focus aria-hidden="true" size={16} strokeWidth={1.9} />}
                  label="Center"
                  onClick={() =>
                    updateDraft({ objectPositionX: 50, objectPositionY: 50 })
                  }
                />
                <ActionButton
                  icon={<RotateCcw aria-hidden="true" size={16} strokeWidth={1.9} />}
                  label="Smart Fit"
                  onClick={applySmartFit}
                />
              </div>

              <details
                className="rounded-xl border border-bronze/22 bg-midnight/30"
                onToggle={(event) => setShowAdvanced(event.currentTarget.open)}
                open={showAdvanced}
              >
                <summary className="cursor-pointer list-none px-3 py-3 text-xs font-medium text-stardust/68 marker:hidden">
                  Advanced positioning
                </summary>
                <div className="grid gap-3 border-t border-bronze/18 p-3">
                  <RangeControl
                    label="Horizontal focal point"
                    onChange={(value) => updateDraft({ objectPositionX: value })}
                    value={display.objectPositionX}
                    valueLabel={`${Math.round(display.objectPositionX)}%`}
                  />
                  <RangeControl
                    label="Vertical focal point"
                    onChange={(value) => updateDraft({ objectPositionY: value })}
                    value={display.objectPositionY}
                    valueLabel={`${Math.round(display.objectPositionY)}%`}
                  />
                  <RangeControl
                    label="Zoom"
                    max={2.5}
                    min={1}
                    onChange={setZoom}
                    step={0.05}
                    value={display.zoom}
                    valueLabel={`${display.zoom.toFixed(2)}×`}
                  />
                </div>
              </details>
            </div>
          </aside>
        </main>

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-bronze/22 bg-midnight/82 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-8">
          <button
            className="min-h-11 rounded-xl px-5 text-sm text-stardust/66 transition hover:bg-stardust/[0.06] hover:text-stardust"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="min-h-11 rounded-xl border border-ember/64 bg-[linear-gradient(135deg,#C89B3C,#EDE3CF)] px-5 text-sm font-semibold text-midnight shadow-[0_14px_36px_rgba(200,155,60,0.16)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(200,155,60,0.24)]"
            onClick={() =>
              onSave({
                ...draft,
                updatedAt: new Date().toISOString(),
              })
            }
            type="button"
          >
            Apply Framing
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function SurfaceSelector({
  activeSurfaceId,
  onSelect,
  surfaces,
}: {
  activeSurfaceId: ProjectImageSurfaceDefinition['id'];
  onSelect: (surfaceId: ProjectImageSurfaceDefinition['id']) => void;
  surfaces: ProjectImageSurfaceDefinition[];
}) {
  return (
    <div
      aria-label="Preview surface"
      className={cn(
        'grid shrink-0 gap-1 rounded-xl border border-bronze/24 bg-midnight/44 p-1',
        surfaces.length === 4 ? 'grid-cols-4' : 'grid-cols-3',
      )}
      role="tablist"
    >
      {surfaces.map((surface) => {
        const Icon = surfaceIcons[surface.id];
        const active = surface.id === activeSurfaceId;
        return (
          <button
            aria-selected={active}
            className={cn(
              'flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[0.62rem] font-medium transition sm:flex-row sm:gap-1.5 sm:px-2 sm:text-xs',
              active
                ? 'bg-ember text-midnight shadow-[0_10px_26px_rgba(200,155,60,0.16)]'
                : 'text-stardust/54 hover:bg-stardust/[0.06] hover:text-stardust',
            )}
            key={surface.id}
            onClick={() => onSelect(surface.id)}
            role="tab"
            type="button"
          >
            <Icon aria-hidden="true" className="shrink-0" size={15} strokeWidth={1.9} />
            <span className="sm:hidden">
              {surface.id === 'cards' ? surface.label : surface.ratioLabel}
            </span>
            <span className="hidden truncate sm:inline">{surface.label}</span>
            <span className="hidden text-[0.58rem] opacity-60 md:inline">
              {surface.ratioLabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function InteractivePreview({
  asset,
  onChange,
  surface,
}: {
  asset: LocalImageAsset;
  onChange: (values: Partial<LocalImageAsset>) => void;
  surface: ProjectImageSurfaceDefinition;
}) {
  const boundsRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const pointersRef = useRef(new Map<number, Point>());
  const gestureRef = useRef<Gesture | null>(null);
  const [frameSize, setFrameSize] = useState({ height: 0, width: 0 });
  const [isInteracting, setIsInteracting] = useState(false);
  const display = getImageDisplay(asset);

  useEffect(() => {
    const bounds = boundsRef.current;
    if (!bounds) return;

    const updateSize = () => {
      const { height, width } = bounds.getBoundingClientRect();
      const fitted = fitAspectRatio(width, height, surface.aspectRatio);
      setFrameSize(fitted);
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(bounds);
    return () => observer.disconnect();
  }, [surface.aspectRatio]);

  const beginDrag = (pointerId: number, point: Point) => {
    gestureRef.current = {
      kind: 'drag',
      pointerId,
      startPoint: point,
      startPosition: {
        x: display.objectPositionX,
        y: display.objectPositionY,
      },
    };
  };

  const beginPinch = () => {
    const points = [...pointersRef.current.values()];
    if (points.length < 2) return;
    gestureRef.current = {
      kind: 'pinch',
      startDistance: pointDistance(points[0], points[1]),
      startZoom: display.zoom,
    };
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 1) {
      beginDrag(event.pointerId, { x: event.clientX, y: event.clientY });
    } else {
      beginPinch();
    }
    setIsInteracting(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const gesture = gestureRef.current;
    if (!gesture) return;

    if (pointersRef.current.size >= 2) {
      if (gesture.kind !== 'pinch') {
        beginPinch();
        return;
      }
      const points = [...pointersRef.current.values()];
      const nextDistance = pointDistance(points[0], points[1]);
      onChange({
        zoom: clamp(
          gesture.startZoom * (nextDistance / Math.max(gesture.startDistance, 1)),
          1,
          2.5,
        ),
      });
      return;
    }

    if (gesture.kind !== 'drag' || gesture.pointerId !== event.pointerId) return;
    const frame = frameRef.current;
    if (!frame) return;
    const { height, width } = frame.getBoundingClientRect();
    const direction = display.objectFit === 'cover' ? -1 : 1;
    onChange({
      objectPositionX: clamp(
        gesture.startPosition.x +
          ((event.clientX - gesture.startPoint.x) / Math.max(width, 1)) *
            100 *
            direction,
        0,
        100,
      ),
      objectPositionY: clamp(
        gesture.startPosition.y +
          ((event.clientY - gesture.startPoint.y) / Math.max(height, 1)) *
            100 *
            direction,
        0,
        100,
      ),
    });
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size === 1) {
      const [pointerId, point] = [...pointersRef.current.entries()][0];
      beginDrag(pointerId, point);
    } else if (pointersRef.current.size === 0) {
      gestureRef.current = null;
      setIsInteracting(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 2;
    const updates: Partial<LocalImageAsset> = {};
    if (event.key === 'ArrowLeft') updates.objectPositionX = display.objectPositionX - step;
    if (event.key === 'ArrowRight') updates.objectPositionX = display.objectPositionX + step;
    if (event.key === 'ArrowUp') updates.objectPositionY = display.objectPositionY - step;
    if (event.key === 'ArrowDown') updates.objectPositionY = display.objectPositionY + step;
    if (event.key === '+' || event.key === '=') updates.zoom = display.zoom + 0.1;
    if (event.key === '-') updates.zoom = display.zoom - 0.1;
    if (Object.keys(updates).length === 0) return;
    event.preventDefault();
    if (updates.objectPositionX !== undefined) {
      updates.objectPositionX = clamp(updates.objectPositionX, 0, 100);
    }
    if (updates.objectPositionY !== undefined) {
      updates.objectPositionY = clamp(updates.objectPositionY, 0, 100);
    }
    if (updates.zoom !== undefined) updates.zoom = clamp(updates.zoom, 1, 2.5);
    onChange(updates);
  };

  return (
    <div className="flex h-full min-h-0 items-center justify-center" ref={boundsRef}>
      <div
        aria-label="Interactive image preview. Drag to position and pinch to zoom."
        className="relative touch-none select-none overflow-hidden rounded-2xl border border-ember/34 bg-midnight/62 shadow-[0_28px_90px_rgba(0,0,0,0.46),inset_0_1px_0_rgba(237,227,207,0.06)] outline-none focus-visible:ring-2 focus-visible:ring-ember/70"
        onKeyDown={handleKeyDown}
        onPointerCancel={handlePointerEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        ref={frameRef}
        style={{ height: frameSize.height, width: frameSize.width }}
        tabIndex={0}
      >
        {surface.renderMode === 'cards' ? (
          <CardCropPreview asset={asset} />
        ) : (
          <AdaptiveProjectImage asset={asset} className="absolute inset-0" />
        )}
        <div className="pointer-events-none absolute inset-3 rounded-xl border border-stardust/12 shadow-[inset_0_0_70px_rgba(10,10,10,0.2)]" />
        <span className="pointer-events-none absolute left-3 top-3 rounded-full border border-stardust/16 bg-midnight/72 px-2.5 py-1 text-[0.64rem] font-medium text-stardust/72 backdrop-blur-xl">
          {surface.label} · {surface.ratioLabel}
        </span>
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute z-30 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ember/80 opacity-0 shadow-[0_0_20px_rgba(200,155,60,0.42)] transition-opacity before:absolute before:left-1/2 before:top-1/2 before:h-px before:w-4 before:-translate-x-1/2 before:bg-ember/80 after:absolute after:left-1/2 after:top-1/2 after:h-4 after:w-px after:-translate-y-1/2 after:bg-ember/80',
            isInteracting && 'opacity-100',
          )}
          style={{
            left: `${display.objectPositionX}%`,
            top: `${display.objectPositionY}%`,
          }}
        />
      </div>
    </div>
  );
}

function CardCropPreview({ asset }: { asset: LocalImageAsset }) {
  return (
    <div className="grid h-full grid-cols-[0.72fr_1.28fr] gap-2 bg-[linear-gradient(145deg,rgba(27,58,99,0.18),rgba(10,10,10,0.86),rgba(61,43,31,0.22))] p-2 sm:gap-3 sm:p-3">
      <div className="self-center overflow-hidden rounded-xl border border-stardust/12">
        <div className={PROJECT_MOBILE_CARD_ASPECT_CLASS}>
          <AdaptiveProjectImage asset={asset} className="h-full w-full" mode="compact" />
        </div>
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-3">
        <div
          className={cn(
            'overflow-hidden rounded-xl border border-stardust/12',
            PROJECT_LIBRARY_CARD_ASPECT_CLASS,
          )}
        >
          <AdaptiveProjectImage asset={asset} className="h-full w-full" mode="compact" />
        </div>
        <div
          className={cn(
            'overflow-hidden rounded-xl border border-stardust/12',
            PROJECT_DASHBOARD_BAND_ASPECT_CLASS,
          )}
        >
          <AdaptiveProjectImage asset={asset} className="h-full w-full" mode="compact" />
        </div>
      </div>
    </div>
  );
}

function ControlGroup({ children, label }: { children: ReactNode; label: string }) {
  return (
    <section>
      <p className="mb-2 text-[0.62rem] font-medium uppercase tracking-[0.14em] text-stardust/42">
        {label}
      </p>
      {children}
    </section>
  );
}

function ModeButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        'min-h-10 rounded-lg px-3 text-xs font-medium transition',
        active
          ? 'bg-ember text-midnight shadow-[0_8px_24px_rgba(200,155,60,0.16)]'
          : 'text-stardust/58 hover:bg-stardust/[0.06] hover:text-stardust',
      )}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function IconButton({
  children,
  disabled,
  label,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="flex h-11 items-center justify-center rounded-xl border border-bronze/28 bg-midnight/46 text-stardust/72 transition hover:border-ember/48 hover:text-stardust disabled:cursor-not-allowed disabled:opacity-30"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-bronze/26 bg-midnight/38 px-3 text-xs font-medium text-stardust/68 transition hover:border-ember/44 hover:bg-stardust/[0.06] hover:text-stardust"
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

function RangeControl({
  label,
  max = 100,
  min = 0,
  onChange,
  step = 1,
  value,
  valueLabel,
}: {
  label: string;
  max?: number;
  min?: number;
  onChange: (value: number) => void;
  step?: number;
  value: number;
  valueLabel: string;
}) {
  return (
    <label className="block rounded-xl border border-bronze/18 bg-midnight/26 p-3">
      <span className="flex items-center justify-between gap-3 text-[0.68rem]">
        <span className="font-medium text-stardust/58">{label}</span>
        <span className="text-ember">{valueLabel}</span>
      </span>
      <input
        aria-label={label}
        className="mt-2 h-6 w-full cursor-pointer accent-ember"
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="range"
        value={value}
      />
    </label>
  );
}

function getInitialSurfaceId(surfaces: ProjectImageSurfaceDefinition[]) {
  const width = window.innerWidth;
  const preferredId = width < 640 ? 'phone' : width < 1024 ? 'tablet' : 'desktop';
  return surfaces.find((surface) => surface.id === preferredId)?.id ?? surfaces[0].id;
}

function fitAspectRatio(width: number, height: number, ratio: number) {
  if (!width || !height) return { height: 0, width: 0 };
  if (width / height > ratio) {
    return { height, width: height * ratio };
  }
  return { height: width / ratio, width };
}

function pointDistance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}
