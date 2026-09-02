import { AlertTriangle, ArrowRight, ChevronRight, CircleCheck, ClipboardList, Search, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Badge } from '../../components/shared/Badge';
import { Button } from '../../components/shared/Button';
import { CanonicalMediaImage } from '../../components/shared/CanonicalMediaImage';
import { Card } from '../../components/shared/Card';
import type { CanonicalWorkspaceState } from '../../domains/workspace';
import { canonicalGarmentCover } from '../../lib/canonicalGarmentPresentation';
import { cn } from '../../lib/classes';
import { technicalLandingGarments, type TechnicalLandingGarment, type TechnicalReadinessState } from '../../lib/technicalLandingPresentation';

type LandingView = 'garments' | 'release' | 'issues';
type ReadinessFilter = 'all' | TechnicalReadinessState;
type SortOption = 'attention' | 'updated' | 'readiness' | 'name';

export function TechnicalStudioLanding({ onOpenGarment, state }: { onOpenGarment: (garmentId: string) => void; state: CanonicalWorkspaceState }) {
  const [view, setView] = useState<LandingView>('garments');
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState('all');
  const [readiness, setReadiness] = useState<ReadinessFilter>('all');
  const [needsAttention, setNeedsAttention] = useState(false);
  const [sort, setSort] = useState<SortOption>('attention');
  const allRows = useMemo(() => technicalLandingGarments(state), [state]);
  const rows = useMemo(() => filterAndSort(allRows, { needsAttention, phase, query, readiness, sort }), [allRows, needsAttention, phase, query, readiness, sort]);
  const releaseReady = allRows.filter((item) => item.readiness.state === 'release_ready').length;
  const openIssues = allRows.reduce((total, item) => total + item.issues.length, 0);

  return <section className="technical-landing space-y-6 lg:space-y-8" data-testid="technical-studio-landing">
    <header className="technical-landing__header">
      <div>
        <p className="text-[0.67rem] font-medium uppercase tracking-[0.2em] text-ember/72">Technical Studio</p>
        <h1 className="font-display mt-3 text-4xl text-stardust sm:text-5xl">Technical Studio</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stardust/62">Prepare garments for development, sampling, and release.</p>
      </div>
      <p aria-label={`${allRows.length} garments, ${releaseReady} release ready, ${openIssues} open issues`} className="technical-status-strip">
        <strong>{allRows.length} Garment{allRows.length === 1 ? '' : 's'}</strong><span aria-hidden="true">·</span><strong>{releaseReady} Release Ready</strong><span aria-hidden="true">·</span><strong className={openIssues ? 'text-ember' : 'text-teal'}>{openIssues} Open Issue{openIssues === 1 ? '' : 's'}</strong>
      </p>
    </header>

    <nav aria-label="Technical Studio views" className="technical-landing-tabs">
      {([['garments', 'Garments'], ['release', 'Release queue'], ['issues', 'Issues']] as const).map(([id, label]) => <button aria-current={view === id ? 'page' : undefined} className={cn('technical-landing-tab', view === id && 'technical-landing-tab--active')} key={id} onClick={() => setView(id)} type="button">{label}</button>)}
    </nav>

    <TechnicalToolbar needsAttention={needsAttention} onNeedsAttentionChange={setNeedsAttention} onPhaseChange={setPhase} onQueryChange={setQuery} onReadinessChange={setReadiness} onSortChange={setSort} phase={phase} query={query} readiness={readiness} sort={sort} state={state} />

    {view === 'garments' ? <GarmentBoard rows={rows} state={state} onOpenGarment={onOpenGarment} /> : null}
    {view === 'release' ? <ReleaseQueue rows={rows} state={state} onOpenGarment={onOpenGarment} /> : null}
    {view === 'issues' ? <IssuesView rows={rows} onOpenGarment={onOpenGarment} /> : null}
  </section>;
}

