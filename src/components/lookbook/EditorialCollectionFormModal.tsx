import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, Image as ImageIcon, Layers3, RotateCcw, Sparkles, X } from 'lucide-react';
import { cn } from '../../lib/classes';
import {
  createEditorialScenes,
  editorialTemplateOptions,
  editorialTemplateStructure,
  normalizeEditorialTemplateType,
} from '../../lib/editorialCollections';
import {
  editorialThemeOptions,
  normalizeEditorialThemeId,
  resolveEditorialTheme,
} from '../../lib/editorialThemes';
import type { EditorialCollection, EditorialTemplateType } from '../../types/editorial';
import type { ApparelProject, LocalImageAsset } from '../../types/studio';
import { AdaptiveProjectImage } from '../projects/AdaptiveProjectImage';
import { Badge } from '../shared/Badge';
import { Button } from '../shared/Button';
import { EditorialPosterArtwork } from './EditorialPosterArtwork';

type EditorialCollectionFormModalProps = {
  collection?: EditorialCollection;
  mode: 'create' | 'edit';
  onClose: () => void;
  onSubmit: (collection: EditorialCollection) => void;
  project: ApparelProject;
};

type EditorTab = 'poster' | 'style';

export function EditorialCollectionFormModal({
  collection,
  mode,
  onClose,
  onSubmit,
  project,
}: EditorialCollectionFormModalProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>('poster');
  const [title, setTitle] = useState(collection?.title ?? project.name);
  const [subtitle, setSubtitle] = useState(collection?.subtitle ?? project.collection ?? project.season ?? '');
  const [description, setDescription] = useState(collection?.description ?? project.designIntent ?? project.summary);
  const [coverLabel, setCoverLabel] = useState(collection?.coverLabel ?? '');
  const [coverAccentColor, setCoverAccentColor] = useState(collection?.coverAccentColor ?? '');
  const [coverImageFit, setCoverImageFit] = useState<'cover' | 'contain'>(collection?.coverImageFit ?? 'cover');
  const [templateType, setTemplateType] = useState<EditorialTemplateType>(normalizeEditorialTemplateType(collection?.templateType));
  const [themeId, setThemeId] = useState(normalizeEditorialThemeId(collection?.themeId));
  const [coverImageUrl, setCoverImageUrl] = useState(collection?.coverImageUrl ?? '');
  const projectImages = [project.heroImage, ...(project.galleryImages ?? [])]
    .filter((image): image is LocalImageAsset => Boolean(image))
    .filter((image, index, images) => images.findIndex((item) => item.id === image.id) === index);
  const [selectedProjectImageId, setSelectedProjectImageId] = useState<string | undefined>(
    collection?.coverImageUrl ? undefined : collection?.coverImageId ?? project.heroImage?.id,
  );
  const theme = resolveEditorialTheme(themeId);
  const accentIsValid = !coverAccentColor.trim() || /^#[0-9a-f]{6}$/i.test(coverAccentColor.trim());
  const colorPickerValue = accentIsValid && coverAccentColor.trim() ? coverAccentColor.trim() : theme.colors.accent;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const previewCollection: EditorialCollection = {
    coverAccentColor: accentIsValid ? coverAccentColor.trim() || undefined : undefined,
    coverImageFit,
    coverImageId: selectedProjectImageId,
    coverImageUrl: selectedProjectImageId ? undefined : coverImageUrl.trim() || undefined,
    coverLabel: coverLabel.trim() || undefined,
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
    if (!title.trim() || !accentIsValid) return;
    const timestamp = new Date().toISOString();
    const id = collection?.id ?? `editorial-collection-${crypto.randomUUID()}`;

    onSubmit({
      coverAccentColor: coverAccentColor.trim() || undefined,
      coverImageFit,
      coverImageId: selectedProjectImageId,
      coverImageUrl: selectedProjectImageId ? undefined : coverImageUrl.trim() || undefined,
      coverLabel: coverLabel.trim() || undefined,
      createdAt: collection?.createdAt ?? timestamp,
      description: description.trim(),
      id,
      projectId: project.id,
      scenes: collection?.scenes.length ? collection.scenes : createEditorialScenes(id, templateType, timestamp),
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
              {mode === 'create' ? 'New Editorial Collection' : 'Edit Poster Cover'}
            </h2>
            <p className="mt-1 text-sm text-stardust/54">For {project.name}</p>
          </div>
          <button aria-label="Close collection editor" className="flex h-11 w-11 items-center justify-center rounded-xl border border-bronze/28 bg-midnight/44 text-stardust/64 transition hover:border-ember/45 hover:text-stardust" onClick={onClose} type="button">
            <X aria-hidden="true" size={19} />
          </button>
        </header>

        <nav aria-label="Collection editor sections" className="grid grid-cols-2 border-b border-bronze/22 bg-midnight/30 px-4 pt-3 sm:px-6">
          <TabButton active={activeTab === 'poster'} icon={<ImageIcon size={16} />} label="Poster Cover" onClick={() => setActiveTab('poster')} />
          <TabButton active={activeTab === 'style'} icon={<Layers3 size={16} />} label="Collection Style" onClick={() => setActiveTab('style')} />
        </nav>

        <form className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[minmax(0,1fr)_auto]" onSubmit={handleSubmit}>
          <div className="studio-scrollbar min-h-0 flex-1 space-y-7 overflow-y-auto px-4 py-5 sm:px-6">
            <div className="mx-auto mb-7 aspect-[3/4] w-full max-w-[18rem] overflow-hidden rounded-xl border border-bronze/35 shadow-[0_22px_55px_rgba(0,0,0,.46)] lg:hidden">
              <EditorialPosterArtwork collection={previewCollection} project={project} variant="preview" />
            </div>

            {activeTab === 'poster' ? (
              <>
                <section>
                  <p className="field-label">Poster typography</p>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <span className="field-label">Title</span>
                      <input autoFocus className="editorial-input" onChange={(event) => setTitle(event.target.value)} placeholder="Collection title" required value={title} />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="field-label">Subtitle</span>
                      <input className="editorial-input" onChange={(event) => setSubtitle(event.target.value)} placeholder="Campaign line, season, or collection" value={subtitle} />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="field-label">Description</span>
                      <textarea className="editorial-input min-h-28 resize-y py-3" onChange={(event) => setDescription(event.target.value)} placeholder="Set the editorial direction and story." value={description} />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="field-label">Cover label</span>
                      <input className="editorial-input" maxLength={32} onChange={(event) => setCoverLabel(event.target.value)} placeholder="Uses template label when empty" value={coverLabel} />
                      <span className="mt-2 block text-xs text-stardust/42">A short poster badge. This does not change the collection template.</span>
                    </label>
                  </div>
                </section>

                <section>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="field-label">Poster accent</p>
                      <p className="mt-1 text-xs text-stardust/44">Applies to cover rules, labels, and highlights only.</p>
                    </div>
                    <button className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-xs text-stardust/58 transition hover:text-stardust" onClick={() => setCoverAccentColor('')} type="button">
                      <RotateCcw size={14} /> Reset to Theme
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-[3.25rem_minmax(0,1fr)] gap-3">
                    <label className="relative h-[3.25rem] overflow-hidden rounded-xl border border-bronze/34 bg-midnight/54">
                      <span className="sr-only">Choose accent color</span>
                      <input className="absolute inset-0 h-full w-full cursor-pointer opacity-0" onChange={(event) => setCoverAccentColor(event.target.value)} type="color" value={colorPickerValue} />
                      <span className="absolute inset-2 rounded-lg border border-stardust/20" style={{ backgroundColor: colorPickerValue }} />
                    </label>
                    <label>
                      <span className="sr-only">Accent hex value</span>
                      <input className={cn('editorial-input uppercase', !accentIsValid && 'border-red-400/65')} maxLength={7} onChange={(event) => setCoverAccentColor(event.target.value)} placeholder={theme.colors.accent.toUpperCase()} value={coverAccentColor} />
                    </label>
                  </div>
                  {!accentIsValid ? <p className="mt-2 text-xs text-red-300">Enter a six-digit hex color such as #C89B3C.</p> : null}
                </section>

                <section>
                  <p className="field-label">Cover image</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    <button className={cn('relative aspect-[3/4] overflow-hidden rounded-xl border bg-[linear-gradient(145deg,rgba(27,58,99,.38),rgba(10,10,10,.92),rgba(154,108,60,.28))] transition', !selectedProjectImageId && !coverImageUrl.trim() ? 'border-ember/68 shadow-[0_0_24px_rgba(200,155,60,.12)]' : 'border-bronze/24 hover:border-bronze/50')} onClick={() => { setSelectedProjectImageId(undefined); setCoverImageUrl(''); }} type="button">
                      <Sparkles className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-ember" size={19} />
                      <span className="absolute inset-x-1 bottom-2 text-[0.58rem] uppercase tracking-[0.12em] text-stardust/62">Theme</span>
                    </button>
                    {projectImages.map((image, index) => (
                      <button aria-label={`Use project image ${index + 1} as cover`} className={cn('relative aspect-[3/4] overflow-hidden rounded-xl border bg-midnight transition', selectedProjectImageId === image.id ? 'border-ember/70 shadow-[0_0_24px_rgba(200,155,60,.16)]' : 'border-bronze/24 hover:border-bronze/52')} key={image.id} onClick={() => { setSelectedProjectImageId(image.id); setCoverImageUrl(''); }} type="button">
                        <AdaptiveProjectImage asset={image} className="absolute inset-0" mode="thumbnail" />
                        <span className="absolute inset-x-0 bottom-0 bg-midnight/76 px-1 py-1.5 text-[0.56rem] uppercase tracking-[0.1em] text-stardust/78 backdrop-blur-md">{image.id === project.heroImage?.id ? 'Hero' : `Gallery ${index + 1}`}</span>
                        {selectedProjectImageId === image.id ? <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ember text-midnight"><Check size={13} strokeWidth={2.5} /></span> : null}
                      </button>
                    ))}
                  </div>
                  <label className="mt-4 block">
                    <span className="field-label">Or external image URL</span>
                    <input className="editorial-input" onChange={(event) => { setCoverImageUrl(event.target.value); if (event.target.value) setSelectedProjectImageId(undefined); }} placeholder="https://..." type="url" value={coverImageUrl} />
                  </label>
                  <div className="mt-4 grid grid-cols-2 rounded-xl border border-bronze/28 bg-midnight/44 p-1">
                    <FitButton active={coverImageFit === 'cover'} label="Fill Poster" onClick={() => setCoverImageFit('cover')} />
                    <FitButton active={coverImageFit === 'contain'} label="Fit Entire Image" onClick={() => setCoverImageFit('contain')} />
                  </div>
                </section>
              </>
            ) : (
              <>
                <section>
                  <p className="field-label">Canonical template</p>
                  <p className="mt-1 text-xs leading-5 text-stardust/44">Changes the collection identity label only. Existing scenes remain intact.</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {editorialTemplateOptions.map((option) => {
                      const selected = templateType === option.value;
                      const structure = editorialTemplateStructure(option.value);
                      return (
                        <button className={cn('min-h-24 rounded-xl border p-4 text-left transition', selected ? 'border-ember/66 bg-ember/12 shadow-[0_12px_34px_rgba(200,155,60,0.1)]' : 'border-bronze/24 bg-midnight/34 hover:border-bronze/50')} key={option.value} onClick={() => setTemplateType(option.value)} type="button">
                          <span className="flex items-center justify-between gap-3 font-semibold">{option.label}{selected ? <Check className="text-ember" size={17} /> : null}</span>
                          <span className="mt-2 block text-xs leading-5 text-stardust/50">{option.description}</span>
                          <span className="mt-3 block text-[0.6rem] uppercase tracking-[0.14em] text-ember/72">{structure.sceneCount} {structure.sceneCount === 1 ? 'cover scene' : 'scenes'}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
                <section>
                  <p className="field-label">Visual theme</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {editorialThemeOptions.map((option) => (
                      <button className={cn('rounded-xl border p-3 text-left transition', themeId === option.value ? 'border-ember/66 bg-ember/12 text-stardust shadow-[0_12px_34px_rgba(200,155,60,.10)]' : 'border-bronze/26 bg-midnight/36 text-stardust/62 hover:border-bronze/48')} key={option.value} onClick={() => setThemeId(option.value)} type="button">
                        <span className="flex items-center justify-between gap-3"><span className="font-semibold">{option.label}</span><span className="flex gap-1.5" aria-hidden="true">{[option.background, option.accent, option.text].map((color) => <span className="h-4 w-4 rounded-full border border-stardust/20" key={color} style={{ backgroundColor: color }} />)}</span></span>
                        <span className="mt-2 block text-xs leading-5 text-stardust/48">{option.description}</span>
                        <span className="mt-3 block text-[0.58rem] uppercase tracking-[0.13em] text-ember/72">{option.spacing} spacing · {option.transition}</span>
                      </button>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>

          <aside className="hidden min-h-0 overflow-y-auto border-l border-bronze/20 bg-midnight/22 p-5 lg:block">
            <p className="field-label">Live poster preview</p>
            <div className="mt-4 aspect-[3/4] overflow-hidden rounded-xl border border-bronze/35 shadow-[0_26px_60px_rgba(0,0,0,0.5)]">
              <EditorialPosterArtwork collection={previewCollection} project={project} variant="preview" />
            </div>
            <p className="mt-4 text-xs leading-5 text-stardust/42">Your library poster and viewer cover use this same artwork system.</p>
          </aside>

          <footer className="col-span-full flex shrink-0 items-center justify-end gap-3 border-t border-bronze/24 bg-midnight/92 px-4 py-3 backdrop-blur-2xl sm:px-6">
            <Button onClick={onClose} variant="ghost">Cancel</Button>
            <Button disabled={!title.trim() || !accentIsValid} type="submit" variant="primary">{mode === 'create' ? 'Create Editorial Collection' : 'Save Changes'}</Button>
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  );
}

function TabButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return <button aria-current={active ? 'page' : undefined} className={cn('flex min-h-12 items-center justify-center gap-2 border-b-2 px-3 text-sm font-semibold transition', active ? 'border-ember text-stardust' : 'border-transparent text-stardust/48 hover:text-stardust/78')} onClick={onClick} type="button">{icon}{label}</button>;
}

function FitButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button className={cn('min-h-11 rounded-lg px-3 text-sm font-semibold transition', active ? 'bg-ember text-midnight shadow-[0_8px_22px_rgba(200,155,60,.18)]' : 'text-stardust/58 hover:text-stardust')} onClick={onClick} type="button">{label}</button>;
}
