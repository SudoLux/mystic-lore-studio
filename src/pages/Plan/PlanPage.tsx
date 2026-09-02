import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
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
  Check,
  CheckSquare2,
  Columns3,
  Grip,
  GripVertical,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { Badge } from '../../components/shared/Badge';
import { Button } from '../../components/shared/Button';
import { Card } from '../../components/shared/Card';
import { CanonicalMediaImage } from '../../components/shared/CanonicalMediaImage';
import { MobilePageHeader } from '../../components/shared/MobilePageHeader';
import { PageHeader } from '../../components/shared/PageHeader';
import { useCanonicalWorkspace } from '../../hooks/useCanonicalWorkspace';
import { cn } from '../../lib/classes';
import { CanonicalIndexedDb } from '../../domains/persistence';
import { useDialogA11y } from '../../components/shared/useDialogA11y';
import {
  planGarmentPhases,
  planTaskStatusLabel,
  selectPlanWorkspacePresentation,
  type PlanGarmentSummary,
  type PlanTaskItem,
} from '../../lib/canonicalPlanPresentation';
import { updateGarment as updateCanonicalGarment, type CanonicalGarment, type CanonicalReleaseTask } from '../../domains/workspace';
import {
  clampTaskPinPosition,
  defaultTaskPinPosition,
  isCompletedTask,
  taskPinboardGroups,
  taskPinboardPositionKey,
  type TaskPinboardMode,
  type TaskPinPositions,
} from '../../lib/canonicalTaskPinboard';

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
      {view === 'tasks' ? <TaskView onCreateTask={() => setShowCreate(true)} onOpenGarment={onOpenGarment} tasks={plan.tasks} /> : null}
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

const taskModes: Array<{ id: TaskPinboardMode; label: string }> = [
  { id: 'priority', label: 'Priority' },
  { id: 'garment', label: 'Garment' },
  { id: 'due', label: 'Due date' },
  { id: 'freeform', label: 'Freeform' },
];

