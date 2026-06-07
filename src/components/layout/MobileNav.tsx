import { cn } from '../../lib/classes';
import type { NavItem, PageId } from '../../types/navigation';

type MobileNavProps = {
  activePage: PageId;
  navItems: NavItem[];
  onNavigate: (pageId: PageId) => void;
};

export function MobileNav({ activePage, navItems, onNavigate }: MobileNavProps) {
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-bronze/30 bg-midnight/92 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-20px_45px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:hidden"
    >
      <div className="grid grid-cols-7 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <button
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex min-w-0 flex-col items-center gap-1 rounded-2xl border px-1 py-2 text-[0.68rem] font-medium leading-none transition duration-200',
                isActive
                  ? 'border-ember/55 bg-ember/14 text-stardust'
                  : 'border-transparent text-stardust/58 hover:border-bronze/35 hover:bg-stardust/6 hover:text-stardust',
              )}
              key={item.id}
              onClick={() => onNavigate(item.id)}
              type="button"
            >
              <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
              <span className="w-full truncate text-center">{item.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
