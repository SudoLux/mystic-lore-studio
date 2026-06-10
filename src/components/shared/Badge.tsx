import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/classes';

type BadgeVariant = 'ember' | 'teal' | 'blue' | 'bronze';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const badgeVariants: Record<BadgeVariant, string> = {
  ember:
    'border-ember/40 bg-ember/13 text-ember shadow-[inset_0_1px_0_rgba(237,227,207,0.045)]',
  teal:
    'border-nebula/50 bg-nebula/20 text-stardust shadow-[inset_0_1px_0_rgba(237,227,207,0.045)]',
  blue:
    'border-celestial/60 bg-celestial/28 text-stardust shadow-[inset_0_1px_0_rgba(237,227,207,0.045)]',
  bronze:
    'border-bronze/48 bg-bronze/18 text-stardust shadow-[inset_0_1px_0_rgba(237,227,207,0.04)]',
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
        'inline-flex max-w-full items-center rounded-full border px-3 py-1 text-left text-[0.72rem] font-medium leading-5 tracking-[0.035em]',
        badgeVariants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
