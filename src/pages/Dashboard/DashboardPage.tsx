import {
  ArrowRight,
  BookOpen,
  Boxes,
  CheckCircle2,
  Columns3,
  FolderPlus,
  Gauge,
  Layers3,
  PackagePlus,
  Scissors,
  Shirt,
  Sparkles,
} from 'lucide-react';
import { Badge } from '../../components/shared/Badge';
import { Button } from '../../components/shared/Button';
import { Card } from '../../components/shared/Card';
import { PageHeader } from '../../components/shared/PageHeader';
import { useStudioData } from '../../hooks/useStudioData';
import { LOW_YARDAGE_THRESHOLD, calculateFabricYardage } from '../../lib/yardage';
import { projectPhases, type ApparelProject } from '../../types/studio';
import type { PageId } from '../../types/navigation';

type DashboardPageProps = {
  onAddFabric: () => void;
  onNavigate: (pageId: PageId) => void;
  onNewProject: () => void;
};

const productionPhases = new Set([
  'Pattern Drafting',
  'Sample Sewing',
  'Fitting',
  'Revision',
  'Final Build',
  'Photoshoot',
  'Lookbook Ready',
]);

const quickActions = [
  {
    label: 'New Project',
    icon: FolderPlus,
    pageId: 'projects',
  },
  {
    label: 'Add Fabric',
    icon: PackagePlus,
    pageId: 'fabrics',
  },
  {
    label: 'Open Kanban',
    icon: Columns3,
    pageId: 'kanban',
  },
  {
    label: 'Create Lookbook',
    icon: BookOpen,
    pageId: 'lookbooks',
  },
] satisfies Array<{ label: string; icon: typeof Sparkles; pageId: PageId }>;

