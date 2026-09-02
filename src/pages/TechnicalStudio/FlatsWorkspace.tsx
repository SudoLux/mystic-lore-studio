import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import { AlertTriangle, Check, FilePlus2, GitCompare, MousePointer2, Plus, Ruler, Upload, ZoomIn, ZoomOut } from 'lucide-react';
import { Badge } from '../../components/shared/Badge';
import { Button } from '../../components/shared/Button';
import { CanonicalWorkspaceState } from '../../components/shared/CanonicalWorkspaceState';
import { Card } from '../../components/shared/Card';
import { activeFlat, flatViewOptions, prepareFlatComparison, requiredFlatViews, validateTechnicalSpec } from '../../domains/technical';
import type { CanonicalFlatAnnotation, CanonicalMediaAsset, TechnicalFlatView } from '../../domains/workspace';
import { useTechnicalStudio } from '../../hooks/useTechnicalStudio';
import { isTechnicalImageAsset, technicalPreviewUrl } from '../../lib/technicalFiles';
import { cn } from '../../lib/classes';

type Anchor = { x: number; y: number };
type AnnotationSeverity = CanonicalFlatAnnotation['severity'];

export function FlatsWorkspace({ garmentId }: { garmentId: string }) {
  const { createSpecification, execute, state, uploadFlatRevision } = useTechnicalStudio();
  const [view, setView] = useState<TechnicalFlatView>('front');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [annotating, setAnnotating] = useState(false);
  const [draftAnchor, setDraftAnchor] = useState<Anchor | null>(null);
  const [draftLabel, setDraftLabel] = useState('');
  const [draftDetail, setDraftDetail] = useState('');
  const [draftSeverity, setDraftSeverity] = useState<AnnotationSeverity>('info');
  const inputRef = useRef<HTMLInputElement>(null);
  const garment = state?.garments.find((item) => item.id === garmentId);
  const spec = state?.technicalSpecs.find((item) => item.garmentId === garmentId);
  const flat = spec ? activeFlat(state!, spec.id, view) : null;
  const asset = state?.mediaAssets.find((item) => item.id === flat?.assetId);
  const annotations = state?.flatAnnotations.filter((item) => item.flatId === flat?.id) ?? [];
  const comparison = spec ? prepareFlatComparison(state!, spec.id, view) : null;
  const issues = spec ? validateTechnicalSpec(state!, spec.id, true) : [];
  const file = flat ? state?.technicalFiles.find((item) => item.assetId === flat.assetId && item.specId === flat.specId) : null;
  const revisions = spec ? state?.technicalFlats.filter((item) => item.specId === spec.id && item.view === view).length ?? 0 : 0;
  const previousRevision = comparison?.previous;
  const currentRevisionLabel = comparison?.current.revisionLabel ?? 'the current revision';

  useEffect(() => {
    setZoom(1);
    setAnnotating(false);
    setDraftAnchor(null);
    setDraftLabel('');
    setDraftDetail('');
  }, [view, flat?.id]);

  if (!garment) return <Card><h1 className="font-display text-3xl">Garment not found</h1></Card>;

  const startUpload = () => inputRef.current?.click();
  const uploadFile = async (selected?: File) => {
    if (!selected || !spec) return;
    setBusy(true);
    setNotice('');
    try {
      await uploadFlatRevision(spec.id, view, selected);
      setNotice(`${viewTitle(view)} source stored as a new revision.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not store the source.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };
  const upload = (event: ChangeEvent<HTMLInputElement>) => void uploadFile(event.currentTarget.files?.[0]);
  const addAnnotation = (anchor: Anchor) => {
    if (!flat) return;
    setDraftAnchor(anchor);
    setDraftLabel('');
    setDraftDetail('');
    setDraftSeverity('info');
  };
  const saveAnnotation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!flat || !draftAnchor || !draftLabel.trim()) return;
    execute({ type: 'add_annotation', flatId: flat.id, anchor: draftAnchor, detail: draftDetail, label: draftLabel, severity: draftSeverity });
    setNotice(`Callout added to the ${viewTitle(view).toLowerCase()} flat.`);
    setDraftAnchor(null);
    setDraftLabel('');
    setDraftDetail('');
  };
  const approve = () => {
    if (!flat) return;
    try {
      execute({ type: 'approve_flat', flatId: flat.id });
      setNotice(`${viewTitle(view)} approved.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Approval failed.');
    }
  };

  if (!spec) {
    return <CanonicalWorkspaceState><Card className="max-w-2xl"><Badge variant="bronze">Technical Studio · {garment.garmentCode}</Badge><h1 className="font-display mt-3 text-4xl">Begin the technical specification</h1><p className="mt-3 text-sm text-stardust/62">Set up a precise, source-owned space for flats, measurements, construction notes, validation, and export.</p><Button className="mt-6" icon={<Ruler aria-hidden="true" size={16} />} onClick={() => createSpecification(garment.id)} variant="primary">Start with size M · cm</Button></Card></CanonicalWorkspaceState>;
  }

  const status = flat?.approvedAt ? 'Approved' : flat ? 'Needs review' : 'Source needed';
  return <CanonicalWorkspaceState><section className="flats-workspace space-y-5" data-testid="flats-workspace">
    <header className="flats-workspace__header">
      <div>
        <Badge variant="bronze">{garment.garmentCode} · Technical Studio</Badge>
        <h1 className="font-display mt-3 text-4xl">Flats</h1>
        <p className="mt-2 text-sm text-stardust/55">A focused source workspace for garment views, callouts, and review.</p>
      </div>
      <div className="flats-workspace__actions">
        <span className={cn('flat-status', flat?.approvedAt ? 'flat-status--approved' : flat ? 'flat-status--review' : 'flat-status--missing')}>{status}</span>
        {previousRevision ? <Button icon={<GitCompare aria-hidden="true" size={15} />} onClick={() => setNotice(`Comparing ${currentRevisionLabel} with ${previousRevision.revisionLabel}; their source checksums remain preserved.`)} size="sm">Compare revisions</Button> : null}
        <Button disabled={busy} onClick={() => { execute({ type: 'run_validation', specId: spec.id }); setNotice('Validation run recorded.'); }} size="sm">Validate</Button>
        {flat && !flat.approvedAt ? <Button disabled={busy} icon={<Check aria-hidden="true" size={15} />} onClick={approve} size="sm" variant="primary">Approve</Button> : null}
      </div>
    </header>

    <FlatViewSelector active={view} onChange={setView} state={state!} specId={spec.id} />
    {notice ? <p aria-live="polite" className="flats-notice">{notice}</p> : null}
    <input accept="image/*,.pdf,.ai,.svg" aria-label={`Upload ${viewTitle(view)} flat source`} className="sr-only" data-testid="flat-source-input" onChange={upload} ref={inputRef} type="file" />

    <div className="flats-workspace__grid">
      <div className="min-w-0">
        <FlatCanvas
          annotations={annotations}
          annotating={annotating}
          asset={asset}
          busy={busy}
          onAnnotate={addAnnotation}
          onBrowse={startUpload}
          onDropFile={uploadFile}
          title={viewTitle(view)}
          zoom={zoom}
        />
        {asset ? <FlatCanvasToolbar annotating={annotating} busy={busy} onAnnotatingChange={setAnnotating} onBrowse={startUpload} onReset={() => setZoom(1)} onZoomChange={setZoom} zoom={zoom} /> : null}
      </div>
      <FlatInspector
        annotations={annotations}
        asset={asset}
        approved={Boolean(flat?.approvedAt)}
        draft={{ anchor: draftAnchor, detail: draftDetail, label: draftLabel, severity: draftSeverity }}
        fileLabel={file?.versionLabel ?? null}
        issues={issues}
        onBrowse={startUpload}
        onCancelDraft={() => setDraftAnchor(null)}
        onDraftChange={({ detail, label, severity }) => { if (label !== undefined) setDraftLabel(label); if (detail !== undefined) setDraftDetail(detail); if (severity !== undefined) setDraftSeverity(severity); }}
        onResolve={(annotationId) => execute({ type: 'set_annotation_status', annotationId, status: 'resolved' })}
        onSaveDraft={saveAnnotation}
        required={requiredFlatViews.includes(view)}
        revisionCount={revisions}
        title={viewTitle(view)}
      />
    </div>
  </section></CanonicalWorkspaceState>;
}

function FlatViewSelector({ active, onChange, specId, state }: { active: TechnicalFlatView; onChange: (view: TechnicalFlatView) => void; specId: string; state: NonNullable<ReturnType<typeof useTechnicalStudio>['state']> }) {
  return <nav aria-label="Flat views" className="flat-view-selector">{flatViewOptions.map((view) => {
    const hasSource = Boolean(activeFlat(state, specId, view));
    const required = requiredFlatViews.includes(view);
    const description = hasSource ? 'Source uploaded' : required ? 'Required · missing' : 'Optional · empty';
    return <button aria-current={active === view ? 'page' : undefined} aria-label={`${viewTitle(view)}: ${description}`} className={cn('flat-view-option', active === view && 'flat-view-option--active', hasSource ? 'flat-view-option--complete' : required ? 'flat-view-option--required' : 'flat-view-option--empty')} key={view} onClick={() => onChange(view)} type="button">
      <span className="flat-view-option__name">{viewTitle(view)}</span>
      <span className="flat-view-option__status">{hasSource ? <><Check aria-hidden="true" size={13} /> Source uploaded</> : required ? <><AlertTriangle aria-hidden="true" size={13} /> Required · missing</> : <><Plus aria-hidden="true" size={13} /> Optional · empty</>}</span>
    </button>;
  })}</nav>;
}

function FlatCanvas({ annotations, annotating, asset, busy, onAnnotate, onBrowse, onDropFile, title, zoom }: { annotations: CanonicalFlatAnnotation[]; annotating: boolean; asset?: CanonicalMediaAsset; busy: boolean; onAnnotate: (anchor: Anchor) => void; onBrowse: () => void; onDropFile: (file?: File) => Promise<void>; title: string; zoom: number }) {
  const [dragging, setDragging] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    void (async () => {
      if (!asset) { setUrl(null); return; }
      objectUrl = await technicalPreviewUrl(asset);
      if (active) setUrl(objectUrl);
    })();
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [asset]);
  const sourceIsImage = Boolean(url && asset && isTechnicalImageAsset(asset));
  const setAnchor = (event: { clientX: number; clientY: number; currentTarget: EventTarget & HTMLDivElement }) => {
    if (!annotating || !asset) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    onAnnotate({ x: Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)), y: Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height)) });
  };
  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void onDropFile(event.dataTransfer.files?.[0]);
  };
  return <div className="flat-canvas-shell">
    <div
      aria-describedby="flat-canvas-help"
      aria-label={asset ? `${title} technical canvas${annotating ? '. Annotation mode active. Click artwork to position a callout.' : ''}` : `Drop your ${title} flat here or browse files.`}
      className={cn('flat-canvas', dragging && 'flat-canvas--dragging', annotating && 'flat-canvas--annotating')}
      data-testid="flat-canvas"
      onClick={setAnchor}
      onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }}
      onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; setDragging(true); }}
      onDrop={drop}
      onKeyDown={(event) => { if (annotating && asset && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onAnnotate({ x: .5, y: .5 }); } }}
      role={annotating && asset ? 'button' : undefined}
      tabIndex={annotating && asset ? 0 : undefined}
    >
      {!asset ? <FlatDropzone busy={busy} dragging={dragging} onBrowse={onBrowse} title={title} /> : sourceIsImage ? <>
        <img alt={`${asset.name} technical source`} className="flat-canvas__artwork" draggable={false} loading="lazy" src={url!} style={{ transform: `scale(${zoom})` }} />
        {annotations.map((annotation, index) => <span aria-label={`Annotation ${index + 1}: ${annotation.label}`} className="flat-annotation-marker" key={annotation.id} style={{ left: `${annotation.anchor.x * 100}%`, top: `${annotation.anchor.y * 100}%` }}>{String(index + 1).padStart(2, '0')}</span>)}
      </> : <div className="flat-canvas__non-image"><FilePlus2 aria-hidden="true" size={26} /><strong>{asset.name}</strong><span>Source is stored safely. This file type does not have an in-canvas preview.</span></div>}
      {dragging ? <div aria-live="polite" className="flat-canvas__drop-overlay"><Upload aria-hidden="true" size={30} /><strong>Drop to add {title} Flat</strong></div> : null}
    </div>
    <p className="sr-only" id="flat-canvas-help">Sources are saved as private revisions. In annotation mode, callouts are stored separately from the artwork so the original file remains untouched.</p>
  </div>;
}

