import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, Check, Eye, EyeOff, Globe2, LoaderCircle, Plus } from 'lucide-react';
import { useCanonicalWorkspace } from '../../hooks/useCanonicalWorkspace';
import {
  buildPublicCutPreview,
  buildFreshPublicCutPreview,
  commitPublicCutToSupabase,
  createPortfolioProfile,
  createTechnicalExcerpt,
  movePortfolioItem,
  publicationHistory,
  publishPublicCut,
  selectPortfolioEditorial,
  selectPortfolioProject,
  unpublishPublicCutFromSupabase,
  updatePortfolioEditorial,
  updatePortfolioProfile,
  updatePortfolioProject,
  type PublicCutPreview as Preview,
} from '../../domains/portfolio';
import type { CanonicalEditorialScene, CanonicalMediaAsset, CanonicalPortfolioEditorial, CanonicalPortfolioProject, CanonicalPortfolioTechnicalExcerpt } from '../../domains/workspace';
import { PublicCutPreview } from './PublicCutPreview';
import { recordClientEvent } from '../../lib/observability';
import { GarmentWorkbenchContext, SpecialistWorkbench, WorkbenchTabs } from '../../components/shared/SpecialistWorkbench';

type Tab = 'projects' | 'editorials' | 'profile' | 'publish';