export function DashboardPage({
  onAddFabric,
  onNavigate,
  onNewProject,
}: DashboardPageProps) {
  const {
    data: { fabrics, linkedMaterials, projects, tasks },
  } = useStudioData();
  const activeProjects = projects.filter((project) => project.status === 'Active');
  const completedProjects = projects.filter(
    (project) => project.status === 'Completed',
  );
  const productionProjects = projects.filter((project) =>
    productionPhases.has(project.phase),
  );
  const totalYardage = fabrics.reduce(
    (total, fabric) => total + fabric.totalYards,
    0,
  );
  const lowYardageFabrics = fabrics.filter(
    (fabric) =>
      calculateFabricYardage(fabric, linkedMaterials, projects).availableYards <
      LOW_YARDAGE_THRESHOLD,
  );
  const featuredProjects = [...projects]
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 3);
  const recentlyUpdatedProjects = [...projects]
    .sort((a, b) => latestProjectDate(b).localeCompare(latestProjectDate(a)))
    .slice(0, 4);
  const nextTasks = [...tasks]
    .filter((task) => task.status !== 'Done')
    .sort((a, b) => {
      const priorityRank = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      return (
        priorityRank[a.priority] - priorityRank[b.priority] ||
        (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31')
      );
    })
    .slice(0, 5);
  const statCards = [
    {
      label: 'Active Projects',
      value: activeProjects.length.toString(),
      detail: 'Garments currently moving through the studio.',
      icon: Shirt,
    },
    {
      label: 'Completed',
      value: completedProjects.length.toString(),
      detail: 'Archived wins ready for collection records.',
      icon: CheckCircle2,
    },
    {
      label: 'In Production',
      value: productionProjects.length.toString(),
      detail: 'Projects in sampling, fitting, build, or shoot phases.',
      icon: Gauge,
    },
    {
      label: 'Total Fabrics',
      value: fabrics.length.toString(),
      detail: 'Fabric records available in the vault.',
      icon: Boxes,
    },
    {
      label: 'Total Yardage',
      value: `${formatNumber(totalYardage)} yd`,
      detail: 'Current recorded inventory before allocations.',
      icon: Layers3,
    },
    {
      label: 'Low Yardage',
      value: lowYardageFabrics.length.toString(),
      detail: 'Fabrics with fewer than five free yards remaining.',
      icon: Scissors,
    },
  ];
  const getProject = (projectId: string) =>
    projects.find((project) => project.id === projectId);
  const handleQuickAction = (label: string, pageId: PageId) => {
    if (label === 'New Project') {
      onNewProject();
      return;
    }

    if (label === 'Add Fabric') {
      onAddFabric();
      return;
    }

    onNavigate(pageId);
  };

  return (
    <section className="space-y-5">
      <PageHeader
        badge="Dashboard"
        description="A live control center for garment momentum, fabric allocation, phase balance, and next studio moves."
        title="Studio Command"
      >
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {quickActions.map((action) => {
            const Icon = action.icon;

            return (
              <Button
                icon={<Icon aria-hidden="true" size={16} strokeWidth={1.9} />}
                key={action.label}
                onClick={() => handleQuickAction(action.label, action.pageId)}
                size="sm"
                variant={action.label === 'New Project' ? 'primary' : 'secondary'}
              >
                {action.label}
              </Button>
            );
          })}
        </div>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;

          return (
            <Card
              className="group min-h-44 transition duration-300 hover:-translate-y-1 hover:border-ember/45 hover:bg-stardust/[0.075] xl:col-span-2"
              key={stat.label}
            >
              <div className="flex h-full flex-col justify-between gap-5">
                <div className="flex items-start justify-between gap-3">
                  <Badge variant={index % 2 === 0 ? 'ember' : 'teal'}>
                    {stat.label}
                  </Badge>
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-bronze/25 bg-midnight/45 text-ember transition duration-300 group-hover:border-ember/45">
                    <Icon aria-hidden="true" size={18} strokeWidth={1.9} />
                  </span>
                </div>
                <div>
                  <p className="text-4xl font-semibold leading-none text-stardust">
                    {stat.value}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-stardust/60">
                    {stat.detail}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.8fr]">
        <Card className="bg-[linear-gradient(145deg,rgba(27,58,99,0.35),rgba(45,92,107,0.18)_46%,rgba(61,43,31,0.62))]" elevated>
          <div className="flex h-full flex-col justify-between gap-10">
            <div>
              <Badge variant="ember">Featured Garments</Badge>
              <h2 className="mt-5 max-w-2xl text-2xl font-semibold leading-tight text-stardust sm:text-3xl">
                The pieces carrying the collection signal right now.
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-stardust/68 sm:text-base">
                Ranked by progress so the strongest project momentum stays in
                immediate view.
              </p>
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              {featuredProjects.map((project) => (
                <ProjectFeatureCard key={project.id} project={project} />
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex h-full flex-col justify-between">
            <div>
              <Badge variant="teal">Next Actions</Badge>
              <h2 className="mt-5 text-2xl font-semibold leading-tight text-stardust">
                Priority work queue
              </h2>
              <p className="mt-4 text-sm leading-7 text-stardust/64">
                Tasks are sorted by priority and due date so the next studio
                move is easy to find.
              </p>
            </div>
            <div className="mt-8 space-y-3">
              {nextTasks.map((task) => {
                const project = getProject(task.projectId);

                return (
                  <div
                    className="rounded-2xl border border-bronze/20 bg-espresso/28 p-4 transition duration-300 hover:border-ember/35 hover:bg-espresso/45"
                    key={task.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-stardust">
                          {task.title}
                        </p>
                        <p className="mt-1 truncate text-xs text-stardust/52">
                          {project?.name ?? 'Studio task'}
                        </p>
                      </div>
                      <Badge
                        className="shrink-0"
                        variant={task.priority === 'Critical' ? 'ember' : 'blue'}
                      >
                        {task.priority}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-stardust/52">
                      <span>{task.phase}</span>
                      <span>•</span>
                      <span>{task.dueDate ? formatDate(task.dueDate) : 'No due date'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <SectionHeading
            eyebrow="Phase Summary"
            title="Projects by phase"
            subtitle="A quick read on where the collection is concentrated."
          />
          <div className="mt-6 space-y-4">
            {projectPhases
              .map((phase) => ({
                phase,
                count: projects.filter((project) => project.phase === phase).length,
              }))
              .filter((item) => item.count > 0)
              .map((item) => (
                <div key={item.phase}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-stardust">
                      {item.phase}
                    </span>
                    <span className="text-sm text-ember">{item.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-stardust/10">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#C89B3C,#2D5C6B)]"
                      style={{
                        width: `${Math.max((item.count / projects.length) * 100, 8)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </Card>

        <Card>
          <SectionHeading
            eyebrow="Recent Studio Notes"
            title="Recently updated projects"
            subtitle="Derived from the latest project note activity in the demo data."
          />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {recentlyUpdatedProjects.map((project) => (
              <div
                className="rounded-2xl border border-bronze/20 bg-midnight/32 p-4 transition duration-300 hover:border-ember/35 hover:bg-midnight/45"
                key={project.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-stardust">
                      {project.name}
                    </p>
                    <p className="mt-1 text-xs text-stardust/52">
                      Updated {formatDate(latestProjectDate(project))}
                    </p>
                  </div>
                  <Badge variant={project.status === 'Blocked' ? 'ember' : 'teal'}>
                    {project.status}
                  </Badge>
                </div>
                <p className="mt-4 line-clamp-2 text-sm leading-6 text-stardust/62">
                  {project.summary}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="border-bronze/30 bg-[linear-gradient(115deg,rgba(10,10,10,0.56),rgba(27,58,99,0.22),rgba(154,108,60,0.16))]">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <SectionHeading
            eyebrow="Fabric Watch"
            title="Low yardage fabrics"
            subtitle="These materials have fewer than five free yards after reservations and usage."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {lowYardageFabrics.map((fabric) => {
              const available = calculateFabricYardage(
                fabric,
                linkedMaterials,
                projects,
              ).availableYards;

              return (
                <div
                  className="rounded-2xl border border-bronze/20 bg-espresso/30 p-4"
                  key={fabric.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-stardust">
                      {fabric.name}
                    </p>
                    <span className="text-sm font-semibold text-ember">
                      {formatNumber(available)} yd
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-stardust/55">
                    {fabric.category} • {fabric.colorFamily}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </section>
  );
}

function ProjectFeatureCard({ project }: { project: ApparelProject }) {
  return (
    <article className="group rounded-2xl border border-bronze/25 bg-midnight/36 p-4 transition duration-300 hover:-translate-y-1 hover:border-ember/45 hover:bg-midnight/48">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-stardust">
            {project.name}
          </p>
          <p className="mt-1 text-xs text-stardust/50">
            {project.garmentType} • {project.collection}
          </p>
        </div>
        <ArrowRight
          aria-hidden="true"
          className="text-ember opacity-60 transition duration-300 group-hover:translate-x-1 group-hover:opacity-100"
          size={18}
          strokeWidth={1.9}
        />
      </div>
      <p className="mt-4 line-clamp-3 min-h-16 text-sm leading-6 text-stardust/62">
        {project.summary}
      </p>
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-stardust/52">{project.phase}</span>
          <span className="font-medium text-ember">{project.progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-stardust/10">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#C89B3C,#EDE3CF)]"
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>
    </article>
  );
}

function SectionHeading({
  eyebrow,
  subtitle,
  title,
}: {
  eyebrow: string;
  subtitle: string;
  title: string;
}) {
  return (
    <div>
      <Badge variant="bronze">{eyebrow}</Badge>
      <h2 className="mt-4 text-2xl font-semibold leading-tight text-stardust">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-6 text-stardust/60">{subtitle}</p>
    </div>
  );
}

function latestProjectDate(project: ApparelProject) {
  return (
    [...project.notes]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .at(0)?.createdAt ?? project.startDate
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${date}T00:00:00`));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
  }).format(value);
}
