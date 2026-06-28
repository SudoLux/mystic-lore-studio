import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Focus,
  RotateCcw,
  X,
} from 'lucide-react';
import { cn } from '../../lib/classes';
import { defaultImageDisplay, getImageDisplay } from '../../lib/imageAssets';
import type { LocalImageAsset } from '../../types/studio';
import { Button } from './Button';
import { ImageReadabilityOverlay } from './ImageReadabilityOverlay';
import { StoredImage } from './StoredImage';

type ImageAdjustModalProps = {
  asset: LocalImageAsset;
  label: string;
  onClose: () => void;
  onSave: (asset: LocalImageAsset) => void;
  previewAspectClassName?: string;
  smartFitValues?: Partial<LocalImageAsset>;
};

type PositionPreset = {
  icon: typeof Focus;
  label: string;
  x: number;
  y: number;
};

const positionPresets: PositionPreset[] = [
  { icon: Focus, label: 'Center', x: 50, y: 50 },
  { icon: ArrowUp, label: 'Top', x: 50, y: 0 },
  { icon: ArrowDown, label: 'Bottom', x: 50, y: 100 },
  { icon: ArrowLeft, label: 'Left', x: 0, y: 50 },
  { icon: ArrowRight, label: 'Right', x: 100, y: 50 },
];

