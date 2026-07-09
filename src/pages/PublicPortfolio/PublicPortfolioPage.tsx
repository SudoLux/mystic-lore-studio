import { useEffect, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Download,
  Layers3,
  Mail,
  MapPin,
  Sparkles,
} from 'lucide-react';
import type {
  PortfolioEditorialSnapshot,
  PortfolioHomepageSnapshot,
  PortfolioImageSnapshot,
  PortfolioProjectSnapshot,
} from '../../utils/portfolioSnapshot';
import { buildPublicPortfolioUrl } from '../../utils/portfolioUtils';

type PublicPortfolioPageProps = {
  isPublished: boolean;
  projectSlug?: string;
  snapshot: PortfolioHomepageSnapshot;
};

export function PublicPortfolioPage({
  isPublished,
  projectSlug,
  snapshot,
}: PublicPortfolioPageProps) {
  const selectedProject = projectSlug
    ? snapshot.projects.find((project) => project.slug === projectSlug)
    : undefined;

  useEffect(() => {
    window.scrollTo({ left: 0, top: 0 });
  }, [projectSlug]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = selectedProject
      ? `${selectedProject.title} | ${snapshot.profile.displayName || 'Portfolio'}`
      : `${snapshot.profile.displayName || 'Portfolio'} | Mystic Lore Studio`;
    return () => {
      document.title = previousTitle;
    };
  }, [selectedProject, snapshot.profile.displayName]);

  if (!isPublished || !snapshot.projects.length) {
    return <UnpublishedPortfolio displayName={isPublished ? snapshot.profile.displayName : undefined} />;
  }

  if (projectSlug && !selectedProject) {
    return <MissingProject profileSlug={snapshot.profile.usernameSlug} />;
  }

  return selectedProject ? (
    <PublicProjectPage profile={snapshot.profile} project={selectedProject} />
  ) : (
    <PortfolioHomepage snapshot={snapshot} />
  );
}

function PortfolioHomepage({ snapshot }: { snapshot: PortfolioHomepageSnapshot }) {
  const featuredProjects = snapshot.projects.filter((project) => project.featured);

  return (
    <PublicPortfolioFrame>
      <PublicHeader profileName={snapshot.profile.displayName} />
      <main>
        <PortfolioHero snapshot={snapshot} />

        {featuredProjects.length ? (
          <PortfolioBand eyebrow="Selected work" title="Featured Projects">
            <div className="grid gap-5 lg:grid-cols-2">
              {featuredProjects.map((project, index) => (
                <FeaturedProjectCard
                  index={index}
                  key={project.slug}
                  profileSlug={snapshot.profile.usernameSlug}
                  project={project}
                />
              ))}
            </div>
          </PortfolioBand>
        ) : null}

        <PortfolioBand eyebrow="Case studies" title="All Public Projects">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {snapshot.projects.map((project) => (
              <ProjectCard
                key={project.slug}
                profileSlug={snapshot.profile.usernameSlug}
                project={project}
              />
            ))}
          </div>
        </PortfolioBand>

        {snapshot.editorials.length ? (
          <PortfolioBand eyebrow="Campaign stories" title="Editorial Collections">
            <div className="-mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
              {snapshot.editorials.map((editorial) => {
                const owner = snapshot.projects.find((project) =>
                  project.editorials.some((candidate) => candidate.key === editorial.key),
                );
                return (
                  <EditorialCard
                    editorial={editorial}
                    href={owner
                      ? `${buildPublicPortfolioUrl(snapshot.profile.usernameSlug, owner.slug)}#${editorial.key}`
                      : undefined}
                    key={editorial.key}
                  />
                );
              })}
            </div>
          </PortfolioBand>
        ) : null}
      </main>
      <PublicFooter profile={snapshot.profile} />
    </PublicPortfolioFrame>
  );
}

