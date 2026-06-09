import { ImagePlus, Trash2, UploadCloud } from 'lucide-react';
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
        'rounded-3xl border border-bronze/24 bg-midnight/30 p-4',
        compact ? 'space-y-3' : 'space-y-4',
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
        <Button
          icon={<UploadCloud aria-hidden="true" size={15} strokeWidth={1.9} />}
          onClick={() => inputRef.current?.click()}
          size="sm"
          variant="secondary"
        >
          {value ? 'Replace Image' : 'Upload Image'}
        </Button>
      </div>

      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border border-bronze/20 bg-espresso/35',
          compact ? 'aspect-[16/9]' : 'aspect-[5/3]',
        )}
      >
        {visibleImage ? (
          <img
            alt={visibleImage.name}
            className="h-full w-full object-cover"
            src={visibleImage.dataUrl}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_20%_10%,rgba(200,155,60,0.22),transparent_30%),linear-gradient(135deg,rgba(27,58,99,0.58),rgba(10,10,10,0.72),rgba(61,43,31,0.72))] p-5 text-center">
            <ImagePlus
              aria-hidden="true"
              className="text-ember"
              size={26}
              strokeWidth={1.8}
            />
            <p className="text-sm leading-6 text-stardust/58">
              Placeholder gradient shown until an image is saved.
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

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {pendingImage ? (
          <>
            <Button
              onClick={() => setPendingImage(null)}
              size="sm"
              type="button"
              variant="ghost"
            >
              Cancel Preview
            </Button>
            <Button
              icon={<UploadCloud aria-hidden="true" size={15} strokeWidth={1.9} />}
              onClick={() => {
                onSave(pendingImage);
                setPendingImage(null);
              }}
              size="sm"
              type="button"
              variant="primary"
            >
              Save Image
            </Button>
          </>
        ) : null}
        {value && !pendingImage ? (
          <Button
            icon={<Trash2 aria-hidden="true" size={15} strokeWidth={1.9} />}
            onClick={onRemove}
            size="sm"
            type="button"
            variant="ghost"
          >
            Remove Image
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
