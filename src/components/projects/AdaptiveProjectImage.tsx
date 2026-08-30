import type { LocalImageAsset } from '../../types/studio';
import { AdaptiveStoredImage } from '../shared/AdaptiveStoredImage';

type AdaptiveProjectImageProps = {
  alt?: string;
  asset: LocalImageAsset;
  className?: string;
  displayFit?: 'cover' | 'contain';
  foregroundClassName?: string;
  mode?: 'compact' | 'primary' | 'thumbnail';
  priority?: boolean;
};

export function AdaptiveProjectImage({
  alt,
  asset,
  className,
  displayFit,
  foregroundClassName,
  mode = 'primary',
  priority = false,
}: AdaptiveProjectImageProps) {
  return (
    <AdaptiveStoredImage
      alt={alt}
      asset={asset}
      className={className}
      displayFit={displayFit}
      foregroundClassName={foregroundClassName}
      mode={mode}
      priority={priority}
    />
  );
}
