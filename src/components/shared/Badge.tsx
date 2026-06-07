import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/classes';

type BadgeVariant = 'ember' | 'teal' | 'blue' | 'bronze';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const badgeVariants: Record<BadgeVariant, string> = {
  ember: 'border-ember/35 bg-ember/12 text-ember',
  teal: 'border-nebula/45 bg-nebula/18 text-stardust',
  blue: 'border-celestial/55 bg-celestial/26 text-stardust',
  bronze: 'border-bronze/45 bg-bronze/16 text-stardust',
};

export function Badge({
  children,
  className,
  variant = 'ember',
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium',
        badgeVariants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
