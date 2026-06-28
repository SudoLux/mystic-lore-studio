import { cn } from '../../lib/classes';
import {
  getImageDisplay,
  getImageOrientation,
} from '../../lib/imageAssets';
import type { LocalImageAsset } from '../../types/studio';
import { StoredImage } from '../shared/StoredImage';

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
  const orientation = getImageOrientation(asset);
  const display = getImageDisplay(asset);
  const useAmbientPortrait =
    mode === 'primary' &&
    orientation === 'portrait' &&
    display.objectFit === 'contain';
  const compactDisplay =
    mode === 'primary'
      ? undefined
      : {
          objectFit: 'cover' as const,
          objectPositionX: display.objectPositionX,
          objectPositionY: display.objectPositionY,
          zoom: display.zoom,
        };

  return (
    <div
      className={cn(
        'relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_20%_12%,rgba(200,155,60,0.18),transparent_30%),linear-gradient(145deg,rgba(27,58,99,0.52),rgba(10,10,10,0.78),rgba(61,43,31,0.62))]',
        className,
      )}
    >
      {useAmbientPortrait ? (
        <>
          <StoredImage
            asset={asset}
            className="absolute inset-0 scale-110 blur-2xl saturate-75 opacity-52"
            decorative
            displayOverride={{
              objectFit: 'cover',
              objectPositionX: display.objectPositionX,
              objectPositionY: display.objectPositionY,
              zoom: 1.08,
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(10,10,10,0.58),rgba(10,10,10,0.18)_28%,rgba(10,10,10,0.18)_72%,rgba(10,10,10,0.58)),linear-gradient(180deg,rgba(10,10,10,0.2),transparent_30%,transparent_70%,rgba(10,10,10,0.28))]" />
          <div className="absolute inset-[2.5%] z-10 overflow-hidden rounded-[inherit] border border-stardust/10 shadow-[0_22px_70px_rgba(0,0,0,0.32)]">
            <StoredImage
              asset={asset}
              className={cn('absolute inset-0', foregroundClassName)}
            />
          </div>
        </>
      ) : (
        <StoredImage
          asset={asset}
          className={cn('absolute inset-0', foregroundClassName)}
          displayOverride={compactDisplay}
        />
      )}
    </div>
  );
}
