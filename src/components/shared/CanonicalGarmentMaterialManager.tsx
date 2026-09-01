import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronLeft, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import type { CanonicalGarmentMaterial, CanonicalMaterial, CanonicalMaterialVariant, CanonicalWorkspaceState } from '../../domains/workspace';
import { canonicalMaterialVariantCover } from '../../lib/canonicalMaterialPresentation';
import { CanonicalMediaImage } from './CanonicalMediaImage';
import { Button } from './Button';

const materialRoles = ['shell', 'lining', 'trim', 'pocketing', 'binding', 'contrast', 'interfacing'];

type Props = {
  garmentId: string;
  garmentTitle: string;
  onAdd: (variantId: string, role: string, requiredQuantity: number) => void;
  onClose: () => void;
  onRemove: (relationshipId: string) => void;
  onUpdate: (relationshipId: string, patch: { requiredQuantity: number; role: string }) => void;
  returnFocusTo?: HTMLElement | null;
  state: CanonicalWorkspaceState;
};

type Editor = { mode: 'add' } | { mode: 'edit'; relationship: CanonicalGarmentMaterial } | null;

/** Calm, garment-scoped fabric linking UI built on canonical material relationships. */
export function CanonicalGarmentMaterialManager({ garmentId, garmentTitle, onAdd, onClose, onRemove, onUpdate, returnFocusTo, state }: Props) {
  const [editor, setEditor] = useState<Editor>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [removeCandidate, setRemoveCandidate] = useState<CanonicalGarmentMaterial | null>(null);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const returnFocusRef = useRef(returnFocusTo);
  const editorRef = useRef(editor);
  const removeCandidateRef = useRef(removeCandidate);
  onCloseRef.current = onClose;
  returnFocusRef.current = returnFocusTo;
  editorRef.current = editor;
  removeCandidateRef.current = removeCandidate;

  const materials = useMemo(() => new Map(state.materials.map((material) => [material.id, material])), [state.materials]);
  const variants = useMemo(() => new Map(state.materialVariants.map((variant) => [variant.id, variant])), [state.materialVariants]);
  const linked = useMemo(() => state.garmentMaterials
    .filter((relationship) => relationship.garmentId === garmentId)
    .map((relationship) => ({ material: materials.get(variants.get(relationship.variantId)?.materialId ?? ''), relationship, variant: variants.get(relationship.variantId) }))
    .filter((item): item is { material: CanonicalMaterial; relationship: CanonicalGarmentMaterial; variant: CanonicalMaterialVariant } => Boolean(item.material && item.variant))
    .sort((left, right) => roleLabel(left.relationship.role).localeCompare(roleLabel(right.relationship.role)) || left.material.name.localeCompare(right.material.name)), [garmentId, materials, state.garmentMaterials, variants]);
  const candidates = useMemo(() => state.materialVariants
    .filter((variant) => variant.status === 'active')
    .map((variant) => ({ material: materials.get(variant.materialId), variant }))
    .filter((item): item is { material: CanonicalMaterial; variant: CanonicalMaterialVariant } => Boolean(item.material))
    .sort((left, right) => left.material.name.localeCompare(right.material.name) || left.variant.colorName.localeCompare(right.variant.colorName)), [materials, state.materialVariants]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (removeCandidateRef.current) setRemoveCandidate(null);
        else if (editorRef.current) { setEditor(null); setError(null); }
        else onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') ?? [])];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKeyDown);
      returnFocusRef.current?.focus();
    };
  }, []);

  const openAdd = () => { setEditor({ mode: 'add' }); setError(null); setSelectedVariantId(null); };
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const role = String(form.get('role') ?? 'shell');
    const rawQuantity = String(form.get('quantity') ?? '').trim();
    const requiredQuantity = rawQuantity ? Number(rawQuantity) : 0;
    const variantId = editor?.mode === 'edit' ? editor.relationship.variantId : selectedVariantId;
    if (!variantId) { setError('Choose a fabric from the Vault first.'); return; }
    if (!Number.isFinite(requiredQuantity) || requiredQuantity < 0) { setError('Planned yardage must be zero or more.'); return; }
    const duplicate = linked.some((item) => item.relationship.id !== (editor?.mode === 'edit' ? editor.relationship.id : '')
      && item.relationship.variantId === variantId
      && roleKey(item.relationship.role) === roleKey(role));
    if (duplicate) { setError('This fabric is already linked with that role. Choose another role or edit the existing link.'); return; }
    try {
      if (editor?.mode === 'edit') onUpdate(editor.relationship.id, { requiredQuantity, role });
      else onAdd(variantId, role, requiredQuantity);
      setEditor(null);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The fabric link could not be saved.');
    }
  };

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div aria-describedby="garment-materials-description" aria-labelledby="garment-materials-title" aria-modal="true" className="fixed inset-0 z-[135] overflow-y-auto bg-midnight/88 p-3 backdrop-blur-xl sm:p-6" role="dialog">
      <div className="mx-auto flex min-h-full max-w-4xl items-center">
        <div className="w-full overflow-hidden rounded-[1.7rem] border border-bronze/28 bg-[#11100f] shadow-2xl" ref={dialogRef}>
          <header className="flex items-start justify-between gap-4 border-b border-bronze/18 p-5 sm:p-7">
            <div><p className="text-[0.65rem] uppercase tracking-[0.18em] text-ember">Material story</p><h2 className="font-display mt-2 text-3xl" id="garment-materials-title">Manage materials</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-stardust/52" id="garment-materials-description">Choose the fabrics that shape {garmentTitle}. Fabric records and inventory remain safely in the Vault.</p></div>
            <button aria-label="Close material manager" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-bronze/24 text-stardust/62 transition hover:border-ember/55 hover:text-stardust focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember" onClick={onClose} ref={closeRef} type="button"><X aria-hidden="true" size={19}/></button>
          </header>
          <div className="p-5 sm:p-7">
            {editor ? <MaterialEditor candidates={candidates} editor={editor} error={error} onBack={() => { setEditor(null); setError(null); }} onSelect={setSelectedVariantId} selectedVariantId={selectedVariantId} state={state} onSubmit={save} /> : <>
              <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-medium text-stardust">In this garment</p><p className="mt-1 text-sm text-stardust/48">{linked.length ? `${linked.length} fabric${linked.length === 1 ? '' : 's'} connected to this piece.` : 'Choose fabrics from the Vault to begin the material story.'}</p></div><Button icon={<Plus aria-hidden="true" size={16}/>} onClick={openAdd} variant="primary">Add material</Button></div>
              {linked.length ? <div className="mt-6 grid gap-3 sm:grid-cols-2">{linked.map(({ material, relationship, variant }) => <MaterialLinkCard key={relationship.id} material={material} onEdit={() => { setEditor({ mode: 'edit', relationship }); setError(null); }} onRemove={() => setRemoveCandidate(relationship)} relationship={relationship} state={state} variant={variant}/>)}</div> : <div className="atelier-empty-state mt-6 flex min-h-56 flex-col items-center justify-center text-center"><Plus aria-hidden="true" className="text-ember/60" size={28}/><p className="mt-4 text-sm font-medium text-stardust/76">Begin with the fabric</p><p className="mt-2 max-w-sm text-sm leading-6 text-stardust/46">Add a fabric, assign its role, and optionally note planned yardage without leaving this garment.</p><Button className="mt-5" onClick={openAdd} size="sm" variant="primary">Add first material</Button></div>}
            </>}
          </div>
          <footer className="flex justify-end border-t border-bronze/18 p-4 sm:px-7"><Button onClick={onClose} variant="ghost">Done</Button></footer>
        </div>
      </div>
      {removeCandidate ? <RemoveMaterialLinkDialog onCancel={() => setRemoveCandidate(null)} onConfirm={() => { onRemove(removeCandidate.id); setRemoveCandidate(null); }} relationship={removeCandidate} /> : null}
    </div>,
    document.body,
  );
}

