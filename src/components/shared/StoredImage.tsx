import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { cn } from '../../lib/classes';
import {
  getImageDisplay,
  type ImageDisplaySettings,
} from '../../lib/imageAssets';
import { refreshSignedImageUrl } from '../../lib/supabaseStudio';
import type { LocalImageAsset } from '../../types/studio';

type StoredImageProps = {
  alt?: string;
  asset: LocalImageAsset;
  className?: string;
  decorative?: boolean;
  displayOverride?: Partial<ImageDisplaySettings>;
};

export function StoredImage({
  alt,
  asset,
  className,
  decorative = false,
  displayOverride,
}: StoredImageProps) {
  const [hasError, setHasError] = useState(false);
  const [source, setSource] = useState(asset.remoteUrl ?? asset.dataUrl);
  const refreshAttempted = useRef(false);
  const display = { ...getImageDisplay(asset), ...displayOverride };

  useEffect(() => {
    setSource(asset.remoteUrl ?? asset.dataUrl);
    setHasError(false);
    refreshAttempted.current = false;
  }, [asset.dataUrl, asset.remoteUrl]);

  if (hasError || !source) {
    return null;
  }

  return (
    <img
      alt={decorative ? '' : (alt ?? asset.name)}
      aria-hidden={decorative || undefined}
      className={cn(
        'h-full w-full object-cover [transform:scale(var(--image-zoom))]',
        className,
      )}
      key={source}
      onError={() => {
        if (
          asset.storagePath &&
          source !== asset.dataUrl &&
          !refreshAttempted.current
        ) {
          refreshAttempted.current = true;
          void refreshSignedImageUrl(asset.storagePath)
            .then((url) => {
              setSource(url);
              setHasError(false);
            })
            .catch(() => {
              if (asset.dataUrl) setSource(asset.dataUrl);
              else setHasError(true);
            });
          return;
        }
        setHasError(true);
      }}
      src={source}
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
