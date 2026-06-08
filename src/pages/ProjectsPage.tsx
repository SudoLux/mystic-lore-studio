import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Grid2X2,
  List,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { Badge } from '../components/shared/Badge';
import { Button } from '../components/shared/Button';
import { Card } from '../components/shared/Card';
import { PageHeader } from '../components/shared/PageHeader';
import { useStudioData } from '../hooks/useStudioData';
import { cn } from '../lib/classes';
import {
  garmentTypes,
  projectPhases,
  projectStatuses,
  type ApparelProject,
  type Fabric,
  type GarmentType,
  type ProjectPhase,
  type ProjectStatus,
  type TaskPriority,
} from '../types/studio';

type ProjectsPageProps = {
  onOpenProject: (projectId: string) => void;
};

type ViewMode = 'gallery' | 'list';
type FilterValue = 'All';

const allValue: FilterValue = 'All';
const priorities: TaskPriority[] = ['Low', 'Medium', 'High', 'Critical'];

const selectClassName =
  'h-11 w-full rounded-xl border border-bronze/30 bg-midnight/60 px-3 text-sm text-stardust outline-none transition duration-200 hover:border-ember/45 focus:border-ember/60';

export function ProjectsPage({ onOpenProject }: ProjectsPageProps) {
  const {
    data: { fabrics, projects },
  } = useStudioData();
  const [query, setQuery] = useState('');
  const [garmentType, setGarmentType] = useState<GarmentType | FilterValue>(
    allValue,
  );
  const [status, setStatus] = useState<ProjectStatus | FilterValue>(allValue);
  const [phase, setPhase] = useState<ProjectPhase | FilterValue>(allValue);
  const [priority, setPriority] = useState<TaskPriority | FilterValue>(allValue);
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return projects.filter((project) => {
      const searchableText = [
        project.name,
        project.garmentType,
        project.collection,
        project.summary,
        project.designIntent,
      ]
        .join(' ')
        .toLowerCase();

      return (
        (!normalizedQuery || searchableText.includes(normalizedQuery)) &&
        (garmentType === allValue || project.garmentType === garmentType) &&
        (status === allValue || project.status === status) &&
        (phase === allValue || project.phase === phase) &&
        (priority === allValue || project.priority === priority)
      );
    });
  }, [garmentType, phase, priority, projects, query, status]);
  const fabricById = useMemo(
    () => new Map(fabrics.map((fabric) => [fabric.id, fabric])),
    [fabrics],
  );

  return (
    <section className="space-y-5">
      <PageHeader
        badge="Project Library"
        description="Browse garment dossiers, filter the collection pipeline, and open a project detail route for focused review."
        title="Projects"
      >
        <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
      </PageHeader>

      <Card className="border-bronze/30 bg-[linear-gradient(135deg,rgba(27,58,99,0.22),rgba(10,10,10,0.48),rgba(61,43,31,0.36))]">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_repeat(4,minmax(0,0.75fr))]">
          <label className="relative block">
            <span className="sr-only">Search projects</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stardust/45"
              size={18}
              strokeWidth={1.8}
            />
            <input
              className="h-11 w-full rounded-xl border border-bronze/30 bg-midnight/60 pl-10 pr-3 text-sm text-stardust outline-none transition duration-200 placeholder:text-stardust/38 hover:border-ember/45 focus:border-ember/60"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, garment, collection, description"
              type="search"
              value={query}
            />
          </label>

          <FilterSelect
            label="Garment type"
            onChange={(value) => setGarmentType(value as GarmentType | FilterValue)}
            options={garmentTypes}
            value={garmentType}
          />
          <FilterSelect
            label="Status"
            onChange={(value) => setStatus(value as ProjectStatus | FilterValue)}
            options={projectStatuses}
            value={status}
          />
          <FilterSelect
            label="Phase"
            onChange={(value) => setPhase(value as ProjectPhase | FilterValue)}
            options={projectPhases}
            value={phase}
          />
          <FilterSelect
            label="Priority"
            onChange={(value) => setPriority(value as TaskPriority | FilterValue)}
            options={priorities}
            value={priority}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-bronze/20 pt-4">
          <div className="flex items-center gap-2 text-sm text-stardust/62">
            <SlidersHorizontal aria-hidden="true" size={16} strokeWidth={1.8} />
            <span>
              {filteredProjects.length} of {projects.length} projects shown
            </span>
          </div>
          <Button
            onClick={() => {
              setQuery('');
              setGarmentType(allValue);
              setStatus(allValue);
              setPhase(allValue);
              setPriority(allValue);
            }}
            size="sm"
            variant="ghost"
          >
            Reset filters
          </Button>
        </div>
      </Card>

      {filteredProjects.length > 0 ? (
        <div
          className={cn(
            viewMode === 'gallery'
              ? 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'
              : 'space-y-3',
          )}
        >
          {filteredProjects.map((project, index) =>
            viewMode === 'gallery' ? (
              <ProjectGalleryCard
                key={project.id}
                fabricById={fabricById}
                onOpenProject={onOpenProject}
                project={project}
                style={{ animationDelay: `${index * 55}ms` }}
              />
            ) : (
              <ProjectListCard
                key={project.id}
                fabricById={fabricById}
                onOpenProject={onOpenProject}
                project={project}
                style={{ animationDelay: `${index * 45}ms` }}
              />
            ),
          )}
        </div>
      ) : (
        <Card className="border-ember/30 text-center">
          <p className="text-lg font-semibold text-stardust">No projects found</p>
          <p className="mt-2 text-sm text-stardust/60">
            Adjust search or filters to bring more garments back into view.
          </p>
        </Card>
      )}
    </section>
  );
}

