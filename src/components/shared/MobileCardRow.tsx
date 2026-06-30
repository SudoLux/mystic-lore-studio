import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '../../lib/classes';

type MobileCardRowProps = {
  badge?: ReactNode;
  image?: ReactNode;
  meta?: ReactNode;
  onClick: () => void;
  signal?: ReactNode;
  title: string;
};

export function MobileCardRow({
  badge,
  image,
  meta,
  onClick,
  signal,
  title,
}: MobileCardRowProps) {
  return (
    <button
      className="group flex w-full items-center gap-3 rounded-2xl border border-bronze/24 bg-[linear-gradient(145deg,rgba(237,227,207,0.06),rgba(10,10,10,0.22))] p-3 text-left text-stardust shadow-[0_16px_46px_rgba(0,0,0,0.22)] transition active:scale-[0.99] sm:hidden"
      onClick={onClick}
      type="button"
    >
      <div
        className={cn(
          'relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-bronze/22 bg-[linear-gradient(135deg,rgba(27,58,99,0.7),rgba(10,10,10,0.76),rgba(61,43,31,0.74))]',
          !image && 'shadow-[inset_0_0_42px_rgba(200,155,60,0.12)]',
        )}
      >
        {image}
      </div>
      <div className="min-w-0 flex-1">
        {badge ? <div className="mb-2 flex flex-wrap gap-1.5">{badge}</div> : null}
        <p className="line-clamp-2 text-base font-semibold leading-snug">
          {title}
        </p>
        {meta ? <div className="mt-1 line-clamp-1 text-xs text-stardust/52">{meta}</div> : null}
        {signal ? <div className="mt-3">{signal}</div> : null}
      </div>
      <ArrowRight
        aria-hidden="true"
        className="shrink-0 text-ember/72 transition group-active:translate-x-0.5"
        size={18}
        strokeWidth={1.9}
      />
    </button>
  );
}
