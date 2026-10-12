import { useCallback, useRef, useState } from 'react';
import type { CanonicalWorkspaceState } from '../../domains/workspace';
import { previewStudioRemoval, type StudioRemovalKind } from '../../lib/studioRemoval';
import { Button } from './Button';
import { useDialogA11y } from './useDialogA11y';

export function StudioRemovalDialog({ id, kind, title, state, onClose, onConfirm, onArchive }: {
  id: string; kind: StudioRemovalKind; title: string; state: CanonicalWorkspaceState;
  onClose: () => void; onConfirm: () => Promise<void>; onArchive?: () => Promise<void>;
}) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workingRef = useRef(false);
  const close = useCallback(() => { if (!workingRef.current) onClose(); }, [onClose]);
  const dialogRef = useDialogA11y(true, close);
  const preview = previewStudioRemoval(state, kind, id);
  const run = async (action: () => Promise<void>) => {
    if (workingRef.current) return;
    workingRef.current = true;
    setWorking(true); setError(null);
    try { await action(); onClose(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Removal could not be confirmed. Refresh and try again.'); }
    finally { workingRef.current = false; setWorking(false); }
  };
  return <div className="fixed inset-0 z-[180] flex items-end justify-center bg-midnight/88 p-4 backdrop-blur-xl sm:items-center">
    <section aria-labelledby="studio-removal-title" aria-describedby="studio-removal-impact" aria-modal="true" className="w-full max-w-lg rounded-2xl border border-bronze/30 bg-[#11100f] p-5 sm:p-7" ref={dialogRef} role="dialog" tabIndex={-1}>
      <h2 className="font-display text-2xl" id="studio-removal-title">Remove {title}?</h2>
      <p className="mt-4 text-sm leading-6 text-stardust/65" id="studio-removal-impact">{preview.effects}</p>
      <p className="mt-3 text-sm leading-6 text-stardust/65">Original images and files stay in your private Studio library. Confirmed deletion cannot be undone here.</p>
      {preview.blocked ? <p className="mt-4 text-sm leading-6 text-ember">{preview.blocked}</p> : null}
      {error ? <p className="mt-4 text-sm text-ember" role="alert">{error}</p> : null}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button disabled={working} onClick={close} variant="ghost">Keep item</Button>
        {onArchive ? <Button disabled={working} onClick={() => void run(onArchive)} variant="secondary">Archive instead</Button> : null}
        <Button disabled={working || Boolean(preview.blocked)} onClick={() => void run(onConfirm)} variant="primary">{working ? 'Waiting for confirmation…' : 'Delete permanently'}</Button>
      </div>
    </section>
  </div>;
}
