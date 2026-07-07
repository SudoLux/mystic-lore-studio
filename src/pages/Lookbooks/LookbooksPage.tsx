import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarDays,
  ChevronDown,
  Copy,
  Download,
  Film,
  FolderOpen,
  Layers3,
  Pencil,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { EditorialCollectionFormModal } from '../../components/lookbook/EditorialCollectionFormModal';
import { EditorialExportPanel } from '../../components/lookbook/EditorialExportPanel';
import { EditorialPosterArtwork } from '../../components/lookbook/EditorialPosterArtwork';
import { EditorialSceneBuilder } from '../../components/lookbook/EditorialSceneBuilder';
import { EditorialCollectionViewer } from '../../components/lookbook/EditorialCollectionViewer';
import { Badge } from '../../components/shared/Badge';
import { Button } from '../../components/shared/Button';
import { MobilePageHeader } from '../../components/shared/MobilePageHeader';
import { PageHeader } from '../../components/shared/PageHeader';
import { useStudioData } from '../../hooks/useStudioData';
import { cn } from '../../lib/classes';
import { formatStudioDate } from '../../lib/dates';
import { duplicateEditorialCollection } from '../../lib/editorialCollections';
import type { EditorialCollection } from '../../types/editorial';
import type { ApparelProject } from '../../types/studio';

type CollectionFormState =
  | { collection?: undefined; mode: 'create' }
  | { collection: EditorialCollection; mode: 'edit' };

export function LookbooksPage() {
  const {
    createEditorialCollection,
    data: { editorialCollections, fabrics, projects },
    deleteEditorialCollection,
    updateEditorialCollection,
  } = useStudioData();
  const [selectedProjectId, setSelectedProjectId] = useState(() =>
    chooseInitialProject(projects, editorialCollections),
  );
  const [formState, setFormState] = useState<CollectionFormState | null>(null);
  const [openCollection, setOpenCollection] = useState<EditorialCollection | null>(null);
  const [builderCollection, setBuilderCollection] = useState<EditorialCollection | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<EditorialCollection | null>(null);
  const [exportCollection, setExportCollection] = useState<EditorialCollection | null>(null);

  useEffect(() => {
    if (projects.some((project) => project.id === selectedProjectId)) return;
    setSelectedProjectId(chooseInitialProject(projects, editorialCollections));
  }, [editorialCollections, projects, selectedProjectId]);

  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const projectCollections = useMemo(
    () => editorialCollections
      .filter((collection) => collection.projectId === selectedProjectId)
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    [editorialCollections, selectedProjectId],
  );

  const openNewCollection = () => {
    if (selectedProject) setFormState({ mode: 'create' });
  };

  return (
    <div className="min-w-0">
      <MobilePageHeader
        action={
          <Button
            aria-label="New editorial collection"
            className="h-11 w-11 rounded-full p-0"
            disabled={!selectedProject}
            onClick={openNewCollection}
            variant="primary"
          >
            <Plus aria-hidden="true" size={19} />
          </Button>
        }
        badge="Editorial Studio"
        kicker="Project campaigns and presentation stories"
        title="Editorial Collections"
      />
      <PageHeader
        badge="Editorial Studio"
        description="Shape each garment into a campaign-ready visual story, scene by scene."
        title="Editorial Collections"
      >
        <Button
          disabled={!selectedProject}
          icon={<Plus aria-hidden="true" size={17} />}
          onClick={openNewCollection}
          variant="primary"
        >
          New Editorial Collection
        </Button>
      </PageHeader>

      {projects.length === 0 ? (
        <NoProjectsState />
      ) : (
        <>
          <ProjectContextBar
            collectionCount={projectCollections.length}
            onChange={setSelectedProjectId}
            projects={projects}
            selectedProject={selectedProject}
            selectedProjectId={selectedProjectId}
          />

          {projectCollections.length > 0 && selectedProject ? (
            <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3 2xl:grid-cols-4">
              {projectCollections.map((collection) => (
                <EditorialPosterCard
                  collection={collection}
                  key={collection.id}
                  onDelete={() => setDeleteCandidate(collection)}
                  onDuplicate={() => createEditorialCollection(
                    duplicateEditorialCollection(collection),
                  )}
                  onEdit={() => setBuilderCollection(collection)}
                  onEditDetails={() => setFormState({ collection, mode: 'edit' })}
                  onExport={() => setExportCollection(collection)}
                  onOpen={() => setOpenCollection(collection)}
                  project={selectedProject}
                />
              ))}
            </section>
          ) : selectedProject ? (
            <EmptyCollectionState onCreate={openNewCollection} project={selectedProject} />
          ) : null}
        </>
      )}

      {formState && selectedProject ? (
        <EditorialCollectionFormModal
          collection={formState.collection}
          mode={formState.mode}
          onClose={() => setFormState(null)}
          onSubmit={(collection) => {
            if (formState.mode === 'create') createEditorialCollection(collection);
            else updateEditorialCollection(collection);
            setFormState(null);
          }}
          project={selectedProject}
        />
      ) : null}

      {openCollection ? (
        <EditorialCollectionViewer
          collection={openCollection}
          fabrics={fabrics}
          onClose={() => setOpenCollection(null)}
          project={projects.find((project) => project.id === openCollection.projectId)}
        />
      ) : null}

      {builderCollection ? (
        <EditorialSceneBuilder
          collection={builderCollection}
          fabrics={fabrics}
          onClose={() => setBuilderCollection(null)}
          onSave={(collection) => {
            updateEditorialCollection(collection);
            setBuilderCollection(collection);
          }}
          project={projects.find((project) => project.id === builderCollection.projectId)}
        />
      ) : null}

      {exportCollection ? (
        <EditorialExportPanel
          collection={exportCollection}
          fabrics={fabrics}
          onClose={() => setExportCollection(null)}
          onPresent={() => setOpenCollection(exportCollection)}
          project={projects.find((project) => project.id === exportCollection.projectId)}
        />
      ) : null}

      {deleteCandidate ? (
        <DeleteCollectionDialog
          collection={deleteCandidate}
          onCancel={() => setDeleteCandidate(null)}
          onConfirm={() => {
            deleteEditorialCollection(deleteCandidate.id);
            setDeleteCandidate(null);
          }}
        />
      ) : null}
    </div>
  );
}

