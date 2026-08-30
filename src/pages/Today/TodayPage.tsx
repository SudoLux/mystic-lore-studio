import { Activity, ArrowRight, BookOpen, CalendarCheck2, PackageSearch, Plus, RefreshCw, Shirt, Sparkles } from 'lucide-react';
import { Button } from '../../components/shared/Button';
import { CanonicalMediaImage } from '../../components/shared/CanonicalMediaImage';
import { MobilePageHeader } from '../../components/shared/MobilePageHeader';
import { PageHeader } from '../../components/shared/PageHeader';
import { materialAvailableQuantity, type CanonicalGarment, type CanonicalWorkspaceState } from '../../domains/workspace';
import { useCanonicalWorkspace } from '../../hooks/useCanonicalWorkspace';
import { canonicalGarmentCover, canonicalGarmentSwatches, recentCanonicalGarments, recommendedGarmentAction } from '../../lib/canonicalGarmentPresentation';
import type { PageId } from '../../types/navigation';

export function TodayPage({ onNavigate, onOpenGarment }: { onNavigate: (page: PageId) => void; onOpenGarment: (garmentId: string) => void }) {
  const workspace = useCanonicalWorkspace();
  if (!workspace.isReady || !workspace.state) return <DashboardLoading error={workspace.error} onRetry={workspace.retry} />;

  const state = workspace.state;
  const activeGarments = recentCanonicalGarments(state.garments.filter((garment) => !['archived', 'cancelled'].includes(garment.status)));
  const featuredGarment = activeGarments[0] ?? null;
  const featuredCover = featuredGarment ? canonicalGarmentCover(state, featuredGarment.id) : null;
  const featuredSwatches = featuredGarment ? canonicalGarmentSwatches(state, featuredGarment.id) : [];
  const featuredAction = featuredGarment ? recommendedGarmentAction(featuredGarment) : null;
  const openTasks = state.releaseTasks.filter((task) => !['done', 'cancelled'].includes(task.status));
  const lowInventory = state.materialVariants.filter((variant) => materialAvailableQuantity(state, variant.id) < 5);
  const recentActivity = [...state.changeEvents].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)).slice(0, 5);
  const collections = new Map(state.collections.map((collection) => [collection.id, collection]));
  const nextTask = featuredGarment ? [...openTasks].filter((task) => task.garmentId === featuredGarment.id).sort((left, right) => priority(left.priority) - priority(right.priority) || (left.dueAt ?? '9999').localeCompare(right.dueAt ?? '9999'))[0] : undefined;
  const metrics = [
    { icon: Shirt, label: 'garments', value: activeGarments.length },
    { icon: CalendarCheck2, label: 'open tasks', value: openTasks.length },
    { icon: PackageSearch, label: 'material watches', value: lowInventory.length },
    { icon: BookOpen, label: 'editorial drafts', value: state.editorialCollections.filter((item) => item.status === 'draft').length },
  ];

  return <section className="space-y-7 lg:space-y-9">
    <MobilePageHeader action={<Button className="h-11 w-11 rounded-full p-0" onClick={() => onNavigate('projects')} aria-label="Create garment"><Plus aria-hidden="true" /></Button>} badge="Today" kicker="Your atelier at a glance" title="Today in Studio" />
    <PageHeader badge="Today" description="Return to the garment that needs your eye, then move naturally into the next creative decision." title="Studio">
      <div className="flex flex-wrap gap-2"><Button icon={<Plus aria-hidden="true" size={16} />} onClick={() => onNavigate('projects')}>New garment</Button><Button onClick={() => onNavigate('kanban')} variant="ghost">View plan</Button></div>
    </PageHeader>
    {workspace.syncState === 'offline' ? <div className="rounded-2xl border border-ember/30 bg-ember/[0.08] px-4 py-3 text-sm text-stardust/72" role="status">Offline: your visual workspace is available from the canonical cache. Release and publish still require a fresh connection.</div> : null}

    {featuredGarment ? <article className="relative isolate overflow-hidden rounded-[1.7rem] border border-bronze/24 bg-midnight/56 shadow-[0_28px_80px_rgba(0,0,0,0.28)]" data-testid="featured-garment">
      <div className="grid min-h-[31rem] lg:grid-cols-[1.25fr_0.75fr]">
        <div className="relative min-h-[24rem] lg:min-h-full"><CanonicalMediaImage alt={`${featuredGarment.title} featured garment`} asset={featuredCover} className="absolute inset-0 rounded-none border-0" derivatives={state.mediaDerivatives} mode="hero" priority /><div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,rgba(10,10,10,0.72)_100%)] lg:bg-[linear-gradient(90deg,transparent_52%,rgba(10,10,10,0.74)_100%)]" /><div className="absolute bottom-5 left-5 flex items-center gap-2 lg:hidden"><PhasePill phase={featuredGarment.phase} /><MaterialSwatches swatches={featuredSwatches} /></div></div>
        <div className="relative flex flex-col justify-between p-6 sm:p-8 lg:p-10">
          <div><p className="text-[0.68rem] font-medium uppercase tracking-[0.22em] text-ember/78">Featured garment</p><h2 className="font-display mt-4 text-4xl leading-[0.98] text-stardust sm:text-5xl xl:text-6xl">{featuredGarment.title}</h2><p className="mt-4 text-sm text-stardust/52">{collections.get(featuredGarment.collectionId ?? '')?.name ?? 'Independent piece'} · {featuredGarment.garmentType}</p><div className="mt-6 hidden items-center gap-3 lg:flex"><PhasePill phase={featuredGarment.phase} /><MaterialSwatches swatches={featuredSwatches} /></div></div>
          <div className="mt-10 border-t border-bronze/18 pt-6"><p className="text-[0.66rem] font-medium uppercase tracking-[0.18em] text-stardust/42">Next move</p><h3 className="mt-2 text-xl font-semibold text-stardust">{nextTask?.title ?? featuredAction?.label}</h3><p className="mt-2 max-w-md text-sm leading-6 text-stardust/58">{nextTask?.description || featuredAction?.detail}</p><Button className="mt-6 w-full sm:w-auto" icon={<ArrowRight aria-hidden="true" size={16} />} onClick={() => onOpenGarment(featuredGarment.id)} variant="primary">{featuredAction?.label ?? 'Continue garment'}</Button></div>
        </div>
      </div>
    </article> : <EmptyStudio onCreate={() => onNavigate('projects')} />}

    <section aria-labelledby="recent-garments-heading"><div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-[0.66rem] uppercase tracking-[0.2em] text-ember/72">In the atelier</p><h2 className="font-display mt-2 text-3xl text-stardust" id="recent-garments-heading">Recent garments</h2></div><Button onClick={() => onNavigate('projects')} size="sm" variant="ghost">View all</Button></div>{activeGarments.length > 1 ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{activeGarments.slice(1, 5).map((garment) => <RecentGarmentCard garment={garment} key={garment.id} onOpen={() => onOpenGarment(garment.id)} state={state} />)}</div> : <div className="atelier-empty-state"><p className="text-sm text-stardust/56">Your next garments will gather here as the collection grows.</p></div>}</section>

    <div className="grid gap-6 xl:grid-cols-[1fr_0.72fr]">
      <section aria-labelledby="recent-activity-heading"><div className="mb-4 flex items-center gap-3"><Activity aria-hidden="true" className="text-ember" size={18} /><h2 className="text-lg font-semibold text-stardust" id="recent-activity-heading">Recent activity</h2></div><div className="divide-y divide-bronze/14 border-y border-bronze/16">{recentActivity.map((event) => <article className="flex items-start justify-between gap-5 py-4" key={event.id}><div><p className="text-sm font-medium capitalize text-stardust/82">{humanize(event.entityType)}</p><p className="mt-1 text-xs text-stardust/40">{humanize(event.operation)} · {event.origin}</p></div><time className="shrink-0 text-xs text-stardust/38" dateTime={event.occurredAt}>{formatDate(event.occurredAt)}</time></article>)}{!recentActivity.length ? <p className="py-6 text-sm text-stardust/48">Your garment decisions will appear here as the Studio takes shape.</p> : null}</div></section>
      <aside className="rounded-[1.35rem] bg-stardust/[0.025] p-5 sm:p-6" aria-label="Studio overview"><div className="flex items-center gap-2"><Sparkles aria-hidden="true" className="text-ember" size={17} /><p className="text-sm font-medium text-stardust/76">Studio overview</p></div><div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-5">{metrics.map(({ icon: Icon, label, value }) => <div key={label}><Icon aria-hidden="true" className="mb-2 text-stardust/32" size={16} /><p className="text-2xl font-semibold tabular-nums text-stardust/86">{value}</p><p className="mt-1 text-xs text-stardust/42">{label}</p></div>)}</div><Button className="mt-6 w-full" onClick={() => onNavigate('stats')} size="sm" variant="ghost">View studio signals</Button></aside>
    </div>
  </section>;
}

