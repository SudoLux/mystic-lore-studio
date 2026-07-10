import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Eye,
  Image as ImageIcon,
  Pencil,
} from 'lucide-react';
import {
  buildPublicPortfolioUrl,
  ensureUniquePortfolioSlug,
  getPortfolioProjectDescription,
  getPortfolioProjectTitle,
  getSafePortfolioSettings,
  sortPortfolioProjects,
} from '../../utils/portfolioUtils';
import { cn } from '../../lib/classes';
import type { EditorialCollection } from '../../types/editorial';
import type { PortfolioProjectSettingsPatch } from '../../types/portfolio';
import type { ApparelProject, LinkedMaterial } from '../../types/studio';
import { AdaptiveProjectImage } from '../projects/AdaptiveProjectImage';
import { Badge } from '../shared/Badge';
import { Button } from '../shared/Button';
import { Card } from '../shared/Card';
import { ProjectPortfolioSettingsPanel } from './ProjectPortfolioSettingsPanel';
import {
  getProjectPortfolioAssets,
  resolveProjectPortfolioCover,
} from './portfolioProjectAssets';

type PortfolioProjectVisibilityManagerProps = {
  editorialCollections: EditorialCollection[];
  linkedMaterials: LinkedMaterial[];
  onUpdateSettings: (
    projectId: string,
    patch: PortfolioProjectSettingsPatch,
  ) => void;
  projects: ApparelProject[];
  usernameSlug: string;
};

export function PortfolioProjectVisibilityManager({
  editorialCollections,
  linkedMaterials,
  onUpdateSettings,
  projects,
  usernameSlug,
}: PortfolioProjectVisibilityManagerProps) {
  const sortedProjects = useMemo(() => sortPortfolioProjects(projects), [projects]);
  const [copiedProjectId, setCopiedProjectId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  const publicCount = projects.filter(
    (project) => getSafePortfolioSettings(project).isPublic,
  ).length;
  const featuredCount = projects.filter((project) => {
    const settings = getSafePortfolioSettings(project);
    return settings.isPublic && settings.featured;
  }).length;
  const editingProject = projects.find((project) => project.id === editingProjectId);

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

  const openProjectPreview = (path: string) => {
    window.open(path, '_blank', 'noopener,noreferrer');
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

      {!publicCount ? (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-dashed border-bronze/28 bg-midnight/22 p-4">
          <Eye aria-hidden="true" className="mt-0.5 shrink-0 text-ember" size={20} />
          <div>
            <p className="text-sm font-medium text-stardust/78">No projects are public yet</p>
            <p className="mt-1 text-xs leading-5 text-stardust/44">
              Publish a finished project when it is ready to become part of your recruiter-facing story.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {sortedProjects.map((project) => {
          const settings = getSafePortfolioSettings(project);
          const assets = getProjectPortfolioAssets(project);
          const cover = resolveProjectPortfolioCover(project, assets);
          const persistedSlug = project.portfolio?.portfolioSlug?.trim();
          const missingSlug = settings.isPublic
            && (!persistedSlug || settings.portfolioSlug === 'untitled');
          const path = buildPublicPortfolioUrl(
            usernameSlug || 'untitled',
            settings.portfolioSlug,
          );
          const description = getPortfolioProjectDescription(project);
          const warnings = [
            ...(missingSlug ? ['Missing slug'] : []),
            ...(!cover ? ['Missing cover'] : []),
            ...(!description.trim() ? ['Missing description'] : []),
          ];
          return (
            <Card
              className={cn(
                'group min-w-0 overflow-hidden p-0 transition duration-300',
                settings.isPublic
                  ? 'border-teal/30 shadow-[0_24px_70px_rgba(0,0,0,0.26),0_0_0_1px_rgba(45,92,107,0.04)]'
                  : 'border-bronze/18 bg-[linear-gradient(145deg,rgba(237,227,207,0.04),rgba(237,227,207,0.018))]',
              )}
              data-portfolio-project-id={project.id}
              key={project.id}
            >
              <div className={cn(
                'relative h-36 overflow-hidden border-b bg-midnight sm:h-40',
                settings.isPublic ? 'border-teal/22' : 'border-bronze/16',
              )}>
                {cover ? (
                  <div className={cn('h-full w-full transition duration-500 group-hover:scale-[1.015]', !settings.isPublic && 'opacity-55 saturate-[0.65]')}>
                    <AdaptiveProjectImage
                      asset={cover}
                      className="h-full w-full"
                      mode="compact"
                    />
                  </div>
                ) : (
                  <ProjectImagePlaceholder />
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-midnight/90 via-transparent to-midnight/35" />
                <div className="absolute left-4 top-4 flex max-w-[calc(100%-2rem)] flex-wrap gap-2">
                  <Badge variant={settings.isPublic ? 'teal' : 'bronze'}>
                    {settings.isPublic ? 'Public' : 'Private'}
                  </Badge>
                  {settings.featured ? <Badge variant="ember">Featured</Badge> : null}
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

              <div className={cn('p-4 sm:p-5', !settings.isPublic && 'text-stardust/72')}>
                <p className="line-clamp-2 min-h-10 text-sm leading-5 text-stardust/54">
                  {description || 'Add a concise case study summary to introduce this project to recruiters.'}
                </p>

                {warnings.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {warnings.map((warning) => <WarningBadge key={warning} label={warning} />)}
                  </div>
                ) : (
                  <div className="mt-3 inline-flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.13em] text-teal">
                    <Check aria-hidden="true" size={13} />
                    {settings.isPublic ? 'Recruiter ready' : 'Details complete'}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-bronze/14 pt-4">
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
                  {settings.isPublic ? (
                    <p className="max-w-full truncate text-xs text-stardust/38" title={path}>
                      {missingSlug ? 'Link unavailable' : path}
                    </p>
                  ) : null}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Button
                    aria-label={`Edit portfolio settings for ${getPortfolioProjectTitle(project)}`}
                    icon={<Pencil aria-hidden="true" size={15} />}
                    onClick={() => setEditingProjectId(project.id)}
                    size="sm"
                    className={settings.isPublic ? '' : 'sm:col-span-3'}
                    variant="secondary"
                  >
                    Settings
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
                        variant="secondary"
                      >
                        {copiedProjectId === project.id ? 'Copied' : 'Copy Link'}
                      </Button>
                      <Button
                        aria-label={`Preview ${getPortfolioProjectTitle(project)} portfolio project`}
                        disabled={missingSlug}
                        icon={<Eye aria-hidden="true" size={15} />}
                        onClick={() => openProjectPreview(path)}
                        size="sm"
                        variant="ghost"
                      >
                        Preview
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {editingProject ? (
        <ProjectPortfolioSettingsPanel
          editorialCollections={editorialCollections}
          existingProjectSlugs={projects
            .filter((project) => project.id !== editingProject.id)
            .map((project) => getSafePortfolioSettings(project).portfolioSlug)}
          linkedMaterials={linkedMaterials}
          onClose={() => setEditingProjectId(null)}
          onSave={(patch) => {
            onUpdateSettings(editingProject.id, patch);
            setEditingProjectId(null);
          }}
          project={editingProject}
          usernameSlug={usernameSlug}
        />
      ) : null}
    </section>
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

function WarningBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-ember/30 bg-ember/[0.07] px-2 py-0.5 text-[0.62rem] font-medium text-ember">
      <AlertTriangle aria-hidden="true" size={11} /> {label}
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
