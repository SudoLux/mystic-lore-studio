import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Focus, ImagePlus, RotateCcw, Trash2, X } from 'lucide-react';
import type { CanonicalMaterialVariantMedia, CanonicalMediaAsset, CanonicalWorkspaceState } from '../../domains/workspace';
import { canonicalMaterialImageFraming, type CanonicalMaterialImageFraming } from '../../lib/canonicalMaterialPresentation';
import { CanonicalMediaImage } from '../shared/CanonicalMediaImage';
import { Button } from '../shared/Button';

export function FabricImageEditorDialog({ asset, materialName, onClose, onRemove, onSaveFile, onSaveFraming, relation, state }: {
  asset: CanonicalMediaAsset | null;
  materialName: string;
  onClose: () => void;
  onRemove: () => void;
  onSaveFile: (file: File, framing: CanonicalMaterialImageFraming) => Promise<void>;
  onSaveFraming: (framing: CanonicalMaterialImageFraming) => void;
  relation: CanonicalMaterialVariantMedia | null;
  state: CanonicalWorkspaceState;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [framing, setFraming] = useState(() => canonicalMaterialImageFraming(relation));
  const [pending, setPending] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!pending) { setPreview(null); return; }
    const url = URL.createObjectURL(pending); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pending]);
  const choose = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0] ?? null; event.target.value = ''; setError(null); if (file) setPending(file); };
  const save = async () => { setSaving(true); setError(null); try { if (pending) await onSaveFile(pending, framing); else onSaveFraming(framing); onClose(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'The image could not be saved.'); } finally { setSaving(false); } };
  return <div aria-label={`Edit ${materialName} image`} aria-modal="true" className="fixed inset-0 z-[90] overflow-y-auto bg-midnight/90 p-3 backdrop-blur-xl sm:p-6" role="dialog"><div className="mx-auto flex min-h-full max-w-5xl items-center"><div className="w-full overflow-hidden rounded-[1.7rem] border border-bronze/28 bg-[#11100f]">
    <header className="flex items-start justify-between gap-4 border-b border-bronze/18 p-5 sm:p-6"><div><p className="text-[0.65rem] uppercase tracking-[0.18em] text-ember">Fabric image</p><h2 className="font-display mt-2 text-3xl">Frame {materialName}</h2><p className="mt-2 text-sm text-stardust/46">The original stays intact. These controls change only how it appears across the Studio.</p></div><button aria-label="Close image editor" className="flex h-11 w-11 items-center justify-center rounded-xl border border-bronze/24 text-stardust/62" onClick={onClose} type="button"><X size={18}/></button></header>
    <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.25fr_.75fr]">
      <div><div className="relative aspect-[5/3] overflow-hidden rounded-[1.4rem] bg-espresso/50">{preview ? <img alt={`${materialName} preview`} className="h-full w-full" src={preview} style={{ objectFit: framing.objectFit, objectPosition: `${framing.objectPositionX}% ${framing.objectPositionY}%`, transform: `scale(${framing.zoom})`, transformOrigin: `${framing.objectPositionX}% ${framing.objectPositionY}%` }}/> : <CanonicalMediaImage alt={`${materialName} fabric`} asset={asset} className="h-full w-full rounded-none border-0" derivatives={state.mediaDerivatives} framing={framing} mode="library"/>}<span className="pointer-events-none absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-stardust/70"/></div><p className="mt-3 text-xs text-stardust/38">Use a close texture view when possible so weave, hand, and color remain recognizable.</p></div>
      <div className="space-y-5"><input accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="sr-only" onChange={choose} ref={inputRef} type="file"/><Button className="w-full" icon={<ImagePlus size={16}/>} onClick={() => inputRef.current?.click()} type="button">{asset || pending ? 'Replace image' : 'Choose image'}</Button><div><p className="field-label">Fit</p><div className="grid grid-cols-2 gap-2"><Choice active={framing.objectFit === 'cover'} label="Fill frame" onClick={() => setFraming((value) => ({ ...value, objectFit: 'cover' }))}/><Choice active={framing.objectFit === 'contain'} label="Show full image" onClick={() => setFraming((value) => ({ ...value, objectFit: 'contain', zoom: 1 }))}/></div></div><Range label="Horizontal focus" onChange={(value) => setFraming((current) => ({ ...current, objectPositionX: value }))} value={framing.objectPositionX}/><Range label="Vertical focus" onChange={(value) => setFraming((current) => ({ ...current, objectPositionY: value }))} value={framing.objectPositionY}/><Range label="Zoom" max={2.5} min={1} onChange={(value) => setFraming((current) => ({ ...current, zoom: value }))} step={0.05} value={framing.zoom}/><Button className="w-full" icon={<Focus size={16}/>} onClick={() => setFraming({ objectFit: 'cover', objectPositionX: 50, objectPositionY: 50, zoom: 1 })} type="button" variant="ghost">Smart center</Button><Button className="w-full" icon={<RotateCcw size={16}/>} onClick={() => setFraming(canonicalMaterialImageFraming(relation))} type="button" variant="ghost">Reset changes</Button>{asset ? <Button className="w-full" icon={<Trash2 size={16}/>} onClick={onRemove} type="button" variant="ghost">Remove image</Button> : null}</div>
    </div>{error ? <p className="mx-5 mb-4 rounded-xl bg-ember/10 p-3 text-sm text-ember" role="alert">{error}</p> : null}<footer className="flex flex-col-reverse gap-3 border-t border-bronze/18 p-4 sm:flex-row sm:justify-end sm:px-6"><Button onClick={onClose} type="button" variant="ghost">Cancel</Button><Button disabled={saving || (!asset && !pending)} onClick={() => void save()} type="button" variant="primary">{saving ? 'Saving…' : pending ? 'Save new image' : 'Save framing'}</Button></footer>
  </div></div></div>;
}

function Choice({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) { return <button aria-pressed={active} className={active ? 'min-h-11 rounded-xl border border-ember bg-ember/12 px-3 text-sm text-ember' : 'min-h-11 rounded-xl border border-bronze/22 px-3 text-sm text-stardust/56 hover:border-bronze/50'} onClick={onClick} type="button">{label}</button>; }
function Range({ label, max = 100, min = 0, onChange, step = 1, value }: { label: string; max?: number; min?: number; onChange: (value: number) => void; step?: number; value: number }) { return <label><span className="mb-2 flex justify-between text-xs text-stardust/48"><span>{label}</span><span className="tabular-nums">{label === 'Zoom' ? `${value.toFixed(2)}×` : `${Math.round(value)}%`}</span></span><input className="w-full accent-[#d5ab51]" max={max} min={min} onChange={(event) => onChange(Number(event.target.value))} step={step} type="range" value={value}/></label>; }
