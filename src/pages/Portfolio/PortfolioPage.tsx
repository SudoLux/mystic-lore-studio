import { useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Link2,
  ListChecks,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { PortfolioProfileEditor } from '../../components/portfolio/PortfolioProfileEditor';
import { PortfolioProjectVisibilityManager } from '../../components/portfolio/PortfolioProjectVisibilityManager';
import { Badge } from '../../components/shared/Badge';
import { Button } from '../../components/shared/Button';
import { Card } from '../../components/shared/Card';
import { MobilePageHeader } from '../../components/shared/MobilePageHeader';
import { PageHeader } from '../../components/shared/PageHeader';
import { useStudioData } from '../../hooks/useStudioData';
import {
  buildPublicPortfolioUrl,
  getPortfolioReadinessReport,
  getPortfolioProjectTitle,
  getSafePortfolioSettings,
  sortPortfolioProjects,
} from '../../lib/portfolio';
import { cn } from '../../lib/classes';
import type { ApparelProject, LocalImageAsset } from '../../types/studio';

export function PortfolioPage() {
  const {
    data: { editorialCollections, linkedMaterials, portfolioProfile, projects },
    updatePortfolioProfile,
    updateProjectPortfolioSettings,
  } = useStudioData();
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const publicProjects = useMemo(
    () => sortPortfolioProjects(projects).filter(
      (project) => getSafePortfolioSettings(project).isPublic,
    ),
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
  const readinessReport = useMemo(
    () => getPortfolioReadinessReport(portfolioProfile, projects),
    [portfolioProfile, projects],
  );
  const copyPath = async (path: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopiedPath(path);
      window.setTimeout(() => setCopiedPath(null), 1800);
    } catch {
      setCopiedPath(null);
    }
  };
  const openPreview = (path: string) => {
    window.open(path, '_blank', 'noopener,noreferrer');
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
        description="Shape the recruiter-facing story drawn from your strongest garments and editorial collections, then preview the public route before sharing."
        title="Portfolio Studio"
      >
        <Button
          aria-label="Open recruiter portfolio preview in a new tab"
          icon={<ExternalLink aria-hidden="true" size={17} />}
          onClick={() => openPreview(profilePath)}
          variant="primary"
        >
          Recruiter Preview
        </Button>
      </PageHeader>

      <PortfolioReadinessCard
        onPreview={() => openPreview(profilePath)}
        previewPath={profilePath}
        report={readinessReport}
      />

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

          <PortfolioProjectVisibilityManager
            editorialCollections={editorialCollections}
            linkedMaterials={linkedMaterials}
            onUpdateSettings={updateProjectPortfolioSettings}
            projects={projects}
            usernameSlug={portfolioProfile.usernameSlug}
          />

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

function PortfolioReadinessCard({
  onPreview,
  previewPath,
  report,
}: {
  onPreview: () => void;
  previewPath: string;
  report: ReturnType<typeof getPortfolioReadinessReport>;
}) {
  const isReady = report.status === 'ready';

  return (
    <Card className="overflow-hidden p-0" elevated>
      <div className="grid gap-0 lg:grid-cols-[minmax(0,0.9fr)_minmax(18rem,0.55fr)]">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <SectionHeading
              icon={<ListChecks aria-hidden="true" size={19} />}
              kicker="Recruiter Preview"
              title={isReady ? 'Portfolio is ready to preview' : 'Portfolio needs attention'}
            />
            <Badge className="self-start" variant={isReady ? 'teal' : 'ember'}>
              {isReady ? 'Ready' : 'Needs attention'}
            </Badge>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {report.checks.map((check) => (
              <div
                className={cn(
                  'flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm',
                  check.passed
                    ? 'border-teal/20 bg-teal/[0.055] text-stardust/72'
                    : 'border-ember/24 bg-ember/[0.07] text-stardust/72',
                )}
                key={check.label}
              >
                {check.passed ? (
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-teal" size={16} />
                ) : (
                  <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0 text-ember" size={16} />
                )}
                <span>{check.label}</span>
              </div>
            ))}
          </div>

          {report.warnings.length ? (
            <div className="mt-5 rounded-2xl border border-ember/24 bg-ember/[0.065] p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ember">
                Warnings
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-stardust/64">
                {report.warnings.map((warning, index) => (
                  <li className="flex gap-2" key={`${warning}-${index}`}>
                    <AlertTriangle aria-hidden="true" className="mt-1 shrink-0 text-ember" size={14} />
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="border-t border-bronze/18 bg-[radial-gradient(circle_at_20%_18%,rgba(45,92,107,0.22),transparent_36%),linear-gradient(145deg,rgba(7,9,10,0.82),rgba(32,21,15,0.78))] p-5 sm:p-6 lg:border-l lg:border-t-0">
          <div className="flex h-full flex-col justify-between gap-5">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-ember/32 bg-ember/10 text-ember shadow-[0_18px_44px_rgba(200,155,60,0.1)]">
                {isReady ? <ShieldCheck aria-hidden="true" size={22} /> : <Sparkles aria-hidden="true" size={22} />}
              </div>
              <p className="mt-5 text-sm leading-6 text-stardust/58">
                Preview the exact public homepage recruiters will see. This opens the sanitized public portfolio route outside the private studio shell.
              </p>
              <p className="mt-3 break-all text-xs leading-5 text-stardust/42">
                {previewPath}
              </p>
            </div>
            {report.suggestions.length ? (
              <div className="rounded-2xl border border-bronze/18 bg-midnight/28 p-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-stardust/42">
                  Suggestions
                </p>
                <ul className="mt-3 space-y-2 text-xs leading-5 text-stardust/54">
                  {report.suggestions.map((suggestion, index) => (
                    <li key={`${suggestion}-${index}`}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <Button
              className="w-full"
              icon={<ExternalLink aria-hidden="true" size={17} />}
              onClick={onPreview}
              variant="secondary"
            >
              Open Recruiter Preview
            </Button>
          </div>
        </div>
      </div>
    </Card>
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

function EmptyPortfolio() {
  return (
    <Card className="relative overflow-hidden py-14 text-center sm:py-20" elevated>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(45,92,107,0.24),transparent_32%),radial-gradient(circle_at_50%_100%,rgba(154,108,60,0.2),transparent_38%)]" />
      <div className="relative mx-auto max-w-xl">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-ember/40 bg-ember/10 text-ember shadow-[0_18px_50px_rgba(200,155,60,0.12)]">
          <Link2 aria-hidden="true" size={27} strokeWidth={1.7} />
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
