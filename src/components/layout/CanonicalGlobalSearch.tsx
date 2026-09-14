import { BookOpen, CheckSquare2, Package, Search, Shirt, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CanonicalWorkspaceState } from '../../domains/workspace';
import type { PageId } from '../../types/navigation';
import { Badge } from '../shared/Badge';
import { Button } from '../shared/Button';

type Result = { detail: string; id: string; label: string; page: PageId; garmentId?: string; type: string };

export function CanonicalGlobalSearch({ onNavigate, onOpenGarment, state }: {
  onNavigate: (page: PageId) => void;
  onOpenGarment: (garmentId: string) => void;
  state: CanonicalWorkspaceState;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const index = useMemo<Result[]>(() => [
    ...state.garments.map((item) => ({ detail: `${item.garmentCode} · ${item.phase}`, garmentId: item.id, id: item.id, label: item.title, page: 'projects' as const, type: 'Garment' })),
    ...state.materials.map((item) => ({ detail: `${item.category} · ${item.status}`, id: item.id, label: item.name, page: 'fabrics' as const, type: 'Material' })),
    ...state.components.map((item) => ({ detail: `${item.category} · ${item.status}`, id: item.id, label: item.name, page: 'fabrics' as const, type: 'Component' })),
    ...state.releaseTasks.map((item) => ({ detail: `${item.priority} · ${item.status}`, garmentId: item.garmentId, id: item.id, label: item.title, page: 'kanban' as const, type: 'Task' })),
    ...state.editorialCollections.map((item) => ({ detail: item.status, id: item.id, label: item.title, page: 'lookbooks' as const, type: 'Editorial' })),
  ], [state]);
  const normalized = query.trim().toLowerCase();
  const results = normalized ? index.filter((item) => `${item.label} ${item.detail} ${item.type}`.toLowerCase().includes(normalized)).slice(0, 30) : [];

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); setOpen(true); requestAnimationFrame(() => input.current?.focus());
      } else if (event.key === 'Escape') { setOpen(false); setQuery(''); }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, []);

  const choose = (result: Result) => {
    if (result.garmentId && result.page === 'projects') onOpenGarment(result.garmentId);
    else onNavigate(result.page);
    setOpen(false); setQuery('');
  };

  return <section className="relative z-30 mb-4 sm:mb-5">
    <button aria-keyshortcuts="Meta+K Control+K" className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-bronze/24 bg-midnight/42 px-4 text-left text-sm text-stardust/50 lg:hidden" onClick={() => setOpen(true)} type="button"><Search aria-hidden="true" className="text-ember" size={17}/>Search or open commands</button>
    <label className="hidden min-h-12 items-center gap-3 rounded-2xl border border-bronze/28 bg-stardust/[0.06] px-4 focus-within:border-ember/60 lg:flex"><Search aria-hidden="true" className="text-ember" size={18}/><span className="sr-only">Global search</span><input className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stardust/38" onChange={(event) => { setQuery(event.target.value); setOpen(Boolean(event.target.value)); }} placeholder="Search your Studio or press ⌘K…" ref={input} value={query}/></label>
    {open ? <div className="studio-scrollbar fixed inset-0 z-50 overflow-y-auto bg-midnight/98 p-4 backdrop-blur-2xl lg:absolute lg:inset-auto lg:left-0 lg:right-0 lg:top-[calc(100%+0.5rem)] lg:max-h-[70vh] lg:rounded-3xl lg:border lg:border-bronze/32">
      <div className="flex items-center justify-between gap-3"><div><Badge variant="teal">Canonical search</Badge><p className="mt-2 text-sm text-stardust/55">{normalized ? `${results.length} matching records` : 'Search or choose a Studio area.'}</p></div><Button icon={<X size={15}/>} onClick={() => { setOpen(false); setQuery(''); }} size="sm">Close</Button></div>
      <label className="mt-4 flex min-h-12 items-center gap-3 rounded-xl border border-bronze/28 px-3 lg:hidden"><Search size={16}/><input autoFocus className="min-w-0 flex-1 bg-transparent outline-none" onChange={(event) => setQuery(event.target.value)} placeholder="Search Studio…" value={query}/></label>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">{results.map((result) => { const Icon = result.type === 'Garment' ? Shirt : result.type === 'Task' ? CheckSquare2 : result.type === 'Editorial' ? BookOpen : Package; return <button className="flex min-h-16 items-center gap-3 rounded-xl border border-bronze/22 p-3 text-left hover:border-ember/45" key={`${result.type}:${result.id}`} onClick={() => choose(result)} type="button"><Icon aria-hidden="true" className="shrink-0 text-ember" size={17}/><span className="min-w-0"><strong className="block truncate text-sm">{result.label}</strong><span className="mt-1 block truncate text-xs text-stardust/45">{result.type} · {result.detail}</span></span></button>; })}</div>
      {!normalized ? <div className="mt-4 grid gap-2 sm:grid-cols-3">{([['projects', 'Garment Library'], ['fabrics', 'Materials & Components'], ['kanban', 'Plan'], ['technical', 'Technical Studio'], ['lookbooks', 'Editorial'], ['portfolio', 'Public Cut']] as Array<[PageId, string]>).map(([page, label]) => <button className="min-h-11 rounded-xl border border-bronze/22 px-3 text-left text-sm" key={page} onClick={() => { onNavigate(page); setOpen(false); }} type="button">{label}</button>)}</div> : null}
    </div> : null}
  </section>;
}
