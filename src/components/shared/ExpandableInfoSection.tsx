import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/classes';

type ExpandableInfoSectionProps = {
  children: ReactNode;
  defaultOpen?: boolean;
  summary?: string;
  title: string;
};

export function ExpandableInfoSection({
  children,
  defaultOpen = false,
  summary,
  title,
}: ExpandableInfoSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="rounded-2xl border border-bronze/24 bg-midnight/34 sm:hidden">
      <button
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <div className="min-w-0">
          <p className="font-semibold text-stardust">{title}</p>
          {summary ? (
            <p className="mt-1 line-clamp-1 text-sm text-stardust/50">{summary}</p>
          ) : null}
        </div>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'shrink-0 text-ember transition',
            isOpen && 'rotate-180',
          )}
          size={18}
          strokeWidth={1.9}
        />
      </button>
      {isOpen ? <div className="border-t border-bronze/18 p-4 pt-3">{children}</div> : null}
    </section>
  );
}
