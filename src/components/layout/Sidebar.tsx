import { cn } from '../../lib/classes';
import type { NavItem, PageId } from '../../types/navigation';
import { Badge } from '../shared/Badge';
import { BrandLockup } from './BrandLockup';
import { LogOut } from 'lucide-react';
import type { ReactNode } from 'react';

type SidebarProps = {
  activePage: PageId;
  navItems: NavItem[];
  onNavigate: (pageId: PageId) => void;
  onSignOut?: () => void;
  syncStatus?: ReactNode;
  userEmail?: string;
};

export function Sidebar({
  activePage,
  navItems,
  onNavigate,
  onSignOut,
  syncStatus,
  userEmail,
}: SidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[6.75rem] overflow-y-auto border-r border-bronze/30 bg-midnight/86 px-5 py-5 shadow-[18px_0_55px_rgba(0,0,0,0.2)] backdrop-blur-xl lg:flex lg:flex-col lg:max-xl:items-center lg:max-xl:px-3 xl:w-[18rem] xl:items-stretch">
      <div className="mb-6 shrink-0 lg:max-xl:flex lg:max-xl:flex-col lg:max-xl:items-center">
        <BrandLockup
          className="mb-4 lg:max-xl:[&_[data-brand-text]]:hidden"
          size="sidebar"
        />
        <Badge className="lg:max-xl:hidden" variant="ember">Studio</Badge>
      </div>

      <nav aria-label="Primary navigation" className="flex shrink-0 flex-col gap-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <button
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              className={cn(
                'group flex w-full items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition duration-200 lg:max-xl:justify-center lg:max-xl:px-2.5',
                isActive
                  ? 'border-ember/55 bg-ember/12 text-stardust shadow-[0_16px_40px_rgba(0,0,0,0.24)]'
                  : 'border-transparent text-stardust/68 hover:border-bronze/40 hover:bg-stardust/6 hover:text-stardust',
              )}
              key={item.id}
              onClick={() => onNavigate(item.id)}
              type="button"
            >
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-xl border transition duration-200',
                  isActive
                    ? 'border-ember/45 bg-midnight/70 text-ember'
                    : 'border-stardust/10 bg-stardust/5 text-stardust/58 group-hover:border-ember/25 group-hover:text-ember',
                )}
              >
                <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
              </span>
              <span className="min-w-0 lg:max-xl:hidden">
                <span className="block truncate text-sm font-medium">
                  {item.label}
                </span>
                <span className="block truncate text-xs text-stardust/46">
                  {item.description}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-bronze/25 bg-espresso/35 p-3 shadow-[0_18px_55px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(237,227,207,0.04)] lg:max-xl:w-full lg:max-xl:p-2">
        {syncStatus ? (
          <div className="mb-4 lg:max-xl:mb-2 lg:max-xl:[&_button]:h-11 lg:max-xl:[&_button]:min-h-11 lg:max-xl:[&_button]:w-full lg:max-xl:[&_button]:justify-center lg:max-xl:[&_button]:gap-1.5 lg:max-xl:[&_button]:px-0 lg:max-xl:[&_[data-sync-label]]:hidden">
            {syncStatus}
          </div>
        ) : null}
        <div className="lg:max-xl:hidden">
          <p className="text-sm font-medium text-stardust">Atelier Foundation</p>
          <p className="mt-2 text-sm leading-5 text-stardust/60">
            Garment, material, and presentation workspaces are staged for the next
            collection cycle.
          </p>
          {userEmail ? (
            <p className="mt-3 truncate text-xs text-stardust/42">{userEmail}</p>
          ) : null}
          {onSignOut ? (
            <button
              className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-bronze/30 bg-midnight/42 px-3 text-sm font-medium text-stardust/68 transition hover:border-ember/42 hover:bg-stardust/[0.07] hover:text-stardust"
              onClick={onSignOut}
              type="button"
            >
              <LogOut aria-hidden="true" size={16} strokeWidth={1.9} />
              Sign Out
            </button>
          ) : null}
        </div>
        {onSignOut ? (
          <button
            aria-label="Sign Out"
            className="hidden h-11 w-full items-center justify-center rounded-xl border border-bronze/30 bg-midnight/42 text-stardust/68 transition hover:border-ember/42 hover:bg-stardust/[0.07] hover:text-stardust lg:max-xl:flex"
            onClick={onSignOut}
            type="button"
          >
            <LogOut aria-hidden="true" size={17} strokeWidth={1.9} />
          </button>
        ) : null}
      </div>
    </aside>
  );
}