function TechnicalToolbar({ needsAttention, onNeedsAttentionChange, onPhaseChange, onQueryChange, onReadinessChange, onSortChange, phase, query, readiness, sort, state }: {
  needsAttention: boolean;
  onNeedsAttentionChange: (value: boolean) => void;
  onPhaseChange: (value: string) => void;
  onQueryChange: (value: string) => void;
  onReadinessChange: (value: ReadinessFilter) => void;
  onSortChange: (value: SortOption) => void;
  phase: string;
  query: string;
  readiness: ReadinessFilter;
  sort: SortOption;
  state: CanonicalWorkspaceState;
}) {
  const phases = [...new Set(state.garments.map((garment) => garment.phase))].sort();
  return <div aria-label="Technical Studio filters" className="technical-toolbar">
    <label className="technical-search"><Search aria-hidden="true" size={17}/><span className="sr-only">Search garments</span><input onChange={(event) => onQueryChange(event.target.value)} placeholder="Search garments" value={query}/></label>
    <label><span className="sr-only">Filter by studio phase</span><select className="field" onChange={(event) => onPhaseChange(event.target.value)} value={phase}><option value="all">All phases</option>{phases.map((item) => <option key={item} value={item}>{humanize(item)}</option>)}</select></label>
    <label><span className="sr-only">Filter by technical readiness</span><select className="field" onChange={(event) => onReadinessChange(event.target.value as ReadinessFilter)} value={readiness}><option value="all">All readiness</option><option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="needs_attention">Needs attention</option><option value="nearly_ready">Nearly ready</option><option value="release_ready">Release ready</option></select></label>
    <label><span className="sr-only">Sort garments</span><select className="field" onChange={(event) => onSortChange(event.target.value as SortOption)} value={sort}><option value="attention">Needs attention</option><option value="updated">Recently updated</option><option value="readiness">Closest to release</option><option value="name">Garment name</option></select></label>
    <Button aria-pressed={needsAttention} className="technical-attention-filter" icon={<SlidersHorizontal aria-hidden="true" size={16}/>} onClick={() => onNeedsAttentionChange(!needsAttention)} size="sm" variant={needsAttention ? 'primary' : 'secondary'}>Needs attention</Button>
  </div>;
}

function GarmentBoard({ onOpenGarment, rows, state }: { onOpenGarment: (id: string) => void; rows: TechnicalLandingGarment[]; state: CanonicalWorkspaceState }) {
  if (!rows.length) return <EmptyState title="No garments in this technical view" detail="Adjust the filters or begin a new garment to prepare its technical work." />;
  return <div className="technical-garment-board" data-testid="technical-garment-board">{rows.map((row) => <TechnicalGarmentCard key={row.garment.id} onOpen={() => onOpenGarment(row.garment.id)} row={row} state={state} />)}</div>;
}

function TechnicalGarmentCard({ onOpen, row, state }: { onOpen: () => void; row: TechnicalLandingGarment; state: CanonicalWorkspaceState }) {
  const cover = canonicalGarmentCover(state, row.garment.id);
  const collection = state.collections.find((item) => item.id === row.garment.collectionId);
  return <button aria-label={`Open Technical Studio for ${row.garment.title}. ${row.readiness.label}; ${row.issues.length} open technical issue${row.issues.length === 1 ? '' : 's'}.`} className="technical-garment-card group" onClick={onOpen} type="button">
    <span className="technical-garment-card__image"><CanonicalMediaImage alt={`${row.garment.title} garment cover`} asset={cover} className="h-full w-full rounded-none border-0" derivatives={state.mediaDerivatives} mode="library" /></span>
    <span className="technical-garment-card__content">
      <span className="flex flex-wrap items-center justify-between gap-2"><span className="technical-eyebrow">{humanize(row.garment.phase)}</span><ReadinessBadge readiness={row.readiness} /></span>
      <span className="mt-2 block font-display text-2xl leading-tight text-stardust">{row.garment.title}</span>
      <span className="mt-2 block text-sm text-stardust/52">{collection?.name ?? 'Independent piece'} · {row.garment.garmentType}</span>
      <span className="technical-readiness"><span>Technical readiness</span><strong>{row.readiness.percent}%</strong><span className="technical-readiness__track" aria-hidden="true"><span style={{ width: `${row.readiness.percent}%` }}/></span></span>
      <ProgressRail progress={row.progress} />
      <span className="technical-card-footer"><span className={row.issues.length ? 'text-ember' : 'text-teal'}>{row.issues.length ? `${row.issues.length} item${row.issues.length === 1 ? '' : 's'} need attention` : 'Technical checks are clear'}</span><span className="technical-card-next"><span>Next</span><strong>{row.nextAction}</strong></span></span>
      <span className="technical-card-cta">Continue technical work <ArrowRight aria-hidden="true" size={16}/></span>
    </span>
  </button>;
}

