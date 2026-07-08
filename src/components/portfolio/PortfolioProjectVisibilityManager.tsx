import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Eye,
  Image as ImageIcon,
  Pencil,
  Sparkles,
  X,
} from 'lucide-react';
import {
  buildPublicPortfolioUrl,
  ensureUniquePortfolioSlug,
  getPortfolioProjectDescription,
  getPortfolioProjectTitle,
  getSafePortfolioSettings,
  slugifyPortfolioValue,
  sortPortfolioProjects,
} from '../../utils/portfolioUtils';
import { cn } from '../../lib/classes';
import type { PortfolioProjectSettingsPatch } from '../../types/portfolio';
import type { ApparelProject, LocalImageAsset } from '../../types/studio';
import { AdaptiveProjectImage } from '../projects/AdaptiveProjectImage';
import { Badge } from '../shared/Badge';
import { Button } from '../shared/Button';
import { Card } from '../shared/Card';
import { StoredImage } from '../shared/StoredImage';

type PortfolioProjectVisibilityManagerProps = {
  onUpdateSettings: (
    projectId: string,
    patch: PortfolioProjectSettingsPatch,
  ) => void;
  projects: ApparelProject[];
  usernameSlug: string;
};

type SettingsDraft = {
  coverImageId: string;
  description: string;
  slug: string;
  title: string;
};

