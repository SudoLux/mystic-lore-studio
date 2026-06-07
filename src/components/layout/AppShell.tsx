import type { ReactNode } from 'react';
import { MobileNav } from './MobileNav';
import { Sidebar } from './Sidebar';
import type { NavItem, PageId } from '../../types/navigation';

type AppShellProps = {
  activePage: PageId;
  children: ReactNode;
  navItems: NavItem[];
  onNavigate: (pageId: PageId) => void;
};

export function AppShell({
  activePage,
  children,
  navItems,
  onNavigate,
}: AppShellProps) {
  return (
    <div className="min-h-screen overflow-hidden bg-midnight text-stardust">
      <div className="min-h-screen bg-[linear-gradient(115deg,rgba(27,58,99,0.28)_0%,rgba(10,10,10,0)_36%),linear-gradient(245deg,rgba(154,108,60,0.16)_0%,rgba(10,10,10,0)_32%)]">
        <div className="mx-auto grid min-h-screen w-full max-w-[1600px] lg:grid-cols-[18rem_minmax(0,1fr)]">
          <Sidebar
            activePage={activePage}
            navItems={navItems}
            onNavigate={onNavigate}
          />
          <main className="min-w-0 px-4 pb-28 pt-5 sm:px-6 sm:pt-7 lg:px-8 lg:pb-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
      <MobileNav
        activePage={activePage}
        navItems={navItems}
        onNavigate={onNavigate}
      />
    </div>
  );
}
