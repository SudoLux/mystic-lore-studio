import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import type { CanonicalMediaAsset, CanonicalMediaDerivative } from '../../domains/workspace';
import { cn } from '../../lib/classes';
import { CanonicalMediaImage } from './CanonicalMediaImage';

type CanonicalMediaLightboxProps = {
  assets: CanonicalMediaAsset[];
  derivatives: CanonicalMediaDerivative[];
  initialAssetId: string;
  label: string;
  onClose: () => void;
  returnFocusTo?: HTMLElement | null;
};

const controlClassName = 'inline-flex h-11 min-w-11 items-center justify-center rounded-xl border border-bronze/34 bg-midnight/76 px-3 text-sm font-medium text-stardust shadow-[0_12px_32px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:border-ember/60 hover:bg-stardust/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember disabled:cursor-not-allowed disabled:opacity-35';

/** A private-media viewer shared by canonical gallery surfaces. */
export function CanonicalMediaLightbox({
  assets,
  derivatives,
  initialAssetId,
  label,
  onClose,
  returnFocusTo,
}: CanonicalMediaLightboxProps) {
  const [activeAssetId, setActiveAssetId] = useState(initialAssetId);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const activeIndex = Math.max(assets.findIndex((asset) => asset.id === activeAssetId), 0);
  const activeAsset = assets[activeIndex];
  const activeIndexRef = useRef(activeIndex);
  const assetsRef = useRef(assets);
  const onCloseRef = useRef(onClose);
  const returnFocusRef = useRef(returnFocusTo);
  activeIndexRef.current = activeIndex;
  assetsRef.current = assets;
  onCloseRef.current = onClose;
  returnFocusRef.current = returnFocusTo;

  useEffect(() => {
    if (!assets.some((asset) => asset.id === activeAssetId)) setActiveAssetId(assets[0]?.id ?? '');
  }, [activeAssetId, assets]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const move = (offset: number) => {
      const activeAssets = assetsRef.current;
      if (activeAssets.length < 2) return;
      const nextIndex = (activeIndexRef.current + offset + activeAssets.length) % activeAssets.length;
      setActiveAssetId(activeAssets[nextIndex].id);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])];
        if (focusable.length > 0) {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        move(-1);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        move(1);
      }
    };
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      returnFocusRef.current?.focus();
    };
  }, []);

  const move = (offset: number) => {
    if (assets.length < 2) return;
    const nextIndex = (activeIndex + offset + assets.length) % assets.length;
    setActiveAssetId(assets[nextIndex].id);
  };

  if (!activeAsset || typeof document === 'undefined') return null;

  return createPortal(
    <div
      aria-label={`${label} image viewer`}
      aria-modal="true"
      className="fixed inset-0 z-[140] flex flex-col bg-midnight/96 p-3 text-stardust backdrop-blur-2xl sm:p-5"
      onClick={(event) => { if (event.currentTarget === event.target) onClose(); }}
      ref={dialogRef}
      role="dialog"
    >
      <header className="flex items-center justify-between gap-3 pb-3 sm:pb-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-ember">Inspiration field</p>
          <p className="mt-1 text-sm text-stardust/58">Image {activeIndex + 1} of {assets.length}</p>
        </div>
        <button aria-label="Close full-size image" className={controlClassName} onClick={onClose} ref={closeRef} type="button">
          <X aria-hidden="true" size={19} strokeWidth={1.9} />
        </button>
      </header>
      <div
        className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-bronze/24 bg-black/46"
        onPointerDown={(event) => { pointerStart.current = { x: event.clientX, y: event.clientY }; }}
        onPointerUp={(event) => {
          const start = pointerStart.current;
          pointerStart.current = null;
          if (!start || Math.abs(event.clientY - start.y) > 72 || Math.abs(event.clientX - start.x) < 52) return;
          move(event.clientX < start.x ? 1 : -1);
        }}
        style={{ touchAction: 'pan-y' }}
      >
        <CanonicalMediaImage
          alt={`${label} reference ${activeIndex + 1}`}
          asset={activeAsset}
          className="absolute inset-0 border-0 p-2 sm:p-5"
          derivatives={derivatives}
          fit="contain"
          key={activeAsset.id}
          mode="hero"
          priority
        />
        {assets.length > 1 ? <>
          <button aria-label="Previous inspiration image" className={cn(controlClassName, 'absolute left-3 top-1/2 -translate-y-1/2')} onClick={() => move(-1)} type="button">
            <ArrowLeft aria-hidden="true" size={19} strokeWidth={1.9} />
          </button>
          <button aria-label="Next inspiration image" className={cn(controlClassName, 'absolute right-3 top-1/2 -translate-y-1/2')} onClick={() => move(1)} type="button">
            <ArrowRight aria-hidden="true" size={19} strokeWidth={1.9} />
          </button>
        </> : null}
      </div>
    </div>,
    document.body,
  );
}
