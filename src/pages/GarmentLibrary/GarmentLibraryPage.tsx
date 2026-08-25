import { useMemo, useState, type FormEvent } from 'react';
import { FolderPlus, Layers3, Search, Shirt } from 'lucide-react';
import { Badge } from '../../components/shared/Badge';
import { Button } from '../../components/shared/Button';
import { CanonicalWorkspaceState } from '../../components/shared/CanonicalWorkspaceState';
import { Card } from '../../components/shared/Card';
import { PageHeader } from '../../components/shared/PageHeader';
import { useCanonicalWorkspace } from '../../hooks/useCanonicalWorkspace';

export function GarmentLibraryPage({ onOpenGarment }: { onOpenGarment: (id: string) => void }) {
  const { addCollection, addGarment, state } = useCanonicalWorkspace();
  const [query, setQuery] = useState('');
  const [collectionId, setCollectionId] = useState<string | 'all'>('all');
  const [addingGarment, setAddingGarment] = useState(false);
  const [addingCollection, setAddingCollection] = useState(false);
  const garments = useMemo(() => state?.garments.filter((garment) => {
    const text = `${garment.title} ${garment.garmentCode} ${garment.garmentType}`.toLowerCase();
    return text.includes(query.trim().toLowerCase()) && (collectionId === 'all' || garment.collectionId === collectionId);
  }) ?? [], [collectionId, query, state?.garments]);

  const createGarment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get('title') ?? '').trim();
    if (!title) return;
    const id = addGarment({ collectionId: String(form.get('collectionId') || '') || null, garmentType: String(form.get('garmentType') || 'Other'), phase: 'brief', status: 'draft', title });
    setAddingGarment(false);
    onOpenGarment(id);
  };
  const createCollection = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    if (!name) return;
    const id = addCollection(name, String(form.get('season') ?? ''));
    setCollectionId(id);
    setAddingCollection(false);
  };

  return <CanonicalWorkspaceState><section className="space-y-5">
    <PageHeader badge="Garments" description="The canonical library: every creative, material, technical, and story record resolves back to a garment." title="Garment Library">
      <div className="flex flex-wrap gap-2"><Button icon={<Layers3 aria-hidden="true" size={16} />} onClick={() => setAddingCollection((value) => !value)} size="sm">New collection</Button><Button icon={<FolderPlus aria-hidden="true" size={16} />} onClick={() => setAddingGarment((value) => !value)} size="sm" variant="primary">New garment</Button></div>
    </PageHeader>
    {addingCollection ? <Card><form className="grid gap-3 sm:grid-cols-[1fr_12rem_auto]" onSubmit={createCollection}><label><span className="sr-only">Collection name</span><input autoFocus className="field" name="name" placeholder="Collection name" required /></label><label><span className="sr-only">Season</span><input className="field" name="season" placeholder="Season / year" /></label><Button type="submit" variant="primary">Create collection</Button></form></Card> : null}
    {addingGarment ? <Card><form className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_0.8fr_auto]" onSubmit={createGarment}><label><span className="sr-only">Garment title</span><input autoFocus className="field" name="title" placeholder="Garment title" required /></label><label><span className="sr-only">Garment type</span><input className="field" defaultValue="Jacket" name="garmentType" /></label><label><span className="sr-only">Collection</span><select className="field" defaultValue="" name="collectionId"><option value="">No collection</option>{state?.collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select></label><Button type="submit" variant="primary">Create garment</Button></form></Card> : null}
    <Card className="p-3"><div className="grid gap-3 lg:grid-cols-[1fr_auto]"><label className="relative"><span className="sr-only">Search garments</span><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stardust/45" size={17}/><input className="field pl-10" onChange={(event) => setQuery(event.target.value)} placeholder="Search garment code, title, or type" type="search" value={query}/></label><div className="flex gap-2 overflow-x-auto pb-1">{[{ id: 'all', name: 'All garments' }, ...(state?.collections ?? [])].map((collection) => <button aria-pressed={collectionId === collection.id} className={collectionId === collection.id ? 'rounded-xl border border-ember/70 bg-ember px-3 text-sm font-medium text-midnight' : 'rounded-xl border border-bronze/30 px-3 text-sm text-stardust/66'} key={collection.id} onClick={() => setCollectionId(collection.id)} type="button">{collection.name}</button>)}</div></div></Card>
    {collectionId !== 'all' ? <CollectionWorkspace collectionId={collectionId} onOpenGarment={onOpenGarment} /> : null}
    {garments.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{garments.map((garment) => { const collection = state?.collections.find((item) => item.id === garment.collectionId); return <button className="rounded-[1.35rem] border border-bronze/28 bg-[linear-gradient(145deg,rgba(27,58,99,0.28),rgba(10,10,10,0.8))] p-5 text-left transition hover:-translate-y-0.5 hover:border-ember/55 focus:outline-none focus:ring-2 focus:ring-ember/70" key={garment.id} onClick={() => onOpenGarment(garment.id)} type="button"><div className="flex items-center justify-between gap-3"><Badge variant={garment.status === 'on_hold' ? 'ember' : 'teal'}>{garment.status.replace('_', ' ')}</Badge><span className="font-mono text-xs text-ember/85">{garment.garmentCode}</span></div><h2 className="font-display mt-5 text-2xl text-stardust">{garment.title}</h2><p className="mt-2 text-sm text-stardust/62">{garment.garmentType} · {collection?.name ?? 'Uncollected'}</p><div className="mt-6 flex items-center justify-between border-t border-bronze/20 pt-4 text-xs"><span className="text-stardust/48">{garment.phase}</span><span className="text-teal">Open workspace →</span></div></button>; })}</div> : <Card className="border-dashed text-center"><Shirt aria-hidden="true" className="mx-auto text-stardust/45"/><h2 className="mt-3 text-lg font-semibold">No garments match this view</h2><p className="mt-2 text-sm text-stardust/60">Create a garment or clear the current search and collection filters.</p></Card>}
  </section></CanonicalWorkspaceState>;
}

