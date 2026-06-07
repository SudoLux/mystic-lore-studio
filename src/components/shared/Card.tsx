import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/classes';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  elevated?: boolean;
};

export function Card({
  children,
  className,
  elevated = false,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-bronze/25 bg-stardust/[0.055] p-5 text-stardust shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl',
        elevated && 'border-ember/35 bg-stardust/[0.075]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
