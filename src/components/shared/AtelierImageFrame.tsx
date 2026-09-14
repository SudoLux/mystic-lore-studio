import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/classes';

type AtelierImageFrameProps = HTMLAttributes<HTMLDivElement> & {
  emphasis?: 'hero' | 'library' | 'thumbnail';
};

/** Shared media framing for the image-led Studio surfaces. */
export function AtelierImageFrame({
  children,
  className,
  emphasis = 'library',
  ...props
}: AtelierImageFrameProps) {
  return (
    <div
      className={cn(
        'atelier-image-frame relative h-full w-full overflow-hidden',
        emphasis === 'hero' && 'atelier-image-frame--hero',
        emphasis === 'thumbnail' && 'atelier-image-frame--thumbnail',
        className,
      )}
      data-image-frame={emphasis}
      {...props}
    >
      {children}
    </div>
  );
}
