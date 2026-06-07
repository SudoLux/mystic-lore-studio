import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Layers3,
  NotebookTabs,
  Package,
  Palette,
  Shirt,
  Sparkles,
  Target,
} from 'lucide-react';
import { Badge } from '../components/shared/Badge';
import { Button } from '../components/shared/Button';
import { Card } from '../components/shared/Card';
import { PageHeader } from '../components/shared/PageHeader';
import { demoFabrics, demoProjects } from '../data/seedData';
import { cn } from '../lib/classes';
import {
  projectPhases,
  type ApparelProject,
  type Fabric,
  type ProjectPhase,
} from '../types/studio';

type ProjectDetailPageProps = {
  onBack: () => void;
  projectId: string;
};

type DetailTab = 'overview' | 'materials' | 'tasks' | 'notes' | 'lookbook';

type ProjectProfile = {
  colorStory: string;
  generalNotes: string;
  keyFeatures: string[];
  silhouette: string;
  targetWearer: string;
};

const fabricById = new Map(demoFabrics.map((fabric) => [fabric.id, fabric]));

const detailTabs = [
  { id: 'overview', label: 'Overview', icon: Target },
  { id: 'materials', label: 'Materials', icon: Package },
  { id: 'tasks', label: 'Tasks', icon: ClipboardList },
  { id: 'notes', label: 'Notes', icon: NotebookTabs },
  { id: 'lookbook', label: 'Lookbook', icon: BookOpen },
] satisfies Array<{ id: DetailTab; label: string; icon: typeof Sparkles }>;

const projectProfiles: Record<string, ProjectProfile> = {
  'project-waden-sutra-jacket': {
    colorStory:
      'Midnight indigo dominates the outer shell, with Golden Ankara appearing as a quiet interior flash.',
    generalNotes:
      'Protect the architectural shoulder and collar line. The jacket should feel ceremonial without sacrificing everyday utility.',
    keyFeatures: [
      'Cropped structured body',
      'Sculpted collar roll',
      'Patch pocket geometry',
      'Interior Ankara facing reveal',
    ],
    silhouette:
      'Cropped and boxy through the body with deliberate shoulder ease for layered styling.',
    targetWearer:
      'A creative director or maker who wants a statement jacket that still works as a daily studio layer.',
  },
  'project-sankofa-pants': {
    colorStory:
      'Deep espresso twill grounds the shape, with stardust ivory pocketing kept inside the garment.',
    generalNotes:
      'Balance the ceremonial trouser volume with enough taper to keep the profile sharp under jackets.',
    keyFeatures: [
      'High-rise waist',
      'Double pleat study',
      'Extended waistband tab',
      'Clean taper through hem',
    ],
    silhouette:
      'High-waisted with generous thigh volume, controlled taper, and a tailored break.',
    targetWearer:
      'A person who moves between atelier work, events, and everyday errands without changing wardrobe language.',
  },
  'project-meridian-shirt': {
    colorStory:
      'Black linen carries the surface, while golden trim appears only at internal touchpoints.',
    generalNotes:
      'Keep construction light. The shirt should breathe and move before it announces tailoring.',
    keyFeatures: [
      'Relaxed linen body',
      'Hidden placket',
      'Subtle Ankara trim',
      'Soft collar construction',
    ],
    silhouette:
      'Airy and relaxed with a slightly architectural fall away from the body.',
    targetWearer:
      'A warm-weather dresser who wants a quiet shirt with hidden craft details.',
  },
  'project-ronyn-cardigan': {
    colorStory:
      'Nebula teal rib sets the mood, supported by dark buttons and a grounded studio palette.',
    generalNotes:
      'Test recovery before committing. The cardigan needs softness, but the hem and cuffs cannot collapse.',
    keyFeatures: [
      'Weighted hem band',
      'Soft shawl collar experiment',
      'Rib cuff recovery',
      'Button finish study',
    ],
    silhouette:
      'Relaxed cardigan body with a deliberate collar and weighted lower edge.',
    targetWearer:
      'A layered dresser who wants softness with structure and a low-key color accent.',
  },
  'project-denim-blazer-dress': {
    colorStory:
      'Heavy midnight denim creates the tailored exterior, offset by stardust ivory lining inside the bodice.',
    generalNotes:
      'Watch bulk through the waist and hip. The shoulder structure should stay crisp without overpowering the dress line.',
    keyFeatures: [
      'Blazer shoulder structure',
      'Dress-length denim body',
      'Ivory-lined bodice',
      'Sharp evening utility',
    ],
    silhouette:
      'Tailored through the shoulder and waist, extending into a controlled dress shape.',
    targetWearer:
      'A presentation lead or performer who wants blazer authority with evening movement.',
  },
};

