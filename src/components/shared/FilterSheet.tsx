import type { ReactNode } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';

type FilterSheetProps = {
  activeCount?: number;
  children: ReactNode;
  isOpen: boolean;
  onApply: () => void;
  onClear: () => void;
  onClose: () => void;
  title?: string;
};

export function FilterSheet({
  activeCount = 0,
  children,
  isOpen,
  onApply,
  onClear,
  onClose,
  title = 'Refine view',
}: FilterSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-bronze/22 bg-midnight/36 p-3 text-sm text-stardust/68">
        <SlidersHorizontal
          aria-hidden="true"
          className="text-ember"
          size={17}
          strokeWidth={1.9}
        />
        {activeCount > 0
          ? `${activeCount} active ${activeCount === 1 ? 'filter' : 'filters'}`
          : 'No filters active'}
      </div>
      <div className="grid gap-3">{children}</div>
      <div className="sticky bottom-0 -mx-4 mt-5 flex gap-3 border-t border-bronze/20 bg-midnight/94 p-4">
        <Button className="flex-1" onClick={onClear} variant="ghost">
          Clear
        </Button>
        <Button className="flex-1" onClick={onApply} variant="primary">
          Show Results
        </Button>
      </div>
    </BottomSheet>
  );
}
