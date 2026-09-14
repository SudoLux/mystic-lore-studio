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
        'atelier-panel rounded-[1.35rem] p-5 text-stardust',
        elevated &&
          'border-ember/32 bg-[linear-gradient(145deg,rgba(27,58,99,0.18),rgba(61,43,31,0.13))] shadow-[0_24px_70px_rgba(0,0,0,0.25)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
