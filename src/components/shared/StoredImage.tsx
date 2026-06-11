import { useEffect, useState } from 'react';
import { cn } from '../../lib/classes';
import type { LocalImageAsset } from '../../types/studio';

type StoredImageProps = {
  asset: LocalImageAsset;
  className?: string;
};

export function StoredImage({ asset, className }: StoredImageProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [asset.dataUrl]);

  if (hasError) {
    return null;
  }

  return (
    <img
      alt={asset.name}
      className={cn('h-full w-full object-cover', className)}
      key={asset.dataUrl}
      onError={() => setHasError(true)}
      src={asset.dataUrl}
    />
  );
}
