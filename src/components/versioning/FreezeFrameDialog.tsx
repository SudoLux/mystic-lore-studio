import { Camera, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { freezeFrameScopes } from '../../domains/versioning';
import type { FreezeFrameScope } from '../../domains/workspace';
import { Button } from '../shared/Button';

export function FreezeFrameDialog({ busy, onClose, onCreate, open }: { busy: boolean; onClose: () => void; onCreate: (input: { label: string; notes: string; scope: FreezeFrameScope }) => Promise<void>; open: boolean }) {
  const [scope, setScope] = useState<FreezeFrameScope>('all');
  const [error, setError] = useState('');
  const labelRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) labelRef.current?.focus(); }, [open]);
  if (!open) return null;
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError('');
    try {
      await onCreate({ label: String(form.get('label') ?? ''), notes: String(form.get('notes') ?? ''), scope });
      onClose();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The Freeze Frame could not be created.'); }
  };
  return <div className="fixed inset-0 z-50 grid place-items-center bg-midnight/82 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section aria-labelledby="freeze-frame-title" aria-modal="true" className="w-full max-w-xl rounded-[1.6rem] border border-bronze/38 bg-midnight p-6 shadow-2xl" role="dialog">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.16em] text-ember">Named checkpoint</p><h2 className="font-display mt-2 text-3xl" id="freeze-frame-title">Create Freeze Frame</h2></div><button aria-label="Close Freeze Frame dialog" className="rounded-lg p-2 text-stardust/55 hover:bg-stardust/10" disabled={busy} onClick={onClose} type="button"><X size={18} /></button></div>
      <p className="mt-3 text-sm leading-6 text-stardust/58">Capture a hashed, garment-scoped structural snapshot. This preserves relationships and source evidence, not just a visual screenshot.</p>
      <form className="mt-6 space-y-4" onSubmit={(event) => void submit(event)}>
        <label><span className="field-label">Frame name</span><input className="field" name="label" placeholder="Fit review · approved direction" ref={labelRef} required /></label>
        <fieldset><legend className="field-label">Scope</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{freezeFrameScopes.map((item) => <button aria-pressed={scope === item} className={scope === item ? 'min-h-11 rounded-xl border border-ember bg-ember/14 px-3 text-sm text-ember' : 'min-h-11 rounded-xl border border-bronze/25 px-3 text-sm capitalize text-stardust/64 hover:border-bronze/50'} key={item} onClick={() => setScope(item)} type="button">{item}</button>)}</div></fieldset>
        <label><span className="field-label">Decision note</span><textarea className="field min-h-24 resize-y" name="notes" placeholder="Why this state matters and what was approved." /></label>
        {error ? <p aria-live="assertive" className="rounded-xl border border-ember/35 bg-ember/10 p-3 text-sm text-stardust">{error}</p> : null}
        <div className="flex justify-end gap-2"><Button disabled={busy} onClick={onClose} variant="ghost">Cancel</Button><Button disabled={busy} icon={<Camera size={16} />} type="submit" variant="primary">{busy ? 'Capturing…' : 'Create Freeze Frame'}</Button></div>
      </form>
    </section>
  </div>;
}
