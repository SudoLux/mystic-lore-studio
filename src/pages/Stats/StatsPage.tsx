import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Package,
  Shirt,
} from 'lucide-react';
import { Badge } from '../../components/shared/Badge';
import { Card } from '../../components/shared/Card';
import { PageHeader } from '../../components/shared/PageHeader';
import { useStudioData } from '../../hooks/useStudioData';
import { cn } from '../../lib/classes';
import {
  formatStudioDate,
  studioDateTimestamp,
} from '../../lib/dates';
import {
  LOW_YARDAGE_THRESHOLD,
  calculateFabricYardage,
  isLowYardage,
} from '../../lib/yardage';
import {
  garmentTypes,
  projectPhases,
  taskCategories,
  type ApparelProject,
  type Fabric,
  type StudioTask,
} from '../../types/studio';

type CountRow = {
  label: string;
  value: number;
};

export function StatsPage() {
  const {
    data: { fabrics, linkedMaterials, projects, tasks },
  } = useStudioData();
  const projectStats = getProjectStats(projects);
  const taskStats = getTaskStats(tasks);
  const fabricStats = getFabricStats(fabrics, linkedMaterials, projects);
  const lookbookStats = getLookbookStats(projects);

  return (
    <section className="space-y-5">
      <PageHeader
        badge="Stats"
        description="Studio analytics for garment flow, task load, fabric inventory, and lookbook readiness."
        title="Studio Stats"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          detail="Every garment record in the studio library."
          icon={<Shirt aria-hidden="true" size={18} strokeWidth={1.9} />}
          label="Total Projects"
          value={projectStats.totalProjects}
        />
        <StatCard
          detail="Projects currently marked active."
          icon={<Clock3 aria-hidden="true" size={18} strokeWidth={1.9} />}
          label="Active"
          value={projectStats.activeProjects}
        />
        <StatCard
          detail="Completed garment records."
          icon={<CheckCircle2 aria-hidden="true" size={18} strokeWidth={1.9} />}
          label="Completed"
          value={projectStats.completedProjects}
        />
        <StatCard
          detail="Open work across all task boards."
          icon={<BarChart3 aria-hidden="true" size={18} strokeWidth={1.9} />}
          label="Open Tasks"
          value={taskStats.openTasks}
        />
        <StatCard
          detail="Fabric inventory value estimate."
          icon={<Package aria-hidden="true" size={18} strokeWidth={1.9} />}
          label="Fabric Value"
          value={formatCurrency(fabricStats.inventoryValue)}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.72fr)]">
        <Card className="border-bronze/30 bg-[linear-gradient(135deg,rgba(27,58,99,0.22),rgba(10,10,10,0.5),rgba(61,43,31,0.34))]">
          <SectionTitle
            badge="Projects"
            title="Project mix"
            description="Counts by status, workflow phase, and garment type."
          />
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MiniStat label="Paused" value={projectStats.pausedProjects} />
            <MiniStat label="Blocked" value={projectStats.blockedProjects} />
            <MiniStat label="Lookbooks" value={lookbookStats.projectsWithLookbooks} />
            <MiniStat
              label="Lookbook Ready"
              value={lookbookStats.lookbookReadyProjects}
            />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <BarList
              rows={projectStats.byPhase}
              title="Projects by Workflow Phase"
              total={projectStats.totalProjects}
            />
            <BarList
              rows={projectStats.byGarmentType}
              title="Projects by Garment Type"
              total={projectStats.totalProjects}
            />
          </div>
        </Card>

        <Card>
          <SectionTitle
            badge="Lookbooks"
            title="Presentation readiness"
            description="Lookbook coverage and projects already at lookbook phase."
          />
          <div className="mt-6 space-y-4">
            <ReadinessMeter
              label="Projects with lookbooks"
              total={projectStats.totalProjects}
              value={lookbookStats.projectsWithLookbooks}
            />
            <ReadinessMeter
              label="Lookbook-ready projects"
              total={projectStats.totalProjects}
              value={lookbookStats.lookbookReadyProjects}
            />
          </div>
          <div className="mt-6 rounded-3xl border border-bronze/20 bg-midnight/30 p-5">
            <BookOpen
              aria-hidden="true"
              className="text-ember"
              size={22}
              strokeWidth={1.8}
            />
            <p className="mt-4 text-sm leading-6 text-stardust/62">
              Lookbook-ready counts use workflow phase. Projects with lookbooks
              count any project with one or more lookbook records.
            </p>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(22rem,0.72fr)_minmax(0,1fr)]">
        <Card>
          <SectionTitle
            badge="Tasks"
            title="Task board health"
            description="Open work, blocked work, completed work, categories, and due dates."
          />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <MiniStat label="Total Tasks" value={taskStats.totalTasks} />
            <MiniStat label="Completed" value={taskStats.completedTasks} />
            <MiniStat label="Blocked" value={taskStats.blockedTasks} />
            <MiniStat label="Open" value={taskStats.openTasks} />
          </div>
          <div className="mt-6">
            <BarList
              rows={taskStats.byCategory}
              title="Tasks by Category"
              total={taskStats.totalTasks}
            />
          </div>
        </Card>

        <Card className="border-bronze/30 bg-[linear-gradient(115deg,rgba(10,10,10,0.56),rgba(27,58,99,0.22),rgba(154,108,60,0.16))]">
          <SectionTitle
            badge="Due Dates"
            title="Upcoming task queue"
            description="Next open tasks with due dates, sorted by calendar date."
          />
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {taskStats.upcomingDueDates.map((task) => (
              <DueDateCard key={task.id} task={task} projects={projects} />
            ))}
            {taskStats.upcomingDueDates.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-bronze/25 bg-midnight/24 p-5 text-sm leading-6 text-stardust/54 md:col-span-2">
                No upcoming dated tasks are currently open.
              </p>
            ) : null}
          </div>
        </Card>
      </div>

      <Card className="border-bronze/30 bg-[linear-gradient(135deg,rgba(45,92,107,0.2),rgba(10,10,10,0.5),rgba(61,43,31,0.32))]">
        <SectionTitle
          badge="Fabric Vault"
          title="Inventory signal"
          description="Yardage and value use current fabric records plus linked allocation calculations."
        />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MiniStat label="Total Fabrics" value={fabricStats.totalFabrics} />
          <MiniStat
            label="Total Yardage"
            value={`${formatNumber(fabricStats.totalYardage)} yd`}
          />
          <MiniStat
            label="Reserved"
            value={`${formatNumber(fabricStats.reservedYardage)} yd`}
          />
          <MiniStat
            label="Used"
            value={`${formatNumber(fabricStats.usedYardage)} yd`}
          />
          <MiniStat
            label="Available"
            value={`${formatNumber(fabricStats.availableYardage)} yd`}
          />
          <MiniStat
            label="Low Yardage"
            value={fabricStats.lowYardageFabrics.length}
          />
          <MiniStat
            label="Inventory Value"
            value={formatCurrency(fabricStats.inventoryValue)}
          />
          <MiniStat
            label="Low Threshold"
            value={`${LOW_YARDAGE_THRESHOLD} yd`}
          />
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <BarList
            rows={fabricStats.byType}
            title="Fabrics by Type"
            total={fabricStats.totalFabrics}
          />
          <BarList
            rows={fabricStats.byColorFamily}
            title="Fabrics by Color Family"
            total={fabricStats.totalFabrics}
          />
          <LowYardageList fabrics={fabricStats.lowYardageFabrics} />
        </div>
      </Card>
    </section>
  );
}

