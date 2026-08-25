import { useId, useMemo, useState } from 'react';
import { ChevronDown, Plus, Search } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';
import { cn } from '../../lib/classes';
import type { RelationshipOption } from '../../domains/workspace';

type RelationshipPickerProps = {
  emptyLabel: string;
  label: string;
  onCreateInline?: () => void;
  onSelect: (id: string) => void;
  options: RelationshipOption[];
  selectedId?: string;
};

/** Search first, then create in-context. It intentionally exposes downstream use before linking. */
export function RelationshipPicker({
  emptyLabel,
  label,
  onCreateInline,
  onSelect,
  options,
  selectedId,
}: RelationshipPickerProps) {
  const id = useId();
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => options.filter((option) => [option.label, option.detail, ...option.inUseBy].join(' ').toLowerCase().includes(query.trim().toLowerCase())), [options, query]);

  return (
    <Card className="p-4" role="region" aria-label={label}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-stardust">{label}</h3>
          <p className="mt-1 text-xs leading-5 text-stardust/55">Search the shared library before creating a new record.</p>
        </div>
        {onCreateInline ? <Button icon={<Plus aria-hidden="true" size={15} />} onClick={onCreateInline} size="sm" variant="secondary">Create inline</Button> : null}
      </div>
      <label className="relative mt-4 block" htmlFor={id}>
        <span className="sr-only">Search {label}</span>
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stardust/45" size={16} />
        <input className="h-11 w-full rounded-xl border border-bronze/30 bg-midnight/55 pl-10 pr-3 text-sm text-stardust outline-none focus:border-ember/70 focus:ring-2 focus:ring-ember/30" id={id} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${label.toLowerCase()}`} value={query} />
      </label>
      <div className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
        {filtered.length ? filtered.map((option) => (
          <button aria-pressed={selectedId === option.id} className={cn('flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-ember/55', selectedId === option.id ? 'border-ember/60 bg-ember/12' : 'border-bronze/24 bg-midnight/35 hover:border-bronze/50')} key={option.id} onClick={() => onSelect(option.id)} type="button">
            <span>
              <span className="block text-sm font-medium text-stardust">{option.label}</span>
              <span className="block text-xs text-stardust/54">{option.detail}</span>
              {option.inUseBy.length ? <span className="mt-1 block text-[0.68rem] text-teal/90">Used by {option.inUseBy.join(', ')}</span> : null}
            </span>
            <ChevronDown aria-hidden="true" className="-rotate-90 text-stardust/45" size={16} />
          </button>
        )) : <p className="rounded-xl border border-dashed border-bronze/30 p-3 text-sm text-stardust/55">{emptyLabel}</p>}
      </div>
    </Card>
  );
}
