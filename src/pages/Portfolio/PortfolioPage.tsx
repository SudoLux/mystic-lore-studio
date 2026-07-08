import { useMemo, useState, type ReactNode } from 'react';
import {
  BookOpen,
  BriefcaseBusiness,
  Check,
  Copy,
  Eye,
  EyeOff,
  Link2,
  ShieldCheck,
} from 'lucide-react';
import { PortfolioProfileEditor } from '../../components/portfolio/PortfolioProfileEditor';
import { Badge } from '../../components/shared/Badge';
import { Card } from '../../components/shared/Card';
import { MobilePageHeader } from '../../components/shared/MobilePageHeader';
import { PageHeader } from '../../components/shared/PageHeader';
import { useStudioData } from '../../hooks/useStudioData';
import { cn } from '../../lib/classes';
import {
  buildPublicPortfolioUrl,
  getPortfolioProjectDescription,
  getPortfolioProjectTitle,
  getSafePortfolioSettings,
} from '../../lib/portfolio';
import type { ApparelProject, LocalImageAsset } from '../../types/studio';

export function PortfolioPage() {
  const {
    data: { editorialCollections, portfolioProfile, projects },
    toggleProjectPublic,
    updatePortfolioProfile,
  } = useStudioData();
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const publicProjects = useMemo(
    () => projects
      .filter((project) => getSafePortfolioSettings(project).isPublic)
      .sort((left, right) => {
        const leftSettings = getSafePortfolioSettings(left);
        const rightSettings = getSafePortfolioSettings(right);
        return (leftSettings.sortOrder ?? Number.MAX_SAFE_INTEGER) -
          (rightSettings.sortOrder ?? Number.MAX_SAFE_INTEGER);
      }),
    [projects],
  );
  const attachedEditorialIds = new Set(
    publicProjects.flatMap(
      (project) => getSafePortfolioSettings(project).attachedEditorialCollectionIds,
    ),
  );
  const attachedEditorials = editorialCollections.filter((collection) =>
    attachedEditorialIds.has(collection.id),
  );
  const profileImages = useMemo(() => getPortfolioImageAssets(projects), [projects]);
  const profilePath = buildPublicPortfolioUrl(portfolioProfile.usernameSlug || 'untitled');
  const copyPath = async (path: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopiedPath(path);
      window.setTimeout(() => setCopiedPath(null), 1800);
    } catch {
      setCopiedPath(null);
    }
  };

  return (
    <section className="space-y-5">
      <MobilePageHeader
        badge="Portfolio"
        kicker={`${publicProjects.length} published project${publicProjects.length === 1 ? '' : 's'}`}
        title="Recruiter Portfolio"
      />
      <PageHeader
        badge="Private workspace"
        description="Shape the recruiter-facing story drawn from your strongest garments and editorial collections. Nothing here is publicly published yet."
        title="Portfolio Studio"
      >
        <div className="flex items-center gap-2 rounded-2xl border border-teal/28 bg-teal/10 px-4 py-3 text-sm text-stardust/72">
          <ShieldCheck aria-hidden="true" className="text-teal" size={18} />
          Private preview
        </div>
      </PageHeader>

      {projects.length === 0 ? (
        <EmptyPortfolio />
      ) : (
        <>
          <PortfolioProfileEditor
            imageAssets={profileImages}
            onSave={updatePortfolioProfile}
            profile={portfolioProfile}
            projects={publicProjects}
          />

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.58fr)]">
            <Card className="min-w-0">
              <SectionHeading
                icon={<Eye aria-hidden="true" size={19} />}
                kicker="Project Visibility"
                title="Choose what earns the spotlight"
              />
              <div className="mt-5 divide-y divide-bronze/16">
                {projects.map((project) => (
                  <ProjectVisibilityRow
                    key={project.id}
                    onToggle={(isPublic) => toggleProjectPublic(project.id, isPublic)}
                    project={project}
                  />
                ))}
              </div>
            </Card>

            <Card className="min-w-0">
              <SectionHeading
                icon={<BriefcaseBusiness aria-hidden="true" size={19} />}
                kicker="Published Projects"
                title={`${publicProjects.length} selected`}
              />
              <div className="mt-5 space-y-3">
                {publicProjects.length ? publicProjects.slice(0, 5).map((project, index) => (
                  <div className="flex items-center gap-3 rounded-2xl border border-bronze/18 bg-midnight/30 p-3" key={project.id}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-ember/28 bg-ember/10 text-xs font-semibold text-ember">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-stardust">{getPortfolioProjectTitle(project)}</p>
                      <p className="truncate text-xs text-stardust/42">{project.garmentType} · {project.phase}</p>
                    </div>
                  </div>
                )) : (
                  <QuietEmpty text="Mark a project public to begin the recruiter sequence." />
                )}
              </div>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="min-w-0">
              <SectionHeading
                icon={<BookOpen aria-hidden="true" size={19} />}
                kicker="Editorial Collections"
                title="Presentation stories"
              />
              <p className="mt-4 text-sm leading-6 text-stardust/56">
                {attachedEditorials.length
                  ? `${attachedEditorials.length} editorial collection${attachedEditorials.length === 1 ? ' is' : 's are'} attached to visible portfolio projects.`
                  : 'Attach editorial collections from individual project portfolio settings when a deeper campaign story is ready.'}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {attachedEditorials.slice(0, 6).map((collection) => (
                  <Badge key={collection.id} variant="ember">{collection.title}</Badge>
                ))}
                {!attachedEditorials.length ? <Badge>None attached</Badge> : null}
              </div>
            </Card>

            <Card className="min-w-0">
              <SectionHeading
                icon={<Link2 aria-hidden="true" size={19} />}
                kicker="Share Links"
                title="Private route preparation"
              />
              <p className="mt-4 text-sm leading-6 text-stardust/56">
                These paths prepare the future public portfolio. Copying them does not publish the workspace.
              </p>
              <div className="mt-5 space-y-2.5">
                <SharePath
                  copied={copiedPath === profilePath}
                  label="Portfolio home"
                  onCopy={() => void copyPath(profilePath)}
                  path={profilePath}
                />
                {publicProjects.slice(0, 2).map((project) => {
                  const path = buildPublicPortfolioUrl(
                    portfolioProfile.usernameSlug || 'untitled',
                    getSafePortfolioSettings(project).portfolioSlug,
                  );
                  return (
                    <SharePath
                      copied={copiedPath === path}
                      key={project.id}
                      label={getPortfolioProjectTitle(project)}
                      onCopy={() => void copyPath(path)}
                      path={path}
                    />
                  );
                })}
              </div>
            </Card>
          </div>
        </>
      )}
    </section>
  );
}

