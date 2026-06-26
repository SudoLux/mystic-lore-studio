import type { ReactNode } from 'react';
import { Badge } from './Badge';

type PageHeaderProps = {
  badge?: string;
  children?: ReactNode;
  description: string;
  title: string;
};

export function PageHeader({
  badge,
  children,
  description,
  title,
}: PageHeaderProps) {
  return (
    <header className="mb-7 hidden flex-col gap-5 border-b border-bronze/24 pb-7 sm:flex xl:flex-row xl:items-end xl:justify-between">
      <div className="min-w-0">
        {badge ? (
          <div className="mb-3">
            <Badge variant="teal">{badge}</Badge>
          </div>
        ) : null}
        <h1 className="break-words text-[2rem] font-semibold leading-tight text-stardust sm:text-[2.35rem] xl:text-[2.55rem]">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl break-words text-sm leading-7 text-stardust/64 sm:text-base">
          {description}
        </p>
      </div>
      {children ? <div className="w-full xl:w-auto xl:shrink-0">{children}</div> : null}
    </header>
  );
}
