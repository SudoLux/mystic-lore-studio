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

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
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
                    onClick={() => setEditingProjectId(project.id)}
                    size="sm"
                    variant="secondary"
                  >
                    Edit Settings
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
                        disabled={missingSlug}
                        icon={<Eye aria-hidden="true" size={15} />}
                        onClick={() => openProjectPreview(path)}
                        size="sm"
                        variant="ghost"
                      >
                        Preview Project
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