function CollectionWorkspace({ collectionId, onOpenGarment }: { collectionId: string; onOpenGarment: (id: string) => void }) {
  const { state } = useCanonicalWorkspace();
  const collection = state?.collections.find((item) => item.id === collectionId);
  const garments = state?.garments.filter((item) => item.collectionId === collectionId) ?? [];
  if (!collection) return null;
  const defined = garments.filter((item) => item.phase !== 'brief').length;
  return <Card className="border-teal/35"><div className="flex flex-wrap items-start justify-between gap-3"><div><Badge variant="blue">Collection workspace</Badge><h2 className="font-display mt-3 text-3xl">{collection.name}</h2><p className="mt-2 text-sm text-stardust/62">{collection.season ?? 'Season open'} · {garments.length} garments</p></div><Badge variant="teal">{defined}/{garments.length || 0} defined</Badge></div><div className="mt-5 grid gap-3 md:grid-cols-3"><Metric label="Line plan" value={`${garments.length} garments`} /><Metric label="Defined" value={`${defined} moved beyond brief`} /><Metric label="Blocked" value={`${garments.filter((item) => item.status === 'on_hold').length}`} /></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[32rem] text-left text-sm"><thead className="text-xs uppercase tracking-[0.12em] text-stardust/48"><tr><th className="pb-2">Garment</th><th className="pb-2">Type</th><th className="pb-2">Phase</th><th className="pb-2">Status</th></tr></thead><tbody>{garments.map((garment) => <tr className="border-t border-bronze/18" key={garment.id}><td className="py-3"><button className="text-left font-medium text-stardust underline-offset-4 hover:text-ember hover:underline" onClick={() => onOpenGarment(garment.id)}>{garment.title}</button></td><td>{garment.garmentType}</td><td>{garment.phase}</td><td>{garment.status}</td></tr>)}</tbody></table></div></Card>;
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-bronze/24 bg-midnight/35 p-3"><p className="text-xs uppercase tracking-[0.12em] text-stardust/45">{label}</p><p className="mt-2 text-sm font-medium text-stardust">{value}</p></div>; }
