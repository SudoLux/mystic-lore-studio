import type { ReactNode } from 'react';
import { Badge } from './Badge';

type MobilePageHeaderProps = {
  action?: ReactNode;
  badge?: string;
  kicker?: string;
  title: string;
};

export function MobilePageHeader({
  action,
  badge,
  kicker,
  title,
}: MobilePageHeaderProps) {
  return (
    <header className="mb-4 flex items-start justify-between gap-3 sm:hidden md:max-lg:mb-5">
      <div className="min-w-0">
        {badge ? <Badge variant="teal">{badge}</Badge> : null}
        <h1 className="font-display mt-3 text-[1.4rem] leading-[1.18] text-stardust">
          {title}
        </h1>
        {kicker ? <p className="mt-1 text-sm text-stardust/52">{kicker}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
