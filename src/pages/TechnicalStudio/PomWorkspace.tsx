import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent, type MutableRefObject } from 'react';
import { AlertTriangle, Check, Crosshair, Focus, Plus, Save, Search, ZoomIn, ZoomOut } from 'lucide-react';
import { Badge } from '../../components/shared/Badge';
import { Button } from '../../components/shared/Button';
import { activeFlat } from '../../domains/technical';
import type { CanonicalMediaAsset, CanonicalPomPoint, CanonicalTechnicalFlat, CanonicalTechnicalSpec, CanonicalWorkspaceState } from '../../domains/workspace';
import { useMeasurements } from '../../hooks/useMeasurements';
import { cn } from '../../lib/classes';
import { technicalPreviewUrl } from '../../lib/technicalFiles';

type PomView = 'front' | 'back';
type FocusMode = 'both' | PomView;
type Placement = { kind: 'create'; code: string; method: string; name: string } | { kind: 'replace'; pointId: string };

export function PomWorkspace({ onOpenFlats, spec }: { onOpenFlats: () => void; spec: CanonicalTechnicalSpec }) {
  const { execute, state } = useMeasurements();
  const points = useMemo(() => state!.pomPoints.filter((item) => item.specId === spec.id).sort((a, b) => a.sortOrder - b.sortOrder), [spec.id, state]);
  const [selectedId, setSelectedId] = useState(points[0]?.id ?? '');
  const [hoveredId, setHoveredId] = useState('');
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<'browse' | 'create' | 'edit'>('browse');
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [focus, setFocus] = useState<FocusMode>('both');
  const [zoom, setZoom] = useState(1);
  const [notice, setNotice] = useState('');
  const [pendingSelectCode, setPendingSelectCode] = useState('');
  const listRefs = useRef(new Map<string, HTMLButtonElement>());
  const selected = points.find((item) => item.id === selectedId) ?? points[0] ?? null;
  const front = resolveFlat(state!, spec.id, 'front');
  const back = resolveFlat(state!, spec.id, 'back');
  const readyCount = points.filter((point) => pomReady(point, pointView(point) === 'front' ? front.asset : back.asset)).length;
  const issues = pomIssues(points, front.asset, back.asset);

  useEffect(() => {
    if (!selectedId && points[0]) setSelectedId(points[0].id);
  }, [points, selectedId]);

  useEffect(() => {
    const cancel = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || !placement) return;
      setPlacement(null);
      setNotice('POM placement cancelled.');
    };
    window.addEventListener('keydown', cancel);
    return () => window.removeEventListener('keydown', cancel);
  }, [placement]);

  useEffect(() => {
    if (selectedId) listRefs.current.get(selectedId)?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

  useEffect(() => {
    if (!pendingSelectCode) return;
    const created = points.find((point) => point.code === pendingSelectCode);
    if (!created) return;
    setSelectedId(created.id);
    setPendingSelectCode('');
  }, [pendingSelectCode, points]);

  const place = (view: PomView, anchor: { x: number; y: number }) => {
    if (!placement) return;
    try {
      if (placement.kind === 'create') {
        execute({ type: 'create_pom', specId: spec.id, code: placement.code, name: placement.name, method: placement.method, anchor: { ...anchor, view } });
        setPendingSelectCode(placement.code);
        setNotice(`${placement.code.toUpperCase()} placed on the ${view} flat.`);
        setMode('browse');
      } else {
        const point = points.find((item) => item.id === placement.pointId);
        if (!point) return;
        execute({ type: 'update_pom', pomPointId: point.id, expectedRevision: point.revision, patch: { diagramAnchor: { ...anchor, view } } });
        setSelectedId(point.id);
        setNotice(`${point.code} moved to the ${view} flat.`);
      }
      setPlacement(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The POM could not be placed.');
    }
  };

  const beginCreate = (input: { code: string; method: string; name: string }) => {
    const code = input.code.trim().toUpperCase();
    if (!code || !input.name.trim() || !input.method.trim()) {
      setNotice('Code, name, and measurement method are required before placement.');
      return;
    }
    if (points.some((point) => point.code === code)) {
      setNotice(`POM code ${code} already exists.`);
      return;
    }
    setPlacement({ kind: 'create', code, method: input.method.trim(), name: input.name.trim() });
    setNotice(`Placing ${code} · ${input.name.trim()}. Choose the Front or Back flat.`);
  };

  const selectPoint = (pointId: string) => {
    setSelectedId(pointId);
    setMode('browse');
  };

  return <section className="pom-workspace space-y-5" data-testid="pom-workspace">
    <header className="pom-workspace__header">
      <div>
        <Badge variant="bronze">POM map · canonical {spec.unit}</Badge>
        <h1 className="font-display mt-3 text-4xl">Points of measure</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stardust/58">Map stable measurement identities directly onto the current Front and Back technical flats.</p>
      </div>
      <div className="pom-completeness" aria-label={`${readyCount} of ${points.length} POMs ready`}>
        <span>{points.length ? `${readyCount} / ${points.length}` : '0'}</span>
        <div><strong>POMs ready</strong><small>{issues.length ? `${issues.length} item${issues.length === 1 ? '' : 's'} need attention` : 'Mapping complete'}</small></div>
      </div>
    </header>

    {notice ? <p aria-live="polite" className="pom-notice">{notice}</p> : null}
    <div className="pom-workspace__grid">
      <div className="min-w-0">
        <PomCanvasToolbar focus={focus} onAdd={() => { setMode('create'); setPlacement(null); }} onFocus={(value) => { setFocus(value); setZoom(1); }} onZoom={setZoom} placement={placement} zoom={zoom} />
        <div aria-label="Front and Back POM technical canvas" className={cn('pom-canvas', `pom-canvas--focus-${focus}`, placement && 'pom-canvas--placing')} role="group">
          <PomFlatSurface
            asset={front.asset}
            flat={front.flat}
            focused={focus === 'front'}
            hoveredId={hoveredId}
            onHover={setHoveredId}
            onOpenFlats={onOpenFlats}
            onPlace={place}
            onSelect={selectPoint}
            placement={placement}
            points={points.filter((point) => pointView(point) === 'front')}
            selectedId={selected?.id ?? ''}
            versionLabel={front.versionLabel}
            view="front"
            zoom={zoom}
          />
          <PomFlatSurface
            asset={back.asset}
            flat={back.flat}
            focused={focus === 'back'}
            hoveredId={hoveredId}
            onHover={setHoveredId}
            onOpenFlats={onOpenFlats}
            onPlace={place}
            onSelect={selectPoint}
            placement={placement}
            points={points.filter((point) => pointView(point) === 'back')}
            selectedId={selected?.id ?? ''}
            versionLabel={back.versionLabel}
            view="back"
            zoom={zoom}
          />
          {placement ? <div aria-live="polite" className="pom-placement-banner"><Crosshair aria-hidden="true" size={17} /><span><strong>{placementLabel(placement, points)}</strong> · Click Front or Back to place</span><kbd>Esc</kbd></div> : null}
        </div>
      </div>

      <PomInspector
        back={back}
        focusId={selected?.id ?? ''}
        hoveredId={hoveredId}
        issues={issues}
        listRefs={listRefs}
        mode={mode}
        onBeginCreate={beginCreate}
        onCancel={() => { setMode('browse'); setPlacement(null); }}
        onCreate={() => { setMode('create'); setPlacement(null); }}
        onEdit={() => setMode('edit')}
        onHover={setHoveredId}
        onRePlace={(point) => { setSelectedId(point.id); setPlacement({ kind: 'replace', pointId: point.id }); setNotice(`Re-placing ${point.code}. Choose the Front or Back flat.`); }}
        onSave={(point, input) => {
          try {
            execute({ type: 'update_pom', pomPointId: point.id, expectedRevision: point.revision, patch: input });
            setMode('browse');
            setNotice(`${point.code} details saved.`);
          } catch (error) {
            setNotice(error instanceof Error ? error.message : 'The POM could not be saved.');
          }
        }}
        onSelect={selectPoint}
        points={points}
        search={search}
        selected={selected}
        setSearch={setSearch}
        spec={spec}
        state={state!}
        front={front}
      />
    </div>
  </section>;
}

function PomCanvasToolbar({ focus, onAdd, onFocus, onZoom, placement, zoom }: { focus: FocusMode; onAdd: () => void; onFocus: (value: FocusMode) => void; onZoom: (value: number) => void; placement: Placement | null; zoom: number }) {
  return <div aria-label="POM canvas controls" className="pom-canvas-toolbar">
    <div className="pom-canvas-toolbar__focus" role="group" aria-label="Flat focus">
      {([['both', 'Fit both'], ['front', 'Focus Front'], ['back', 'Focus Back']] as const).map(([value, label]) => <button aria-pressed={focus === value} key={value} onClick={() => onFocus(value)} type="button">{label}</button>)}
    </div>
    <div className="pom-canvas-toolbar__zoom" aria-label={`Zoom ${Math.round(zoom * 100)} percent`}>
      <button aria-label="Zoom out" disabled={zoom <= .8} onClick={() => onZoom(Math.max(.8, Number((zoom - .1).toFixed(1))))} type="button"><ZoomOut aria-hidden="true" size={16} /></button>
      <span>{Math.round(zoom * 100)}%</span>
      <button aria-label="Zoom in" disabled={zoom >= 1.3} onClick={() => onZoom(Math.min(1.3, Number((zoom + .1).toFixed(1))))} type="button"><ZoomIn aria-hidden="true" size={16} /></button>
    </div>
    <Button disabled={Boolean(placement)} icon={placement ? <Crosshair aria-hidden="true" size={15} /> : <Plus aria-hidden="true" size={15} />} onClick={onAdd} size="sm" variant="primary">{placement ? 'Placing POM' : 'Add POM'}</Button>
  </div>;
}

function PomFlatSurface({ asset, flat, focused, hoveredId, onHover, onOpenFlats, onPlace, onSelect, placement, points, selectedId, versionLabel, view, zoom }: { asset?: CanonicalMediaAsset; flat: CanonicalTechnicalFlat | null; focused: boolean; hoveredId: string; onHover: (id: string) => void; onOpenFlats: () => void; onPlace: (view: PomView, anchor: { x: number; y: number }) => void; onSelect: (id: string) => void; placement: Placement | null; points: CanonicalPomPoint[]; selectedId: string; versionLabel?: string; view: PomView; zoom: number }) {
  const [url, setUrl] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
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

  const placeFromEvent = (event: MouseEvent<HTMLDivElement>) => {
    if (!placement || !asset) return;
    if ((event.target as HTMLElement).closest('button')) return;
    const bounds = contentRef.current?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect();
    onPlace(view, normalizedAnchor(event.clientX, event.clientY, bounds));
  };
  const placeFromKeyboard = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!placement || !asset || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    onPlace(view, { x: .5, y: .5 });
  };

  return <section aria-label={`${viewTitle(view)} flat POM surface`} className={cn('pom-flat-surface', focused && 'pom-flat-surface--focused', placement && asset && 'pom-flat-surface--placing')} data-testid={`pom-flat-${view}`}>
    <header><span>{view.toUpperCase()}</span>{flat ? <small>{revisionLabel(flat, asset, versionLabel)}</small> : <small>Flat missing</small>}</header>
    <div
      aria-label={placement && asset ? `Place POM on ${viewTitle(view)} flat` : undefined}
      className="pom-flat-surface__stage"
      onClick={placeFromEvent}
      onKeyDown={placeFromKeyboard}
      role={placement && asset ? 'button' : undefined}
      tabIndex={placement && asset ? 0 : undefined}
    >
      <div className="pom-flat-surface__content" ref={contentRef} style={{ transform: `scale(${zoom})` }}>
        {url && asset?.mimeType.startsWith('image/') ? <img alt={`${viewTitle(view)} technical flat`} draggable={false} src={url} /> : asset ? <div className="pom-flat-surface__missing"><strong>{asset.name}</strong><p>This source type cannot be previewed on the canvas.</p></div> : <div className="pom-flat-surface__missing"><Focus aria-hidden="true" size={27} /><strong>Add the {viewTitle(view)} flat</strong><p>POM anchors need the garment’s canonical technical source.</p><Button onClick={onOpenFlats} size="sm">Open Flats</Button></div>}
        {asset ? points.map((point) => <PomMarker hovered={hoveredId === point.id} key={point.id} onHover={onHover} onSelect={onSelect} point={point} selected={selectedId === point.id} />) : null}
      </div>
    </div>
  </section>;
}

function PomMarker({ hovered, onHover, onSelect, point, selected }: { hovered: boolean; onHover: (id: string) => void; onSelect: (id: string) => void; point: CanonicalPomPoint; selected: boolean }) {
  return <button
    aria-label={`${point.code}: ${point.name}. ${point.method}`}
    aria-pressed={selected}
    className={cn('pom-marker', selected && 'pom-marker--selected', hovered && 'pom-marker--hovered')}
    onBlur={() => onHover('')}
    onClick={(event) => { event.stopPropagation(); onSelect(point.id); }}
    onFocus={() => onHover(point.id)}
    onMouseEnter={() => onHover(point.id)}
    onMouseLeave={() => onHover('')}
    style={{ left: `${point.diagramAnchor.x * 100}%`, top: `${point.diagramAnchor.y * 100}%` }}
    title={`${point.code} · ${point.name}\n${point.method}`}
    type="button"
  >{String(point.sortOrder + 1).padStart(2, '0')}</button>;
}

function PomInspector({ back, focusId, front, hoveredId, issues, listRefs, mode, onBeginCreate, onCancel, onCreate, onEdit, onHover, onRePlace, onSave, onSelect, points, search, selected, setSearch, spec, state }: { back: FlatSource; focusId: string; front: FlatSource; hoveredId: string; issues: string[]; listRefs: MutableRefObject<Map<string, HTMLButtonElement>>; mode: 'browse' | 'create' | 'edit'; onBeginCreate: (input: { code: string; method: string; name: string }) => void; onCancel: () => void; onCreate: () => void; onEdit: () => void; onHover: (id: string) => void; onRePlace: (point: CanonicalPomPoint) => void; onSave: (point: CanonicalPomPoint, input: { method: string; name: string }) => void; onSelect: (id: string) => void; points: CanonicalPomPoint[]; search: string; selected: CanonicalPomPoint | null; setSearch: (value: string) => void; spec: CanonicalTechnicalSpec; state: CanonicalWorkspaceState }) {
  const normalizedSearch = search.trim().toLowerCase();
  const filtered = points.filter((point) => !normalizedSearch || `${point.code} ${point.name} ${point.method}`.toLowerCase().includes(normalizedSearch));
  const groups = groupPoints(filtered);
  const baseSet = state.measurementSets.find((set) => set.specId === spec.id && set.sampleType === 'base') ?? state.measurementSets.find((set) => set.specId === spec.id);
  const baseValue = selected && baseSet ? state.measurementValues.find((value) => value.setId === baseSet.id && value.pomPointId === selected.id && value.size === baseSet.baseSize) : null;
  const gradeCount = selected ? state.gradeRuleValues.filter((value) => value.pomPointId === selected.id).length : 0;
  const selectedSource = selected ? (pointView(selected) === 'front' ? front : back) : null;

  return <aside aria-label="POM inspector" className="pom-inspector">
    <section className="pom-inspector__section pom-inspector__list">
      <div className="pom-inspector__title"><div><p>POM INSPECTOR</p><h2 className="font-display text-xl">Measurement map</h2></div></div>
      <label className="pom-search"><Search aria-hidden="true" size={16} /><span className="sr-only">Search POMs</span><input aria-label="Search POMs" onChange={(event) => setSearch(event.currentTarget.value)} placeholder="Search POMs…" value={search} /></label>
      <Button className="w-full" icon={<Plus aria-hidden="true" size={15} />} onClick={onCreate} size="sm" variant="primary">Add POM</Button>
      <div className="pom-list">{groups.length ? groups.map(([group, groupPoints]) => <div className="pom-list__group" key={group}><h3>{group}</h3>{groupPoints.map((point) => <button
        aria-pressed={focusId === point.id}
        className={cn('pom-list__item', focusId === point.id && 'pom-list__item--selected', hoveredId === point.id && 'pom-list__item--hovered')}
        key={point.id}
        onClick={() => onSelect(point.id)}
        onFocus={() => onHover(point.id)}
        onMouseEnter={() => onHover(point.id)}
        onMouseLeave={() => onHover('')}
        ref={(node) => { if (node) listRefs.current.set(point.id, node); else listRefs.current.delete(point.id); }}
        type="button"
      ><span>{String(point.sortOrder + 1).padStart(2, '0')}</span><div><strong>{point.name}</strong><small>{point.code} · {viewTitle(pointView(point))}</small></div>{pomReady(point, pointView(point) === 'front' ? front.asset : back.asset) ? <Check aria-label="Ready" size={14} /> : <AlertTriangle aria-label="Needs attention" size={14} />}</button>)}</div>) : <p className="pom-inspector__empty">{points.length ? 'No POMs match this search.' : 'No POMs yet. Add the first point to begin mapping the garment.'}</p>}</div>
    </section>

    {mode === 'create' ? <PomCreateEditor onCancel={onCancel} onPlace={onBeginCreate} /> : selected ? mode === 'edit' ? <PomEditEditor onCancel={onCancel} onSave={onSave} point={selected} /> : <section className="pom-inspector__section pom-selected">
      <div className="pom-inspector__title"><div><p>SELECTED POM</p><h2 className="font-display text-xl">{String(selected.sortOrder + 1).padStart(2, '0')} · {selected.name}</h2></div><Badge variant="blue">{selected.code}</Badge></div>
      <dl>
        <div><dt>Measurement method</dt><dd>{selected.method}</dd></div>
        <div><dt>View</dt><dd>{viewTitle(pointView(selected))}</dd></div>
        <div><dt>Source</dt><dd>{selectedSource?.flat ? `${viewTitle(pointView(selected))} · ${revisionLabel(selectedSource.flat, selectedSource.asset, selectedSource.versionLabel)}` : 'Flat unavailable'}</dd></div>
        <div><dt>Tolerance</dt><dd>{baseValue ? `+${baseValue.tolerancePlus} / −${baseValue.toleranceMinus} ${spec.unit}` : 'Add in Measurements'}</dd></div>
        <div><dt>Grade information</dt><dd>{gradeCount ? `${gradeCount} linked grade step${gradeCount === 1 ? '' : 's'}` : 'Not defined'}</dd></div>
        <div><dt>Display type</dt><dd>Point</dd></div>
      </dl>
      <ul className="pom-selected__status"><li><Check aria-hidden="true" size={14} /> Anchor placed · {viewTitle(pointView(selected))}</li><li><Check aria-hidden="true" size={14} /> Method defined</li>{baseValue ? <li><Check aria-hidden="true" size={14} /> Base tolerance defined</li> : <li><AlertTriangle aria-hidden="true" size={14} /> Base tolerance not yet defined</li>}{selectedSource?.asset ? null : <li><AlertTriangle aria-hidden="true" size={14} /> Referenced flat unavailable</li>}</ul>
      <div className="flex flex-wrap gap-2"><Button icon={<Save aria-hidden="true" size={14} />} onClick={onEdit} size="sm">Edit</Button><Button icon={<Crosshair aria-hidden="true" size={14} />} onClick={() => onRePlace(selected)} size="sm">Re-place</Button></div>
    </section> : null}

    <section className="pom-inspector__section pom-validation"><div className="pom-inspector__title"><div><p>COMPLETENESS</p><h2 className="font-display text-xl">{issues.length ? `${issues.length} item${issues.length === 1 ? '' : 's'} to review` : 'Mapping complete'}</h2></div>{issues.length ? <AlertTriangle aria-hidden="true" className="text-ember" size={18} /> : <Check aria-hidden="true" className="text-teal" size={18} />}</div>{issues.length ? <ul>{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : <p>Front and Back sources are present and every POM has a usable mapping.</p>}</section>
  </aside>;
}

function PomCreateEditor({ onCancel, onPlace }: { onCancel: () => void; onPlace: (input: { code: string; method: string; name: string }) => void }) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onPlace({ code: String(form.get('code') ?? ''), method: String(form.get('method') ?? ''), name: String(form.get('name') ?? '') });
  };
  return <section className="pom-inspector__section"><p className="pom-inspector__eyebrow">NEW POM</p><h2 className="font-display text-xl">Define, then place</h2><form className="pom-editor" onSubmit={submit}><label>Code<input autoFocus className="field" name="code" placeholder="CH-02" required /></label><label>Name<input className="field" name="name" placeholder="Chest width" required /></label><label>Measurement method<textarea className="field min-h-28 py-2" name="method" placeholder={'Measure straight across 1" below armhole'} required /></label><div className="pom-editor__readout"><span>Display type</span><strong>Point</strong></div><div className="flex flex-wrap gap-2"><Button icon={<Crosshair aria-hidden="true" size={15} />} type="submit" size="sm" variant="primary">Place on canvas</Button><Button onClick={onCancel} size="sm">Cancel</Button></div></form></section>;
}