function ProjectContextBar({
  collectionCount,
  onChange,
  projects,
  selectedProject,
  selectedProjectId,
}: {
  collectionCount: number;
  onChange: (projectId: string) => void;
  projects: ApparelProject[];
  selectedProject?: ApparelProject;
  selectedProjectId: string;
}) {
  return (
    <section className="rounded-xl border border-bronze/28 bg-[linear-gradient(135deg,rgba(27,58,99,0.18),rgba(10,10,10,0.62),rgba(61,43,31,0.25))] p-3 shadow-[inset_0_1px_0_rgba(237,227,207,0.04)] sm:flex sm:items-center sm:justify-between sm:gap-5 sm:p-4">
      <div className="min-w-0">
        <p className="text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-ember">Project library</p>
        <p className="mt-1 truncate text-sm text-stardust/58">
          {selectedProject
            ? `${selectedProject.garmentType} · ${selectedProject.collection || selectedProject.season || 'Independent study'}`
            : 'Choose a project'}
        </p>
      </div>
      <div className="mt-3 flex items-center gap-3 sm:mt-0">
        <Badge className="shrink-0" variant="bronze">
          {collectionCount} {collectionCount === 1 ? 'collection' : 'collections'}
        </Badge>
        <label className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
          <span className="sr-only">Choose project</span>
          <select
            className="h-11 w-full appearance-none rounded-xl border border-bronze/34 bg-midnight/68 pl-3 pr-10 text-sm text-stardust outline-none transition focus:border-ember/60"
            onChange={(event) => onChange(event.target.value)}
            value={selectedProjectId}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stardust/45" size={17} />
        </label>
      </div>
    </section>
  );
}