function ViewModeToggle({
  onChange,
  viewMode,
}: {
  onChange: (viewMode: ViewMode) => void;
  viewMode: ViewMode;
}) {
  return (
    <div className="inline-grid grid-cols-2 rounded-2xl border border-bronze/30 bg-midnight/55 p-1">
      <button
        aria-pressed={viewMode === 'gallery'}
        className={cn(
          'inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium transition duration-200',
          viewMode === 'gallery'
            ? 'bg-ember text-midnight'
            : 'text-stardust/62 hover:bg-stardust/8 hover:text-stardust',
        )}
        onClick={() => onChange('gallery')}
        type="button"
      >
        <Grid2X2 aria-hidden="true" size={16} strokeWidth={1.8} />
        Gallery
      </button>
      <button
        aria-pressed={viewMode === 'list'}
        className={cn(
          'inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium transition duration-200',
          viewMode === 'list'
            ? 'bg-ember text-midnight'
            : 'text-stardust/62 hover:bg-stardust/8 hover:text-stardust',
        )}
        onClick={() => onChange('list')}
        type="button"
      >
        <List aria-hidden="true" size={16} strokeWidth={1.8} />
        Compact
      </button>
    </div>
  );
}

function FilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: readonly string[];
  value: string;
}) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        className={selectClassName}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value={allValue}>All {label}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ProjectGalleryCard({
  fabricById,
  onOpenProject,
  project,
  style,
}: {
  fabricById: Map<string, Fabric>;
  onOpenProject: (projectId: string) => void;
  project: ApparelProject;
  style: React.CSSProperties;
}) {
  const fabrics = getProjectFabrics(project, fabricById);
  const difficulty = getDifficulty(project);
  const lastUpdated = getLastUpdated(project);

  return (
    <button
      className="studio-project-card group min-h-[31rem] overflow-hidden rounded-3xl border border-bronze/25 bg-stardust/[0.055] text-left text-stardust shadow-[0_24px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl transition duration-300 hover:-translate-y-1.5 hover:border-ember/55 hover:bg-stardust/[0.075] hover:shadow-[0_28px_90px_rgba(200,155,60,0.12)]"
      onClick={() => onOpenProject(project.id)}
      style={style}
      type="button"
    >
      <div className="h-36 border-b border-bronze/20 bg-[radial-gradient(circle_at_20%_10%,rgba(200,155,60,0.34),transparent_30%),radial-gradient(circle_at_88%_18%,rgba(45,92,107,0.36),transparent_34%),linear-gradient(135deg,rgba(27,58,99,0.74),rgba(10,10,10,0.72),rgba(61,43,31,0.82))] p-4">
        <div className="flex items-start justify-between gap-3">
          <Badge variant={project.status === 'Blocked' ? 'ember' : 'teal'}>
            {project.status}
          </Badge>
          <span className="rounded-full border border-stardust/15 bg-midnight/45 px-3 py-1 text-xs font-medium text-stardust/72">
            {lastUpdated}
          </span>
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-xl font-semibold text-stardust">
              {project.name}
            </p>
            <p className="mt-1 text-sm text-stardust/52">
              {project.garmentType} • {project.collection}
            </p>
          </div>
          <ArrowRight
            aria-hidden="true"
            className="mt-1 shrink-0 text-ember opacity-55 transition duration-300 group-hover:translate-x-1 group-hover:opacity-100"
            size={20}
            strokeWidth={1.9}
          />
        </div>

        <p className="mt-4 line-clamp-3 min-h-16 text-sm leading-6 text-stardust/64">
          {project.summary}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <ProjectDatum label="Phase" value={project.phase} />
          <ProjectDatum label="Priority" value={project.priority} />
          <ProjectDatum label="Difficulty" value={difficulty} />
          <ProjectDatum label="Progress" value={`${project.progress}%`} />
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-stardust/52">Build progress</span>
            <span className="font-medium text-ember">{project.progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-stardust/10">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#C89B3C,#2D5C6B,#EDE3CF)] transition-all duration-500"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>

        <FabricSwatches fabrics={fabrics} />
      </div>
    </button>
  );
}

function ProjectListCard({
  fabricById,
  onOpenProject,
  project,
  style,
}: {
  fabricById: Map<string, Fabric>;
  onOpenProject: (projectId: string) => void;
  project: ApparelProject;
  style: React.CSSProperties;
}) {
  const fabrics = getProjectFabrics(project, fabricById);

  return (
    <button
      className="studio-project-card group grid w-full gap-4 rounded-2xl border border-bronze/25 bg-stardust/[0.055] p-4 text-left text-stardust shadow-[0_18px_55px_rgba(0,0,0,0.18)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-ember/50 hover:bg-stardust/[0.075] sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_auto]"
      onClick={() => onOpenProject(project.id)}
      style={style}
      type="button"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={project.status === 'Blocked' ? 'ember' : 'teal'}>
            {project.status}
          </Badge>
          <Badge variant="bronze">{project.phase}</Badge>
        </div>
        <p className="mt-3 truncate text-lg font-semibold text-stardust">
          {project.name}
        </p>
        <p className="mt-1 text-sm text-stardust/52">
          {project.garmentType} • {project.collection}
        </p>
      </div>

      <div className="min-w-0">
        <p className="line-clamp-2 text-sm leading-6 text-stardust/62">
          {project.summary}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-stardust/52">
          <span>{project.priority} priority</span>
          <span>•</span>
          <span>{getDifficulty(project)} difficulty</span>
          <span>•</span>
          <span>{getLastUpdated(project)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <div className="min-w-28">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-stardust/52">Progress</span>
            <span className="text-ember">{project.progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-stardust/10">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#C89B3C,#2D5C6B)]"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>
        <FabricSwatchStack fabrics={fabrics} />
        <ArrowRight
          aria-hidden="true"
          className="text-ember opacity-55 transition duration-300 group-hover:translate-x-1 group-hover:opacity-100"
          size={19}
          strokeWidth={1.9}
        />
      </div>
    </button>
  );
}

function ProjectDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-bronze/20 bg-midnight/32 p-3">
      <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-stardust/38">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-stardust">{value}</p>
    </div>
  );
}

function FabricSwatches({ fabrics }: { fabrics: Fabric[] }) {
  return (
    <div className="mt-5 border-t border-bronze/20 pt-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-stardust/42">
        Linked Fabrics
      </p>
      <div className="space-y-2">
        {fabrics.map((fabric) => (
          <div className="flex items-center gap-2" key={fabric.id}>
            <FabricSwatch fabric={fabric} />
            <span className="truncate text-sm text-stardust/70">{fabric.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FabricSwatchStack({ fabrics }: { fabrics: Fabric[] }) {
  return (
    <div className="flex -space-x-2">
      {fabrics.slice(0, 3).map((fabric) => (
        <FabricSwatch className="ring-2 ring-midnight" fabric={fabric} key={fabric.id} />
      ))}
    </div>
  );
}

function FabricSwatch({
  className,
  fabric,
}: {
  className?: string;
  fabric: Fabric;
}) {
  return (
    <span
      aria-label={fabric.name}
      className={cn(
        'inline-flex h-5 w-5 shrink-0 rounded-full border border-stardust/25',
        className,
      )}
      style={{ background: getFabricSwatch(fabric) }}
      title={fabric.name}
    />
  );
}

function getProjectFabrics(
  project: ApparelProject,
  fabricById: Map<string, Fabric>,
) {
  return project.linkedMaterials
    .map((material) =>
      material.fabricId ? fabricById.get(material.fabricId) : undefined,
    )
    .filter((fabric): fabric is Fabric => Boolean(fabric));
}

function getDifficulty(project: ApparelProject) {
  const score =
    (project.priority === 'Critical' ? 3 : project.priority === 'High' ? 2 : 1) +
    project.linkedMaterials.length +
    project.tasks.filter((task) => task.status !== 'Done').length;

  if (score >= 7) {
    return 'Masterwork';
  }

  if (score >= 5) {
    return 'Advanced';
  }

  if (score >= 3) {
    return 'Moderate';
  }

  return 'Light';
}

function getLastUpdated(project: ApparelProject) {
  const latestNote = [...project.notes].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )[0];

  return formatDate(latestNote?.createdAt ?? project.startDate);
}

function getFabricSwatch(fabric: Fabric) {
  const swatches: Record<string, string> = {
    'Midnight indigo': 'linear-gradient(135deg,#05070E,#1B3A63,#111827)',
    Black: 'linear-gradient(135deg,#030303,#202020,#0A0A0A)',
    'Golden ember': 'linear-gradient(135deg,#C89B3C,#9A6C3C,#EDE3CF)',
    'Deep espresso': 'linear-gradient(135deg,#3D2B1F,#9A6C3C,#1f130d)',
    'Stardust ivory': 'linear-gradient(135deg,#EDE3CF,#bda984,#f8f1e5)',
    'Nebula teal': 'linear-gradient(135deg,#2D5C6B,#1B3A63,#58a0a7)',
  };

  return swatches[fabric.colorFamily] ?? 'linear-gradient(135deg,#C89B3C,#2D5C6B)';
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${date}T00:00:00`));
}
