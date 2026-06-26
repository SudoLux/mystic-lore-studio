import { useRef, type ReactNode } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
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
import { MobilePageHeader } from '../../components/shared/MobilePageHeader';
import { MobileSummaryStrip } from '../../components/shared/MobileSummaryStrip';
import { ImageReadabilityOverlay } from '../../components/shared/ImageReadabilityOverlay';
import { StoredImage } from '../../components/shared/StoredImage';
import { useStudioData } from '../../hooks/useStudioData';
import {
  formatStudioDate as formatDate,
  studioDateTimestamp,
} from '../../lib/dates';
import { getProjectHeroImage } from '../../lib/imageAssets';
import { LOW_YARDAGE_THRESHOLD, calculateFabricYardage } from '../../lib/yardage';
import { projectPhases, type ApparelProject } from '../../types/studio';
import type { PageId } from '../../types/navigation';

type DashboardPageProps = {
  onAddFabric: () => void;
  onNavigate: (pageId: PageId) => void;
  onNewProject: () => void;
  onOpenProject: (projectId: string) => void;
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
  onOpenProject,
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
  const heroProject = getHeroProject(projects);
  const supportingFeaturedProjects = getSupportingFeaturedProjects(
    projects,
    heroProject?.id,
  );
  const recentlyUpdatedProjects = [...projects]
    .sort(
      (a, b) =>
        studioDateTimestamp(latestProjectDate(b)) -
        studioDateTimestamp(latestProjectDate(a)),
    )
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
      <MobilePageHeader
        action={
          <Button
            icon={<FolderPlus aria-hidden="true" size={15} strokeWidth={1.9} />}
            onClick={onNewProject}
            size="sm"
            variant="primary"
          >
            New
          </Button>
        }
        badge="Dashboard"
        kicker={`${activeProjects.length} active / ${nextTasks.length} next moves`}
        title="Today in Studio"
      />

      <MobileSummaryStrip
        items={statCards.map((stat) => {
          const Icon = stat.icon;

          return {
            icon: <Icon aria-hidden="true" size={15} strokeWidth={1.9} />,
            label: stat.label,
            value: stat.value,
          };
        })}
      />

      <Card className="border-ember/28 bg-[linear-gradient(145deg,rgba(27,58,99,0.22),rgba(10,10,10,0.58),rgba(61,43,31,0.34))] sm:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Badge variant="ember">Daily Cockpit</Badge>
            <h2 className="mt-3 text-xl font-semibold text-stardust">
              Studio pulse
            </h2>
          </div>
          <Button onClick={() => onNavigate('kanban')} size="sm" variant="secondary">
            Flow
          </Button>
        </div>
        <div className="mt-4 grid gap-3">
          <MobilePulseItem
            label="Next task"
            value={nextTasks[0]?.title ?? 'No open tasks'}
          />
          <MobilePulseItem
            label="Featured"
            value={heroProject?.name ?? 'No project yet'}
          />
          <MobilePulseItem
            label="Fabric watch"
            value={`${lowYardageFabrics.length} low-yardage ${lowYardageFabrics.length === 1 ? 'fabric' : 'fabrics'}`}
          />
        </div>
      </Card>

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

      <div className="hidden gap-4 sm:grid md:grid-cols-2 xl:grid-cols-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;

          return (
            <Card
              className="group min-h-44 transition duration-300 hover:-translate-y-1 hover:border-ember/48 hover:bg-stardust/[0.08] hover:shadow-[0_28px_90px_rgba(200,155,60,0.09)] xl:col-span-2"
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

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_24rem]">
        <FeaturedGarmentsSection
          heroProject={heroProject}
          onNewProject={onNewProject}
          onOpenProject={onOpenProject}
          supportingProjects={supportingFeaturedProjects}
        />

        <Card className="hidden sm:block">
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
                  <div className="studio-progress-track">
                    <div
                      className="studio-progress-fill"
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
                className="overflow-hidden rounded-2xl border border-bronze/20 bg-midnight/32 transition duration-300 hover:border-ember/35 hover:bg-midnight/45"
                key={project.id}
              >
                <ProjectImageBand project={project} className="h-24" />
                <div className="p-4">
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

function FeaturedGarmentsSection({
  heroProject,
  onNewProject,
  onOpenProject,
  supportingProjects,
}: {
  heroProject?: ApparelProject;
  onNewProject: () => void;
  onOpenProject: (projectId: string) => void;
  supportingProjects: ApparelProject[];
}) {
  if (!heroProject) {
    return (
      <Card
        className="flex min-h-[34rem] items-center justify-center border-ember/30 bg-[radial-gradient(circle_at_24%_18%,rgba(200,155,60,0.22),transparent_30%),linear-gradient(145deg,rgba(27,58,99,0.24),rgba(10,10,10,0.58),rgba(61,43,31,0.38))] text-center"
        elevated
      >
        <div className="max-w-lg">
          <Badge variant="ember">Featured Garments</Badge>
          <h2 className="mt-5 text-3xl font-semibold leading-tight text-stardust">
            Your featured garment will appear here once a project is added.
          </h2>
          <p className="mt-4 text-sm leading-7 text-stardust/62">
            Start a garment record and the dashboard will automatically surface
            the strongest current project.
          </p>
          <Button className="mt-7" onClick={onNewProject} variant="primary">
            Create Project
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0" elevated>
      <div className="bg-[radial-gradient(circle_at_18%_12%,rgba(200,155,60,0.18),transparent_30%),linear-gradient(145deg,rgba(27,58,99,0.28),rgba(10,10,10,0.58),rgba(61,43,31,0.44))] p-4 sm:p-5 lg:p-6">
        <div className="hidden flex-col gap-3 sm:flex sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="ember">Featured Garments</Badge>
            <h2 className="mt-4 max-w-2xl text-2xl font-semibold leading-tight text-stardust sm:text-3xl">
              The collection signal, staged like an editorial lead.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-stardust/58">
            Selected from active projects by progress, then latest studio update.
          </p>
        </div>

        <FeaturedGarmentHero
          onOpenProject={onOpenProject}
          project={heroProject}
        />

        <FeaturedProjectCarousel
          onOpenProject={onOpenProject}
          projects={supportingProjects}
        />
      </div>
    </Card>
  );
}

function FeaturedGarmentHero({
  onOpenProject,
  project,
}: {
  onOpenProject: (projectId: string) => void;
  project: ApparelProject;
}) {
  const heroImage = getProjectHeroImage(project);
  const featureChips = project.keyFeatures.slice(0, 3);
  const materialCount = project.linkedMaterials.length;

  return (
    <article className="group mt-0 overflow-hidden rounded-[1.35rem] border border-ember/36 bg-[linear-gradient(145deg,rgba(10,10,10,0.62),rgba(61,43,31,0.22))] shadow-[0_22px_70px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(237,227,207,0.055)] transition duration-300 hover:border-ember/56 hover:shadow-[0_28px_86px_rgba(200,155,60,0.11),0_20px_70px_rgba(0,0,0,0.34)] sm:mt-5 sm:rounded-[1.65rem]">
      <div className="grid xl:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)]">
        <div className="flex flex-col justify-between gap-4 p-4 sm:gap-5 sm:p-6 xl:p-7">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={project.status === 'Blocked' ? 'ember' : 'teal'}>
                {project.status}
              </Badge>
              <Badge variant="bronze">{project.phase}</Badge>
              <Badge variant="blue">{project.garmentType}</Badge>
            </div>

            <h3 className="mt-4 text-2xl font-semibold leading-[1.08] text-stardust sm:mt-5 sm:text-4xl xl:text-[2.8rem]">
              {project.name}
            </h3>
            <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-ember/82">
              {project.collection || project.season}
            </p>
            <p className="mt-3 line-clamp-2 max-w-3xl text-sm leading-6 text-stardust/70 sm:mt-4 sm:line-clamp-3 sm:text-base xl:max-w-2xl">
              {project.designIntent || project.summary}
            </p>

            {featureChips.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {featureChips.map((feature) => (
                  <span
                    className="rounded-full border border-bronze/28 bg-midnight/42 px-3 py-1.5 text-xs font-medium text-stardust/72"
                    key={feature}
                  >
                    {feature}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <div className="grid grid-cols-3 gap-2 max-[380px]:grid-cols-1">
              <HeroMeta label="Progress" value={`${project.progress}%`} />
              <HeroMeta
                label="Materials"
                value={`${materialCount} linked`}
              />
              <HeroMeta label="Season" value={project.season} />
            </div>
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-stardust/54">Studio progress</span>
                <span className="font-medium text-ember">{project.progress}%</span>
              </div>
              <div className="studio-progress-track">
                <div
                  className="studio-progress-fill transition-[width] duration-700 motion-safe:animate-[pulse_2.8s_ease-in-out_infinite]"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                className="min-h-11 md:min-h-10"
                icon={<ArrowRight aria-hidden="true" size={16} strokeWidth={1.9} />}
                onClick={() => onOpenProject(project.id)}
                size="sm"
                variant="primary"
              >
                View Project
              </Button>
            </div>
          </div>
        </div>

        <div className="relative h-40 overflow-hidden border-t border-bronze/20 bg-[radial-gradient(circle_at_20%_10%,rgba(200,155,60,0.32),transparent_30%),radial-gradient(circle_at_84%_18%,rgba(45,92,107,0.4),transparent_34%),linear-gradient(135deg,rgba(27,58,99,0.76),rgba(10,10,10,0.72),rgba(61,43,31,0.78))] sm:h-[14.5rem] md:h-[16rem] xl:h-full xl:min-h-[22rem] xl:border-l xl:border-t-0">
          {heroImage ? (
            <StoredImage
              asset={heroImage}
              className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:[transform:scale(calc(var(--image-zoom)*1.035))]"
            />
          ) : null}
          <ImageReadabilityOverlay asset={heroImage} variant="hero" />
          <div className="absolute inset-4 rounded-[1.3rem] border border-stardust/10 bg-midnight/10 shadow-[inset_0_0_70px_rgba(237,227,207,0.045)] sm:inset-5 xl:inset-6 xl:rounded-[1.6rem]" />
          <div className="relative z-10 flex h-full flex-col justify-end p-4 [text-shadow:0_2px_16px_rgba(0,0,0,0.95)] sm:p-5 xl:p-6">
            <div className="max-w-lg rounded-2xl border border-stardust/10 bg-midnight/22 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-stardust/66">
                Featured garment
              </p>
              <p className="mt-2 text-lg font-semibold leading-tight text-stardust sm:text-xl xl:text-2xl">
                {project.progress}% complete / {project.phase}
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function FeaturedProjectCarousel({
  onOpenProject,
  projects,
}: {
  onOpenProject: (projectId: string) => void;
  projects: ApparelProject[];
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (projects.length === 0) {
    return null;
  }

  const scrollByCard = (direction: 'left' | 'right') => {
    scrollerRef.current?.scrollBy({
      behavior: 'smooth',
      left: direction === 'left' ? -320 : 320,
    });
  };

  return (
    <section className="mt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-stardust/44">
          Supporting features
        </p>
        <div className="hidden gap-2 sm:flex">
          <CarouselButton label="Scroll left" onClick={() => scrollByCard('left')}>
            <ChevronLeft aria-hidden="true" size={16} strokeWidth={1.9} />
          </CarouselButton>
          <CarouselButton label="Scroll right" onClick={() => scrollByCard('right')}>
            <ChevronRight aria-hidden="true" size={16} strokeWidth={1.9} />
          </CarouselButton>
        </div>
      </div>
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-midnight/90 to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-midnight/90 to-transparent"
        />
        <div
          className="studio-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto scroll-smooth px-4 pb-2 sm:mx-0 sm:px-0"
          ref={scrollerRef}
        >
          {projects.map((project) => (
            <FeaturedProjectMiniCard
              key={project.id}
              onOpenProject={onOpenProject}
              project={project}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function CarouselButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-bronze/30 bg-midnight/42 text-stardust/70 transition duration-200 hover:border-ember/45 hover:bg-stardust/[0.08] hover:text-ember"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function FeaturedProjectMiniCard({
  onOpenProject,
  project,
}: {
  onOpenProject: (projectId: string) => void;
  project: ApparelProject;
}) {
  return (
    <article className="group flex min-h-[16rem] w-[15.75rem] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-bronze/28 bg-[linear-gradient(145deg,rgba(10,10,10,0.44),rgba(61,43,31,0.2))] shadow-[inset_0_1px_0_rgba(237,227,207,0.035)] transition duration-300 hover:-translate-y-1 hover:border-ember/48 hover:bg-midnight/50 sm:min-h-[18.5rem] sm:w-[20rem] xl:w-[22rem]">
      <ProjectImageBand project={project} className="h-20" />
      <div className="flex flex-1 flex-col p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="line-clamp-2 text-base font-semibold leading-snug text-stardust">
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
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-stardust/62 sm:mt-4 sm:line-clamp-3 sm:min-h-16">
          {project.summary}
        </p>
        <div className="mt-auto pt-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-stardust/52">{project.phase}</span>
            <span className="font-medium text-ember">{project.progress}%</span>
          </div>
          <div className="studio-progress-track">
            <div
              className="studio-progress-fill"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>
        <button
          className="mt-4 inline-flex min-h-11 items-center justify-between rounded-xl border border-bronze/28 bg-midnight/36 px-3 text-xs font-medium text-stardust/76 transition duration-300 hover:border-ember/45 hover:bg-stardust/[0.08] hover:text-stardust md:min-h-10"
          onClick={() => onOpenProject(project.id)}
          type="button"
        >
          View Project
          <ArrowRight
            aria-hidden="true"
            className="text-ember transition duration-300 group-hover:translate-x-1"
            size={15}
            strokeWidth={1.9}
          />
        </button>
      </div>
    </article>
  );
}

function MobilePulseItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-bronze/20 bg-midnight/36 p-3">
      <p className="text-[0.64rem] font-medium uppercase tracking-[0.14em] text-stardust/40">
        {label}
      </p>
      <p className="mt-1 line-clamp-2 text-sm font-semibold text-stardust">
        {value}
      </p>
    </div>
  );
}

function HeroMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-bronze/22 bg-midnight/34 p-2.5 sm:p-3">
      <p className="truncate text-[0.55rem] font-medium uppercase tracking-[0.08em] text-stardust/40 sm:text-xs sm:tracking-[0.14em]">
        {label}
      </p>
      <p className="mt-2 truncate text-[0.72rem] font-semibold text-stardust sm:text-sm">
        {value}
      </p>
    </div>
  );
}

function ProjectImageBand({
  className,
  project,
}: {
  className: string;
  project: ApparelProject;
}) {
  const heroImage = getProjectHeroImage(project);

  return (
    <div
      className={`${className} relative overflow-hidden border-b border-bronze/20 bg-[radial-gradient(circle_at_20%_10%,rgba(200,155,60,0.28),transparent_30%),linear-gradient(135deg,rgba(27,58,99,0.68),rgba(10,10,10,0.72),rgba(61,43,31,0.76))]`}
    >
      {heroImage ? (
        <StoredImage
          asset={heroImage}
          className="h-full w-full object-cover transition duration-500 group-hover:[transform:scale(calc(var(--image-zoom)*1.03))]"
        />
      ) : null}
      <ImageReadabilityOverlay asset={heroImage} variant="card" />
    </div>
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
  return project.notes.reduce(
    (latest, note) => {
      const candidate = note.updatedAt ?? note.createdAt;
      return studioDateTimestamp(candidate) > studioDateTimestamp(latest)
        ? candidate
        : latest;
    },
    project.startDate,
  );
}

function compareFeaturedProjects(a: ApparelProject, b: ApparelProject) {
  return (
    b.progress - a.progress ||
    studioDateTimestamp(latestProjectDate(b)) -
      studioDateTimestamp(latestProjectDate(a))
  );
}

function getHeroProject(projects: ApparelProject[]) {
  const activeProjects = projects.filter((project) => project.status === 'Active');
  const candidates = activeProjects.length > 0 ? activeProjects : projects;

  return [...candidates].sort(compareFeaturedProjects).at(0);
}

function getSupportingFeaturedProjects(
  projects: ApparelProject[],
  heroProjectId?: string,
) {
  return [...projects]
    .filter((project) => project.id !== heroProjectId)
    .sort(compareFeaturedProjects)
    .slice(0, 3);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
  }).format(value);
}
