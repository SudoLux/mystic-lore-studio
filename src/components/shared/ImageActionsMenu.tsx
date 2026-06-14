import { Check, ImagePlus, SlidersHorizontal, RotateCcw, Trash2, X } from 'lucide-react';
import { cn } from '../../lib/classes';

type ImageActionsMenuProps = {
  canRemove: boolean;
  canAdjust: boolean;
  compact?: boolean;
  hasPendingImage: boolean;
  onCancelPreview: () => void;
  onAdjust: () => void;
  onConfirmPreview: () => void;
  onRemove: () => void;
  onUpload: () => void;
};

const actionButtonClassName =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-medium text-stardust shadow-[0_12px_30px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(237,227,207,0.05)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-ember/55 hover:bg-stardust/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember/70 md:min-h-9';

export function ImageActionsMenu({
  canAdjust,
  canRemove,
  compact = false,
  hasPendingImage,
  onAdjust,
  onCancelPreview,
  onConfirmPreview,
  onRemove,
  onUpload,
}: ImageActionsMenuProps) {
  if (hasPendingImage) {
    return (
      <div className={cn('flex flex-wrap justify-end gap-2', compact && 'w-full')}>
        <button
          className={cn(
            actionButtonClassName,
            'border-bronze/42 bg-midnight/78 text-stardust/92',
            compact && 'flex-1 sm:flex-none',
          )}
          onClick={onCancelPreview}
          type="button"
        >
          <X aria-hidden="true" size={14} strokeWidth={1.9} />
          Cancel
        </button>
        <button
          className={cn(
            actionButtonClassName,
            'border-ember/60 bg-[linear-gradient(135deg,#C89B3C,#EDE3CF)] text-midnight',
            compact && 'flex-1 sm:flex-none',
          )}
          onClick={onConfirmPreview}
          type="button"
        >
          <Check aria-hidden="true" size={14} strokeWidth={1.9} />
          Save
        </button>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-wrap justify-end gap-2', compact && 'w-full')}>
      {canAdjust ? (
        <button
          className={cn(
            actionButtonClassName,
            'border-ember/48 bg-midnight/78 text-stardust',
            compact && 'flex-1 sm:flex-none',
          )}
          onClick={onAdjust}
          type="button"
        >
          <SlidersHorizontal aria-hidden="true" size={14} strokeWidth={1.9} />
          Adjust
        </button>
      ) : null}
      <button
        className={cn(
          actionButtonClassName,
          'border-bronze/46 bg-midnight/78',
          compact && 'flex-1 sm:flex-none',
        )}
        onClick={onUpload}
        type="button"
      >
        {canRemove ? (
          <RotateCcw aria-hidden="true" size={14} strokeWidth={1.9} />
        ) : (
          <ImagePlus aria-hidden="true" size={14} strokeWidth={1.9} />
        )}
        {canRemove ? 'Replace' : 'Add Image'}
      </button>
      {canRemove ? (
        <button
          className={cn(
            actionButtonClassName,
            'border-bronze/36 bg-midnight/72 text-stardust/86 hover:border-ember/45',
            compact && 'flex-1 sm:flex-none',
          )}
          onClick={onRemove}
          type="button"
        >
          <Trash2 aria-hidden="true" size={14} strokeWidth={1.9} />
          Remove
        </button>
      ) : null}
    </div>
  );
}