function ProgressRail({ progress }: { progress: TechnicalLandingGarment['progress'] }) {
  return <span aria-label={progress.map((item) => `${item.label}: ${humanize(item.state)}`).join(', ')} className="technical-progress-rail">{progress.map((item) => <span className="technical-progress-step" key={item.id}><span aria-hidden="true" className={cn('technical-progress-dot', `technical-progress-dot--${item.state}`)} /><span>{item.label}</span></span>)}</span>;
}

function ReadinessBadge({ readiness }: { readiness: TechnicalLandingGarment['readiness'] }) {
  const variant = readiness.state === 'release_ready' ? 'teal' : readiness.state === 'needs_attention' ? 'ember' : readiness.state === 'nearly_ready' ? 'bronze' : 'blue';
  return <Badge variant={variant}>{readiness.label}</Badge>;
}

function ReleaseQueue({ onOpenGarment, rows, state }: { onOpenGarment: (id: string) => void; rows: TechnicalLandingGarment[]; state: CanonicalWorkspaceState }) {
  if (!rows.length) return <EmptyState title="No garments in this release queue" detail="Adjust the filters to review technical release readiness." />;
  return <Card className="overflow-hidden p-0"><div className="flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="technical-eyebrow">Power view</p><h2 className="font-display mt-2 text-3xl">Release queue</h2><p className="mt-2 text-sm text-stardust/55">Scan each garment’s working spec, required flats, and remaining release work.</p></div><Badge variant="bronze">{rows.length} garments</Badge></div><div aria-label="Technical release queue" className="overflow-x-auto" role="region" tabIndex={0}><table className="workbench-table w-full min-w-[52rem] text-left text-sm"><thead className="text-xs uppercase tracking-[0.13em] text-stardust/50"><tr><th className="p-4">Garment</th><th className="p-4">Spec</th><th className="p-4">Required flats</th><th className="p-4">Readiness</th><th className="p-4">Open work</th><th className="p-4"><span className="sr-only">Open</span></th></tr></thead><tbody>{rows.map((row) => { const front = row.spec ? Number(Boolean(state.technicalFlats.find((flat) => flat.specId === row.spec!.id && flat.view === 'front'))) : 0; const back = row.spec ? Number(Boolean(state.technicalFlats.find((flat) => flat.specId === row.spec!.id && flat.view === 'back'))) : 0; return <tr key={row.garment.id}><td className="p-4"><strong>{row.garment.title}</strong><span className="mt-1 block text-xs text-stardust/45">{row.garment.garmentCode} · {humanize(row.garment.phase)}</span></td><td className="p-4">{row.spec ? `${row.spec.baseSize} · ${row.spec.revisionLabel}` : 'Not started'}</td><td className="p-4">{front + back}/2</td><td className="p-4"><ReadinessBadge readiness={row.readiness} /></td><td className="p-4"><span className={row.issues.length ? 'text-ember' : 'text-teal'}>{row.issues.length ? `${row.issues.length} issue${row.issues.length === 1 ? '' : 's'}` : 'Clear'}</span></td><td className="p-4 text-right"><Button onClick={() => onOpenGarment(row.garment.id)} size="sm">Open technical work</Button></td></tr>; })}</tbody></table></div><ul aria-label="Technical release queue details" className="space-y-3 p-4 md:hidden">{rows.map((row) => <li className="rounded-xl border border-bronze/18 bg-stardust/[0.025] p-4" key={row.garment.id}><div className="flex items-start justify-between gap-3"><div><strong>{row.garment.title}</strong><p className="mt-1 text-xs text-stardust/45">{row.spec ? `${row.spec.baseSize} · ${row.spec.revisionLabel}` : 'Technical spec not started'}</p></div><ReadinessBadge readiness={row.readiness} /></div><p className="mt-4 text-sm text-stardust/58">{row.issues.length ? `${row.issues.length} release item${row.issues.length === 1 ? '' : 's'} need attention.` : 'Technical release checks are clear.'}</p><Button className="mt-4 w-full" onClick={() => onOpenGarment(row.garment.id)} size="sm">Open technical work</Button></li>)}</ul></Card>;
}

