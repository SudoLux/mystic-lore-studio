import { useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { cn } from '../../lib/classes';
import {
  applyRecommendedProjectImageDisplay,
  getRecommendedProjectImageDisplay,
  isUsableImageAsset,
  type ImageAdjustmentContext,
} from '../../lib/imageAssets';
import { createLocalImageAsset, type ImageProcessingError } from '../../lib/localImages';
import type { LocalImageAsset } from '../../types/studio';
import { AdaptiveProjectImage } from '../projects/AdaptiveProjectImage';
import { ImageAdjustModal } from './ImageAdjustModal';
import { ImageReadabilityOverlay } from './ImageReadabilityOverlay';
import { ImageUploadOverlay } from './ImageUploadOverlay';
import { StoredImage } from './StoredImage';

type ImageSlotProps = {
  actionClassName?: string;
  adjustmentContext?: ImageAdjustmentContext;
  aspectClassName?: string;
  children?: ReactNode;
  className?: string;
  compact?: boolean;
  controlsMode?: 'expanded' | 'menu';
  fallbackValue?: LocalImageAsset;
  imageClassName?: string;
  label: string;
  labelClassName?: string;
  onRemove: () => void;
  onSave: (image: LocalImageAsset) => void;
  placeholderClassName?: string;
  placeholderText?: string;
  projectAdaptive?: boolean;
  readabilityVariant?: 'card' | 'controls' | 'hero';
  showReadabilityOverlay?: boolean;
  value?: LocalImageAsset;
};

export function ImageSlot({
  actionClassName,
  adjustmentContext = 'standard',
  aspectClassName = 'aspect-[5/3]',
  children,
  className,
  compact = false,
  controlsMode = 'expanded',
  fallbackValue,
  imageClassName,
  label,
  labelClassName,
  onRemove,
  onSave,
  placeholderClassName,
  placeholderText,
  projectAdaptive = false,
  readabilityVariant = 'controls',
  showReadabilityOverlay = true,
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
      const preparedImage = await createLocalImageAsset(file);
      setPendingImage(
        projectAdaptive
          ? applyRecommendedProjectImageDisplay(preparedImage)
          : preparedImage,
      );
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
        projectAdaptive ? (
          <AdaptiveProjectImage
            asset={visibleImage}
            className="absolute inset-0"
            foregroundClassName={imageClassName}
          />
        ) : (
          <StoredImage
            asset={visibleImage}
            className={cn('absolute inset-0', imageClassName)}
          />
        )
      ) : null}
      {showReadabilityOverlay ? (
        <ImageReadabilityOverlay
          asset={visibleImage}
          className="z-[2]"
          variant={readabilityVariant}
        />
      ) : null}

      <ImageUploadOverlay
        actionClassName={actionClassName}
        canAdjust={Boolean(storedImage)}
        canRemove={Boolean(storedImage)}
        compact={compact}
        controlsMode={controlsMode}
        error={error ?? storedImage?.uploadError}
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
        onSmartFit={
          projectAdaptive && storedImage
            ? () => onSave(applyRecommendedProjectImageDisplay(storedImage))
            : undefined
        }
        onUpload={openFilePicker}
        placeholderText={placeholderText}
        processingMessage={
          isOptimizing
            ? 'Optimizing image…'
            : storedImage?.uploadState === 'uploading'
              ? 'Uploading image…'
              : storedImage?.uploadState === 'queued' ||
                  storedImage?.uploadState === 'pending'
                ? 'Queued for cloud sync'
              : null
        }
        processingIsActive={
          isOptimizing || storedImage?.uploadState === 'uploading'
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
          adjustmentContext={adjustmentContext}
          asset={storedImage}
          label={label}
          onClose={() => setIsAdjusting(false)}
          onSave={(adjustedImage) => {
            onSave(adjustedImage);
            setIsAdjusting(false);
          }}
          previewAspectClassName={aspectClassName || 'aspect-video'}
          smartFitValues={
            projectAdaptive
              ? getRecommendedProjectImageDisplay(storedImage)
              : undefined
          }
        />
      ) : null}
    </div>
  );
}
