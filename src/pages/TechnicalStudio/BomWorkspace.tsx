import { useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, Check, ChevronDown, Package, Plus, Search, Trash2, X } from 'lucide-react';
import { Badge } from '../../components/shared/Badge';
import { Button } from '../../components/shared/Button';
import { CanonicalMediaImage } from '../../components/shared/CanonicalMediaImage';
import { bomItemLabel, componentQuantityUnits, materialQuantityUnits, quantityUnits, validateBom } from '../../domains/technical';
import type { CanonicalBomItem, CanonicalInventoryEntry, CanonicalMaterial, CanonicalMaterialVariant, CanonicalWorkspaceState } from '../../domains/workspace';
import { useReleaseStudio } from '../../hooks/useReleaseStudio';
import { cn } from '../../lib/classes';
import { canonicalMaterialVariantCover } from '../../lib/canonicalMaterialPresentation';

type BomView = 'design' | 'sourcing' | 'cost';
type BomCategory = 'fabrics' | 'interfacing' | 'trims' | 'labels' | 'thread' | 'packaging' | 'other';
type ItemType = CanonicalBomItem['itemType'];
type CandidateRow = { id: string; type: 'material_variant' | 'component_variant'; category: string; label: string; detail: string };

const categoryLabels: Record<BomCategory, string> = {
  fabrics: 'Fabrics',
  interfacing: 'Interfacing & support',
  trims: 'Trims & hardware',
  labels: 'Labels',
  thread: 'Thread & decoration',
  packaging: 'Packaging',
  other: 'Custom / other',
};
const categoryOrder: BomCategory[] = ['fabrics', 'interfacing', 'trims', 'labels', 'thread', 'packaging', 'other'];
const placementOptions = ['Main Shell', 'Lining', 'Collar', 'Sleeve', 'Pocket', 'Facing', 'Interfacing', 'Closure', 'Embroidery', 'Center Front', 'Center Back Neck', 'Side Seam', 'Hem', 'Packaging'];