function SectionHeading({ icon, kicker, title }: { icon: ReactNode; kicker: string; title: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ember/30 bg-ember/10 text-ember">{icon}</span>
      <div>
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ember">{kicker}</p>
        <h2 className="mt-1 text-lg font-semibold text-stardust">{title}</h2>
      </div>
    </div>
  );
}

function ProjectVisibilityRow({ onToggle, project }: { onToggle: (isPublic: boolean) => void; project: ApparelProject }) {
  const settings = getSafePortfolioSettings(project);
  return (
    <div className="flex items-center gap-3 py-4 first:pt-0 last:pb-0">
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border', settings.isPublic ? 'border-teal/36 bg-teal/10 text-teal' : 'border-bronze/22 bg-midnight/30 text-stardust/38')}>
        {settings.isPublic ? <Eye aria-hidden="true" size={18} /> : <EyeOff aria-hidden="true" size={18} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-stardust">{getPortfolioProjectTitle(project)}</p>
        <p className="mt-1 truncate text-xs text-stardust/42">{getPortfolioProjectDescription(project) || `${project.garmentType} · ${project.phase}`}</p>
      </div>
      <button
        aria-label={`${settings.isPublic ? 'Hide' : 'Show'} ${project.name} in portfolio`}
        aria-pressed={settings.isPublic}
        className={cn('relative h-7 w-12 shrink-0 rounded-full border transition', settings.isPublic ? 'border-teal/55 bg-teal/24' : 'border-bronze/32 bg-midnight/55')}
        onClick={() => onToggle(!settings.isPublic)}
        type="button"
      >
        <span className={cn('absolute top-1 h-[1.1rem] w-[1.1rem] rounded-full shadow transition', settings.isPublic ? 'left-[1.65rem] bg-teal' : 'left-1 bg-stardust/40')} />
      </button>
    </div>
  );
}

function SharePath({ copied, label, onCopy, path }: { copied: boolean; label: string; onCopy: () => void; path: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-bronze/18 bg-midnight/30 p-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-stardust/42">{label}</p>
        <p className="mt-1 truncate text-sm text-stardust/72">{path}</p>
      </div>
      <button aria-label={`Copy ${label} path`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-bronze/28 text-stardust/58 transition hover:border-ember/45 hover:text-ember" onClick={onCopy} type="button">
        {copied ? <Check aria-hidden="true" size={17} /> : <Copy aria-hidden="true" size={17} />}
      </button>
    </div>
  );
}

function QuietEmpty({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed border-bronze/24 bg-midnight/24 p-4 text-sm leading-6 text-stardust/48">{text}</p>;
}

function EmptyPortfolio() {
  return (
    <Card className="relative overflow-hidden py-14 text-center sm:py-20" elevated>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(45,92,107,0.24),transparent_32%),radial-gradient(circle_at_50%_100%,rgba(154,108,60,0.2),transparent_38%)]" />
      <div className="relative mx-auto max-w-xl">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-ember/40 bg-ember/10 text-ember shadow-[0_18px_50px_rgba(200,155,60,0.12)]">
          <BriefcaseBusiness aria-hidden="true" size={27} strokeWidth={1.7} />
        </span>
        <h2 className="font-display mt-6 text-2xl leading-tight text-stardust sm:text-3xl">Your portfolio is waiting for its first legend.</h2>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-stardust/58 sm:text-base">Create projects in Mystic Lore Studio, then choose which ones are ready to share.</p>
      </div>
    </Card>
  );
}

function getPortfolioImageAssets(projects: ApparelProject[]): LocalImageAsset[] {
  const assets = new Map<string, LocalImageAsset>();
  projects.forEach((project) => {
    if (project.heroImage) assets.set(project.heroImage.id, project.heroImage);
    project.galleryImages?.forEach((image) => assets.set(image.id, image));
  });
  return [...assets.values()];
}