function TaskView({ onCreateTask, onOpenGarment, tasks }: {
  onCreateTask: () => void;
  onOpenGarment?: (garmentId: string) => void;
  tasks: PlanTaskItem[];
}) {
  const { state } = useCanonicalWorkspace();
  const [mode, setMode] = useState<TaskPinboardMode>('priority');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [positions, setPositions] = useState<TaskPinPositions>({});
  const cache = useRef(new CanonicalIndexedDb());
  const activeTasks = tasks.filter(({ task }) => !isCompletedTask(task));
  const completedTasks = tasks.filter(({ task }) => isCompletedTask(task));
  const selected = tasks.find(({ task }) => task.id === selectedTaskId) ?? null;
  const positionKey = state ? taskPinboardPositionKey(state.studioId) : null;
  const closeTaskDrawer = useCallback(() => setSelectedTaskId(null), []);

  useEffect(() => {
    let live = true;
    if (!positionKey) return () => { live = false; };
    void cache.current.getSetting<TaskPinPositions>(positionKey).then((stored) => {
      if (live) setPositions(stored ?? {});
    }).catch(() => {
      if (live) setPositions({});
    });
    return () => { live = false; };
  }, [positionKey]);

  const movePin = (taskId: string, delta: { x: number; y: number }) => {
    setPositions((current) => {
      const index = activeTasks.findIndex(({ task }) => task.id === taskId);
      const start = current[taskId] ?? defaultTaskPinPosition(Math.max(0, index));
      const next = { ...current, [taskId]: clampTaskPinPosition({ x: start.x + delta.x, y: start.y + delta.y }) };
      if (positionKey) void cache.current.putSetting(positionKey, next);
      return next;
    });
  };

  return (
    <section aria-labelledby="plan-tab-tasks" className="space-y-5" id="plan-panel-tasks" role="tabpanel">
      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-4 border-b border-bronze/18 px-5 py-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[0.66rem] font-medium uppercase tracking-[0.22em] text-ember/75">Studio pinboard</p>
            <h2 className="font-display mt-2 text-3xl text-stardust">What moves the work forward</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stardust/52">Arrange the same connected studio work in the way that helps you decide what comes next.</p>
          </div>
          <Button icon={<Plus aria-hidden="true" size={16} />} onClick={onCreateTask}>New task</Button>
        </div>
        <div aria-label="Task organization" className="studio-scrollbar flex gap-2 overflow-x-auto px-5 py-4" role="tablist">
          {taskModes.map((item) => (
            <button
              aria-selected={mode === item.id}
              className={cn('min-h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember', mode === item.id ? 'border-ember/62 bg-ember/16 text-stardust' : 'border-bronze/22 bg-midnight/34 text-stardust/56 hover:border-bronze/46 hover:text-stardust')}
              key={item.id}
              onClick={() => setMode(item.id)}
              role="tab"
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </Card>

      {!activeTasks.length ? <EmptyPlanState title="The pinboard is clear" detail="Add a task when a garment needs a next move. Completed work stays below for reference." /> : null}
      {activeTasks.length && mode !== 'freeform' ? (
        <div className="grid gap-5 xl:grid-cols-3">
          {taskPinboardGroups(mode, activeTasks).filter((group) => group.tasks.length > 0).map((group) => (
            <TaskGroup group={group} key={group.id} onOpenGarment={onOpenGarment} onOpenTask={setSelectedTaskId} />
          ))}
        </div>
      ) : null}
      {activeTasks.length && mode === 'freeform' ? (
        <>
          <div className="md:hidden">
            <p className="mb-3 text-sm leading-6 text-stardust/52">On a narrow canvas, notes stay grouped for easy scanning. Open this view on a wider screen to arrange your studio pinboard.</p>
            <div className="grid gap-5">{taskPinboardGroups('priority', activeTasks).filter((group) => group.tasks.length > 0).map((group) => <TaskGroup group={group} key={group.id} onOpenGarment={onOpenGarment} onOpenTask={setSelectedTaskId} />)}</div>
          </div>
          <FreeformTaskPinboard className="hidden md:block" onMove={movePin} onOpenGarment={onOpenGarment} onOpenTask={setSelectedTaskId} positions={positions} tasks={activeTasks} />
        </>
      ) : null}

      {completedTasks.length ? (
        <Card className="p-0">
          <button aria-expanded={completedExpanded} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ember" onClick={() => setCompletedExpanded((value) => !value)} type="button">
            <span><span className="text-[0.66rem] font-medium uppercase tracking-[0.18em] text-stardust/45">Archive</span><span className="mt-1 block text-sm font-medium text-stardust">Completed · {completedTasks.length}</span></span>
            <span className="text-sm text-ember">{completedExpanded ? 'Hide' : 'Review'}</span>
          </button>
          {completedExpanded ? <div className="grid gap-4 border-t border-bronze/18 p-5 sm:grid-cols-2 xl:grid-cols-3">{completedTasks.map((item) => <TaskNote item={item} key={item.task.id} onOpenGarment={onOpenGarment} onOpenTask={setSelectedTaskId} />)}</div> : null}
        </Card>
      ) : null}
      {selected ? <TaskDetailDrawer item={selected} onClose={closeTaskDrawer} onDeleted={closeTaskDrawer} onOpenGarment={onOpenGarment} /> : null}
    </section>
  );
}

function TaskGroup({ group, onOpenGarment, onOpenTask }: {
  group: ReturnType<typeof taskPinboardGroups>[number];
  onOpenGarment?: (garmentId: string) => void;
  onOpenTask: (taskId: string) => void;
}) {
  const { state } = useCanonicalWorkspace();
  const garment = group.tasks[0]?.garment;
  return (
    <section className="rounded-[1.4rem] border border-bronze/20 bg-[linear-gradient(155deg,rgba(237,227,207,0.045),rgba(10,10,10,0.36))] p-4 shadow-[0_16px_46px_rgba(0,0,0,0.16)]">
      <header className="mb-4 flex min-h-12 items-center gap-3 border-b border-bronze/16 pb-4">
        {garment && group.id === garment.garment.id ? <button aria-label={`Open ${garment.garment.title}`} className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-bronze/22 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember" onClick={() => onOpenGarment?.(garment.garment.id)} type="button"><CanonicalMediaImage alt={`${garment.garment.title} cover`} asset={garment.coverImage} className="h-full w-full" derivatives={state?.mediaDerivatives} mode="thumbnail" /></button> : null}
        <div className="min-w-0"><p className="text-[0.64rem] font-medium uppercase tracking-[0.18em] text-ember/72">{group.tasks.length} open</p><h3 className="truncate text-lg font-semibold text-stardust">{group.label}</h3></div>
      </header>
      <div className="grid gap-3">{group.tasks.map((item) => <TaskNote item={item} key={item.task.id} onOpenGarment={onOpenGarment} onOpenTask={onOpenTask} />)}</div>
    </section>
  );
}

function TaskNote({ className, dragHandle, item, onOpenGarment, onOpenTask }: {
  className?: string;
  dragHandle?: ReactNode;
  item: PlanTaskItem;
  onOpenGarment?: (garmentId: string) => void;
  onOpenTask: (taskId: string) => void;
}) {
  const { state, updateTaskStatus } = useCanonicalWorkspace();
  const { garment, task } = item;
  const completed = isCompletedTask(task);
  return (
    <article className={cn('group relative overflow-hidden rounded-[1.18rem] border bg-[linear-gradient(145deg,rgba(237,227,207,0.065),rgba(61,43,31,0.18)_52%,rgba(10,10,10,0.52))] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.16)] transition duration-200 hover:-translate-y-0.5 hover:border-ember/45 hover:shadow-[0_16px_38px_rgba(0,0,0,0.24)] focus-within:border-ember/58 motion-reduce:transform-none', task.priority === 'urgent' ? 'border-ember/45' : task.priority === 'high' ? 'border-bronze/42' : 'border-bronze/22', completed && 'opacity-72', className)} data-testid="task-note">
      <div className="flex items-start justify-between gap-3">
        <button aria-label={`${completed ? 'Reopen' : 'Complete'} ${task.title}`} className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember', completed ? 'border-nebula/55 bg-nebula/18 text-stardust' : 'border-bronze/38 text-stardust/48 hover:border-ember hover:text-ember')} onClick={() => updateTaskStatus(task.id, completed ? 'todo' : 'done')} type="button">
          {completed ? <Check aria-hidden="true" size={15} /> : <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full border border-current" />}
        </button>
        <button aria-label={`Open task ${task.title}`} className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember" onClick={() => onOpenTask(task.id)} type="button">
          <div className="flex flex-wrap items-center gap-2"><Badge className="capitalize" variant={task.priority === 'urgent' ? 'ember' : task.priority === 'high' ? 'bronze' : 'blue'}>{task.priority}</Badge><span className="text-[0.69rem] uppercase tracking-[0.13em] text-stardust/44">{planTaskStatusLabel(task.status)}</span></div>
          <h3 className="mt-3 text-base font-semibold leading-6 text-stardust">{task.title}</h3>
          {task.description ? <p className="mt-2 line-clamp-2 text-sm leading-5 text-stardust/56">{task.description}</p> : null}
        </button>
        {dragHandle}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-bronze/14 pt-3 text-xs text-stardust/48">
        {garment ? <button className="group/garment inline-flex min-w-0 items-center gap-2 text-left hover:text-stardust focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember" onClick={() => onOpenGarment?.(garment.garment.id)} type="button"><CanonicalMediaImage alt={`${garment.garment.title} thumbnail`} asset={garment.coverImage} className="h-6 w-6 rounded-md" derivatives={state?.mediaDerivatives} mode="thumbnail" /><span className="max-w-[11rem] truncate">{garment.garment.title}</span></button> : <span>Studio-wide</span>}
        <time dateTime={task.dueAt ?? undefined}>{task.dueAt ? `Due ${formatDay(task.dueAt)}` : 'No due date'}</time>
      </div>
    </article>
  );
}

function FreeformTaskPinboard({ className, onMove, onOpenGarment, onOpenTask, positions, tasks }: {
  className?: string;
  onMove: (taskId: string, delta: { x: number; y: number }) => void;
  onOpenGarment?: (garmentId: string) => void;
  onOpenTask: (taskId: string) => void;
  positions: TaskPinPositions;
  tasks: PlanTaskItem[];
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }), useSensor(KeyboardSensor));
  const onDragEnd = (event: DragEndEvent) => onMove(String(event.active.id), event.delta);
  return <div className={className}><div className="mb-3 flex items-center gap-2 text-sm text-stardust/52"><Grip aria-hidden="true" size={16} />Drag a note by its grip to arrange your own working surface. This layout is saved only on this device.</div><DndContext onDragEnd={onDragEnd} sensors={sensors}><div aria-label="Freeform task pinboard" className="relative min-h-[44rem] min-w-[52rem] overflow-hidden rounded-[1.6rem] border border-bronze/24 bg-[radial-gradient(circle_at_18%_12%,rgba(200,155,60,0.12),transparent_28%),linear-gradient(135deg,rgba(61,43,31,0.25),rgba(10,10,10,0.82))] shadow-[inset_0_1px_0_rgba(237,227,207,0.05)]" data-testid="task-freeform-board">{tasks.map((item, index) => <FreeformTaskNote item={item} key={item.task.id} onOpenGarment={onOpenGarment} onOpenTask={onOpenTask} position={positions[item.task.id] ?? defaultTaskPinPosition(index)} />)}</div></DndContext></div>;
}

function FreeformTaskNote({ item, onOpenGarment, onOpenTask, position }: { item: PlanTaskItem; onOpenGarment?: (garmentId: string) => void; onOpenTask: (taskId: string) => void; position: { x: number; y: number } }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: item.task.id });
  const style: CSSProperties = { left: position.x, position: 'absolute', top: position.y, width: '15rem' };
  return <div ref={setNodeRef} style={style}><TaskNote dragHandle={<button aria-label={`Move ${item.task.title} on pinboard`} className="flex h-8 w-8 touch-none items-center justify-center rounded-lg border border-bronze/24 text-stardust/50 hover:border-ember/48 hover:text-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember" type="button" {...attributes} {...listeners}><GripVertical aria-hidden="true" size={16} /></button>} item={item} onOpenGarment={onOpenGarment} onOpenTask={onOpenTask} /></div>;
}

function TaskDetailDrawer({ item, onClose, onDeleted, onOpenGarment }: { item: PlanTaskItem; onClose: () => void; onDeleted: () => void; onOpenGarment?: (garmentId: string) => void }) {
  const { deleteTask, state, updateTask } = useCanonicalWorkspace();
  const [title, setTitle] = useState(item.task.title);
  const [description, setDescription] = useState(item.task.description);
  const [garmentId, setGarmentId] = useState(item.task.garmentId);
  const [priority, setPriority] = useState(item.task.priority);
  const [status, setStatus] = useState(item.task.status);
  const [dueAt, setDueAt] = useState(toDateInput(item.task.dueAt));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dialogRef = useDialogA11y(true, onClose);
  const save = (event: FormEvent) => { event.preventDefault(); updateTask(item.task.id, { description, dueAt: dueAt ? new Date(`${dueAt}T12:00:00`).toISOString() : null, garmentId, priority, status, title }); onClose(); };
  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-black/65 p-0 sm:p-4">
      <button aria-label="Close task details" className="absolute inset-0 cursor-default" onClick={onClose} type="button" />
      <aside aria-labelledby="task-detail-title" aria-modal="true" className="relative z-10 flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-bronze/30 bg-[linear-gradient(160deg,#17171a,#090909)] p-5 shadow-[-24px_0_80px_rgba(0,0,0,0.45)] sm:rounded-l-[1.5rem]" ref={dialogRef} role="dialog" tabIndex={-1}>
        <div className="flex items-start justify-between gap-4"><div><p className="text-[0.66rem] uppercase tracking-[0.2em] text-ember/72">Task detail</p><h2 className="font-display mt-2 text-3xl text-stardust" id="task-detail-title">Refine the next move</h2></div><Button aria-label="Close task details" icon={<X aria-hidden="true" size={18} />} onClick={onClose} size="sm" variant="ghost">Close</Button></div>
        <form className="mt-7 space-y-5" onSubmit={save}>
          <TextField label="Task title" onChange={setTitle} required value={title} />
          <label className="block text-xs text-stardust/52">Notes<textarea className="mt-2 min-h-28 w-full rounded-xl border border-bronze/26 bg-midnight px-3 py-3 text-sm leading-6 text-stardust outline-none focus:border-ember/65 focus:ring-2 focus:ring-ember/25" onChange={(event) => setDescription(event.target.value)} value={description} /></label>
          <div className="grid gap-4 sm:grid-cols-2"><SelectField label="Garment" onChange={setGarmentId} options={[['', 'Studio-wide'], ...(state?.garments.map((garment) => [garment.id, garment.title] as [string, string]) ?? [])]} value={garmentId} /><SelectField label="Priority" onChange={(value) => setPriority(value as CanonicalReleaseTask['priority'])} options={['low', 'medium', 'high', 'urgent'].map((value) => [value, value])} value={priority} /><SelectField label="Status" onChange={(value) => setStatus(value as CanonicalReleaseTask['status'])} options={['todo', 'in_progress', 'blocked', 'done', 'cancelled'].map((value) => [value, planTaskStatusLabel(value as CanonicalReleaseTask['status'])])} value={status} /><label className="text-xs text-stardust/52">Due date<input className="mt-2 min-h-11 w-full rounded-xl border border-bronze/26 bg-midnight px-3 text-sm text-stardust outline-none focus:border-ember/65 focus:ring-2 focus:ring-ember/25" onChange={(event) => setDueAt(event.target.value)} type="date" value={dueAt} /></label></div>
          {item.garment ? <button className="inline-flex items-center gap-2 text-sm text-stardust/60 underline-offset-4 hover:text-stardust hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember" onClick={() => onOpenGarment?.(item.garment!.garment.id)} type="button">Open {item.garment.garment.title}<ArrowUpRight aria-hidden="true" size={15} /></button> : null}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-bronze/18 pt-5"><div>{confirmDelete ? <div className="flex items-center gap-2 text-sm text-ember"><span>Delete this task?</span><Button onClick={() => { deleteTask(item.task.id); onDeleted(); }} size="sm">Delete</Button><Button onClick={() => setConfirmDelete(false)} size="sm" variant="ghost">Keep</Button></div> : <Button icon={<Trash2 aria-hidden="true" size={15} />} onClick={() => setConfirmDelete(true)} size="sm" variant="ghost">Delete task</Button>}</div><Button type="submit">Save changes</Button></div>
        </form>
      </aside>
    </div>
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
  return <PlanForm onClose={onClose} onSubmit={submit} title="New task"><p className="-mt-2 text-sm leading-6 text-stardust/52">Capture the essentials now; refine the rest from the pinboard.</p><TextField label="Task title" onChange={setTitle} required value={title} /><label className="text-xs text-stardust/52">Notes<textarea className="mt-2 min-h-24 w-full rounded-xl border border-bronze/26 bg-midnight px-3 py-3 text-sm leading-6 text-stardust outline-none focus:border-ember/65 focus:ring-2 focus:ring-ember/25" onChange={(event) => setDescription(event.target.value)} value={description} /></label><SelectField label="Garment" onChange={setGarmentId} options={[['', 'Studio-wide'], ...(state?.garments.map((item) => [item.id, item.title] as [string, string]) ?? [])]} value={garmentId} /><label className="text-xs text-stardust/52">Due date<input className="mt-2 min-h-11 w-full rounded-xl border border-bronze/26 bg-midnight px-3 text-sm text-stardust" onChange={(event) => setDueAt(event.target.value)} type="date" value={dueAt} /></label><SelectField label="Priority" onChange={(value) => setPriority(value as CanonicalReleaseTask['priority'])} options={['low', 'medium', 'high', 'urgent'].map((value) => [value, value])} value={priority} /></PlanForm>;
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
function toDateInput(value: string | null) { return value ? new Date(value).toISOString().slice(0, 10) : ''; }
function formatDay(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: value.includes('T') && !value.endsWith('T12:00:00.000Z') ? 'short' : undefined }).format(new Date(value)); }