/** Visual presentation over canonical BOM rows; no BOM data is duplicated here. */
export function BomWorkspace({ specId }: { specId: string }) {
  const { createBom, removeBom, reorderBom, state, substituteBom, updateBom } = useReleaseStudio();
  const [view, setView] = useState<BomView>('design');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'attention' | 'approved'>('all');
  const [category, setCategory] = useState<'all' | BomCategory>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<BomCategory>>(() => new Set());
  const items = state!.bomItems.filter((item) => item.specId === specId).sort((left, right) => left.sortOrder - right.sortOrder);
  const issues = validateBom(state!, specId);
  const visible = items.filter((item) => {
    const text = `${bomItemLabel(state!, item)} ${item.description} ${item.placement} ${supplierName(state!, item.supplierItemId)}`.toLowerCase();
    if (query.trim() && !text.includes(query.trim().toLowerCase())) return false;
    if (filter === 'approved' && item.status !== 'approved') return false;
    if (filter === 'attention' && !itemNeedsAttention(item, issues)) return false;
    return category === 'all' || bomCategory(state!, item) === category;
  });
  const groups = categoryOrder.map((key) => ({ key, items: visible.filter((item) => bomCategory(state!, item) === key) })).filter((group) => group.items.length);
  const selected = items.find((item) => item.id === selectedId) ?? visible[0] ?? items[0] ?? null;
  const approved = items.filter((item) => item.status === 'approved').length;
  const currencies = new Set(items.map((item) => item.currency));
  const estimatedCost = items.reduce((sum, item) => sum + item.quantity * item.unitCost + item.costImpact, 0);

  const add = (input: Parameters<typeof createBom>[0]) => {
    try {
      const id = createBom(input);
      setSelectedId(id);
      setIsAdding(false);
      setNotice('Component added to this garment’s BOM. Its Vault record remains shared and unchanged.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The component could not be added.');
    }
  };
  const remove = (item: CanonicalBomItem) => {
    if (!window.confirm(`Remove “${bomItemLabel(state!, item)}” from this garment’s BOM? Its Material Vault/component record and private image will remain available elsewhere.`)) return;
    try {
      removeBom(item.id);
      setSelectedId(null);
      setNotice('Component removed from this garment’s BOM.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The component could not be removed.');
    }
  };

  return <section className="space-y-5">
    <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
      <div>
        <p className="text-[0.68rem] uppercase tracking-[0.22em] text-ember">Technical Studio</p>
        <h1 className="font-display mt-2 text-4xl text-stardust sm:text-5xl">Bill of materials</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stardust/55">The materials, trims, and components required to make this garment.</p>
      </div>
      <Button icon={<Plus aria-hidden="true" size={16}/>} onClick={() => setIsAdding(true)} variant="primary">Add BOM item</Button>
    </header>

    <section aria-label="BOM health" className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-bronze/22 bg-stardust/[0.025] px-4 py-3 text-sm text-stardust/70">
      <strong className="text-stardust">{items.length} component{items.length === 1 ? '' : 's'}</strong><span aria-hidden="true" className="text-bronze/55">·</span>
      <span>{approved} approved</span><span aria-hidden="true" className="text-bronze/55">·</span>
      <button className="rounded text-left text-ember underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember" onClick={() => setFilter('attention')} type="button">{issues.length} need{issues.length === 1 ? 's' : ''} attention</button>
      {items.length && currencies.size === 1 ? <><span aria-hidden="true" className="text-bronze/55">·</span><span>Estimated BOM cost {money(estimatedCost, items[0].currency)}</span></> : null}
      {currencies.size > 1 ? <><span aria-hidden="true" className="text-bronze/55">·</span><span>Costs use multiple currencies</span></> : null}
    </section>

    {notice ? <p aria-live="polite" className="rounded-xl border border-bronze/28 bg-bronze/[0.07] px-4 py-3 text-sm text-stardust/75">{notice}</p> : null}

    <div className="flex flex-col justify-between gap-3 border-y border-bronze/18 py-3 lg:flex-row lg:items-center">
      <div aria-label="BOM view" className="inline-flex w-fit rounded-xl border border-bronze/24 p-1">
        {(['design', 'sourcing', 'cost'] as BomView[]).map((mode) => <button aria-pressed={view === mode} className={cn('rounded-lg px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember', view === mode ? 'bg-ember text-midnight' : 'text-stardust/55 hover:text-stardust')} key={mode} onClick={() => setView(mode)} type="button">{mode}</button>)}
      </div>
      <div className="flex flex-wrap gap-2">
        <label className="relative"><span className="sr-only">Search BOM</span><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stardust/40" size={16}/><input className="field h-10 w-48 pl-9 text-sm" onChange={(event) => setQuery(event.target.value)} placeholder="Search BOM" type="search" value={query}/></label>
        <select aria-label="Filter BOM status" className="field h-10 w-auto text-sm" onChange={(event) => setFilter(event.target.value as typeof filter)} value={filter}><option value="all">All items</option><option value="attention">Needs attention</option><option value="approved">Approved</option></select>
        <select aria-label="Filter BOM category" className="field h-10 w-auto text-sm" onChange={(event) => setCategory(event.target.value as typeof category)} value={category}><option value="all">All categories</option>{categoryOrder.map((key) => <option key={key} value={key}>{categoryLabels[key]}</option>)}</select>
      </div>
    </div>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-4">
        {groups.map((group) => <section className="overflow-hidden rounded-2xl border border-bronze/20 bg-[#12110f]" key={group.key}>
          <button aria-expanded={!collapsed.has(group.key)} className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-stardust/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ember" onClick={() => setCollapsed((current) => { const next = new Set(current); if (next.has(group.key)) next.delete(group.key); else next.add(group.key); return next; })} type="button"><span><span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ember">{categoryLabels[group.key]}</span><span className="ml-2 text-xs text-stardust/45">{group.items.length}</span></span><ChevronDown aria-hidden="true" className={cn('text-stardust/45 transition-transform', collapsed.has(group.key) && '-rotate-90')} size={17}/></button>
          {!collapsed.has(group.key) ? <div className="border-t border-bronze/16">{group.items.map((item) => <BomItemRow item={item} key={item.id} onMove={reorderBom} onSelect={setSelectedId} selected={selected?.id === item.id} state={state!} view={view}/>)}</div> : null}
        </section>)}
        {!groups.length ? <div className="atelier-empty-state flex min-h-72 flex-col items-center justify-center p-8 text-center"><Package aria-hidden="true" className="text-ember/60" size={30}/><h2 className="font-display mt-4 text-2xl">Build the component roster</h2><p className="mt-2 max-w-md text-sm leading-6 text-stardust/52">Bring a fabric, trim, or custom component into this garment. The master material remains safely in the Vault.</p><Button className="mt-5" onClick={() => setIsAdding(true)} size="sm" variant="primary">Add first BOM item</Button></div> : null}
      </div>
      <BomInspector item={selected} items={items} issues={issues} onRemove={remove} onUpdate={updateBom} state={state!} substituteBom={substituteBom}/>
    </div>
    {isAdding ? <AddBomItemDialog onAdd={add} onClose={() => setIsAdding(false)} specId={specId} state={state!}/> : null}
  </section>;
}