export function PortfolioProjectVisibilityManager({
  onUpdateSettings,
  projects,
  usernameSlug,
}: PortfolioProjectVisibilityManagerProps) {
  const sortedProjects = useMemo(() => sortPortfolioProjects(projects), [projects]);
  const [copiedProjectId, setCopiedProjectId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft | null>(null);
  const [previewProjectId, setPreviewProjectId] = useState<string | null>(null);

  const publicCount = projects.filter(
    (project) => getSafePortfolioSettings(project).isPublic,
  ).length;
  const featuredCount = projects.filter((project) => {
    const settings = getSafePortfolioSettings(project);
    return settings.isPublic && settings.featured;
  }).length;
  const previewProject = projects.find((project) => project.id === previewProjectId);

  const getUniqueSlug = (project: ApparelProject, requestedSlug?: string) => {
    const existingSlugs = projects
      .filter((candidate) => candidate.id !== project.id)
      .map((candidate) => getSafePortfolioSettings(candidate).portfolioSlug)
      .filter(Boolean);
    return ensureUniquePortfolioSlug(
      requestedSlug || getPortfolioProjectTitle(project),
      existingSlugs,
    );
  };

  const togglePublic = (project: ApparelProject, isPublic: boolean) => {
    const settings = getSafePortfolioSettings(project);
    const needsSlug = !project.portfolio?.portfolioSlug?.trim()
      || settings.portfolioSlug === 'untitled';
    onUpdateSettings(project.id, {
      isPublic,
      ...(isPublic && needsSlug
        ? { portfolioSlug: getUniqueSlug(project) }
        : {}),
    });
  };

  const openSettings = (project: ApparelProject) => {
    if (editingProjectId === project.id) {
      setEditingProjectId(null);
      setSettingsDraft(null);
      return;
    }
    const settings = getSafePortfolioSettings(project);
    setEditingProjectId(project.id);
    setSettingsDraft({
      coverImageId: settings.portfolioCoverImageId ?? '',
      description: settings.customPortfolioDescription ?? '',
      slug: settings.portfolioSlug === 'untitled' ? '' : settings.portfolioSlug,
      title: settings.customPortfolioTitle ?? '',
    });
  };

  const saveSettings = (project: ApparelProject) => {
    if (!settingsDraft) return;
    onUpdateSettings(project.id, {
      customPortfolioDescription: settingsDraft.description.trim() || undefined,
      customPortfolioTitle: settingsDraft.title.trim() || undefined,
      portfolioCoverImageId: settingsDraft.coverImageId || undefined,
      portfolioSlug: getUniqueSlug(project, settingsDraft.slug),
    });
    setEditingProjectId(null);
    setSettingsDraft(null);
  };

  const copyLink = async (project: ApparelProject) => {
    const settings = getSafePortfolioSettings(project);
    const path = buildPublicPortfolioUrl(
      usernameSlug || 'untitled',
      settings.portfolioSlug,
    );
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopiedProjectId(project.id);
      window.setTimeout(() => setCopiedProjectId(null), 1800);
    } catch {
      setCopiedProjectId(null);
    }
  };

  return (
    <section aria-labelledby="portfolio-project-visibility-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ember">
            Project Visibility
          </p>
          <h2
            className="mt-1 text-xl font-semibold text-stardust"
            id="portfolio-project-visibility-title"
          >
            Choose what earns the spotlight
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stardust/48">
            Public projects become recruiter-ready portfolio stories. Private studio work stays private.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="teal">{publicCount} public</Badge>
          <Badge variant="bronze">{featuredCount} featured</Badge>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {sortedProjects.map((project) => {
          const settings = getSafePortfolioSettings(project);
          const assets = getProjectAssets(project);
          const cover = resolvePortfolioCover(project, assets);
          const persistedSlug = project.portfolio?.portfolioSlug?.trim();
          const missingSlug = settings.isPublic
            && (!persistedSlug || settings.portfolioSlug === 'untitled');
          const path = buildPublicPortfolioUrl(
            usernameSlug || 'untitled',
            settings.portfolioSlug,
          );
          const isEditing = editingProjectId === project.id && settingsDraft;

          return (
            <Card
              className="min-w-0 overflow-hidden p-0"
              data-portfolio-project-id={project.id}
              key={project.id}
            >
              <div className="relative h-44 overflow-hidden border-b border-bronze/22 bg-midnight sm:h-48">
                {cover ? (
                  <AdaptiveProjectImage
                    asset={cover}
                    className="h-full w-full"
                    mode="compact"
                  />
                ) : (
                  <ProjectImagePlaceholder />
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-midnight/90 via-transparent to-midnight/35" />
                <div className="absolute left-4 top-4 flex max-w-[calc(100%-2rem)] flex-wrap gap-2">
                  <Badge variant={settings.isPublic ? 'teal' : 'bronze'}>
                    {settings.isPublic ? 'Public' : 'Private'}
                  </Badge>
                  {settings.featured ? <Badge variant="ember">Featured</Badge> : null}
                  {missingSlug ? <WarningBadge label="Missing slug" /> : null}
                  {!cover ? <WarningBadge label="Missing cover image" /> : null}
                </div>
                <div className="absolute bottom-4 left-4 right-4 min-w-0">
                  <p className="text-xs uppercase tracking-[0.16em] text-stardust/54">
                    {project.garmentType} / {project.phase}
                  </p>
                  <h3 className="mt-1 line-clamp-2 text-xl font-semibold leading-tight text-stardust">
                    {getPortfolioProjectTitle(project)}
                  </h3>
                </div>
              </div>

              <div className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-stardust/38">
                      Portfolio slug
                    </p>
                    <p className="mt-1 truncate text-sm text-stardust/70">
                      {settings.portfolioSlug || 'Missing slug'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <ToggleControl
                      ariaLabel={`Mark ${getPortfolioProjectTitle(project)} featured`}
                      checked={settings.featured}
                      label="Featured"
                      onChange={(featured) => onUpdateSettings(project.id, { featured })}
                    />
                    <ToggleControl
                      ariaLabel={settings.isPublic
                        ? `Make ${getPortfolioProjectTitle(project)} private`
                        : `Make ${getPortfolioProjectTitle(project)} public`}
                      checked={settings.isPublic}
                      label={settings.isPublic ? 'Public' : 'Private'}
                      onChange={(isPublic) => togglePublic(project, isPublic)}
                    />
                  </div>
                </div>

                {settings.isPublic ? (
                  <div className="mt-4 rounded-xl border border-teal/22 bg-teal/[0.065] px-3 py-2.5">
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-teal">
                      Public URL
                    </p>
                    <p className="mt-1 break-all text-xs leading-5 text-stardust/58">
                      {missingSlug ? 'Save a portfolio slug to activate this link.' : path}
                    </p>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2 border-t border-bronze/16 pt-4">
                  <Button
                    aria-label={`Edit portfolio settings for ${getPortfolioProjectTitle(project)}`}
                    icon={<Pencil aria-hidden="true" size={15} />}
                    onClick={() => openSettings(project)}
                    size="sm"
                    variant="secondary"
                  >
                    {isEditing ? 'Close Settings' : 'Edit Settings'}
                  </Button>
                  {settings.isPublic ? (
                    <>
                      <Button
                        aria-label={`Copy portfolio link for ${getPortfolioProjectTitle(project)}`}
                        disabled={missingSlug}
                        icon={copiedProjectId === project.id
                          ? <Check aria-hidden="true" size={15} />
                          : <Copy aria-hidden="true" size={15} />}
                        onClick={() => void copyLink(project)}
                        size="sm"
                        variant="ghost"
                      >
                        {copiedProjectId === project.id ? 'Copied' : 'Copy Link'}
                      </Button>
                      <Button
                        aria-label={`Preview ${getPortfolioProjectTitle(project)} portfolio project`}
                        icon={<Eye aria-hidden="true" size={15} />}
                        onClick={() => setPreviewProjectId(project.id)}
                        size="sm"
                        variant="ghost"
                      >
                        Preview
                      </Button>
                    </>
                  ) : null}
                </div>

                {isEditing ? (
                  <ProjectPortfolioSettingsEditor
                    assets={assets}
                    draft={settingsDraft}
                    onCancel={() => {
                      setEditingProjectId(null);
                      setSettingsDraft(null);
                    }}
                    onChange={setSettingsDraft}
                    onSave={() => saveSettings(project)}
                  />
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>

      {previewProject ? (
        <PortfolioProjectPreview
          onClose={() => setPreviewProjectId(null)}
          project={previewProject}
        />
      ) : null}
    </section>
  );
}

function ProjectPortfolioSettingsEditor({
  assets,
  draft,
  onCancel,
  onChange,
  onSave,
}: {
  assets: LocalImageAsset[];
  draft: SettingsDraft;
  onCancel: () => void;
  onChange: (draft: SettingsDraft) => void;
  onSave: () => void;
}) {
  return (
    <div className="mt-5 border-t border-bronze/18 pt-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <SettingsField
          label="Portfolio title"
          onChange={(title) => onChange({ ...draft, title })}
          placeholder="Use the project title"
          value={draft.title}
        />
        <SettingsField
          label="Portfolio slug"
          onBlur={() => onChange({
            ...draft,
            slug: draft.slug.trim() ? slugifyPortfolioValue(draft.slug) : '',
          })}
          onChange={(slug) => onChange({ ...draft, slug })}
          placeholder="project-name"
          value={draft.slug}
        />
        <SettingsField
          className="sm:col-span-2"
          label="Recruiter description"
          multiline
          onChange={(description) => onChange({ ...draft, description })}
          placeholder="A concise public-facing story for this garment."
          value={draft.description}
        />
      </div>

      {assets.length ? (
        <fieldset className="mt-4">
          <legend className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-stardust/42">
            Portfolio cover
          </legend>
          <div className="mt-2 grid grid-cols-5 gap-2 sm:grid-cols-7">
            <button
              aria-label="Choose automatic portfolio cover"
              aria-pressed={!draft.coverImageId}
              className={coverChoiceClass(!draft.coverImageId)}
              onClick={() => onChange({ ...draft, coverImageId: '' })}
              type="button"
            >
              <Sparkles aria-hidden="true" size={18} />
              {!draft.coverImageId ? <ChoiceMark /> : null}
            </button>
            {assets.map((asset) => {
              const selected = asset.id === draft.coverImageId;
              return (
                <button
                  aria-label={`Choose ${asset.name} as portfolio cover`}
                  aria-pressed={selected}
                  className={coverChoiceClass(selected)}
                  key={asset.id}
                  onClick={() => onChange({ ...draft, coverImageId: asset.id })}
                  title={asset.name}
                  type="button"
                >
                  <StoredImage
                    alt=""
                    asset={asset}
                    decorative
                    displayOverride={{ objectFit: 'cover', zoom: 1 }}
                  />
                  {selected ? <ChoiceMark /> : null}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onCancel} size="sm" variant="ghost">Cancel</Button>
        <Button onClick={onSave} size="sm" variant="primary">Save Settings</Button>
      </div>
    </div>
  );
}

function PortfolioProjectPreview({
  onClose,
  project,
}: {
  onClose: () => void;
  project: ApparelProject;
}) {
  const settings = getSafePortfolioSettings(project);
  const cover = resolvePortfolioCover(project, getProjectAssets(project));
  return (
    <div
      aria-label={`${getPortfolioProjectTitle(project)} portfolio preview`}
      aria-modal="true"
      className="fixed inset-0 z-[90] flex items-end bg-midnight/86 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5"
      role="dialog"
    >
      <div className="relative flex max-h-[100dvh] w-full max-w-5xl flex-col overflow-y-auto border border-bronze/38 bg-[#0d0f11] shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(20rem,0.62fr)] lg:overflow-hidden">
        <button
          aria-label="Close project preview"
          className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-xl border border-bronze/38 bg-midnight/78 text-stardust transition hover:border-ember/55 hover:text-ember"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" size={19} />
        </button>
        <div className="relative min-h-[20rem] overflow-hidden bg-midnight sm:min-h-[28rem]">
          {cover ? (
            <AdaptiveProjectImage asset={cover} className="absolute inset-0 h-full w-full" mode="primary" />
          ) : (
            <ProjectImagePlaceholder />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/10 to-midnight/30" />
        </div>
        <div className="flex flex-col justify-end p-6 sm:p-8">
          <Badge className="self-start" variant="teal">Recruiter Preview</Badge>
          <p className="mt-6 text-xs uppercase tracking-[0.18em] text-ember">
            {project.garmentType} / {project.collection}
          </p>
          <h2 className="font-display mt-3 text-3xl leading-tight text-stardust sm:text-4xl">
            {getPortfolioProjectTitle(project)}
          </h2>
          <p className="mt-5 text-sm leading-7 text-stardust/62 sm:text-base">
            {getPortfolioProjectDescription(project)
              || 'A garment study from the Mystic Lore Studio portfolio.'}
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            <Badge variant="bronze">{project.phase}</Badge>
            <Badge variant="blue">{project.progress}% complete</Badge>
            {settings.featured ? <Badge variant="ember">Featured project</Badge> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleControl({
  ariaLabel,
  checked,
  label,
  onChange,
}: {
  ariaLabel: string;
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-stardust/58">
      <span>{label}</span>
      <button
        aria-checked={checked}
        aria-label={ariaLabel}
        className={cn(
          'relative h-7 w-12 rounded-full border transition',
          checked
            ? 'border-teal/65 bg-teal/28'
            : 'border-bronze/32 bg-midnight/55',
        )}
        onClick={() => onChange(!checked)}
        role="switch"
        type="button"
      >
        <span
          className={cn(
            'absolute top-1 h-[1.1rem] w-[1.1rem] rounded-full shadow transition',
            checked
              ? 'left-[1.65rem] bg-stardust shadow-[0_0_12px_rgba(74,156,170,0.5)]'
              : 'left-1 bg-stardust/40',
          )}
        />
      </button>
    </div>
  );
}

function SettingsField({
  className,
  label,
  multiline = false,
  onBlur,
  onChange,
  placeholder,
  value,
}: {
  className?: string;
  label: string;
  multiline?: boolean;
  onBlur?: () => void;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  const controlClass = 'min-h-[3rem] w-full rounded-xl border border-bronze/26 bg-midnight/42 px-3 text-sm text-stardust outline-none transition placeholder:text-stardust/24 focus:border-ember/56 focus:ring-2 focus:ring-ember/10';
  return (
    <label className={className}>
      <span className="mb-2 block text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-stardust/42">
        {label}
      </span>
      {multiline ? (
        <textarea
          className={cn(controlClass, 'min-h-24 resize-none py-3')}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          value={value}
        />
      ) : (
        <input
          className={controlClass}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          value={value}
        />
      )}
    </label>
  );
}

function WarningBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-ember/38 bg-midnight/72 px-2.5 py-1 text-[0.68rem] text-ember">
      <AlertTriangle aria-hidden="true" size={12} /> {label}
    </span>
  );
}

function ProjectImagePlaceholder() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_24%_25%,rgba(45,92,107,0.34),transparent_34%),radial-gradient(circle_at_78%_78%,rgba(154,108,60,0.26),transparent_35%),linear-gradient(145deg,#11151a,#08090a)]">
      <ImageIcon aria-hidden="true" className="text-stardust/24" size={30} />
    </div>
  );
}

function ChoiceMark() {
  return (
    <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ember text-midnight">
      <Check aria-hidden="true" size={12} strokeWidth={2.5} />
    </span>
  );
}

function coverChoiceClass(selected: boolean) {
  return cn(
    'relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg border bg-midnight/50 text-stardust/42 transition hover:border-ember/55 hover:text-ember',
    selected ? 'border-ember/70 ring-2 ring-ember/12' : 'border-bronze/24',
  );
}

function getProjectAssets(project: ApparelProject): LocalImageAsset[] {
  const assets = new Map<string, LocalImageAsset>();
  if (project.heroImage) assets.set(project.heroImage.id, project.heroImage);
  project.galleryImages?.forEach((image) => assets.set(image.id, image));
  return [...assets.values()];
}

function resolvePortfolioCover(
  project: ApparelProject,
  assets: LocalImageAsset[],
): LocalImageAsset | undefined {
  const settings = getSafePortfolioSettings(project);
  return assets.find((asset) => asset.id === settings.portfolioCoverImageId)
    ?? project.heroImage
    ?? project.galleryImages?.[0];
}