function IssuesView({ onOpenGarment, rows }: { onOpenGarment: (id: string) => void; rows: TechnicalLandingGarment[] }) {
  const issues = rows.flatMap((row) => row.issues.map((issue) => ({ issue, row })));
  if (!issues.length) return <EmptyState icon={<CircleCheck aria-hidden="true" className="text-teal" size={32}/>} title="Technical work is clear" detail="No open release checks match this view. Keep reviewing each garment as specifications evolve." />;
  return <div className="technical-issues-list" data-testid="technical-issues-list">{issues.map(({ issue, row }) => <button className="technical-issue" key={`${row.garment.id}-${issue.code}-${issue.field}`} onClick={() => onOpenGarment(row.garment.id)} type="button"><span className={cn('technical-issue__icon', issue.severity === 'critical' || issue.severity === 'error' ? 'text-ember' : 'text-bronze')}><AlertTriangle aria-hidden="true" size={18}/></span><span className="min-w-0 flex-1 text-left"><span className="flex flex-wrap items-center justify-between gap-3"><strong>{issue.message}</strong><Badge variant={issue.severity === 'warning' ? 'bronze' : 'ember'}>{issue.severity === 'critical' ? 'Blocker' : issue.severity === 'warning' ? 'Review' : 'Needs attention'}</Badge></span><span className="mt-1 block text-sm text-stardust/52">{row.garment.title} · {humanize(issue.domain ?? 'technical')}</span><span className="mt-2 inline-flex items-center gap-1 text-xs text-ember">Open technical work <ChevronRight aria-hidden="true" size={14}/></span></span></button>)}</div>;
}

function EmptyState({ detail, icon = <ClipboardList aria-hidden="true" className="text-ember/70" size={32}/>, title }: { detail: string; icon?: ReactNode; title: string }) {
  return <div className="atelier-empty-state flex min-h-[20rem] flex-col items-center justify-center"><span>{icon}</span><h2 className="font-display mt-5 text-3xl text-stardust">{title}</h2><p className="mt-3 max-w-md text-sm leading-6 text-stardust/55">{detail}</p></div>;
}

function filterAndSort(rows: TechnicalLandingGarment[], filters: { needsAttention: boolean; phase: string; query: string; readiness: ReadinessFilter; sort: SortOption }) {
  const normalizedQuery = filters.query.trim().toLowerCase();
  return rows.filter((row) => {
    const matchesQuery = !normalizedQuery || [row.garment.title, row.garment.garmentCode, row.garment.garmentType].join(' ').toLowerCase().includes(normalizedQuery);
    return matchesQuery && (filters.phase === 'all' || row.garment.phase === filters.phase) && (filters.readiness === 'all' || row.readiness.state === filters.readiness) && (!filters.needsAttention || row.issues.length > 0);
  }).sort((left, right) => {
    if (filters.sort === 'updated') return right.garment.updatedAt.localeCompare(left.garment.updatedAt);
    if (filters.sort === 'readiness') return right.readiness.percent - left.readiness.percent || left.garment.title.localeCompare(right.garment.title);
    if (filters.sort === 'name') return left.garment.title.localeCompare(right.garment.title);
    return right.issues.length - left.issues.length || left.readiness.percent - right.readiness.percent || left.garment.title.localeCompare(right.garment.title);
  });
}

function humanize(value: string) { return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }
