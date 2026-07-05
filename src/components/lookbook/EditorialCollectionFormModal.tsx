import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, Image as ImageIcon, Layers3, Sparkles, X } from 'lucide-react';
import { cn } from '../../lib/classes';
import {
  createEditorialScenes,
  editorialTemplateOptions,
  editorialTemplateStructure,
  editorialThemeOptions,
  normalizeEditorialTemplateType,
} from '../../lib/editorialCollections';
import type {
  EditorialCollection,
  EditorialTemplateType,
} from '../../types/editorial';
import type { ApparelProject, LocalImageAsset } from '../../types/studio';
import { Badge } from '../shared/Badge';
import { Button } from '../shared/Button';
import { EditorialCollectionCover } from './EditorialCollectionCover';
import { AdaptiveProjectImage } from '../projects/AdaptiveProjectImage';

type EditorialCollectionFormModalProps = {
  collection?: EditorialCollection;
  mode: 'create' | 'edit';
  onClose: () => void;
  onSubmit: (collection: EditorialCollection) => void;
  project: ApparelProject;
};

export function EditorialCollectionFormModal({
  collection,
  mode,
  onClose,
  onSubmit,
  project,
}: EditorialCollectionFormModalProps) {
  const [title, setTitle] = useState(collection?.title ?? project.name);
  const [subtitle, setSubtitle] = useState(
    collection?.subtitle ?? project.collection ?? project.season ?? '',
  );
  const [description, setDescription] = useState(
    collection?.description ?? project.designIntent ?? project.summary,
  );
  const [templateType, setTemplateType] = useState<EditorialTemplateType>(
    normalizeEditorialTemplateType(collection?.templateType),
  );
  const [themeId, setThemeId] = useState(
    collection?.themeId ?? 'midnight-atelier',
  );
  const [coverImageUrl, setCoverImageUrl] = useState(
    collection?.coverImageUrl ?? '',
  );
  const projectImages = [project.heroImage, ...(project.galleryImages ?? [])]
    .filter((image): image is LocalImageAsset => Boolean(image))
    .filter((image, index, images) => images.findIndex((item) => item.id === image.id) === index);
  const [selectedProjectImageId, setSelectedProjectImageId] = useState<string | undefined>(
    collection?.coverImageUrl
      ? undefined
      : collection?.coverImageId ?? project.heroImage?.id,
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const previewCollection: EditorialCollection = {
    coverImageId: selectedProjectImageId,
    coverImageUrl: selectedProjectImageId ? undefined : coverImageUrl.trim() || undefined,
    createdAt: collection?.createdAt ?? new Date().toISOString(),
    description,
    id: collection?.id ?? 'editorial-preview',
    projectId: project.id,
    scenes: collection?.scenes ?? [],
    subtitle,
    templateType,
    themeId,
    title: title || 'Untitled Collection',
    updatedAt: new Date().toISOString(),
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const timestamp = new Date().toISOString();
    const id = collection?.id ?? `editorial-collection-${crypto.randomUUID()}`;

    onSubmit({
      coverImageId: selectedProjectImageId,
      coverImageUrl: selectedProjectImageId ? undefined : coverImageUrl.trim() || undefined,
      createdAt: collection?.createdAt ?? timestamp,
      description: description.trim(),
      id,
      projectId: project.id,
      scenes: collection?.scenes.length
        ? collection.scenes
        : createEditorialScenes(id, templateType, timestamp),
      subtitle: subtitle.trim(),
      templateType,
      themeId,
      title: title.trim(),
      updatedAt: timestamp,
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[140] overflow-y-auto bg-midnight/84 p-0 backdrop-blur-2xl sm:p-5">
      <section
        aria-labelledby="editorial-form-title"
        aria-modal="true"
        className="mx-auto flex h-dvh w-full max-w-6xl flex-col overflow-hidden border-bronze/32 bg-[linear-gradient(145deg,rgba(22,27,31,0.99),rgba(10,10,10,0.99)_48%,rgba(35,23,15,0.98))] text-stardust shadow-[0_36px_120px_rgba(0,0,0,0.72)] sm:h-auto sm:max-h-[calc(100dvh-2.5rem)] sm:rounded-[1.75rem] sm:border"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-bronze/22 px-4 py-4 sm:px-6 sm:py-5">
          <div>
            <Badge variant="ember">Editorial Studio</Badge>
            <h2 className="font-display mt-3 text-xl leading-tight sm:text-2xl" id="editorial-form-title">
              {mode === 'create' ? 'New Editorial Collection' : 'Edit Collection'}
            </h2>
            <p className="mt-1 text-sm text-stardust/54">For {project.name}</p>
          </div>
          <button
            aria-label="Close collection editor"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-bronze/28 bg-midnight/44 text-stardust/64 transition hover:border-ember/45 hover:text-stardust"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={19} />
          </button>
        </header>

        <form className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[minmax(0,1fr)_auto]" onSubmit={handleSubmit}>
          <div className="studio-scrollbar min-h-0 flex-1 space-y-7 overflow-y-auto px-4 py-5 sm:px-6">
            <FormSection label="Collection identity" icon={<Layers3 size={16} />}>
              <label className="block">
                <span className="field-label">Title</span>
                <input
                  autoFocus
                  className="editorial-input"
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Collection title"
                  required
                  value={title}
                />
              </label>
              <label className="block">
                <span className="field-label">Subtitle</span>
                <input
                  className="editorial-input"
                  onChange={(event) => setSubtitle(event.target.value)}
                  placeholder="Campaign line, season, or collection"
                  value={subtitle}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="field-label">Description</span>
                <textarea
                  className="editorial-input min-h-28 resize-y py-3"
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Set the editorial direction and story."
                  value={description}
                />
              </label>
            </FormSection>

            <section>
              <p className="field-label">Template</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {editorialTemplateOptions.map((option) => {
                  const selected = templateType === option.value;
                  const structure = editorialTemplateStructure(option.value);
                  return (
                    <button
                      className={cn(
                        'min-h-24 rounded-xl border p-4 text-left transition',
                        selected
                          ? 'border-ember/66 bg-ember/12 shadow-[0_12px_34px_rgba(200,155,60,0.1)]'
                          : 'border-bronze/24 bg-midnight/34 hover:border-bronze/50',
                      )}
                      key={option.value}
                      onClick={() => setTemplateType(option.value)}
                      type="button"
                    >
                      <span className="flex items-center justify-between gap-3 font-semibold">
                        {option.label}
                        {selected ? <Check className="text-ember" size={17} /> : null}
                      </span>
                      <span className="mt-2 block text-xs leading-5 text-stardust/50">
                        {option.description}
                      </span>
                      <span className="mt-3 block text-[0.6rem] uppercase tracking-[0.14em] text-ember/72">
                        {structure.sceneCount} {structure.sceneCount === 1 ? 'cover scene' : 'scenes'}
                        {structure.blockCount > 0 ? ` · ${structure.blockCount} starter blocks` : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <p className="field-label">Visual theme</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {editorialThemeOptions.map((option) => (
                  <button
                    className={cn(
                      'min-h-11 rounded-full border px-4 text-sm transition',
                      themeId === option.value
                        ? 'border-ember/66 bg-ember/14 text-stardust'
                        : 'border-bronze/26 bg-midnight/36 text-stardust/62 hover:border-bronze/48',
                    )}
                    key={option.value}
                    onClick={() => setThemeId(option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>

            <FormSection label="Cover treatment" icon={<ImageIcon size={16} />}>
              <div className="sm:col-span-2">
                <p className="field-label">Project images</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  <button
                    className={cn(
                      'relative aspect-[3/4] overflow-hidden rounded-xl border bg-[linear-gradient(145deg,rgba(27,58,99,.38),rgba(10,10,10,.92),rgba(154,108,60,.28))] transition',
                      !selectedProjectImageId && !coverImageUrl.trim()
                        ? 'border-ember/68 shadow-[0_0_24px_rgba(200,155,60,.12)]'
                        : 'border-bronze/24 hover:border-bronze/50',
                    )}
                    onClick={() => {
                      setSelectedProjectImageId(undefined);
                      setCoverImageUrl('');
                    }}
                    type="button"
                  >
                    <Sparkles className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-ember" size={19} />
                    <span className="absolute inset-x-1 bottom-2 text-[0.58rem] uppercase tracking-[0.12em] text-stardust/62">Gradient</span>
                  </button>
                  {projectImages.map((image, index) => (
                    <button
                      aria-label={`Use ${index === 0 && image.id === project.heroImage?.id ? 'project hero' : `project image ${index + 1}`} as cover`}
                      className={cn(
                        'relative aspect-[3/4] overflow-hidden rounded-xl border bg-midnight transition',
                        selectedProjectImageId === image.id
                          ? 'border-ember/70 shadow-[0_0_24px_rgba(200,155,60,.16)]'
                          : 'border-bronze/24 hover:border-bronze/52',
                      )}
                      key={image.id}
                      onClick={() => {
                        setSelectedProjectImageId(image.id);
                        setCoverImageUrl('');
                      }}
                      type="button"
                    >
                      <AdaptiveProjectImage asset={image} className="absolute inset-0" mode="thumbnail" />
                      <span className="absolute inset-x-0 bottom-0 bg-midnight/76 px-1 py-1.5 text-[0.56rem] uppercase tracking-[0.1em] text-stardust/78 backdrop-blur-md">
                        {index === 0 && image.id === project.heroImage?.id ? 'Hero' : `Gallery ${index + 1}`}
                      </span>
                      {selectedProjectImageId === image.id ? (
                        <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ember text-midnight">
                          <Check size={13} strokeWidth={2.5} />
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
                {projectImages.length === 0 ? (
                  <p className="mt-2 text-xs leading-5 text-stardust/42">No project images yet. Use the editorial gradient or add a cover URL.</p>
                ) : null}
              </div>
              <label className="block sm:col-span-2">
                <span className="field-label">Or external cover URL</span>
                <input
                  className="editorial-input"
                  onChange={(event) => {
                    setCoverImageUrl(event.target.value);
                    if (event.target.value) setSelectedProjectImageId(undefined);
                  }}
                  placeholder="https://..."
                  type="url"
                  value={coverImageUrl}
                />
              </label>
            </FormSection>
          </div>

          <aside className="hidden min-h-0 overflow-y-auto border-l border-bronze/20 bg-midnight/22 p-5 lg:block">
            <p className="field-label">Poster preview</p>
            <div className="relative mt-4 aspect-[3/4] overflow-hidden rounded-xl border border-bronze/35 shadow-[0_26px_60px_rgba(0,0,0,0.5)]">
              <EditorialCollectionCover collection={previewCollection} project={project} />
              <div className="absolute inset-x-0 bottom-0 z-10 p-5">
                <p className="text-[0.65rem] uppercase tracking-[0.22em] text-ember">Mystic Lore Editorial</p>
                <h3 className="font-display mt-3 text-2xl leading-tight">{previewCollection.title}</h3>
                <p className="mt-2 text-sm text-stardust/65">{previewCollection.subtitle || project.garmentType}</p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-stardust/42">
              Existing scenes remain intact when a collection’s template styling changes.
            </p>
          </aside>

          <footer className="col-span-full flex shrink-0 items-center justify-end gap-3 border-t border-bronze/24 bg-midnight/92 px-4 py-3 backdrop-blur-2xl sm:px-6">
            <Button onClick={onClose} variant="ghost">Cancel</Button>
            <Button disabled={!title.trim()} type="submit" variant="primary">
              {mode === 'create' ? 'Create Editorial Collection' : 'Save Changes'}
            </Button>
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  );
}

function FormSection({
  children,
  icon,
  label,
}: {
  children: ReactNode;
  icon: ReactNode;
  label: string;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 text-ember">
        {icon}
        <p className="field-label !mb-0 !text-ember">{label}</p>
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