function MaterialEditor({ candidates, editor, error, onBack, onSelect, onSubmit, selectedVariantId, state }: { candidates: Array<{ material: CanonicalMaterial; variant: CanonicalMaterialVariant }>; editor: Exclude<Editor, null>; error: string | null; onBack: () => void; onSelect: (variantId: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; selectedVariantId: string | null; state: CanonicalWorkspaceState }) {
  const [query, setQuery] = useState('');
  const visibleCandidates = candidates.filter(({ material, variant }) => `${material.name} ${material.category} ${material.composition} ${variant.colorName}`.toLowerCase().includes(query.trim().toLowerCase()));
  const selectedVariant = editor.mode === 'edit' ? state.materialVariants.find((variant) => variant.id === editor.relationship.variantId) : state.materialVariants.find((variant) => variant.id === selectedVariantId);
  const selectedMaterial = selectedVariant ? state.materials.find((material) => material.id === selectedVariant.materialId) : null;
  return <form onSubmit={onSubmit}><div className="flex items-center gap-2"><Button icon={<ChevronLeft aria-hidden="true" size={16}/>} onClick={onBack} size="sm" variant="ghost">Materials</Button><p className="text-sm text-stardust/48">{editor.mode === 'edit' ? 'Edit material use' : 'Add a fabric'}</p></div>
    {editor.mode === 'add' ? <><label className="relative mt-6 block"><span className="sr-only">Search the Fabric Vault</span><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stardust/42" size={17}/><input autoFocus className="field pl-10" onChange={(event) => setQuery(event.target.value)} placeholder="Search the Fabric Vault" type="search" value={query}/></label><div className="mt-3 max-h-[18rem] space-y-2 overflow-y-auto pr-1">{visibleCandidates.length ? visibleCandidates.map(({ material, variant }) => <button aria-pressed={selectedVariantId === variant.id} className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember ${selectedVariantId === variant.id ? 'border-ember/70 bg-ember/10' : 'border-bronze/22 bg-midnight/35 hover:border-bronze/50'}`} key={variant.id} onClick={() => onSelect(variant.id)} type="button"><MaterialPreview material={material} state={state} variant={variant}/><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-stardust">{material.name}</span><span className="mt-1 block truncate text-xs text-stardust/48">{[variant.colorName, material.composition].filter(Boolean).join(' · ') || material.category}</span></span>{selectedVariantId === variant.id ? <Check aria-hidden="true" className="text-ember" size={18}/> : null}</button>) : <p className="rounded-xl border border-dashed border-bronze/28 p-4 text-sm text-stardust/48">No fabric matches this search.</p>}</div></> : selectedVariant && selectedMaterial ? <div className="mt-6 rounded-2xl border border-ember/35 bg-ember/[0.06] p-3"><div className="flex items-center gap-3"><MaterialPreview material={selectedMaterial} state={state} variant={selectedVariant}/><div><p className="text-sm font-medium text-stardust">{selectedMaterial.name}</p><p className="mt-1 text-xs text-stardust/48">{[selectedVariant.colorName, selectedMaterial.composition].filter(Boolean).join(' · ')}</p></div></div></div> : null}
    <div className="mt-6 grid gap-4 sm:grid-cols-2"><label><span className="field-label">How is it used?</span><select className="field" defaultValue={editor.mode === 'edit' ? roleKey(editor.relationship.role) : 'shell'} name="role">{materialRoles.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</select></label><label><span className="field-label">Planned yardage <span className="normal-case tracking-normal text-stardust/40">(optional)</span></span><input className="field" defaultValue={editor.mode === 'edit' && editor.relationship.requiredQuantity ? editor.relationship.requiredQuantity : ''} min="0" name="quantity" placeholder="0" step="0.01" type="number"/></label></div>
    {error ? <p aria-live="polite" className="mt-4 rounded-xl border border-ember/35 bg-ember/10 px-3 py-2 text-sm text-stardust/78">{error}</p> : null}
    <div className="mt-7 flex flex-wrap justify-end gap-3"><Button onClick={onBack} variant="ghost">Cancel</Button><Button disabled={!selectedVariant} type="submit" variant="primary">{editor.mode === 'edit' ? 'Save material use' : 'Add to garment'}</Button></div>
  </form>;
}

