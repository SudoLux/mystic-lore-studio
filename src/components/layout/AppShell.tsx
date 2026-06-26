import type { ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { BrandLockup } from './BrandLockup';
import { MobileNav } from './MobileNav';
import { Sidebar } from './Sidebar';
import type { NavItem, PageId } from '../../types/navigation';

type AppShellProps = {
  activePage: PageId;
  children: ReactNode;
  globalSearch?: ReactNode;
  navItems: NavItem[];
  onNavigate: (pageId: PageId) => void;
  onSignOut?: () => void;
  syncStatus?: ReactNode;
  userEmail?: string;
};

export function AppShell({
  activePage,
  children,
  globalSearch,
  navItems,
  onNavigate,
  onSignOut,
  syncStatus,
  userEmail,
}: AppShellProps) {
  const activeNavItem = navItems.find((item) => item.id === activePage);

  return (
    <div className="min-h-screen bg-midnight text-stardust">
      <div className="min-h-screen bg-[radial-gradient(circle_at_8%_0%,rgba(200,155,60,0.08),transparent_24rem),linear-gradient(115deg,rgba(27,58,99,0.24)_0%,rgba(10,10,10,0)_38%),linear-gradient(245deg,rgba(154,108,60,0.14)_0%,rgba(10,10,10,0)_34%)]">
        <div className="mx-auto grid min-h-screen w-full max-w-[1760px] lg:grid-cols-[18rem_minmax(0,1fr)]">
          <Sidebar
            activePage={activePage}
            navItems={navItems}
            onNavigate={onNavigate}
            onSignOut={onSignOut}
            syncStatus={syncStatus}
            userEmail={userEmail}
          />
          <main className="min-w-0 px-4 pb-32 pt-4 sm:px-6 sm:pt-7 lg:px-8 lg:pb-8 xl:px-10">
            <div className="mx-auto w-full max-w-[88rem]">
              <div className="mb-3 rounded-2xl border border-bronze/22 bg-midnight/58 p-2.5 shadow-[0_16px_45px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(237,227,207,0.035)] backdrop-blur-xl lg:hidden">
                <div className="flex items-center justify-between gap-3">
                  <BrandLockup
                    showText={false}
                    size="mobile"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-tight text-stardust">
                      {activeNavItem?.label ?? 'Mystic Lore'}
                    </p>
                    <p className="truncate text-xs text-stardust/48">
                      {userEmail ?? activeNavItem?.description ?? 'Studio cockpit'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {syncStatus}
                    {onSignOut ? (
                      <button
                        aria-label="Sign out"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-bronze/24 bg-midnight/42 text-stardust/60 transition hover:border-ember/42 hover:text-ember"
                        onClick={onSignOut}
                        type="button"
                      >
                        <LogOut aria-hidden="true" size={16} strokeWidth={1.9} />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
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
