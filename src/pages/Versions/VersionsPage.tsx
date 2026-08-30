import { Archive, Camera, ChevronRight, Download, GitCompareArrows, LockKeyhole, RotateCcw, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ConflictResolver } from '../../components/versioning/ConflictResolver';
import { DiffViewer } from '../../components/versioning/DiffViewer';
import { FreezeFrameDialog } from '../../components/versioning/FreezeFrameDialog';
import { ReleaseGate } from '../../components/versioning/ReleaseGate';
import { RestorePreview } from '../../components/versioning/RestorePreview';
import { Badge } from '../../components/shared/Badge';
import { Button } from '../../components/shared/Button';
import { CanonicalWorkspaceState } from '../../components/shared/CanonicalWorkspaceState';
import { Card } from '../../components/shared/Card';
import { MobilePageHeader } from '../../components/shared/MobilePageHeader';
import { PageHeader } from '../../components/shared/PageHeader';
import { GarmentWorkbenchContext, SpecialistWorkbench } from '../../components/shared/SpecialistWorkbench';
import type { RestorePreviewResult } from '../../domains/versioning';
import { useCanonicalWorkspace } from '../../hooks/useCanonicalWorkspace';
import { useVersioningStudio } from '../../hooks/useVersioningStudio';

export function VersionsPage() { return <CanonicalWorkspaceState><VersionsWorkspace /></CanonicalWorkspaceState>; }

