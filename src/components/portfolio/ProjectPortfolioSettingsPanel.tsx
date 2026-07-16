import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Link2,
  Save,
  Sparkles,
  X,
} from 'lucide-react';
import { cn } from '../../lib/classes';
import {
  buildPublicPortfolioUrl,
  ensureUniquePortfolioSlug,
  getPortfolioProjectTitle,
  getSafePortfolioSettings,
  slugifyPortfolioValue,
} from '../../utils/portfolioUtils';
import type { EditorialCollection } from '../../types/editorial';
import type {
  PortfolioProjectSettingsPatch,
  PortfolioVisibleSections,
} from '../../types/portfolio';
import type { ApparelProject, LinkedMaterial } from '../../types/studio';
import { EditorialCollectionCover } from '../lookbook/EditorialCollectionCover';
import { AdaptiveProjectImage } from '../projects/AdaptiveProjectImage';
import { Button } from '../shared/Button';
import { StoredImage } from '../shared/StoredImage';
import { getProjectPortfolioAssets } from './portfolioProjectAssets';
import { formatStudioDate } from '../../lib/dates';

type ProjectPortfolioSettingsPanelProps = {
  editorialCollections: EditorialCollection[];
  existingProjectSlugs: string[];
  linkedMaterials: LinkedMaterial[];
  onClose: () => void;
  onSave: (patch: PortfolioProjectSettingsPatch) => void;
  project: ApparelProject;
  projects: ApparelProject[];
  usernameSlug: string;
};

type ProjectPortfolioDraft = {
  attachedEditorialCollectionIds: string[];
  portfolioChallenge: string;
  customPortfolioDescription: string;
  customPortfolioTitle: string;
  featuredPortfolioImageIds: string[];
  isPublic: boolean;
  portfolioCoverImageId: string;
  portfolioOutcome: string;
  portfolioOverview: string;
  portfolioProcessSummary: string;
  portfolioRole: string;
  portfolioSkills: string[];
  portfolioSlug: string;
  portfolioSolution: string;
  portfolioTools: string[];
  visibleSections: PortfolioVisibleSections;
};

const SECTION_OPTIONS: Array<{
  description: string;
  key: keyof PortfolioVisibleSections;
  label: string;
}> = [
  { description: 'Project introduction and design intent.', key: 'overview', label: 'Overview' },
  { description: 'Selected project photography.', key: 'gallery', label: 'Gallery' },
  { description: 'Linked fabrics and material choices.', key: 'materials', label: 'Materials' },
  { description: 'Craft and technical capabilities.', key: 'skills', label: 'Skills' },
  { description: 'Development and construction story.', key: 'process', label: 'Process' },
  { description: 'Curated development notes.', key: 'notes', label: 'Notes' },
  { description: 'Attached editorial presentations.', key: 'editorials', label: 'Editorials' },
  { description: 'Public files and recruiter downloads.', key: 'downloads', label: 'Downloads' },
];

