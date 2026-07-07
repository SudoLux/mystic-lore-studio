import { createPortal } from 'react-dom';
import { useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  FileArchive,
  FileText,
  Image as ImageIcon,
  Layers3,
  Play,
  Settings2,
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
import { cn } from '../../lib/classes';
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

const optionDescriptions = Object.fromEntries(
  editorialExportOptions.map((option) => [option.format, option.description]),
) as Record<EditorialExportFormat, string>;

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
  const [imageScale, setImageScale] = useState<1 | 2 | 3>(2);
  const [includeImageIndex, setIncludeImageIndex] = useState(true);
  const [showImageSettings, setShowImageSettings] = useState(false);
  const missingReferenceCount = preparation.warnings.filter((warning) => warning.code.startsWith('missing-')).length;
  const isBusy = status === 'preparing' || status === 'running';

  const runAdapter = async (format: Exclude<EditorialExportFormat, 'presentation'>) => {
    const adapter = adapters[format];
    if (!adapter || isBusy) return;
    setActiveFormat(format);
    setStatus('preparing');
    setStatusMessage('Preparing collection assets...');
    try {
      setStatus('running');
      const result = await adapter.run(preparation, {
        imageOptions: { format: 'png', includeIndex: includeImageIndex, scale: imageScale },
        onProgress: setStatusMessage,
      });
      setStatus('success');
      setStatusMessage(result.message || `${result.filename || 'Export'} is ready.`);
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'The export could not be completed.');
    }
  };

  const imageSummary = `PNG / ${imageScale}x / ${includeImageIndex ? 'Index included' : 'No index'}`;

  return createPortal(
    <div className="fixed inset-0 z-[165] flex items-end justify-center bg-midnight/84 backdrop-blur-2xl sm:items-center sm:p-5">
      <section
        aria-labelledby="editorial-export-title"
        aria-modal="true"
        className="flex h-[100dvh] w-full max-w-4xl flex-col overflow-hidden border border-bronze/34 bg-[radial-gradient(circle_at_84%_12%,rgba(45,92,107,.18),transparent_29%),linear-gradient(145deg,rgba(23,27,31,.995),rgba(10,10,10,.995)_52%,rgba(35,23,15,.99))] text-stardust shadow-[0_34px_120px_rgba(0,0,0,.74)] sm:h-auto sm:max-h-[92dvh] sm:rounded-[1.5rem]"
        role="dialog"
      >
        <header className="shrink-0 border-b border-bronze/18 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Badge variant="ember">Export Studio</Badge>
              <h2 className="font-display mt-3 truncate text-xl leading-tight sm:text-2xl" id="editorial-export-title">Prepare {collection.title}</h2>
              <p className="mt-1.5 max-w-2xl text-xs leading-5 text-stardust/48 sm:text-sm">Choose a finished file or open the collection as a presentation.</p>
            </div>
            <button aria-label="Close export panel" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-bronze/28 bg-midnight/46 text-stardust/58 transition hover:border-ember/45 hover:text-stardust" onClick={onClose} type="button"><X size={18} /></button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-bronze/18 bg-midnight/32 px-3 py-2.5 sm:px-4">
            <ReadinessMetric icon={<Layers3 size={14} />} label="Scenes" value={preparation.scenes.length} />
            <ReadinessDivider />
            <ReadinessMetric icon={<ImageIcon size={14} />} label="Images" value={preparation.imageAssets.length} />
            <ReadinessDivider />
            <ReadinessMetric icon={<BookOpen size={14} />} label="Fabrics" value={preparation.fabricAssets.length} />
            {missingReferenceCount > 0 ? (
              <>
                <ReadinessDivider />
                <span className="inline-flex items-center gap-1.5 text-[0.65rem] text-amber-200/72"><AlertTriangle size={13} />{missingReferenceCount} fallback{missingReferenceCount === 1 ? '' : 's'}</span>
              </>
            ) : null}
          </div>
        </header>

        <main className="studio-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          <section aria-labelledby="export-files-heading">
            <SectionLabel id="export-files-heading">Export Files</SectionLabel>
            <div className="mt-3 space-y-3">
              <ExportRow
                action={
                  <Button
                    className="w-full sm:w-44"
                    disabled={!adapters.pdf || isBusy}
                    onClick={() => void runAdapter('pdf')}
                    size="sm"
                    variant="secondary"
                  >
                    {activeFormat === 'pdf' && isBusy ? 'Exporting...' : 'Export PDF'}
                  </Button>
                }
                available={Boolean(adapters.pdf)}
                description={optionDescriptions.pdf}
                icon={<FileText size={19} />}
                summary="PDF / All scenes"
                title="PDF Document"
              />

              <ExportRow
                action={
                  <div className="flex w-full gap-2 sm:w-auto">
                    <button
                      aria-expanded={showImageSettings}
                      aria-label="Configure image export"
                      className={cn(
                        'flex h-10 w-11 shrink-0 items-center justify-center rounded-xl border transition',
                        showImageSettings ? 'border-ember/48 bg-ember/12 text-ember' : 'border-bronze/28 bg-midnight/42 text-stardust/52 hover:border-ember/42 hover:text-stardust',
                      )}
                      disabled={!adapters.images || isBusy}
                      onClick={() => setShowImageSettings((current) => !current)}
                      title="Image export settings"
                      type="button"
                    >
                      <Settings2 size={16} />
                    </button>
                    <Button
                      className="min-w-0 flex-1 sm:w-44 sm:flex-none"
                      disabled={!adapters.images || isBusy}
                      onClick={() => void runAdapter('images')}
                      size="sm"
                      variant="secondary"
                    >
                      {activeFormat === 'images' && isBusy ? 'Exporting...' : 'Export Images'}
                    </Button>
                  </div>
                }
                available={Boolean(adapters.images)}
                description={optionDescriptions.images}
                expanded={showImageSettings}
                icon={<ImageIcon size={19} />}
                summary={imageSummary}
                title="Scene Images"
              >
                <ImageExportSettings
                  disabled={isBusy}
                  includeIndex={includeImageIndex}
                  onIncludeIndexChange={setIncludeImageIndex}
                  onScaleChange={setImageScale}
                  scale={imageScale}
                />
              </ExportRow>
            </div>
          </section>

          <section aria-labelledby="presentation-heading" className="mt-6">
            <SectionLabel id="presentation-heading">Presentation</SectionLabel>
            <div className="mt-3 flex flex-col gap-4 rounded-xl border border-teal-300/18 bg-[linear-gradient(120deg,rgba(45,92,107,.14),rgba(10,10,10,.34))] p-4 sm:flex-row sm:items-center">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-teal-300/24 bg-teal-300/[0.06] text-teal-200/78"><Play size={18} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold sm:text-base">Present Collection</h3><AvailabilityLabel available /></div>
                <p className="mt-1 text-xs leading-5 text-stardust/44">Open the cinematic full-screen viewer without creating a file.</p>
              </div>
              <Button className="w-full sm:w-44 sm:shrink-0" disabled={isBusy} icon={<Play size={15} />} onClick={() => { onClose(); onPresent(); }} size="sm" variant="secondary">Open Viewer</Button>
            </div>
          </section>

          <section aria-labelledby="coming-next-heading" className="mt-6">
            <SectionLabel id="coming-next-heading">Coming Next</SectionLabel>
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-bronze/12 bg-stardust/[0.018] px-4 py-3.5 text-stardust/34">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-bronze/14 bg-midnight/28"><FileArchive size={17} /></span>
              <div className="min-w-0 flex-1"><p className="text-sm font-medium text-stardust/46">Shareable Package</p><p className="mt-0.5 text-xs leading-5">Bundle collection data and linked media for sharing.</p></div>
              <span className="shrink-0 text-[0.58rem] uppercase tracking-[0.16em]">Coming Soon</span>
            </div>
          </section>
        </main>

        <footer className="shrink-0 border-t border-bronze/18 bg-midnight/72 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl sm:flex sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:pb-4">
          <div className="flex min-w-0 items-start gap-2.5 text-xs leading-5 text-stardust/46" role={status === 'error' ? 'alert' : 'status'}>
            {status === 'error' ? <AlertTriangle className="mt-0.5 shrink-0 text-amber-300" size={15} /> : status === 'success' ? <CheckCircle2 className="mt-0.5 shrink-0 text-teal-200" size={15} /> : <ShieldCheck className="mt-0.5 shrink-0 text-ember/72" size={15} />}
            <span className="line-clamp-2">{statusMessage || (missingReferenceCount > 0 ? `${missingReferenceCount} linked ${missingReferenceCount === 1 ? 'asset will use' : 'assets will use'} an editorial fallback.` : 'Collection assets are ready to export.')}</span>
          </div>
          <Button className="mt-3 w-full sm:mt-0 sm:w-auto sm:shrink-0" disabled={isBusy} onClick={onClose} size="sm" variant="ghost">Done</Button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function ExportRow({
  action,
  available,
  children,
  description,
  expanded = false,
  icon,
  summary,
  title,
}: {
  action: ReactNode;
  available: boolean;
  children?: ReactNode;
  description: string;
  expanded?: boolean;
  icon: ReactNode;
  summary: string;
  title: string;
}) {
  return (
    <article className="overflow-hidden rounded-xl border border-bronze/22 bg-midnight/34 shadow-[inset_0_1px_0_rgba(237,227,207,.03)]">
      <div className="flex flex-col gap-4 p-4 sm:grid sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-bronze/28 bg-[linear-gradient(145deg,rgba(200,155,60,.12),rgba(27,58,99,.12))] text-ember">{icon}</span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold sm:text-base">{title}</h3><AvailabilityLabel available={available} /></div>
          <p className="mt-1 text-xs leading-5 text-stardust/44">{description}</p>
          <p className="mt-2 text-[0.58rem] uppercase tracking-[0.14em] text-ember/66">{summary}</p>
        </div>
        <div className="w-full sm:w-auto">{action}</div>
      </div>
      {children ? (
        <div className={cn('grid transition-[grid-template-rows,opacity] duration-200', expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
          <div className="min-h-0 overflow-hidden"><div className="border-t border-bronze/16 bg-midnight/28 px-4 py-4 sm:ml-[4.75rem] sm:px-0 sm:pr-4">{children}</div></div>
        </div>
      ) : null}
    </article>
  );
}

function ImageExportSettings({
  disabled,
  includeIndex,
  onIncludeIndexChange,
  onScaleChange,
  scale,
}: {
  disabled: boolean;
  includeIndex: boolean;
  onIncludeIndexChange: (value: boolean) => void;
  onScaleChange: (value: 1 | 2 | 3) => void;
  scale: 1 | 2 | 3;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
      <div>
        <p className="text-[0.58rem] uppercase tracking-[0.15em] text-stardust/38">Resolution</p>
        <div className="mt-2 flex w-full rounded-lg border border-bronze/20 bg-midnight/46 p-1 sm:max-w-56">
          {([1, 2, 3] as const).map((value) => (
            <button
              aria-pressed={scale === value}
              className={cn('h-9 flex-1 rounded-md text-xs font-semibold transition', scale === value ? 'bg-ember text-midnight shadow-[0_5px_18px_rgba(200,155,60,.2)]' : 'text-stardust/44 hover:text-stardust')}
              disabled={disabled}
              key={value}
              onClick={() => onScaleChange(value)}
              type="button"
            >
              {value}x
            </button>
          ))}
        </div>
        <p className="mt-2 text-[0.68rem] leading-4 text-stardust/34">2x balances presentation quality and export speed.</p>
      </div>
      <div>
        <p className="text-[0.58rem] uppercase tracking-[0.15em] text-stardust/38">Package details</p>
        <label className="mt-2 flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border border-bronze/18 bg-midnight/38 px-3 text-xs text-stardust/58">
          Include index.json
          <input checked={includeIndex} className="h-5 w-5 accent-[#c89b3c]" disabled={disabled} onChange={(event) => onIncludeIndexChange(event.target.checked)} type="checkbox" />
        </label>
        <p className="mt-2 text-[0.68rem] leading-4 text-stardust/34">Adds scene order, titles, and export warnings.</p>
      </div>
    </div>
  );
}

function AvailabilityLabel({ available }: { available: boolean }) {
  return available ? (
    <span className="inline-flex items-center gap-1 text-[0.54rem] uppercase tracking-[0.14em] text-teal-200/64"><CheckCircle2 size={11} />Available</span>
  ) : (
    <span className="text-[0.54rem] uppercase tracking-[0.14em] text-stardust/30">Unavailable</span>
  );
}

function SectionLabel({ children, id }: { children: ReactNode; id: string }) {
  return <h3 className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-stardust/38" id={id}>{children}</h3>;
}

function ReadinessMetric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return <span className="inline-flex items-center gap-1.5 text-[0.65rem] text-stardust/48"><span className="text-ember/68">{icon}</span><strong className="font-semibold tabular-nums text-stardust/78">{value}</strong>{label}</span>;
}

function ReadinessDivider() {
  return <span aria-hidden="true" className="hidden h-3 w-px bg-bronze/22 min-[420px]:block" />;
}
