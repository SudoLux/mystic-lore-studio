import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/classes';

type BottomSheetProps = {
  children: ReactNode;
  className?: string;
  isOpen: boolean;
  onClose: () => void;
  title: string;
};

export function BottomSheet({
  children,
  className,
  isOpen,
  onClose,
  title,
}: BottomSheetProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end bg-midnight/76 px-3 pt-10 backdrop-blur-xl sm:items-center sm:justify-center lg:hidden">
      <section
        aria-labelledby="bottom-sheet-title"
        aria-modal="true"
        className={cn(
          'studio-scrollbar max-h-[86dvh] w-full overflow-y-auto rounded-t-[1.65rem] border border-bronze/34 bg-[linear-gradient(145deg,rgba(27,58,99,0.34),rgba(10,10,10,0.99),rgba(61,43,31,0.68))] p-4 text-stardust shadow-[0_-28px_90px_rgba(0,0,0,0.62)] sm:max-w-xl sm:rounded-[1.65rem] sm:shadow-[0_30px_100px_rgba(0,0,0,0.62)]',
          className,
        )}
        role="dialog"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <div className="mb-3 h-1 w-12 rounded-full bg-bronze/48" />
            <h2 className="text-lg font-semibold" id="bottom-sheet-title">
              {title}
            </h2>
          </div>
          <button
            aria-label={`Close ${title}`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-bronze/28 bg-midnight/48 text-stardust/66"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={1.9} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