export function ProjectDetailPage({ onBack, projectId }: ProjectDetailPageProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const project = demoProjects.find((item) => item.id === projectId);

  useEffect(() => {
    setActiveTab('overview');
  }, [projectId]);

  const linkedFabrics = useMemo(
    () =>
      project
        ? project.linkedMaterials
            .map((material) => ({
              allocation: material,
              fabric: fabricById.get(material.fabricId),
            }))
            .filter(
              (item): item is typeof item & { fabric: Fabric } =>
                Boolean(item.fabric),
            )
        : [],
    [project],
  );

  if (!project) {
    return (
      <section>
        <PageHeader
          badge="Project Detail"
          description="The requested project route could not be matched to demo data."
          title="Project Not Found"
        >
          <BackButton onBack={onBack} />
        </PageHeader>
      </section>
    );
  }

  const profile = projectProfiles[project.id] ?? getFallbackProfile(project);
  const difficulty = getDifficulty(project);

  return (
    <section className="space-y-5">
      <ProjectHero
        difficulty={difficulty}
        linkedFabrics={linkedFabrics.map((item) => item.fabric)}
        onBack={onBack}
        project={project}
      />

      <PhasePath currentPhase={project.phase} />

      <Card className="p-2 sm:p-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {detailTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                aria-pressed={isActive}
                className={cn(
                  'inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition duration-200',
                  isActive
                    ? 'border-ember/55 bg-ember text-midnight'
                    : 'border-transparent text-stardust/62 hover:border-bronze/35 hover:bg-stardust/7 hover:text-stardust',
                )}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                <Icon aria-hidden="true" size={16} strokeWidth={1.9} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </Card>

      {activeTab === 'overview' ? (
        <OverviewTab project={project} profile={profile} />
      ) : null}
      {activeTab === 'materials' ? (
        <MaterialsTab linkedFabrics={linkedFabrics} />
      ) : null}
      {activeTab === 'tasks' ? <TasksTab project={project} /> : null}
      {activeTab === 'notes' ? <NotesTab project={project} /> : null}
      {activeTab === 'lookbook' ? <LookbookTab project={project} /> : null}
    </section>
  );
}

