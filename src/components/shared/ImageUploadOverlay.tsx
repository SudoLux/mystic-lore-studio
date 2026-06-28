import { useState } from 'react';
import { Clock3, ImagePlus, LoaderCircle, MoreHorizontal } from 'lucide-react';
import { cn } from '../../lib/classes';
import { BottomSheet } from './BottomSheet';
import { ImageActionsMenu } from './ImageActionsMenu';

type ImageUploadOverlayProps = {
  actionClassName?: string;
  canAdjust: boolean;
  canRemove: boolean;
  compact?: boolean;
  controlsMode?: 'expanded' | 'menu';
  error?: string | null;
  hasImage: boolean;
  hasPendingImage: boolean;
  label: string;
  labelClassName?: string;
  onAdjust: () => void;
  onCancelPreview: () => void;
  onConfirmPreview: () => void;
  onRemove: () => void;
  onSmartFit?: () => void;
  onUpload: () => void;
  placeholderText?: string;
  processingMessage?: string | null;
  processingIsActive?: boolean;
  processingIsBlocking?: boolean;
};

export function ImageUploadOverlay({
  actionClassName,
  canAdjust,
  canRemove,
  compact = false,
  controlsMode = 'expanded',
  error,
  hasImage,
  hasPendingImage,
  label,
  labelClassName,
  onAdjust,
  onCancelPreview,
  onConfirmPreview,
  onRemove,
  onSmartFit,
  onUpload,
  placeholderText = 'Add an image directly to this slot.',
  processingMessage,
  processingIsActive = false,
  processingIsBlocking = false,
}: ImageUploadOverlayProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const shouldKeepVisible = !hasImage || hasPendingImage || Boolean(error);
  const usesCompactMenu =
    controlsMode === 'menu' && hasImage && !hasPendingImage && !error;
  const closeAndRun = (action: () => void) => {
    setIsMenuOpen(false);
    action();
  };
  const menuActions = (
    <ImageActionsMenu
      canAdjust={canAdjust}
      canRemove={canRemove}
      compact
      hasPendingImage={false}
      onAdjust={() => closeAndRun(onAdjust)}
      onCancelPreview={onCancelPreview}
      onConfirmPreview={onConfirmPreview}
      onRemove={() => closeAndRun(onRemove)}
      onSmartFit={onSmartFit ? () => closeAndRun(onSmartFit) : undefined}
      onUpload={() => closeAndRun(onUpload)}
    />
  );

  return (
    <>
      <div
        className={cn(
          'pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(10,10,10,0.34)_0%,rgba(10,10,10,0.03)_38%,rgba(10,10,10,0.44)_100%)] transition duration-200',
          usesCompactMenu
            ? 'opacity-0'
            : shouldKeepVisible
            ? 'opacity-100'
            : 'opacity-100 md:opacity-0 md:group-hover/image-slot:opacity-100 md:group-focus-within/image-slot:opacity-100',
        )}
      />

      <div
        className={cn(
          'pointer-events-none absolute left-3 top-3 z-20 flex flex-wrap items-center gap-2',
          labelClassName,
        )}
      >
        <span className="rounded-full border border-bronze/46 bg-midnight/78 px-3 py-1 text-xs font-medium text-stardust shadow-[0_8px_24px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(237,227,207,0.06)] backdrop-blur-xl">
          {label}
        </span>
      </div>

      {!hasImage ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-4 text-center">
          <div className="max-w-48">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-ember/42 bg-midnight/52 text-ember shadow-[0_16px_42px_rgba(200,155,60,0.14)] backdrop-blur-xl">
              <ImagePlus aria-hidden="true" size={22} strokeWidth={1.8} />
            </span>
            <p
              className={cn(
                'mt-3 leading-6 text-stardust/72',
                compact ? 'text-xs' : 'text-sm',
              )}
            >
              {placeholderText}
            </p>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="absolute inset-x-3 bottom-16 z-30 rounded-2xl border border-ember/40 bg-midnight/82 px-3 py-2 text-xs leading-5 text-ember shadow-[0_16px_42px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          {error}
        </p>
      ) : null}

      {processingMessage ? (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center p-4',
            processingIsBlocking
              ? 'pointer-events-auto z-40 bg-midnight/48 backdrop-blur-[2px]'
              : 'pointer-events-none z-20',
          )}
        >
          <div
            aria-live="polite"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-ember/48 bg-midnight/88 px-4 text-sm font-medium text-stardust shadow-[0_16px_42px_rgba(0,0,0,0.36)]"
            role="status"
          >
            {processingIsActive ? (
              <LoaderCircle
                aria-hidden="true"
                className="animate-spin text-ember"
                size={17}
                strokeWidth={1.9}
              />
            ) : (
              <Clock3
                aria-hidden="true"
                className="text-ember"
                size={17}
                strokeWidth={1.9}
              />
            )}
            {processingMessage}
          </div>
        </div>
      ) : null}

      {usesCompactMenu ? (
        <>
          <button
            aria-expanded={isMenuOpen}
            aria-label={`Manage ${label}`}
            className={cn(
              'absolute right-3 top-3 z-30 flex h-11 w-11 items-center justify-center rounded-xl border border-bronze/42 bg-midnight/76 text-stardust/82 shadow-[0_14px_34px_rgba(0,0,0,0.32)] backdrop-blur-xl transition hover:border-ember/58 hover:text-stardust',
              actionClassName,
            )}
            onClick={() => setIsMenuOpen((current) => !current)}
            type="button"
          >
            <MoreHorizontal aria-hidden="true" size={20} strokeWidth={1.9} />
          </button>
          {isMenuOpen ? (
            <>
              <BottomSheet
                isOpen
                onClose={() => setIsMenuOpen(false)}
                title={`Manage ${label}`}
              >
                {menuActions}
              </BottomSheet>
              <button
                aria-label={`Close ${label} menu`}
                className="fixed inset-0 z-40 hidden cursor-default bg-transparent lg:block"
                onClick={() => setIsMenuOpen(false)}
                type="button"
              />
              <div className="absolute right-3 top-16 z-50 hidden w-80 rounded-2xl border border-bronze/34 bg-[linear-gradient(145deg,rgba(24,22,20,0.98),rgba(10,10,10,0.98))] p-3 shadow-[0_28px_90px_rgba(0,0,0,0.52)] lg:block">
                {menuActions}
              </div>
            </>
          ) : null}
        </>
      ) : (
        <div
          className={cn(
            'absolute bottom-3 left-3 right-3 z-30 flex justify-end transition duration-200',
            controlsMode === 'menu' && hasPendingImage &&
              'bottom-0 left-0 right-0 border-t border-bronze/24 bg-midnight/82 p-3 backdrop-blur-xl',
            shouldKeepVisible
              ? 'opacity-100'
              : 'opacity-100 md:opacity-0 md:group-hover/image-slot:opacity-100 md:group-focus-within/image-slot:opacity-100',
            controlsMode === 'expanded' && actionClassName,
          )}
        >
          <ImageActionsMenu
            canAdjust={canAdjust}
            canRemove={canRemove}
            compact={compact}
            hasPendingImage={hasPendingImage}
            onAdjust={onAdjust}
            onCancelPreview={onCancelPreview}
            onConfirmPreview={onConfirmPreview}
            onRemove={onRemove}
            onSmartFit={onSmartFit}
            onUpload={onUpload}
          />
        </div>
      )}
    </>
  );
}
