import { Check, ImagePlus, Trash2, UploadCloud, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { cn } from '../../lib/classes';
import { createLocalImageAsset, type ImageProcessingError } from '../../lib/localImages';
import type { LocalImageAsset } from '../../types/studio';
import { Button } from './Button';
import { Badge } from './Badge';

type LocalImageUploaderProps = {
  compact?: boolean;
  description?: string;
  label: string;
  onRemove: () => void;
  onSave: (image: LocalImageAsset) => void;
  value?: LocalImageAsset;
};

export function LocalImageUploader({
  compact,
  description,
  label,
  onRemove,
  onSave,
  value,
}: LocalImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingImage, setPendingImage] = useState<LocalImageAsset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const visibleImage = pendingImage ?? value;
  const uploadLabel = value ? 'Replace' : compact ? 'Add Image' : 'Upload Image';

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

  return (
    <section
      className={cn(
        'rounded-3xl border border-bronze/28 bg-[linear-gradient(145deg,rgba(10,10,10,0.44),rgba(61,43,31,0.16))] p-4 shadow-[inset_0_1px_0_rgba(237,227,207,0.035)]',
        compact ? 'space-y-3 rounded-2xl p-3' : 'space-y-4',
      )}
    >
      <div
        className={cn(
          'flex flex-col gap-3',
          compact ? 'items-start' : 'sm:flex-row sm:items-start sm:justify-between',
        )}
      >
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="bronze">{label}</Badge>
            {visibleImage ? (
              <span className="text-xs text-stardust/45">
                {formatFileSize(visibleImage.size)}
              </span>
            ) : null}
          </div>
          {description ? (
            <p className="mt-2 text-sm leading-6 text-stardust/58">{description}</p>
          ) : null}
        </div>
        <input
          accept="image/*"
          className="sr-only"
          onChange={(event) => handleFileChange(event.target.files?.[0])}
          ref={inputRef}
          type="file"
        />
        {!compact ? (
          <Button
            icon={<UploadCloud aria-hidden="true" size={15} strokeWidth={1.9} />}
            onClick={() => inputRef.current?.click()}
            size="sm"
            variant="secondary"
          >
            {uploadLabel}
          </Button>
        ) : null}
      </div>

      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border bg-espresso/35',
          compact
            ? 'aspect-[16/9] border-bronze/24'
            : 'aspect-[5/3] border-bronze/20',
        )}
      >
        {visibleImage ? (
          <img
            alt={visibleImage.name}
            className="h-full w-full object-cover"
            src={visibleImage.dataUrl}
          />
        ) : (
          <div
            className={cn(
              'flex h-full flex-col items-center justify-center bg-[radial-gradient(circle_at_20%_10%,rgba(200,155,60,0.22),transparent_30%),linear-gradient(135deg,rgba(27,58,99,0.58),rgba(10,10,10,0.72),rgba(61,43,31,0.72))] text-center',
              compact ? 'gap-2 p-4' : 'gap-3 p-5',
            )}
          >
            <ImagePlus
              aria-hidden="true"
              className="text-ember"
              size={compact ? 22 : 26}
              strokeWidth={1.8}
            />
            <p
              className={cn(
                'leading-6 text-stardust/58',
                compact ? 'text-xs' : 'text-sm',
              )}
            >
              {compact
                ? 'Add a reference image.'
                : 'Placeholder gradient shown until an image is saved.'}
            </p>
          </div>
        )}
        {pendingImage ? (
          <span className="absolute left-3 top-3 rounded-full border border-ember/45 bg-ember/18 px-3 py-1 text-xs font-medium text-ember">
            Preview pending
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-2xl border border-ember/35 bg-ember/10 px-3 py-2 text-sm leading-6 text-ember">
          {error}
        </p>
      ) : null}

      <div
        className={cn(
          'flex gap-2',
          compact ? 'flex-wrap items-center justify-end' : 'flex-col sm:flex-row sm:justify-end',
        )}
      >
        {compact ? (
          <Button
            className="min-h-9 flex-1 rounded-xl border-bronze/35 bg-midnight/48 px-3 text-xs text-stardust hover:border-ember/45 hover:shadow-[0_10px_28px_rgba(200,155,60,0.1)] sm:flex-none"
            icon={<UploadCloud aria-hidden="true" size={14} strokeWidth={1.9} />}
            onClick={() => inputRef.current?.click()}
            size="sm"
            variant="secondary"
          >
            {uploadLabel}
          </Button>
        ) : null}
        {pendingImage ? (
          <>
            <Button
              className={cn(
                compact &&
                  'min-h-9 flex-1 rounded-xl px-3 text-xs sm:flex-none',
              )}
              icon={compact ? <X aria-hidden="true" size={14} strokeWidth={1.9} /> : undefined}
              onClick={() => setPendingImage(null)}
              size="sm"
              type="button"
              variant="ghost"
            >
              {compact ? 'Cancel' : 'Cancel Preview'}
            </Button>
            <Button
              className={cn(
                compact &&
                  'min-h-9 flex-1 rounded-xl px-3 text-xs sm:flex-none',
              )}
              icon={
                compact ? (
                  <Check aria-hidden="true" size={14} strokeWidth={1.9} />
                ) : (
                  <UploadCloud aria-hidden="true" size={15} strokeWidth={1.9} />
                )
              }
              onClick={() => {
                onSave(pendingImage);
                setPendingImage(null);
              }}
              size="sm"
              type="button"
              variant="primary"
            >
              {compact ? 'Save' : 'Save Image'}
            </Button>
          </>
        ) : null}
        {value && !pendingImage ? (
          <Button
            className={cn(
              compact &&
                'min-h-9 flex-1 rounded-xl border-bronze/30 bg-midnight/32 px-3 text-xs sm:flex-none',
            )}
            icon={<Trash2 aria-hidden="true" size={compact ? 14 : 15} strokeWidth={1.9} />}
            onClick={onRemove}
            size="sm"
            type="button"
            variant="ghost"
          >
            {compact ? 'Remove' : 'Remove Image'}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