export function ProjectPortfolioSettingsPanel({
  editorialCollections,
  existingProjectSlugs,
  linkedMaterials,
  onClose,
  onSave,
  project,
  projects,
  usernameSlug,
}: ProjectPortfolioSettingsPanelProps) {
  const settings = getSafePortfolioSettings(project);
  const assets = useMemo(() => getProjectPortfolioAssets(project), [project]);
  const editorialOptions = useMemo(
    () => editorialCollections
      .map((collection) => ({
        collection,
        sourceProject: projects.find((candidate) => candidate.id === collection.projectId),
      }))
      .sort((left, right) => {
        const leftOwnsCollection = left.collection.projectId === project.id;
        const rightOwnsCollection = right.collection.projectId === project.id;
        if (leftOwnsCollection !== rightOwnsCollection) return leftOwnsCollection ? -1 : 1;
        return Date.parse(right.collection.updatedAt || '') - Date.parse(left.collection.updatedAt || '');
      }),
    [editorialCollections, project.id, projects],
  );
  const [draft, setDraft] = useState<ProjectPortfolioDraft>(() => ({
    attachedEditorialCollectionIds: [...settings.attachedEditorialCollectionIds],
    portfolioChallenge: settings.portfolioChallenge ?? '',
    customPortfolioDescription: settings.customPortfolioDescription ?? '',
    customPortfolioTitle: settings.customPortfolioTitle ?? '',
    featuredPortfolioImageIds: [...settings.featuredPortfolioImageIds],
    isPublic: settings.isPublic,
    portfolioCoverImageId: settings.portfolioCoverImageId ?? '',
    portfolioOutcome: settings.portfolioOutcome ?? '',
    portfolioOverview: settings.portfolioOverview ?? '',
    portfolioProcessSummary: settings.portfolioProcessSummary ?? '',
    portfolioRole: settings.portfolioRole ?? '',
    portfolioSkills: [...(settings.portfolioSkills ?? [])],
    portfolioSlug: settings.portfolioSlug === 'untitled' ? '' : settings.portfolioSlug,
    portfolioSolution: settings.portfolioSolution ?? '',
    portfolioTools: [...(settings.portfolioTools ?? [])],
    visibleSections: { ...settings.visibleSections },
  }));

  const cleanedSlug = slugifyPortfolioValue(
    draft.portfolioSlug || getPortfolioProjectTitle(project),
  );
  const previewPath = buildPublicPortfolioUrl(usernameSlug || 'untitled', cleanedSlug);
  const selectedCover = draft.portfolioCoverImageId
    ? assets.find((asset) => asset.id === draft.portfolioCoverImageId)
    : project.heroImage ?? project.galleryImages?.[0];
  const missingSelectedCover = Boolean(draft.portfolioCoverImageId && !selectedCover);
  const projectMaterials = linkedMaterials.filter((material) => material.projectId === project.id);
  const availableFeaturedImageCount = draft.featuredPortfolioImageIds.filter(
    (id) => assets.some((asset) => asset.id === id),
  ).length;
  const availableAttachedEditorialCount = draft.attachedEditorialCollectionIds.filter(
    (id) => editorialOptions.some(({ collection }) => collection.id === id),
  ).length;
  const staleEditorialCount = draft.attachedEditorialCollectionIds.filter(
    (id) => !editorialOptions.some(({ collection }) => collection.id === id),
  ).length;
  const warnings = getSectionWarnings({
    attachedEditorialCount: availableAttachedEditorialCount,
    featuredImageCount: availableFeaturedImageCount,
    hasMaterials: projectMaterials.length > 0,
    visibleSections: draft.visibleSections,
  });

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const save = () => {
    onSave({
      attachedEditorialCollectionIds: draft.attachedEditorialCollectionIds,
      portfolioChallenge: optionalPortfolioCopy(draft.portfolioChallenge),
      customPortfolioDescription: draft.customPortfolioDescription.trim() || undefined,
      customPortfolioTitle: draft.customPortfolioTitle.trim() || undefined,
      featuredPortfolioImageIds: draft.featuredPortfolioImageIds,
      isPublic: draft.isPublic,
      portfolioCoverImageId: draft.portfolioCoverImageId || undefined,
      portfolioOutcome: optionalPortfolioCopy(draft.portfolioOutcome),
      portfolioOverview: optionalPortfolioCopy(draft.portfolioOverview),
      portfolioProcessSummary: optionalPortfolioCopy(draft.portfolioProcessSummary),
      portfolioRole: optionalPortfolioCopy(draft.portfolioRole),
      portfolioSkills: cleanPortfolioTokens(draft.portfolioSkills),
      portfolioSlug: ensureUniquePortfolioSlug(cleanedSlug, existingProjectSlugs),
      portfolioSolution: optionalPortfolioCopy(draft.portfolioSolution),
      portfolioTools: cleanPortfolioTokens(draft.portfolioTools),
      visibleSections: draft.visibleSections,
    });
  };

  return (
    <div
      aria-label={`Portfolio settings for ${getPortfolioProjectTitle(project)}`}
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-end bg-midnight/88 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5"
      role="dialog"
    >
      <div className="flex h-[100dvh] w-full max-w-6xl flex-col overflow-hidden border-bronze/38 bg-[#0c0e10] shadow-2xl sm:h-[92dvh] sm:rounded-2xl sm:border">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-bronze/22 px-5 py-4 sm:px-7 sm:py-5">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ember">
              Portfolio Project
            </p>
            <h2 className="mt-1 truncate text-xl font-semibold text-stardust sm:text-2xl">
              {getPortfolioProjectTitle(project)}
            </h2>
            <p className="mt-1 text-xs text-stardust/42">
              Configure the recruiter-facing version without changing the studio project.
            </p>
          </div>
          <button
            aria-label="Close portfolio settings"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-bronze/34 text-stardust/64 transition hover:border-ember/55 hover:text-ember"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={19} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7 sm:py-6">
          <div className="grid gap-7 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:gap-9">
            <div className="min-w-0 space-y-7">
              <PanelSection
                kicker="Visibility"
                title="Public presentation"
              >
                <div className="flex items-center justify-between gap-4 rounded-xl border border-bronze/22 bg-midnight/38 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
                      draft.isPublic
                        ? 'border-teal/42 bg-teal/12 text-teal'
                        : 'border-bronze/30 bg-midnight/50 text-stardust/44',
                    )}>
                      {draft.isPublic
                        ? <Eye aria-hidden="true" size={18} />
                        : <EyeOff aria-hidden="true" size={18} />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stardust">
                        {draft.isPublic ? 'Public project' : 'Private project'}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-stardust/42">
                        {draft.isPublic
                          ? 'Visible when the recruiter portfolio is published.'
                          : 'Only visible inside Mystic Lore Studio.'}
                      </p>
                    </div>
                  </div>
                  <PanelToggle
                    ariaLabel={draft.isPublic ? 'Make project private' : 'Make project public'}
                    checked={draft.isPublic}
                    onChange={(isPublic) => setDraft((current) => ({ ...current, isPublic }))}
                  />
                </div>
              </PanelSection>

              <PanelSection kicker="Story" title="Recruiter-facing copy">
                <div className="grid gap-4">
                  <PanelField
                    hint={`Fallback: ${project.name}`}
                    label="Portfolio title"
                    onChange={(customPortfolioTitle) => setDraft((current) => ({ ...current, customPortfolioTitle }))}
                    placeholder={project.name}
                    value={draft.customPortfolioTitle}
                  />
                  <PanelField
                    hint="Write this like a recruiter-facing case study summary."
                    label="Portfolio description"
                    multiline
                    onChange={(customPortfolioDescription) => setDraft((current) => ({ ...current, customPortfolioDescription }))}
                    placeholder={project.summary || 'Describe the design challenge, decisions, and result.'}
                    value={draft.customPortfolioDescription}
                  />
                  <PanelField
                    hint="Letters, numbers, and hyphens only. It is cleaned automatically."
                    label="Portfolio slug"
                    onBlur={() => setDraft((current) => ({
                      ...current,
                      portfolioSlug: slugifyPortfolioValue(
                        current.portfolioSlug || getPortfolioProjectTitle(project),
                      ),
                    }))}
                    onChange={(portfolioSlug) => setDraft((current) => ({
                      ...current,
                      portfolioSlug: portfolioSlug.trim()
                        ? slugifyPortfolioValue(portfolioSlug)
                        : '',
                    }))}
                    value={draft.portfolioSlug}
                  />
                </div>
                <div className="mt-4 rounded-xl border border-teal/22 bg-teal/[0.065] px-3.5 py-3">
                  <p className="flex items-center gap-2 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-teal">
                    <Link2 aria-hidden="true" size={13} /> Public URL preview
                  </p>
                  <p className="mt-1.5 break-all text-xs leading-5 text-stardust/62">{previewPath}</p>
                </div>
              </PanelSection>

              <PanelSection kicker="Case Study" title="The story recruiters should remember">
                <div className="grid gap-4">
                  <PanelField
                    hint="Optional. Describe your contribution to this work."
                    label="Role"
                    onChange={(portfolioRole) => setDraft((current) => ({ ...current, portfolioRole }))}
                    placeholder="e.g. Technical Designer, Apparel Designer, Product Developer"
                    value={draft.portfolioRole}
                  />
                  <PortfolioTokenField
                    hint="Add a skill with Enter or a comma."
                    label="Skills"
                    onChange={(portfolioSkills) => setDraft((current) => ({ ...current, portfolioSkills }))}
                    placeholder="e.g. Fit development"
                    values={draft.portfolioSkills}
                  />
                  <PortfolioTokenField
                    hint="Add the tools, methods, or systems that made the work possible."
                    label="Tools"
                    onChange={(portfolioTools) => setDraft((current) => ({ ...current, portfolioTools }))}
                    placeholder="e.g. CLO 3D, Illustrator"
                    values={draft.portfolioTools}
                  />
                  <PanelField
                    hint="If left empty, the portfolio description is used."
                    label="Overview"
                    multiline
                    onChange={(portfolioOverview) => setDraft((current) => ({ ...current, portfolioOverview }))}
                    placeholder="Describe what this project is, who it was designed for, and what it demonstrates."
                    value={draft.portfolioOverview}
                  />
                  <PanelField
                    label="Process Summary"
                    multiline
                    onChange={(portfolioProcessSummary) => setDraft((current) => ({ ...current, portfolioProcessSummary }))}
                    placeholder="Summarize the development arc, key decisions, and how the work moved from concept to garment."
                    value={draft.portfolioProcessSummary}
                  />
                  <PanelField
                    label="Challenge"
                    multiline
                    onChange={(portfolioChallenge) => setDraft((current) => ({ ...current, portfolioChallenge }))}
                    placeholder="What design, fit, construction, or material problem did you solve?"
                    value={draft.portfolioChallenge}
                  />
                  <PanelField
                    label="Solution"
                    multiline
                    onChange={(portfolioSolution) => setDraft((current) => ({ ...current, portfolioSolution }))}
                    placeholder="Explain the decisions, tests, or refinements that shaped the solution."
                    value={draft.portfolioSolution}
                  />
                  <PanelField
                    label="Outcome"
                    multiline
                    onChange={(portfolioOutcome) => setDraft((current) => ({ ...current, portfolioOutcome }))}
                    placeholder="What did the final piece prove or improve?"
                    value={draft.portfolioOutcome}
                  />
                </div>
              </PanelSection>

              <PanelSection kicker="Cover" title="Portfolio thumbnail">
                <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-bronze/28 bg-midnight">
                  {selectedCover ? (
                    <AdaptiveProjectImage asset={selectedCover} className="h-full w-full" mode="compact" />
                  ) : (
                    <PanelImagePlaceholder />
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-midnight/72 via-transparent to-transparent" />
                  <p className="absolute bottom-3 left-3 text-xs text-stardust/64">
                    {missingSelectedCover
                      ? 'Selected image is unavailable'
                      : draft.portfolioCoverImageId
                        ? 'Custom portfolio cover'
                        : 'Automatic project cover'}
                  </p>
                </div>
                {missingSelectedCover ? (
                  <InlineWarning text="The selected cover image is unavailable. Choose another image or use Automatic." />
                ) : null}
                {assets.length ? (
                  <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-7">
                    <ImageChoice
                      label="Use automatic project cover"
                      onClick={() => setDraft((current) => ({ ...current, portfolioCoverImageId: '' }))}
                      selected={!draft.portfolioCoverImageId}
                    >
                      <Sparkles aria-hidden="true" size={18} />
                    </ImageChoice>
                    {assets.map((asset) => (
                      <ImageChoice
                        key={asset.id}
                        label={`Use ${asset.name} as portfolio cover`}
                        onClick={() => setDraft((current) => ({ ...current, portfolioCoverImageId: asset.id }))}
                        selected={draft.portfolioCoverImageId === asset.id}
                      >
                        <StoredImage alt="" asset={asset} decorative displayOverride={{ objectFit: 'cover', zoom: 1 }} quality="thumbnail" />
                      </ImageChoice>
                    ))}
                  </div>
                ) : (
                  <InlineWarning text="This project has no imagery yet. A Mystic Lore placeholder will be used." />
                )}
              </PanelSection>
            </div>

            <div className="min-w-0 space-y-7">
              <PanelSection kicker="Gallery" title="Featured portfolio images">
                <p className="text-xs leading-5 text-stardust/42">
                  Select the strongest images and arrange the order recruiters will see.
                </p>
                {assets.length ? (
                  <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {assets.map((asset) => {
                      const order = draft.featuredPortfolioImageIds.indexOf(asset.id);
                      return (
                        <ImageChoice
                          key={asset.id}
                          label={`${order >= 0 ? 'Remove' : 'Add'} ${asset.name} ${order >= 0 ? 'from' : 'to'} featured images`}
                          onClick={() => setDraft((current) => ({
                            ...current,
                            featuredPortfolioImageIds: order >= 0
                              ? current.featuredPortfolioImageIds.filter((id) => id !== asset.id)
                              : [...current.featuredPortfolioImageIds, asset.id],
                          }))}
                          order={order >= 0 ? order + 1 : undefined}
                          selected={order >= 0}
                        >
                          <StoredImage alt="" asset={asset} decorative displayOverride={{ objectFit: 'cover', zoom: 1 }} quality="thumbnail" />
                        </ImageChoice>
                      );
                    })}
                  </div>
                ) : (
                  <InlineWarning text="Add project images before enabling a public gallery." />
                )}
                {draft.featuredPortfolioImageIds.length ? (
                  <div className="mt-4 space-y-2">
                    {draft.featuredPortfolioImageIds.map((assetId, index) => {
                      const asset = assets.find((candidate) => candidate.id === assetId);
                      return (
                        <div className="flex items-center gap-3 rounded-xl border border-bronze/20 bg-midnight/34 p-2" key={assetId}>
                          <div className="h-12 w-10 shrink-0 overflow-hidden rounded-lg border border-bronze/24 bg-midnight">
                            {asset ? <StoredImage alt="" asset={asset} decorative displayOverride={{ objectFit: 'cover', zoom: 1 }} quality="thumbnail" /> : <PanelImagePlaceholder />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-stardust">{asset?.name ?? 'Unavailable image'}</p>
                            <p className="mt-0.5 text-[0.65rem] text-stardust/38">Position {index + 1}</p>
                          </div>
                          <OrderButton disabled={index === 0} label={`Move ${asset?.name ?? 'image'} left`} onClick={() => setDraft((current) => ({ ...current, featuredPortfolioImageIds: moveItem(current.featuredPortfolioImageIds, index, index - 1) }))}>
                            <ChevronLeft aria-hidden="true" size={16} />
                          </OrderButton>
                          <OrderButton disabled={index === draft.featuredPortfolioImageIds.length - 1} label={`Move ${asset?.name ?? 'image'} right`} onClick={() => setDraft((current) => ({ ...current, featuredPortfolioImageIds: moveItem(current.featuredPortfolioImageIds, index, index + 1) }))}>
                            <ChevronRight aria-hidden="true" size={16} />
                          </OrderButton>
                          <OrderButton label={`Remove ${asset?.name ?? 'image'} from featured images`} onClick={() => setDraft((current) => ({ ...current, featuredPortfolioImageIds: current.featuredPortfolioImageIds.filter((id) => id !== assetId) }))}>
                            <X aria-hidden="true" size={16} />
                          </OrderButton>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </PanelSection>

              <PanelSection kicker="Editorials" title="Attached collections">
                <p className="text-xs leading-5 text-stardust/42">
                  Attach any existing studio collection. It becomes visible only through this public project; nothing is published from its source project automatically.
                </p>
                {editorialOptions.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {editorialOptions.map(({ collection, sourceProject }) => {
                      const selected = draft.attachedEditorialCollectionIds.includes(collection.id);
                      return (
                        <button
                          aria-label={`${selected ? 'Detach' : 'Attach'} ${collection.title}`}
                          aria-pressed={selected}
                          className={cn(
                            'group overflow-hidden rounded-xl border text-left transition',
                            selected
                              ? 'border-ember/62 bg-ember/[0.08] ring-2 ring-ember/10'
                              : 'border-bronze/22 bg-midnight/32 hover:border-bronze/48',
                          )}
                          key={collection.id}
                          onClick={() => setDraft((current) => ({
                            ...current,
                            attachedEditorialCollectionIds: selected
                              ? current.attachedEditorialCollectionIds.filter((id) => id !== collection.id)
                              : [...current.attachedEditorialCollectionIds, collection.id],
                          }))}
                          type="button"
                        >
                          <div className="relative aspect-[16/8] overflow-hidden border-b border-bronze/18">
                            <EditorialCollectionCover className="absolute inset-0" collection={collection} project={sourceProject} />
                            {selected ? <ChoiceMark order={undefined} /> : null}
                          </div>
                          <div className="p-3">
                            <p className="line-clamp-1 text-sm font-medium text-stardust">{collection.title}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stardust/40">
                              <span>{collection.scenes.length} scene{collection.scenes.length === 1 ? '' : 's'}</span>
                              <span aria-hidden="true" className="text-bronze/45">/</span>
                              <span>Updated {formatStudioDate(collection.updatedAt, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>
                            <p className="mt-2 line-clamp-1 text-[0.68rem] text-stardust/32">
                              {sourceProject ? `From ${sourceProject.name}` : 'Source project unavailable'}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <InlineWarning text="No Editorial Collections exist in the studio yet. Create one in Editorial Collections, then attach it here." />
                )}
                {staleEditorialCount ? (
                  <InlineWarning text={`${staleEditorialCount} unavailable editorial reference${staleEditorialCount === 1 ? ' is' : 's are'} retained for safe reconnection.`} />
                ) : null}
              </PanelSection>

              <PanelSection kicker="Sections" title="Public case study structure">
                <div className="grid gap-2 sm:grid-cols-2">
                  {SECTION_OPTIONS.map((option) => (
                    <button
                      aria-label={`Toggle ${option.label} portfolio section`}
                      aria-checked={draft.visibleSections[option.key]}
                      className={cn(
                        'flex min-h-[4.5rem] items-start gap-3 rounded-xl border p-3 text-left transition',
                        draft.visibleSections[option.key]
                          ? 'border-teal/38 bg-teal/[0.075]'
                          : 'border-bronze/20 bg-midnight/30 hover:border-bronze/42',
                      )}
                      key={option.key}
                      onClick={() => setDraft((current) => ({
                        ...current,
                        visibleSections: {
                          ...current.visibleSections,
                          [option.key]: !current.visibleSections[option.key],
                        },
                      }))}
                      role="switch"
                      type="button"
                    >
                      <span className={cn(
                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                        draft.visibleSections[option.key]
                          ? 'border-teal/65 bg-teal text-midnight'
                          : 'border-bronze/36 text-transparent',
                      )}>
                        <Check aria-hidden="true" size={13} strokeWidth={2.5} />
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-stardust">{option.label}</span>
                        <span className="mt-1 block text-xs leading-4 text-stardust/40">{option.description}</span>
                      </span>
                    </button>
                  ))}
                </div>

                {warnings.length ? (
                  <div className="mt-4 space-y-2">
                    {warnings.map((warning) => (
                      <InlineWarning key={warning} text={warning} />
                    ))}
                  </div>
                ) : null}
              </PanelSection>
            </div>
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-bronze/22 bg-midnight/92 px-5 py-3.5 sm:px-7">
          <p className="hidden text-xs text-stardust/38 sm:block">
            Changes affect only this project's public portfolio settings.
          </p>
          <div className="ml-auto flex gap-2">
            <Button onClick={onClose} size="sm" variant="ghost">Cancel</Button>
            <Button icon={<Save aria-hidden="true" size={16} />} onClick={save} size="sm" variant="primary">
              Save Portfolio Settings
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function PanelSection({
  children,
  kicker,
  title,
}: {
  children: React.ReactNode;
  kicker: string;
  title: string;
}) {
  return (
    <section className="border-t border-bronze/18 pt-5 first:border-t-0 first:pt-0">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-ember">{kicker}</p>
      <h3 className="mt-1 text-lg font-semibold text-stardust">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function PanelField({
  hint,
  label,
  multiline = false,
  onBlur,
  onChange,
  placeholder,
  value,
}: {
  hint?: string;
  label: string;
  multiline?: boolean;
  onBlur?: () => void;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  const classes = 'min-h-[3.25rem] w-full rounded-xl border border-bronze/26 bg-midnight/42 px-3.5 text-sm text-stardust outline-none transition placeholder:text-stardust/24 focus:border-ember/56 focus:ring-2 focus:ring-ember/10';
  return (
    <label>
      <span className="mb-2 block text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-stardust/44">{label}</span>
      {multiline ? (
        <textarea className={cn(classes, 'min-h-28 resize-none py-3')} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} value={value} />
      ) : (
        <input className={classes} onBlur={onBlur} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} value={value} />
      )}
      {hint ? <span className="mt-2 block text-xs leading-5 text-stardust/38">{hint}</span> : null}
    </label>
  );
}

function PortfolioTokenField({
  hint,
  label,
  onChange,
  placeholder,
  values,
}: {
  hint: string;
  label: string;
  onChange: (values: string[]) => void;
  placeholder: string;
  values: string[];
}) {
  const [draftValue, setDraftValue] = useState('');
  const addValues = (value: string) => {
    const nextValues = cleanPortfolioTokens([...values, ...value.split(',')]);
    if (nextValues.length !== values.length || !value.trim()) onChange(nextValues);
    setDraftValue('');
  };

  return (
    <label>
      <span className="mb-2 block text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-stardust/44">{label}</span>
      <div className="flex min-h-[3.25rem] flex-wrap items-center gap-2 rounded-xl border border-bronze/26 bg-midnight/42 px-3 py-2 transition focus-within:border-ember/56 focus-within:ring-2 focus-within:ring-ember/10">
        {values.map((value) => (
          <span className="inline-flex min-h-7 items-center gap-1.5 rounded-lg border border-teal/25 bg-teal/[0.08] py-1 pl-2 pr-1 text-xs text-stardust/78" key={value}>
            {value}
            <button
              aria-label={`Remove ${value}`}
              className="flex h-5 w-5 items-center justify-center rounded text-stardust/50 transition hover:bg-stardust/10 hover:text-ember"
              onClick={() => onChange(values.filter((item) => item !== value))}
              type="button"
            >
              <X aria-hidden="true" size={12} />
            </button>
          </span>
        ))}
        <input
          className="min-w-[9rem] flex-1 bg-transparent py-1 text-sm text-stardust outline-none placeholder:text-stardust/24"
          onChange={(event) => setDraftValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault();
              addValues(draftValue);
            }
            if (event.key === 'Backspace' && !draftValue && values.length) {
              onChange(values.slice(0, -1));
            }
          }}
          onBlur={() => {
            if (draftValue.trim()) addValues(draftValue);
          }}
          placeholder={placeholder}
          value={draftValue}
        />
      </div>
      <span className="mt-2 block text-xs leading-5 text-stardust/38">{hint}</span>
    </label>
  );
}

function PanelToggle({
  ariaLabel,
  checked,
  onChange,
}: {
  ariaLabel: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      aria-checked={checked}
      aria-label={ariaLabel}
      className={cn(
        'relative h-8 w-14 shrink-0 rounded-full border transition',
        checked ? 'border-teal/65 bg-teal/28' : 'border-bronze/34 bg-midnight/60',
      )}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span className={cn(
        'absolute top-[0.3rem] h-5 w-5 rounded-full shadow transition',
        checked
          ? 'left-[1.9rem] bg-stardust shadow-[0_0_12px_rgba(74,156,170,0.5)]'
          : 'left-[0.3rem] bg-stardust/40',
      )} />
    </button>
  );
}

function ImageChoice({
  children,
  label,
  onClick,
  order,
  selected,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  order?: number;
  selected: boolean;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={selected}
      className={cn(
        'relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg border bg-midnight/50 text-stardust/42 transition hover:border-ember/55 hover:text-ember',
        selected ? 'border-ember/70 ring-2 ring-ember/12' : 'border-bronze/24',
      )}
      onClick={onClick}
      type="button"
    >
      {children}
      {selected ? <ChoiceMark order={order} /> : null}
    </button>
  );
}

function ChoiceMark({ order }: { order?: number }) {
  return (
    <span className="absolute right-1 top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-ember px-1 text-[0.65rem] font-semibold text-midnight">
      {order ?? <Check aria-hidden="true" size={13} strokeWidth={2.5} />}
    </span>
  );
}

function OrderButton({
  children,
  disabled = false,
  label,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-bronze/24 text-stardust/54 transition hover:border-ember/50 hover:text-ember disabled:pointer-events-none disabled:opacity-25"
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function InlineWarning({ text }: { text: string }) {
  return (
    <p className="mt-3 flex items-start gap-2 rounded-xl border border-ember/24 bg-ember/[0.055] px-3 py-2.5 text-xs leading-5 text-stardust/56">
      <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0 text-ember" size={14} />
      {text}
    </p>
  );
}

function PanelImagePlaceholder() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_24%_25%,rgba(45,92,107,0.34),transparent_34%),radial-gradient(circle_at_78%_78%,rgba(154,108,60,0.26),transparent_35%),linear-gradient(145deg,#11151a,#08090a)]">
      <ImageIcon aria-hidden="true" className="text-stardust/24" size={28} />
    </div>
  );
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length || from === to) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function getSectionWarnings({
  attachedEditorialCount,
  featuredImageCount,
  hasMaterials,
  visibleSections,
}: {
  attachedEditorialCount: number;
  featuredImageCount: number;
  hasMaterials: boolean;
  visibleSections: PortfolioVisibleSections;
}): string[] {
  const warnings: string[] = [];
  if (visibleSections.gallery && !featuredImageCount) {
    warnings.push('Gallery is enabled, but no featured images are selected.');
  }
  if (visibleSections.editorials && !attachedEditorialCount) {
    warnings.push('Editorials is enabled, but no Editorial Collections are attached.');
  }
  if (visibleSections.materials && !hasMaterials) {
    warnings.push('Materials is enabled, but this project has no linked materials.');
  }
  if (visibleSections.notes) {
    warnings.push('Only enable notes if they are polished and safe for public viewing.');
  }
  return warnings;
}

function cleanPortfolioTokens(values: string[]) {
  return [...new Set(values
    .map((value) => value.trim())
    .filter(Boolean))];
}

function optionalPortfolioCopy(value: string) {
  return value.trim() || undefined;
}
