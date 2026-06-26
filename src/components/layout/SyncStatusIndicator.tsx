import { AlertTriangle, Check, CloudOff, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/classes';
import type { SyncStatus } from '../../lib/studioSyncStorage';

export function SyncStatusIndicator({
  className,
  error,
  onOpen,
  pendingCount,
  status,
  warning,
}: {
  className?: string;
  error?: string | null;
  onOpen: () => void;
  pendingCount: number;
  status: SyncStatus;
  warning?: string | null;
}) {
  const config = status === 'synced' && warning
    ? { icon: AlertTriangle, label: 'Synced · Cache', tone: 'text-ember' }
    : ({
    error: { icon: AlertTriangle, label: 'Sync error', tone: 'text-ember' },
    offline: { icon: CloudOff, label: 'Offline / local only', tone: 'text-stardust/58' },
    synced: { icon: Check, label: 'Synced', tone: 'text-teal' },
    syncing: { icon: RefreshCw, label: 'Syncing', tone: 'text-ember' },
  }[status]);
  const Icon = config.icon;

  return (
    <button
      className={cn(
        'inline-flex min-h-10 items-center gap-2 rounded-xl border border-bronze/24 bg-midnight/38 px-2.5 text-xs font-medium transition hover:border-ember/38 hover:bg-stardust/[0.06] sm:min-h-9 sm:px-3',
        config.tone,
        className,
      )}
      onClick={onOpen}
      title={error ?? warning ?? 'Open cloud sync details'}
      type="button"
    >
      <Icon
        aria-hidden="true"
        className={status === 'syncing' ? 'animate-spin' : undefined}
        size={14}
        strokeWidth={1.9}
      />
      <span className="hidden sm:inline">{config.label}</span>
      {pendingCount > 0 ? (
        <span className="rounded-full border border-bronze/25 bg-ember/12 px-1.5 py-0.5 text-[0.65rem] text-ember">
          {pendingCount}
        </span>
      ) : null}
    </button>
  );
}