export function ImageAdjustModal({
  asset,
  label,
  onClose,
  onSave,
  previewAspectClassName = 'aspect-video',
  smartFitValues,
}: ImageAdjustModalProps) {
  const [draft, setDraft] = useState<LocalImageAsset>(() => ({
    ...asset,
    ...getImageDisplay(asset),
  }));

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const display = getImageDisplay(draft);
  const updateDraft = (values: Partial<LocalImageAsset>) => {
    setDraft((current) => ({ ...current, ...values }));
  };

  const resetDisplay = () =>
    updateDraft({
      ...defaultImageDisplay,
      overlayIntensity: display.overlayIntensity,
    });

  return createPortal(
    <div
      aria-label={`Adjust ${label}`}
      aria-modal="true"
      className="studio-scrollbar fixed inset-0 z-[80] overflow-y-auto bg-midnight/86 px-3 py-4 backdrop-blur-xl sm:px-5 sm:py-7"
      role="dialog"
    >
      <div className="mx-auto flex min-h-full max-w-4xl items-end sm:items-center">
        <div className="w-full overflow-hidden rounded-3xl border border-bronze/36 bg-[linear-gradient(145deg,rgba(22,20,18,0.98),rgba(10,10,10,0.98))] shadow-[0_36px_120px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(237,227,207,0.06)]">
          <div className="flex items-start justify-between gap-4 border-b border-bronze/24 p-4 sm:p-6">
            <div>
              <p className="text-xs font-medium uppercase text-ember">
                Image Display
              </p>
              <h2 className="mt-2 text-xl font-semibold text-stardust sm:text-2xl">
                Adjust {label}
              </h2>
              <p className="mt-2 text-sm leading-6 text-stardust/56">
                Changes affect framing only. The original uploaded image remains intact.
              </p>
            </div>
            <button
              aria-label="Close image adjustment"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-bronze/30 bg-midnight/46 text-stardust/70 transition hover:border-ember/50 hover:text-stardust"
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" size={18} strokeWidth={1.9} />
            </button>
          </div>

          <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(19rem,0.85fr)]">
            <div>
              <div
                className={cn(
                  'relative overflow-hidden rounded-2xl border border-bronze/28 bg-[radial-gradient(circle_at_18%_12%,rgba(200,155,60,0.2),transparent_28%),linear-gradient(135deg,rgba(27,58,99,0.62),rgba(10,10,10,0.76),rgba(61,43,31,0.72))]',
                  previewAspectClassName,
                )}
              >
                <StoredImage
                  asset={draft}
                  className="absolute inset-0 transition-transform duration-150"
                />
                <ImageReadabilityOverlay asset={draft} variant="hero" />
                <div className="pointer-events-none absolute inset-0 border-[8px] border-midnight/12" />
                <span className="absolute bottom-3 left-3 rounded-full border border-stardust/16 bg-midnight/66 px-3 py-1 text-xs text-stardust/72 backdrop-blur-xl">
                  {display.objectFit === 'cover' ? 'Fill Frame' : 'Fit Entire Image'} ·{' '}
                  {display.zoom.toFixed(2)}×
                </span>
              </div>
              <p className="mt-3 truncate text-xs text-stardust/42">{asset.name}</p>
            </div>

            <div className="space-y-5">
              <ControlGroup label="Text Overlay">
                <div className="grid grid-cols-3 rounded-2xl border border-bronze/28 bg-midnight/46 p-1">
                  {(['auto', 'light', 'strong'] as const).map((intensity) => (
                    <FitButton
                      active={display.overlayIntensity === intensity}
                      key={intensity}
                      label={
                        intensity === 'auto'
                          ? 'Auto'
                          : intensity === 'light'
                            ? 'Light'
                            : 'Strong'
                      }
                      onClick={() =>
                        updateDraft({ overlayIntensity: intensity })
                      }
                    />
                  ))}
                </div>
              </ControlGroup>

              <ControlGroup label="Fit Mode">
                <div className="grid grid-cols-2 rounded-2xl border border-bronze/28 bg-midnight/46 p-1">
                  <FitButton
                    active={display.objectFit === 'cover'}
                    label="Fill Frame"
                    onClick={() => updateDraft({ objectFit: 'cover' })}
                  />
                  <FitButton
                    active={display.objectFit === 'contain'}
                    label="Fit Entire Image"
                    onClick={() => updateDraft({ objectFit: 'contain' })}
                  />
                </div>
                {smartFitValues ? (
                  <button
                    className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-teal/34 bg-teal/10 px-4 text-sm font-medium text-stardust/78 transition hover:border-ember/48 hover:bg-stardust/[0.07] hover:text-stardust"
                    onClick={() => updateDraft(smartFitValues)}
                    type="button"
                  >
                    <Focus aria-hidden="true" size={16} strokeWidth={1.9} />
                    Smart Fit
                  </button>
                ) : null}
              </ControlGroup>

              <ControlGroup label="Quick Position">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-3 xl:grid-cols-5">
                  {positionPresets.map((preset) => {
                    const Icon = preset.icon;
                    const active =
                      display.objectPositionX === preset.x &&
                      display.objectPositionY === preset.y;

                    return (
                      <button
                        aria-pressed={active}
                        className={cn(
                          'flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[0.68rem] font-medium transition',
                          active
                            ? 'border-ember/62 bg-ember/14 text-ember'
                            : 'border-bronze/26 bg-midnight/38 text-stardust/62 hover:border-ember/44 hover:text-stardust',
                        )}
                        key={preset.label}
                        onClick={() =>
                          updateDraft({
                            objectPositionX: preset.x,
                            objectPositionY: preset.y,
                          })
                        }
                        type="button"
                      >
                        <Icon aria-hidden="true" size={16} strokeWidth={1.9} />
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </ControlGroup>

              <RangeControl
                label="Horizontal Position"
                onChange={(value) => updateDraft({ objectPositionX: value })}
                value={display.objectPositionX}
                valueLabel={`${Math.round(display.objectPositionX)}%`}
              />
              <RangeControl
                label="Vertical Position"
                onChange={(value) => updateDraft({ objectPositionY: value })}
                value={display.objectPositionY}
                valueLabel={`${Math.round(display.objectPositionY)}%`}
              />
              <RangeControl
                label="Zoom"
                max={2.5}
                min={1}
                onChange={(value) => updateDraft({ zoom: value })}
                step={0.05}
                value={display.zoom}
                valueLabel={`${display.zoom.toFixed(2)}×`}
              />

              <Button
                className="w-full"
                icon={<RotateCcw aria-hidden="true" size={16} strokeWidth={1.9} />}
                onClick={resetDisplay}
                size="sm"
                variant="ghost"
              >
                Reset Position
              </Button>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-bronze/24 bg-midnight/46 p-4 sm:flex-row sm:justify-end sm:p-6">
            <Button onClick={onClose} variant="ghost">
              Cancel
            </Button>
            <Button
              onClick={() =>
                onSave({
                  ...draft,
                  updatedAt: new Date().toISOString(),
                })
              }
              variant="primary"
            >
              Apply Adjustment
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ControlGroup({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <section>
      <p className="mb-2 text-xs font-medium uppercase text-stardust/44">{label}</p>
      {children}
    </section>
  );
}

function FitButton({
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
        'min-h-11 rounded-xl px-3 text-xs font-medium transition sm:text-sm',
        active
          ? 'bg-ember text-midnight shadow-[0_10px_26px_rgba(200,155,60,0.16)]'
          : 'text-stardust/58 hover:bg-stardust/[0.06] hover:text-stardust',
      )}
      onClick={onClick}
      type="button"
    >
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
    <label className="block rounded-2xl border border-bronze/22 bg-midnight/30 p-3">
      <span className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-stardust/62">{label}</span>
        <span className="text-ember">{valueLabel}</span>
      </span>
      <input
        aria-label={label}
        className="mt-3 h-6 w-full cursor-pointer accent-ember"
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