function RecentGarmentCard({ garment, onOpen, state }: { garment: CanonicalGarment; onOpen: () => void; state: CanonicalWorkspaceState }) { const cover = canonicalGarmentCover(state, garment.id); const collection = state.collections.find((item) => item.id === garment.collectionId); return <article className="group overflow-hidden rounded-[1.25rem] bg-stardust/[0.025] transition duration-300 hover:-translate-y-1 hover:bg-stardust/[0.045]"><CanonicalMediaImage alt={`${garment.title} garment`} asset={cover} className="aspect-[4/5] w-full rounded-b-none" derivatives={state.mediaDerivatives} fit="cover" mode="library" /><div className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-base font-semibold text-stardust">{garment.title}</h3><p className="mt-1 truncate text-xs text-stardust/44">{collection?.name ?? 'Independent piece'}</p></div><PhasePill phase={garment.phase} /></div><Button className="mt-4 w-full" onClick={onOpen} size="sm" variant="ghost">Continue</Button></div></article>; }
function PhasePill({ phase }: { phase: string }) { return <span className="inline-flex min-h-7 items-center rounded-full bg-midnight/68 px-2.5 text-[0.64rem] font-medium uppercase tracking-[0.13em] text-ember ring-1 ring-bronze/28">{phase}</span>; }
function MaterialSwatches({ swatches }: { swatches: ReturnType<typeof canonicalGarmentSwatches> }) { return swatches.length ? <div aria-label={`${swatches.length} selected materials`} className="flex -space-x-1">{swatches.map((swatch) => <span aria-label={`${swatch.materialName}, ${swatch.colorName}`} className="h-7 w-7 rounded-full border-2 border-midnight shadow-sm" key={swatch.id} role="img" style={{ background: swatch.colorHex ?? 'linear-gradient(135deg,#9a6c3c,#1b3a63)' }} />)}</div> : null; }
function EmptyStudio({ onCreate }: { onCreate: () => void }) { return <div className="atelier-empty-state flex min-h-[26rem] flex-col items-center justify-center"><Shirt aria-hidden="true" className="text-ember/62" size={38} /><p className="mt-5 text-[0.66rem] uppercase tracking-[0.2em] text-ember/70">A blank cutting table</p><h2 className="font-display mt-3 text-4xl text-stardust">Begin with a garment</h2><p className="mt-3 max-w-lg text-sm leading-6 text-stardust/52">Create the first piece, then let its imagery, materials, technical work, and story grow from one clear home.</p><Button className="mt-6" icon={<Plus aria-hidden="true" size={16} />} onClick={onCreate} variant="primary">Create garment</Button></div>; }
function DashboardLoading({ error, onRetry }: { error: string | null; onRetry: () => void }) { return <section className="space-y-5" aria-live="polite"><div className="h-24 animate-pulse rounded-2xl bg-stardust/[0.035]" /><div className="grid min-h-[31rem] animate-pulse overflow-hidden rounded-[1.7rem] border border-bronze/18 bg-stardust/[0.025] lg:grid-cols-[1.25fr_0.75fr]"><div className="bg-[linear-gradient(135deg,rgba(200,155,60,0.09),rgba(27,58,99,0.16))]" /><div className="flex items-center justify-center p-8"><div className="text-center"><RefreshCw aria-hidden="true" className={error ? 'mx-auto text-ember' : 'mx-auto animate-spin text-ember'} /><p className="mt-4 max-w-sm text-sm leading-6 text-stardust/56">{error ?? 'Preparing the garments and imagery in your Studio…'}</p>{error ? <Button className="mt-5" onClick={onRetry}>Retry</Button> : null}</div></div></div></section>; }
function priority(value: string) { return ({ urgent: 0, high: 1, medium: 2, low: 3 } as Record<string, number>)[value] ?? 4; }
function formatDate(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)); }
function humanize(value: string) { return value.replaceAll('_', ' '); }
