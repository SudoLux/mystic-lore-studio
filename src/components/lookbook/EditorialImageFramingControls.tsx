import { useRef } from 'react';
import { Focus, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '../../lib/classes';
import {
  editorialFitMode,
  editorialFrameAspectClass,
  editorialImageDisplay,
  editorialMediaFrameChoiceOptions,
} from '../../lib/editorialMedia';
import { getImageOrientation } from '../../lib/imageAssets';
import type { EditorialImageContent, EditorialJsonValue } from '../../types/editorial';
import type { LocalImageAsset } from '../../types/studio';
import { AdaptiveProjectImage } from '../projects/AdaptiveProjectImage';

type EditorialImageFramingControlsProps = {
  asset?: LocalImageAsset;
  content: EditorialImageContent;
  onChange: (updates: Record<string, EditorialJsonValue>) => void;
};

export function EditorialImageFramingControls({ asset, content, onChange }: EditorialImageFramingControlsProps) {
  const dragStart = useRef<{ x: number; y: number; positionX: number; positionY: number } | null>(null);
  const display = asset ? editorialImageDisplay(asset, content) : undefined;
  const fitMode = editorialFitMode(content);
  const update = (updates: Record<string, EditorialJsonValue>) => onChange(updates);
  const smartFit = () => update({
    fitMode: 'smart',
    objectPositionX: 50,
    objectPositionY: 50,
    zoom: 1,
  });

  return (
    <div className="space-y-3 rounded-xl border border-bronze/22 bg-midnight/36 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-stardust/42">Frame and focus</p>
          <p className="mt-1 text-xs text-stardust/38">Drag the image to set its focal point.</p>
        </div>
        <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-bronze/26 px-2 text-[0.62rem] text-stardust/58 transition hover:border-ember/44 hover:text-stardust" onClick={smartFit} type="button"><Focus size={13} />Smart fit</button>
      </div>
      {asset && display ? (
        <div
          className={cn('relative mx-auto max-h-64 w-full max-w-64 touch-none overflow-hidden rounded-lg border border-stardust/12 bg-black/45', editorialFrameAspectClass(content.frame, asset))}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            dragStart.current = { x: event.clientX, y: event.clientY, positionX: display.objectPositionX ?? 50, positionY: display.objectPositionY ?? 50 };
          }}
          onPointerMove={(event) => {
            if (!dragStart.current) return;
            const rect = event.currentTarget.getBoundingClientRect();
            update({
              objectPositionX: clamp(dragStart.current.positionX - ((event.clientX - dragStart.current.x) / rect.width) * 100, 0, 100),
              objectPositionY: clamp(dragStart.current.positionY - ((event.clientY - dragStart.current.y) / rect.height) * 100, 0, 100),
            });
          }}
          onPointerUp={() => { dragStart.current = null; }}
          onWheel={(event) => {
            event.preventDefault();
            update({ zoom: clamp((content.zoom ?? display.zoom ?? 1) + (event.deltaY < 0 ? 0.1 : -0.1), 1, 2.5) });
          }}
        >
          <AdaptiveProjectImage asset={display} className="absolute inset-0" displayFit={display.objectFit} mode={display.objectFit === 'contain' ? 'primary' : 'compact'} />
          <span className="pointer-events-none absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-stardust/80 shadow-[0_0_0_999px_rgba(0,0,0,.08)]" />
        </div>
      ) : <div className="rounded-lg border border-dashed border-bronze/22 px-3 py-4 text-center text-xs text-stardust/38">Choose a managed image to adjust its framing.</div>}

      <div className="grid grid-cols-2 gap-2">
        {editorialMediaFrameChoiceOptions.map((option) => (
          <button aria-pressed={(content.frame ?? 'auto') === option.value} className={cn('h-9 rounded-lg border px-2 text-xs transition', (content.frame ?? 'auto') === option.value ? 'border-ember bg-ember/12 text-ember' : 'border-bronze/18 text-stardust/54 hover:border-bronze/42')} key={option.value} onClick={() => update({ frame: option.value })} type="button">{option.label}</button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <FrameButton active={fitMode === 'smart'} label="Smart" onClick={smartFit} />
        <FrameButton active={fitMode === 'cover'} label="Fill" onClick={() => update({ fit: 'cover', fitMode: 'cover' })} />
        <FrameButton active={fitMode === 'contain'} label="Full image" onClick={() => update({ fit: 'contain', fitMode: 'contain', zoom: 1 })} />
      </div>
      <div className="flex items-center justify-center gap-3">
        <button aria-label="Zoom out" className="flex h-8 w-8 items-center justify-center rounded-lg border border-bronze/20 text-stardust/56 transition hover:border-bronze/44 disabled:opacity-30" disabled={(content.zoom ?? display?.zoom ?? 1) <= 1} onClick={() => update({ zoom: clamp((content.zoom ?? display?.zoom ?? 1) - 0.1, 1, 2.5) })} type="button"><ZoomOut size={14} /></button>
        <span className="min-w-12 text-center text-xs tabular-nums text-stardust/58">{(content.zoom ?? display?.zoom ?? 1).toFixed(2)}x</span>
        <button aria-label="Zoom in" className="flex h-8 w-8 items-center justify-center rounded-lg border border-bronze/20 text-stardust/56 transition hover:border-bronze/44 disabled:opacity-30" disabled={(content.zoom ?? display?.zoom ?? 1) >= 2.5} onClick={() => update({ zoom: clamp((content.zoom ?? display?.zoom ?? 1) + 0.1, 1, 2.5) })} type="button"><ZoomIn size={14} /></button>
        <button aria-label="Reset frame" className="flex h-8 w-8 items-center justify-center rounded-lg border border-bronze/20 text-stardust/56 transition hover:border-bronze/44" onClick={() => update({ objectPositionX: 50, objectPositionY: 50, zoom: 1 })} type="button"><RotateCcw size={14} /></button>
      </div>
      {asset ? <p className="text-center text-[0.58rem] text-stardust/32">{getImageOrientation(asset) === 'portrait' ? 'Portrait media defaults to a full-image presentation.' : 'Landscape and square media default to a clean editorial crop.'}</p> : null}
    </div>
  );
}

function FrameButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button aria-pressed={active} className={cn('h-9 rounded-lg border px-2 text-[0.62rem] transition', active ? 'border-ember bg-ember text-midnight' : 'border-bronze/18 text-stardust/54 hover:border-bronze/42')} onClick={onClick} type="button">{label}</button>;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
