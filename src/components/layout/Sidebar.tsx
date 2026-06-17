import { cn } from '../../lib/classes';
import type { NavItem, PageId } from '../../types/navigation';
import { Badge } from '../shared/Badge';
import { BrandLockup } from './BrandLockup';
import { LogOut } from 'lucide-react';

type SidebarProps = {
  activePage: PageId;
  navItems: NavItem[];
  onNavigate: (pageId: PageId) => void;
  onSignOut?: () => void;
  userEmail?: string;
};

export function Sidebar({
  activePage,
  navItems,
  onNavigate,
  onSignOut,
  userEmail,
}: SidebarProps) {
  return (
    <aside className="hidden min-h-screen border-r border-bronze/30 bg-midnight/80 px-5 py-6 backdrop-blur-xl lg:flex lg:flex-col">
      <div className="mb-8">
        <BrandLockup className="mb-5" size="sidebar" />
        <Badge variant="ember">Studio</Badge>
      </div>

      <nav aria-label="Primary navigation" className="flex flex-1 flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <button
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'group flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition duration-200',
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
                  'flex h-9 w-9 items-center justify-center rounded-xl border transition duration-200',
                  isActive
                    ? 'border-ember/45 bg-midnight/70 text-ember'
                    : 'border-stardust/10 bg-stardust/5 text-stardust/58 group-hover:border-ember/25 group-hover:text-ember',
                )}
              >
                <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
              </span>
              <span className="min-w-0">
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

      <div className="mt-8 rounded-2xl border border-bronze/25 bg-espresso/35 p-4">
        <p className="text-sm font-medium text-stardust">Atelier Foundation</p>
        <p className="mt-2 text-sm leading-6 text-stardust/60">
          Garment, material, and presentation workspaces are staged for the next
          collection cycle.
        </p>
        {userEmail ? (
          <p className="mt-4 truncate text-xs text-stardust/42">{userEmail}</p>
        ) : null}
        {onSignOut ? (
          <button
            className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-bronze/30 bg-midnight/42 px-3 text-sm font-medium text-stardust/68 transition hover:border-ember/42 hover:bg-stardust/[0.07] hover:text-stardust"
            onClick={onSignOut}
            type="button"
          >
            <LogOut aria-hidden="true" size={16} strokeWidth={1.9} />
            Sign Out
          </button>
        ) : null}
      </div>
    </aside>
  );
}