function PomEditEditor({ onCancel, onSave, point }: { onCancel: () => void; onSave: (point: CanonicalPomPoint, input: { method: string; name: string }) => void; point: CanonicalPomPoint }) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave(point, { method: String(form.get('method') ?? ''), name: String(form.get('name') ?? '') });
  };
  return <section className="pom-inspector__section"><p className="pom-inspector__eyebrow">EDIT POM</p><h2 className="font-display text-xl">{point.code}</h2><form className="pom-editor" key={`${point.id}:${point.revision}`} onSubmit={submit}><label>Name<input className="field" defaultValue={point.name} name="name" required /></label><label>Measurement method<textarea className="field min-h-32 py-2" defaultValue={point.method} name="method" required /></label><div className="pom-editor__readout"><span>Mapped view</span><strong>{viewTitle(pointView(point))}</strong></div><div className="flex flex-wrap gap-2"><Button icon={<Save aria-hidden="true" size={15} />} size="sm" type="submit" variant="primary">Save POM</Button><Button onClick={onCancel} size="sm">Cancel</Button></div></form></section>;
}

type FlatSource = { asset?: CanonicalMediaAsset; flat: CanonicalTechnicalFlat | null; versionLabel?: string };
function resolveFlat(state: CanonicalWorkspaceState, specId: string, view: PomView): FlatSource {
  const flat = activeFlat(state, specId, view);
  return { flat, asset: state.mediaAssets.find((asset) => asset.id === flat?.assetId), versionLabel: state.technicalFiles.find((file) => file.assetId === flat?.assetId && file.specId === specId)?.versionLabel };
}
export function normalizedAnchor(clientX: number, clientY: number, bounds: Pick<DOMRect, 'height' | 'left' | 'top' | 'width'>) {
  return { x: clamp((clientX - bounds.left) / bounds.width), y: clamp((clientY - bounds.top) / bounds.height) };
}
export function pointView(point: Pick<CanonicalPomPoint, 'diagramAnchor'>): PomView { return point.diagramAnchor.view === 'back' ? 'back' : 'front'; }
function clamp(value: number) { return Math.min(1, Math.max(0, value)); }
function viewTitle(view: PomView) { return view === 'front' ? 'Front' : 'Back'; }
function revisionLabel(flat: CanonicalTechnicalFlat, asset?: CanonicalMediaAsset, versionLabel?: string) { return `${asset?.name ?? 'Source'} · ${versionLabel ?? `Rev ${String(flat.sortOrder + 1).padStart(2, '0')}`}`; }
function placementLabel(placement: Placement, points: CanonicalPomPoint[]) { if (placement.kind === 'create') return `Placing ${placement.code} · ${placement.name}`; const point = points.find((item) => item.id === placement.pointId); return `Re-placing ${point?.code ?? 'POM'}`; }
function pomReady(point: CanonicalPomPoint, asset?: CanonicalMediaAsset) { return Boolean(point.method.trim() && asset && [point.diagramAnchor.x, point.diagramAnchor.y].every((value) => Number.isFinite(value) && value >= 0 && value <= 1)); }
function pomIssues(points: CanonicalPomPoint[], front?: CanonicalMediaAsset, back?: CanonicalMediaAsset) { const issues: string[] = []; if (!front) issues.push('Front flat is required for POM mapping.'); if (!back) issues.push('Back flat is required for complete garment context.'); for (const point of points) { if (!point.method.trim()) issues.push(`${point.code} needs a measurement method.`); if (!(pointView(point) === 'front' ? front : back)) issues.push(`${point.code} references an unavailable ${pointView(point)} flat.`); } return [...new Set(issues)]; }
function groupPoints(points: CanonicalPomPoint[]) { const order = ['BODY', 'SHOULDER / NECK', 'SLEEVE', 'DETAIL PLACEMENT', 'OTHER']; const groups = new Map(order.map((group) => [group, [] as CanonicalPomPoint[]])); for (const point of points) groups.get(inferGroup(point))!.push(point); return order.map((group) => [group, groups.get(group)!] as const).filter(([, items]) => items.length); }
function inferGroup(point: CanonicalPomPoint) { const text = `${point.code} ${point.name} ${point.method}`.toLowerCase(); if (/sleeve|bicep|cuff|armhole/.test(text)) return 'SLEEVE'; if (/shoulder|neck|collar|hps/.test(text)) return 'SHOULDER / NECK'; if (/pocket|button|placement|zip|detail/.test(text)) return 'DETAIL PLACEMENT'; if (/length|chest|body|waist|sweep|hip|back/.test(text)) return 'BODY'; return 'OTHER'; }
