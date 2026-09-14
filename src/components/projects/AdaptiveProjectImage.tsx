import type { LocalImageAsset } from '../../types/studio';
import { AdaptiveStoredImage } from '../shared/AdaptiveStoredImage';

type AdaptiveProjectImageProps = {
  alt?: string;
  asset: LocalImageAsset;
  className?: string;
  displayFit?: 'cover' | 'contain';
  foregroundClassName?: string;
  mode?: 'compact' | 'primary' | 'thumbnail';
  onFinalError?: () => void;
  priority?: boolean;
  refreshSource?: () => Promise<string>;
};

export function AdaptiveProjectImage({
  alt,
  asset,
  className,
  displayFit,
  foregroundClassName,
  mode = 'primary',
  onFinalError,
  priority = false,
  refreshSource,
}: AdaptiveProjectImageProps) {
  return (
    <AdaptiveStoredImage
      alt={alt}
      asset={asset}
      className={className}
      displayFit={displayFit}
      foregroundClassName={foregroundClassName}
      mode={mode}
      onFinalError={onFinalError}
      priority={priority}
      refreshSource={refreshSource}
    />
  );
}