function MaterialLinkCard({ material, onEdit, onRemove, relationship, state, variant }: { material: CanonicalMaterial; onEdit: () => void; onRemove: () => void; relationship: CanonicalGarmentMaterial; state: CanonicalWorkspaceState; variant: CanonicalMaterialVariant }) {
  return <article className="flex gap-3 rounded-2xl border border-bronze/20 bg-stardust/[0.025] p-3"><MaterialPreview material={material} state={state} variant={variant}/><div className="min-w-0 flex-1"><p className="text-[0.62rem] uppercase tracking-[0.15em] text-ember/78">{roleLabel(relationship.role)}</p><h3 className="mt-1 truncate text-sm font-medium text-stardust">{material.name}</h3><p className="mt-1 truncate text-xs text-stardust/48">{[variant.colorName, material.composition].filter(Boolean).join(' · ') || material.category}</p><p className="mt-2 text-xs text-stardust/58">{relationship.requiredQuantity ? `${relationship.requiredQuantity} ${relationship.unit} planned` : 'Yardage open'}</p><div className="mt-3 flex flex-wrap gap-1"><Button icon={<Pencil aria-hidden="true" size={14}/>} onClick={onEdit} size="sm" variant="ghost">Edit</Button><Button icon={<Trash2 aria-hidden="true" size={14}/>} onClick={onRemove} size="sm" variant="ghost">Remove</Button></div></div></article>;
}

