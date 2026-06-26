import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '../../lib/classes';
import type { NavItem, PageId } from '../../types/navigation';

type MobileNavProps = {
  activePage: PageId;
  navItems: NavItem[];
  onNavigate: (pageId: PageId) => void;
};

const primaryMobileLabels: Partial<Record<PageId, string>> = {
  dashboard: 'Home',
  projects: 'Projects',
  lookbooks: 'Books',
  fabrics: 'Fabrics',
};

export function MobileNav({ activePage, navItems, onNavigate }: MobileNavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const primaryNavItems = useMemo(
    () =>
      ['dashboard', 'projects', 'lookbooks', 'fabrics']
        .map((pageId) => navItems.find((item) => item.id === pageId))
        .filter((item): item is NavItem => Boolean(item)),
    [navItems],
  );
  const overflowNavItems = useMemo(
    () =>
      ['kanban', 'stats', 'settings']
        .map((pageId) => navItems.find((item) => item.id === pageId))
        .filter((item): item is NavItem => Boolean(item)),
    [navItems],
  );
  const hasActiveOverflow = overflowNavItems.some((item) => item.id === activePage);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        navRef.current &&
        !navRef.current.contains(event.target)
      ) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);

    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [isMenuOpen]);

  const handleNavigate = (pageId: PageId) => {
    setIsMenuOpen(false);
    onNavigate(pageId);
  };

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] pt-8 lg:hidden"
      ref={navRef}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(0deg,rgba(10,10,10,0.98),rgba(10,10,10,0.82)_62%,transparent)]"
      />

      {isMenuOpen ? (
        <div className="pointer-events-none absolute left-1/2 bottom-[5.9rem] flex -translate-x-1/2 translate-y-0 items-end justify-center opacity-100 transition duration-300">
          <div className="relative h-24 w-64">
            <div className="absolute inset-x-8 bottom-0 h-24 rounded-t-full border border-b-0 border-bronze/22 bg-[radial-gradient(circle_at_50%_100%,rgba(200,155,60,0.16),rgba(10,10,10,0.78)_58%,transparent_72%)] shadow-[0_-20px_55px_rgba(0,0,0,0.36)] backdrop-blur-xl" />
            {overflowNavItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              const positions = [
                'left-4 bottom-2',
                'left-1/2 bottom-10 -translate-x-1/2',
                'right-4 bottom-2',
              ];

              return (
                <button
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'pointer-events-auto absolute flex min-w-16 flex-col items-center gap-1 text-[0.64rem] font-medium text-stardust/68 transition duration-200',
                    positions[index],
                    isActive && 'text-stardust',
                  )}
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  type="button"
                >
                  <span
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-2xl border bg-midnight/88 shadow-[0_12px_34px_rgba(0,0,0,0.34)] backdrop-blur-xl transition duration-200',
                      isActive
                        ? 'border-ember/62 bg-ember/18 text-ember'
                        : 'border-bronze/30 text-stardust/70 hover:border-ember/45 hover:text-ember',
                    )}
                  >
                    <Icon aria-hidden="true" size={21} strokeWidth={1.85} />
                  </span>
                  <span>{item.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="relative mx-auto grid max-w-[28rem] grid-cols-[1fr_1fr_4.35rem_1fr_1fr] items-end gap-1 rounded-[1.65rem] border border-bronze/28 bg-midnight/88 px-2 pb-2 pt-2.5 shadow-[0_-18px_50px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(237,227,207,0.05)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(200,155,60,0.76),transparent)]" />
        {primaryNavItems.slice(0, 2).map((item) => (
          <MobileNavItem
            activePage={activePage}
            item={item}
            key={item.id}
            onNavigate={handleNavigate}
          />
        ))}

        <button
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? 'Close more navigation' : 'Open more navigation'}
          className={cn(
            'relative -mt-8 flex h-16 w-16 items-center justify-center justify-self-center rounded-full border text-midnight shadow-[0_18px_45px_rgba(200,155,60,0.28),0_18px_58px_rgba(0,0,0,0.46),inset_0_1px_0_rgba(255,255,255,0.34)] transition duration-300 active:scale-95',
            hasActiveOverflow || isMenuOpen
              ? 'border-stardust/70 bg-[linear-gradient(135deg,#C89B3C,#EDE3CF)]'
              : 'border-ember/70 bg-[linear-gradient(135deg,#9A6C3C,#C89B3C,#EDE3CF)]',
          )}
          onClick={() => setIsMenuOpen((current) => !current)}
          type="button"
        >
          <span className="absolute inset-1 rounded-full border border-midnight/16" />
          <Plus
            aria-hidden="true"
            className={cn('relative transition duration-300', isMenuOpen && 'rotate-45')}
            size={29}
            strokeWidth={2}
          />
        </button>

        {primaryNavItems.slice(2).map((item) => (
          <MobileNavItem
            activePage={activePage}
            item={item}
            key={item.id}
            onNavigate={handleNavigate}
          />
        ))}
      </div>
    </nav>
  );
}

function MobileNavItem({
  activePage,
  item,
  onNavigate,
}: {
  activePage: PageId;
  item: NavItem;
  onNavigate: (pageId: PageId) => void;
}) {
  const Icon = item.icon;
  const isActive = activePage === item.id;
  const label = primaryMobileLabels[item.id] ?? item.shortLabel;

  return (
    <button
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group relative flex min-h-[3.75rem] min-w-0 flex-col items-center justify-center gap-1 rounded-[1.15rem] border px-1 text-[0.68rem] font-medium leading-none transition duration-200',
        isActive
          ? 'border-ember/45 bg-ember/12 text-stardust shadow-[inset_0_1px_0_rgba(237,227,207,0.04)]'
          : 'border-transparent text-stardust/56 hover:border-bronze/30 hover:bg-stardust/[0.055] hover:text-stardust',
      )}
      onClick={() => onNavigate(item.id)}
      type="button"
    >
      <Icon
        aria-hidden="true"
        className={cn(
          'transition duration-200',
          isActive ? 'text-ember' : 'text-stardust/68 group-hover:text-ember',
        )}
        size={23}
        strokeWidth={1.85}
      />
      <span className="w-full truncate text-center">{label}</span>
      <span
        className={cn(
          'absolute bottom-1 h-0.5 rounded-full bg-ember transition-all duration-200',
          isActive ? 'w-6 opacity-100' : 'w-0 opacity-0',
        )}
      />
    </button>
  );
}
