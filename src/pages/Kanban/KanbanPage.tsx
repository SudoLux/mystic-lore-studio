import { useMemo, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  AlertCircle,
  ArrowRight,
  GripVertical,
  Layers3,
  Shirt,
} from 'lucide-react';
import { Badge } from '../../components/shared/Badge';
import { Card } from '../../components/shared/Card';
import { PageHeader } from '../../components/shared/PageHeader';
import { useStudioData } from '../../hooks/useStudioData';
import { cn } from '../../lib/classes';
import { projectPhases, type ApparelProject, type ProjectPhase } from '../../types/studio';

export function KanbanPage() {
  const {
    data: { projects },
    updateProjectPhase,
  } = useStudioData();
  const [lastMove, setLastMove] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 120, tolerance: 8 },
    }),
  );

  const projectsByPhase = useMemo(
    () =>
      projectPhases.map((phase) => ({
        phase,
        projects: projects.filter((project) => project.phase === phase),
      })),
    [projects],
  );

  const activeCount = projects.filter(
    (project) => project.status === 'Active',
  ).length;
  const productionCount = projects.filter((project) =>
    ['Pattern Drafting', 'Sample Sewing', 'Fitting', 'Revision', 'Final Build'].includes(
      project.phase,
    ),
  ).length;

  const handleDragEnd = (event: DragEndEvent) => {
    const projectId = String(event.active.id);
    const nextPhase = event.over?.id as ProjectPhase | undefined;

    if (!nextPhase || !projectPhases.includes(nextPhase)) {
      return;
    }

    const project = projects.find((item) => item.id === projectId);
    const previousPhase = project?.phase;

    if (!project || previousPhase === nextPhase) {
      return;
    }

    updateProjectPhase(projectId, nextPhase);
    setLastMove(`${project.name} moved from ${previousPhase} to ${nextPhase}.`);
  };

  return (
    <section className="space-y-5">
      <PageHeader
        badge="Global Kanban"
        description="Move garments through the Mystic Lore workflow, from early concept work to lookbook readiness."
        title="Project Workflow"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <KanbanStat
          icon={<Shirt aria-hidden="true" size={18} strokeWidth={1.9} />}
          label="Projects"
          value={projects.length.toString()}
        />
        <KanbanStat
          icon={<Layers3 aria-hidden="true" size={18} strokeWidth={1.9} />}
          label="Active"
          value={activeCount.toString()}
        />
        <KanbanStat
          icon={<ArrowRight aria-hidden="true" size={18} strokeWidth={1.9} />}
          label="In Production"
          value={productionCount.toString()}
        />
      </div>

      <Card className="border-bronze/30 bg-[linear-gradient(135deg,rgba(27,58,99,0.2),rgba(10,10,10,0.48),rgba(61,43,31,0.34))]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge variant="teal">Drag Board</Badge>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stardust/62">
              Drag project cards between phase columns. Changes are saved to the
              local Mystic Lore Studio data store.
            </p>
          </div>
          {lastMove ? (
            <div className="rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-stardust/72">
              {lastMove}
            </div>
          ) : null}
        </div>
      </Card>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="studio-scrollbar -mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex min-h-[34rem] gap-4">
            {projectsByPhase.map(({ phase, projects }) => (
              <KanbanColumn key={phase} phase={phase} projects={projects} />
            ))}
          </div>
        </div>
      </DndContext>
    </section>
  );
}

function KanbanStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="transition duration-300 hover:border-ember/45">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-stardust/42">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold text-stardust">{value}</p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-bronze/25 bg-midnight/45 text-ember">
          {icon}
        </span>
      </div>
    </Card>
  );
}

function KanbanColumn({
  phase,
  projects,
}: {
  phase: ProjectPhase;
  projects: ApparelProject[];
}) {
  const { isOver, setNodeRef } = useDroppable({ id: phase });

  return (
    <section
      className={cn(
        'flex w-[17.25rem] shrink-0 flex-col rounded-3xl border bg-stardust/[0.045] p-3 backdrop-blur-xl transition duration-300 sm:w-[20rem]',
        isOver
          ? 'border-ember/60 bg-ember/10 shadow-[0_22px_70px_rgba(200,155,60,0.12)]'
          : 'border-bronze/24',
      )}
      ref={setNodeRef}
    >
      <div className="mb-3 flex items-start justify-between gap-3 rounded-2xl border border-bronze/20 bg-midnight/35 p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-stardust">{phase}</p>
          <p className="mt-1 text-xs text-stardust/45">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </p>
        </div>
        <span className="rounded-full border border-bronze/25 bg-espresso/40 px-2.5 py-1 text-xs font-medium text-ember">
          {projects.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        {projects.map((project) => (
          <KanbanProjectCard key={project.id} project={project} />
        ))}
        {projects.length === 0 ? (
          <div className="flex min-h-36 flex-1 items-center justify-center rounded-2xl border border-dashed border-bronze/24 bg-midnight/20 p-4 text-center text-sm leading-6 text-stardust/42">
            Drop a garment here to move it into {phase}.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function KanbanProjectCard({ project }: { project: ApparelProject }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: project.id,
      data: { projectId: project.id },
    });
  const materialCount = project.linkedMaterials.length;
  const dragStyle = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <article
      className={cn(
        'touch-none rounded-2xl border border-bronze/25 bg-midnight/42 p-4 text-stardust shadow-[0_16px_45px_rgba(0,0,0,0.2)] transition duration-200 hover:-translate-y-1 hover:border-ember/45 hover:bg-midnight/58',
        isDragging && 'z-30 scale-[1.02] border-ember/70 opacity-90 shadow-[0_24px_70px_rgba(200,155,60,0.16)]',
      )}
      ref={setNodeRef}
      style={dragStyle}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-stardust">
            {project.name}
          </p>
          <p className="mt-1 text-xs text-stardust/48">
            {project.garmentType}
          </p>
        </div>
        <GripVertical
          aria-hidden="true"
          className="shrink-0 text-stardust/35"
          size={18}
          strokeWidth={1.8}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant={project.status === 'Blocked' ? 'ember' : 'teal'}>
          {project.status}
        </Badge>
        <Badge variant={project.priority === 'Critical' ? 'ember' : 'blue'}>
          {project.priority}
        </Badge>
      </div>

      <p className="mt-4 line-clamp-2 text-sm leading-6 text-stardust/58">
        {project.summary}
      </p>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-stardust/46">Progress</span>
          <span className="font-medium text-ember">{project.progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-stardust/10">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#C89B3C,#2D5C6B,#EDE3CF)]"
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-bronze/18 bg-espresso/24 px-3 py-2 text-xs text-stardust/55">
        <span>{materialCount} linked materials</span>
        {project.status === 'Blocked' ? (
          <span className="inline-flex items-center gap-1 text-ember">
            <AlertCircle aria-hidden="true" size={13} strokeWidth={1.9} />
            Blocked
          </span>
        ) : null}
      </div>
    </article>
  );
}
