import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
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
  ArrowLeft,
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  GripVertical,
  Layers3,
  NotebookTabs,
  Package,
  Palette,
  Pencil,
  Plus,
  Shirt,
  Sparkles,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import { LinkedMaterialFormModal } from '../../components/projects/LinkedMaterialFormModal';
import { NoteFormModal } from '../../components/projects/NoteFormModal';
import { TaskFormModal } from '../../components/projects/TaskFormModal';
import { Badge } from '../../components/shared/Badge';
import { Button } from '../../components/shared/Button';
import { Card } from '../../components/shared/Card';
import { ExpandableInfoSection } from '../../components/shared/ExpandableInfoSection';
import { ImageSlot } from '../../components/shared/ImageSlot';
import { ImageReadabilityOverlay } from '../../components/shared/ImageReadabilityOverlay';
import { LocalImageUploader } from '../../components/shared/LocalImageUploader';
import { MobilePageHeader } from '../../components/shared/MobilePageHeader';
import { PageHeader } from '../../components/shared/PageHeader';
import { StoredImage } from '../../components/shared/StoredImage';
import { useStudioData } from '../../hooks/useStudioData';
import { cn } from '../../lib/classes';
import {
  formatStudioDate,
  studioDateTimestamp,
} from '../../lib/dates';
import {
  getFabricImage,
  getLookbookHeroImage,
  getProjectGalleryImages,
} from '../../lib/imageAssets';
import {
  calculateFabricYardage,
  hasInsufficientYardage,
} from '../../lib/yardage';
import {
  materialRoles,
  noteCategories,
  projectPhases,
  taskStatuses,
  type ApparelProject,
  type Fabric,
  type LinkedMaterial,
  type LookbookFieldItem,
  type LookbookPage,
  type LookbookTemplate,
  type MaterialRole,
  type NoteCategory,
  type ProjectPhase,
  type StudioNote,
  type StudioTask,
  type TaskCategory,
  type TaskPriority,
  type TaskStatus,
} from '../../types/studio';

type ProjectDetailPageProps = {
  onBack: () => void;
  onDeleteProject: (project: ApparelProject) => void;
  onEditProject: (project: ApparelProject) => void;
  projectId: string;
};

type DetailTab = 'overview' | 'materials' | 'tasks' | 'notes' | 'lookbook';

type LinkedMaterialRow = {
  allocation: LinkedMaterial;
  fabric?: Fabric;
};

const detailTabs = [
  { id: 'overview', label: 'Overview', icon: Target },
  { id: 'materials', label: 'Materials', icon: Package },
  { id: 'tasks', label: 'Tasks', icon: ClipboardList },
  { id: 'notes', label: 'Notes', icon: NotebookTabs },
  { id: 'lookbook', label: 'Lookbook', icon: BookOpen },
] satisfies Array<{ id: DetailTab; label: string; icon: typeof Sparkles }>;

