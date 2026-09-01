import { useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CheckSquare2,
  Columns3,
  GripVertical,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '../../components/shared/Badge';
import { Button } from '../../components/shared/Button';
import { Card } from '../../components/shared/Card';
import { CanonicalMediaImage } from '../../components/shared/CanonicalMediaImage';
import { MobilePageHeader } from '../../components/shared/MobilePageHeader';
import { PageHeader } from '../../components/shared/PageHeader';
import { useCanonicalWorkspace } from '../../hooks/useCanonicalWorkspace';
import { cn } from '../../lib/classes';
import {
  planGarmentPhases,
  planTaskStatusLabel,
  selectPlanWorkspacePresentation,
  type PlanGarmentSummary,
  type PlanTaskItem,
} from '../../lib/canonicalPlanPresentation';
import { updateGarment as updateCanonicalGarment, type CanonicalGarment, type CanonicalReleaseTask } from '../../domains/workspace';

type PlanView = 'flow' | 'tasks' | 'calendar';

export function PlanPage({ onOpenGarment }: { onOpenGarment?: (garmentId: string) => void }) {
  const workspace = useCanonicalWorkspace();
  const [view, setView] = useState<PlanView>('flow');
  const [showCreate, setShowCreate] = useState(false);

  if (!workspace.isReady || !workspace.state) {
    return (
      <Card>
        <div aria-live="polite" className="flex min-h-52 flex-col items-center justify-center gap-4 text-center">
          {workspace.error ? <AlertTriangle className="text-ember" aria-hidden="true" /> : <RefreshCw className="animate-spin text-ember" aria-hidden="true" />}
          <p className="max-w-md text-sm leading-6 text-stardust/62">
            {workspace.error ?? 'Preparing your Studio plan…'}
          </p>
          {workspace.error ? <Button onClick={workspace.retry}>Retry</Button> : null}
        </div>
      </Card>
    );
  }

  const state = workspace.state;
  const plan = useMemo(() => selectPlanWorkspacePresentation(state), [state]);

  return (
    <section className="space-y-5">
      <MobilePageHeader
        action={<Button icon={<Plus aria-hidden="true" size={15} />} onClick={() => setShowCreate(true)} size="sm">New</Button>}
        badge="Plan"
        kicker={`${plan.openTasks.length} open tasks · ${state.calendarEvents.length} events`}
        title="Studio Plan"
      />
      <PageHeader
        badge="Plan"
        description="Move garments through the studio, keep next steps clear, and schedule fittings, reviews, releases, and shoots."
        title="Flow, Tasks & Calendar"
      >
        <Button icon={<Plus aria-hidden="true" size={16} />} onClick={() => setShowCreate(true)}>New {view === 'calendar' ? 'event' : 'task'}</Button>
      </PageHeader>

      {workspace.syncState === 'offline' ? (
        <div className="rounded-2xl border border-ember/35 bg-ember/10 px-4 py-3 text-sm text-stardust/72" role="status">
          Offline field mode: changes stay on this device and retain their operation identity until sync resumes.
        </div>
      ) : null}
      {state.conflicts.length ? (
        <div className="rounded-2xl border border-ember/35 bg-ember/10 px-4 py-3 text-sm text-stardust/72" role="alert">
          {state.conflicts.length} unresolved conflict{state.conflicts.length === 1 ? '' : 's'} need review before release work.
        </div>
      ) : null}

      <PlanWorkspaceTabs view={view} onChange={setView} />

      {showCreate ? (
        view === 'calendar'
          ? <CalendarEventForm onClose={() => setShowCreate(false)} />
          : <TaskForm onClose={() => setShowCreate(false)} />
      ) : null}

      {view === 'flow' ? <FlowView garments={plan.garments} onOpenGarment={onOpenGarment} /> : null}
      {view === 'tasks' ? <TaskView tasks={plan.tasks} /> : null}
      {view === 'calendar' ? <CalendarView items={plan.calendarItems} /> : null}
    </section>
  );
}

const planViews: Array<{ icon: typeof Columns3; id: PlanView; label: string }> = [
  { icon: Columns3, id: 'flow', label: 'Flow' },
  { icon: CheckSquare2, id: 'tasks', label: 'Tasks' },
  { icon: CalendarDays, id: 'calendar', label: 'Calendar' },
];

function PlanWorkspaceTabs({ onChange, view }: { onChange: (view: PlanView) => void; view: PlanView }) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const current = planViews.findIndex((item) => item.id === view);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? planViews.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + planViews.length) % planViews.length;
    onChange(planViews[next].id);
    document.getElementById(`plan-tab-${planViews[next].id}`)?.focus();
  };
  return <div aria-label="Plan views" className="grid grid-cols-3 gap-2 rounded-2xl border border-bronze/24 bg-midnight/36 p-1" onKeyDown={onKeyDown} role="tablist">
    {planViews.map((item) => <PlanTab active={view === item.id} icon={item.icon} key={item.id} label={item.label} onClick={() => onChange(item.id)} tabId={item.id} />)}
  </div>;
}