function BomItemRow({ item, onMove, onSelect, selected, state, view }: { item: CanonicalBomItem; onMove: (id: string, direction: -1 | 1) => void; onSelect: (id: string) => void; selected: boolean; state: CanonicalWorkspaceState; view: BomView }) {
  const label = bomItemLabel(state, item);
  const offer = state.supplierItems.find((candidate) => candidate.id === item.supplierItemId);
  return <article className={cn('group grid gap-3 border-b border-bronze/14 p-3 last:border-b-0 sm:grid-cols-[4.5rem_minmax(10rem,1.5fr)_minmax(8rem,.8fr)_minmax(6rem,.55fr)_auto] sm:items-center', selected && 'bg-ember/[0.065]')}>
    <BomThumbnail item={item} size="row" state={state}/>
    <button className="min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember" onClick={() => onSelect(item.id)} type="button"><h3 className="truncate text-sm font-semibold text-stardust">{label}</h3><p className="mt-1 truncate text-xs text-stardust/48">{itemSecondary(state, item)}</p></button>
    {view === 'design' ? <div><p className="text-[0.62rem] uppercase tracking-[0.12em] text-stardust/38 sm:hidden">Placement</p><p className="text-sm text-stardust/73">{item.placement || 'Placement needed'}</p><p className="mt-1 text-xs text-stardust/45">{item.quantity} {item.unit} / garment</p></div> : null}
    {view === 'sourcing' ? <div><p className="text-sm text-stardust/73">{supplierName(state, item.supplierItemId)}</p><p className="mt-1 text-xs text-stardust/45">{offer?.sku ? `SKU ${offer.sku}` : 'Supplier SKU open'}{offer?.leadTimeDays != null ? ` · ${offer.leadTimeDays} days` : ''}</p>{item.shortageQuantity > 0 ? <p className="mt-1 text-xs text-ember">Short by {item.shortageQuantity} {item.unit}</p> : null}</div> : null}
    {view === 'cost' ? <div><p className="text-sm text-stardust/73">{money(item.unitCost, item.currency)} / {item.unit}</p><p className="mt-1 text-xs text-stardust/45">{money(item.unitCost * item.quantity + item.costImpact, item.currency)} / garment</p></div> : null}
    <div className="flex items-center justify-between gap-2 sm:justify-end"><BomStatus item={item}/><div className="hidden gap-1 opacity-0 transition group-hover:flex group-focus-within:flex"><RowMove label={`Move ${label} up`} onClick={() => onMove(item.id, -1)}>↑</RowMove><RowMove label={`Move ${label} down`} onClick={() => onMove(item.id, 1)}>↓</RowMove></div></div>
  </article>;
}

