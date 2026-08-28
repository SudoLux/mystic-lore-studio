import { Cloud, Download, RefreshCcw, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { ObservabilityPanel } from '../../components/settings/ObservabilityPanel';
import { Badge } from '../../components/shared/Badge';
import { Button } from '../../components/shared/Button';
import { Card } from '../../components/shared/Card';
import { MobilePageHeader } from '../../components/shared/MobilePageHeader';
import { PageHeader } from '../../components/shared/PageHeader';
import { canonicalStateChecksum, loadCanonicalStoredBlob } from '../../domains/persistence';
import { useCanonicalWorkspace } from '../../hooks/useCanonicalWorkspace';

export function SettingsPage() {
  const { error, pendingCount, persistenceMode, refresh, state, syncState } = useCanonicalWorkspace();
  const [message, setMessage] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  if (!state) return null;

  const exportRecoverySnapshot = async () => {
    setWorking(true);
    try {
      const exportedAt = new Date().toISOString();
      const checksum = await canonicalStateChecksum(state);
      const { default: JSZip } = await import('jszip');
      const archive = new JSZip();
      const media = [...state.mediaAssets.map((asset) => ({
        checksum: asset.checksum, id: asset.id, mimeType: asset.mimeType,
        name: asset.name, storagePath: asset.storagePath,
      })), ...state.mediaDerivatives.map((asset) => ({
        checksum: asset.checksum, id: asset.id, mimeType: asset.mimeType,
        name: `${asset.variant}-${asset.id}`, storagePath: asset.storagePath,
      }))];
      const manifest = [] as Array<{ checksum: string; id: string; mimeType: string; path: string; storagePath: string }>;
      for (const item of media) {
        const blob = await loadCanonicalStoredBlob(item);
        if (!blob) throw new Error(`Recovery export is missing media bytes for ${item.name}.`);
        const path = `media/${item.id}`;
        archive.file(path, blob);
        manifest.push({ checksum: item.checksum, id: item.id, mimeType: item.mimeType, path, storagePath: item.storagePath });
      }
      archive.file('workspace.json', JSON.stringify({ checksum, exportedAt, format: 'ml-canonical-recovery-v2', state }, null, 2));
      archive.file('manifest.json', JSON.stringify({ exportedAt, format: 'ml-canonical-media-manifest-v1', media: manifest, studioId: state.studioId, workspaceChecksum: checksum }, null, 2));
      const url = URL.createObjectURL(await archive.generateAsync({ compression: 'DEFLATE', compressionOptions: { level: 6 }, type: 'blob' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `mystic-lore-canonical-recovery-${exportedAt.replace(/[:.]/g, '-')}.mlstudio.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage(`Recovery bundle exported with ${manifest.length} verified media objects and checksum ${checksum.slice(0, 12)}…`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'The canonical recovery bundle could not be exported.');
    } finally {
      setWorking(false);
    }
  };

  const refreshCloud = async () => {
    setWorking(true);
    setMessage(null);
    try {
      await refresh();
      setMessage('The workspace was refreshed from the canonical repository.');
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'The canonical workspace could not be refreshed.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <section className="space-y-5">
      <MobilePageHeader badge="Settings" kicker="Cloud authority and recovery" title="Studio Controls" />
      <PageHeader badge="Settings" description="Canonical repository status, explicit refresh, recovery export, and privacy-safe diagnostics." title="Settings" />

      <div className="grid gap-4 md:grid-cols-3">
        <StatusCard label="Authority" status={modeLabel(persistenceMode)} text={modeDescription(persistenceMode)} />
        <StatusCard label="Outbox" status={`${pendingCount} pending`} text={pendingCount ? 'Queued edits will replay in dependency order. Protected actions remain paused.' : 'The local outbox is empty.'} />
        <StatusCard label="Canonical graph" status={`${state.garments.length} garments`} text={`${state.mediaAssets.length} assets, ${state.releaseTasks.length} tasks, ${state.editorialCollections.length} editorials, and ${state.publications.length} publication records.`} />
      </div>

      <Card className="border-teal/28 bg-[linear-gradient(135deg,rgba(45,92,107,.2),rgba(10,10,10,.68))]" elevated>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge variant={syncState === 'ready' && pendingCount === 0 ? 'teal' : 'ember'}>Canonical sync</Badge>
            <h2 className="mt-4 text-xl font-semibold text-stardust">{syncHeading(syncState, pendingCount)}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stardust/62">{error ?? 'Supabase is the shared record in cloud mode. IndexedDB holds only a cache, queued operations, staged media, and preserved recovery evidence.'}</p>
          </div>
          <Button disabled={working} icon={<RefreshCcw aria-hidden="true" size={16} />} onClick={() => void refreshCloud()} variant="primary">Refresh from cloud</Button>
        </div>
      </Card>

      <Card>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-3"><ShieldCheck aria-hidden="true" className="text-teal" size={21} /><h2 className="text-lg font-semibold">Recovery boundary</h2></div>
            <p className="mt-3 text-sm leading-6 text-stardust/62">Legacy browser data is available only to migration and emergency-recovery tooling. Import and reset controls are intentionally absent from normal authenticated routing, so a stale browser cannot replace canonical cloud authority.</p>
            <p className="mt-3 text-xs leading-5 text-stardust/45">Recovery snapshots contain private Studio data. Store them securely and delete them under the 30-day beta retention policy.</p>
          </div>
          <Button disabled={working} icon={<Download aria-hidden="true" size={16} />} onClick={() => void exportRecoverySnapshot()} variant="secondary">Export recovery snapshot</Button>
        </div>
      </Card>

      {message ? <p aria-live="polite" className="rounded-xl border border-bronze/28 bg-midnight/40 p-4 text-sm text-stardust/70">{message}</p> : null}
      <ObservabilityPanel />

      <Card className="border-bronze/22">
        <div className="flex items-start gap-3"><Cloud aria-hidden="true" className="mt-0.5 text-ember" size={19} /><div><h2 className="font-semibold">Rollout rule</h2><p className="mt-2 text-sm leading-6 text-stardust/58">Mode is Studio-wide and stored in the canonical version policy. Shadow compares complete normalized graphs; cloud mode may be enabled only after exact parity and an empty outbox. This screen does not permit a browser to flip authority.</p></div></div>
      </Card>
    </section>
  );
}

function StatusCard({ label, status, text }: { label: string; status: string; text: string }) {
  return <Card><p className="text-xs font-medium uppercase tracking-[.14em] text-ember">{label}</p><p className="mt-3 text-lg font-semibold text-stardust">{status}</p><p className="mt-2 text-sm leading-6 text-stardust/52">{text}</p></Card>;
}

function modeLabel(mode: 'cloud' | 'local-recovery' | 'shadow') {
  return mode === 'cloud' ? 'Cloud authority' : mode === 'shadow' ? 'Shadow verification' : 'Recovery-only';
}

function modeDescription(mode: 'cloud' | 'local-recovery' | 'shadow') {
  if (mode === 'cloud') return 'Supabase is authoritative; this device is cache and outbox only.';
  if (mode === 'shadow') return 'Optimistic UI results persist to Supabase and are compared before cutover.';
  return 'No writable canonical cloud is available; protected evidence is disabled.';
}

function syncHeading(syncState: 'loading' | 'ready' | 'offline' | 'conflict' | 'error', pendingCount: number) {
  if (syncState === 'offline') return 'Offline edits are retained for replay.';
  if (syncState === 'conflict') return 'Designer review is required.';
  if (syncState === 'error') return 'Canonical sync needs attention.';
  if (syncState === 'loading') return 'Loading the canonical repository…';
  return pendingCount ? 'The outbox is waiting to converge.' : 'This device matches the canonical repository.';
}