function MaterialPreview({ material, state, variant }: { material: CanonicalMaterial; state: CanonicalWorkspaceState; variant: CanonicalMaterialVariant }) {
  const asset = canonicalMaterialVariantCover(state, variant.id);
  return <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-stardust/[0.06] ring-1 ring-inset ring-stardust/10"><CanonicalMediaImage alt={`${material.name} fabric`} asset={asset} className="absolute inset-0 h-full w-full rounded-none border-0" derivatives={state.mediaDerivatives} fit="cover" mode="thumbnail"/><span aria-hidden="true" className="absolute inset-0" style={!asset ? { background: variant.colorHex ?? 'linear-gradient(135deg,#9a6c3c,#1b3a63)' } : undefined}/></div>;
}

function RemoveMaterialLinkDialog({ onCancel, onConfirm, relationship }: { onCancel: () => void; onConfirm: () => void; relationship: CanonicalGarmentMaterial }) {
  return <div aria-describedby="remove-material-link-description" aria-labelledby="remove-material-link-title" aria-modal="true" className="fixed inset-0 z-[145] flex items-end justify-center bg-midnight/82 p-4 backdrop-blur-xl sm:items-center" role="dialog"><div className="w-full max-w-md rounded-[1.5rem] border border-bronze/30 bg-[#11100f] p-5 shadow-2xl sm:p-7"><p className="text-[0.65rem] uppercase tracking-[0.18em] text-ember">Material story</p><h2 className="font-display mt-2 text-3xl" id="remove-material-link-title">Remove this fabric?</h2><p className="mt-4 text-sm leading-6 text-stardust/62" id="remove-material-link-description">This will remove the <span className="font-medium text-stardust">{roleLabel(relationship.role)}</span> link from this garment only. The fabric, its photos, inventory, supplier details, and use on other garments remain unchanged.</p><div className="mt-7 flex flex-wrap justify-end gap-3"><Button onClick={onCancel} variant="ghost">Keep fabric</Button><Button icon={<Trash2 aria-hidden="true" size={16}/>} onClick={onConfirm} variant="primary">Remove from garment</Button></div></div></div>;
}

function roleKey(role: string) { return role.trim().toLowerCase().replace(/\s+fabric$/, ''); }
function roleLabel(role: string) { const normalized = roleKey(role); return normalized.replace(/\b\w/g, (character) => character.toUpperCase()); }