function BomInspector({ item, items, issues, onRemove, onUpdate, state, substituteBom }: { item: CanonicalBomItem | null; items: CanonicalBomItem[]; issues: ReturnType<typeof validateBom>; onRemove: (item: CanonicalBomItem) => void; onUpdate: ReturnType<typeof useReleaseStudio>['updateBom']; state: CanonicalWorkspaceState; substituteBom: ReturnType<typeof useReleaseStudio>['substituteBom'] }) {
  const [substituteId, setSubstituteId] = useState('');
  const [impact, setImpact] = useState('0');
  if (!item) return <aside className="rounded-2xl border border-dashed border-bronze/28 p-5 text-sm text-stardust/50"><p className="font-medium text-stardust/72">Component inspector</p><p className="mt-2 leading-6">Select a component to review garment usage, sourcing, status, and release attention.</p></aside>;
  const label = bomItemLabel(state, item);
  const material = item.materialVariantId ? resolveMaterial(state, item.materialVariantId)?.material : null;
  const offer = state.supplierItems.find((candidate) => candidate.id === item.supplierItemId);
  const itemIssues = issues.filter((issue) => issue.entityId === item.id);
  return <aside className="self-start rounded-2xl border border-bronze/24 bg-[#12110f] p-4 sm:p-5 xl:sticky xl:top-5">
    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-ember">BOM item</p>
    <div className="mt-4 flex gap-3"><BomThumbnail item={item} size="inspector" state={state}/><div className="min-w-0"><h2 className="font-display text-2xl leading-tight text-stardust">{label}</h2><p className="mt-1 text-sm text-stardust/52">{item.placement || 'Placement needed'}</p></div></div>
    <dl className="mt-5 space-y-3 border-y border-bronze/18 py-4 text-sm"><InspectorDetail label="Material" value={material ? `${material.composition || material.category}` : item.itemType === 'custom' ? 'Custom component' : item.itemType.replace('_', ' ')}/><InspectorDetail label="Usage" value={`${item.quantity} ${item.unit} / garment`}/><InspectorDetail label="Supplier" value={supplierName(state, item.supplierItemId)}/>{offer?.sku ? <InspectorDetail label="Supplier SKU" value={offer.sku}/> : null}<InspectorDetail label="Estimated garment cost" value={money(item.quantity * item.unitCost + item.costImpact, item.currency)}/></dl>
    <div className="mt-4 space-y-3"><label><span className="field-label">Placement</span><input className="field" defaultValue={item.placement} key={`${item.id}-placement`} onBlur={(event) => { if (event.target.value.trim() && event.target.value !== item.placement) onUpdate(item.id, { placement: event.target.value }); }}/></label><div className="grid grid-cols-[1fr_5.2rem] gap-2"><label><span className="field-label">Consumption</span><input className="field" defaultValue={item.quantity} key={`${item.id}-quantity`} min="0.0001" onBlur={(event) => { const quantity = Number(event.target.value); if (Number.isFinite(quantity) && quantity > 0 && quantity !== item.quantity) onUpdate(item.id, { quantity }); }} step="0.0001" type="number"/></label><label><span className="field-label">Unit</span><select className="field" defaultValue={item.unit} key={`${item.id}-unit`} onChange={(event) => onUpdate(item.id, { unit: event.target.value as CanonicalInventoryEntry['unit'] })}>{unitsFor(item.itemType).map((unit) => <option key={unit}>{unit}</option>)}</select></label></div><label><span className="field-label">Approval</span><select className="field" defaultValue={item.status === 'substituted' ? 'approved' : item.status} key={`${item.id}-status`} onChange={(event) => onUpdate(item.id, { status: event.target.value as CanonicalBomItem['status'] })}><option value="draft">Draft</option><option value="linked">In review</option><option value="approved">Approved</option><option value="shortage">Shortage</option></select></label></div>
    {item.shortageQuantity > 0 ? <p className="mt-4 rounded-xl border border-ember/28 bg-ember/[0.07] px-3 py-2 text-sm text-stardust/75"><AlertTriangle aria-hidden="true" className="mr-2 inline text-ember" size={15}/>Short by {item.shortageQuantity} {item.unit}</p> : null}
    {itemIssues.length ? <div className="mt-4 rounded-xl border border-bronze/25 bg-stardust/[0.025] p-3"><p className="text-xs font-semibold uppercase tracking-[0.13em] text-ember">Needs attention</p><ul className="mt-2 space-y-1 text-sm text-stardust/65">{itemIssues.map((issue) => <li key={`${issue.code}-${issue.field}`}>{issue.message}</li>)}</ul></div> : null}
    <details className="mt-4 border-t border-bronze/18 pt-4"><summary className="cursor-pointer text-sm font-medium text-stardust/76">Approved substitutes</summary><div className="mt-3 space-y-2"><select aria-label="Approved substitute BOM item" className="field" onChange={(event) => setSubstituteId(event.target.value)} value={substituteId}><option value="">No substitute</option>{items.filter((candidate) => candidate.id !== item.id).map((candidate) => <option key={candidate.id} value={candidate.id}>{bomItemLabel(state, candidate)}</option>)}</select><label><span className="field-label">Cost impact</span><input className="field" min="0" onChange={(event) => setImpact(event.target.value)} step="0.0001" type="number" value={impact}/></label><Button onClick={() => substituteBom(item.id, substituteId || null, Number(impact) || 0)} size="sm" variant="ghost">Save substitute</Button></div></details>
    <div className="mt-5 flex flex-wrap gap-2"><Button onClick={() => onUpdate(item.id, { status: 'approved', shortageQuantity: 0 })} size="sm" variant="primary">Approve</Button><Button icon={<Trash2 aria-hidden="true" size={14}/>} onClick={() => onRemove(item)} size="sm" variant="ghost">Remove</Button></div>
  </aside>;
}

