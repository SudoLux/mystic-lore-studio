import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Download, Eye, Plus, RefreshCw, Sparkles } from 'lucide-react';
import { useEditorialStudio } from '../../hooks/useEditorialStudio';
import { Badge } from '../../components/shared/Badge';
import { Button } from '../../components/shared/Button';
import { CanonicalWorkspaceState } from '../../components/shared/CanonicalWorkspaceState';
import { MobilePageHeader } from '../../components/shared/MobilePageHeader';
import { PageHeader } from '../../components/shared/PageHeader';
import { FieldModePanel } from '../../components/shared/FieldModePanel';
import { GarmentWorkbenchContext, SpecialistWorkbench } from '../../components/shared/SpecialistWorkbench';
import { recordClientEvent } from '../../lib/observability';

export function EditorialStudioPage() {
  const studio = useEditorialStudio();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  useEffect(() => { if (!selectedId && studio.collections[0]) setSelectedId(studio.collections[0].id); }, [selectedId, studio.collections]);
  const selected = studio.collections.find((collection) => collection.id === selectedId) ?? null;
  const scenes = useMemo(() => selected ? (studio.state?.editorialScenes.filter((scene) => scene.collectionId === selected.id) ?? []) : [], [selected, studio.state]);
  const blocks = studio.state?.editorialBlocks ?? [];
  const garment = selected ? studio.state?.garments.find((item) => item.id === selected.primaryGarmentId) : null;
  const create = () => {
    const first = studio.state?.garments[0];
    if (!first) return setNotice('Create a garment before starting an editorial collection.');
    const id = studio.createCollection({ garmentId: first.id, title: `${first.title} story` });
    if (id) setSelectedId(id);
  };
  const exportCollection = async (format: 'pdf' | 'image') => {
    if (!selected) return;
    try { const artifact = await studio.createExport(selected.id, format); setNotice(`${format.toUpperCase()} export committed: ${artifact.checksum.slice(0, 12)}.`); }
    catch (error) { recordClientEvent({ context: { format, surface: 'editorial' }, kind: 'export_failure' }); setNotice(error instanceof Error ? error.message : 'Export could not be committed.'); }
  };
  return <CanonicalWorkspaceState>
    <SpecialistWorkbench className="min-w-0">
      <MobilePageHeader badge="Editorial" kicker="Private story system" title="Editorial Collections" action={<Button aria-label="New editorial collection" className="h-11 w-11 rounded-full p-0" onClick={create}><Plus aria-hidden="true" /></Button>} />
      <PageHeader badge="Editorial" description="Compose private, garment-linked stories from approved studio evidence." title="Editorial Collections"><Button icon={<Plus aria-hidden="true" size={16} />} onClick={create}>New Collection</Button></PageHeader>
      <FieldModePanel captureLabel="Start a new story" description="A shoot-ready capture and next-move view for editorial collection work." moves={[{ detail: `${studio.collections.length} private collection${studio.collections.length === 1 ? '' : 's'} available on this device.`, label: 'Open the current collection', onSelect: () => setSelectedId(selected?.id ?? studio.collections[0]?.id ?? null) }, { detail: 'Refresh approved garment facts before committing an export.', label: 'Refresh story sources', onSelect: () => studio.refreshLiveData() }]} onCapture={create} title="Shoots & story capture" />
      {garment ? <GarmentWorkbenchContext actions={<button className="workbench-quick-action" onClick={studio.refreshLiveData} type="button">Refresh sources</button>} garmentId={garment.id} label="Editorial" /> : null}
      {notice ? <p aria-live="polite" className="mb-4 rounded-xl border border-bronze/35 bg-midnight/70 px-3 py-2 text-sm text-stardust/75">{notice}</p> : null}
      {studio.collections.length ? <div className="grid gap-5 xl:grid-cols-[minmax(16rem,0.8fr)_minmax(0,2fr)]">
        <aside className="rounded-2xl bg-stardust/[0.025] p-3">
          <div className="mb-3 flex items-center justify-between"><span className="text-xs uppercase tracking-[0.16em] text-ember">Library</span><Badge variant="bronze">{studio.collections.length}</Badge></div>
          {studio.collections.length ? <div className="space-y-2">{studio.collections.map((collection) => <button className={`w-full rounded-xl border p-3 text-left ${selected?.id === collection.id ? 'border-ember/60 bg-ember/10' : 'border-bronze/20 bg-black/20'}`} key={collection.id} onClick={() => setSelectedId(collection.id)} type="button"><p className="font-medium text-stardust">{collection.title}</p><p className="mt-1 text-xs text-stardust/55">{studio.state?.garments.find((garment) => garment.id === collection.primaryGarmentId)?.title ?? 'Unlinked garment'} · {collection.status}</p></button>)}</div> : <p className="p-4 text-sm text-stardust/55">No private collections yet.</p>}
        </aside>
        {selected ? <section className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-bronze/30 bg-[linear-gradient(135deg,rgba(27,58,99,.24),rgba(10,10,10,.82))] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-ember">Collection setup</p><h2 className="mt-1 font-display text-3xl text-stardust">{selected.title}</h2><p className="mt-2 text-sm text-stardust/60">Primary garment: {garment?.title ?? 'Missing'} · {scenes.length} scenes · drafts remain private.</p></div><Badge variant={selected.status === 'published' ? 'teal' : 'bronze'}>{selected.status}</Badge></div><div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => studio.addScene(selected.id)} size="sm" icon={<Plus aria-hidden="true" size={14} />}>Add scene</Button><Button onClick={studio.refreshLiveData} size="sm" variant="secondary" icon={<RefreshCw aria-hidden="true" size={14} />}>Refresh sources</Button><Button onClick={() => studio.setPublishState(selected.id, 'approved')} size="sm" variant="secondary">Approve</Button><Button disabled={selected.status !== 'approved'} onClick={() => studio.setPublishState(selected.id, 'published')} size="sm" variant="secondary">Publish state</Button></div></div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(14rem,.8fr)]"><section className="rounded-2xl border border-bronze/25 bg-midnight/65 p-4"><div className="mb-3 flex items-center justify-between"><div><p className="text-xs uppercase tracking-[.16em] text-ember">Scene builder</p><p className="text-sm text-stardust/55">Keyboard-friendly ordering controls preserve scene identity.</p></div></div>{scenes.length ? <ol className="space-y-3">{scenes.map((scene, index) => <li className="rounded-xl border border-bronze/20 bg-black/25 p-3" key={scene.id}><div className="flex items-start justify-between gap-2"><div><p className="font-medium text-stardust">{index + 1}. {scene.title}</p><p className="mt-1 text-xs text-stardust/55">{scene.sceneType} · {blocks.filter((block) => block.sceneId === scene.id).length} blocks</p></div><div className="flex gap-1"><Button aria-label={`Move ${scene.title} up`} disabled={index === 0} onClick={() => studio.reorderScene(selected.id, scene.id, 'up')} size="sm" variant="ghost"><ArrowUp size={15} /></Button><Button aria-label={`Move ${scene.title} down`} disabled={index === scenes.length - 1} onClick={() => studio.reorderScene(selected.id, scene.id, 'down')} size="sm" variant="ghost"><ArrowDown size={15} /></Button></div></div><div className="mt-3 flex flex-wrap gap-2"><Button onClick={() => studio.addBlock(scene.id, 'paragraph', { text: 'Editable story copy.' })} size="sm" variant="secondary">Add copy</Button><Button disabled={!garment} onClick={() => garment && studio.addStoryFromSystem({ entityId: null, fieldPath: 'title', garmentId: garment.id, sceneId: scene.id, source: 'garment', versionId: null })} size="sm" variant="secondary" icon={<Sparkles aria-hidden="true" size={13} />}>Story from System</Button></div>{blocks.filter((block) => block.sceneId === scene.id).map((block) => <p className="mt-2 rounded-lg bg-stardust/[.04] px-2 py-1 text-xs text-stardust/65" key={block.id}>{block.blockType}{block.liveSource ? ` · ${block.liveSource} · ${block.staleness === 'current' ? 'Current' : 'Stale'}` : ''}</p>)}</li>)}</ol> : <p className="rounded-xl border border-dashed border-bronze/25 p-6 text-sm text-stardust/55">Add the first scene to begin the private editorial sequence.</p>}</section>
          <aside className="rounded-2xl border border-bronze/25 bg-midnight/65 p-4"><p className="text-xs uppercase tracking-[.16em] text-ember">Viewer / export</p><div className="mt-3 aspect-[3/4] rounded-xl border border-bronze/20 bg-[radial-gradient(circle_at_top,rgba(200,155,60,.19),transparent_44%),#090909] p-4"><Eye aria-hidden="true" className="text-ember" size={18} /><p className="mt-16 font-display text-2xl text-stardust">{selected.title}</p><p className="mt-2 text-xs text-stardust/55">Private preview. Approved source facts are checked before each export.</p></div><div className="mt-3 grid gap-2"><Button disabled={selected.status !== 'approved'} onClick={() => void exportCollection('pdf')} size="sm" icon={<Download aria-hidden="true" size={14} />}>Commit PDF export</Button><Button disabled={selected.status !== 'approved'} onClick={() => void exportCollection('image')} size="sm" variant="secondary">Commit image export</Button></div></aside></div>
        </section> : <section className="rounded-2xl border border-dashed border-bronze/30 p-8 text-center text-stardust/60">Select or create a collection.</section>}
      </div> : <section className="atelier-empty-state flex min-h-[28rem] flex-col items-center justify-center"><Sparkles aria-hidden="true" className="text-ember/62" size={36} /><p className="mt-5 text-[0.65rem] uppercase tracking-[0.2em] text-ember/72">Private story studio</p><h2 className="font-display mt-3 text-3xl text-stardust sm:text-4xl">Begin with the garment’s story</h2><p className="mt-4 max-w-xl text-sm leading-7 text-stardust/52">Bring approved garment imagery, material details, and creative direction into a private editorial sequence you can shape scene by scene.</p><Button className="mt-7" icon={<Plus aria-hidden="true" size={16} />} onClick={create} variant="primary">Create first collection</Button></section>}
    </SpecialistWorkbench>
  </CanonicalWorkspaceState>;
}
