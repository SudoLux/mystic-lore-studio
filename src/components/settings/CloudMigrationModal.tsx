import { CloudUpload, Loader2 } from 'lucide-react';
import { Button } from '../shared/Button';
import type { StudioData } from '../../lib/studioStorage';

export function CloudMigrationModal({
  data,
  isMigrating,
  onAccept,
  onDismiss,
}: {
  data: StudioData;
  isMigrating: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const imageCount =
    data.projects.reduce(
      (count, project) =>
        count + (project.heroImage ? 1 : 0) + (project.galleryImages?.length ?? 0) + (project.editorialImages?.length ?? 0),
      0,
    ) +
    data.lookbookPages.filter((page) => page.heroImage).length +
    data.fabrics.filter((fabric) => fabric.image).length;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-midnight/86 px-3 py-4 backdrop-blur-xl sm:items-center sm:px-5">
      <section
        aria-labelledby="cloud-migration-title"
        aria-modal="true"
        className="w-full max-w-2xl rounded-[1.75rem] border border-ember/38 bg-[linear-gradient(145deg,rgba(27,58,99,0.42),rgba(10,10,10,0.98),rgba(61,43,31,0.74))] p-5 text-stardust shadow-[0_34px_110px_rgba(0,0,0,0.58)] sm:p-7"
        role="dialog"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-ember/35 bg-ember/12 text-ember">
          <CloudUpload aria-hidden="true" size={21} strokeWidth={1.9} />
        </span>
        <p className="mt-5 text-xs font-medium uppercase tracking-[0.16em] text-ember">
          Cloud migration
        </p>
        <h2 className="mt-3 text-2xl font-semibold leading-tight sm:text-3xl" id="cloud-migration-title">
          Move this device’s Mystic Lore Studio data to cloud sync?
        </h2>
        <p className="mt-4 text-sm leading-7 text-stardust/66">
          Projects and media will be copied to your private Supabase workspace so
          they can appear on your other signed-in devices. This device’s local
          data will remain available as an offline cache and recovery backup.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label="Projects" value={data.projects.length} />
          <Metric label="Fabrics" value={data.fabrics.length} />
          <Metric label="Tasks" value={data.tasks.length} />
          <Metric label="Images" value={imageCount} />
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button disabled={isMigrating} onClick={onDismiss} variant="ghost">
            Keep Local for Now
          </Button>
          <Button
            disabled={isMigrating}
            icon={
              isMigrating ? (
                <Loader2 aria-hidden="true" className="animate-spin" size={17} />
              ) : (
                <CloudUpload aria-hidden="true" size={17} />
              )
            }
            onClick={onAccept}
            variant="primary"
          >
            {isMigrating ? 'Moving to Cloud...' : 'Move to Cloud Sync'}
          </Button>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-bronze/22 bg-midnight/38 p-3">
      <p className="text-[0.65rem] uppercase tracking-[0.12em] text-stardust/42">{label}</p>
      <p className="mt-2 text-lg font-semibold text-stardust">{value}</p>
    </div>
  );
}
