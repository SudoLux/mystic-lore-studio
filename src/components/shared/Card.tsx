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
        'rounded-[1.35rem] border border-bronze/28 bg-[linear-gradient(145deg,rgba(237,227,207,0.07),rgba(237,227,207,0.035))] p-5 text-stardust shadow-[0_22px_70px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(237,227,207,0.045)] backdrop-blur-xl',
        elevated &&
          'border-ember/36 bg-[linear-gradient(145deg,rgba(237,227,207,0.09),rgba(61,43,31,0.18))] shadow-[0_28px_90px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(237,227,207,0.07)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