export function ProjectDetailPage({
  onBack,
  onDeleteProject,
  onEditProject,
  projectId,
}: ProjectDetailPageProps) {
  const {
    data: { fabrics, linkedMaterials: allLinkedMaterials, projects },
    createLinkedMaterial,
    createNote,
    createTask,
    deleteLinkedMaterial,
    deleteNote,
    deleteTask,
    updateLinkedMaterial,
    updateNote,
    updateProject,
    updateTask,
    updateTaskStatus,
    saveLookbookPage,
  } = useStudioData();
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const project = projects.find((item) => item.id === projectId);
  const fabricById = useMemo(
    () => new Map(fabrics.map((fabric) => [fabric.id, fabric])),
    [fabrics],
  );

  useEffect(() => {
    setActiveTab('overview');
  }, [projectId]);

  const linkedMaterials = useMemo<LinkedMaterialRow[]>(
    () =>
      project
        ? project.linkedMaterials
            .map((material) => ({
              allocation: material,
              fabric: material.fabricId
                ? fabricById.get(material.fabricId)
                : undefined,
            }))
        : [],
    [project, fabricById],
  );

  if (!project) {
    return (
      <section>
        <MobilePageHeader
          action={<BackButton onBack={onBack} />}
          badge="Project"
          title="Project Not Found"
        />
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

  const difficulty = project.difficulty;

  return (
    <section className="space-y-5">
      <ProjectHero
        difficulty={difficulty}
        linkedFabrics={linkedMaterials
          .map((item) => item.fabric)
          .filter((fabric): fabric is Fabric => Boolean(fabric))}
        onBack={onBack}
        onDeleteProject={() => onDeleteProject(project)}
        onEditProject={() => onEditProject(project)}
        onUpdateProject={updateProject}
        project={project}
      />

      <PhasePath currentPhase={project.phase} />

      <Card className="p-2 sm:p-3 md:max-lg:sticky md:max-lg:top-3 md:max-lg:z-20 md:max-lg:backdrop-blur-2xl">
        <div className="studio-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0 sm:pb-0">
          {detailTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                aria-pressed={isActive}
                className={cn(
                  'inline-flex h-11 min-w-[8.75rem] items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition duration-200 sm:min-w-0',
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
        <OverviewTab project={project} />
      ) : null}
      {activeTab === 'materials' ? (
        <MaterialsTab
          createLinkedMaterial={createLinkedMaterial}
          allLinkedMaterials={allLinkedMaterials}
          deleteLinkedMaterial={deleteLinkedMaterial}
          fabrics={fabrics}
          linkedMaterials={linkedMaterials}
          projects={projects}
          project={project}
          updateLinkedMaterial={updateLinkedMaterial}
        />
      ) : null}
      {activeTab === 'tasks' ? (
        <TasksTab
          createTask={createTask}
          deleteTask={deleteTask}
          project={project}
          updateTask={updateTask}
          updateTaskStatus={updateTaskStatus}
        />
      ) : null}
      {activeTab === 'notes' ? (
        <NotesTab
          createNote={createNote}
          deleteNote={deleteNote}
          project={project}
          updateNote={updateNote}
        />
      ) : null}
      {activeTab === 'lookbook' ? (
        <LookbookTab project={project} saveLookbookPage={saveLookbookPage} />
      ) : null}
    </section>
  );
}

function ProjectHero({
  difficulty,
  linkedFabrics,
  onBack,
  onDeleteProject,
  onEditProject,
  onUpdateProject,
  project,
}: {
  difficulty: string;
  linkedFabrics: Fabric[];
  onBack: () => void;
  onDeleteProject: () => void;
  onEditProject: () => void;
  onUpdateProject: (project: ApparelProject) => void;
  project: ApparelProject;
}) {
  const galleryImages = getProjectGalleryImages(project);

  return (
    <>
    <Card className="overflow-hidden p-0 lg:hidden" elevated>
      <ImageSlot
        actionClassName="right-3 top-3 bottom-auto"
        aspectClassName=""
        className="h-64 rounded-none border-0 border-b border-bronze/20 bg-midnight/40 md:max-lg:h-[24rem]"
        compact
        label="Hero"
        onRemove={() => onUpdateProject({ ...project, heroImage: undefined })}
        onSave={(image) => onUpdateProject({ ...project, heroImage: image })}
        placeholderClassName="bg-[radial-gradient(circle_at_22%_18%,rgba(200,155,60,0.38),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(45,92,107,0.42),transparent_32%),linear-gradient(145deg,rgba(27,58,99,0.84),rgba(10,10,10,0.76),rgba(61,43,31,0.86))]"
        placeholderText="Add project hero."
        readabilityVariant="hero"
        value={project.heroImage}
      >
        <div className="relative flex h-full flex-col justify-end p-4 [text-shadow:0_2px_16px_rgba(0,0,0,0.95)]">
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge variant="teal">{project.status}</Badge>
            <Badge variant="bronze">{project.phase}</Badge>
          </div>
          <h1 className="text-3xl font-semibold leading-tight text-stardust">
            {project.name}
          </h1>
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-stardust/70">Progress</span>
              <span className="font-medium text-ember">{project.progress}%</span>
            </div>
            <div className="studio-progress-track">
              <div
                className="studio-progress-fill"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>
        </div>
      </ImageSlot>
      <div className="p-4">
        <p className="line-clamp-3 text-sm leading-6 text-stardust/68">
          {project.summary}
        </p>
        <div className="mt-4 flex gap-2">
          <Button className="flex-1" onClick={onEditProject} size="sm" variant="primary">
            Edit
          </Button>
          <Button className="flex-1" onClick={onBack} size="sm" variant="secondary">
            Library
          </Button>
        </div>
        <div className="mt-4 grid gap-3">
          <ExpandableInfoSection
            summary={`${project.garmentType} / ${project.collection}`}
            title="Project details"
          >
            <div className="grid gap-3">
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
                icon={<Sparkles aria-hidden="true" size={18} strokeWidth={1.9} />}
                label="Difficulty"
                value={difficulty}
              />
            </div>
          </ExpandableInfoSection>
          <ExpandableInfoSection
            summary={`${galleryImages.length} of 3 supporting images`}
            title="Project media"
          >
            <div className="grid gap-3">
              {[0, 1, 2].map((index) => (
                <LocalImageUploader
                  compact
                  key={index}
                  label={`Gallery ${index + 1}`}
                  onRemove={() =>
                    onUpdateProject({
                      ...project,
                      galleryImages: galleryImages.filter(
                        (_image, imageIndex) => imageIndex !== index,
                      ),
                    })
                  }
                  onSave={(image) => {
                    const nextImages = [...galleryImages];
                    nextImages[index] = image;
                    onUpdateProject({
                      ...project,
                      galleryImages: nextImages.filter(Boolean),
                    });
                  }}
                  value={galleryImages[index]}
                />
              ))}
            </div>
          </ExpandableInfoSection>
        </div>
      </div>
    </Card>

    <Card className="hidden overflow-hidden p-0 lg:block" elevated>
      <div className="grid min-h-[26rem] lg:grid-cols-[1.08fr_0.92fr]">
        <div className="flex flex-col justify-between gap-10 p-5 sm:p-7 lg:p-8">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <BackButton onBack={onBack} />
              <div className="flex flex-wrap gap-2">
                <Button onClick={onEditProject} size="sm" variant="secondary">
                  Edit Project
                </Button>
                <Button onClick={onDeleteProject} size="sm" variant="ghost">
                  Delete Project
                </Button>
              </div>
            </div>
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

        <ImageSlot
          actionClassName="right-5 top-5 bottom-auto"
          aspectClassName=""
          className="min-h-[21rem] rounded-none border-0 border-t border-bronze/20 bg-midnight/40 lg:border-l lg:border-t-0"
          label="Project Hero"
          onRemove={() => onUpdateProject({ ...project, heroImage: undefined })}
          onSave={(image) => onUpdateProject({ ...project, heroImage: image })}
          placeholderClassName="bg-[radial-gradient(circle_at_22%_18%,rgba(200,155,60,0.38),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(45,92,107,0.42),transparent_32%),radial-gradient(circle_at_55%_82%,rgba(237,227,207,0.16),transparent_30%),linear-gradient(145deg,rgba(27,58,99,0.84),rgba(10,10,10,0.76),rgba(61,43,31,0.86))]"
          placeholderText="Add a hero image."
          readabilityVariant="hero"
          value={project.heroImage}
        >
          <div className="absolute inset-6 rounded-[2rem] border border-stardust/12 bg-midnight/18 shadow-[inset_0_0_90px_rgba(237,227,207,0.06)]" />
          <div className="relative flex h-full min-h-[21rem] flex-col justify-between p-6">
            <div className="flex items-center justify-end gap-3">
              <span className="rounded-full border border-stardust/18 bg-midnight/72 px-3 py-1 text-xs text-stardust/88 shadow-[0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-xl">
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
                <div className="studio-progress-track">
                  <div
                    className="studio-progress-fill"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </ImageSlot>
      </div>
      <div className="border-t border-bronze/20 p-5 sm:p-7 lg:p-8">
        <section className="rounded-3xl border border-bronze/28 bg-[linear-gradient(145deg,rgba(10,10,10,0.42),rgba(61,43,31,0.18))] p-4 shadow-[inset_0_1px_0_rgba(237,227,207,0.035)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Badge variant="bronze">Project Gallery</Badge>
              <p className="mt-2 text-sm leading-6 text-stardust/58">
                Add up to three supporting images for construction, fit, or detail
                reference.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <LocalImageUploader
                compact
                key={index}
                label={`Gallery ${index + 1}`}
                onRemove={() =>
                  onUpdateProject({
                    ...project,
                    galleryImages: galleryImages.filter((_, itemIndex) => itemIndex !== index),
                  })
                }
                onSave={(image) => {
                  const nextImages = [...galleryImages];
                  nextImages[index] = image;
                  onUpdateProject({
                    ...project,
                    galleryImages: nextImages.filter(Boolean),
                  });
                }}
                value={galleryImages[index]}
              />
            ))}
          </div>
        </section>
      </div>
    </Card>
    </>
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
      <div className="studio-scrollbar overflow-x-auto pb-2">
        <ol className="flex min-w-[62rem] items-start">
          {projectPhases.map((phase, index) => {
            const isComplete = index < currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <li className="relative flex flex-1 flex-col items-center" key={phase}>
                {index < projectPhases.length - 1 ? (
                  <span
                    className={cn(
                      'absolute left-1/2 top-4 h-px w-full transition duration-300',
                      isComplete
                        ? 'bg-[linear-gradient(90deg,#C89B3C,#EDE3CF)] shadow-[0_0_16px_rgba(200,155,60,0.58)]'
                        : 'bg-bronze/28',
                    )}
                  />
                ) : null}
                <span
                  className={cn(
                    'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold shadow-[inset_0_1px_0_rgba(237,227,207,0.06)] transition duration-300',
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

function OverviewTab({ project }: { project: ApparelProject }) {
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
          <InfoBlock label="Target wearer" value={project.targetWearer} />
          <InfoBlock label="General notes" value={project.generalNotes} />
        </div>
      </Card>

      <div className="space-y-4">
        <Card>
          <SectionHeading
            eyebrow="Shape"
            title="Silhouette"
            subtitle={project.silhouette}
          />
        </Card>
        <Card>
          <SectionHeading
            eyebrow="Palette"
            title="Color story"
            subtitle={project.colorStory}
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
          {project.keyFeatures.map((feature) => (
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
  allLinkedMaterials,
  createLinkedMaterial,
  deleteLinkedMaterial,
  fabrics,
  linkedMaterials,
  projects,
  project,
  updateLinkedMaterial,
}: {
  allLinkedMaterials: LinkedMaterial[];
  createLinkedMaterial: (linkedMaterial: LinkedMaterial) => void;
  deleteLinkedMaterial: (linkedMaterialId: string) => void;
  fabrics: Fabric[];
  linkedMaterials: LinkedMaterialRow[];
  projects: ApparelProject[];
  project: ApparelProject;
  updateLinkedMaterial: (linkedMaterial: LinkedMaterial) => void;
}) {
  const [materialForm, setMaterialForm] =
    useState<LinkedMaterialFormState | null>(null);
  const [unlinkCandidate, setUnlinkCandidate] =
    useState<LinkedMaterial | null>(null);
  const groups = materialRoles
    .map((role) => ({
      role,
      rows: linkedMaterials.filter((item) => item.allocation.role === role),
    }))
    .filter((group) => group.rows.length > 0);
  const warningCount = linkedMaterials.filter((item) =>
    hasYardageWarning(item.allocation, item.fabric, allLinkedMaterials, projects),
  ).length;

  const handleReserveYardage = (allocation: LinkedMaterial) => {
    updateLinkedMaterial({
      ...allocation,
      reservedYards: allocation.neededYards,
      status: 'Reserved',
    });
  };

  const handleMarkCut = (allocation: LinkedMaterial) => {
    updateLinkedMaterial({
      ...allocation,
      status: 'Cut',
    });
  };

  const handleMarkUsed = (allocation: LinkedMaterial) => {
    updateLinkedMaterial({
      ...allocation,
      reservedYards: 0,
      status: 'Used',
      usedYards: Math.max(
        allocation.usedYards,
        allocation.reservedYards,
        allocation.neededYards,
      ),
    });
  };

  return (
    <div className="space-y-4">
      <Card className="border-bronze/30 bg-[linear-gradient(135deg,rgba(27,58,99,0.22),rgba(10,10,10,0.48),rgba(61,43,31,0.34))]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge variant="teal">Materials</Badge>
            <h2 className="mt-4 text-2xl font-semibold text-stardust">
              Linked garment materials
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stardust/62">
              Fabrics, trims, notions, and production materials grouped by their
              role in this garment.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setMaterialForm({ mode: 'create' })}
              size="sm"
              variant="primary"
            >
              Link Fabric
            </Button>
            <Button
              onClick={() => setMaterialForm({ mode: 'create' })}
              size="sm"
              variant="secondary"
            >
              Add Material
            </Button>
            <Button
              onClick={() => setMaterialForm({ mode: 'create' })}
              size="sm"
              variant="secondary"
            >
              Reserve Yardage
            </Button>
          </div>
        </div>
        {warningCount > 0 ? (
          <div className="mt-5 flex gap-3 rounded-2xl border border-ember/35 bg-ember/10 p-4 text-sm leading-6 text-stardust/72">
            <AlertTriangle
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-ember"
              size={18}
              strokeWidth={1.9}
            />
            <span>
              {warningCount} material {warningCount === 1 ? 'needs' : 'need'} more
              yardage than currently appears available in the linked fabric vault.
            </span>
          </div>
        ) : null}
      </Card>

      {groups.map((group) => (
        <MaterialRoleGroup
          group={group}
          allLinkedMaterials={allLinkedMaterials}
          key={group.role}
          onEditMaterial={(linkedMaterial) =>
            setMaterialForm({ linkedMaterial, mode: 'edit' })
          }
          onMarkCut={handleMarkCut}
          onMarkUsed={handleMarkUsed}
          onReserveYardage={handleReserveYardage}
          onUnlinkMaterial={setUnlinkCandidate}
          projects={projects}
        />
      ))}
      {groups.length === 0 ? (
        <Card className="border-bronze/25 text-center">
          <p className="text-lg font-semibold text-stardust">
            No materials linked yet
          </p>
          <p className="mt-2 text-sm text-stardust/60">
            Link a fabric from the vault to start building this garment material
            ledger.
          </p>
        </Card>
      ) : null}
      {materialForm ? (
        <LinkedMaterialFormModal
          fabrics={fabrics}
          linkedMaterials={allLinkedMaterials}
          linkedMaterial={materialForm.linkedMaterial}
          mode={materialForm.mode}
          onClose={() => setMaterialForm(null)}
          onSubmit={(linkedMaterial) => {
            if (materialForm.mode === 'create') {
              createLinkedMaterial(linkedMaterial);
            } else {
              updateLinkedMaterial(linkedMaterial);
            }

            setMaterialForm(null);
          }}
          project={project}
        />
      ) : null}
      {unlinkCandidate ? (
        <UnlinkMaterialDialog
          linkedMaterial={unlinkCandidate}
          onCancel={() => setUnlinkCandidate(null)}
          onConfirm={() => {
            deleteLinkedMaterial(unlinkCandidate.id);
            setUnlinkCandidate(null);
          }}
        />
      ) : null}
    </div>
  );
}

type LinkedMaterialFormState =
  | { linkedMaterial?: undefined; mode: 'create' }
  | { linkedMaterial: LinkedMaterial; mode: 'edit' };

function MaterialRoleGroup({
  allLinkedMaterials,
  group,
  onEditMaterial,
  onMarkCut,
  onMarkUsed,
  onReserveYardage,
  onUnlinkMaterial,
  projects,
}: {
  allLinkedMaterials: LinkedMaterial[];
  group: { role: MaterialRole; rows: LinkedMaterialRow[] };
  onEditMaterial: (linkedMaterial: LinkedMaterial) => void;
  onMarkCut: (linkedMaterial: LinkedMaterial) => void;
  onMarkUsed: (linkedMaterial: LinkedMaterial) => void;
  onReserveYardage: (linkedMaterial: LinkedMaterial) => void;
  onUnlinkMaterial: (linkedMaterial: LinkedMaterial) => void;
  projects: ApparelProject[];
}) {
  return (
    <Card>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Badge variant="bronze">{group.role}</Badge>
          <h3 className="mt-3 text-xl font-semibold text-stardust">
            {group.rows.length} {group.rows.length === 1 ? 'material' : 'materials'}
          </h3>
        </div>
        <span className="text-sm text-stardust/52">
          {group.rows.filter((item) => item.fabric).length} fabric-linked
        </span>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {group.rows.map((row) => (
          <MaterialCard
            allLinkedMaterials={allLinkedMaterials}
            key={row.allocation.id}
            onEditMaterial={onEditMaterial}
            onMarkCut={onMarkCut}
            onMarkUsed={onMarkUsed}
            onReserveYardage={onReserveYardage}
            onUnlinkMaterial={onUnlinkMaterial}
            projects={projects}
            row={row}
          />
        ))}
      </div>
    </Card>
  );
}

function MaterialCard({
  allLinkedMaterials,
  onEditMaterial,
  onMarkCut,
  onMarkUsed,
  onReserveYardage,
  onUnlinkMaterial,
  projects,
  row,
}: {
  allLinkedMaterials: LinkedMaterial[];
  onEditMaterial: (linkedMaterial: LinkedMaterial) => void;
  onMarkCut: (linkedMaterial: LinkedMaterial) => void;
  onMarkUsed: (linkedMaterial: LinkedMaterial) => void;
  onReserveYardage: (linkedMaterial: LinkedMaterial) => void;
  onUnlinkMaterial: (linkedMaterial: LinkedMaterial) => void;
  projects: ApparelProject[];
  row: LinkedMaterialRow;
}) {
  const { allocation, fabric } = row;
  const yardageSummary = fabric
    ? calculateFabricYardage(fabric, allLinkedMaterials, projects)
    : undefined;
  const hasWarning = hasInsufficientYardage(allocation, yardageSummary);
  const displayName = fabric?.name ?? allocation.materialName;
  const notes = allocation.notes ?? fabric?.notes ?? 'No material notes yet.';
  const fabricImage = getFabricImage(fabric);

  return (
    <article
      className={cn(
        'rounded-3xl border bg-[linear-gradient(145deg,rgba(10,10,10,0.44),rgba(61,43,31,0.16))] p-4 shadow-[inset_0_1px_0_rgba(237,227,207,0.035)] transition duration-300 hover:-translate-y-1 hover:bg-midnight/46',
        hasWarning
          ? 'border-ember/45 shadow-[0_18px_50px_rgba(200,155,60,0.1)]'
          : 'border-bronze/22 hover:border-ember/35',
      )}
    >
      <div className="flex items-start gap-4">
        <span
          className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-stardust/20 bg-espresso/60"
          style={{ background: fabric ? getFabricSwatch(fabric) : undefined }}
        >
          {fabricImage ? (
            <StoredImage
              asset={fabricImage}
              className="h-full w-full object-cover"
            />
          ) : null}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-stardust">
                {displayName}
              </p>
              <p className="mt-1 text-sm text-stardust/52">
                {fabric
                  ? `${fabric.category} • ${fabric.composition}`
                  : 'Unlinked material record'}
              </p>
            </div>
            <Badge variant={hasWarning ? 'ember' : 'teal'}>
              {hasWarning ? 'Need More' : allocation.status}
            </Badge>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="bronze">{allocation.role}</Badge>
            {fabric ? <Badge variant="blue">{fabric.status}</Badge> : null}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniMetric
          label="Needed"
          value={formatYardage(allocation.neededYards)}
        />
        <MiniMetric
          label="Reserved"
          value={formatYardage(allocation.reservedYards)}
        />
        <MiniMetric label="Used" value={formatYardage(allocation.usedYards)} />
        <MiniMetric
          label={fabric ? 'Available' : 'Available'}
          value={
            yardageSummary === undefined
              ? 'Not linked'
              : formatYardage(yardageSummary.availableYards)
          }
        />
      </div>

      {hasWarning ? (
        <div className="mt-4 flex gap-3 rounded-2xl border border-ember/35 bg-ember/10 p-3 text-sm leading-6 text-stardust/72">
          <AlertTriangle
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-ember"
            size={17}
            strokeWidth={1.9}
          />
          <span>
            Needed yardage is greater than the currently available linked fabric
            yardage.
          </span>
        </div>
      ) : null}

      <p className="mt-4 text-sm leading-6 text-stardust/62">{notes}</p>
      {yardageSummary ? (
        <div className="mt-4 rounded-2xl border border-bronze/18 bg-espresso/22 p-3 text-xs leading-5 text-stardust/54">
          <span className="font-medium text-stardust/72">Calculation:</span>{' '}
          {formatYardage(yardageSummary.totalYards)} total -{' '}
          {formatYardage(yardageSummary.reservedYards)} reserved -{' '}
          {formatYardage(yardageSummary.usedYards)} used ={' '}
          <span className={hasWarning ? 'text-ember' : 'text-stardust/72'}>
            {formatYardage(yardageSummary.availableYards)} available
          </span>
        </div>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-2 border-t border-bronze/18 pt-4">
        <Button
          onClick={() => onReserveYardage(allocation)}
          size="sm"
          variant="secondary"
        >
          Reserve Yardage
        </Button>
        <Button
          onClick={() => onMarkCut(allocation)}
          size="sm"
          variant="secondary"
        >
          Mark as Cut
        </Button>
        <Button
          onClick={() => onMarkUsed(allocation)}
          size="sm"
          variant="secondary"
        >
          Mark as Used
        </Button>
        <Button
          icon={<Pencil aria-hidden="true" size={14} strokeWidth={1.9} />}
          onClick={() => onEditMaterial(allocation)}
          size="sm"
          variant="ghost"
        >
          Edit Link
        </Button>
        <Button
          icon={<Trash2 aria-hidden="true" size={14} strokeWidth={1.9} />}
          onClick={() => onUnlinkMaterial(allocation)}
          size="sm"
          variant="ghost"
        >
          Unlink
        </Button>
      </div>
    </article>
  );
}

function UnlinkMaterialDialog({
  linkedMaterial,
  onCancel,
  onConfirm,
}: {
  linkedMaterial: LinkedMaterial;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-midnight/82 px-4 py-5 backdrop-blur-xl sm:items-center">
      <section className="w-full max-w-lg rounded-3xl border border-ember/40 bg-[linear-gradient(135deg,rgba(61,43,31,0.94),rgba(10,10,10,0.98),rgba(27,58,99,0.36))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.46)] sm:p-6">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-ember">
          Unlink Material
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-stardust">
          Unlink {linkedMaterial.materialName}?
        </h2>
        <p className="mt-3 text-sm leading-6 text-stardust/64">
          This removes the fabric relationship from this project. The fabric
          record remains in the vault.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onCancel} variant="ghost">
            Cancel
          </Button>
          <Button onClick={onConfirm} variant="primary">
            Unlink Fabric
          </Button>
        </div>
      </section>
    </div>
  );
}

function TasksTab({
  createTask,
  deleteTask,
  project,
  updateTask,
  updateTaskStatus,
}: {
  createTask: (task: StudioTask) => void;
  deleteTask: (taskId: string) => void;
  project: ApparelProject;
  updateTask: (task: StudioTask) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
}) {
  const [taskStatusById, setTaskStatusById] = useState<TaskStatusMap>(() =>
    getTaskStatusMap(project.tasks),
  );
  const [lastMove, setLastMove] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<TaskFormState | null>(null);
  const [deleteTaskCandidate, setDeleteTaskCandidate] =
    useState<StudioTask | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 120, tolerance: 8 },
    }),
  );

  useEffect(() => {
    setTaskStatusById(getTaskStatusMap(project.tasks));
  }, [project.tasks]);

  useEffect(() => {
    setLastMove(null);
  }, [project.id]);

  const materialsById = useMemo(
    () =>
      new Map(
        project.linkedMaterials.map((material) => [material.id, material]),
      ),
    [project.linkedMaterials],
  );

  const tasksByStatus = useMemo(
    () =>
      taskStatuses.map((status) => ({
        status,
        tasks: project.tasks.filter(
          (task) => taskStatusById[task.id] === status,
        ),
      })),
    [project.tasks, taskStatusById],
  );

  const completeCount = project.tasks.filter(
    (task) => taskStatusById[task.id] === 'Done',
  ).length;
  const blockedCount = project.tasks.filter(
    (task) => taskStatusById[task.id] === 'Blocked',
  ).length;

  const handleDragEnd = (event: DragEndEvent) => {
    const taskId = String(event.active.id);
    const nextStatus = event.over?.id as TaskStatus | undefined;

    if (!nextStatus || !taskStatuses.includes(nextStatus)) {
      return;
    }

    const task = project.tasks.find((item) => item.id === taskId);
    const previousStatus = taskStatusById[taskId];

    if (!task || previousStatus === nextStatus) {
      return;
    }

    updateTaskStatus(taskId, nextStatus);
    setLastMove(`${task.title} moved from ${previousStatus} to ${nextStatus}.`);
  };

  return (
    <div className="space-y-4">
      <Card className="border-bronze/30 bg-[linear-gradient(135deg,rgba(45,92,107,0.2),rgba(10,10,10,0.5),rgba(61,43,31,0.32))]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <Badge variant="teal">Project Task Board</Badge>
            <h2 className="mt-4 text-2xl font-semibold text-stardust">
              {project.name} tasks
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stardust/62">
              Move garment-specific work through the project board. Status
              changes are saved to local browser storage for this MVP.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <TaskBoardMetric label="Tasks" value={project.tasks.length} />
            <TaskBoardMetric label="Blocked" value={blockedCount} />
            <TaskBoardMetric label="Done" value={completeCount} />
            <Button
              icon={<Plus aria-hidden="true" size={16} strokeWidth={1.9} />}
              onClick={() => setTaskForm({ mode: 'create' })}
              size="sm"
              variant="primary"
            >
              Add Task
            </Button>
          </div>
        </div>
        {lastMove ? (
          <div className="mt-5 rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-stardust/72">
            {lastMove}
          </div>
        ) : null}
      </Card>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="studio-scrollbar -mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex min-h-[31rem] gap-4">
            {tasksByStatus.map(({ status, tasks }) => (
              <TaskBoardColumn
                key={status}
                materialsById={materialsById}
                onDeleteTask={setDeleteTaskCandidate}
                onEditTask={(task) => setTaskForm({ mode: 'edit', task })}
                status={status}
                tasks={tasks}
              />
            ))}
          </div>
        </div>
      </DndContext>
      {taskForm ? (
        <TaskFormModal
          mode={taskForm.mode}
          onClose={() => setTaskForm(null)}
          onSubmit={(task) => {
            if (taskForm.mode === 'create') {
              createTask(task);
              setLastMove(`${task.title} added to ${task.status}.`);
            } else {
              updateTask(task);
              setLastMove(`${task.title} updated.`);
            }

            setTaskForm(null);
          }}
          project={project}
          task={taskForm.task}
        />
      ) : null}
      {deleteTaskCandidate ? (
        <DeleteTaskDialog
          onCancel={() => setDeleteTaskCandidate(null)}
          onConfirm={() => {
            deleteTask(deleteTaskCandidate.id);
            setLastMove(`${deleteTaskCandidate.title} deleted.`);
            setDeleteTaskCandidate(null);
          }}
          task={deleteTaskCandidate}
        />
      ) : null}
    </div>
  );
}

type TaskFormState =
  | { mode: 'create'; task?: undefined }
  | { mode: 'edit'; task: StudioTask };

type TaskStatusMap = Record<string, TaskStatus>;

function getTaskStatusMap(tasks: StudioTask[]) {
  return tasks.reduce<TaskStatusMap>(
    (statusMap, task) => ({
      ...statusMap,
      [task.id]: task.status,
    }),
    {},
  );
}

function TaskBoardMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-20 rounded-2xl border border-bronze/25 bg-midnight/38 px-3 py-2 text-center">
      <p className="text-lg font-semibold text-stardust">{value}</p>
      <p className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-stardust/42">
        {label}
      </p>
    </div>
  );
}

function TaskBoardColumn({
  materialsById,
  onDeleteTask,
  onEditTask,
  status,
  tasks,
}: {
  materialsById: Map<string, LinkedMaterial>;
  onDeleteTask: (task: StudioTask) => void;
  onEditTask: (task: StudioTask) => void;
  status: TaskStatus;
  tasks: StudioTask[];
}) {
  const { isOver, setNodeRef } = useDroppable({ id: status });

  return (
    <section
      className={cn(
        'flex w-[17.25rem] shrink-0 flex-col rounded-3xl border bg-[linear-gradient(145deg,rgba(237,227,207,0.055),rgba(10,10,10,0.2))] p-3 shadow-[0_20px_70px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(237,227,207,0.035)] backdrop-blur-xl transition duration-300 sm:w-[20rem]',
        isOver
          ? 'border-ember/60 bg-ember/10 shadow-[0_22px_70px_rgba(200,155,60,0.12)]'
          : 'border-bronze/24',
      )}
      ref={setNodeRef}
    >
      <div className="mb-3 flex items-start justify-between gap-3 rounded-2xl border border-bronze/20 bg-midnight/35 p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-stardust">{status}</p>
          <p className="mt-1 text-xs text-stardust/45">
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
          </p>
        </div>
        <span className="rounded-full border border-bronze/25 bg-espresso/40 px-2.5 py-1 text-xs font-medium text-ember">
          {tasks.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        {tasks.map((task) => (
          <TaskBoardCard
            key={task.id}
            material={
              task.linkedMaterialId
                ? materialsById.get(task.linkedMaterialId)
                : undefined
            }
            onDeleteTask={onDeleteTask}
            onEditTask={onEditTask}
            task={task}
          />
        ))}
        {tasks.length === 0 ? (
          <div className="flex min-h-36 flex-1 items-center justify-center rounded-2xl border border-dashed border-bronze/24 bg-midnight/20 p-4 text-center text-sm leading-6 text-stardust/42">
            Drop a task here to mark it {status}.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function TaskBoardCard({
  material,
  onDeleteTask,
  onEditTask,
  task,
}: {
  material?: LinkedMaterial;
  onDeleteTask: (task: StudioTask) => void;
  onEditTask: (task: StudioTask) => void;
  task: StudioTask;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
      data: { taskId: task.id },
    });
  const dragStyle = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <article
      className={cn(
        'touch-none rounded-2xl border border-bronze/28 bg-[linear-gradient(145deg,rgba(10,10,10,0.48),rgba(61,43,31,0.18))] p-4 text-stardust shadow-[0_16px_48px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(237,227,207,0.035)] transition duration-200 hover:-translate-y-1 hover:border-ember/48 hover:bg-midnight/60',
        isDragging &&
          'z-30 scale-[1.02] border-ember/70 opacity-90 shadow-[0_24px_70px_rgba(200,155,60,0.16)]',
      )}
      ref={setNodeRef}
      style={dragStyle}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className={cn('task-chip', categoryStyles[task.category])}>
            {task.category}
          </span>
          <h3 className="mt-3 text-base font-semibold leading-6 text-stardust">
            {task.title}
          </h3>
        </div>
        <button
          aria-label={`Drag ${task.title}`}
          className="flex h-9 w-9 shrink-0 touch-none items-center justify-center rounded-xl border border-bronze/20 bg-midnight/30 text-stardust/35 transition hover:border-ember/40 hover:text-ember"
          type="button"
          {...listeners}
          {...attributes}
        >
          <GripVertical aria-hidden="true" size={18} strokeWidth={1.8} />
        </button>
      </div>

      <p className="mt-3 line-clamp-3 text-sm leading-6 text-stardust/58">
        {task.description}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className={cn('task-chip', priorityStyles[task.priority])}>
          {task.priority}
        </span>
        <span className="task-chip border-bronze/35 bg-bronze/12 text-stardust/70">
          {task.phase}
        </span>
      </div>

      <div className="mt-4 space-y-2 rounded-xl border border-bronze/18 bg-espresso/24 px-3 py-3 text-xs text-stardust/55">
        <TaskCardMeta
          icon={<CalendarDays aria-hidden="true" size={14} strokeWidth={1.9} />}
          label={task.dueDate ? formatDate(task.dueDate) : 'No due date'}
        />
      {material ? (
        <TaskCardMeta
          icon={<Package aria-hidden="true" size={14} strokeWidth={1.9} />}
          label={material.materialName}
        />
      ) : null}
      </div>
      {task.notes ? (
        <p className="mt-3 line-clamp-2 rounded-xl border border-bronze/18 bg-midnight/24 px-3 py-2 text-xs leading-5 text-stardust/50">
          {task.notes}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2 border-t border-bronze/18 pt-3">
        <Button
          icon={<Pencil aria-hidden="true" size={14} strokeWidth={1.9} />}
          onClick={() => onEditTask(task)}
          size="sm"
          variant="ghost"
        >
          Edit
        </Button>
        <Button
          icon={<Trash2 aria-hidden="true" size={14} strokeWidth={1.9} />}
          onClick={() => onDeleteTask(task)}
          size="sm"
          variant="ghost"
        >
          Delete
        </Button>
      </div>
    </article>
  );
}

function DeleteTaskDialog({
  onCancel,
  onConfirm,
  task,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  task: StudioTask;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-midnight/82 px-4 py-5 backdrop-blur-xl sm:items-center">
      <section className="w-full max-w-lg rounded-3xl border border-ember/40 bg-[linear-gradient(135deg,rgba(61,43,31,0.94),rgba(10,10,10,0.98),rgba(27,58,99,0.36))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.46)] sm:p-6">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-ember">
          Delete Task
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-stardust">
          Delete {task.title}?
        </h2>
        <p className="mt-3 text-sm leading-6 text-stardust/64">
          This removes the task from this project board and local studio data.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onCancel} variant="ghost">
            Cancel
          </Button>
          <Button onClick={onConfirm} variant="primary">
            Delete Task
          </Button>
        </div>
      </section>
    </div>
  );
}

function TaskCardMeta({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-ember">{icon}</span>
      <span className="min-w-0 truncate">{label}</span>
    </div>
  );
}

const priorityStyles: Record<TaskPriority, string> = {
  Low: 'border-nebula/38 bg-nebula/12 text-stardust/68',
  Medium: 'border-celestial/45 bg-celestial/20 text-stardust',
  High: 'border-bronze/55 bg-bronze/18 text-stardust',
  Critical: 'border-ember/50 bg-ember/16 text-ember',
};

const categoryStyles: Record<TaskCategory, string> = {
  Concept: 'border-ember/35 bg-ember/10 text-ember',
  Research: 'border-celestial/45 bg-celestial/18 text-stardust',
  Sketch: 'border-stardust/28 bg-stardust/8 text-stardust/78',
  Fabric: 'border-nebula/48 bg-nebula/18 text-stardust',
  Pattern: 'border-bronze/45 bg-bronze/16 text-stardust',
  Cutting: 'border-bronze/50 bg-bronze/18 text-stardust',
  Sewing: 'border-espresso/70 bg-espresso/45 text-stardust',
  Fitting: 'border-ember/45 bg-ember/12 text-stardust',
  Revision: 'border-bronze/50 bg-bronze/18 text-stardust',
  Trim: 'border-nebula/45 bg-nebula/16 text-stardust',
  Costing: 'border-celestial/48 bg-celestial/18 text-stardust',
  Photography: 'border-stardust/30 bg-stardust/9 text-stardust',
  Lookbook: 'border-ember/38 bg-ember/12 text-ember',
  Client: 'border-bronze/42 bg-bronze/15 text-stardust',
  Admin: 'border-stardust/24 bg-midnight/45 text-stardust/68',
};

function NotesTab({
  createNote,
  deleteNote,
  project,
  updateNote,
}: {
  createNote: (note: StudioNote) => void;
  deleteNote: (noteId: string) => void;
  project: ApparelProject;
  updateNote: (note: StudioNote) => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<NoteCategory | 'All'>(
    'All',
  );
  const [noteForm, setNoteForm] = useState<NoteFormState | null>(null);
  const [deleteNoteCandidate, setDeleteNoteCandidate] =
    useState<StudioNote | null>(null);
  const sortedNotes = [...project.notes].sort((a, b) =>
    studioDateTimestamp(b.createdAt) - studioDateTimestamp(a.createdAt),
  );
  const visibleNotes =
    selectedCategory === 'All'
      ? sortedNotes
      : sortedNotes.filter((note) => note.category === selectedCategory);

  return (
    <div className="space-y-4">
      <Card className="border-bronze/30 bg-[linear-gradient(135deg,rgba(27,58,99,0.22),rgba(10,10,10,0.48),rgba(61,43,31,0.34))]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <Badge variant="teal">Project Journal</Badge>
            <h2 className="mt-4 text-2xl font-semibold text-stardust">
              Studio notes
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stardust/62">
              Design thinking, construction decisions, fit observations, and
              build history for this garment.
            </p>
          </div>
          <Button
            icon={<Plus aria-hidden="true" size={16} strokeWidth={1.9} />}
            onClick={() => setNoteForm({ mode: 'create' })}
            size="sm"
            variant="primary"
          >
            Add Note
          </Button>
        </div>
        <div className="studio-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1">
          {(['All', ...noteCategories] as Array<NoteCategory | 'All'>).map(
            (category) => {
              const isActive = selectedCategory === category;
              const count =
                category === 'All'
                  ? project.notes.length
                  : project.notes.filter((note) => note.category === category).length;

              return (
                <button
                  aria-pressed={isActive}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition duration-200',
                    isActive
                      ? 'border-ember/60 bg-ember text-midnight'
                      : 'border-bronze/25 bg-midnight/35 text-stardust/64 hover:border-ember/40 hover:text-stardust',
                  )}
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  type="button"
                >
                  {category}
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[0.65rem]',
                      isActive
                        ? 'bg-midnight/18 text-midnight'
                        : 'bg-stardust/8 text-stardust/48',
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            },
          )}
        </div>
      </Card>

      {visibleNotes.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {visibleNotes.map((note) => (
            <NoteJournalCard
              key={note.id}
              note={note}
              onDeleteNote={setDeleteNoteCandidate}
              onEditNote={(selectedNote) =>
                setNoteForm({ mode: 'edit', note: selectedNote })
              }
            />
          ))}
        </div>
      ) : (
        <Card className="border-bronze/25 text-center">
          <p className="text-lg font-semibold text-stardust">
            No notes in this category
          </p>
          <p className="mt-2 text-sm text-stardust/60">
            Choose another category or add a note for this project journal.
          </p>
        </Card>
      )}
      {noteForm ? (
        <NoteFormModal
          mode={noteForm.mode}
          note={noteForm.note}
          onClose={() => setNoteForm(null)}
          onSubmit={(note) => {
            if (noteForm.mode === 'create') {
              createNote(note);
            } else {
              updateNote(note);
            }

            setSelectedCategory(note.category);
            setNoteForm(null);
          }}
          project={project}
        />
      ) : null}
      {deleteNoteCandidate ? (
        <DeleteNoteDialog
          note={deleteNoteCandidate}
          onCancel={() => setDeleteNoteCandidate(null)}
          onConfirm={() => {
            deleteNote(deleteNoteCandidate.id);
            setDeleteNoteCandidate(null);
          }}
        />
      ) : null}
    </div>
  );
}

type NoteFormState =
  | { mode: 'create'; note?: undefined }
  | { mode: 'edit'; note: StudioNote };

function NoteJournalCard({
  note,
  onDeleteNote,
  onEditNote,
}: {
  note: StudioNote;
  onDeleteNote: (note: StudioNote) => void;
  onEditNote: (note: StudioNote) => void;
}) {
  return (
    <article className="group relative overflow-hidden rounded-3xl border border-bronze/28 bg-[linear-gradient(145deg,rgba(237,227,207,0.068),rgba(10,10,10,0.22))] p-5 text-stardust shadow-[0_22px_70px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(237,227,207,0.045)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-ember/48 hover:bg-stardust/[0.08]">
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-1',
          noteCategoryAccent[note.category],
        )}
      />
      <div className="flex items-start justify-between gap-4">
        <div>
          <NoteCategoryChip category={note.category} />
          <h3 className="mt-4 text-xl font-semibold leading-tight text-stardust">
            {note.title}
          </h3>
        </div>
        <div className="shrink-0 text-right text-xs leading-5 text-stardust/48">
          <p>Created {formatDate(note.createdAt)}</p>
          {note.updatedAt ? <p>Updated {formatDate(note.updatedAt)}</p> : null}
        </div>
      </div>
      <p className="mt-5 text-sm leading-7 text-stardust/66">{note.body}</p>
      <div className="mt-5 rounded-2xl border border-bronze/18 bg-midnight/32 p-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-stardust/38">
          Journal cue
        </p>
        <p className="mt-2 text-sm leading-6 text-stardust/58">
          {noteCategoryCue[note.category]}
        </p>
      </div>
      <div className="mt-5 flex flex-wrap gap-2 border-t border-bronze/18 pt-4">
        <Button
          icon={<Pencil aria-hidden="true" size={14} strokeWidth={1.9} />}
          onClick={() => onEditNote(note)}
          size="sm"
          variant="ghost"
        >
          Edit
        </Button>
        <Button
          icon={<Trash2 aria-hidden="true" size={14} strokeWidth={1.9} />}
          onClick={() => onDeleteNote(note)}
          size="sm"
          variant="ghost"
        >
          Delete
        </Button>
      </div>
    </article>
  );
}

function DeleteNoteDialog({
  note,
  onCancel,
  onConfirm,
}: {
  note: StudioNote;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-midnight/82 px-4 py-5 backdrop-blur-xl sm:items-center">
      <section className="w-full max-w-lg rounded-3xl border border-ember/40 bg-[linear-gradient(135deg,rgba(61,43,31,0.94),rgba(10,10,10,0.98),rgba(27,58,99,0.36))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.46)] sm:p-6">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-ember">
          Delete Note
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-stardust">
          Delete {note.title}?
        </h2>
        <p className="mt-3 text-sm leading-6 text-stardust/64">
          This removes the journal entry from this project and local studio data.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onCancel} variant="ghost">
            Cancel
          </Button>
          <Button onClick={onConfirm} variant="primary">
            Delete Note
          </Button>
        </div>
      </section>
    </div>
  );
}

function NoteCategoryChip({ category }: { category: NoteCategory }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium',
        noteCategoryChip[category],
      )}
    >
      {category}
    </span>
  );
}

