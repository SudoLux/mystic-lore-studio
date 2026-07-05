import { cn } from '../../../lib/classes';
import { contentString } from './blockContent';
import type { EditorialBlockRendererProps } from './types';

export function DividerBlock({ block }: EditorialBlockRendererProps) {
  const label = contentString(block.content, 'label');
  const style = contentString(block.content, 'style', 'solid');
  return (
    <div className="flex max-w-4xl items-center gap-3 py-2">
      <span className={cn(
        'h-px flex-1',
        style === 'dotted'
          ? 'border-t border-dotted border-stardust/30'
          : style === 'gradient'
            ? 'bg-gradient-to-r from-transparent via-[var(--editorial-accent)] to-transparent'
            : 'bg-stardust/18',
      )} />
      {label ? <span className="text-[0.6rem] uppercase tracking-[0.18em] text-stardust/42">{label}</span> : null}
      {label ? <span className={cn('h-px flex-1', style === 'dotted' ? 'border-t border-dotted border-stardust/30' : 'bg-stardust/18')} /> : null}
    </div>
  );
}

export function SpacerBlock({ block }: EditorialBlockRendererProps) {
  const size = contentString(block.content, 'size', 'medium');
  return <div aria-hidden="true" className={size === 'small' ? 'h-4' : size === 'large' ? 'h-16 sm:h-24' : 'h-8 sm:h-12'} />;
}
