import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  BookOpen,
  BriefcaseBusiness,
  Check,
  Copy,
  Eye,
  EyeOff,
  Globe2,
  Link2,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { Badge } from '../../components/shared/Badge';
import { Button } from '../../components/shared/Button';
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
import type { PortfolioProfile } from '../../types/portfolio';
import type { ApparelProject } from '../../types/studio';

export function PortfolioPage() {
  const {
    data: { editorialCollections, portfolioProfile, projects },
    toggleProjectPublic,
    updatePortfolioProfile,
  } = useStudioData();
  const [profileDraft, setProfileDraft] = useState(portfolioProfile);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  useEffect(() => setProfileDraft(portfolioProfile), [portfolioProfile]);

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
  const profileDirty = JSON.stringify(profileDraft) !== JSON.stringify(portfolioProfile);
  const profilePath = buildPublicPortfolioUrl(profileDraft.usernameSlug || 'untitled');

  const saveProfile = () => updatePortfolioProfile(profileDraft);
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
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.7fr)]">
            <Card className="min-w-0" elevated>
              <SectionHeading
                icon={<UserRound aria-hidden="true" size={19} />}
                kicker="Portfolio Profile"
                title="The person behind the work"
              />
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <ProfileField
                  label="Display name"
                  onChange={(value) => setProfileDraft((current) => ({ ...current, displayName: value }))}
                  value={profileDraft.displayName}
                />
                <ProfileField
                  label="Portfolio handle"
                  onChange={(value) => setProfileDraft((current) => ({ ...current, usernameSlug: value }))}
                  prefix="/portfolio/"
                  value={profileDraft.usernameSlug}
                />
                <ProfileField
                  className="sm:col-span-2"
                  label="Headline"
                  onChange={(value) => setProfileDraft((current) => ({ ...current, headline: value }))}
                  value={profileDraft.headline}
                />
                <ProfileField
                  label="Location"
                  onChange={(value) => setProfileDraft((current) => ({ ...current, location: value || undefined }))}
                  value={profileDraft.location ?? ''}
                />
                <ProfileField
                  label="Recruiter email"
                  onChange={(value) => setProfileDraft((current) => ({ ...current, email: value || undefined }))}
                  type="email"
                  value={profileDraft.email ?? ''}
                />
                <ProfileField
                  className="sm:col-span-2"
                  label="Bio"
                  multiline
                  onChange={(value) => setProfileDraft((current) => ({ ...current, bio: value }))}
                  value={profileDraft.bio}
                />
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-bronze/18 pt-5">
                <p className="text-xs leading-5 text-stardust/45">
                  Saved privately to your synced studio profile.
                </p>
                <Button disabled={!profileDirty} onClick={saveProfile} variant="primary">
                  Save Profile
                </Button>
              </div>
            </Card>

            <Card className="min-w-0 overflow-hidden p-0">
              <RecruiterPreview
                profile={profileDraft}
                projects={publicProjects}
              />
            </Card>
          </div>

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
                    profileDraft.usernameSlug || 'untitled',
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

function ProfileField({ className, label, multiline = false, onChange, prefix, type = 'text', value }: {
  className?: string;
  label: string;
  multiline?: boolean;
  onChange: (value: string) => void;
  prefix?: string;
  type?: string;
  value: string;
}) {
  const controlClass = 'min-h-[3.25rem] w-full rounded-xl border border-bronze/26 bg-midnight/42 px-3.5 text-sm text-stardust outline-none transition placeholder:text-stardust/26 focus:border-ember/56 focus:ring-2 focus:ring-ember/10';
  return (
    <label className={className}>
      <span className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-stardust/46">{label}</span>
      <div className="relative">
        {prefix ? <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-stardust/32">{prefix}</span> : null}
        {multiline ? (
          <textarea className={cn(controlClass, 'min-h-24 resize-none py-3')} onChange={(event) => onChange(event.target.value)} value={value} />
        ) : (
          <input className={cn(controlClass, prefix && 'pl-[5.7rem]')} onChange={(event) => onChange(event.target.value)} type={type} value={value} />
        )}
      </div>
    </label>
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

function RecruiterPreview({ profile, projects }: { profile: PortfolioProfile; projects: ApparelProject[] }) {
  return (
    <div className="relative flex min-h-[28rem] flex-col overflow-hidden bg-[radial-gradient(circle_at_75%_18%,rgba(45,92,107,0.28),transparent_28%),linear-gradient(145deg,#11151a,#0a0a0a_52%,#241a14)] p-6 sm:p-7">
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(200,155,60,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(200,155,60,0.06)_1px,transparent_1px)] [background-size:36px_36px]" />
      <div className="relative flex items-center justify-between">
        <Badge variant="ember">Recruiter Preview</Badge>
        <Globe2 aria-hidden="true" className="text-stardust/34" size={19} />
      </div>
      <div className="relative mt-auto">
        <Sparkles aria-hidden="true" className="mb-4 text-ember" size={22} />
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ember">Independent garment studio</p>
        <h2 className="font-display mt-3 text-3xl leading-tight text-stardust sm:text-4xl">{profile.displayName || 'Your name'}</h2>
        <p className="mt-3 max-w-md text-base leading-7 text-stardust/68">{profile.headline || 'Designer, maker, and visual storyteller.'}</p>
        <div className="mt-6 flex items-center gap-3 border-t border-bronze/22 pt-4 text-xs text-stardust/46">
          <span>{projects.length} selected project{projects.length === 1 ? '' : 's'}</span>
          <span aria-hidden="true">·</span>
          <span>{profile.location || 'Location open'}</span>
        </div>
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