function AddBomItemDialog({ onAdd, onClose, specId, state }: { onAdd: (input: Parameters<ReturnType<typeof useReleaseStudio>['createBom']>[0]) => void; onClose: () => void; specId: string; state: CanonicalWorkspaceState }) {
  const [type, setType] = useState<ItemType>('material_variant');
  const [query, setQuery] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [placement, setPlacement] = useState('Main Shell');
  const [customPlacement, setCustomPlacement] = useState('');
  const candidates = useMemo(() => candidateRows(state, type, query), [query, state, type]);
  const selectedText = type === 'material_variant' ? materialLabel(state, selectedVariantId) : type === 'component_variant' ? componentLabel(state, selectedVariantId) : '';
  const offers = state.supplierItems.filter((offer) => type === 'material_variant' ? offer.materialVariantId === selectedVariantId : offer.componentVariantId === selectedVariantId);
  const units = unitsFor(type);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const custom = type === 'custom';
    const unitCost = String(form.get('unitCost') ?? '').trim();
    onAdd({ componentVariantId: type === 'component_variant' ? selectedVariantId : null, currency: String(form.get('currency') ?? 'USD'), description: custom ? String(form.get('description') ?? '') : selectedText, intentionalFreeText: custom, itemType: type, materialVariantId: type === 'material_variant' ? selectedVariantId : null, placement: placement === 'Custom placement' ? customPlacement : placement, quantity: Number(form.get('quantity')), shortageQuantity: 0, specId, status: String(form.get('status')) as CanonicalBomItem['status'], supplierItemId: String(form.get('supplierItemId') ?? '') || null, unit: String(form.get('unit')) as CanonicalInventoryEntry['unit'], unitCost: unitCost ? Number(unitCost) : undefined });
  };
  return <div aria-modal="true" className="fixed inset-0 z-[140] overflow-y-auto bg-midnight/85 p-3 backdrop-blur-sm sm:p-6" onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); onClose(); } }} role="dialog"><div className="mx-auto flex min-h-full max-w-3xl items-center"><form className="w-full rounded-[1.6rem] border border-bronze/30 bg-[#11100f] shadow-2xl" onSubmit={submit}><header className="flex items-start justify-between gap-4 border-b border-bronze/18 p-5 sm:p-7"><div><p className="text-[0.65rem] uppercase tracking-[0.18em] text-ember">Garment component</p><h2 className="font-display mt-2 text-3xl">Add BOM item</h2><p className="mt-2 text-sm leading-6 text-stardust/52">Choose the reusable asset first, then describe how this garment uses it.</p></div><button aria-label="Close Add BOM Item" className="grid h-11 w-11 place-items-center rounded-xl border border-bronze/24 text-stardust/65 hover:text-stardust focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember" onClick={onClose} type="button"><X aria-hidden="true" size={19}/></button></header><div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_18rem]"><div><fieldset><legend className="field-label">1 · Component type</legend><div className="mt-2 flex flex-wrap gap-2">{([{ value: 'material_variant', label: 'Material' }, { value: 'component_variant', label: 'Trim / hardware' }, { value: 'custom', label: 'Custom component' }] as Array<{ value: ItemType; label: string }>).map((option) => <button aria-pressed={type === option.value} className={cn('rounded-xl border px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember', type === option.value ? 'border-ember/65 bg-ember/10 text-stardust' : 'border-bronze/25 text-stardust/60')} key={option.value} onClick={() => { setType(option.value); setSelectedVariantId(''); }} type="button">{option.label}</button>)}</div></fieldset>{type !== 'custom' ? <><label className="relative mt-5 block"><span className="sr-only">Search {type === 'material_variant' ? 'Material Vault' : 'components'}</span><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stardust/42" size={17}/><input autoFocus className="field pl-10" onChange={(event) => setQuery(event.target.value)} placeholder={type === 'material_variant' ? 'Search Material Vault' : 'Search components'} type="search" value={query}/></label><div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">{candidates.map((candidate) => <button aria-pressed={selectedVariantId === candidate.id} className={cn('flex w-full items-center gap-3 rounded-xl border p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember', selectedVariantId === candidate.id ? 'border-ember/65 bg-ember/[0.08]' : 'border-bronze/20 hover:border-bronze/48')} key={candidate.id} onClick={() => setSelectedVariantId(candidate.id)} type="button">{candidate.type === 'material_variant' ? <MaterialVariantThumbnail state={state} variantId={candidate.id}/> : <ComponentPlaceholder category={candidate.category}/>}<span className="min-w-0 flex-1"><strong className="block truncate text-sm text-stardust">{candidate.label}</strong><span className="mt-1 block truncate text-xs text-stardust/48">{candidate.detail}</span></span>{selectedVariantId === candidate.id ? <Check aria-hidden="true" className="text-ember" size={17}/> : null}</button>)}{!candidates.length ? <p className="rounded-xl border border-dashed border-bronze/28 p-4 text-sm text-stardust/45">No matching reusable asset.</p> : null}</div></> : <label className="mt-5 block"><span className="field-label">Component name</span><input autoFocus className="field" name="description" placeholder="e.g. Hand-dyed topstitch thread" required/></label>}</div><div className="space-y-4 rounded-2xl border border-bronze/20 bg-stardust/[0.025] p-4"><p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-ember">2 · Garment usage</p><label><span className="field-label">Placement</span><select className="field" onChange={(event) => setPlacement(event.target.value)} value={placement}>{placementOptions.map((option) => <option key={option}>{option}</option>)}<option>Custom placement</option></select></label>{placement === 'Custom placement' ? <input aria-label="Custom placement" className="field" onChange={(event) => setCustomPlacement(event.target.value)} placeholder="Describe placement" required/> : null}<div className="grid grid-cols-[1fr_5.4rem] gap-2"><label><span className="field-label">Consumption</span><input className="field" defaultValue="1" min="0.0001" name="quantity" required step="0.0001" type="number"/></label><label><span className="field-label">Unit</span><select className="field" name="unit">{units.map((unit) => <option key={unit}>{unit}</option>)}</select></label></div><label><span className="field-label">Approval</span><select className="field" defaultValue="linked" name="status"><option value="linked">In review</option><option value="approved">Approved</option><option value="draft">Draft</option></select></label><details><summary className="cursor-pointer text-sm text-stardust/65">Sourcing details</summary><div className="mt-3 space-y-3"><label><span className="field-label">Supplier offer</span><select className="field" name="supplierItemId"><option value="">Not selected</option>{offers.map((offer) => <option key={offer.id} value={offer.id}>{supplierName(state, offer.id)} · {money(offer.unitCost, offer.currency)}</option>)}</select></label><div className="grid grid-cols-2 gap-2"><label><span className="field-label">Unit cost</span><input className="field" min="0" name="unitCost" placeholder="Uses offer price" step="0.0001" type="number"/></label><label><span className="field-label">Currency</span><input className="field" defaultValue="USD" name="currency"/></label></div></div></details></div></div><footer className="flex flex-wrap justify-end gap-3 border-t border-bronze/18 p-5 sm:px-7"><Button onClick={onClose} variant="ghost">Cancel</Button><Button disabled={type !== 'custom' && !selectedVariantId} type="submit" variant="primary">Add to BOM</Button></footer></form></div></div>;
}

