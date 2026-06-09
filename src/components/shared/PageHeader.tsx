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
    <header className="mb-6 flex flex-col gap-5 border-b border-bronze/20 pb-6 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {badge ? (
          <div className="mb-3">
            <Badge variant="teal">{badge}</Badge>
          </div>
        ) : null}
        <h1 className="break-words text-3xl font-semibold leading-tight text-stardust sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl break-words text-sm leading-6 text-stardust/62 sm:text-base">
          {description}
        </p>
      </div>
      {children ? <div className="w-full md:w-auto md:shrink-0">{children}</div> : null}
    </header>
  );
}
