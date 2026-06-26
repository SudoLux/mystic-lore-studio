import type { ReactNode } from 'react';

type MobileActionBarProps = {
  children: ReactNode;
};

export function MobileActionBar({ children }: MobileActionBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-[4.95rem] z-30 px-4 sm:hidden">
      <div className="mx-auto flex max-w-md gap-2 rounded-2xl border border-bronze/28 bg-midnight/88 p-2 shadow-[0_18px_58px_rgba(0,0,0,0.46)] backdrop-blur-xl">
        {children}
      </div>
    </div>
  );
}
