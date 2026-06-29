import type { LocalImageAsset } from '../../types/studio';
import { AdaptiveStoredImage } from '../shared/AdaptiveStoredImage';

type AdaptiveProjectImageProps = {
  asset: LocalImageAsset;
  className?: string;
  foregroundClassName?: string;
  mode?: 'compact' | 'primary' | 'thumbnail';
};

export function AdaptiveProjectImage({
  asset,
  className,
  foregroundClassName,
  mode = 'primary',
}: AdaptiveProjectImageProps) {
  return (
    <AdaptiveStoredImage
      asset={asset}
      className={className}
      foregroundClassName={foregroundClassName}
      mode={mode}
    />
  );
}