function BomThumbnail({ item, size, state }: { item: CanonicalBomItem; size: 'row' | 'inspector'; state: CanonicalWorkspaceState }) {
  const dimensions = size === 'row' ? 'h-16 w-16' : 'h-36 w-32';
  if (item.materialVariantId) return <MaterialVariantThumbnail className={dimensions} state={state} variantId={item.materialVariantId}/>;
  const component = item.componentVariantId ? state.componentVariants.find((variant) => variant.id === item.componentVariantId) : null;
  const category = component ? state.components.find((entry) => entry.id === component.componentId)?.category : item.description;
  return <ComponentPlaceholder category={category ?? 'Custom'} className={dimensions}/>;
}

function MaterialVariantThumbnail({ className, state, variantId }: { className?: string; state: CanonicalWorkspaceState; variantId: string }) {
  const found = resolveMaterial(state, variantId);
  const asset = canonicalMaterialVariantCover(state, variantId);
  return <div className={cn('relative shrink-0 overflow-hidden rounded-xl bg-stardust/[0.06] ring-1 ring-inset ring-stardust/10', className ?? 'h-16 w-16')}><CanonicalMediaImage alt={found ? `${found.material.name} ${found.variant.colorName}` : 'Material'} asset={asset} className="absolute inset-0 h-full w-full rounded-none border-0" derivatives={state.mediaDerivatives} fit="cover" mode="thumbnail"/>{!asset && found?.variant.colorHex ? <span aria-hidden="true" className="absolute inset-0" style={{ background: found.variant.colorHex }}/> : null}</div>;
}