function StatCard({
  detail,
  icon,
  label,
  value,
}: {
  detail: string;
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <Card className="group min-h-44 transition duration-300 hover:-translate-y-1 hover:border-ember/48 hover:bg-stardust/[0.08] hover:shadow-[0_28px_90px_rgba(200,155,60,0.09)]">
      <div className="flex h-full flex-col justify-between gap-5">
        <div className="flex items-start justify-between gap-3">
          <Badge variant="ember">{label}</Badge>
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-bronze/25 bg-midnight/45 text-ember transition duration-300 group-hover:border-ember/45">
            {icon}
          </span>
        </div>
        <div>
          <p className="text-4xl font-semibold leading-none text-stardust">
            {value}
          </p>
          <p className="mt-3 text-sm leading-6 text-stardust/60">{detail}</p>
        </div>
      </div>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-bronze/20 bg-midnight/32 p-4">
      <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-stardust/42">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-stardust">{value}</p>
    </div>
  );
}

function SectionTitle({
  badge,
  description,
  title,
}: {
  badge: string;
  description: string;
  title: string;
}) {
  return (
    <div>
      <Badge variant="teal">{badge}</Badge>
      <h2 className="mt-4 text-2xl font-semibold leading-tight text-stardust">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-6 text-stardust/60">{description}</p>
    </div>
  );
}