function VersionsWorkspace() {
  const { state: workspace } = useCanonicalWorkspace();
  const [garmentId, setGarmentId] = useState(workspace?.garments[0]?.id ?? null);
  const studio = useVersioningStudio(garmentId);
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('working');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [frameOpen, setFrameOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState<RestorePreviewResult | null>(null);
  const [reason, setReason] = useState('');
  const [previewRevision, setPreviewRevision] = useState<number | null>(null);
  const garment = workspace?.garments.find((item) => item.id === garmentId) ?? null;
  useEffect(() => { setSourceId(studio.versions[0]?.id ?? ''); setTargetId('working'); setSelectedKeys([]); setPreview(null); }, [garmentId, studio.versions.length]);
  const diffs = useMemo(() => sourceId ? studio.compare(sourceId, targetId === 'working' ? null : targetId) : [], [sourceId, targetId, studio.state]);
  useEffect(() => { setSelectedKeys([]); setPreview(null); }, [sourceId, targetId]);
  const createFrame = async (input: { label: string; notes: string; scope: Parameters<typeof studio.createFrame>[0]['scope'] }) => {
    if (!garment) return;
    setBusy(true);
    try { const result = await studio.createFrame({ ...input, expectedRevision: garment.revision }); setSourceId(result.version.id); setNotice(`Freeze Frame “${result.version.label}” captured with checksum ${result.version.checksum.slice(0, 12)}.`); }
    finally { setBusy(false); }
  };
  const prepareRestore = async () => {
    if (!garment || !sourceId || !selectedKeys.length) return;
    setBusy(true); setNotice('');
    try { const result = await studio.preview(sourceId, studio.versions.find((item) => item.id === sourceId)?.scope ?? 'all', selectedKeys); setPreview(result); setPreviewRevision(garment.revision); }
    catch (error) { setNotice(message(error)); }
    finally { setBusy(false); }
  };
  const commit = async () => {
    if (!garment || !sourceId || !preview || previewRevision == null) return;
    setBusy(true);
    try { const result = await studio.restore({ expectedRevision: previewRevision, previewChecksum: preview.previewChecksum, reason, scope: studio.versions.find((item) => item.id === sourceId)?.scope ?? 'all', selectedKeys, sourceVersionId: sourceId }); setPreview(null); setSelectedKeys([]); setReason(''); setSourceId(result.version.id); setNotice(`Restore committed as ${result.version.label}; earlier versions and pinned artifacts were preserved.`); }
    catch (error) { setNotice(message(error)); }
    finally { setBusy(false); }
  };
  const exportDiff = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), garmentId, sourceId, targetId, diffs }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${garment?.garmentCode ?? 'garment'}-structural-diff.json`; anchor.click(); URL.revokeObjectURL(url);
  };
  if (!workspace || !garment) return <Card><h1 className="font-display text-3xl">Versions need a garment</h1><p className="mt-2 text-sm text-stardust/58">Create a garment before capturing a Freeze Frame.</p></Card>;
  return <SpecialistWorkbench>
    <MobilePageHeader badge="Versions" kicker="Freeze Frames, comparison, and scoped restore" title="Change history" />
    <PageHeader badge="Change history" description="Compare earlier garment decisions, understand what changed, and bring selected details forward without losing any later work." title="Versions & Changes"><Button icon={<Camera size={16} />} onClick={() => setFrameOpen(true)} variant="primary">New Freeze Frame</Button></PageHeader>
    <GarmentWorkbenchContext actions={<a className="workbench-quick-action" href={`#/technical/${garment.id}`}>Technical</a>} garmentId={garment.id} label="Versions" />
    {notice ? <div aria-live="polite" className="rounded-xl border border-bronze/28 bg-espresso/35 p-3 text-sm text-stardust/72">{notice}</div> : null}
    <div className="grid min-w-0 gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="min-w-0 space-y-4"><Card><label className="block min-w-0"><span className="field-label">Garment</span><select className="field min-w-0 max-w-full" onChange={(event) => setGarmentId(event.target.value)} value={garmentId ?? ''}>{workspace.garments.map((item) => <option key={item.id} value={item.id}>{item.garmentCode} · {item.title}</option>)}</select></label><div className="mt-4 flex items-center justify-between"><span className="text-sm text-stardust/52">Working revision</span><Badge variant="teal">r{garment.revision}</Badge></div></Card>
        <Card><div className="flex items-center gap-2"><Archive size={16} /><h2 className="font-display text-xl">Timeline</h2></div>{studio.versions.length ? <ol className="relative mt-4 space-y-2 before:absolute before:bottom-4 before:left-[0.68rem] before:top-4 before:w-px before:bg-bronze/28">{studio.versions.map((version, index) => <li key={version.id}><button aria-current={sourceId === version.id ? 'true' : undefined} className={sourceId === version.id ? 'relative w-full rounded-xl border border-ember/45 bg-ember/10 p-3 text-left' : 'relative w-full rounded-xl border border-transparent p-3 text-left hover:border-bronze/25 hover:bg-stardust/5'} onClick={() => setSourceId(version.id)} type="button"><span className={sourceId === version.id ? 'absolute left-2 top-4 h-2.5 w-2.5 rounded-full bg-ember' : 'absolute left-2 top-4 h-2.5 w-2.5 rounded-full bg-bronze'} /><span className="block pl-5 text-sm font-semibold">{version.label}</span><span className="mt-1 block pl-5 text-xs text-stardust/40">v{version.versionNo} · {version.scope} · {formatDate(version.createdAt)}</span><span className="mt-2 flex items-center gap-1 pl-5 text-[0.68rem] text-stardust/35">{version.kind === 'release' ? <LockKeyhole size={11} /> : index === 0 ? <ShieldCheck size={11} /> : null}{version.checksum.slice(0, 10)}</span></button></li>)}</ol> : <div className="py-8 text-center"><Camera className="mx-auto text-stardust/25" /><p className="mt-3 text-sm text-stardust/50">No Freeze Frames yet.</p><Button className="mt-4" onClick={() => setFrameOpen(true)} size="sm">Capture the first</Button></div>}</Card>
      </aside>
      <main className="min-w-0 space-y-5">
        <ConflictResolver conflicts={studio.conflicts} onResolve={studio.resolve} />
        <Card><div className="flex min-w-0 flex-wrap items-center gap-3"><GitCompareArrows className="hidden shrink-0 text-ember sm:block" size={20} /><div className="min-w-0 basis-full sm:min-w-[14rem] sm:flex-1"><label className="block min-w-0"><span className="field-label">Version A</span><select className="field min-w-0 max-w-full" disabled={!studio.versions.length} onChange={(event) => setSourceId(event.target.value)} value={sourceId}>{studio.versions.map((version) => <option key={version.id} value={version.id}>v{version.versionNo} · {version.label}</option>)}</select></label></div><ChevronRight className="hidden shrink-0 text-stardust/28 sm:block" /><div className="min-w-0 basis-full sm:min-w-[14rem] sm:flex-1"><label className="block min-w-0"><span className="field-label">Version B</span><select className="field min-w-0 max-w-full" disabled={!sourceId} onChange={(event) => setTargetId(event.target.value)} value={targetId}><option value="working">Current working state · r{garment.revision}</option>{studio.versions.filter((version) => version.id !== sourceId).map((version) => <option key={version.id} value={version.id}>v{version.versionNo} · {version.label}</option>)}</select></label></div></div></Card>
        <Card><div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.14em] text-ember">Comparison</p><h2 className="font-display mt-2 text-2xl">What changed</h2></div><div className="flex gap-2"><Button disabled={!diffs.length} icon={<Download size={15} />} onClick={exportDiff} size="sm">Export changes</Button><Button disabled={!selectedKeys.length || busy || studio.conflicts.length > 0 || targetId !== 'working'} icon={<RotateCcw size={15} />} onClick={() => void prepareRestore()} size="sm" variant="primary">Preview restore</Button></div></div><DiffViewer diffs={diffs} selectedKeys={selectedKeys} setSelectedKeys={setSelectedKeys} /></Card>
        {preview ? <RestorePreview busy={busy} onCancel={() => setPreview(null)} onCommit={() => void commit()} preview={preview} reason={reason} setReason={setReason} /> : null}
        <div className="grid gap-4 md:grid-cols-2"><ReleaseGate conflicts={studio.conflicts.length} currentRevision={garment.revision} expectedRevision={previewRevision ?? garment.revision} online={navigator.onLine !== false} /><Card><p className="text-xs uppercase tracking-[0.14em] text-ember">Release protection</p><h2 className="font-display mt-2 text-2xl">Pin production evidence</h2><p className="mt-2 text-sm leading-6 text-stardust/58">Create a validated technical release from the current server revision. Release frames, exports, orders, and publications remain immutable.</p><a className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-bronze/40 px-4 text-sm hover:border-ember" href={`#/technical/${garment.id}`}>Open Technical Studio</a></Card></div>
      </main>
    </div>
    <FreezeFrameDialog busy={busy} onClose={() => setFrameOpen(false)} onCreate={createFrame} open={frameOpen} />
  </SpecialistWorkbench>;
}

function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date); }
function message(error: unknown) { return error instanceof Error ? error.message : 'The versioning action could not be completed.'; }
