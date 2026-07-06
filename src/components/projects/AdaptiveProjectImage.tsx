import type { LocalImageAsset } from '../../types/studio';
import { AdaptiveStoredImage } from '../shared/AdaptiveStoredImage';

type AdaptiveProjectImageProps = {
  asset: LocalImageAsset;
  className?: string;
  displayFit?: 'cover' | 'contain';
  foregroundClassName?: string;
  mode?: 'compact' | 'primary' | 'thumbnail';
};

export function AdaptiveProjectImage({
  asset,
  className,
  displayFit,
  foregroundClassName,
  mode = 'primary',
}: AdaptiveProjectImageProps) {
  return (
    <AdaptiveStoredImage
      asset={asset}
      className={className}
      displayFit={displayFit}
      foregroundClassName={foregroundClassName}
      mode={mode}
    />
  );
}