function ComponentPlaceholder({ category, className }: { category: string; className?: string }) { return <div aria-label={`${category} placeholder`} className={cn('flex shrink-0 items-center justify-center rounded-xl border border-bronze/24 bg-[radial-gradient(circle_at_24%_20%,rgba(200,155,60,.17),transparent_38%),#171410] px-2 text-center text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-stardust/48', className ?? 'h-16 w-16')} role="img">{componentKind(category)}</div>; }
function BomStatus({ item }: { item: CanonicalBomItem }) { const attention = item.status === 'shortage' || item.status === 'draft' || item.shortageQuantity > 0; return <Badge variant={attention ? 'ember' : item.status === 'approved' ? 'teal' : 'blue'}>{attention ? item.shortageQuantity > 0 ? 'Shortage' : 'Review' : item.status === 'approved' ? 'Approved' : item.status === 'substituted' ? 'Substitute' : 'Linked'}</Badge>; }
function RowMove({ children, label, onClick }: { children: string; label: string; onClick: () => void }) { return <button aria-label={label} className="grid h-8 w-8 place-items-center rounded-lg text-stardust/56 hover:bg-stardust/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember" onClick={onClick} type="button">{children}</button>; }
function InspectorDetail({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-3"><dt className="text-stardust/45">{label}</dt><dd className="max-w-[65%] text-right text-stardust/74">{value}</dd></div>; }

function candidateRows(state: CanonicalWorkspaceState, type: ItemType, query: string): CandidateRow[] {
  const value = query.trim().toLowerCase();
  if (type === 'material_variant') return state.materialVariants.filter((variant) => variant.status === 'active').flatMap((variant): CandidateRow[] => { const material = state.materials.find((entry) => entry.id === variant.materialId); return material ? [{ id: variant.id, type: 'material_variant', category: material.category, label: material.name, detail: [variant.colorName, material.composition].filter(Boolean).join(' · ') }] : []; }).filter((row) => `${row.label} ${row.detail} ${row.category}`.toLowerCase().includes(value));
  if (type === 'component_variant') return state.componentVariants.filter((variant) => variant.status === 'active').flatMap((variant): CandidateRow[] => { const component = state.components.find((entry) => entry.id === variant.componentId); return component ? [{ id: variant.id, type: 'component_variant', category: component.category, label: component.name, detail: [variant.color, variant.finish, variant.size].filter(Boolean).join(' · ') || component.category }] : []; }).filter((row) => `${row.label} ${row.detail} ${row.category}`.toLowerCase().includes(value));
  return [];
}
function resolveMaterial(state: CanonicalWorkspaceState, variantId: string): { material: CanonicalMaterial; variant: CanonicalMaterialVariant } | null { const variant = state.materialVariants.find((entry) => entry.id === variantId); const material = state.materials.find((entry) => entry.id === variant?.materialId); return variant && material ? { material, variant } : null; }
function materialLabel(state: CanonicalWorkspaceState, variantId: string) { const found = resolveMaterial(state, variantId); return found ? [found.material.name, found.variant.colorName].filter(Boolean).join(' · ') : ''; }
function componentLabel(state: CanonicalWorkspaceState, variantId: string) { const variant = state.componentVariants.find((entry) => entry.id === variantId); const component = state.components.find((entry) => entry.id === variant?.componentId); return component ? [component.name, variant?.finish, variant?.size].filter(Boolean).join(' · ') : ''; }
function itemSecondary(state: CanonicalWorkspaceState, item: CanonicalBomItem) { if (item.materialVariantId) { const found = resolveMaterial(state, item.materialVariantId); return found ? [found.material.composition, found.variant.weightGsm ? `${found.variant.weightGsm} gsm` : ''].filter(Boolean).join(' · ') || found.material.category : 'Material link unavailable'; } if (item.componentVariantId) { const variant = state.componentVariants.find((entry) => entry.id === item.componentVariantId); return [variant?.color, variant?.finish, variant?.size].filter(Boolean).join(' · ') || 'Component variant'; } return 'Custom component'; }
function supplierName(state: CanonicalWorkspaceState, supplierItemId: string | null) { const offer = state.supplierItems.find((item) => item.id === supplierItemId); return offer ? state.suppliers.find((supplier) => supplier.id === offer.supplierId)?.name ?? 'Supplier' : 'Not selected'; }
function unitsFor(type: ItemType) { return type === 'material_variant' ? materialQuantityUnits : type === 'component_variant' ? componentQuantityUnits : quantityUnits; }
function bomCategory(state: CanonicalWorkspaceState, item: CanonicalBomItem): BomCategory { const text = `${item.placement} ${item.description} ${item.materialVariantId ? resolveMaterial(state, item.materialVariantId)?.material.category ?? '' : ''} ${item.componentVariantId ? state.components.find((component) => component.id === state.componentVariants.find((variant) => variant.id === item.componentVariantId)?.componentId)?.category ?? '' : ''}`.toLowerCase(); if (/label|care|country/.test(text)) return 'labels'; if (/thread|embroid|topstitch|trim/.test(text)) return 'thread'; if (/packag|hang tag|polybag|tissue|carton/.test(text)) return 'packaging'; if (/interfac|stabil|stay tape|support/.test(text)) return 'interfacing'; if (item.itemType === 'material_variant') return 'fabrics'; if (/button|zipper|snap|clip|cord|elastic|buckle|hardware|trim/.test(text) || item.itemType === 'component_variant') return 'trims'; return 'other'; }
function componentKind(category: string) { const value = category.toLowerCase(); if (value.includes('label')) return 'Label'; if (value.includes('thread')) return 'Thread'; if (value.includes('pack')) return 'Pack'; if (value.includes('trim') || value.includes('hard')) return 'Trim'; return 'Custom'; }
function itemNeedsAttention(item: CanonicalBomItem, issues: ReturnType<typeof validateBom>) { return item.status === 'draft' || item.status === 'shortage' || item.shortageQuantity > 0 || issues.some((issue) => issue.entityId === item.id); }
function money(value: number, currency: string) { return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2 }).format(value); }