function FlatDropzone({ busy, dragging, onBrowse, title }: { busy: boolean; dragging: boolean; onBrowse: () => void; title: string }) {
  return <div className="flat-dropzone">
    <Upload aria-hidden="true" size={31} />
    <p className="flat-dropzone__eyebrow">{title.toUpperCase()} VIEW</p>
    <h2 className="font-display text-3xl">{dragging ? `Drop to add ${title} Flat` : `Drop your ${title} Flat here`}</h2>
    <p>Technical flats with white backgrounds blend seamlessly into this working canvas.</p>
    <p className="flat-dropzone__formats">PNG · JPG · SVG · supported source file</p>
    <Button className="border-[#5c3c1c]/70 bg-[#2c241c] text-[#fffaf0] hover:bg-[#3a2e22]" disabled={busy} onClick={onBrowse} size="sm" variant="secondary">{busy ? 'Preparing source…' : 'Browse files'}</Button>
    <span className="flat-dropzone__required">{requiredFlatViews.includes(title.toLowerCase() as TechnicalFlatView) ? 'Required for approval' : 'Optional technical view'}</span>
  </div>;
}

function FlatCanvasToolbar({ annotating, busy, onAnnotatingChange, onBrowse, onReset, onZoomChange, zoom }: { annotating: boolean; busy: boolean; onAnnotatingChange: (value: boolean) => void; onBrowse: () => void; onReset: () => void; onZoomChange: (value: number) => void; zoom: number }) {
  const zoomOut = () => onZoomChange(Math.max(.7, Number((zoom - .1).toFixed(1))));
  const zoomIn = () => onZoomChange(Math.min(1.4, Number((zoom + .1).toFixed(1))));
  return <div aria-label="Flat canvas controls" className="flat-canvas-toolbar">
    <Button aria-label="Fit artwork to view" onClick={onReset} size="sm">Fit to view</Button>
    <div className="flat-canvas-toolbar__zoom" aria-label={`Zoom ${Math.round(zoom * 100)} percent`}>
      <button aria-label="Zoom out" disabled={zoom <= .7} onClick={zoomOut} type="button"><ZoomOut aria-hidden="true" size={16} /></button>
      <span>{Math.round(zoom * 100)}%</span>
      <button aria-label="Zoom in" disabled={zoom >= 1.4} onClick={zoomIn} type="button"><ZoomIn aria-hidden="true" size={16} /></button>
    </div>
    <Button icon={<MousePointer2 aria-hidden="true" size={15} />} onClick={() => onAnnotatingChange(!annotating)} size="sm" variant={annotating ? 'primary' : 'secondary'}>{annotating ? 'Finish annotation' : 'Annotate'}</Button>
    <Button disabled={busy} icon={<Upload aria-hidden="true" size={15} />} onClick={onBrowse} size="sm" variant="ghost">Replace source</Button>
  </div>;
}