export function PortfolioStudioPage() {
  const { commitWorkspace, currentActorId, persistenceMode, refresh, state, syncState } = useCanonicalWorkspace();
  const [tab, setTab] = useState<Tab>('projects');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const profile = state?.portfolioProfiles[0];
  const initialGarmentId = state?.portfolioProjects[0]?.garmentId ?? state?.garments[0]?.id ?? null;

  useEffect(() => {
    let active = true;
    if (!state || !profile) return;
    const loadPreview = persistenceMode === 'local-recovery'
      ? buildPublicCutPreview(state, profile.id)
      : buildFreshPublicCutPreview(state.studioId, profile.id);
    void loadPreview
      .then((result) => { if (active) setPreview(result); })
      .catch((reason) => {
        if (!active) return;
        setPreview(null);
        setMessage(reason instanceof Error ? reason.message : 'The exact public preview could not be loaded.');
      });
    return () => { active = false; };
  }, [persistenceMode, profile, state]);

  const history = useMemo(() => state && profile ? publicationHistory(state, profile.id) : [], [profile, state]);
  if (!state) return <LoadingState />;
  if (!profile) return <PortfolioSetup garmentId={initialGarmentId} onCreate={() => commitWorkspace((currentState) => createPortfolioProfile(currentState).state)} />;
  const selectedIds = new Set(state.portfolioProjects.filter((item) => item.profileId === profile.id).map((item) => item.garmentId));
  const selectedEditorialIds = new Set(state.portfolioEditorials.filter((item) => item.profileId === profile.id).map((item) => item.collectionId));
  const selectedProjects = state.portfolioProjects.filter((item) => item.profileId === profile.id).sort((a, b) => a.sortOrder - b.sortOrder);
  const selectedEditorials = state.portfolioEditorials.filter((item) => item.profileId === profile.id).sort((a, b) => a.sortOrder - b.sortOrder);
  const focusedGarmentId = selectedProjects[0]?.garmentId ?? state.garments[0]?.id ?? null;
  const current = history.find((item) => item.isCurrent && item.publicationType === 'profile');
  const canPublish = Boolean(preview && !preview.findings.length && !preview.warnings.length && !preview.isStale && syncState === 'ready' && persistenceMode !== 'local-recovery');

  const publish = async () => {
    setBusy(true); setMessage(null);
    try {
      const result = await publishPublicCut(state, profile.id, currentActorId, syncState === 'ready');
      const committed = await commitPublicCutToSupabase(state, result.publications);
      await refresh();
      setMessage(`Published atomic Public Cut ${committed.checksum.slice(0, 12)} (${committed.publishedIds.length} snapshots).`);
    } catch (error) { recordClientEvent({ context: { action: 'publish' }, kind: 'publication_failure' }); setMessage(error instanceof Error ? error.message : 'The Public Cut could not be published.'); }
    finally { setBusy(false); }
  };

  const unpublish = async () => {
    setBusy(true); setMessage(null);
    try {
      const committed = await unpublishPublicCutFromSupabase(profile.id);
      await refresh();
      setMessage(committed.cleanupWarning ?? `Unpublished ${committed.unpublishedIds.length || history.filter((item) => item.isCurrent).length} current Public Cut(s).`);
    } catch (error) { recordClientEvent({ context: { action: 'unpublish' }, kind: 'publication_failure' }); setMessage(error instanceof Error ? error.message : 'The Public Cut could not be unpublished.'); }
    finally { setBusy(false); }
  };

  return (
    <>
    <main aria-hidden={showPreview || undefined} className="specialist-workbench min-h-full bg-midnight px-4 pb-16 pt-6 text-stardust sm:px-7 lg:px-10" inert={showPreview || undefined}>
      <header className="mx-auto max-w-7xl border-b border-bronze/20 pb-7">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ember">Portfolio Studio</p>
            <h1 className="font-display mt-3 text-4xl sm:text-5xl">Curate the public cut.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-stardust/55">Choose only the work, approved story, and copied media derivatives you want anonymous visitors to see.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="inline-flex min-h-11 items-center gap-2 rounded-md border border-bronze/32 px-4 text-sm hover:border-ember/50" disabled={!preview} onClick={() => setShowPreview(true)} type="button"><Eye size={17} /> Public preview</button>
            <button className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ember px-4 text-sm font-semibold text-midnight disabled:cursor-not-allowed disabled:opacity-45" disabled={!canPublish || busy} onClick={() => void publish()} type="button">{busy ? <LoaderCircle className="animate-spin" size={17} /> : <Globe2 size={17} />} Publish new snapshot</button>
          </div>
        </div>
        <div className="mt-7"><WorkbenchTabs active={tab} ariaLabel="Portfolio manager sections" items={portfolioWorkbenchTabs} onChange={setTab} /></div>
      </header>

      {focusedGarmentId ? <div className="mx-auto mt-5 max-w-7xl"><GarmentWorkbenchContext actions={<button className="workbench-quick-action" disabled={!preview} onClick={() => setShowPreview(true)} type="button">Public preview</button>} garmentId={focusedGarmentId} label="Portfolio" /></div> : null}

      <section className="mx-auto mt-7 max-w-7xl" role="tabpanel">
        {message ? <p aria-live="polite" className="mb-5 rounded-md border border-bronze/25 bg-charcoal px-4 py-3 text-sm text-stardust/70">{message}</p> : null}
        {syncState === 'offline' ? <StatusBanner icon={<AlertTriangle size={16} />} text="Offline edits remain private. Publish and unpublish need fresh server state." tone="warning" /> : null}
        {tab === 'projects' ? (
          <div className="grid gap-7 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <div>
              <SectionTitle eyebrow="Selected work" title="Public case studies" />
              <div className="mt-4 space-y-3">
                {selectedProjects.map((project, index) => <ProjectRow assets={state.garmentMedia.filter((relation) => relation.garmentId === project.garmentId).map((relation) => state.mediaAssets.find((asset) => asset.id === relation.assetId)).filter((asset): asset is NonNullable<typeof asset> => Boolean(asset))} excerpt={state.portfolioTechnicalExcerpts.find((item) => item.projectId === project.id)} key={project.id} project={project} title={state.garments.find((item) => item.id === project.garmentId)?.title ?? 'Untitled garment'} stale={!project.sourceVersionId || project.sourceVersionId !== [...state.garmentVersions].filter((item) => item.garmentId === project.garmentId).sort((a, b) => b.versionNo - a.versionNo)[0]?.id} onCreateExcerpt={(title, summary) => { try { commitWorkspace((currentState) => createTechnicalExcerpt(currentState, project.id, { summary, title }).state); } catch (error) { setMessage(error instanceof Error ? error.message : 'Technical excerpt could not be created.'); } }} onEdit={(patch) => commitWorkspace((currentState) => updatePortfolioProject(currentState, project.id, patch).state)} onMove={(direction) => commitWorkspace((currentState) => ({ ...currentState, portfolioProjects: movePortfolioItem(currentState.portfolioProjects, project.id, direction) }))} onRefreshSource={() => { const latest = [...state.garmentVersions].filter((item) => item.garmentId === project.garmentId).sort((a, b) => b.versionNo - a.versionNo)[0]; if (latest) commitWorkspace((currentState) => updatePortfolioProject(currentState, project.id, { sourceVersionId: latest.id }).state); }} onToggle={() => commitWorkspace((currentState) => ({ ...currentState, portfolioProjects: currentState.portfolioProjects.map((item) => item.id === project.id ? { ...item, visibility: item.visibility === 'private' ? 'ready' : 'private', revision: item.revision + 1, updatedAt: new Date().toISOString() } : item) }))} first={index === 0} last={index === selectedProjects.length - 1} />)}
                {!selectedProjects.length ? <EmptyState text="No case studies selected yet." /> : null}
              </div>
            </div>
            <aside>
              <SectionTitle eyebrow="Garment library" title="Add a case study" />
              <div className="mt-4 space-y-2">
                {state.garments.filter((item) => !selectedIds.has(item.id)).map((garment) => <button className="flex min-h-14 w-full items-center justify-between rounded-lg border border-bronze/20 bg-charcoal px-4 text-left hover:border-ember/40" key={garment.id} onClick={() => commitWorkspace((currentState) => selectPortfolioProject(currentState, profile.id, garment.id).state)} type="button"><span><span className="block text-sm">{garment.title}</span><span className="mt-1 block text-xs text-stardust/38">{garment.garmentCode} · {garment.status}</span></span><Plus size={17} className="text-ember" /></button>)}
              </div>
            </aside>
          </div>
        ) : null}

        {tab === 'editorials' ? (
          <div className="grid gap-7 xl:grid-cols-2">
            <div><SectionTitle eyebrow="Selected stories" title="Public editorials" /><div className="mt-4 space-y-3">{selectedEditorials.map((item) => { const collection = state.editorialCollections.find((candidate) => candidate.id === item.collectionId); const scenes = state.editorialScenes.filter((scene) => scene.collectionId === item.collectionId); const assets = state.editorialAssets.filter((relation) => relation.collectionId === item.collectionId).map((relation) => state.mediaAssets.find((asset) => asset.id === relation.assetId)).filter((asset): asset is NonNullable<typeof asset> => Boolean(asset)); return <EditorialSelectionRow assets={assets} key={item.id} onChange={(patch) => commitWorkspace((currentState) => updatePortfolioEditorial(currentState, item.id, patch).state)} scenes={scenes} selection={item} title={collection?.title ?? item.slug} />; })}{!selectedEditorials.length ? <EmptyState text="No approved editorial selected." /> : null}</div></div>
            <aside><SectionTitle eyebrow="Editorial Library" title="Add an approved story" /><div className="mt-4 space-y-2">{state.editorialCollections.filter((item) => ['approved', 'published'].includes(item.status) && !selectedEditorialIds.has(item.id)).map((collection) => <button className="flex min-h-14 w-full items-center justify-between rounded-lg border border-bronze/20 bg-charcoal px-4 text-left hover:border-ember/40" key={collection.id} onClick={() => { try { commitWorkspace((currentState) => selectPortfolioEditorial(currentState, profile.id, collection.id).state); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to select editorial.'); } }} type="button"><span><span className="block text-sm">{collection.title}</span><span className="mt-1 block text-xs text-stardust/38">{collection.status}</span></span><Plus size={17} className="text-ember" /></button>)}</div></aside>
          </div>
        ) : null}

        {tab === 'profile' ? <ProfileEditor profile={profile} onChange={(patch) => commitWorkspace((currentState) => updatePortfolioProfile(currentState, profile.id, patch))} /> : null}

        {tab === 'publish' ? (
          <div className="grid gap-7 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div><SectionTitle eyebrow="Release gate" title="Privacy & readiness" /><div className="mt-4 rounded-lg border border-bronze/20 bg-charcoal p-5">{preview ? <><Gate passed={!preview.findings.length} label={preview.findings.length ? `${preview.findings.length} privacy blocker(s)` : 'Payload allowlist and denylist passed'} /><Gate passed={!preview.isStale} label={preview.isStale ? 'Selected sources are stale' : 'Source versions are current'} /><Gate passed={!preview.warnings.length} label={preview.warnings.length ? preview.warnings[0] : 'Media derivatives and selections are ready'} /><p className="mt-5 break-all border-t border-bronze/16 pt-4 font-mono text-[0.65rem] text-stardust/38">SHA-256 {preview.checksum}</p></> : <p>Preparing privacy scan…</p>}</div>{current ? <button className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md border border-red-300/30 px-4 text-sm text-red-200 hover:border-red-300/60 disabled:opacity-45" disabled={busy} onClick={() => void unpublish()} type="button"><EyeOff size={16} /> Unpublish current cut</button> : null}</div>
            <div><SectionTitle eyebrow="Immutable evidence" title="Publication history" /><div className="mt-4 overflow-hidden rounded-lg border border-bronze/20">{history.length ? history.map((item) => <article className="grid gap-3 border-b border-bronze/14 bg-charcoal p-4 last:border-0 sm:grid-cols-[minmax(0,1fr)_auto]" key={item.id}><div><p className="text-sm">{item.publicationType} · {item.publicPath}</p><p className="mt-1 font-mono text-[0.65rem] text-stardust/36">{item.checksum.slice(0, 20)}…</p></div><div className="text-left sm:text-right"><span className={`text-xs ${item.isCurrent ? 'text-emerald-300' : 'text-stardust/40'}`}>{item.isCurrent ? 'Current' : item.unpublishedAt ? 'Unpublished' : 'Historical'}</span><p className="mt-1 text-xs text-stardust/36">{new Date(item.publishedAt).toLocaleString()}</p></div></article>) : <EmptyState text="No publication snapshots yet." />}</div></div>
          </div>
        ) : null}
      </section>
    </main>
    {showPreview && preview ? <PublicCutPreview onClose={() => setShowPreview(false)} preview={preview} /> : null}
    </>
  );
}

const portfolioWorkbenchTabs = [
  { id: 'projects', label: 'Projects' },
  { id: 'editorials', label: 'Editorials' },
  { id: 'profile', label: 'Profile' },
  { id: 'publish', label: 'Publish' },
] as const;

function PortfolioSetup({ garmentId, onCreate }: { garmentId: string | null; onCreate: () => void }) {
  return <main className="min-h-full bg-midnight px-4 pb-16 pt-6 text-stardust sm:px-7 lg:px-10">
    <SpecialistWorkbench className="mx-auto max-w-7xl">
      {garmentId ? <GarmentWorkbenchContext garmentId={garmentId} label="Portfolio" /> : null}
      <section className="atelier-panel max-w-3xl px-6 py-10 sm:px-9 sm:py-12">
        <p className="atelier-eyebrow">Portfolio</p>
        <h1 className="font-display mt-3 text-4xl leading-tight sm:text-5xl">Shape your public story</h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-stardust/58">Create the private curation space where approved garments, editorials, and technical excerpts can become a Public Cut.</p>
        <button className="mt-7 min-h-11 rounded-md bg-ember px-5 text-sm font-medium text-midnight transition hover:bg-ember/90" onClick={onCreate} type="button">Set up portfolio</button>
      </section>
    </SpecialistWorkbench>
  </main>;
}

function ProjectRow({ assets, excerpt, first, last, onCreateExcerpt, onEdit, onMove, onRefreshSource, onToggle, project, stale, title }: { assets: CanonicalMediaAsset[]; excerpt?: CanonicalPortfolioTechnicalExcerpt; first: boolean; last: boolean; onCreateExcerpt: (title: string, summary: string) => void; onEdit: (patch: Parameters<typeof updatePortfolioProject>[2]) => void; onMove: (direction: 'up' | 'down') => void; onRefreshSource: () => void; onToggle: () => void; project: CanonicalPortfolioProject; stale: boolean; title: string }) {
  const [excerptTitle, setExcerptTitle] = useState(excerpt?.title ?? 'Approved technical excerpt');
  const [excerptSummary, setExcerptSummary] = useState(excerpt?.summary ?? 'A curated view of the released construction and measurement intent.');
  return <article className="grid gap-4 rounded-lg border border-bronze/20 bg-charcoal p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"><div className="flex sm:flex-col"><button aria-label={`Move ${title} up`} className="flex h-10 w-10 items-center justify-center disabled:opacity-25" disabled={first} onClick={() => onMove('up')} type="button"><ArrowUp size={16} /></button><button aria-label={`Move ${title} down`} className="flex h-10 w-10 items-center justify-center disabled:opacity-25" disabled={last} onClick={() => onMove('down')} type="button"><ArrowDown size={16} /></button></div><div><h3 className="text-base">{title}</h3><p className="mt-1 text-xs text-stardust/42">/{project.slug} · {project.selectedAssetIds.length} selected media</p>{stale ? <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-amber-200"><span className="flex items-center gap-1.5"><AlertTriangle size={13} /> Source version needs refresh</span><button className="min-h-9 rounded-md border border-amber-200/30 px-2" onClick={onRefreshSource} type="button">Use latest approved</button></p> : null}</div><button className="inline-flex min-h-11 items-center gap-2 rounded-md border border-bronze/25 px-3 text-xs" onClick={onToggle} type="button">{project.visibility === 'private' ? <EyeOff size={15} /> : <Eye size={15} />}{project.visibility}</button><details className="border-t border-bronze/16 pt-4 sm:col-span-3"><summary className="cursor-pointer text-sm text-ember">Edit case study, media & technical excerpt</summary><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Public URL slug" value={project.slug} onChange={(slug) => onEdit({ slug })} /><Field label="Role" value={project.caseStudy.role} onChange={(role) => onEdit({ caseStudy: { role } })} /><label className="sm:col-span-2"><span className="text-xs uppercase tracking-[0.16em] text-stardust/42">Case-study overview</span><textarea className="mt-2 min-h-28 w-full rounded-md border border-bronze/25 bg-midnight px-3 py-3 text-sm outline-none focus:border-ember" onChange={(event) => onEdit({ caseStudy: { overview: event.target.value } })} value={project.caseStudy.overview} /></label><label className="sm:col-span-2"><span className="text-xs uppercase tracking-[0.16em] text-stardust/42">Approved process summary</span><textarea className="mt-2 min-h-24 w-full rounded-md border border-bronze/25 bg-midnight px-3 py-3 text-sm outline-none focus:border-ember" onChange={(event) => onEdit({ caseStudy: { processSummary: event.target.value } })} value={project.caseStudy.processSummary} /></label><fieldset className="sm:col-span-2"><legend className="text-xs uppercase tracking-[0.16em] text-stardust/42">Selected media</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{assets.map((asset) => <label className="flex min-h-11 items-center gap-3 rounded-md border border-bronze/18 px-3 text-sm" key={asset.id}><input checked={project.selectedAssetIds.includes(asset.id)} onChange={() => onEdit({ selectedAssetIds: project.selectedAssetIds.includes(asset.id) ? project.selectedAssetIds.filter((id) => id !== asset.id) : [...project.selectedAssetIds, asset.id] })} type="checkbox" />{asset.name}</label>)}{!assets.length ? <p className="text-sm text-stardust/38">Attach garment media before selecting public derivatives.</p> : null}</div></fieldset><fieldset className="rounded-md border border-bronze/18 p-4 sm:col-span-2"><legend className="px-2 text-xs uppercase tracking-[0.16em] text-stardust/42">Optional released technical excerpt</legend><div className="grid gap-3 sm:grid-cols-2"><Field label="Title" value={excerptTitle} onChange={setExcerptTitle} wide /><label className="sm:col-span-2"><span className="text-xs uppercase tracking-[0.16em] text-stardust/42">Summary</span><textarea className="mt-2 min-h-20 w-full rounded-md border border-bronze/25 bg-midnight px-3 py-3 text-sm" onChange={(event) => setExcerptSummary(event.target.value)} value={excerptSummary} /></label><button className="min-h-11 rounded-md border border-ember/35 px-4 text-sm text-ember" onClick={() => onCreateExcerpt(excerptTitle, excerptSummary)} type="button">{excerpt ? 'Update approved excerpt' : 'Add approved excerpt'}</button></div></fieldset></div></details></article>;
}

function EditorialSelectionRow({ assets, onChange, scenes, selection, title }: { assets: CanonicalMediaAsset[]; onChange: (patch: Parameters<typeof updatePortfolioEditorial>[2]) => void; scenes: CanonicalEditorialScene[]; selection: CanonicalPortfolioEditorial; title: string }) {
  return <article className="rounded-lg border border-bronze/20 bg-charcoal p-4"><div className="flex items-center justify-between gap-4"><div><h3>{title}</h3><p className="mt-1 text-xs text-stardust/42">{selection.selectedSceneIds.length} scenes · {selection.selectedAssetIds.length} selected assets</p></div><button className="min-h-11 rounded-full border border-bronze/25 px-3 text-xs text-ember" onClick={() => onChange({ visibility: selection.visibility === 'private' ? 'ready' : 'private' })} type="button">{selection.visibility}</button></div><details className="mt-4 border-t border-bronze/16 pt-4"><summary className="cursor-pointer text-sm text-ember">Edit public scenes & media</summary><div className="mt-4 grid gap-4 sm:grid-cols-2"><fieldset><legend className="text-xs uppercase tracking-[0.16em] text-stardust/42">Scenes</legend>{scenes.map((scene) => <label className="mt-2 flex min-h-11 items-center gap-3 rounded-md border border-bronze/18 px-3 text-sm" key={scene.id}><input checked={selection.selectedSceneIds.includes(scene.id)} onChange={() => onChange({ selectedSceneIds: selection.selectedSceneIds.includes(scene.id) ? selection.selectedSceneIds.filter((id) => id !== scene.id) : [...selection.selectedSceneIds, scene.id] })} type="checkbox" />{scene.title}</label>)}</fieldset><fieldset><legend className="text-xs uppercase tracking-[0.16em] text-stardust/42">Media</legend>{assets.map((asset) => <label className="mt-2 flex min-h-11 items-center gap-3 rounded-md border border-bronze/18 px-3 text-sm" key={asset.id}><input checked={selection.selectedAssetIds.includes(asset.id)} onChange={() => onChange({ selectedAssetIds: selection.selectedAssetIds.includes(asset.id) ? selection.selectedAssetIds.filter((id) => id !== asset.id) : [...selection.selectedAssetIds, asset.id] })} type="checkbox" />{asset.name}</label>)}</fieldset></div></details></article>;
}

function ProfileEditor({ onChange, profile }: { onChange: (patch: Parameters<typeof updatePortfolioProfile>[2]) => void; profile: Parameters<typeof updatePortfolioProfile>[0]['portfolioProfiles'][number] }) {
  return <div className="max-w-3xl"><SectionTitle eyebrow="Public identity" title="Profile editor" /><div className="mt-5 grid gap-5 rounded-lg border border-bronze/20 bg-charcoal p-5 sm:grid-cols-2"><Field label="Display name" value={profile.displayName} onChange={(displayName) => onChange({ displayName })} /><Field label="Public URL slug" value={profile.usernameSlug} onChange={(usernameSlug) => onChange({ usernameSlug })} /><Field label="Headline" value={profile.headline} onChange={(headline) => onChange({ headline })} wide /><Field label="Location" value={profile.location} onChange={(location) => onChange({ location })} /><Field label="Public email" value={profile.email} onChange={(email) => onChange({ email })} /><label className="sm:col-span-2"><span className="text-xs uppercase tracking-[0.16em] text-stardust/42">Bio</span><textarea className="mt-2 min-h-32 w-full rounded-md border border-bronze/25 bg-midnight px-3 py-3 text-sm outline-none focus:border-ember" onChange={(event) => onChange({ bio: event.target.value })} value={profile.bio} /></label></div></div>;
}
function Field({ label, onChange, value, wide = false }: { label: string; onChange: (value: string) => void; value: string; wide?: boolean }) { return <label className={wide ? 'sm:col-span-2' : ''}><span className="text-xs uppercase tracking-[0.16em] text-stardust/42">{label}</span><input className="mt-2 min-h-11 w-full rounded-md border border-bronze/25 bg-midnight px-3 text-sm outline-none focus:border-ember" onChange={(event) => onChange(event.target.value)} value={value} /></label>; }
function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) { return <div><p className="text-[0.65rem] uppercase tracking-[0.2em] text-ember">{eyebrow}</p><h2 className="font-display mt-2 text-2xl sm:text-3xl">{title}</h2></div>; }
function EmptyState({ text }: { text: string }) { return <div className="rounded-lg border border-dashed border-bronze/25 px-5 py-10 text-center text-sm text-stardust/38">{text}</div>; }
function Gate({ label, passed }: { label: string; passed: boolean }) { return <p className={`mb-3 flex items-start gap-2 text-sm ${passed ? 'text-emerald-200' : 'text-amber-200'}`}>{passed ? <Check size={16} /> : <AlertTriangle size={16} />} {label}</p>; }
function StatusBanner({ icon, text, tone }: { icon: React.ReactNode; text: string; tone: 'warning' }) { return <p className={`mb-5 flex items-center gap-2 rounded-md border px-4 py-3 text-sm ${tone === 'warning' ? 'border-amber-300/25 bg-amber-950/15 text-amber-100' : ''}`}>{icon}{text}</p>; }
function LoadingState() { return <main className="flex min-h-[60vh] items-center justify-center bg-midnight text-stardust"><div className="text-center"><LoaderCircle className="mx-auto animate-spin text-ember" /><p className="mt-3 text-sm text-stardust/45">Opening Portfolio Studio</p></div></main>; }
