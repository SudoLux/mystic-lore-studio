import {
  Activity,
  BookOpen,
  CalendarCheck2,
  PackageSearch,
  Plus,
  RefreshCw,
  Shirt,
  Sparkles,
} from 'lucide-react';
import { Badge } from '../../components/shared/Badge';
import { Button } from '../../components/shared/Button';
import { Card } from '../../components/shared/Card';
import { FieldModePanel } from '../../components/shared/FieldModePanel';
import { MobilePageHeader } from '../../components/shared/MobilePageHeader';
import { PageHeader } from '../../components/shared/PageHeader';
import { useCanonicalWorkspace } from '../../hooks/useCanonicalWorkspace';
import { materialAvailableQuantity } from '../../domains/workspace';
import type { PageId } from '../../types/navigation';

export function TodayPage({ onNavigate, onOpenGarment }: { onNavigate: (page: PageId) => void; onOpenGarment: (garmentId: string) => void }) {
  const workspace = useCanonicalWorkspace();

  if (!workspace.isReady || !workspace.state) {
    return <Card><div aria-live="polite" className="flex min-h-56 flex-col items-center justify-center gap-4 text-center"><RefreshCw aria-hidden="true" className={workspace.error ? 'text-ember' : 'animate-spin text-ember'} /><p className="max-w-md text-sm leading-6 text-stardust/60">{workspace.error ?? 'Preparing today’s canonical studio view…'}</p>{workspace.error ? <Button onClick={workspace.retry}>Retry</Button> : null}</div></Card>;
  }

  const state = workspace.state;
  const activeGarments = state.garments.filter((garment) => !['archived', 'cancelled'].includes(garment.status));
  const openTasks = state.releaseTasks.filter((task) => !['done', 'cancelled'].includes(task.status));
  const lowInventory = state.materialVariants.filter((variant) => materialAvailableQuantity(state, variant.id) < 5);
  const recentActivity = [...state.changeEvents].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)).slice(0, 6);
  const nextTask = [...openTasks].sort((left, right) => priority(left.priority) - priority(right.priority) || (left.dueAt ?? '9999').localeCompare(right.dueAt ?? '9999'))[0];
  const firstGarment = activeGarments[0];

  const metrics = [
    { icon: Shirt, label: 'Active garments', value: activeGarments.length },
    { icon: CalendarCheck2, label: 'Open tasks', value: openTasks.length },
    { icon: PackageSearch, label: 'Low inventory', value: lowInventory.length },
    { icon: BookOpen, label: 'Editorial drafts', value: state.editorialCollections.filter((item) => item.status === 'draft').length },
  ];

  return (
    <section className="space-y-5">
      <MobilePageHeader action={<Button className="h-11 w-11 rounded-full p-0" onClick={() => onNavigate('projects')} aria-label="Create garment"><Plus aria-hidden="true" /></Button>} badge="Today" kicker={`${openTasks.length} accountable next moves`} title="Today in Studio" />
      <PageHeader badge="Today" description="A canonical daily cockpit for garment momentum, accountable next moves, material warnings, and recent authored change." title="Studio Command">
        <div className="flex flex-wrap gap-2"><Button icon={<Plus aria-hidden="true" size={16} />} onClick={() => onNavigate('projects')}>New garment</Button><Button onClick={() => onNavigate('kanban')} variant="secondary">Open Plan</Button></div>
      </PageHeader>

      {workspace.syncState === 'offline' ? <div className="rounded-2xl border border-ember/35 bg-ember/10 px-4 py-3 text-sm text-stardust/72" role="status">Offline: today’s view is available from the local canonical cache; release and publish remain server-fresh actions.</div> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ icon: Icon, label, value }) => <Card key={label}><div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.13em] text-stardust/45">{label}</p><p className="mt-3 text-4xl font-semibold tabular-nums text-stardust">{value}</p></div><span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-bronze/28 bg-midnight/46 text-ember"><Icon aria-hidden="true" size={19} /></span></div></Card>)}
      </div>

      <FieldModePanel
        captureLabel="Open today’s garment"
        description="Keep the next decision, capture route, and risk signal visible while moving through the atelier."
        moves={[
          { detail: nextTask ? `${nextTask.title}${nextTask.dueAt ? ` · due ${formatDate(nextTask.dueAt)}` : ''}` : 'No open canonical task.', label: 'Next accountable move', onSelect: () => onNavigate('kanban') },
          { detail: `${lowInventory.length} material variant${lowInventory.length === 1 ? '' : 's'} below the five-unit watch threshold.`, label: 'Material watch', onSelect: () => onNavigate('fabrics') },
        ]}
        onCapture={() => firstGarment ? onOpenGarment(firstGarment.id) : onNavigate('projects')}
        title="Studio pulse"
      />

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <div className="flex items-center justify-between gap-3"><div><Badge variant="teal">Garment focus</Badge><h2 className="mt-3 text-2xl font-semibold text-stardust">Current work</h2></div><Button onClick={() => onNavigate('projects')} size="sm" variant="ghost">All garments</Button></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {activeGarments.slice(0, 6).map((garment) => <button className="min-h-24 rounded-2xl border border-bronze/22 bg-stardust/[0.04] p-4 text-left transition hover:border-ember/44" key={garment.id} onClick={() => onOpenGarment(garment.id)} type="button"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-stardust">{garment.title}</p><p className="mt-1 text-xs text-stardust/44">{garment.garmentCode} · {garment.garmentType}</p></div><Badge variant="bronze">{garment.phase}</Badge></div></button>)}
            {!activeGarments.length ? <Empty title="No garments yet" detail="Create the first durable garment record to begin the studio thread." /> : null}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2"><Activity aria-hidden="true" className="text-ember" size={18} /><div><Badge variant="bronze">Activity & inbox</Badge><h2 className="mt-3 text-2xl font-semibold text-stardust">Recent authored change</h2></div></div>
          <div className="mt-5 space-y-3">
            {recentActivity.map((event) => <article className="rounded-2xl border border-bronze/20 bg-midnight/30 p-3" key={event.id}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-stardust">{event.operation} · {event.entityType.replaceAll('_', ' ')}</p><p className="mt-1 text-xs text-stardust/44">{formatDate(event.occurredAt)} · {event.origin}</p></div><Badge variant="teal">recorded</Badge></div></article>)}
            {!recentActivity.length ? <Empty title="Inbox is clear" detail="Accepted canonical edits, release decisions, restores, and AI acceptance receipts appear here." /> : null}
          </div>
        </Card>
      </div>

      <Card><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><Sparkles aria-hidden="true" className="text-ember" /><div><h2 className="text-lg font-semibold text-stardust">Command palette</h2><p className="mt-1 text-sm text-stardust/52">Press ⌘K or Ctrl+K anywhere to search records and open create workflows.</p></div></div><Button onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))} variant="secondary">Open commands</Button></div></Card>
    </section>
  );
}

function Empty({ detail, title }: { detail: string; title: string }) { return <div className="rounded-2xl border border-dashed border-bronze/26 p-5 text-center sm:col-span-2"><p className="text-sm font-semibold text-stardust">{title}</p><p className="mt-2 text-sm leading-6 text-stardust/48">{detail}</p></div>; }
function priority(value: string) { return ({ urgent: 0, high: 1, medium: 2, low: 3 } as Record<string, number>)[value] ?? 4; }
function formatDate(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)); }