function EditorialPosterCard({
  collection,
  onDelete,
  onDuplicate,
  onEdit,
  onEditDetails,
  onExport,
  onOpen,
  project,
}: {
  collection: EditorialCollection;
  onDelete: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
  onEditDetails: () => void;
  onExport: () => void;
  onOpen: () => void;
  project: ApparelProject;
}) {
  return (
    <article className="group overflow-hidden rounded-xl border border-bronze/30 bg-[linear-gradient(155deg,rgba(25,25,25,0.94),rgba(10,10,10,0.98))] shadow-[0_20px_52px_rgba(0,0,0,0.34)] transition duration-300 hover:-translate-y-1 hover:border-ember/52 hover:shadow-[0_28px_70px_rgba(0,0,0,0.48),0_0_30px_rgba(200,155,60,0.08)]">
      <div className="relative aspect-[3/4] overflow-hidden">
        <EditorialPosterArtwork collection={collection} project={project}>
          <div className="mt-4 flex items-center gap-2 text-[0.7rem] text-[var(--poster-muted)]">
            <CalendarDays aria-hidden="true" size={13} />
            Updated {formatStudioDate(collection.updatedAt, { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </EditorialPosterArtwork>
        <div className="absolute right-3 top-3 z-20">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-stardust/18 bg-midnight/72 px-2.5 py-1 text-[0.68rem] text-stardust/76 backdrop-blur-xl">
            <Film aria-hidden="true" size={12} />
            {collection.scenes.length}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 border-t border-bronze/22 p-2.5">
        <Button
          className="mr-auto min-h-10 px-3"
          icon={<FolderOpen aria-hidden="true" size={16} />}
          onClick={onOpen}
          size="sm"
          variant="secondary"
        >
          Open
        </Button>
        <PosterAction icon={<Pencil size={16} />} label="Edit scenes" onClick={onEdit} />
        <PosterAction icon={<Settings2 size={16} />} label="Edit collection details" onClick={onEditDetails} />
        <PosterAction icon={<Download size={16} />} label="Export collection" onClick={onExport} />
        <PosterAction icon={<Copy size={16} />} label="Duplicate collection" onClick={onDuplicate} />
        <PosterAction danger icon={<Trash2 size={16} />} label="Delete collection" onClick={onDelete} />
      </div>
    </article>
  );
}

function PosterAction({
  danger = false,
  icon,
  label,
  onClick,
}: {
  danger?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-xl border border-transparent transition hover:border-bronze/30 hover:bg-stardust/[0.06] hover:text-stardust',
        danger ? 'text-stardust/42 hover:text-red-300' : 'text-stardust/52',
      )}
      onClick={onClick}
      title={label}
      type="button"
    >
      {icon}
    </button>
  );
}

function EmptyCollectionState({
  onCreate,
  project,
}: {
  onCreate: () => void;
  project: ApparelProject;
}) {
  return (
    <section className="relative mt-5 overflow-hidden rounded-xl border border-bronze/28 bg-[radial-gradient(circle_at_75%_30%,rgba(45,92,107,0.23),transparent_30%),radial-gradient(circle_at_20%_75%,rgba(200,155,60,0.15),transparent_28%),rgba(10,10,10,0.72)] px-5 py-14 text-center sm:px-8 sm:py-20">
      <div className="absolute inset-0 opacity-[0.15] [background-image:linear-gradient(rgba(237,227,207,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(237,227,207,.08)_1px,transparent_1px)] [background-size:38px_38px]" />
      <div className="relative mx-auto max-w-xl">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-ember/42 bg-ember/10 text-ember shadow-[0_0_38px_rgba(200,155,60,0.12)]">
          <Sparkles aria-hidden="true" size={23} />
        </span>
        <h2 className="font-display mt-6 text-2xl leading-tight text-stardust">Stage the story of {project.name}</h2>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-stardust/58 sm:text-base sm:leading-7">
          Editorial Collections turn a garment project into a sequence of campaign scenes, design details, and presentation-ready narrative.
        </p>
        <Button className="mt-7" icon={<Plus size={17} />} onClick={onCreate} variant="primary">
          Create First Collection
        </Button>
      </div>
    </section>
  );
}

function NoProjectsState() {
  return (
    <section className="rounded-xl border border-bronze/28 bg-midnight/48 px-5 py-14 text-center">
      <Layers3 className="mx-auto text-ember" size={28} />
      <h2 className="font-display mt-5 text-xl">A garment comes first</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-stardust/56">
        Add a project before building its Editorial Collection. The collection will stay connected to that garment’s story and imagery.
      </p>
    </section>
  );
}

function DeleteCollectionDialog({
  collection,
  onCancel,
  onConfirm,
}: {
  collection: EditorialCollection;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-midnight/82 p-4 backdrop-blur-xl">
      <section aria-modal="true" className="w-full max-w-md rounded-xl border border-bronze/36 bg-[linear-gradient(145deg,#15191c,#0a0a0a_56%,#23170f)] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.72)]" role="alertdialog">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-300/24 bg-red-300/8 text-red-200">
          <Trash2 size={20} />
        </span>
        <h2 className="font-display mt-5 text-xl">Delete this collection?</h2>
        <p className="mt-3 text-sm leading-6 text-stardust/58">
          “{collection.title}” and its {collection.scenes.length} scene records will be removed from this device. The garment project is not affected.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button onClick={onCancel} variant="ghost">Cancel</Button>
          <Button className="border-red-300/30 bg-red-300/10 text-red-100" onClick={onConfirm}>Delete</Button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

function chooseInitialProject(
  projects: ApparelProject[],
  collections: EditorialCollection[],
) {
  const mostRecentCollection = [...collections].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  )[0];
  return mostRecentCollection?.projectId ?? projects[0]?.id ?? '';
}
