import { useRef, useState, type ReactNode } from 'react';
import { Check, ImagePlus, Images, UploadCloud } from 'lucide-react';
import { cn } from '../../lib/classes';
import { MAX_PROJECT_EDITORIAL_IMAGES } from '../../lib/imageAssets';
import { createLocalImageAsset } from '../../lib/localImages';
import type { LocalImageAsset } from '../../types/studio';
import { AdaptiveProjectImage } from '../projects/AdaptiveProjectImage';

type EditorialMediaPickerProps = {
  editorialImages: LocalImageAsset[];
  maxSelections?: number;
  onAddAssets: (images: LocalImageAsset[]) => void;
  onSelect: (image: LocalImageAsset) => void;
  projectImages: LocalImageAsset[];
  selectUploaded?: boolean;
  selectedIds?: string[];
};

export function EditorialMediaPicker({
  editorialImages,
  maxSelections,
  onAddAssets,
  onSelect,
  projectImages,
  selectUploaded = true,
  selectedIds = [],
}: EditorialMediaPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeSource, setActiveSource] = useState<'editorial' | 'project'>('project');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const sourceImages = activeSource === 'project' ? projectImages : editorialImages;
  const remainingLibrarySlots = Math.max(0, MAX_PROJECT_EDITORIAL_IMAGES - editorialImages.length);

  const upload = async (files: FileList | null) => {
    const selectedFiles = Array.from(files ?? []).slice(0, remainingLibrarySlots);
    if (selectedFiles.length === 0) {
      setError(remainingLibrarySlots === 0 ? `This project already has ${MAX_PROJECT_EDITORIAL_IMAGES} editorial images.` : null);
      return;
    }

    setError(null);
    setIsProcessing(true);
    const prepared: LocalImageAsset[] = [];
    const failures: string[] = [];
    let cursor = 0;
    const worker = async () => {
      while (cursor < selectedFiles.length) {
        const index = cursor++;
        const file = selectedFiles[index];
        setProgress(`Optimizing ${index + 1} of ${selectedFiles.length}`);
        try {
          prepared.push(await createLocalImageAsset(file));
        } catch {
          failures.push(file.name);
        }
      }
    };

    await Promise.all([worker(), worker()]);
    if (prepared.length) {
      onAddAssets(prepared);
      if (selectUploaded) prepared.slice(0, maxSelections ?? prepared.length).forEach(onSelect);
      setActiveSource('editorial');
    }
    if (failures.length) {
      setError(`Could not prepare ${failures.length} image${failures.length === 1 ? '' : 's'}. The remaining photos are ready to use.`);
    }
    setProgress('');
    setIsProcessing(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="rounded-xl border border-bronze/22 bg-midnight/34 p-3">
      <input
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        className="sr-only"
        multiple
        onChange={(event) => void upload(event.target.files)}
        ref={inputRef}
        type="file"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-stardust/42">Media library</p>
          <p className="mt-1 text-xs text-stardust/38">Reuse project photos or add up to {MAX_PROJECT_EDITORIAL_IMAGES} editorial assets.</p>
        </div>
        <button
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-ember/34 bg-ember/8 px-3 text-xs font-semibold text-ember transition hover:bg-ember/16 disabled:opacity-40"
          disabled={isProcessing || remainingLibrarySlots === 0}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          {isProcessing ? <UploadCloud size={15} /> : <ImagePlus size={15} />}
          {isProcessing ? progress || 'Optimizing…' : 'Add photos'}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-stardust/10 bg-black/20 p-1">
        <SourceTab active={activeSource === 'project'} icon={<Images size={14} />} label={`Project photos · ${projectImages.length}`} onClick={() => setActiveSource('project')} />
        <SourceTab active={activeSource === 'editorial'} icon={<ImagePlus size={14} />} label={`Editorial assets · ${editorialImages.length}`} onClick={() => setActiveSource('editorial')} />
      </div>

      {sourceImages.length ? (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {sourceImages.map((image) => {
            const selected = selectedIds.includes(image.id);
            const selectionFull = Boolean(maxSelections && selectedIds.length >= maxSelections && !selected);
            return (
              <button
                aria-label={`Use ${image.name}`}
                aria-pressed={selected}
                className={cn('group relative aspect-[4/5] overflow-hidden rounded-lg border bg-midnight transition', selected ? 'border-ember ring-1 ring-ember/62' : 'border-stardust/12 hover:border-bronze/48', selectionFull && 'opacity-40')}
                disabled={selectionFull}
                key={image.id}
                onClick={() => onSelect(image)}
                type="button"
              >
                <AdaptiveProjectImage asset={image} className="absolute inset-0" mode="thumbnail" />
                <span className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,.82))] px-1.5 pb-1.5 pt-5 text-left text-[0.52rem] leading-3 text-stardust/64 line-clamp-2">{image.name}</span>
                {selected ? <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ember text-midnight"><Check size={12} /></span> : null}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-dashed border-bronze/22 px-3 py-5 text-center text-xs leading-5 text-stardust/40">
          {activeSource === 'project' ? 'This project has no hero or gallery photos yet.' : 'Upload photography here to build a reusable editorial media library.'}
        </div>
      )}
      {error ? <p className="mt-3 text-xs leading-5 text-amber-200/72">{error}</p> : null}
    </div>
  );
}

function SourceTab({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return <button className={cn('flex min-h-9 items-center justify-center gap-1.5 rounded-md px-2 text-[0.62rem] transition', active ? 'bg-ember text-midnight' : 'text-stardust/48 hover:text-stardust')} onClick={onClick} type="button">{icon}<span className="truncate">{label}</span></button>;
}
