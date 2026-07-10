import { useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  BookOpen,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe2,
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
  slugifyPortfolioValue,
  sortPortfolioProjects,
} from '../../lib/portfolio';
import { cn } from '../../lib/classes';
import type { EditorialCollection } from '../../types/editorial';
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
  const profileShareUrl = buildShareUrl(profilePath);
  const readinessReport = useMemo(
    () => getPortfolioReadinessReport(portfolioProfile, projects),
    [portfolioProfile, projects],
  );
  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedPath(link);
      window.setTimeout(() => setCopiedPath(null), 1800);
    } catch {
      setCopiedPath(null);
    }
  };
  const openPreview = (path: string) => {
    window.open(path, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="space-y-7">
      <MobilePageHeader
        badge="Portfolio"
        kicker={`${publicProjects.length} published project${publicProjects.length === 1 ? '' : 's'}`}
        title="Portfolio"
      />
      <PageHeader
        badge="Public story studio"
        description="Curate a public-facing body of work from your Mystic Lore Studio projects."
        title="Portfolio"
      >
        <Button
          aria-label="Open recruiter portfolio preview in a new tab"
          icon={<ExternalLink aria-hidden="true" size={17} />}
          onClick={() => openPreview(profilePath)}
          variant="primary"
        >
          Preview Portfolio
        </Button>
      </PageHeader>

      <PortfolioOverviewStrip
        editorialCount={attachedEditorials.length}
        profileName={portfolioProfile.displayName}
        projectCount={projects.length}
        publicCount={publicProjects.length}
      />

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

          <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <Card className="min-w-0 overflow-hidden">
              <SectionHeading
                icon={<BookOpen aria-hidden="true" size={19} />}
                kicker="Published Editorial Collections"
                title="Stories connected to public work"
              />
              <p className="mt-4 text-sm leading-6 text-stardust/56">
                {attachedEditorials.length
                  ? `${attachedEditorials.length} editorial collection${attachedEditorials.length === 1 ? ' is' : 's are'} attached to visible portfolio projects.`
                  : 'Attach editorial collections from individual project portfolio settings when a deeper campaign story is ready.'}
              </p>
              {attachedEditorials.length ? (
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {attachedEditorials.slice(0, 6).map((collection) => (
                    <div
                      className="flex min-w-0 items-center gap-3 rounded-2xl border border-bronze/18 bg-midnight/28 p-3"
                      key={collection.id}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ember/26 bg-ember/[0.08] text-ember">
                        <BookOpen aria-hidden="true" size={17} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-stardust/84">{collection.title}</p>
                        <p className="mt-0.5 text-xs text-stardust/40">
                          {collection.scenes.length} scene{collection.scenes.length === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <PortfolioSectionEmpty
                  icon={<BookOpen aria-hidden="true" size={20} />}
                  message="Attach an editorial from a public project’s settings when its campaign story is ready to share."
                  title="No published editorials yet"
                />
              )}
            </Card>

            <Card className="min-w-0">
              <SectionHeading
                icon={<Link2 aria-hidden="true" size={19} />}
                kicker="Share Links"
                title="Recruiter-ready links"
              />
              <p className="mt-4 text-sm leading-6 text-stardust/56">
                Here’s a link to my selected apparel design and development work.
              </p>
              <ShareLinksList
                copiedLink={copiedPath}
                editorials={attachedEditorials}
                onCopy={copyLink}
                portfolioLink={profileShareUrl}
                projects={publicProjects}
                usernameSlug={portfolioProfile.usernameSlug || 'untitled'}
              />
            </Card>
          </div>
        </>
      )}
    </section>
  );
}

function PortfolioOverviewStrip({
  editorialCount,
  profileName,
  projectCount,
  publicCount,
}: {
  editorialCount: number;
  profileName: string;
  projectCount: number;
  publicCount: number;
}) {
  const items = [
    { icon: <BriefcaseBusiness aria-hidden="true" size={16} />, label: 'Studio projects', value: projectCount },
    { icon: <Globe2 aria-hidden="true" size={16} />, label: 'Published', value: publicCount },
    { icon: <BookOpen aria-hidden="true" size={16} />, label: 'Editorials', value: editorialCount },
  ];

  return (
    <div className="grid gap-3 border-y border-bronze/18 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ember">
          Portfolio workspace
        </p>
        <p className="mt-1 truncate text-sm text-stardust/58">
          {profileName ? `Curating ${profileName}’s public body of work.` : 'Build a focused public narrative from private studio work.'}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => (
          <div className="flex min-w-[5.5rem] items-center gap-2 rounded-xl border border-bronze/18 bg-stardust/[0.035] px-3 py-2" key={item.label}>
            <span className="text-ember">{item.icon}</span>
            <div>
              <p className="text-sm font-semibold text-stardust">{item.value}</p>
              <p className="hidden text-[0.61rem] uppercase tracking-[0.12em] text-stardust/36 lg:block">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
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
      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_minmax(19rem,0.36fr)]">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <SectionHeading
              icon={<ListChecks aria-hidden="true" size={19} />}
              kicker="Portfolio Readiness"
              title={isReady ? 'Ready for recruiter review' : 'A few details need attention'}
            />
            <Badge className="self-start" variant={isReady ? 'teal' : 'ember'}>
              {isReady ? 'Ready' : 'Needs attention'}
            </Badge>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
            {report.checks.map((check) => (
              <div
                className={cn(
                  'flex items-start gap-2 rounded-xl border px-2.5 py-2 text-[0.7rem] leading-4 sm:items-center sm:gap-2.5 sm:px-3 sm:py-2.5 sm:text-sm',
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
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-ember/24 bg-ember/[0.065] p-4 sm:flex-row sm:items-start">
              <p className="shrink-0 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ember">
                Needs review
              </p>
              <ul className="space-y-1.5 text-sm leading-5 text-stardust/64">
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

        <div className="border-t border-bronze/18 bg-[radial-gradient(circle_at_20%_18%,rgba(45,92,107,0.22),transparent_36%),linear-gradient(145deg,rgba(7,9,10,0.82),rgba(32,21,15,0.78))] p-5 sm:p-6 xl:border-l xl:border-t-0">
          <div className="flex h-full flex-col justify-between gap-4">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-ember/32 bg-ember/10 text-ember shadow-[0_18px_44px_rgba(200,155,60,0.1)]">
                {isReady ? <ShieldCheck aria-hidden="true" size={22} /> : <Sparkles aria-hidden="true" size={22} />}
              </div>
              <p className="mt-4 text-sm leading-6 text-stardust/58">
                Open the sanitized public portfolio exactly as a recruiter will see it.
              </p>
              <p className="mt-3 break-all text-xs leading-5 text-stardust/42">
                {previewPath}
              </p>
            </div>
            {report.suggestions.length ? (
              <p className="border-l border-ember/40 pl-3 text-xs leading-5 text-stardust/46">
                {report.suggestions[0]}
              </p>
            ) : null}
            <Button
              className="w-full"
              icon={<ExternalLink aria-hidden="true" size={17} />}
              onClick={onPreview}
              variant="secondary"
            >
              Preview Portfolio
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function PortfolioSectionEmpty({
  icon,
  message,
  title,
}: {
  icon: ReactNode;
  message: string;
  title: string;
}) {
  return (
    <div className="mt-5 flex items-start gap-3 rounded-2xl border border-dashed border-bronze/24 bg-midnight/20 p-4">
      <span className="mt-0.5 text-stardust/30">{icon}</span>
      <div>
        <p className="text-sm font-medium text-stardust/74">{title}</p>
        <p className="mt-1 text-xs leading-5 text-stardust/42">{message}</p>
      </div>
    </div>
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

function ShareLinksList({
  copiedLink,
  editorials,
  onCopy,
  portfolioLink,
  projects,
  usernameSlug,
}: {
  copiedLink: string | null;
  editorials: EditorialCollection[];
  onCopy: (link: string) => void;
  portfolioLink: string;
  projects: ApparelProject[];
  usernameSlug: string;
}) {
  return (
    <div className="mt-5 space-y-5">
      <ShareLinkGroup title="Main portfolio link">
        <SharePath
          copied={copiedLink === portfolioLink}
          label="Portfolio home"
          onCopy={() => onCopy(portfolioLink)}
          path={portfolioLink}
        />
      </ShareLinkGroup>

      <ShareLinkGroup
        emptyCopy="No public projects yet. Toggle a project public to create recruiter-ready case study links."
        title="Public project links"
      >
        {projects.map((project) => {
          const path = buildPublicPortfolioUrl(
            usernameSlug,
            getSafePortfolioSettings(project).portfolioSlug,
          );
          const link = buildShareUrl(path);
          return (
            <SharePath
              copied={copiedLink === link}
              key={project.id}
              label={getPortfolioProjectTitle(project)}
              onCopy={() => onCopy(link)}
              path={link}
            />
          );
        })}
      </ShareLinkGroup>

      <ShareLinkGroup
        emptyCopy="No public editorial links yet. Attach an editorial collection to a public project to share it."
        title="Public editorial links"
      >
        {editorials.map((collection) => {
          const path = buildPublicEditorialUrl(usernameSlug, collection.title);
          const link = buildShareUrl(path);
          return (
            <SharePath
              copied={copiedLink === link}
              key={collection.id}
              label={collection.title}
              onCopy={() => onCopy(link)}
              path={link}
            />
          );
        })}
      </ShareLinkGroup>
    </div>
  );
}

function ShareLinkGroup({
  children,
  emptyCopy,
  title,
}: {
  children: ReactNode;
  emptyCopy?: string;
  title: string;
}) {
  const hasLinks = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <div>
      <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-stardust/38">
        {title}
      </p>
      <div className="space-y-2.5">
        {hasLinks ? children : (
          <div className="rounded-2xl border border-bronze/16 bg-midnight/22 p-3 text-sm leading-6 text-stardust/45">
            {emptyCopy}
          </div>
        )}
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
      {copied ? (
        <span className="hidden rounded-full border border-teal/24 bg-teal/10 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-teal sm:inline-flex">
          Copied
        </span>
      ) : null}
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

function buildPublicEditorialUrl(usernameSlug: string, editorialTitle: string) {
  return `/portfolio/${slugifyPortfolioValue(usernameSlug)}/editorials/${slugifyPortfolioValue(editorialTitle)}`;
}

function buildShareUrl(path: string) {
  const publicBaseUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim().replace(/\/+$/, '');
  return publicBaseUrl ? `${publicBaseUrl}${path}` : path;
}
