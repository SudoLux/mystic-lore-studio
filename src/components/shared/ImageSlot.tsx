import { useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { cn } from '../../lib/classes';
import { createLocalImageAsset, type ImageProcessingError } from '../../lib/localImages';
import type { LocalImageAsset } from '../../types/studio';
import { ImageUploadOverlay } from './ImageUploadOverlay';

type ImageSlotProps = {
  actionClassName?: string;
  aspectClassName?: string;
  children?: ReactNode;
  className?: string;
  compact?: boolean;
  imageClassName?: string;
  label: string;
  labelClassName?: string;
  onRemove: () => void;
  onSave: (image: LocalImageAsset) => void;
  placeholderClassName?: string;
  placeholderText?: string;
  value?: LocalImageAsset;
};

export function ImageSlot({
  actionClassName,
  aspectClassName = 'aspect-[5/3]',
  children,
  className,
  compact = false,
  imageClassName,
  label,
  labelClassName,
  onRemove,
  onSave,
  placeholderClassName,
  placeholderText,
  value,
}: ImageSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingImage, setPendingImage] = useState<LocalImageAsset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const visibleImage = pendingImage ?? value;

  const openFilePicker = () => inputRef.current?.click();

  const handleFileChange = async (file?: File) => {
    setError(null);

    if (!file) {
      return;
    }

    try {
      setPendingImage(await createLocalImageAsset(file));
    } catch (caughtError) {
      const imageError = caughtError as ImageProcessingError;
      setError(imageError.message || 'Could not prepare this image.');
    } finally {
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
        accept="image/*"
        className="sr-only"
        onChange={(event) => handleFileChange(event.target.files?.[0])}
        ref={inputRef}
        type="file"
      />

      {visibleImage ? (
        <img
          alt={visibleImage.name}
          className={cn('absolute inset-0 h-full w-full object-cover', imageClassName)}
          src={visibleImage.dataUrl}
        />
      ) : (
        <div
          className={cn(
            'absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(200,155,60,0.22),transparent_30%),linear-gradient(135deg,rgba(27,58,99,0.58),rgba(10,10,10,0.72),rgba(61,43,31,0.72))]',
            placeholderClassName,
          )}
        />
      )}

      <ImageUploadOverlay
        actionClassName={actionClassName}
        canRemove={Boolean(value)}
        compact={compact}
        error={error}
        hasImage={Boolean(visibleImage)}
        hasPendingImage={Boolean(pendingImage)}
        label={label}
        labelClassName={labelClassName}
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
      />

      {children ? <div className="relative z-20 h-full">{children}</div> : null}
    </div>
  );
}