function FlatInspector({ annotations, asset, approved, draft, fileLabel, issues, onBrowse, onCancelDraft, onDraftChange, onResolve, onSaveDraft, required, revisionCount, title }: { annotations: CanonicalFlatAnnotation[]; asset?: CanonicalMediaAsset; approved: boolean; draft: { anchor: Anchor | null; detail: string; label: string; severity: AnnotationSeverity }; fileLabel: string | null; issues: Array<{ code: string; message: string }>; onBrowse: () => void; onCancelDraft: () => void; onDraftChange: (value: { detail?: string; label?: string; severity?: AnnotationSeverity }) => void; onResolve: (annotationId: string) => void; onSaveDraft: (event: FormEvent<HTMLFormElement>) => void; required: boolean; revisionCount: number; title: string }) {
  const calloutRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (draft.anchor) window.setTimeout(() => calloutRef.current?.focus(), 0); }, [draft.anchor]);
  return <aside aria-label={`${title} flat inspector`} className="flat-inspector">
    <section className="flat-inspector__section">
      <p className="flat-inspector__eyebrow">{title.toUpperCase()} FLAT</p>
      <dl className="flat-inspector__facts">
        <div><dt>Source</dt><dd>{asset ? asset.name : 'Not uploaded'}</dd></div>
        {asset ? <><div><dt>Revision</dt><dd>{fileLabel ?? `Rev ${String(revisionCount).padStart(2, '0')}`}</dd></div><div><dt>Status</dt><dd>{approved ? 'Approved' : 'Needs review'}</dd></div></> : null}
      </dl>
      {!asset ? <><p className="flat-inspector__hint">{required ? 'Required for approval' : 'Add this optional view when it supports the garment.'}</p><Button className="mt-4" onClick={onBrowse} size="sm" variant="secondary">Upload flat</Button></> : null}
    </section>

    {draft.anchor ? <form className="flat-inspector__section flat-annotation-editor" onSubmit={onSaveDraft}>
      <div><p className="flat-inspector__eyebrow">NEW CALLOUT</p><h2 className="font-display text-xl">Anchor the detail</h2></div>
      <label>Callout<input aria-label="Callout" className="field" onChange={(event) => onDraftChange({ label: event.currentTarget.value })} ref={calloutRef} required value={draft.label} /></label>
      <label>Note <span className="text-stardust/40">optional</span><textarea aria-label="Callout note" className="field min-h-20 py-2" onChange={(event) => onDraftChange({ detail: event.currentTarget.value })} value={draft.detail} /></label>
      <label>Severity<select aria-label="Callout severity" className="field" onChange={(event) => onDraftChange({ severity: event.currentTarget.value as AnnotationSeverity })} value={draft.severity}><option value="info">General note</option><option value="warning">Needs attention</option><option value="critical">Critical</option></select></label>
      <div className="flex flex-wrap gap-2"><Button size="sm" type="submit" variant="primary">Save callout</Button><Button onClick={onCancelDraft} size="sm">Cancel</Button></div>
    </form> : null}

    <section className="flat-inspector__section">
      <div className="flex items-center justify-between gap-3"><div><p className="flat-inspector__eyebrow">ANNOTATIONS</p><h2 className="font-display text-xl">{annotations.length} {annotations.length === 1 ? 'callout' : 'callouts'}</h2></div><span className="flat-inspector__count">{annotations.filter((item) => item.status === 'open').length} open</span></div>
      {annotations.length ? <ul className="flat-annotation-list">{annotations.map((annotation, index) => <li key={annotation.id}><div className="flat-annotation-list__title"><span>{String(index + 1).padStart(2, '0')}</span><strong>{annotation.label}</strong></div><p>{annotation.detail || 'No additional note.'}</p><div className="flat-annotation-list__footer"><span>{annotation.severity === 'info' ? 'General note' : annotation.severity}</span>{annotation.status === 'open' ? <button onClick={() => onResolve(annotation.id)} type="button">Resolve</button> : <span>Resolved</span>}</div></li>)}</ul> : <p className="flat-inspector__hint">Enter annotation mode, then place a numbered callout directly on the flat.</p>}
    </section>

    <section className="flat-inspector__section flat-inspector__validation">
      <div className="flex items-center gap-2"><AlertTriangle aria-hidden="true" className={issues.length ? 'text-ember' : 'text-teal'} size={17} /><div><p className="flat-inspector__eyebrow">VALIDATION</p><h2 className="font-display text-xl">{issues.length ? `${issues.length} item${issues.length === 1 ? '' : 's'} to review` : 'Ready for approval'}</h2></div></div>
      {issues.length ? <ul>{issues.map((issue) => <li key={`${issue.code}-${issue.message}`}>{issue.message}</li>)}</ul> : <p className="flat-inspector__hint">Required sources, stored source records, and approvals are ready for export.</p>}
    </section>
  </aside>;
}

function viewTitle(value: string) { return value[0].toUpperCase() + value.slice(1); }
