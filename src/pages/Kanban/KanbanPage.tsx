import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
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
  AlertCircle,
  ArrowRight,
  GripVertical,
  Layers3,
  Shirt,
} from 'lucide-react';
import { Badge } from '../../components/shared/Badge';
import { Card } from '../../components/shared/Card';
import { PageHeader } from '../../components/shared/PageHeader';
import { ImageReadabilityOverlay } from '../../components/shared/ImageReadabilityOverlay';
import { StoredImage } from '../../components/shared/StoredImage';
import { useStudioData } from '../../hooks/useStudioData';
import { cn } from '../../lib/classes';
import { getProjectHeroImage } from '../../lib/imageAssets';
import { projectPhases, type ApparelProject, type ProjectPhase } from '../../types/studio';

export function KanbanPage() {
  const {
    data: { projects },
    updateProjectPhase,
  } = useStudioData();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 2 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 90, tolerance: 10 },
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
  const activeProject = activeProjectId
    ? projects.find((project) => project.id === activeProjectId)
    : undefined;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveProjectId(String(event.active.id));
  };

  const handleDragCancel = () => {
    setActiveProjectId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const projectId = String(event.active.id);
    const nextPhase = event.over?.id as ProjectPhase | undefined;

    setActiveProjectId(null);

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

      <DndContext
        sensors={sensors}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
      >
        <div className="studio-scrollbar -mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex min-h-[34rem] gap-4">
            {projectsByPhase.map(({ phase, projects }) => (
              <KanbanColumn key={phase} phase={phase} projects={projects} />
            ))}
          </div>
        </div>
        <DragOverlay adjustScale={false} dropAnimation={null} zIndex={9999}>
          {activeProject ? <KanbanProjectDragPreview project={activeProject} /> : null}
        </DragOverlay>
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
        'relative flex w-[17.25rem] shrink-0 flex-col rounded-3xl border bg-[linear-gradient(145deg,rgba(237,227,207,0.055),rgba(10,10,10,0.2))] p-3 shadow-[0_20px_70px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(237,227,207,0.035)] backdrop-blur-xl transition duration-200 sm:w-[20rem]',
        isOver
          ? 'z-20 border-ember/70 bg-ember/12 shadow-[0_22px_80px_rgba(200,155,60,0.18),0_0_0_1px_rgba(45,92,107,0.22)]'
          : 'border-bronze/24',
      )}
      ref={setNodeRef}
    >
      <div className="mb-3 flex items-start justify-between gap-3 rounded-2xl border border-bronze/24 bg-midnight/42 p-3">
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
          <div
            className={cn(
              'flex min-h-36 flex-1 items-center justify-center rounded-2xl border border-dashed p-4 text-center text-sm leading-6 transition duration-200',
              isOver
                ? 'border-ember/55 bg-ember/10 text-stardust/72 shadow-[inset_0_0_34px_rgba(200,155,60,0.08)]'
                : 'border-bronze/24 bg-midnight/20 text-stardust/42',
            )}
          >
            Drop a garment here to move it into {phase}.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function KanbanProjectCard({ project }: { project: ApparelProject }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: project.id,
    data: { projectId: project.id },
  });

  return (
    <article
      className={cn(
        'touch-none overflow-hidden rounded-2xl border border-bronze/28 bg-[linear-gradient(145deg,rgba(10,10,10,0.48),rgba(61,43,31,0.18))] text-stardust shadow-[0_16px_48px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(237,227,207,0.035)] transition-[border-color,background-color,box-shadow,opacity,transform] duration-150 hover:-translate-y-1 hover:border-ember/48 hover:bg-midnight/60',
        isDragging &&
          'scale-[0.985] border-ember/45 opacity-35 shadow-[inset_0_0_0_1px_rgba(200,155,60,0.16)]',
      )}
      ref={setNodeRef}
      {...listeners}
      {...attributes}
    >
      <KanbanProjectCardContent project={project} />
    </article>
  );
}

function KanbanProjectDragPreview({ project }: { project: ApparelProject }) {
  return (
    <article className="pointer-events-none w-[17.25rem] rotate-[0.35deg] scale-[1.035] overflow-hidden rounded-2xl border border-ember/75 bg-[linear-gradient(145deg,rgba(10,10,10,0.94),rgba(45,92,107,0.24),rgba(61,43,31,0.54))] text-stardust shadow-[0_34px_110px_rgba(0,0,0,0.52),0_0_44px_rgba(200,155,60,0.22),0_0_34px_rgba(45,92,107,0.18),inset_0_1px_0_rgba(237,227,207,0.08)] backdrop-blur-xl sm:w-[20rem]">
      <KanbanProjectCardContent project={project} isPreview />
    </article>
  );
}

function KanbanProjectCardContent({
  isPreview = false,
  project,
}: {
  isPreview?: boolean;
  project: ApparelProject;
}) {
  const materialCount = project.linkedMaterials.length;
  const heroImage = getProjectHeroImage(project);

  return (
    <>
      <div className="relative h-24 overflow-hidden border-b border-bronze/18 bg-[linear-gradient(135deg,rgba(27,58,99,0.64),rgba(10,10,10,0.7),rgba(61,43,31,0.72))]">
        {heroImage ? (
          <StoredImage
            asset={heroImage}
            className="h-full w-full object-cover"
          />
        ) : null}
        <ImageReadabilityOverlay asset={heroImage} variant="card" />
      </div>
      <div className="p-4">
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
            className={cn(
              'shrink-0 transition duration-150',
              isPreview ? 'text-ember/80' : 'text-stardust/35',
            )}
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
          <div className="studio-progress-track">
            <div
              className="studio-progress-fill"
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
      </div>
    </>
  );
}