function PortfolioHero({ snapshot }: { snapshot: PortfolioHomepageSnapshot }) {
  const { profile } = snapshot;
  return (
    <section className="relative mx-auto grid max-w-7xl content-center gap-8 px-5 pb-10 pt-20 sm:gap-10 sm:px-8 sm:pb-14 sm:pt-24 lg:min-h-[760px] lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.55fr)] lg:px-12">
      <div className="max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ember">Independent garment portfolio</p>
        <h1 className="font-display mt-5 max-w-4xl text-[clamp(2.8rem,8vw,6.8rem)] leading-[0.98] text-stardust">
          {profile.displayName || 'Mystic Lore Portfolio'}
        </h1>
        {profile.headline ? (
          <p className="mt-6 max-w-3xl text-xl leading-8 text-stardust/78 sm:text-2xl sm:leading-9">
            {profile.headline}
          </p>
        ) : null}
        {profile.bio ? (
          <p className="mt-5 max-w-2xl text-base leading-8 text-stardust/56 sm:text-lg">
            {profile.bio}
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          {profile.email ? (
            <PublicAction href={`mailto:${profile.email}`} icon={<Mail size={17} />} label="Contact" primary />
          ) : null}
          {profile.resumeUrl ? (
            <PublicAction href={profile.resumeUrl} icon={<Download size={17} />} label="Resume" />
          ) : null}
          {profile.location ? (
            <span className="inline-flex min-h-11 items-center gap-2 px-2 text-sm text-stardust/52">
              <MapPin aria-hidden="true" size={17} />
              {profile.location}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex items-center justify-center lg:justify-end">
        {profile.avatar?.src ? (
          <div className="aspect-[4/5] w-60 overflow-hidden rounded-[2rem] border border-bronze/28 bg-charcoal shadow-[0_35px_90px_rgba(0,0,0,0.42)] sm:w-72 lg:w-full lg:max-w-[320px]">
            <PortfolioImage image={profile.avatar} />
          </div>
        ) : (
          <div className="flex aspect-square w-44 items-center justify-center rounded-full border border-bronze/30 bg-[linear-gradient(145deg,rgba(45,92,107,0.22),rgba(10,10,10,0.94),rgba(154,108,60,0.2))] text-ember shadow-[0_28px_80px_rgba(0,0,0,0.38)] sm:w-56">
            <BriefcaseBusiness aria-hidden="true" size={44} strokeWidth={1.35} />
          </div>
        )}
      </div>
    </section>
  );
}

function FeaturedProjectCard({
  index,
  profileSlug,
  project,
}: {
  index: number;
  profileSlug: string;
  project: PortfolioProjectSnapshot;
}) {
  return (
    <a
      className="group relative min-h-[420px] overflow-hidden rounded-2xl border border-bronze/28 bg-charcoal shadow-[0_24px_70px_rgba(0,0,0,0.3)] transition duration-300 hover:-translate-y-1 hover:border-ember/52"
      href={buildPublicPortfolioUrl(profileSlug, project.slug)}
    >
      <PortfolioImage image={project.coverImage} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0.08),rgba(5,5,5,0.24)_38%,rgba(5,5,5,0.95))]" />
      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ember">Featured {String(index + 1).padStart(2, '0')}</p>
        <h3 className="font-display mt-3 text-3xl leading-tight text-stardust sm:text-4xl">{project.title}</h3>
        <p className="mt-3 line-clamp-2 max-w-xl text-sm leading-6 text-stardust/68">{project.description}</p>
        <div className="mt-5 flex items-center justify-between gap-4">
          <SkillList skills={project.skills.slice(0, 3)} />
          <ArrowRight className="shrink-0 text-ember transition group-hover:translate-x-1" size={21} />
        </div>
      </div>
    </a>
  );
}

function ProjectCard({ profileSlug, project }: { profileSlug: string; project: PortfolioProjectSnapshot }) {
  return (
    <a className="group overflow-hidden rounded-xl border border-bronze/22 bg-[rgba(17,17,17,0.82)] transition duration-300 hover:border-ember/48" href={buildPublicPortfolioUrl(profileSlug, project.slug)}>
      <div className="aspect-[4/3] overflow-hidden bg-midnight">
        <PortfolioImage image={project.coverImage} />
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-display text-xl leading-tight text-stardust">{project.title}</h3>
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-stardust/54">{project.description}</p>
          </div>
          <ArrowRight className="mt-1 shrink-0 text-ember transition group-hover:translate-x-1" size={19} />
        </div>
        {project.skills.length ? <div className="mt-5"><SkillList skills={project.skills.slice(0, 3)} /></div> : null}
      </div>
    </a>
  );
}

function EditorialCard({ editorial, href }: { editorial: PortfolioEditorialSnapshot; href?: string }) {
  const content = (
    <>
      <div className="aspect-[3/4] overflow-hidden bg-midnight">
        <PortfolioImage image={editorial.cover.image} />
      </div>
      <div className="p-5">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-ember">{editorial.cover.label || editorial.templateType}</p>
        <h3 className="font-display mt-2 text-xl leading-tight text-stardust">{editorial.title}</h3>
        {editorial.subtitle ? <p className="mt-2 text-sm text-stardust/52">{editorial.subtitle}</p> : null}
        <p className="mt-4 inline-flex items-center gap-2 text-xs text-stardust/44"><BookOpen size={14} /> {editorial.scenes.length} scenes</p>
      </div>
    </>
  );
  const className = "group min-w-[260px] snap-start overflow-hidden rounded-xl border border-bronze/22 bg-[rgba(17,17,17,0.84)] transition hover:border-ember/45 sm:min-w-0";
  return href ? <a className={className} href={href}>{content}</a> : <article className={className}>{content}</article>;
}

function PublicProjectPage({
  profile,
  project,
}: {
  profile: PortfolioHomepageSnapshot['profile'];
  project: PortfolioProjectSnapshot;
}) {
  const homeHref = buildPublicPortfolioUrl(profile.usernameSlug);
  const gallery = uniqueImages([project.coverImage, ...project.featuredImages]);

  return (
    <PublicPortfolioFrame>
      <PublicHeader profileName={profile.displayName} />
      <main>
        <section className="mx-auto max-w-7xl px-5 pb-14 pt-24 sm:px-8 lg:px-12">
          <a className="inline-flex min-h-11 items-center gap-2 text-sm text-stardust/58 transition hover:text-ember" href={homeHref}>
            <ArrowLeft size={17} /> Portfolio
          </a>
          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(360px,1.2fr)] lg:items-center">
            <div className="max-w-2xl">
              {project.overview?.garmentType ? <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ember">{project.overview.garmentType}</p> : null}
              <h1 className="font-display mt-4 text-[clamp(2.7rem,7vw,5.8rem)] leading-[0.98] text-stardust">{project.title}</h1>
              {project.description ? <p className="mt-6 text-lg leading-8 text-stardust/62">{project.description}</p> : null}
              {project.skills.length ? <div className="mt-7"><SkillList skills={project.skills} /></div> : null}
            </div>
            <div className="aspect-[4/5] max-h-[760px] overflow-hidden rounded-2xl border border-bronze/28 bg-charcoal shadow-[0_30px_90px_rgba(0,0,0,0.38)]">
              <PortfolioImage image={project.coverImage} />
            </div>
          </div>
        </section>

        {project.overview ? (
          <ProjectSection eyebrow="Overview" title="Design Direction">
            <div className="grid gap-px overflow-hidden rounded-xl border border-bronze/20 bg-bronze/20 sm:grid-cols-2 lg:grid-cols-4">
              <ProjectFact label="Collection" value={project.overview.collection} />
              <ProjectFact label="Season" value={project.overview.season} />
              <ProjectFact label="Silhouette" value={project.overview.silhouette} />
              <ProjectFact label="For" value={project.overview.targetWearer} />
            </div>
            {project.overview.designIntent ? <p className="mt-8 max-w-4xl text-lg leading-9 text-stardust/65">{project.overview.designIntent}</p> : null}
          </ProjectSection>
        ) : null}

        {gallery.length ? (
          <ProjectSection eyebrow="Selected imagery" title="Gallery">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {gallery.map((image, index) => (
                <div className={`${index === 0 ? 'sm:col-span-2 lg:row-span-2' : ''} aspect-[4/5] overflow-hidden rounded-xl border border-bronze/22 bg-charcoal`} key={image.reference}>
                  <PortfolioImage image={image} />
                </div>
              ))}
            </div>
          </ProjectSection>
        ) : null}

        {project.materials.length ? (
          <ProjectSection eyebrow="Material language" title="Materials">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {project.materials.map((material, index) => (
                <article className="rounded-xl border border-bronze/20 bg-[rgba(17,17,17,0.76)] p-5" key={`${material.name}-${index}`}>
                  <div className="flex items-start gap-4">
                    <span className="mt-1 h-8 w-8 shrink-0 rounded-full border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.32)]" style={{ backgroundColor: material.colorHex || material.color || '#9a6c3c' }} />
                    <div>
                      <p className="text-xs uppercase tracking-[0.17em] text-ember">{material.role || material.category || 'Material'}</p>
                      <h3 className="mt-2 text-lg font-semibold text-stardust">{material.name}</h3>
                      {material.composition ? <p className="mt-2 text-sm leading-6 text-stardust/52">{material.composition}</p> : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </ProjectSection>
        ) : null}

        {project.process ? (
          <ProjectSection eyebrow="Development" title="Process">
            <div className="max-w-3xl rounded-xl border border-bronze/22 bg-[rgba(17,17,17,0.76)] p-6">
              <div className="flex items-center justify-between gap-4 text-sm"><span className="text-stardust/60">{project.process.phase}</span><span className="font-semibold text-ember">{project.process.progress}%</span></div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-midnight"><div className="h-full rounded-full bg-[linear-gradient(90deg,#c89b3c,#4f8990,#ede3cf)]" style={{ width: `${project.process.progress}%` }} /></div>
            </div>
          </ProjectSection>
        ) : null}

        {project.notes.length ? (
          <ProjectSection eyebrow="Published notes" title="Reflections">
            <div className="grid gap-4 md:grid-cols-2">
              {project.notes.map((note, index) => <article className="rounded-xl border border-bronze/20 bg-[rgba(17,17,17,0.76)] p-6" key={`${note.title}-${index}`}><p className="text-xs uppercase tracking-[0.17em] text-ember">{note.category}</p><h3 className="mt-3 text-xl font-semibold text-stardust">{note.title}</h3><p className="mt-4 text-sm leading-7 text-stardust/58">{note.body}</p></article>)}
            </div>
          </ProjectSection>
        ) : null}

        {project.editorials.length ? (
          <ProjectSection eyebrow="Presentation stories" title="Editorial Collections">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {project.editorials.map((editorial) => <EditorialCard editorial={editorial} key={editorial.key} />)}
            </div>
          </ProjectSection>
        ) : null}
      </main>
      <PublicFooter profile={profile} />
    </PublicPortfolioFrame>
  );
}

function PublicPortfolioFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#080909] text-stardust [background-image:linear-gradient(rgba(200,155,60,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(200,155,60,0.025)_1px,transparent_1px),linear-gradient(135deg,#080909_0%,#0b1012_48%,#120e0b_100%)] [background-size:48px_48px,48px_48px,100%_100%]">
      {children}
    </div>
  );
}

function PublicHeader({ profileName }: { profileName: string }) {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <a className="font-display text-sm text-stardust sm:text-base" href="/">{profileName || 'Mystic Lore'}</a>
        <span className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-stardust/38">Portfolio</span>
      </div>
    </header>
  );
}

function PortfolioBand({ children, eyebrow, title }: { children: ReactNode; eyebrow: string; title: string }) {
  return (
    <section className="border-t border-bronze/14 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ember">{eyebrow}</p>
        <h2 className="font-display mb-8 mt-3 text-3xl text-stardust sm:text-4xl">{title}</h2>
        {children}
      </div>
    </section>
  );
}

function ProjectSection({ children, eyebrow, title }: { children: ReactNode; eyebrow: string; title: string }) {
  return (
    <section className="border-t border-bronze/14 py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ember">{eyebrow}</p>
        <h2 className="font-display mb-8 mt-3 text-3xl text-stardust sm:text-4xl">{title}</h2>
        {children}
      </div>
    </section>
  );
}

function ProjectFact({ label, value }: { label: string; value: string }) {
  return <div className="bg-[#0d0f0f] p-5"><p className="text-[0.65rem] uppercase tracking-[0.17em] text-stardust/38">{label}</p><p className="mt-2 text-sm font-semibold text-stardust">{value || 'Not specified'}</p></div>;
}

function PublicAction({ href, icon, label, primary = false }: { href: string; icon: ReactNode; label: string; primary?: boolean }) {
  const external = !href.startsWith('mailto:') && /^https?:\/\//.test(href);
  return <a className={`inline-flex min-h-11 items-center gap-2 rounded-md border px-4 text-sm font-semibold transition ${primary ? 'border-ember bg-ember text-midnight hover:bg-[#d9af55]' : 'border-bronze/36 text-stardust hover:border-ember/60 hover:text-ember'}`} href={href} rel={external ? 'noreferrer' : undefined} target={external ? '_blank' : undefined}>{icon}{label}</a>;
}

function SkillList({ skills }: { skills: readonly string[] }) {
  if (!skills.length) return null;
  return <div className="flex flex-wrap gap-2">{skills.map((skill) => <span className="rounded-full border border-bronze/30 bg-midnight/48 px-3 py-1.5 text-xs text-stardust/68" key={skill}>{skill}</span>)}</div>;
}

function PortfolioImage({ image }: { image?: PortfolioImageSnapshot }) {
  const [failed, setFailed] = useState(false);
  if (!image?.src || failed) return <ImageFallback />;
  return <img alt={image.alt} className="h-full w-full transition duration-500" onError={() => setFailed(true)} src={image.src} style={{ objectFit: image.fit, objectPosition: `${image.positionX}% ${image.positionY}%`, transform: `scale(${image.zoom})` }} />;
}

function ImageFallback() {
  return <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(145deg,#10191c,#080909_52%,#21170f)] text-ember/70"><Sparkles aria-hidden="true" size={28} strokeWidth={1.35} /></div>;
}

function PublicFooter({ profile }: { profile: PortfolioHomepageSnapshot['profile'] }) {
  return (
    <footer className="border-t border-bronze/16 py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 text-sm text-stardust/42 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <p>Generated with Mystic Lore Studio</p>
        <div className="flex flex-wrap gap-4">
          {profile.email ? <a className="transition hover:text-ember" href={`mailto:${profile.email}`}>Contact</a> : null}
          {profile.resumeUrl ? <a className="transition hover:text-ember" href={profile.resumeUrl}>Resume</a> : null}
        </div>
      </div>
    </footer>
  );
}

function UnpublishedPortfolio({ displayName }: { displayName?: string }) {
  return (
    <PublicPortfolioFrame>
      <main className="flex min-h-dvh items-center justify-center px-5 py-16">
        <section className="max-w-xl text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-bronze/30 bg-charcoal text-ember"><Layers3 size={25} /></span>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-ember">{displayName || 'Mystic Lore Portfolio'}</p>
          <h1 className="font-display mt-4 text-4xl leading-tight text-stardust sm:text-5xl">This portfolio is not published yet.</h1>
          <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-stardust/54">Selected garment stories will appear here when they are ready for public view.</p>
        </section>
      </main>
    </PublicPortfolioFrame>
  );
}

function MissingProject({ profileSlug }: { profileSlug: string }) {
  return (
    <PublicPortfolioFrame>
      <main className="flex min-h-dvh items-center justify-center px-5 py-16">
        <section className="max-w-lg text-center">
          <h1 className="font-display text-4xl text-stardust">Project unavailable.</h1>
          <p className="mt-4 text-sm leading-7 text-stardust/54">This case study is private, missing, or no longer part of the published portfolio.</p>
          <a className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-md border border-bronze/34 px-4 text-sm text-stardust transition hover:border-ember/50 hover:text-ember" href={buildPublicPortfolioUrl(profileSlug)}><ArrowLeft size={17} /> Back to portfolio</a>
        </section>
      </main>
    </PublicPortfolioFrame>
  );
}

function uniqueImages(images: Array<PortfolioImageSnapshot | undefined>): PortfolioImageSnapshot[] {
  const seen = new Set<string>();
  return images.filter((image): image is PortfolioImageSnapshot => {
    if (!image || seen.has(image.reference)) return false;
    seen.add(image.reference);
    return true;
  });
}
