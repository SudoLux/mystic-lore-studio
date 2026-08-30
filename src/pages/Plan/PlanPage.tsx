import { useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckSquare2,
  Columns3,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '../../components/shared/Badge';
import { Button } from '../../components/shared/Button';
import { Card } from '../../components/shared/Card';
import { MobilePageHeader } from '../../components/shared/MobilePageHeader';
import { PageHeader } from '../../components/shared/PageHeader';
import { useCanonicalWorkspace } from '../../hooks/useCanonicalWorkspace';
import { cn } from '../../lib/classes';
import type { CanonicalGarment, CanonicalReleaseTask } from '../../domains/workspace';

type PlanView = 'flow' | 'tasks' | 'calendar';

const phases: CanonicalGarment['phase'][] = [
  'brief',
  'design',
  'materials',
  'technical',
  'sampling',
  'production',
  'story',
  'portfolio',
];

export function PlanPage() {
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
  const openTasks = state.releaseTasks.filter((task) => !['done', 'cancelled'].includes(task.status));

  return (
    <section className="space-y-5">
      <MobilePageHeader
        action={<Button icon={<Plus aria-hidden="true" size={15} />} onClick={() => setShowCreate(true)} size="sm">New</Button>}
        badge="Plan"
        kicker={`${openTasks.length} open tasks · ${state.calendarEvents.length} events`}
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

      <div aria-label="Plan views" className="grid grid-cols-3 gap-2 rounded-2xl border border-bronze/24 bg-midnight/36 p-1" role="tablist">
        <PlanTab active={view === 'flow'} icon={Columns3} label="Flow" onClick={() => setView('flow')} />
        <PlanTab active={view === 'tasks'} icon={CheckSquare2} label="Tasks" onClick={() => setView('tasks')} />
        <PlanTab active={view === 'calendar'} icon={CalendarDays} label="Calendar" onClick={() => setView('calendar')} />
      </div>

      {showCreate ? (
        view === 'calendar'
          ? <CalendarEventForm onClose={() => setShowCreate(false)} />
          : <TaskForm onClose={() => setShowCreate(false)} />
      ) : null}

      {view === 'flow' ? <FlowView /> : null}
      {view === 'tasks' ? <TaskView /> : null}
      {view === 'calendar' ? <CalendarView /> : null}
    </section>
  );
}

function PlanTab({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof Columns3; label: string; onClick: () => void }) {
  return (
    <button
      aria-selected={active}
      className={cn('flex min-h-11 items-center justify-center gap-2 rounded-xl border px-2 text-sm font-medium transition', active ? 'border-ember/48 bg-ember/14 text-stardust' : 'border-transparent text-stardust/55 hover:bg-stardust/[0.05] hover:text-stardust')}
      onClick={onClick}
      role="tab"
      type="button"
    >
      <Icon aria-hidden="true" size={16} />
      {label}
    </button>
  );
}

function FlowView() {
  const { state, updateGarment } = useCanonicalWorkspace();
  if (!state) return null;
  return (
    <div className="studio-scrollbar -mx-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8" role="tabpanel">
      <div className="grid min-w-[70rem] grid-cols-8 gap-3">
        {phases.map((phase) => {
          const garments = state.garments.filter((garment) => garment.phase === phase);
          return (
            <section className="rounded-2xl border border-bronze/22 bg-midnight/34 p-3" key={phase}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold capitalize text-stardust">{phase}</h2>
                <Badge variant="bronze">{garments.length}</Badge>
              </div>
              <div className="mt-3 space-y-3">
                {garments.map((garment) => (
                  <article className="rounded-xl border border-bronze/20 bg-stardust/[0.045] p-3" key={garment.id}>
                    <p className="text-sm font-semibold text-stardust">{garment.title}</p>
                    <p className="mt-1 text-xs text-stardust/46">{garment.garmentCode}</p>
                    <label className="mt-3 block text-xs text-stardust/52">
                      <span className="sr-only">Move {garment.title} to phase</span>
                      <select className="min-h-11 w-full rounded-xl border border-bronze/26 bg-midnight px-2 text-xs text-stardust" onChange={(event) => updateGarment(garment.id, { phase: event.target.value as CanonicalGarment['phase'] })} value={garment.phase}>
                        {phases.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </label>
                  </article>
                ))}
                {!garments.length ? <p className="rounded-xl border border-dashed border-bronze/22 p-3 text-xs leading-5 text-stardust/42">No garments in this phase.</p> : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function TaskView() {
  const { state, updateTaskStatus } = useCanonicalWorkspace();
  if (!state) return null;
  return (
    <Card className="space-y-3" role="tabpanel">
      {state.releaseTasks.map((task) => {
        const garment = state.garments.find((item) => item.id === task.garmentId);
        return (
          <article className="grid gap-3 rounded-2xl border border-bronze/22 bg-stardust/[0.035] p-4 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-center" key={task.id}>
            <div>
              <div className="flex flex-wrap items-center gap-2"><Badge variant={task.priority === 'urgent' ? 'ember' : 'bronze'}>{task.priority}</Badge><span className="text-xs text-stardust/48">{garment?.title ?? 'Studio-wide'}</span></div>
              <h2 className="mt-2 text-sm font-semibold text-stardust">{task.title}</h2>
              <p className="mt-1 text-sm leading-6 text-stardust/55">{task.description || 'No description.'}</p>
              <p className="mt-2 text-xs text-stardust/45">{task.dueAt ? `Due ${formatDay(task.dueAt)}` : 'No due date'}</p>
            </div>
            <label className="text-xs text-stardust/52"><span className="sr-only">Status for {task.title}</span><select className="min-h-11 w-full rounded-xl border border-bronze/26 bg-midnight px-3 text-sm text-stardust" onChange={(event) => updateTaskStatus(task.id, event.target.value as CanonicalReleaseTask['status'])} value={task.status}>{['todo', 'in_progress', 'blocked', 'done', 'cancelled'].map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}</select></label>
          </article>
        );
      })}
      {!state.releaseTasks.length ? <EmptyPlanState title="No tasks yet" detail="Create the first accountable next move. Tasks can be garment-specific or studio-wide." /> : null}
    </Card>
  );
}

function CalendarView() {
  const { state } = useCanonicalWorkspace();
  const schedule = useMemo(() => {
    if (!state) return [];
    return [
      ...state.calendarEvents.map((event) => ({ id: event.id, garmentId: event.garmentId, kind: event.eventType, startsAt: event.startsAt, title: event.title })),
      ...state.releaseTasks.filter((task) => task.dueAt).map((task) => ({ id: `task:${task.id}`, garmentId: task.garmentId || null, kind: 'task due', startsAt: task.dueAt!, title: task.title })),
    ].sort((left, right) => left.startsAt.localeCompare(right.startsAt));
  }, [state]);
  if (!state) return null;
  return (
    <Card className="space-y-3" role="tabpanel">
      {schedule.map((item) => (
        <article className="grid gap-2 rounded-2xl border border-bronze/22 bg-stardust/[0.035] p-4 sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:items-center" key={item.id}>
          <time className="text-sm tabular-nums text-ember" dateTime={item.startsAt}>{formatDay(item.startsAt)}</time>
          <div><h2 className="text-sm font-semibold text-stardust">{item.title}</h2><p className="mt-1 text-xs text-stardust/46">{state.garments.find((garment) => garment.id === item.garmentId)?.title ?? 'Studio-wide'}</p></div>
          <Badge variant="teal">{item.kind}</Badge>
        </article>
      ))}
      {!schedule.length ? <EmptyPlanState title="Calendar is clear" detail="Add a fitting, supplier review, release, shoot, or any other studio event." /> : null}
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
