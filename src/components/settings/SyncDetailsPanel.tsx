import {
  AlertTriangle,
  Check,
  CloudOff,
  Download,
  Loader2,
  Pause,
  RefreshCw,
  X,
} from 'lucide-react';
import type { SyncProgress } from '../../hooks/useStudioData';
import type { SyncPhase, SyncStatus } from '../../lib/studioSyncStorage';
import { Button } from '../shared/Button';

const phaseLabels: Record<SyncPhase, string> = {
  idle: 'Waiting',
  validating: 'Validating cloud setup',
  preparing: 'Preparing local records',
  'uploading-images': 'Uploading optimized images',
  'saving-records': 'Saving studio records',
  verifying: 'Verifying cloud data',
};

export function SyncDetailsPanel({
  error,
  failedCount,
  isOpen,
  lastSyncedAt,
  onCancel,
  onClose,
  onExport,
  onRetry,
  pendingCount,
  phase,
  progress,
  status,
}: {
  error: string | null;
  failedCount: number;
  isOpen: boolean;
  lastSyncedAt: string | null;
  onCancel: () => void;
  onClose: () => void;
  onExport: () => void;
  onRetry: () => void;
  pendingCount: number;
  phase: SyncPhase;
  progress: SyncProgress;
  status: SyncStatus;
}) {
  if (!isOpen) return null;

  const percent = progress.total
    ? Math.min(100, Math.round((progress.completed / progress.total) * 100))
    : status === 'synced'
      ? 100
      : 0;

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-midnight/78 px-3 pt-8 backdrop-blur-lg sm:items-center sm:p-5">
      <section
        aria-labelledby="sync-details-title"
        aria-modal="true"
        className="max-h-[88dvh] w-full max-w-xl overflow-y-auto rounded-t-[1.75rem] border border-bronze/34 bg-[linear-gradient(145deg,rgba(27,58,99,0.38),rgba(10,10,10,0.99),rgba(61,43,31,0.72))] p-5 text-stardust shadow-[0_30px_100px_rgba(0,0,0,0.62)] sm:rounded-[1.75rem] sm:p-6"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <StatusIcon status={status} />
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-ember">
                Cloud Sync
              </p>
              <h2 className="mt-1 text-xl font-semibold" id="sync-details-title">
                {statusTitle(status)}
              </h2>
            </div>
          </div>
          <button
            aria-label="Close sync details"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-bronze/28 bg-midnight/48 text-stardust/68 transition hover:border-ember/45 hover:text-stardust"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-ember/38 bg-ember/10 p-4">
            <div className="flex gap-3">
              <AlertTriangle
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-ember"
                size={18}
              />
              <p className="text-sm leading-6 text-stardust/82">{error}</p>
            </div>
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Metric label="Pending" value={pendingCount} />
          <Metric label="Failed" value={failedCount} />
        </div>

        <div className="mt-5 rounded-2xl border border-bronze/24 bg-midnight/38 p-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-stardust/62">{phaseLabels[phase]}</span>
            <span className="font-medium text-ember">
              {progress.total ? `${progress.completed}/${progress.total}` : `${percent}%`}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-midnight/80">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#C89B3C,#2D5C6B,#EDE3CF)] transition-[width] duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-3 text-xs leading-5 text-stardust/48">
            {lastSyncedAt
              ? `Last successful sync ${formatTime(lastSyncedAt)}.`
              : 'No successful cloud sync has completed on this device yet.'}
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button
            icon={<Download aria-hidden="true" size={16} />}
            onClick={onExport}
            variant="ghost"
          >
            Export Backup
          </Button>
          {status === 'syncing' ? (
            <Button
              icon={<Pause aria-hidden="true" size={16} />}
              onClick={onCancel}
              variant="secondary"
            >
              Pause Sync
            </Button>
          ) : null}
          <Button
            icon={<RefreshCw aria-hidden="true" size={16} />}
            onClick={onRetry}
            variant="primary"
          >
            Retry Sync
          </Button>
        </div>
      </section>
    </div>
  );
}

export function SyncProgressToast({
  onOpen,
  pendingCount,
  phase,
  progress,
}: {
  onOpen: () => void;
  pendingCount: number;
  phase: SyncPhase;
  progress: SyncProgress;
}) {
  const percent = progress.total
    ? Math.min(100, Math.round((progress.completed / progress.total) * 100))
    : 0;

  return (
    <button
      className="fixed bottom-[5.75rem] left-3 right-3 z-[80] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-ember/38 bg-midnight/92 p-3 text-left text-stardust shadow-[0_22px_64px_rgba(0,0,0,0.5)] backdrop-blur-xl md:bottom-5 md:left-auto md:right-5 md:w-[22rem]"
      onClick={onOpen}
      type="button"
    >
      <Loader2 aria-hidden="true" className="shrink-0 animate-spin text-ember" size={19} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="truncate font-medium">{phaseLabels[phase]}</span>
          <span className="shrink-0 text-ember">
            {progress.total ? `${progress.completed}/${progress.total}` : pendingCount}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stardust/10">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#C89B3C,#2D5C6B)] transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </button>
  );
}

function StatusIcon({ status }: { status: SyncStatus }) {
  const Icon =
    status === 'synced'
      ? Check
      : status === 'offline'
        ? CloudOff
        : status === 'syncing'
          ? Loader2
          : AlertTriangle;

  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-ember/36 bg-ember/10 text-ember">
      <Icon
        aria-hidden="true"
        className={status === 'syncing' ? 'animate-spin' : undefined}
        size={20}
      />
    </span>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-bronze/22 bg-midnight/38 p-3">
      <p className="text-[0.65rem] uppercase tracking-[0.12em] text-stardust/44">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function statusTitle(status: SyncStatus) {
  if (status === 'synced') return 'Studio data is synced';
  if (status === 'syncing') return 'Cloud sync is working';
  if (status === 'offline') return 'Changes are safely queued';
  return 'Cloud sync needs attention';
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