const noteCategoryChip: Record<NoteCategory, string> = {
  'Build Log': 'border-nebula/45 bg-nebula/18 text-stardust',
  'Client Note': 'border-stardust/25 bg-stardust/10 text-stardust',
  'Construction Note': 'border-bronze/45 bg-bronze/16 text-stardust',
  'Design Note': 'border-ember/35 bg-ember/12 text-ember',
  'Fit Note': 'border-celestial/55 bg-celestial/26 text-stardust',
  Idea: 'border-ember/35 bg-ember/18 text-stardust',
  'Pattern Note': 'border-espresso/70 bg-espresso/55 text-stardust',
};

const noteCategoryAccent: Record<NoteCategory, string> = {
  'Build Log': 'bg-nebula',
  'Client Note': 'bg-stardust',
  'Construction Note': 'bg-bronze',
  'Design Note': 'bg-ember',
  'Fit Note': 'bg-celestial',
  Idea: 'bg-[linear-gradient(90deg,#C89B3C,#EDE3CF)]',
  'Pattern Note': 'bg-espresso',
};

const noteCategoryCue: Record<NoteCategory, string> = {
  'Build Log': 'Chronicles what changed during sampling, sewing, pressing, or review.',
  'Client Note': 'Captures buyer, wearer, or presentation feedback that should shape the garment.',
  'Construction Note': 'Records seam, finish, and assembly decisions for future production reference.',
  'Design Note': 'Preserves the creative reason behind the garment and its visual language.',
  'Fit Note': 'Tracks body, proportion, comfort, and movement observations.',
  Idea: 'Holds an open creative thought that may become a task or design decision later.',
  'Pattern Note': 'Documents draft changes, measurements, and pattern behavior.',
};

