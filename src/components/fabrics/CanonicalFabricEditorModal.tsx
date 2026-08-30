import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import type { CanonicalMaterialVariant, CanonicalWorkspaceState } from '../../domains/workspace';
import { Button } from '../shared/Button';

export type CanonicalFabricEditValues = {
  binNumber: string;
  careNotes: string;
  category: string;
  colorHex: string;
  colorName: string;
  composition: string;
  countryOfOrigin: string;
  currency: string;
  drape: string;
  handFeel: string;
  leadTimeDays: string;
  loreNote: string;
  name: string;
  opacity: string;
  privateNotes: string;
  shelf: string;
  sku: string;
  storageLocation: string;
  stretch: string;
  structure: string;
  supplierId: string;
  supplierName: string;
  supplierSku: string;
  texture: string;
  unitCost: string;
  weaveOrKnit: string;
  weightGsm: string;
  width: string;
  widthUnit: '' | 'cm' | 'in' | 'mm';
};

type Section = 'core' | 'technical' | 'source' | 'notes';

export function CanonicalFabricEditorModal({
  onClose,
  onSave,
  state,
  variant,
}: {
  onClose: () => void;
  onSave: (values: CanonicalFabricEditValues) => void;
  state: CanonicalWorkspaceState;
  variant: CanonicalMaterialVariant;
}) {
  const initial = useMemo(() => valuesFromState(state, variant), [state, variant]);
  const [values, setValues] = useState(initial);
  const [section, setSection] = useState<Section>('core');
  const material = state.materials.find((item) => item.id === variant.materialId)!;
  const update = <K extends keyof CanonicalFabricEditValues>(key: K, value: CanonicalFabricEditValues[K]) => setValues((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!values.name.trim() || !values.category.trim()) return;
    onSave(values);
  };

  return <div aria-label={`Edit ${material.name}`} aria-modal="true" className="fixed inset-0 z-[85] overflow-y-auto bg-midnight/88 p-0 backdrop-blur-xl sm:p-5" role="dialog">
    <div className="mx-auto flex min-h-dvh max-w-5xl items-end sm:min-h-[calc(100dvh-2.5rem)] sm:items-center">
      <form className="flex max-h-dvh w-full flex-col overflow-hidden bg-[#11100f] sm:max-h-[calc(100dvh-2.5rem)] sm:rounded-[1.8rem] sm:border sm:border-bronze/28" onSubmit={submit}>
        <header className="flex items-start justify-between gap-4 border-b border-bronze/18 px-5 py-5 sm:px-7">
          <div><p className="text-[0.65rem] uppercase tracking-[0.18em] text-ember">Edit fabric</p><h2 className="font-display mt-2 text-3xl text-stardust">{material.name}</h2><p className="mt-2 text-sm text-stardust/46">Update the textile record without changing its history or garment links.</p></div>
          <button aria-label="Close fabric editor" className="flex h-11 w-11 items-center justify-center rounded-xl border border-bronze/24 text-stardust/64 hover:border-ember/50" onClick={onClose} type="button"><X aria-hidden="true" size={18}/></button>
        </header>
        <div className="grid min-h-0 flex-1 md:grid-cols-[13rem_minmax(0,1fr)]">
          <nav aria-label="Fabric editor sections" className="flex gap-2 overflow-x-auto border-b border-bronze/16 p-3 md:flex-col md:border-b-0 md:border-r md:p-5">
            {([['core', 'Core information'], ['technical', 'Technical properties'], ['source', 'Supplier & storage'], ['notes', 'Notes & story']] as const).map(([id, label]) => <button aria-pressed={section === id} className={section === id ? 'min-h-11 whitespace-nowrap rounded-xl bg-ember px-4 text-left text-sm font-semibold text-midnight' : 'min-h-11 whitespace-nowrap rounded-xl px-4 text-left text-sm text-stardust/54 hover:bg-stardust/[0.05]'} key={id} onClick={() => setSection(id)} type="button">{label}</button>)}
          </nav>
          <div className="studio-scrollbar min-h-0 overflow-y-auto p-5 sm:p-7">
            {section === 'core' ? <EditorSection description="The identity used across garments, technical work, and sourcing." title="Core information"><div className="grid gap-4 sm:grid-cols-2"><Field label="Fabric name" onChange={(value) => update('name', value)} required value={values.name}/><Field label="Material type" onChange={(value) => update('category', value)} required value={values.category}/><Field label="Color / colorway" onChange={(value) => update('colorName', value)} value={values.colorName}/><label><Label>Color signal</Label><input className="field h-12 p-1" onChange={(event) => update('colorHex', event.target.value)} type="color" value={values.colorHex || '#5e4b3b'}/></label><Field className="sm:col-span-2" label="Composition" onChange={(value) => update('composition', value)} value={values.composition}/><Field label="Studio SKU" onChange={(value) => update('sku', value)} value={values.sku}/></div></EditorSection> : null}
            {section === 'technical' ? <EditorSection description="How the material behaves, feels, and works in construction." title="Technical properties"><div className="grid gap-4 sm:grid-cols-2"><NumberField label="Weight" onChange={(value) => update('weightGsm', value)} unit="gsm" value={values.weightGsm}/><div className="grid grid-cols-[1fr_7rem] gap-2"><NumberField label="Width" onChange={(value) => update('width', value)} value={values.width}/><label><Label>Unit</Label><select className="field" onChange={(event) => update('widthUnit', event.target.value as CanonicalFabricEditValues['widthUnit'])} value={values.widthUnit}><option value="">—</option><option value="in">in</option><option value="cm">cm</option><option value="mm">mm</option></select></label></div><Field label="Weave / knit" onChange={(value) => update('weaveOrKnit', value)} value={values.weaveOrKnit}/><Field label="Stretch" onChange={(value) => update('stretch', value)} value={values.stretch}/><Field label="Structure" onChange={(value) => update('structure', value)} value={values.structure}/><Field label="Texture / finish" onChange={(value) => update('texture', value)} value={values.texture}/><Field label="Drape" onChange={(value) => update('drape', value)} value={values.drape}/><Field label="Hand feel" onChange={(value) => update('handFeel', value)} value={values.handFeel}/><Field label="Opacity" onChange={(value) => update('opacity', value)} value={values.opacity}/></div></EditorSection> : null}
            {section === 'source' ? <EditorSection description="Where the textile came from and where it lives in the Studio." title="Supplier & storage"><div className="grid gap-4 sm:grid-cols-2"><label><Label>Supplier</Label><select className="field" onChange={(event) => { const id = event.target.value; update('supplierId', id); update('supplierName', state.suppliers.find((supplier) => supplier.id === id)?.name ?? ''); }} value={values.supplierId}><option value="">No supplier selected</option>{state.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label><Field label="New supplier name" onChange={(value) => { update('supplierName', value); if (value !== state.suppliers.find((supplier) => supplier.id === values.supplierId)?.name) update('supplierId', ''); }} value={values.supplierName}/><Field label="Supplier SKU" onChange={(value) => update('supplierSku', value)} value={values.supplierSku}/><NumberField label="Unit price" onChange={(value) => update('unitCost', value)} unit={values.currency || 'USD'} value={values.unitCost}/><Field label="Currency" onChange={(value) => update('currency', value.toUpperCase().slice(0, 3))} value={values.currency}/><NumberField label="Lead time" onChange={(value) => update('leadTimeDays', value)} unit="days" value={values.leadTimeDays}/><Field label="Country / region of origin" onChange={(value) => update('countryOfOrigin', value)} value={values.countryOfOrigin}/><Field label="Storage location" onChange={(value) => update('storageLocation', value)} value={values.storageLocation}/><Field label="Shelf" onChange={(value) => update('shelf', value)} value={values.shelf}/><Field label="Bin" onChange={(value) => update('binNumber', value)} value={values.binNumber}/></div></EditorSection> : null}
            {section === 'notes' ? <EditorSection description="Practical guidance and the creative character you want to remember." title="Notes & story"><div className="grid gap-5"><TextArea label="Care notes" onChange={(value) => update('careNotes', value)} value={values.careNotes}/><TextArea label="Material story" onChange={(value) => update('loreNote', value)} value={values.loreNote}/><TextArea label="Private notes" onChange={(value) => update('privateNotes', value)} value={values.privateNotes}/></div></EditorSection> : null}
          </div>
        </div>
        <footer className="flex flex-col-reverse gap-3 border-t border-bronze/18 p-4 sm:flex-row sm:justify-end sm:px-7"><Button onClick={onClose} type="button" variant="ghost">Cancel</Button><Button icon={<Check aria-hidden="true" size={16}/>} type="submit" variant="primary">Save fabric</Button></footer>
      </form>
    </div>
  </div>;
}

function valuesFromState(state: CanonicalWorkspaceState, variant: CanonicalMaterialVariant): CanonicalFabricEditValues {
  const material = state.materials.find((item) => item.id === variant.materialId)!;
  const profile = state.materialVariantProfiles.find((item) => item.variantId === variant.id);
  const offer = state.supplierItems.find((item) => item.materialVariantId === variant.id);
  const supplier = state.suppliers.find((item) => item.id === offer?.supplierId);
  return {
    binNumber: profile?.binNumber ?? '', careNotes: profile?.careNotes ?? '', category: material.category,
    colorHex: variant.colorHex ?? '#5e4b3b', colorName: variant.colorName, composition: material.composition,
    countryOfOrigin: profile?.countryOfOrigin ?? '', currency: offer?.currency ?? 'USD', drape: profile?.drape ?? '',
    handFeel: profile?.handFeel ?? '', leadTimeDays: offer?.leadTimeDays?.toString() ?? '', loreNote: profile?.loreNote ?? '',
    name: material.name, opacity: profile?.opacity ?? '', privateNotes: profile?.privateNotes ?? '', shelf: profile?.shelf ?? '',
    sku: variant.sku, storageLocation: profile?.storageLocation ?? '', stretch: profile?.stretch ?? '', structure: profile?.structure ?? '',
    supplierId: supplier?.id ?? '', supplierName: supplier?.name ?? '', supplierSku: offer?.sku ?? '', texture: profile?.texture ?? '',
    unitCost: offer?.unitCost?.toString() ?? '', weaveOrKnit: profile?.weaveOrKnit ?? '', weightGsm: variant.weightGsm?.toString() ?? '',
    width: variant.width?.toString() ?? '', widthUnit: variant.widthUnit ?? '',
  };
}

function EditorSection({ children, description, title }: { children: ReactNode; description: string; title: string }) { return <section><h3 className="font-display text-3xl text-stardust">{title}</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-stardust/46">{description}</p><div className="mt-6">{children}</div></section>; }
function Label({ children }: { children: ReactNode }) { return <span className="field-label">{children}</span>; }
function Field({ className = '', label, onChange, required, value }: { className?: string; label: string; onChange: (value: string) => void; required?: boolean; value: string }) { return <label className={className}><Label>{label}</Label><input className="field" onChange={(event) => onChange(event.target.value)} required={required} value={value}/></label>; }
function NumberField({ label, onChange, unit, value }: { label: string; onChange: (value: string) => void; unit?: string; value: string }) { return <label><Label>{label}</Label><div className="relative"><input className="field pr-16" min="0" onChange={(event) => onChange(event.target.value)} step="0.01" type="number" value={value}/>{unit ? <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-stardust/36">{unit}</span> : null}</div></label>; }
function TextArea({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) { return <label><Label>{label}</Label><textarea className="field min-h-28 resize-y py-3" onChange={(event) => onChange(event.target.value)} value={value}/></label>; }