function BarList({
  rows,
  title,
  total,
}: {
  rows: CountRow[];
  title: string;
  total: number;
}) {
  const visibleRows = rows.filter((row) => row.value > 0);

  return (
    <section>
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-stardust/52">
        {title}
      </h3>
      <div className="mt-4 space-y-4">
        {visibleRows.map((row) => {
          const percent = total > 0 ? (row.value / total) * 100 : 0;

          return (
            <div key={row.label}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="truncate text-sm font-medium text-stardust">
                  {row.label}
                </span>
                <span className="text-sm text-ember">{row.value}</span>
              </div>
              <div className="studio-progress-track">
                <div
                  className="studio-progress-fill"
                  style={{ width: `${Math.max(percent, row.value > 0 ? 7 : 0)}%` }}
                />
              </div>
            </div>
          );
        })}
        {visibleRows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-bronze/25 bg-midnight/24 p-5 text-sm leading-6 text-stardust/54">
            No records available for this breakdown.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function ReadinessMeter({
  label,
  total,
  value,
}: {
  label: string;
  total: number;
  value: number;
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="rounded-2xl border border-bronze/20 bg-midnight/32 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-stardust">{label}</p>
        <span className="text-sm font-semibold text-ember">{percent}%</span>
      </div>
      <div className="studio-progress-track mt-3">
        <div
          className="studio-progress-fill"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-3 text-xs text-stardust/45">
        {value} of {total} projects
      </p>
    </div>
  );
}

function DueDateCard({
  projects,
  task,
}: {
  projects: ApparelProject[];
  task: StudioTask;
}) {
  const project = projects.find((item) => item.id === task.projectId);
  const isBlocked = task.status === 'Blocked';

  return (
    <article
      className={cn(
        'rounded-2xl border bg-midnight/30 p-4 transition duration-300 hover:border-ember/40',
        isBlocked ? 'border-ember/35' : 'border-bronze/22',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-stardust">
            {task.title}
          </p>
          <p className="mt-1 truncate text-xs text-stardust/48">
            {project?.name ?? 'Studio task'}
          </p>
        </div>
        <Badge variant={isBlocked ? 'ember' : 'blue'}>{task.priority}</Badge>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-stardust/52">
        <span className="inline-flex items-center gap-1">
          <CalendarDays aria-hidden="true" size={13} strokeWidth={1.9} />
          {task.dueDate ? formatDate(task.dueDate) : 'No date'}
        </span>
        <span>{task.category}</span>
        <span>{task.status}</span>
      </div>
    </article>
  );
}

function LowYardageList({
  fabrics,
}: {
  fabrics: Array<{ availableYards: number; fabric: Fabric }>;
}) {
  return (
    <section>
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-stardust/52">
        Low-Yardage Fabrics
      </h3>
      <div className="mt-4 space-y-3">
        {fabrics.map(({ availableYards, fabric }) => (
          <div
            className="rounded-2xl border border-ember/30 bg-ember/10 p-4"
            key={fabric.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-stardust">{fabric.name}</p>
                <p className="mt-1 text-xs text-stardust/48">
                  {fabric.category} / {fabric.colorFamily}
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-ember">
                <AlertTriangle aria-hidden="true" size={14} strokeWidth={1.9} />
                {formatNumber(availableYards)} yd
              </span>
            </div>
          </div>
        ))}
        {fabrics.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-bronze/25 bg-midnight/24 p-5 text-sm leading-6 text-stardust/54">
            No fabrics are currently below the low-yardage threshold.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function getProjectStats(projects: ApparelProject[]) {
  return {
    activeProjects: projects.filter((project) => project.status === 'Active').length,
    blockedProjects: projects.filter((project) => project.status === 'Blocked').length,
    byGarmentType: countByKnownValues(
      projects,
      garmentTypes,
      (project) => project.garmentType,
    ),
    byPhase: countByKnownValues(projects, projectPhases, (project) => project.phase),
    completedProjects: projects.filter((project) => project.status === 'Completed').length,
    pausedProjects: projects.filter((project) => project.status === 'Paused').length,
    totalProjects: projects.length,
  };
}

function getTaskStats(tasks: StudioTask[]) {
  const openTasks = tasks.filter((task) => task.status !== 'Done');

  return {
    blockedTasks: tasks.filter((task) => task.status === 'Blocked').length,
    byCategory: countByKnownValues(
      tasks,
      taskCategories,
      (task) => task.category,
    ),
    completedTasks: tasks.filter((task) => task.status === 'Done').length,
    openTasks: openTasks.length,
    totalTasks: tasks.length,
    upcomingDueDates: openTasks
      .filter((task) => Boolean(task.dueDate))
      .sort(
        (a, b) =>
          studioDateTimestamp(a.dueDate) - studioDateTimestamp(b.dueDate),
      )
      .slice(0, 8),
  };
}

function getFabricStats(
  fabrics: Fabric[],
  linkedMaterials: ReturnType<typeof useStudioData>['data']['linkedMaterials'],
  projects: ApparelProject[],
) {
  const yardageRows = fabrics.map((fabric) => ({
    fabric,
    summary: calculateFabricYardage(fabric, linkedMaterials, projects),
  }));

  return {
    availableYardage: yardageRows.reduce(
      (total, row) => total + row.summary.availableYards,
      0,
    ),
    byColorFamily: countByDynamicValue(fabrics, (fabric) => fabric.colorFamily),
    byType: countByDynamicValue(fabrics, (fabric) => fabric.category),
    inventoryValue: fabrics.reduce(
      (total, fabric) => total + fabric.totalYards * fabric.costPerYard,
      0,
    ),
    lowYardageFabrics: yardageRows
      .filter(
        (row) =>
          row.summary.availableYards <= 0 || isLowYardage(row.summary),
      )
      .map((row) => ({
        availableYards: row.summary.availableYards,
        fabric: row.fabric,
      })),
    reservedYardage: yardageRows.reduce(
      (total, row) => total + row.summary.reservedYards,
      0,
    ),
    totalFabrics: fabrics.length,
    totalYardage: fabrics.reduce((total, fabric) => total + fabric.totalYards, 0),
    usedYardage: yardageRows.reduce(
      (total, row) => total + row.summary.usedYards,
      0,
    ),
  };
}

function getLookbookStats(projects: ApparelProject[]) {
  return {
    lookbookReadyProjects: projects.filter(
      (project) => project.phase === 'Lookbook Ready',
    ).length,
    projectsWithLookbooks: projects.filter(
      (project) => project.lookbookPages.length > 0,
    ).length,
  };
}

function countByKnownValues<T, Value extends string>(
  items: T[],
  values: readonly Value[],
  getValue: (item: T) => Value,
): CountRow[] {
  return values.map((value) => ({
    label: value,
    value: items.filter((item) => getValue(item) === value).length,
  }));
}

function countByDynamicValue<T>(
  items: T[],
  getValue: (item: T) => string,
): CountRow[] {
  const counts = items.reduce<Record<string, number>>((currentCounts, item) => {
    const value = getValue(item) || 'Unassigned';

    return {
      ...currentCounts,
      [value]: (currentCounts[value] ?? 0) + 1,
    };
  }, {});

  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

function formatDate(date: string) {
  return formatStudioDate(date, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    currency: 'USD',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
  }).format(value);
}