function ProjectHero({
  difficulty,
  linkedFabrics,
  onBack,
  project,
}: {
  difficulty: string;
  linkedFabrics: Fabric[];
  onBack: () => void;
  project: ApparelProject;
}) {
  return (
    <Card className="overflow-hidden p-0" elevated>
      <div className="grid min-h-[26rem] lg:grid-cols-[1.08fr_0.92fr]">
        <div className="flex flex-col justify-between gap-10 p-5 sm:p-7 lg:p-8">
          <div>
            <BackButton onBack={onBack} />
            <div className="mt-8 flex flex-wrap gap-2">
              <Badge variant="teal">{project.status}</Badge>
              <Badge variant="bronze">{project.phase}</Badge>
              <Badge variant="ember">{project.priority} Priority</Badge>
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight text-stardust sm:text-5xl">
              {project.name}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-stardust/68">
              {project.summary}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <HeroMetric
              icon={<Shirt aria-hidden="true" size={18} strokeWidth={1.9} />}
              label="Garment"
              value={project.garmentType}
            />
            <HeroMetric
              icon={<Layers3 aria-hidden="true" size={18} strokeWidth={1.9} />}
              label="Collection"
              value={project.collection}
            />
            <HeroMetric
              icon={<Target aria-hidden="true" size={18} strokeWidth={1.9} />}
              label="Progress"
              value={`${project.progress}%`}
            />
            <HeroMetric
              icon={<Sparkles aria-hidden="true" size={18} strokeWidth={1.9} />}
              label="Difficulty"
              value={difficulty}
            />
          </div>
        </div>

        <div className="relative min-h-[21rem] overflow-hidden border-t border-bronze/20 bg-midnight/40 lg:border-l lg:border-t-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(200,155,60,0.38),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(45,92,107,0.42),transparent_32%),radial-gradient(circle_at_55%_82%,rgba(237,227,207,0.16),transparent_30%),linear-gradient(145deg,rgba(27,58,99,0.84),rgba(10,10,10,0.76),rgba(61,43,31,0.86))]" />
          <div className="absolute inset-6 rounded-[2rem] border border-stardust/12 bg-midnight/18 shadow-[inset_0_0_90px_rgba(237,227,207,0.06)]" />
          <div className="relative z-10 flex h-full min-h-[21rem] flex-col justify-between p-6">
            <div className="flex items-center justify-between gap-3">
              <Badge variant="ember">Gradient Visual</Badge>
              <span className="rounded-full border border-stardust/15 bg-midnight/42 px-3 py-1 text-xs text-stardust/66">
                {formatDate(project.startDate)}
              </span>
            </div>
            <div>
              <div className="mb-5 flex -space-x-2">
                {linkedFabrics.slice(0, 4).map((fabric) => (
                  <span
                    aria-label={fabric.name}
                    className="h-8 w-8 rounded-full border border-stardust/25 ring-2 ring-midnight"
                    key={fabric.id}
                    style={{ background: getFabricSwatch(fabric) }}
                    title={fabric.name}
                  />
                ))}
              </div>
              <p className="max-w-md text-2xl font-semibold leading-tight text-stardust">
                {project.garmentType} study for {project.collection}
              </p>
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-stardust/62">Project progress</span>
                  <span className="font-medium text-ember">{project.progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-stardust/12">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#C89B3C,#2D5C6B,#EDE3CF)]"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function PhasePath({ currentPhase }: { currentPhase: ProjectPhase }) {
  const currentIndex = projectPhases.indexOf(currentPhase);

  return (
    <Card className="overflow-hidden">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <Badge variant="blue">Phase Path</Badge>
          <h2 className="mt-3 text-2xl font-semibold text-stardust">
            Collection workflow
          </h2>
        </div>
        <span className="text-sm text-stardust/55">{currentPhase}</span>
      </div>
      <div className="overflow-x-auto pb-2">
        <ol className="flex min-w-[62rem] items-start">
          {projectPhases.map((phase, index) => {
            const isComplete = index < currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <li className="relative flex flex-1 flex-col items-center" key={phase}>
                {index < projectPhases.length - 1 ? (
                  <span
                    className={cn(
                      'absolute left-1/2 top-4 h-px w-full',
                      isComplete
                        ? 'bg-ember shadow-[0_0_14px_rgba(200,155,60,0.65)]'
                        : 'bg-bronze/28',
                    )}
                  />
                ) : null}
                <span
                  className={cn(
                    'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition duration-300',
                    isCurrent
                      ? 'border-ember bg-ember text-midnight shadow-[0_0_28px_rgba(200,155,60,0.5)]'
                      : isComplete
                        ? 'border-ember/60 bg-ember/18 text-ember'
                        : 'border-bronze/30 bg-midnight text-stardust/42',
                  )}
                >
                  {isComplete ? (
                    <CheckCircle2 aria-hidden="true" size={16} strokeWidth={2} />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={cn(
                    'mt-3 max-w-24 text-center text-xs leading-4',
                    isCurrent ? 'font-semibold text-stardust' : 'text-stardust/48',
                  )}
                >
                  {phase}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </Card>
  );
}

function OverviewTab({
  profile,
  project,
}: {
  profile: ProjectProfile;
  project: ApparelProject;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.82fr]">
      <Card>
        <SectionHeading
          eyebrow="Overview"
          title="Design direction"
          subtitle="The creative and practical brief for this garment."
        />
        <div className="mt-6 grid gap-4">
          <InfoBlock label="Design intent" value={project.designIntent} />
          <InfoBlock label="Description" value={project.summary} />
          <InfoBlock label="Target wearer" value={profile.targetWearer} />
          <InfoBlock label="General notes" value={profile.generalNotes} />
        </div>
      </Card>

      <div className="space-y-4">
        <Card>
          <SectionHeading
            eyebrow="Shape"
            title="Silhouette"
            subtitle={profile.silhouette}
          />
        </Card>
        <Card>
          <SectionHeading
            eyebrow="Palette"
            title="Color story"
            subtitle={profile.colorStory}
          />
        </Card>
        <Card>
          <div className="flex items-center gap-3 text-ember">
            <CalendarDays aria-hidden="true" size={19} strokeWidth={1.9} />
            <p className="text-sm font-semibold text-stardust">Due date</p>
          </div>
          <p className="mt-4 text-2xl font-semibold text-stardust">
            {project.targetDate ? formatDate(project.targetDate) : 'Not scheduled'}
          </p>
        </Card>
      </div>

      <Card className="xl:col-span-2">
        <SectionHeading
          eyebrow="Features"
          title="Key construction notes"
          subtitle="The signature elements to preserve as the project moves forward."
        />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {profile.keyFeatures.map((feature) => (
            <div
              className="rounded-2xl border border-bronze/20 bg-midnight/32 p-4"
              key={feature}
            >
              <Sparkles
                aria-hidden="true"
                className="text-ember"
                size={18}
                strokeWidth={1.9}
              />
              <p className="mt-4 text-sm font-semibold leading-6 text-stardust">
                {feature}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function MaterialsTab({
  linkedFabrics,
}: {
  linkedFabrics: Array<{
    allocation: ApparelProject['linkedMaterials'][number];
    fabric: Fabric;
  }>;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {linkedFabrics.map(({ allocation, fabric }) => (
        <Card className="transition duration-300 hover:border-ember/45" key={allocation.id}>
          <div className="flex items-start gap-4">
            <span
              className="h-14 w-14 rounded-2xl border border-stardust/20"
              style={{ background: getFabricSwatch(fabric) }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-stardust">
                    {fabric.name}
                  </p>
                  <p className="mt-1 text-sm text-stardust/54">
                    {fabric.category} • {fabric.composition}
                  </p>
                </div>
                <Badge variant="bronze">{allocation.use}</Badge>
              </div>
              <p className="mt-4 text-sm leading-6 text-stardust/62">
                {fabric.notes}
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <MiniMetric label="Reserved" value={`${allocation.reservedYards} yd`} />
                <MiniMetric label="Used" value={`${allocation.usedYards} yd`} />
                <MiniMetric
                  label="Remaining"
                  value={`${formatNumber(
                    fabric.totalYards - fabric.reservedYards - fabric.usedYards,
                  )} yd`}
                />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function TasksTab({ project }: { project: ApparelProject }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {project.tasks.map((task) => (
        <Card className="transition duration-300 hover:border-ember/45" key={task.id}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <Badge variant={task.priority === 'Critical' ? 'ember' : 'blue'}>
                {task.priority}
              </Badge>
              <h3 className="mt-4 text-lg font-semibold text-stardust">
                {task.title}
              </h3>
            </div>
            <Badge variant="bronze">{task.status}</Badge>
          </div>
          <p className="mt-4 text-sm leading-6 text-stardust/62">
            {task.description}
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-stardust/52">
            <span>{task.phase}</span>
            <span>•</span>
            <span>{task.dueDate ? formatDate(task.dueDate) : 'No due date'}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}

function NotesTab({ project }: { project: ApparelProject }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {project.notes.map((note) => (
        <Card className="transition duration-300 hover:border-ember/45" key={note.id}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <Badge variant="bronze">{note.tone}</Badge>
              <h3 className="mt-4 text-lg font-semibold text-stardust">
                {note.title}
              </h3>
            </div>
            <span className="text-sm text-stardust/48">
              {formatDate(note.createdAt)}
            </span>
          </div>
          <p className="mt-4 text-sm leading-7 text-stardust/64">{note.body}</p>
        </Card>
      ))}
    </div>
  );
}

function LookbookTab({ project }: { project: ApparelProject }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {project.lookbookPages.map((page) => (
        <Card className="transition duration-300 hover:border-ember/45" key={page.id}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <Badge variant="teal">{page.pageType}</Badge>
              <h3 className="mt-4 text-lg font-semibold text-stardust">
                {page.title}
              </h3>
            </div>
            <Palette
              aria-hidden="true"
              className="text-ember"
              size={20}
              strokeWidth={1.9}
            />
          </div>
          <p className="mt-4 text-xl font-semibold leading-tight text-stardust">
            {page.headline}
          </p>
          <p className="mt-3 text-sm leading-7 text-stardust/64">{page.body}</p>
          <p className="mt-4 rounded-2xl border border-bronze/20 bg-midnight/32 p-4 text-sm leading-6 text-stardust/58">
            {page.layoutHint}
          </p>
        </Card>
      ))}
    </div>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <Button
      icon={<ArrowLeft aria-hidden="true" size={16} strokeWidth={1.9} />}
      onClick={onBack}
      size="sm"
      variant="secondary"
    >
      Back to Library
    </Button>
  );
}

function HeroMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-bronze/20 bg-midnight/35 p-4">
      <div className="text-ember">{icon}</div>
      <p className="mt-3 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-stardust/42">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-stardust">{value}</p>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-bronze/20 bg-midnight/32 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-ember">
        {label}
      </p>
      <p className="mt-3 text-sm leading-7 text-stardust/68">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-bronze/20 bg-midnight/32 p-3">
      <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-stardust/42">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-stardust">{value}</p>
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

function getFallbackProfile(project: ApparelProject): ProjectProfile {
  return {
    colorStory:
      'A grounded Mystic Lore palette shaped by the fabrics assigned to this garment.',
    generalNotes:
      'Preserve the project intent while refining construction details through the active phase.',
    keyFeatures: project.tags,
    silhouette: `A ${project.garmentType.toLowerCase()} silhouette guided by the current ${project.phase.toLowerCase()} phase.`,
    targetWearer:
      'A style-conscious wearer who values craft, story, and practical garment architecture.',
  };
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
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
  }).format(value);
}
