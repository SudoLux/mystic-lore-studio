import { cn } from '../../lib/classes';

type StudioSkeletonProps = {
  className?: string;
  compact?: boolean;
  label?: string;
};

/** A quiet, content-shaped loading state shared by Studio routes and workspaces. */
export function StudioSkeleton({
  className,
  compact = false,
  label = 'Opening your Studio workspace',
}: StudioSkeletonProps) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={cn('atelier-skeleton-shell', compact && 'atelier-skeleton-shell--compact', className)}
      role="status"
    >
      <span className="sr-only">{label}</span>
      <div className="atelier-skeleton atelier-skeleton--eyebrow" />
      <div className="atelier-skeleton atelier-skeleton--title" />
      <div className="atelier-skeleton atelier-skeleton--copy" />
      <div className="atelier-skeleton-grid" aria-hidden="true">
        <div className="atelier-skeleton atelier-skeleton--image" />
        <div className="atelier-skeleton-copy-stack">
          <div className="atelier-skeleton atelier-skeleton--line atelier-skeleton--line-long" />
          <div className="atelier-skeleton atelier-skeleton--line" />
          <div className="atelier-skeleton atelier-skeleton--line atelier-skeleton--line-short" />
        </div>
      </div>
    </div>
  );
}
