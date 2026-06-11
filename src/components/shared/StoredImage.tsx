import { useEffect, useState, type CSSProperties } from 'react';
import { cn } from '../../lib/classes';
import { getImageDisplay } from '../../lib/imageAssets';
import type { LocalImageAsset } from '../../types/studio';

type StoredImageProps = {
  asset: LocalImageAsset;
  className?: string;
};

export function StoredImage({ asset, className }: StoredImageProps) {
  const [hasError, setHasError] = useState(false);
  const display = getImageDisplay(asset);

  useEffect(() => {
    setHasError(false);
  }, [asset.dataUrl]);

  if (hasError) {
    return null;
  }

  return (
    <img
      alt={asset.name}
      className={cn(
        'h-full w-full object-cover [transform:scale(var(--image-zoom))]',
        className,
      )}
      key={asset.dataUrl}
      onError={() => setHasError(true)}
      src={asset.dataUrl}
      style={
        {
          '--image-zoom': display.zoom,
          objectFit: display.objectFit,
          objectPosition: `${display.objectPositionX}% ${display.objectPositionY}%`,
          transformOrigin: `${display.objectPositionX}% ${display.objectPositionY}%`,
        } as CSSProperties
      }
    />
  );
}
