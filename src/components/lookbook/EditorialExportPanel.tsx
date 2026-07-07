import { createPortal } from 'react-dom';
import { useMemo, useState, type ReactNode } from 'react';
import {
  BookOpen,
  CheckCircle2,
  FileArchive,
  FileText,
  Image as ImageIcon,
  Layers3,
  Play,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  editorialExportOptions,
  prepareEditorialExportSnapshot,
  type EditorialExportAdapters,
  type EditorialExportFormat,
  type EditorialExportStatus,
} from '../../lib/editorialExport';
import type { EditorialCollection } from '../../types/editorial';
import type { ApparelProject, Fabric } from '../../types/studio';
import { Badge } from '../shared/Badge';
import { Button } from '../shared/Button';

type EditorialExportPanelProps = {
  adapters?: EditorialExportAdapters;
  collection: EditorialCollection;
  fabrics?: Fabric[];
  onClose: () => void;
  onPresent: () => void;
  project?: ApparelProject;
};

const optionIcons: Record<EditorialExportFormat, typeof FileText> = {
  images: ImageIcon,
  package: FileArchive,
  pdf: FileText,
  presentation: Play,
};

export function EditorialExportPanel({
  adapters = {},
  collection,
  fabrics = [],
  onClose,
  onPresent,
  project,
}: EditorialExportPanelProps) {
  const preparation = useMemo(
    () => prepareEditorialExportSnapshot({ collection, fabrics, project }),
    [collection, fabrics, project],
  );
  const [status, setStatus] = useState<EditorialExportStatus>('idle');
  const [activeFormat, setActiveFormat] = useState<EditorialExportFormat | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const missingReferenceCount = preparation.warnings.filter((warning) => warning.code.startsWith('missing-')).length;

  const runAdapter = async (format: Exclude<EditorialExportFormat, 'presentation'>) => {
    const adapter = adapters[format];
    if (!adapter || status === 'preparing' || status === 'running') return;
    setActiveFormat(format);
    setStatus('preparing');
    setStatusMessage('Preparing collection assets…');
    try {
      setStatus('running');
      const result = await adapter.run(preparation);
      setStatus('success');
      setStatusMessage(result.message || `${result.filename || 'Export'} is ready.`);
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'The export could not be completed.');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[165] flex items-end justify-center bg-midnight/84 p-0 backdrop-blur-2xl sm:items-center sm:p-5">
      <section
        aria-labelledby="editorial-export-title"
        aria-modal="true"
        className="studio-scrollbar max-h-[94dvh] w-full max-w-3xl overflow-y-auto rounded-t-[1.5rem] border border-bronze/34 bg-[radial-gradient(circle_at_84%_12%,rgba(45,92,107,.2),transparent_30%),linear-gradient(145deg,rgba(23,27,31,.99),rgba(10,10,10,.99)_52%,rgba(35,23,15,.98))] p-4 text-stardust shadow-[0_34px_120px_rgba(0,0,0,.74)] sm:rounded-[1.5rem] sm:p-6"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Badge variant="ember">Export Studio</Badge>
            <h2 className="font-display mt-4 text-2xl leading-tight" id="editorial-export-title">Prepare {collection.title}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-stardust/52">Choose how this collection should leave the studio. Available formats are enabled only when their export pipeline is ready.</p>
          </div>
          <button aria-label="Close export panel" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-bronze/28 bg-midnight/46 text-stardust/58 transition hover:border-ember/45 hover:text-stardust" onClick={onClose} type="button"><X size={18} /></button>
        </header>

        <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
          <ReadinessMetric icon={<Layers3 size={15} />} label="Scenes" value={preparation.scenes.length} />
          <ReadinessMetric icon={<ImageIcon size={15} />} label="Images" value={preparation.imageAssets.length} />
          <ReadinessMetric icon={<BookOpen size={15} />} label="Fabrics" value={preparation.fabricAssets.length} />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {editorialExportOptions.map((option) => {
            const Icon = optionIcons[option.format];
            const adapterAvailable = option.format !== 'presentation' && Boolean(adapters[option.format]);
            const available = option.format === 'presentation' || adapterAvailable;
            return (
              <article className="rounded-xl border border-bronze/24 bg-midnight/38 p-4 shadow-[inset_0_1px_0_rgba(237,227,207,.035)]" key={option.format}>
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-bronze/28 bg-[linear-gradient(145deg,rgba(200,155,60,.13),rgba(27,58,99,.14))] text-ember"><Icon size={19} /></span>
                  <span className={available ? 'inline-flex items-center gap-1.5 text-[0.58rem] uppercase tracking-[0.14em] text-teal-200/70' : 'text-[0.58rem] uppercase tracking-[0.14em] text-stardust/34'}>{available ? <><CheckCircle2 size={12} /> Available</> : 'Coming Soon'}</span>
                </div>
                <h3 className="mt-4 text-base font-semibold">{option.label}</h3>
                <p className="mt-2 min-h-10 text-xs leading-5 text-stardust/46">{option.description}</p>
                {option.format === 'presentation' ? (
                  <Button className="mt-4 w-full" icon={<Play size={15} />} onClick={() => { onClose(); onPresent(); }} size="sm" variant="secondary">Present Collection</Button>
                ) : adapterAvailable ? (
                  <Button
                    className="mt-4 w-full"
                    disabled={status === 'preparing' || status === 'running'}
                    onClick={() => void runAdapter(option.format as Exclude<EditorialExportFormat, 'presentation'>)}
                    size="sm"
                    variant="secondary"
                  >
                    {activeFormat === option.format && (status === 'preparing' || status === 'running') ? 'Preparing…' : option.label}
                  </Button>
                ) : (
                  <button aria-disabled="true" className="mt-4 flex min-h-10 w-full cursor-not-allowed items-center justify-center rounded-xl border border-bronze/16 bg-stardust/[0.025] text-xs font-semibold text-stardust/28" disabled type="button">Coming Soon</button>
                )}
              </article>
            );
          })}
        </div>

        <footer className="mt-6 flex flex-col gap-3 border-t border-bronze/18 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 text-xs leading-5 text-stardust/42" role={status === 'error' ? 'alert' : 'status'}>
            <ShieldCheck className="mt-0.5 shrink-0 text-ember/72" size={16} />
            <span>{statusMessage || (missingReferenceCount > 0 ? `${missingReferenceCount} missing linked ${missingReferenceCount === 1 ? 'asset will use' : 'assets will use'} editorial fallbacks.` : 'All linked collection references are ready for presentation.')}</span>
          </div>
          <Button className="sm:shrink-0" onClick={onClose} variant="ghost">Done</Button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function ReadinessMetric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-bronze/22 bg-midnight/34 p-3 sm:p-4">
      <div className="flex items-center gap-2 text-ember/74">{icon}<span className="text-[0.56rem] uppercase tracking-[0.14em] text-stardust/38">{label}</span></div>
      <p className="mt-2 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
