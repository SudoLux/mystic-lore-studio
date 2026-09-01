import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Check, ImagePlus, Star, Trash2, X } from 'lucide-react';
import type { CanonicalMediaDerivative } from '../../domains/workspace';
import { MAX_GARMENT_VIEWS } from '../../domains/workspace';
import type { CanonicalGarmentView } from '../../lib/canonicalGarmentPresentation';
import { CanonicalMediaImage } from './CanonicalMediaImage';
import { Button } from './Button';

type Props = {
  derivatives: CanonicalMediaDerivative[];
  garmentTitle: string;
  onAdd: () => void;
  onClose: () => void;
  onMakeMain: (assetId: string) => void;
  onOpen: (assetId: string, trigger: HTMLElement) => void;
  onRemove: (view: CanonicalGarmentView) => void;
  returnFocusTo?: HTMLElement | null;
  uploading: boolean;
  views: CanonicalGarmentView[];
};

export function CanonicalGarmentViewManager({ derivatives, garmentTitle, onAdd, onClose, onMakeMain, onOpen, onRemove, returnFocusTo, uploading, views }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const returnFocusRef = useRef(returnFocusTo);
  const isFull = views.length >= MAX_GARMENT_VIEWS;
  onCloseRef.current = onClose;
  returnFocusRef.current = returnFocusTo;

  useEffect(() => {
    const priorOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = priorOverflow;
      window.removeEventListener('keydown', onKeyDown);
      returnFocusRef.current?.focus();
    };
  }, []);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div aria-describedby="garment-views-description" aria-labelledby="garment-views-title" aria-modal="true" className="fixed inset-0 z-[135] overflow-y-auto bg-midnight/88 p-3 backdrop-blur-xl sm:p-6" role="dialog">
      <div className="mx-auto flex min-h-full max-w-5xl items-center">
        <div className="w-full overflow-hidden rounded-[1.7rem] border border-bronze/28 bg-[#11100f] shadow-2xl" ref={dialogRef}>
          <header className="flex items-start justify-between gap-4 border-b border-bronze/18 p-5 sm:p-7">
            <div><p className="text-[0.65rem] uppercase tracking-[0.18em] text-ember">Garment photography</p><h2 className="font-display mt-2 text-3xl" id="garment-views-title">Manage photos</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-stardust/52" id="garment-views-description">Choose the main image shown across the Studio and keep up to two supporting views for {garmentTitle}.</p></div>
            <button aria-label="Close photo manager" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-bronze/24 text-stardust/62 transition hover:border-ember/55 hover:text-stardust focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember" onClick={onClose} ref={closeRef} type="button"><X aria-hidden="true" size={19}/></button>
          </header>
          <div className="p-5 sm:p-7">
            {views.length ? <div className="grid gap-4 md:grid-cols-3">{views.map((view, index) => <article className="overflow-hidden rounded-[1.3rem] border border-bronze/20 bg-stardust/[0.025]" key={view.relation.id}>
              <button aria-label={`Open ${garmentTitle} ${index === 0 ? 'main image' : `view ${index + 1}`}`} className="relative block aspect-[4/5] w-full overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ember" onClick={(event) => onOpen(view.asset.id, event.currentTarget)} type="button"><CanonicalMediaImage alt={`${garmentTitle} ${index === 0 ? 'main image' : `view ${index + 1}`}`} asset={view.asset} className="absolute inset-0 h-full w-full rounded-none border-0 transition duration-300 hover:scale-[1.015] motion-reduce:transform-none motion-reduce:transition-none" derivatives={derivatives} fit="cover" mode="thumbnail"/>{index === 0 ? <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-ember/50 bg-midnight/78 px-3 py-1.5 text-xs font-medium text-stardust backdrop-blur-xl"><Star aria-hidden="true" size={13}/>Main image</span> : null}</button>
              <div className="space-y-3 p-3"><p className="text-xs text-stardust/42">{index === 0 ? 'Shown across the Studio' : `Supporting view ${index}`}</p><div className="grid gap-2">{index === 0 ? <span className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-teal/28 bg-teal/8 text-sm text-teal"><Check aria-hidden="true" size={15}/>Main image</span> : <Button icon={<Star aria-hidden="true" size={15}/>} onClick={() => onMakeMain(view.asset.id)} size="sm">Make main</Button>}<Button icon={<Trash2 aria-hidden="true" size={15}/>} onClick={() => onRemove(view)} size="sm" variant="ghost">Remove</Button></div></div>
            </article>)}</div> : <div className="atelier-empty-state py-12 text-center"><Camera aria-hidden="true" className="mx-auto text-ember/55" size={30}/><p className="mt-4 text-sm font-medium text-stardust/72">No garment images yet</p><p className="mt-2 text-sm text-stardust/42">Upload the first view to create the main image.</p></div>}
          </div>
          <footer className="flex flex-col gap-3 border-t border-bronze/18 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <p aria-live="polite" className="text-xs text-stardust/44">{views.length} of {MAX_GARMENT_VIEWS} views{isFull ? ' — remove one to upload another.' : ''}</p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row"><Button onClick={onClose} variant="ghost">Done</Button><Button disabled={uploading || isFull} icon={<ImagePlus aria-hidden="true" size={16}/>} onClick={onAdd} variant="primary">{isFull ? 'Three views added' : 'Upload view'}</Button></div>
          </footer>
        </div>
      </div>
    </div>,
    document.body,
  );
}
