import type { HTMLAttributes } from 'react';
import mysticLoreLogo from '../../assets/mystic-lore-logo.png';
import { cn } from '../../lib/classes';

type BrandLockupSize = 'sidebar' | 'mobile' | 'settings';

type BrandLockupProps = HTMLAttributes<HTMLDivElement> & {
  showText?: boolean;
  size?: BrandLockupSize;
  subtitle?: string;
};

const markSizes: Record<BrandLockupSize, string> = {
  mobile: 'h-9 w-9 rounded-xl p-1.5',
  settings: 'h-14 w-14 rounded-2xl p-2',
  sidebar: 'h-12 w-12 rounded-2xl p-2',
};

const titleSizes: Record<BrandLockupSize, string> = {
  mobile: 'text-sm',
  settings: 'text-base',
  sidebar: 'text-sm',
};

export function BrandLockup({
  className,
  showText = true,
  size = 'sidebar',
  subtitle = 'Studio control center',
  ...props
}: BrandLockupProps) {
  return (
    <div
      aria-label={showText ? undefined : 'Mystic Lore Studio'}
      className={cn('flex min-w-0 items-center gap-3', className)}
      {...props}
    >
      <span
        className={cn(
          'flex shrink-0 items-center justify-center border border-ember/42 bg-[radial-gradient(circle_at_50%_30%,rgba(200,155,60,0.16),rgba(10,10,10,0.78))] shadow-[0_14px_38px_rgba(200,155,60,0.13),inset_0_1px_0_rgba(237,227,207,0.06)]',
          markSizes[size],
        )}
      >
        <img
          alt=""
          aria-hidden="true"
          className="h-full w-full object-contain drop-shadow-[0_0_12px_rgba(200,155,60,0.22)]"
          src={mysticLoreLogo}
        />
      </span>
      {showText ? (
        <span className="min-w-0">
          <span
            className={cn(
              'block truncate font-semibold leading-tight text-stardust',
              titleSizes[size],
            )}
          >
            Mystic Lore
          </span>
          <span className="block truncate text-xs leading-5 text-stardust/58">
            {subtitle}
          </span>
        </span>
      ) : null}
    </div>
  );
}