const lookbookTemplates: LookbookTemplate[] = [
  'Editorial Hero',
  'Technical Showcase',
  'Development Story',
];

function LookbookTab({
  project,
  saveLookbookPage,
}: {
  project: ApparelProject;
  saveLookbookPage: (lookbookPage: LookbookPage) => void;
}) {
  const lookbookPage = getEditableLookbookPage(project);
  const [selectedTemplate, setSelectedTemplate] =
    useState<LookbookTemplate>(lookbookPage?.template ?? 'Editorial Hero');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setSelectedTemplate(lookbookPage?.template ?? 'Editorial Hero');
  }, [lookbookPage?.id, lookbookPage?.template, project.id]);

  const preview = buildLookbookPreview(project, selectedTemplate, lookbookPage);
  const saveLookbookImage = (image: LookbookPage['heroImage'] | undefined) => {
    const baseValues = lookbookPageToFormValues(project, lookbookPage, selectedTemplate);

    saveLookbookPage({
      ...formValuesToLookbookPage(baseValues, project, lookbookPage),
      heroImage: image,
    });
  };

  return (
    <div className="space-y-4">
      <Card className="border-bronze/30 bg-[linear-gradient(135deg,rgba(27,58,99,0.22),rgba(10,10,10,0.5),rgba(61,43,31,0.34))]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <Badge variant="teal">Lookbook Preview</Badge>
            <h2 className="mt-4 text-2xl font-semibold text-stardust">
              Project presentation
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stardust/62">
              A responsive internal preview for editorial direction, garment
              story, materials, styling, specs, and credits.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex rounded-2xl border border-bronze/25 bg-midnight/42 p-1">
              {lookbookTemplates.map((template) => {
                const isActive = selectedTemplate === template;

                return (
                  <button
                    aria-pressed={isActive}
                    className={cn(
                      'min-h-10 rounded-xl px-3 text-xs font-medium transition duration-200 sm:text-sm',
                      isActive
                        ? 'bg-ember text-midnight shadow-[0_12px_30px_rgba(200,155,60,0.16)]'
                        : 'text-stardust/60 hover:bg-stardust/7 hover:text-stardust',
                    )}
                    key={template}
                    onClick={() => setSelectedTemplate(template)}
                    type="button"
                  >
                    {template}
                  </button>
                );
              })}
            </div>
            <Button
              icon={<Pencil aria-hidden="true" size={15} strokeWidth={1.9} />}
              onClick={() => setIsEditing(true)}
              size="sm"
              variant="primary"
            >
              Edit Lookbook
            </Button>
          </div>
        </div>
      </Card>

      <section
        className={cn(
          'overflow-hidden rounded-[2rem] border border-bronze/30 bg-[linear-gradient(145deg,rgba(237,227,207,0.06),rgba(10,10,10,0.2))] shadow-[0_30px_100px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(237,227,207,0.045)]',
          lookbookTemplateShell[selectedTemplate],
        )}
      >
        <div className="grid min-h-[34rem] lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
          <div className="flex flex-col justify-between gap-12 p-5 sm:p-7 lg:p-8">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="ember">{selectedTemplate}</Badge>
                <Badge variant="bronze">{project.collection}</Badge>
                <Badge variant="blue">{project.season}</Badge>
              </div>
              <p className="mt-8 text-xs font-medium uppercase tracking-[0.16em] text-ember">
                Mystic Lore Studio / {project.garmentType}
              </p>
              <h2 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-stardust sm:text-5xl">
                {preview.headline}
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-stardust/70">
                {preview.subheadline}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <LookbookMetric label="Phase" value={project.phase} />
              <LookbookMetric label="Progress" value={`${project.progress}%`} />
              <LookbookMetric label="Difficulty" value={project.difficulty} />
            </div>
          </div>

          <ImageSlot
            actionClassName="right-5 top-5 bottom-auto"
            aspectClassName=""
            className="min-h-[24rem] rounded-none border-0 border-t border-bronze/20 lg:border-l lg:border-t-0"
            fallbackValue={preview.heroImage}
            label="Lookbook Hero"
            onRemove={() => saveLookbookImage(undefined)}
            onSave={saveLookbookImage}
            placeholderClassName={preview.visualClassName}
            placeholderText="Add a lookbook hero visual."
            readabilityVariant="hero"
            value={lookbookPage?.heroImage}
          >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(237,227,207,0.07)_1px,transparent_1px),linear-gradient(0deg,rgba(237,227,207,0.055)_1px,transparent_1px)] [background-size:22px_22px]" />
            <div className="relative flex h-full min-h-[24rem] flex-col justify-between p-5 sm:p-7">
              <div className="flex items-center justify-end gap-3">
                <span className="rounded-full border border-stardust/18 bg-midnight/72 px-3 py-1 text-xs text-stardust/88 shadow-[0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-xl">
                  {project.targetDate ? formatDate(project.targetDate) : 'Undated'}
                </span>
              </div>
              <div>
                <div className="mb-5 grid grid-cols-3 gap-3">
                  {preview.detailPlaceholders.map((detail) => (
                    <div
                      className={cn(
                        'relative aspect-[4/5] overflow-hidden rounded-2xl border border-stardust/14',
                        detail.className,
                      )}
                      key={detail.label}
                    >
                      {detail.image ? (
                        <StoredImage
                          asset={detail.image}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : null}
                      <ImageReadabilityOverlay
                        asset={detail.image}
                        variant="card"
                      />
                      <span className="relative z-10 flex h-full items-end p-3 text-xs font-medium text-stardust/90 [text-shadow:0_2px_12px_rgba(0,0,0,0.98)]">
                        {detail.label}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="max-w-lg text-2xl font-semibold leading-tight text-stardust">
                  {preview.heroCaption}
                </p>
              </div>
            </div>
          </ImageSlot>
        </div>

        <div className="grid gap-5 border-t border-bronze/20 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.62fr)] lg:p-8">
          <div className="space-y-5">
            <LookbookSection
              icon={<BookOpen aria-hidden="true" size={18} strokeWidth={1.9} />}
              title="Garment Story"
            >
              <p className="text-base leading-8 text-stardust/70">
                {preview.garmentStory}
              </p>
            </LookbookSection>

            <div className="grid gap-5 md:grid-cols-2">
              <LookbookSection
                icon={<Sparkles aria-hidden="true" size={18} strokeWidth={1.9} />}
                title="Design Notes"
              >
                <LookbookList items={preview.designNotes} />
              </LookbookSection>
              <LookbookSection
                icon={<Shirt aria-hidden="true" size={18} strokeWidth={1.9} />}
                title="Styling Notes"
              >
                <LookbookList items={preview.stylingNotes} />
              </LookbookSection>
            </div>

            <LookbookSection
              icon={<Package aria-hidden="true" size={18} strokeWidth={1.9} />}
              title="Material Notes"
            >
              {preview.materialNotes.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {preview.materialNotes.map((material) => (
                    <div
                      className="rounded-2xl border border-bronze/18 bg-midnight/28 p-4"
                      key={material.name}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-stardust">
                            {material.name}
                          </p>
                          <p className="mt-1 text-xs text-stardust/45">
                            {material.role}
                          </p>
                        </div>
                        <Badge variant="teal">{material.status}</Badge>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-stardust/58">
                        {material.notes}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-bronze/25 bg-midnight/24 p-5 text-sm leading-6 text-stardust/54">
                  Materials linked to this project will appear in the preview.
                </p>
              )}
            </LookbookSection>
          </div>

          <aside className="space-y-5">
            <LookbookSection
              icon={<Palette aria-hidden="true" size={18} strokeWidth={1.9} />}
              title="Detail Placeholders"
            >
              <div className="grid gap-3">
                {preview.detailPlaceholders.map((detail) => (
                  <div
                    className="grid grid-cols-[5rem_1fr] overflow-hidden rounded-2xl border border-bronze/18 bg-midnight/28"
                    key={detail.label}
                  >
                    <span
                      className={cn(
                        'relative block min-h-20 overflow-hidden',
                        detail.className,
                      )}
                    >
                      {detail.image ? (
                        <StoredImage
                          asset={detail.image}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : null}
                    </span>
                    <div className="p-3">
                      <p className="text-sm font-semibold text-stardust">
                        {detail.label}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-stardust/50">
                        {detail.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </LookbookSection>

            <LookbookSection
              icon={<Layers3 aria-hidden="true" size={18} strokeWidth={1.9} />}
              title="Display Specs"
            >
              <div className="grid gap-3">
                {preview.displaySpecs.map((spec) => (
                  <LookbookSpec
                    key={spec.label}
                    label={spec.label}
                    value={spec.value}
                  />
                ))}
              </div>
            </LookbookSection>

            <LookbookSection
              icon={<Sparkles aria-hidden="true" size={18} strokeWidth={1.9} />}
              title="Credits"
            >
              <div className="space-y-3">
                {preview.credits.map((credit) => (
                  <LookbookSpec
                    key={credit.label}
                    label={credit.label}
                    value={credit.value}
                  />
                ))}
              </div>
            </LookbookSection>
          </aside>
        </div>
      </section>
      {isEditing ? (
        <LookbookEditModal
          lookbookPage={lookbookPage}
          onClose={() => setIsEditing(false)}
          onSave={(nextPage) => {
            saveLookbookPage(nextPage);
            setSelectedTemplate(nextPage.template ?? 'Editorial Hero');
            setIsEditing(false);
          }}
          project={project}
          selectedTemplate={selectedTemplate}
        />
      ) : null}
    </div>
  );
}

function LookbookSection({
  children,
  icon,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-3xl border border-bronze/26 bg-[linear-gradient(145deg,rgba(10,10,10,0.4),rgba(61,43,31,0.14))] p-5 shadow-[inset_0_1px_0_rgba(237,227,207,0.035)]">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-bronze/25 bg-espresso/42 text-ember">
          {icon}
        </span>
        <h3 className="text-lg font-semibold text-stardust">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function LookbookList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li className="flex gap-3 text-sm leading-6 text-stardust/62" key={item}>
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function LookbookMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-bronze/20 bg-midnight/35 p-4">
      <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-stardust/42">
        {label}
      </p>
      <p className="mt-2 truncate text-sm font-semibold text-stardust">{value}</p>
    </div>
  );
}

function LookbookSpec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-bronze/18 bg-midnight/30 p-4">
      <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-stardust/38">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-5 text-stardust">{value}</p>
    </div>
  );
}

type LookbookFormValues = {
  credits: string;
  designNotes: string;
  displaySpecs: string;
  garmentStory: string;
  headline: string;
  materialNotes: string;
  stylingNotes: string;
  subheadline: string;
  template: LookbookTemplate;
};

function LookbookEditModal({
  lookbookPage,
  onClose,
  onSave,
  project,
  selectedTemplate,
}: {
  lookbookPage?: LookbookPage;
  onClose: () => void;
  onSave: (lookbookPage: LookbookPage) => void;
  project: ApparelProject;
  selectedTemplate: LookbookTemplate;
}) {
  const [values, setValues] = useState<LookbookFormValues>(() =>
    lookbookPageToFormValues(project, lookbookPage, selectedTemplate),
  );

  const updateValue = <Key extends keyof LookbookFormValues>(
    key: Key,
    value: LookbookFormValues[Key],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleResetFromProject = () => {
    setValues(projectFallbackToFormValues(project, values.template));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave(formValuesToLookbookPage(values, project, lookbookPage));
  };

  return (
    <div className="studio-scrollbar fixed inset-0 z-50 overflow-y-auto bg-midnight/82 px-3 py-4 backdrop-blur-xl sm:px-5 sm:py-6">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-bronze/30 bg-[linear-gradient(135deg,rgba(45,92,107,0.28),rgba(10,10,10,0.96),rgba(61,43,31,0.58))] shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-bronze/24 bg-midnight/92 p-4 backdrop-blur-xl sm:p-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-ember">
              Edit Lookbook
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-stardust">
              {project.name} presentation
            </h2>
          </div>
          <button
            aria-label="Close lookbook editor"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-bronze/30 bg-midnight/65 text-stardust/72 transition hover:border-ember/45 hover:text-stardust"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={1.9} />
          </button>
        </div>

        <form className="space-y-5 p-4 sm:p-6" onSubmit={handleSubmit}>
          <LookbookFormSection title="Template and Lead Copy">
            <LookbookSelect
              label="Template"
              onChange={(value) => updateValue('template', value as LookbookTemplate)}
              options={lookbookTemplates}
              value={values.template}
            />
            <LookbookInput
              label="Headline"
              onChange={(value) => updateValue('headline', value)}
              value={values.headline}
            />
            <LookbookTextarea
              label="Subheadline"
              onChange={(value) => updateValue('subheadline', value)}
              value={values.subheadline}
            />
            <LookbookTextarea
              label="Garment story"
              onChange={(value) => updateValue('garmentStory', value)}
              value={values.garmentStory}
            />
          </LookbookFormSection>

          <div className="grid gap-5 lg:grid-cols-2">
            <LookbookFormSection title="Studio Notes">
              <LookbookTextarea
                helper="One note per line."
                label="Design notes"
                onChange={(value) => updateValue('designNotes', value)}
                value={values.designNotes}
              />
              <LookbookTextarea
                helper="One note per line."
                label="Styling notes"
                onChange={(value) => updateValue('stylingNotes', value)}
                value={values.stylingNotes}
              />
            </LookbookFormSection>

            <LookbookFormSection title="Materials">
              <LookbookTextarea
                helper="One material note per line."
                label="Material notes"
                onChange={(value) => updateValue('materialNotes', value)}
                value={values.materialNotes}
              />
            </LookbookFormSection>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <LookbookFormSection title="Credits">
              <LookbookTextarea
                helper="Use Label: Value on each line."
                label="Credits"
                onChange={(value) => updateValue('credits', value)}
                value={values.credits}
              />
            </LookbookFormSection>
            <LookbookFormSection title="Display Specs">
              <LookbookTextarea
                helper="Use Label: Value on each line."
                label="Display specs"
                onChange={(value) => updateValue('displaySpecs', value)}
                value={values.displaySpecs}
              />
            </LookbookFormSection>
          </div>

          <div className="sticky bottom-0 -mx-4 -mb-4 flex flex-col gap-3 border-t border-bronze/24 bg-midnight/92 p-4 backdrop-blur-xl sm:-mx-6 sm:-mb-6 sm:flex-row sm:justify-between sm:p-6">
            <Button onClick={handleResetFromProject} type="button" variant="secondary">
              Reset from Project Data
            </Button>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button onClick={onClose} type="button" variant="ghost">
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Save Lookbook
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function LookbookFormSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-3xl border border-bronze/28 bg-[linear-gradient(145deg,rgba(237,227,207,0.06),rgba(10,10,10,0.18))] p-4 shadow-[inset_0_1px_0_rgba(237,227,207,0.035)] sm:p-5">
      <h3 className="text-lg font-semibold text-stardust">{title}</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function LookbookInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-stardust/42">
        {label}
      </span>
      <input
        className="min-h-12 w-full rounded-2xl border border-bronze/28 bg-midnight/55 px-4 text-sm text-stardust outline-none transition placeholder:text-stardust/32 focus:border-ember/60"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function LookbookSelect({
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
    <label className="block">
      <span className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-stardust/42">
        {label}
      </span>
      <select
        className="min-h-12 w-full rounded-2xl border border-bronze/28 bg-midnight/55 px-4 text-sm text-stardust outline-none transition focus:border-ember/60"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function LookbookTextarea({
  helper,
  label,
  onChange,
  value,
}: {
  helper?: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block md:col-span-2">
      <span className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-stardust/42">
        {label}
      </span>
      <textarea
        className="min-h-32 w-full rounded-2xl border border-bronze/28 bg-midnight/55 px-4 py-3 text-sm leading-6 text-stardust outline-none transition placeholder:text-stardust/32 focus:border-ember/60"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
      {helper ? (
        <span className="mt-2 block text-xs text-stardust/42">{helper}</span>
      ) : null}
    </label>
  );
}

function buildLookbookPreview(
  project: ApparelProject,
  template: LookbookTemplate,
  lookbookPage?: LookbookPage,
) {
  const preferredPage =
    lookbookPage ??
    project.lookbookPages.find((page) => page.pageType === preferredPageType[template]) ??
    project.lookbookPages[0];
  const projectFallback = buildProjectLookbookFallback(project, template);
  const headline = preferredPage?.headline || projectFallback.headline;
  const subheadline =
    preferredPage?.subheadline ||
    preferredPage?.body ||
    projectFallback.subheadline;
  const materialNotes = (preferredPage?.materialNotes?.length
    ? preferredPage.materialNotes.map((note) => ({
        name: note.split(':')[0]?.trim() || 'Material Note',
        notes: note,
        role: 'Lookbook Note',
        status: 'Saved',
      }))
    : projectFallback.materialNotes);

  const galleryImages = getProjectGalleryImages(project);

  return {
    credits: preferredPage?.credits?.length
      ? preferredPage.credits
      : projectFallback.credits,
    designNotes: preferredPage?.designNotes?.length
      ? preferredPage.designNotes
      : projectFallback.designNotes,
    detailPlaceholders: getLookbookDetailPlaceholders(template).map(
      (detail, index) => ({
        ...detail,
        image: galleryImages[index],
      }),
    ),
    displaySpecs: preferredPage?.displaySpecs?.length
      ? preferredPage.displaySpecs
      : projectFallback.displaySpecs,
    garmentStory:
      preferredPage?.garmentStory ||
      getTemplateGarmentStory(project, preferredPage?.body, template),
    headline,
    heroCaption: preferredPage?.layoutHint || project.silhouette,
    heroImage: getLookbookHeroImage(project, preferredPage),
    materialNotes,
    stylingNotes: preferredPage?.stylingNotes?.length
      ? preferredPage.stylingNotes
      : getTemplateStylingNotes(project, template),
    subheadline,
    visualClassName: lookbookVisualClass[template],
  };
}

function getEditableLookbookPage(project: ApparelProject) {
  return (
    project.lookbookPages.find((page) => page.template) ??
    project.lookbookPages[0]
  );
}

function lookbookPageToFormValues(
  project: ApparelProject,
  lookbookPage: LookbookPage | undefined,
  selectedTemplate: LookbookTemplate,
): LookbookFormValues {
  const template = lookbookPage?.template ?? selectedTemplate;
  const fallback = projectFallbackToFormValues(project, template);

  return {
    credits: lookbookPage?.credits?.length
      ? formatFieldItems(lookbookPage.credits)
      : fallback.credits,
    designNotes: lookbookPage?.designNotes?.length
      ? lookbookPage.designNotes.join('\n')
      : fallback.designNotes,
    displaySpecs: lookbookPage?.displaySpecs?.length
      ? formatFieldItems(lookbookPage.displaySpecs)
      : fallback.displaySpecs,
    garmentStory: lookbookPage?.garmentStory || fallback.garmentStory,
    headline: lookbookPage?.headline || fallback.headline,
    materialNotes: lookbookPage?.materialNotes?.length
      ? lookbookPage.materialNotes.join('\n')
      : fallback.materialNotes,
    stylingNotes: lookbookPage?.stylingNotes?.length
      ? lookbookPage.stylingNotes.join('\n')
      : fallback.stylingNotes,
    subheadline:
      lookbookPage?.subheadline || lookbookPage?.body || fallback.subheadline,
    template,
  };
}

function projectFallbackToFormValues(
  project: ApparelProject,
  template: LookbookTemplate,
): LookbookFormValues {
  const fallback = buildProjectLookbookFallback(project, template);

  return {
    credits: formatFieldItems(fallback.credits),
    designNotes: fallback.designNotes.join('\n'),
    displaySpecs: formatFieldItems(fallback.displaySpecs),
    garmentStory: fallback.garmentStory,
    headline: fallback.headline,
    materialNotes: fallback.materialNotes
      .map((material) => `${material.name}: ${material.notes}`)
      .join('\n'),
    stylingNotes: fallback.stylingNotes.join('\n'),
    subheadline: fallback.subheadline,
    template,
  };
}

function formValuesToLookbookPage(
  values: LookbookFormValues,
  project: ApparelProject,
  existingPage?: LookbookPage,
): LookbookPage {
  const headline = values.headline.trim() || project.name;
  const subheadline = values.subheadline.trim() || project.summary;

  return {
    ...existingPage,
    body: subheadline,
    credits: parseFieldItems(values.credits),
    designNotes: parseList(values.designNotes),
    displaySpecs: parseFieldItems(values.displaySpecs),
    garmentStory: values.garmentStory.trim(),
    headline,
    id: existingPage?.id ?? createLookbookPageId(project.id),
    layoutHint: `${values.template} presentation preview`,
    materialNotes: parseList(values.materialNotes),
    pageType: pageTypeByTemplate[values.template],
    projectId: project.id,
    stylingNotes: parseList(values.stylingNotes),
    subheadline,
    template: values.template,
    title: `${project.name} lookbook preview`,
    updatedAt: todayString(),
  };
}

function buildProjectLookbookFallback(
  project: ApparelProject,
  template: LookbookTemplate,
) {
  const preferredPage =
    project.lookbookPages.find((page) => page.pageType === preferredPageType[template]) ??
    project.lookbookPages[0];
  const keyFeatures =
    project.keyFeatures.length > 0
      ? project.keyFeatures
      : ['Silhouette study', 'Material direction', 'Studio construction notes'];
  const materialNotes = project.linkedMaterials
    .filter((material) => Boolean(material.materialName))
    .slice(0, 4)
    .map((material) => ({
      name: material.materialName,
      notes:
        material.notes ||
        `${formatYardage(material.neededYards)} needed for ${material.role.toLowerCase()}.`,
      role: material.role,
      status: material.status,
    }));

  return {
    credits: [
      { label: 'Creative Direction', value: 'Mystic Lore Studio' },
      { label: 'Garment Development', value: project.collection },
      { label: 'Presentation Status', value: project.status },
    ],
    designNotes: [
      project.designIntent,
      project.colorStory,
      ...keyFeatures,
    ].filter(Boolean),
    displaySpecs: [
      { label: 'Project', value: project.name },
      { label: 'Garment Type', value: project.garmentType },
      { label: 'Collection', value: project.collection },
      { label: 'Season', value: project.season },
      { label: 'Current Phase', value: project.phase },
      {
        label: 'Target Date',
        value: project.targetDate ? formatDate(project.targetDate) : 'Not scheduled',
      },
    ],
    garmentStory: getTemplateGarmentStory(project, preferredPage?.body, template),
    headline: preferredPage?.headline || project.name,
    materialNotes,
    stylingNotes: getTemplateStylingNotes(project, template),
    subheadline:
      preferredPage?.body ||
      `${project.designIntent} ${project.colorStory}`.trim() ||
      project.summary,
  };
}

function parseList(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseFieldItems(value: string): LookbookFieldItem[] {
  return parseList(value).map((line) => {
    const separatorIndex = line.indexOf(':');

    if (separatorIndex === -1) {
      return {
        label: line,
        value: '',
      };
    }

    return {
      label: line.slice(0, separatorIndex).trim(),
      value: line.slice(separatorIndex + 1).trim(),
    };
  });
}

function formatFieldItems(items: LookbookFieldItem[]) {
  return items.map((item) => `${item.label}: ${item.value}`).join('\n');
}

function createLookbookPageId(projectId: string) {
  return `lookbook-${projectId}-${Date.now().toString(36)}`;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function getTemplateGarmentStory(
  project: ApparelProject,
  pageBody: string | undefined,
  template: LookbookTemplate,
) {
  if (template === 'Technical Showcase') {
    return `${project.summary} The preview emphasizes construction intent, material roles, silhouette logic, and display-ready specifications.`;
  }

  if (template === 'Development Story') {
    return `${project.generalNotes} The current phase is ${project.phase.toLowerCase()}, with the garment moving at ${project.progress}% completion.`;
  }

  return pageBody || `${project.summary} ${project.designIntent}`;
}

function getTemplateStylingNotes(
  project: ApparelProject,
  template: LookbookTemplate,
) {
  if (template === 'Technical Showcase') {
    return [
      `Show the ${project.silhouette.toLowerCase()} in a clean front view.`,
      'Pair detail crops with material callouts and construction notes.',
      'Keep trims, closures, and proportion decisions visible.',
    ];
  }

  if (template === 'Development Story') {
    return [
      `Lead with the ${project.phase.toLowerCase()} milestone.`,
      'Use process details to show how the garment arrived at its current shape.',
      'Keep the next fit or construction question visible for studio review.',
    ];
  }

  return [
    `Style around the ${project.colorStory.toLowerCase()}`,
    `Frame the ${project.garmentType.toLowerCase()} as part of ${project.collection}.`,
    'Keep the garment dominant with quiet supporting material details.',
  ];
}

function getLookbookDetailPlaceholders(template: LookbookTemplate) {
  const shared = {
    'Development Story': [
      {
        className:
          'bg-[linear-gradient(145deg,rgba(154,108,60,0.8),rgba(10,10,10,0.62),rgba(200,155,60,0.34))]',
        description: 'Pattern, fitting, or build-progress crop.',
        label: 'Process Detail',
      },
      {
        className:
          'bg-[linear-gradient(145deg,rgba(45,92,107,0.82),rgba(10,10,10,0.62),rgba(27,58,99,0.58))]',
        description: 'Construction decision or sample note.',
        label: 'Studio Note',
      },
      {
        className:
          'bg-[linear-gradient(145deg,rgba(61,43,31,0.86),rgba(10,10,10,0.72),rgba(237,227,207,0.24))]',
        description: 'Next iteration or review target.',
        label: 'Revision Cue',
      },
    ],
    'Editorial Hero': [
      {
        className:
          'bg-[linear-gradient(145deg,rgba(200,155,60,0.58),rgba(10,10,10,0.68),rgba(27,58,99,0.68))]',
        description: 'Full garment mood or editorial lead frame.',
        label: 'Hero Crop',
      },
      {
        className:
          'bg-[linear-gradient(145deg,rgba(45,92,107,0.74),rgba(10,10,10,0.7),rgba(237,227,207,0.22))]',
        description: 'Texture, trim, or surface close-up.',
        label: 'Texture Detail',
      },
      {
        className:
          'bg-[linear-gradient(145deg,rgba(61,43,31,0.86),rgba(154,108,60,0.52),rgba(10,10,10,0.72))]',
        description: 'Movement, fit, or styling angle.',
        label: 'Styling Frame',
      },
    ],
    'Technical Showcase': [
      {
        className:
          'bg-[linear-gradient(145deg,rgba(27,58,99,0.82),rgba(10,10,10,0.68),rgba(45,92,107,0.5))]',
        description: 'Front, side, or flat technical view.',
        label: 'Spec View',
      },
      {
        className:
          'bg-[linear-gradient(145deg,rgba(237,227,207,0.4),rgba(10,10,10,0.66),rgba(154,108,60,0.54))]',
        description: 'Seam, closure, pocket, or finish close-up.',
        label: 'Build Detail',
      },
      {
        className:
          'bg-[linear-gradient(145deg,rgba(45,92,107,0.72),rgba(61,43,31,0.62),rgba(10,10,10,0.72))]',
        description: 'Material allocation or trim reference.',
        label: 'Material Callout',
      },
    ],
  } satisfies Record<
    LookbookTemplate,
    Array<{ className: string; description: string; label: string }>
  >;

  return shared[template];
}

const preferredPageType: Record<LookbookTemplate, string> = {
  'Development Story': 'Editorial',
  'Editorial Hero': 'Cover',
  'Technical Showcase': 'Detail',
};

const pageTypeByTemplate: Record<LookbookTemplate, LookbookPage['pageType']> = {
  'Development Story': 'Editorial',
  'Editorial Hero': 'Cover',
  'Technical Showcase': 'Detail',
};

const lookbookTemplateShell: Record<LookbookTemplate, string> = {
  'Development Story': 'bg-[linear-gradient(135deg,rgba(61,43,31,0.44),rgba(10,10,10,0.94),rgba(27,58,99,0.24))]',
  'Editorial Hero': 'bg-[linear-gradient(135deg,rgba(27,58,99,0.38),rgba(10,10,10,0.94),rgba(61,43,31,0.44))]',
  'Technical Showcase': 'bg-[linear-gradient(135deg,rgba(45,92,107,0.34),rgba(10,10,10,0.94),rgba(27,58,99,0.34))]',
};

const lookbookVisualClass: Record<LookbookTemplate, string> = {
  'Development Story':
    'bg-[linear-gradient(145deg,rgba(154,108,60,0.86),rgba(10,10,10,0.72),rgba(27,58,99,0.58))]',
  'Editorial Hero':
    'bg-[linear-gradient(145deg,rgba(200,155,60,0.46),rgba(10,10,10,0.76),rgba(27,58,99,0.86),rgba(61,43,31,0.72))]',
  'Technical Showcase':
    'bg-[linear-gradient(145deg,rgba(45,92,107,0.82),rgba(10,10,10,0.72),rgba(237,227,207,0.22))]',
};

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

function hasYardageWarning(
  allocation: LinkedMaterial,
  fabric: Fabric | undefined,
  allLinkedMaterials: LinkedMaterial[],
  projects: ApparelProject[],
) {
  if (!fabric) {
    return false;
  }

  return hasInsufficientYardage(
    allocation,
    calculateFabricYardage(fabric, allLinkedMaterials, projects),
  );
}

function formatYardage(value: number) {
  if (value === 0) {
    return 'N/A';
  }

  return `${formatNumber(value)} yd`;
}

function formatDate(date: string) {
  return formatStudioDate(date, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
  }).format(value);
}
