import type { ReactNode } from 'react';
import { MobileNav } from './MobileNav';
import { Sidebar } from './Sidebar';
import type { NavItem, PageId } from '../../types/navigation';

type AppShellProps = {
  activePage: PageId;
  children: ReactNode;
  globalSearch?: ReactNode;
  navItems: NavItem[];
  onNavigate: (pageId: PageId) => void;
};

export function AppShell({
  activePage,
  children,
  globalSearch,
  navItems,
  onNavigate,
}: AppShellProps) {
  return (
    <div className="min-h-screen overflow-hidden bg-midnight text-stardust">
      <div className="min-h-screen bg-[radial-gradient(circle_at_8%_0%,rgba(200,155,60,0.08),transparent_24rem),linear-gradient(115deg,rgba(27,58,99,0.24)_0%,rgba(10,10,10,0)_38%),linear-gradient(245deg,rgba(154,108,60,0.14)_0%,rgba(10,10,10,0)_34%)]">
        <div className="mx-auto grid min-h-screen w-full max-w-[1760px] lg:grid-cols-[18rem_minmax(0,1fr)]">
          <Sidebar
            activePage={activePage}
            navItems={navItems}
            onNavigate={onNavigate}
          />
          <main className="min-w-0 px-4 pb-28 pt-5 sm:px-6 sm:pt-7 lg:px-8 lg:pb-8 xl:px-10">
            <div className="mx-auto w-full max-w-[88rem]">
              {globalSearch}
              {children}
            </div>
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
