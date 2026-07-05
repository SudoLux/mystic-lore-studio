import { Braces } from 'lucide-react';
import { contentText } from './blockContent';
import type { EditorialBlockRendererProps } from './types';

export function UnknownBlock({ block }: EditorialBlockRendererProps) {
  return (
    <div className="flex max-w-3xl gap-3 rounded-xl border border-dashed border-stardust/16 bg-midnight/30 p-4 text-stardust/48">
      <Braces className="mt-0.5 shrink-0 text-[var(--editorial-accent)] opacity-65" size={16} />
      <div className="min-w-0">
        <p className="text-[0.58rem] uppercase tracking-[0.16em]">Unsupported block · {block.type}</p>
        <p className="mt-2 break-words text-xs leading-5">{contentText(block.content) || 'This block is preserved and ready for a future renderer.'}</p>
      </div>
    </div>
  );
}
