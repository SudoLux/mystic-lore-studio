import { AlertCircle, Quote, Sparkles } from 'lucide-react';
import { cn } from '../../../lib/classes';
import { contentAlign, contentString, contentText } from './blockContent';
import type { EditorialBlockRendererProps } from './types';

export function HeadingBlock({ block }: EditorialBlockRendererProps) {
  const text = contentText(block.content) || 'Untitled heading';
  const eyebrow = contentString(block.content, 'eyebrow');
  const align = contentAlign(block.content);
  return (
    <header className={cn('max-w-4xl', align === 'center' ? 'mx-auto text-center' : align === 'right' ? 'ml-auto text-right' : '')}>
      {eyebrow ? <p className="mb-3 text-[0.62rem] uppercase tracking-[0.22em] text-[var(--editorial-accent)]">{eyebrow}</p> : null}
      <h3 className="font-display text-[clamp(1.8rem,4vw,3.8rem)] leading-[1.08] text-stardust">{text}</h3>
    </header>
  );
}

export function ParagraphBlock({ block, prominent = false }: EditorialBlockRendererProps) {
  const align = contentAlign(block.content);
  return (
    <p className={cn(
      'max-w-3xl text-stardust/70',
      prominent ? 'text-lg leading-8 sm:text-xl sm:leading-9' : 'text-sm leading-7 sm:text-base',
      align === 'center' ? 'mx-auto text-center' : align === 'right' ? 'ml-auto text-right' : '',
    )}>
      {contentText(block.content) || 'Editorial paragraph'}
    </p>
  );
}

export function QuoteBlock({ block }: EditorialBlockRendererProps) {
  const attribution = contentString(block.content, 'attribution');
  return (
    <figure className="max-w-3xl border-l border-[var(--editorial-accent)] py-2 pl-5 sm:pl-7">
      <Quote className="mb-4 text-[var(--editorial-accent)] opacity-72" size={20} />
      <blockquote className="font-display text-xl leading-8 text-stardust sm:text-2xl sm:leading-9">
        {contentText(block.content) || 'Editorial quote'}
      </blockquote>
      {attribution ? <figcaption className="mt-4 text-xs uppercase tracking-[0.16em] text-stardust/42">{attribution}</figcaption> : null}
    </figure>
  );
}

export function CalloutBlock({ block }: EditorialBlockRendererProps) {
  const tone = contentString(block.content, 'tone', 'note');
  const title = contentString(block.content, 'title');
  const Icon = tone === 'warning' ? AlertCircle : Sparkles;
  return (
    <aside className={cn(
      'editorial-theme-card max-w-3xl border p-4 sm:p-5',
      tone === 'warning'
        ? 'border-red-300/26 bg-red-300/[0.06]'
        : tone === 'highlight'
          ? 'border-[var(--editorial-accent)] bg-midnight/52'
          : 'border-stardust/14 bg-midnight/42',
    )}>
      <div className="flex gap-3">
        <Icon className="mt-0.5 shrink-0 text-[var(--editorial-accent)]" size={17} />
        <div>
          {title ? <h4 className="text-sm font-semibold text-stardust">{title}</h4> : null}
          <p className={cn('text-sm leading-6 text-stardust/66', title ? 'mt-2' : '')}>
            {contentString(block.content, 'body') || contentText(block.content) || 'Editorial callout'}
          </p>
        </div>
      </div>
    </aside>
  );
}
