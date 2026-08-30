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
      setMessage(`Recovery copy ready with ${manifest.length} verified images and files.`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'The recovery copy could not be exported.');
    } finally {
      setWorking(false);
    }
  };

  const refreshCloud = async () => {
    setWorking(true);
    setMessage(null);
    try {
      await refresh();
      setMessage('Your Studio is up to date.');
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Your Studio could not be refreshed.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <section className="space-y-5">
      <MobilePageHeader badge="Settings" kicker="Sync, privacy, and recovery" title="Studio Settings" />
      <PageHeader badge="Settings" description="Keep your Studio current, protect your work, and access advanced recovery tools when you need them." title="Studio Settings" />

      <div className="grid gap-4 md:grid-cols-3">
        <StatusCard label="Workspace" status={modeLabel(persistenceMode)} text={modeDescription(persistenceMode)} />
        <StatusCard label="Waiting to sync" status={`${pendingCount} change${pendingCount === 1 ? '' : 's'}`} text={pendingCount ? 'Your queued edits will continue when a connection is available.' : 'Everything from this device is saved.'} />
        <StatusCard label="Studio library" status={`${state.garments.length} garment${state.garments.length === 1 ? '' : 's'}`} text={`${state.mediaAssets.length} images and files · ${state.releaseTasks.length} tasks · ${state.editorialCollections.length} stories.`} />
      </div>

      <Card className="border-teal/28 bg-[linear-gradient(135deg,rgba(45,92,107,.2),rgba(10,10,10,.68))]" elevated>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge variant={syncState === 'ready' && pendingCount === 0 ? 'teal' : 'ember'}>Cloud status</Badge>
            <h2 className="mt-4 text-xl font-semibold text-stardust">{syncHeading(syncState, pendingCount)}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stardust/62">{error ?? 'Your garments, imagery, and Studio decisions are safely shared across your signed-in devices.'}</p>
          </div>
          <Button disabled={working} icon={<RefreshCcw aria-hidden="true" size={16} />} onClick={() => void refreshCloud()} variant="primary">Refresh Studio</Button>
        </div>
      </Card>

      <Card>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-3"><ShieldCheck aria-hidden="true" className="text-teal" size={21} /><h2 className="text-lg font-semibold">Private recovery copy</h2></div>
            <p className="mt-3 text-sm leading-6 text-stardust/62">Download a private copy of your Studio data and media for safekeeping.</p>
            <p className="mt-3 text-xs leading-5 text-stardust/45">This file contains private Studio work. Store it securely and remove old beta copies after 30 days.</p>
          </div>
          <Button disabled={working} icon={<Download aria-hidden="true" size={16} />} onClick={() => void exportRecoverySnapshot()} variant="secondary">Download recovery copy</Button>
        </div>
      </Card>

      {message ? <p aria-live="polite" className="rounded-xl border border-bronze/28 bg-midnight/40 p-4 text-sm text-stardust/70">{message}</p> : null}
      <details className="atelier-disclosure">
        <summary>Advanced reliability details</summary>
        <div className="mt-4 space-y-4">
          <ObservabilityPanel />
          <Card className="border-bronze/22">
            <div className="flex items-start gap-3"><Cloud aria-hidden="true" className="mt-0.5 text-ember" size={19} /><div><h2 className="font-semibold">Workspace protection</h2><p className="mt-2 text-sm leading-6 text-stardust/58">The shared workspace mode applies to the whole Studio. Verification must finish and all queued changes must be saved before cloud authority can change. A browser cannot change this safety setting.</p></div></div>
          </Card>
        </div>
      </details>
    </section>
  );
}

function StatusCard({ label, status, text }: { label: string; status: string; text: string }) {
  return <Card><p className="text-xs font-medium uppercase tracking-[.14em] text-ember">{label}</p><p className="mt-3 text-lg font-semibold text-stardust">{status}</p><p className="mt-2 text-sm leading-6 text-stardust/52">{text}</p></Card>;
}

function modeLabel(mode: 'cloud' | 'local-recovery' | 'shadow') {
  return mode === 'cloud' ? 'Shared and current' : mode === 'shadow' ? 'Verification in progress' : 'Recovery mode';
}

function modeDescription(mode: 'cloud' | 'local-recovery' | 'shadow') {
  if (mode === 'cloud') return 'This device is connected to your shared Studio.';
  if (mode === 'shadow') return 'Local and shared results are being compared before the switch.';
  return 'The Studio is available for recovery inspection only.';
}

function syncHeading(syncState: 'loading' | 'ready' | 'offline' | 'conflict' | 'error', pendingCount: number) {
  if (syncState === 'offline') return 'Your offline edits are safe.';
  if (syncState === 'conflict') return 'A recent edit needs your review.';
  if (syncState === 'error') return 'Cloud sync needs attention.';
  if (syncState === 'loading') return 'Checking your shared Studio…';
  return pendingCount ? 'Your latest changes are waiting to sync.' : 'Everything is up to date.';
}
