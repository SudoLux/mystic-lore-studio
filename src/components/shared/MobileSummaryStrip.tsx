import type { ReactNode } from 'react';

type SummaryItem = {
  icon?: ReactNode;
  label: string;
  value: string;
};

type MobileSummaryStripProps = {
  items: SummaryItem[];
};

export function MobileSummaryStrip({ items }: MobileSummaryStripProps) {
  return (
    <div className="studio-scrollbar flex gap-3 overflow-x-auto pb-1 sm:hidden">
      {items.map((item) => (
        <div
          className="min-w-[8.75rem] rounded-2xl border border-bronze/24 bg-midnight/42 p-3 shadow-[inset_0_1px_0_rgba(237,227,207,0.04)]"
          key={item.label}
        >
          <div className="mb-3 flex items-center gap-2 text-ember/86">
            {item.icon}
            <p className="text-[0.64rem] font-medium uppercase tracking-[0.14em] text-stardust/42">
              {item.label}
            </p>
          </div>
          <p className="text-lg font-semibold text-stardust">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
