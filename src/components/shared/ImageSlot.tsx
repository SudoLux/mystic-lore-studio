import { useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { cn } from '../../lib/classes';
import { isUsableImageAsset } from '../../lib/imageAssets';
import { createLocalImageAsset, type ImageProcessingError } from '../../lib/localImages';
import type { LocalImageAsset } from '../../types/studio';
import { ImageAdjustModal } from './ImageAdjustModal';
import { ImageReadabilityOverlay } from './ImageReadabilityOverlay';
import { ImageUploadOverlay } from './ImageUploadOverlay';
import { StoredImage } from './StoredImage';

type ImageSlotProps = {
  actionClassName?: string;
  aspectClassName?: string;
  children?: ReactNode;
  className?: string;
  compact?: boolean;
  fallbackValue?: LocalImageAsset;
  imageClassName?: string;
  label: string;
  labelClassName?: string;
  onRemove: () => void;
  onSave: (image: LocalImageAsset) => void;
  placeholderClassName?: string;
  placeholderText?: string;
  readabilityVariant?: 'card' | 'controls' | 'hero';
  value?: LocalImageAsset;
};

export function ImageSlot({
  actionClassName,
  aspectClassName = 'aspect-[5/3]',
  children,
  className,
  compact = false,
  fallbackValue,
  imageClassName,
  label,
  labelClassName,
  onRemove,
  onSave,
  placeholderClassName,
  placeholderText,
  readabilityVariant = 'controls',
  value,
}: ImageSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingImage, setPendingImage] = useState<LocalImageAsset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const storedImage = isUsableImageAsset(value) ? value : undefined;
  const fallbackImage = isUsableImageAsset(fallbackValue)
    ? fallbackValue
    : undefined;
  const visibleImage = pendingImage ?? storedImage ?? fallbackImage;

  const openFilePicker = () => inputRef.current?.click();

  const handleFileChange = async (file?: File) => {
    setError(null);

    if (!file) {
      return;
    }

    try {
      setIsOptimizing(true);
      setPendingImage(await createLocalImageAsset(file));
    } catch (caughtError) {
      const imageError = caughtError as ImageProcessingError;
      setError(imageError.message || 'Could not prepare this image.');
    } finally {
      setIsOptimizing(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleSlotClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target;

    if (target instanceof HTMLElement && target.closest('button, a, input')) {
      return;
    }

    if (!visibleImage) {
      openFilePicker();
    }
  };

  return (
    <div
      className={cn(
        'group/image-slot relative isolate overflow-hidden rounded-2xl border border-bronze/24 bg-espresso/35 shadow-[inset_0_1px_0_rgba(237,227,207,0.035)]',
        aspectClassName,
        className,
      )}
      onClick={handleSlotClick}
    >
      <input
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        className="sr-only"
        onChange={(event) => handleFileChange(event.target.files?.[0])}
        ref={inputRef}
        type="file"
      />

      <div
        className={cn(
          'absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(200,155,60,0.22),transparent_30%),linear-gradient(135deg,rgba(27,58,99,0.58),rgba(10,10,10,0.72),rgba(61,43,31,0.72))]',
          placeholderClassName,
        )}
      />
      {visibleImage ? (
        <StoredImage
          asset={visibleImage}
          className={cn('absolute inset-0', imageClassName)}
        />
      ) : null}
      <ImageReadabilityOverlay
        asset={visibleImage}
        className="z-[2]"
        variant={readabilityVariant}
      />

      <ImageUploadOverlay
        actionClassName={actionClassName}
        canAdjust={Boolean(storedImage)}
        canRemove={Boolean(storedImage)}
        compact={compact}
        error={error}
        hasImage={Boolean(visibleImage)}
        hasPendingImage={Boolean(pendingImage)}
        label={label}
        labelClassName={labelClassName}
        onAdjust={() => setIsAdjusting(true)}
        onCancelPreview={() => {
          setPendingImage(null);
          setError(null);
        }}
        onConfirmPreview={() => {
          if (!pendingImage) {
            return;
          }

          onSave(pendingImage);
          setPendingImage(null);
          setError(null);
        }}
        onRemove={() => {
          setPendingImage(null);
          setError(null);
          onRemove();
        }}
        onUpload={openFilePicker}
        placeholderText={placeholderText}
        processingMessage={
          isOptimizing
            ? 'Optimizing image…'
            : storedImage?.uploadState === 'pending'
              ? 'Uploading image…'
              : null
        }
        processingIsBlocking={isOptimizing}
      />

      {children ? (
        <div className="relative z-20 h-full [text-shadow:0_2px_14px_rgba(0,0,0,0.92)]">
          {children}
        </div>
      ) : null}

      {isAdjusting && storedImage ? (
        <ImageAdjustModal
          asset={storedImage}
          label={label}
          onClose={() => setIsAdjusting(false)}
          onSave={(adjustedImage) => {
            onSave(adjustedImage);
            setIsAdjusting(false);
          }}
          previewAspectClassName={aspectClassName || 'aspect-video'}
        />
      ) : null}
    </div>
  );
}