function PlanTab({ active, icon: Icon, label, onClick, tabId }: { active: boolean; icon: typeof Columns3; label: string; onClick: () => void; tabId: PlanView }) {
  return (
    <button
      aria-selected={active}
      aria-controls={`plan-panel-${tabId}`}
      className={cn('flex min-h-11 items-center justify-center gap-2 rounded-xl border px-2 text-sm font-medium transition', active ? 'border-ember/48 bg-ember/14 text-stardust' : 'border-transparent text-stardust/55 hover:bg-stardust/[0.05] hover:text-stardust')}
      id={`plan-tab-${tabId}`}
      onClick={onClick}
      role="tab"
      tabIndex={active ? 0 : -1}
      type="button"
    >
      <Icon aria-hidden="true" size={16} />
      {label}
    </button>
  );
}

const flowStageDescriptions: Record<CanonicalGarment['phase'], string> = {
  brief: 'Set the intention.',
  design: 'Shape the silhouette.',
  materials: 'Choose what it becomes.',
  technical: 'Resolve the specification.',
  sampling: 'Fit, test, refine.',
  production: 'Make with confidence.',
  story: 'Build the narrative.',
  portfolio: 'Prepare the presentation.',
};

function FlowView({ garments, onOpenGarment }: { garments: PlanGarmentSummary[]; onOpenGarment?: (garmentId: string) => void }) {
  const { commitWorkspaceAsync, state } = useCanonicalWorkspace();
  const [activeGarmentId, setActiveGarmentId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [movingGarmentId, setMovingGarmentId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );
  if (!state) return null;

  const activeGarment = activeGarmentId ? garments.find((summary) => summary.garment.id === activeGarmentId) ?? null : null;
  const moveGarment = async (garmentId: string, phase: CanonicalGarment['phase']) => {
    if (movingGarmentId) return;
    const original = state.garments.find((item) => item.id === garmentId);
    if (!original || original.phase === phase) return;
    let garment = original;
    setMovingGarmentId(garmentId);
    setFeedback(`Moving ${original.title} to ${phase}…`);
    try {
      await commitWorkspaceAsync((current) => {
        const latest = current.garments.find((item) => item.id === garmentId);
        if (!latest) throw new Error('This garment is no longer available.');
        garment = latest;
        return latest.phase === phase ? current : updateCanonicalGarment(current, garmentId, { phase });
      });
      setFeedback(`${garment.title} moved to ${phase}.`);
    } catch {
      setFeedback(`We could not move ${garment.title}. Your garment remains in ${garment.phase}.`);
    } finally {
      setMovingGarmentId(null);
    }
  };
  const onDragStart = (event: DragStartEvent) => setActiveGarmentId(String(event.active.id));
  const onDragCancel = () => setActiveGarmentId(null);
  const onDragEnd = (event: DragEndEvent) => {
    const garmentId = String(event.active.id);
    const phase = event.over?.id as CanonicalGarment['phase'] | undefined;
    setActiveGarmentId(null);
    if (!phase || !planGarmentPhases.includes(phase)) return;
    void moveGarment(garmentId, phase);
  };

  return (
    <div aria-labelledby="plan-tab-flow" id="plan-panel-flow" role="tabpanel">
      <p className="sr-only" aria-live="polite">{feedback}</p>
      <DndContext onDragCancel={onDragCancel} onDragEnd={onDragEnd} onDragStart={onDragStart} sensors={sensors}>
        <div aria-label="Garment development flow" className="studio-scrollbar -mx-4 overflow-x-auto px-4 pb-5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8" role="region" tabIndex={0}>
          <div className="flex min-w-max items-stretch gap-5">
            {planGarmentPhases.map((phase) => {
              const garmentsInPhase = garments.filter((item) => item.garment.phase === phase);
              return <FlowColumn garments={garmentsInPhase} key={phase} movingGarmentId={movingGarmentId} onMove={moveGarment} onOpenGarment={onOpenGarment} phase={phase} state={state} />;
            })}
          </div>
        </div>
        <DragOverlay dropAnimation={null}>
          {activeGarment ? <FlowGarmentDragPreview state={state} summary={activeGarment} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function FlowColumn({ garments, movingGarmentId, onMove, onOpenGarment, phase, state }: {
  garments: PlanGarmentSummary[];
  movingGarmentId: string | null;
  onMove: (garmentId: string, phase: CanonicalGarment['phase']) => Promise<void>;
  onOpenGarment?: (garmentId: string) => void;
  phase: CanonicalGarment['phase'];
  state: NonNullable<ReturnType<typeof useCanonicalWorkspace>['state']>;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: phase });
  return (
    <section
      className={cn(
        'flex w-[20rem] shrink-0 flex-col rounded-[1.6rem] border bg-[linear-gradient(160deg,rgba(237,227,207,0.055),rgba(17,20,24,0.64)_42%,rgba(10,10,10,0.78))] p-3 shadow-[0_18px_64px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(237,227,207,0.04)] transition-[background-color,border-color,box-shadow] duration-200 sm:w-[20.5rem]',
        isOver ? 'border-ember/70 bg-ember/[0.09] shadow-[0_20px_72px_rgba(200,155,60,0.18),inset_0_1px_0_rgba(237,227,207,0.08)]' : 'border-bronze/24',
      )}
      data-testid={`flow-column-${phase}`}
      ref={setNodeRef}
    >
      <header className="border-b border-bronze/18 px-2 pb-4 pt-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.63rem] font-medium uppercase tracking-[0.2em] text-ember/72">{phase} · {garments.length}</p>
            <h2 className="font-display mt-2 text-2xl capitalize text-stardust">{phase}</h2>
          </div>
          <Badge variant="bronze">{garments.length}</Badge>
        </div>
        <p className="mt-2 text-sm leading-5 text-stardust/48">{flowStageDescriptions[phase]}</p>
      </header>
      <div className="mt-4 flex min-h-44 flex-1 flex-col gap-4">
        {garments.map((summary) => <FlowGarmentCard isMoving={movingGarmentId === summary.garment.id} key={summary.garment.id} onMove={onMove} onOpenGarment={onOpenGarment} state={state} summary={summary} />)}
        {!garments.length ? (
          <div className={cn(
            'flex min-h-36 flex-1 items-center justify-center rounded-2xl border border-dashed px-5 text-center text-sm leading-6 transition-colors duration-200',
            isOver ? 'border-ember/58 bg-ember/[0.08] text-stardust/74' : 'border-bronze/22 bg-midnight/18 text-stardust/40',
          )}>
            {isOver ? `Move this garment into ${phase}.` : 'This part of the collection is ready for its next piece.'}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function FlowGarmentCard({ isMoving, onMove, onOpenGarment, state, summary }: {
  isMoving: boolean;
  onMove: (garmentId: string, phase: CanonicalGarment['phase']) => Promise<void>;
  onOpenGarment?: (garmentId: string) => void;
  state: NonNullable<ReturnType<typeof useCanonicalWorkspace>['state']>;
  summary: PlanGarmentSummary;
}) {
  const { attributes, isDragging, listeners, setNodeRef } = useDraggable({
    id: summary.garment.id,
    data: { garmentId: summary.garment.id, phase: summary.garment.phase },
    disabled: isMoving,
  });
  const openGarment = () => onOpenGarment?.(summary.garment.id);
  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-[1.35rem] border border-bronze/24 bg-[linear-gradient(155deg,rgba(10,10,10,0.78),rgba(61,43,31,0.25))] shadow-[0_14px_42px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(237,227,207,0.035)] transition-[border-color,box-shadow,opacity,transform] duration-200 hover:-translate-y-1 hover:border-ember/52 hover:shadow-[0_18px_54px_rgba(0,0,0,0.32),0_0_24px_rgba(200,155,60,0.08)] focus-within:border-ember/62',
        isDragging && 'scale-[0.985] border-ember/55 opacity-30',
      )}
      data-testid="flow-card"
      ref={setNodeRef}
    >
      <button aria-label={`Open ${summary.garment.title}, ${summary.collectionName}, ${summary.garment.phase}`} className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ember" onClick={openGarment} type="button">
        <div className="relative overflow-hidden bg-midnight/70">
          <CanonicalMediaImage alt={`${summary.garment.title} cover`} asset={summary.coverImage} className="aspect-[4/3] w-full transition-transform duration-300 motion-reduce:transition-none group-hover:scale-[1.025]" derivatives={state.mediaDerivatives} mode="library" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-midnight/92 via-midnight/30 to-transparent" />
          <span className="absolute bottom-3 left-3 rounded-full border border-stardust/15 bg-midnight/72 px-2.5 py-1 text-[0.62rem] font-medium uppercase tracking-[0.16em] text-stardust/82 backdrop-blur-sm">{summary.garment.phase}</span>
          {summary.warning ? <span className="absolute bottom-3 right-3 rounded-full border border-ember/35 bg-midnight/72 px-2.5 py-1 text-[0.62rem] font-medium uppercase tracking-[0.12em] text-ember backdrop-blur-sm">{summary.warning.label}</span> : null}
        </div>
        <div className="p-4 pb-3">
          <p className="truncate text-[0.66rem] font-medium uppercase tracking-[0.16em] text-ember/72">{summary.collectionName} · {summary.garment.garmentType}</p>
          <h3 className="font-display mt-2 line-clamp-2 text-2xl leading-[1.04] text-stardust">{summary.garment.title}</h3>
          <div className="mt-4 flex items-center justify-between gap-3 text-xs text-stardust/52">
            <span>{summary.openTaskCount ? `${summary.openTaskCount} open ${summary.openTaskCount === 1 ? 'task' : 'tasks'}` : 'No open tasks'}</span>
            <span className="inline-flex items-center gap-1 font-medium text-stardust/72">Open <ArrowUpRight aria-hidden="true" size={14} /></span>
          </div>
          {summary.nextTask ? <p className="mt-3 truncate border-t border-bronze/15 pt-3 text-xs text-stardust/48"><span className="mr-1 uppercase tracking-[0.13em] text-stardust/34">Next</span>{summary.nextTask.title}</p> : null}
        </div>
      </button>
      <button
        aria-label={`Drag ${summary.garment.title} to another stage`}
        className="absolute right-3 top-3 flex h-10 w-10 touch-none items-center justify-center rounded-xl border border-stardust/18 bg-midnight/72 text-stardust/62 opacity-0 shadow-lg backdrop-blur-sm transition hover:border-ember/55 hover:text-ember focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember group-hover:opacity-100"
        disabled={isMoving}
        type="button"
        {...attributes}
        {...listeners}
      >
        <GripVertical aria-hidden="true" size={18} strokeWidth={1.8} />
      </button>
      <label className="block border-t border-bronze/16 px-3 py-3 text-[0.65rem] font-medium uppercase tracking-[0.14em] text-stardust/42">
        <span className="sr-only">Move {summary.garment.title} to phase</span>
        <select className="mt-1 min-h-10 w-full cursor-pointer rounded-xl border border-bronze/22 bg-midnight/62 px-2.5 text-xs normal-case tracking-normal text-stardust/76 outline-none transition focus:border-ember/65 focus:ring-2 focus:ring-ember/30 disabled:cursor-wait disabled:opacity-55" data-testid={`flow-stage-${summary.garment.id}`} disabled={isMoving} onChange={(event) => void onMove(summary.garment.id, event.target.value as CanonicalGarment['phase'])} value={summary.garment.phase}>
          {planGarmentPhases.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
    </article>
  );
}

function FlowGarmentDragPreview({ state, summary }: { state: NonNullable<ReturnType<typeof useCanonicalWorkspace>['state']>; summary: PlanGarmentSummary }) {
  return (
    <article className="pointer-events-none w-[20rem] rotate-[0.5deg] overflow-hidden rounded-[1.35rem] border border-ember/75 bg-midnight/96 shadow-[0_28px_90px_rgba(0,0,0,0.55),0_0_42px_rgba(200,155,60,0.2)]">
      <CanonicalMediaImage alt={`${summary.garment.title} cover`} asset={summary.coverImage} className="aspect-[4/3] w-full" derivatives={state.mediaDerivatives} mode="library" />
      <div className="p-4"><p className="text-[0.65rem] uppercase tracking-[0.16em] text-ember/78">{summary.garment.phase}</p><p className="font-display mt-2 text-2xl text-stardust">{summary.garment.title}</p></div>
    </article>
  );
}

function TaskView({ tasks }: { tasks: PlanTaskItem[] }) {
  const { updateTaskStatus } = useCanonicalWorkspace();
  return (
    <Card aria-labelledby="plan-tab-tasks" className="space-y-3" id="plan-panel-tasks" role="tabpanel">
      {tasks.map(({ garment, task }) => {
        return (
          <article className="grid gap-3 rounded-2xl border border-bronze/22 bg-stardust/[0.035] p-4 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-center" key={task.id}>
            <div>
              <div className="flex flex-wrap items-center gap-2"><Badge variant={task.priority === 'urgent' ? 'ember' : 'bronze'}>{task.priority}</Badge><span className="text-xs text-stardust/48">{garment?.garment.title ?? 'Studio-wide'}</span></div>
              <h2 className="mt-2 text-sm font-semibold text-stardust">{task.title}</h2>
              <p className="mt-1 text-sm leading-6 text-stardust/55">{task.description || 'No description.'}</p>
              <p className="mt-2 text-xs text-stardust/45">{task.dueAt ? `Due ${formatDay(task.dueAt)}` : 'No due date'}</p>
            </div>
            <label className="text-xs text-stardust/52"><span className="sr-only">Status for {task.title}</span><select className="min-h-11 w-full rounded-xl border border-bronze/26 bg-midnight px-3 text-sm text-stardust" onChange={(event) => updateTaskStatus(task.id, event.target.value as CanonicalReleaseTask['status'])} value={task.status}>{['todo', 'in_progress', 'blocked', 'done', 'cancelled'].map((status) => <option key={status} value={status}>{planTaskStatusLabel(status as CanonicalReleaseTask['status'])}</option>)}</select></label>
          </article>
        );
      })}
      {!tasks.length ? <EmptyPlanState title="No tasks yet" detail="Create the first accountable next move. Tasks can be garment-specific or studio-wide." /> : null}
    </Card>
  );
}

function CalendarView({ items }: { items: ReturnType<typeof selectPlanWorkspacePresentation>['calendarItems'] }) {
  return (
    <Card aria-labelledby="plan-tab-calendar" className="space-y-3" id="plan-panel-calendar" role="tabpanel">
      {items.map((item) => (
        <article className="grid gap-2 rounded-2xl border border-bronze/22 bg-stardust/[0.035] p-4 sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:items-center" key={item.id}>
          <time className="text-sm tabular-nums text-ember" dateTime={item.startsAt}>{formatDay(item.startsAt)}</time>
          <div><h2 className="text-sm font-semibold text-stardust">{item.title}</h2><p className="mt-1 text-xs text-stardust/46">{item.garment?.garment.title ?? 'Studio-wide'}</p></div>
          <Badge variant="teal">{item.kind}</Badge>
        </article>
      ))}
      {!items.length ? <EmptyPlanState title="Calendar is clear" detail="Add a fitting, supplier review, release, shoot, or any other studio event." /> : null}
    </Card>
  );
}

function TaskForm({ onClose }: { onClose: () => void }) {
  const { addTask, state } = useCanonicalWorkspace();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [garmentId, setGarmentId] = useState('');
  const [priority, setPriority] = useState<CanonicalReleaseTask['priority']>('medium');
  const submit = (event: FormEvent) => { event.preventDefault(); if (!title.trim()) return; addTask({ description, dueAt: dueAt ? new Date(`${dueAt}T12:00:00`).toISOString() : null, garmentId, priority, title }); onClose(); };
  return <PlanForm onClose={onClose} onSubmit={submit} title="Create task"><TextField label="Task title" onChange={setTitle} required value={title} /><TextField label="Description" onChange={setDescription} value={description} /><SelectField label="Garment" onChange={setGarmentId} options={[['', 'Studio-wide'], ...(state?.garments.map((item) => [item.id, item.title] as [string, string]) ?? [])]} value={garmentId} /><label className="text-xs text-stardust/52">Due date<input className="mt-2 min-h-11 w-full rounded-xl border border-bronze/26 bg-midnight px-3 text-sm text-stardust" onChange={(event) => setDueAt(event.target.value)} type="date" value={dueAt} /></label><SelectField label="Priority" onChange={(value) => setPriority(value as CanonicalReleaseTask['priority'])} options={['low', 'medium', 'high', 'urgent'].map((value) => [value, value])} value={priority} /></PlanForm>;
}

function CalendarEventForm({ onClose }: { onClose: () => void }) {
  const { addCalendarEvent, state } = useCanonicalWorkspace();
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [garmentId, setGarmentId] = useState('');
  const [eventType, setEventType] = useState('fitting');
  const submit = (event: FormEvent) => { event.preventDefault(); if (!title.trim() || !startsAt) return; addCalendarEvent({ endsAt: null, eventType, garmentId: garmentId || null, startsAt: new Date(startsAt).toISOString(), title }); onClose(); };
  return <PlanForm onClose={onClose} onSubmit={submit} title="Add calendar event"><TextField label="Event title" onChange={setTitle} required value={title} /><SelectField label="Type" onChange={setEventType} options={['fitting', 'supplier review', 'release', 'shoot', 'qc', 'studio'].map((value) => [value, value])} value={eventType} /><SelectField label="Garment" onChange={setGarmentId} options={[['', 'Studio-wide'], ...(state?.garments.map((item) => [item.id, item.title] as [string, string]) ?? [])]} value={garmentId} /><label className="text-xs text-stardust/52">Start<input className="mt-2 min-h-11 w-full rounded-xl border border-bronze/26 bg-midnight px-3 text-sm text-stardust" onChange={(event) => setStartsAt(event.target.value)} required type="datetime-local" value={startsAt} /></label></PlanForm>;
}

function PlanForm({ children, onClose, onSubmit, title }: { children: React.ReactNode; onClose: () => void; onSubmit: (event: FormEvent) => void; title: string }) { return <Card><form className="space-y-4" onSubmit={onSubmit}><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-stardust">{title}</h2><Button onClick={onClose} size="sm" variant="ghost">Cancel</Button></div><div className="grid gap-4 md:grid-cols-2">{children}</div><Button type="submit">Save</Button></form></Card>; }
function TextField({ label, onChange, required = false, value }: { label: string; onChange: (value: string) => void; required?: boolean; value: string }) { return <label className="text-xs text-stardust/52">{label}<input className="mt-2 min-h-11 w-full rounded-xl border border-bronze/26 bg-midnight px-3 text-sm text-stardust" onChange={(event) => onChange(event.target.value)} required={required} value={value} /></label>; }
function SelectField({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: Array<[string, string]>; value: string }) { return <label className="text-xs text-stardust/52">{label}<select className="mt-2 min-h-11 w-full rounded-xl border border-bronze/26 bg-midnight px-3 text-sm capitalize text-stardust" onChange={(event) => onChange(event.target.value)} value={value}>{options.map(([optionValue, optionLabel]) => <option key={optionValue || 'none'} value={optionValue}>{optionLabel}</option>)}</select></label>; }
function EmptyPlanState({ detail, title }: { detail: string; title: string }) { return <div className="rounded-2xl border border-dashed border-bronze/28 p-8 text-center"><h2 className="text-base font-semibold text-stardust">{title}</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-stardust/52">{detail}</p></div>; }
function formatDay(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: value.includes('T') && !value.endsWith('T12:00:00.000Z') ? 'short' : undefined }).format(new Date(value)); }
