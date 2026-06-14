import { cn } from '../../lib/classes';
import { getImageDisplay } from '../../lib/imageAssets';
import type { LocalImageAsset } from '../../types/studio';

type ImageReadabilityOverlayProps = {
  asset?: LocalImageAsset;
  className?: string;
  variant?: 'card' | 'controls' | 'hero';
};

const intensityStyles = {
  auto: {
    base: 'bg-midnight/18',
    bottom: 'from-transparent via-midnight/28 to-midnight/88',
    top: 'from-midnight/72 via-midnight/24 to-transparent',
  },
  light: {
    base: 'bg-midnight/10',
    bottom: 'from-transparent via-midnight/18 to-midnight/72',
    top: 'from-midnight/58 via-midnight/16 to-transparent',
  },
  strong: {
    base: 'bg-midnight/32',
    bottom: 'from-transparent via-midnight/44 to-midnight/95',
    top: 'from-midnight/88 via-midnight/38 to-transparent',
  },
};

const variantStyles = {
  card: {
    bottom: 'h-2/3',
    top: 'h-1/2',
  },
  controls: {
    bottom: 'h-1/2',
    top: 'h-2/5',
  },
  hero: {
    bottom: 'h-4/5',
    top: 'h-1/2',
  },
};

export function ImageReadabilityOverlay({
  asset,
  className,
  variant = 'card',
}: ImageReadabilityOverlayProps) {
  const intensity = asset ? getImageDisplay(asset).overlayIntensity : 'auto';
  const styles = intensityStyles[intensity];
  const zones = variantStyles[variant];

  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0', className)}
      data-image-overlay={intensity}
    >
      <div className={cn('absolute inset-0', styles.base)} />
      <div
        className={cn(
          'absolute inset-x-0 top-0 bg-gradient-to-b',
          zones.top,
          styles.top,
        )}
      />
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 bg-gradient-to-b',
          zones.bottom,
          styles.bottom,
        )}
      />
    </div>
  );
}
