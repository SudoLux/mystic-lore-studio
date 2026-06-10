import { ImagePlus, Loader2 } from 'lucide-react';
import { cn } from '../../lib/classes';
import { ImageActionsMenu } from './ImageActionsMenu';

type ImageUploadOverlayProps = {
  actionClassName?: string;
  canRemove: boolean;
  compact?: boolean;
  error?: string | null;
  fileSizeLabel?: string;
  hasImage: boolean;
  hasPendingImage: boolean;
  label: string;
  onCancelPreview: () => void;
  onConfirmPreview: () => void;
  onRemove: () => void;
  onUpload: () => void;
  placeholderText?: string;
};

export function ImageUploadOverlay({
  actionClassName,
  canRemove,
  compact = false,
  error,
  fileSizeLabel,
  hasImage,
  hasPendingImage,
  label,
  onCancelPreview,
  onConfirmPreview,
  onRemove,
  onUpload,
  placeholderText = 'Add an image directly to this slot.',
}: ImageUploadOverlayProps) {
  const shouldKeepVisible = !hasImage || hasPendingImage || Boolean(error);

  return (
    <>
      <div
        className={cn(
          'pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(10,10,10,0.48)_0%,rgba(10,10,10,0.08)_38%,rgba(10,10,10,0.58)_100%)] transition duration-200',
          shouldKeepVisible
            ? 'opacity-100'
            : 'opacity-100 md:opacity-0 md:group-hover/image-slot:opacity-100 md:group-focus-within/image-slot:opacity-100',
        )}
      />

      <div className="pointer-events-none absolute left-3 top-3 z-20 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-bronze/38 bg-midnight/58 px-3 py-1 text-xs font-medium text-stardust shadow-[inset_0_1px_0_rgba(237,227,207,0.05)] backdrop-blur-xl">
          {label}
        </span>
        {fileSizeLabel ? (
          <span className="rounded-full border border-stardust/12 bg-midnight/42 px-2.5 py-1 text-xs text-stardust/58 backdrop-blur-xl">
            {fileSizeLabel}
          </span>
        ) : null}
        {hasPendingImage ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ember/45 bg-ember/18 px-2.5 py-1 text-xs font-medium text-ember backdrop-blur-xl">
            <Loader2 aria-hidden="true" className="animate-spin" size={12} />
            Preview
          </span>
        ) : null}
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

      <div
        className={cn(
          'absolute bottom-3 right-3 z-30 transition duration-200',
          shouldKeepVisible
            ? 'opacity-100'
            : 'opacity-100 md:opacity-0 md:group-hover/image-slot:opacity-100 md:group-focus-within/image-slot:opacity-100',
          actionClassName,
        )}
      >
        <ImageActionsMenu
          canRemove={canRemove}
          compact={compact}
          hasPendingImage={hasPendingImage}
          onCancelPreview={onCancelPreview}
          onConfirmPreview={onConfirmPreview}
          onRemove={onRemove}
          onUpload={onUpload}
        />
      </div>
    </>
  );
}
