import { useEffect, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Download,
  ImageOff,
  Layers3,
  Mail,
  MapPin,
  Quote,
  Ruler,
  Sparkles,
  SwatchBook,
} from 'lucide-react';
import type {
  PortfolioEditorialSnapshot,
  PortfolioHomepageSnapshot,
  PortfolioImageSnapshot,
  PortfolioProjectSnapshot,
} from '../../utils/portfolioSnapshot';
import { buildPublicPortfolioUrl } from '../../utils/portfolioUtils';

type PublicPortfolioPageProps = {
  editorialProjectSlug?: string;
  editorialSlug?: string;
  isPublished: boolean;
  projectSlug?: string;
  snapshot: PortfolioHomepageSnapshot;
};

export function PublicPortfolioPage({
  editorialProjectSlug,
  editorialSlug,
  isPublished,
  projectSlug,
  snapshot,
}: PublicPortfolioPageProps) {
  const selectedProject = projectSlug
    ? snapshot.projects.find((project) => project.slug === projectSlug)
    : undefined;
  const selectedEditorial = editorialSlug
    ? snapshot.editorials.find((editorial) => editorial.slug === editorialSlug)
    : undefined;
  const selectedEditorialProject = selectedEditorial
    ? snapshot.projects.find((project) =>
        project.editorials.some((editorial) => editorial.key === selectedEditorial.key),
      )
    : undefined;

  useEffect(() => {
    window.scrollTo({ left: 0, top: 0 });
  }, [editorialSlug, projectSlug]);

  useEffect(() => {
    const previousTitle = document.title;
    const description = selectedProject?.description
      || selectedEditorial?.description
      || snapshot.profile.bio
      || `${snapshot.profile.displayName || 'Designer'} portfolio`;
    const descriptionMeta = ensureMetaDescription();
    const previousDescription = descriptionMeta.content;
    document.title = selectedProject
      ? `${selectedProject.title} | ${snapshot.profile.displayName || 'Portfolio'}`
      : selectedEditorial
        ? `${selectedEditorial.title} | ${snapshot.profile.displayName || 'Portfolio'}`
        : `${snapshot.profile.displayName || 'Portfolio'} | Mystic Lore Studio`;
    descriptionMeta.content = description.slice(0, 160);
    return () => {
      document.title = previousTitle;
      descriptionMeta.content = previousDescription;
    };
  }, [selectedEditorial, selectedProject, snapshot.profile.bio, snapshot.profile.displayName]);

  if (!isPublished) {
    if (editorialSlug) return <MissingEditorial profileSlug={snapshot.profile.usernameSlug || publicProfileSlugFallback(snapshot)} />;
    if (projectSlug) return <MissingProject profileSlug={snapshot.profile.usernameSlug || publicProfileSlugFallback(snapshot)} />;
    return <UnpublishedPortfolio />;
  }

  if (editorialSlug) {
    return selectedEditorial ? (
      <PublicEditorialPage
        backProjectSlug={editorialProjectSlug}
        editorial={selectedEditorial}
        ownerProject={selectedEditorialProject}
        profile={snapshot.profile}
      />
    ) : <MissingEditorial profileSlug={snapshot.profile.usernameSlug} />;
  }

  if (projectSlug) {
    return selectedProject ? (
      <PublicProjectPage
        profile={snapshot.profile}
        project={selectedProject}
        projects={snapshot.projects}
      />
    ) : <MissingProject profileSlug={snapshot.profile.usernameSlug} />;
  }

  if (!snapshot.projects.length) {
    return <UnpublishedPortfolio displayName={snapshot.profile.displayName} />;
  }

  return <PortfolioHomepage snapshot={snapshot} />;
}

function PortfolioHomepage({ snapshot }: { snapshot: PortfolioHomepageSnapshot }) {
  const featuredProjects = snapshot.projects.filter((project) => project.featured);
  const selectedProjects = featuredProjects.length
    ? featuredProjects
    : snapshot.projects.slice(0, 2);

  return (
    <PublicPortfolioFrame>
      <PublicHeader profileName={snapshot.profile.displayName} profileSlug={snapshot.profile.usernameSlug} />
      <main>
        <PortfolioHero snapshot={snapshot} />

        {selectedProjects.length ? (
          <PortfolioBand eyebrow="Selected work" title="Featured Projects">
            <div className="grid gap-5 lg:grid-cols-2">
              {selectedProjects.map((project, index) => (
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
              {snapshot.editorials.map((editorial) => (
                <EditorialCard
                  editorial={editorial}
                  href={buildPublicEditorialUrl(snapshot.profile.usernameSlug, editorial.slug)}
                  key={editorial.key}
                />
              ))}
            </div>
          </PortfolioBand>
        ) : null}

        <PortfolioContactBand profile={snapshot.profile} />
      </main>
      <PublicFooter profile={snapshot.profile} />
    </PublicPortfolioFrame>
  );
}

function PortfolioHero({ snapshot }: { snapshot: PortfolioHomepageSnapshot }) {
  const { profile } = snapshot;
  return (
    <section className="relative mx-auto grid max-w-7xl content-center gap-10 px-5 pb-14 pt-24 sm:px-8 sm:pb-20 sm:pt-28 lg:min-h-[820px] lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.62fr)] lg:gap-16 lg:px-12">
      <div className="relative z-10 max-w-4xl">
        <p className="max-w-[18rem] text-[0.66rem] font-semibold uppercase leading-5 tracking-[0.2em] text-ember sm:max-w-none sm:text-xs sm:tracking-[0.22em]">Independent garment portfolio</p>
        <h1 className="font-display mt-5 max-w-4xl text-[clamp(2.8rem,8vw,6.8rem)] leading-[0.98] text-stardust">
          {profile.displayName || 'Mystic Lore Portfolio'}
        </h1>
        {profile.headline ? (
          <p className="mt-6 max-w-3xl text-xl leading-8 text-stardust/78 sm:text-2xl sm:leading-9">
            {profile.headline}
          </p>
        ) : null}
        <div className="mt-6 max-w-2xl border-l border-ember/45 pl-5 sm:pl-6">
          <p className="text-base leading-8 text-stardust/58 sm:text-lg">
            {profile.bio || 'A selected body of garment design, material exploration, and visual storytelling.'}
          </p>
        </div>
        <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
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
        <div className="mt-10 flex items-center gap-5 border-t border-bronze/18 pt-5 text-xs uppercase tracking-[0.16em] text-stardust/38">
          <span>{snapshot.projects.length} case {snapshot.projects.length === 1 ? 'study' : 'studies'}</span>
          {snapshot.editorials.length ? <span>{snapshot.editorials.length} editorial {snapshot.editorials.length === 1 ? 'story' : 'stories'}</span> : null}
        </div>
      </div>
      <div className="flex items-center justify-center lg:justify-end">
        <PortfolioHeroVisual
          fallbackImage={snapshot.projects[0]?.coverImage}
          image={profile.avatar}
          name={profile.displayName}
          year={new Date(snapshot.generatedAt).getFullYear()}
        />
      </div>
    </section>
  );
}

function PortfolioHeroVisual({
  fallbackImage,
  image,
  name,
  year,
}: {
  fallbackImage?: PortfolioImageSnapshot;
  image?: PortfolioImageSnapshot;
  name: string;
  year: number;
}) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const candidates = [image, fallbackImage].filter(
    (candidate, index, items): candidate is PortfolioImageSnapshot =>
      Boolean(candidate?.src) && items.findIndex((item) => item?.src === candidate?.src) === index,
  );
  const activeImage = candidates[sourceIndex];

  useEffect(() => {
    setSourceIndex(0);
  }, [image?.src, fallbackImage?.src]);

  return (
    <div className="relative aspect-[4/5] w-full max-w-[320px] overflow-hidden rounded-[1.25rem] border border-bronze/28 bg-charcoal shadow-[0_40px_110px_rgba(0,0,0,0.48)] sm:max-w-[380px] lg:max-w-[410px]">
      {activeImage?.src ? (
        <img
          alt={activeImage.alt || `${name || 'Portfolio'} portrait`}
          className="h-full w-full"
          onError={() => setSourceIndex((current) => current + 1)}
          src={activeImage.src}
          style={{
            objectFit: activeImage.fit,
            objectPosition: `${activeImage.positionX}% ${activeImage.positionY}%`,
            transform: `scale(${activeImage.zoom})`,
          }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_34%,rgba(45,92,107,0.34),transparent_28%),linear-gradient(145deg,#10191c,#080909_52%,#21170f)]">
          <span className="font-display text-5xl text-ember/78">{portfolioInitials(name)}</span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-midnight/52 via-transparent to-transparent" />
      <div className="pointer-events-none absolute bottom-5 left-5 right-5 flex items-center justify-between border-t border-stardust/22 pt-3 text-[0.62rem] uppercase tracking-[0.18em] text-stardust/58">
        <span>Selected works</span>
        <span>{year}</span>
      </div>
    </div>
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
    <div className="relative aspect-[3/4] overflow-hidden bg-midnight">
      <div className="absolute inset-0 transition duration-700 group-hover:scale-[1.025]">
        <PortfolioImage image={editorial.cover.image} />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0.06),rgba(5,5,5,0.22)_40%,rgba(5,5,5,0.95))]" />
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-ember">{editorial.cover.label || editorial.templateType}</p>
        <h3 className="font-display mt-2 text-2xl leading-tight text-stardust">{editorial.title}</h3>
        {editorial.subtitle ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-stardust/58">{editorial.subtitle}</p> : null}
        <p className="mt-4 inline-flex items-center gap-2 text-xs text-stardust/48"><BookOpen size={14} /> {editorial.scenes.length} scenes</p>
      </div>
    </div>
  );
  const className = "group min-w-[260px] snap-start overflow-hidden rounded-xl border border-bronze/22 bg-[rgba(17,17,17,0.84)] shadow-[0_24px_60px_rgba(0,0,0,0.24)] transition hover:-translate-y-1 hover:border-ember/45 sm:min-w-0";
  return href ? <a className={className} href={href}>{content}</a> : <article className={className}>{content}</article>;
}

function PublicProjectPage({
  profile,
  project,
  projects,
}: {
  profile: PortfolioHomepageSnapshot['profile'];
  project: PortfolioProjectSnapshot;
  projects: readonly PortfolioProjectSnapshot[];
}) {
  const homeHref = buildPublicPortfolioUrl(profile.usernameSlug);
  const projectIndex = projects.findIndex((candidate) => candidate.slug === project.slug);
  const previousProject = projectIndex > 0 ? projects[projectIndex - 1] : undefined;
  const nextProject = projectIndex >= 0 && projectIndex < projects.length - 1
    ? projects[projectIndex + 1]
    : undefined;
  const caseStudy = project.caseStudy;
  const recruiterSkills = caseStudy?.skills.length ? caseStudy.skills : project.skills;
  const recruiterTools = caseStudy?.tools ?? [];
  const overviewCopy = caseStudy?.overview || project.description;
  const hasPublicProcess = Boolean(caseStudy?.processSummary || project.process);
  const hasSkillsAndTools = Boolean(recruiterSkills.length || recruiterTools.length);
  const hasOverviewFacts = Boolean(
    project.overview?.collection
      || project.overview?.season
      || project.overview?.silhouette
      || project.overview?.targetWearer,
  );
  const gallery = project.visibleSections.gallery ? uniqueImages([...project.featuredImages]) : [];
  const hasOverviewDetails = Boolean(
    project.overview?.collection
      || project.overview?.season
      || project.overview?.silhouette
      || project.overview?.targetWearer
      || project.overview?.designIntent
      || overviewCopy
      || caseStudy?.challenge
      || caseStudy?.solution
      || caseStudy?.outcome,
  );

  return (
    <PublicPortfolioFrame>
      <PublicHeader profileName={profile.displayName} profileSlug={profile.usernameSlug} />
      <main>
        <section className="relative flex min-h-[88dvh] overflow-hidden border-b border-bronze/16 bg-midnight">
          <div className="absolute inset-0">
            <PortfolioImage image={project.coverImage} />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,5,5,0.94),rgba(5,5,5,0.62)_48%,rgba(5,5,5,0.14)),linear-gradient(180deg,rgba(5,5,5,0.1),rgba(5,5,5,0.28)_48%,rgba(5,5,5,0.92))]" />
          </div>
          <div className="relative mx-auto flex w-full max-w-7xl flex-col justify-between px-5 pb-12 pt-24 sm:px-8 sm:pb-16 lg:px-12">
            <a className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-stardust/16 bg-midnight/38 px-4 text-sm text-stardust/68 backdrop-blur-md transition hover:border-ember/45 hover:text-ember" href={homeHref}>
              <ArrowLeft size={17} /> Back to portfolio
            </a>
            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-ember">
                {project.overview?.garmentType ? <span>{project.overview.garmentType} case study</span> : null}
                {caseStudy?.role ? <span className="border-l border-ember/35 pl-3 text-stardust/62">{caseStudy.role}</span> : null}
              </div>
              <h1 className="font-display mt-4 text-[clamp(3rem,8vw,7rem)] leading-[0.94] text-stardust [text-shadow:0_8px_40px_rgba(0,0,0,0.5)]">{project.title}</h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-stardust/72 sm:text-xl sm:leading-9">
                {overviewCopy || 'A focused garment study in silhouette, material, and construction.'}
              </p>
              {recruiterSkills.length ? <div className="mt-7"><SkillList skills={recruiterSkills.slice(0, 5)} /></div> : null}
            </div>
          </div>
        </section>

        <ProjectQuickNav project={project} />

        {project.visibleSections.overview && hasOverviewDetails ? (
          <ProjectSection eyebrow="Overview" id="overview" title="Design Direction">
            {hasOverviewFacts ? (
              <div className="grid gap-px overflow-hidden rounded-xl border border-bronze/20 bg-bronze/20 sm:grid-cols-2 lg:grid-cols-4">
                <ProjectFact label="Collection" value={project.overview?.collection ?? ''} />
                <ProjectFact label="Season" value={project.overview?.season ?? ''} />
                <ProjectFact label="Silhouette" value={project.overview?.silhouette ?? ''} />
                <ProjectFact label="For" value={project.overview?.targetWearer ?? ''} />
              </div>
            ) : null}
            {overviewCopy ? (
              <p className="mt-8 max-w-4xl text-lg leading-9 text-stardust/70">{overviewCopy}</p>
            ) : null}
            {!caseStudy?.overview && project.overview?.designIntent ? <p className="mt-8 max-w-4xl text-lg leading-9 text-stardust/65">{project.overview.designIntent}</p> : null}
            {caseStudy?.challenge || caseStudy?.solution || caseStudy?.outcome ? (
              <div className="mt-8 grid gap-4 lg:grid-cols-3">
                {caseStudy.challenge ? <CaseStudyCopyCard label="Challenge" value={caseStudy.challenge} /> : null}
                {caseStudy.solution ? <CaseStudyCopyCard label="Solution" value={caseStudy.solution} /> : null}
                {caseStudy.outcome ? <CaseStudyCopyCard label="Outcome" value={caseStudy.outcome} /> : null}
              </div>
            ) : null}
          </ProjectSection>
        ) : null}

        {project.visibleSections.gallery && gallery.length ? (
          <ProjectSection eyebrow="Selected imagery" id="gallery" title="Gallery">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
              {gallery.map((image, index) => (
                <figure
                  className={`${index === 0 ? 'sm:col-span-2 lg:col-span-8 lg:row-span-2' : 'lg:col-span-4'} ${index === 0 ? 'aspect-[5/4] lg:aspect-auto lg:min-h-[760px]' : 'aspect-[4/5]'} group relative overflow-hidden rounded-xl border border-bronze/22 bg-charcoal`}
                  key={image.reference}
                >
                  <PortfolioImage image={image} />
                  {image.caption ? <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-midnight/92 to-transparent px-5 pb-4 pt-12 text-xs text-stardust/58">{image.caption}</figcaption> : null}
                </figure>
              ))}
            </div>
          </ProjectSection>
        ) : null}

        {project.visibleSections.materials && project.materials.length ? (
          <ProjectSection eyebrow="Material language" id="materials" title="Materials">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {project.materials.map((material, index) => (
                <article className="overflow-hidden rounded-xl border border-bronze/20 bg-[rgba(17,17,17,0.76)]" key={`${material.name}-${index}`}>
                  {material.image ? (
                    <div className="aspect-[16/9] overflow-hidden border-b border-bronze/16 bg-charcoal">
                      <PortfolioImage image={material.image} />
                    </div>
                  ) : null}
                  <div className="flex items-start gap-4 p-5">
                    <span className="mt-1 h-8 w-8 shrink-0 rounded-full border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.32)]" style={{ backgroundColor: material.colorHex || material.color || '#9a6c3c' }} />
                    <div>
                      <p className="text-xs uppercase tracking-[0.17em] text-ember">{material.role || material.category || 'Material'}</p>
                      <h3 className="mt-2 text-lg font-semibold text-stardust">{material.name}</h3>
                      {material.composition ? <p className="mt-2 text-sm leading-6 text-stardust/52">{material.composition}</p> : null}
                      {typeof material.neededYards === 'number' && material.neededYards > 0 ? (
                        <p className="mt-3 text-xs uppercase tracking-[0.14em] text-stardust/40">
                          {formatYards(material.neededYards)} yd planned
                          {typeof material.usedYards === 'number' && material.usedYards > 0
                            ? ` · ${formatYards(material.usedYards)} yd used`
                            : ''}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </ProjectSection>
        ) : null}

        {project.visibleSections.skills && hasSkillsAndTools ? (
          <ProjectSection eyebrow="Capability" id="skills" title="Skills & Tools">
            <div className="grid gap-4 lg:grid-cols-2">
              {recruiterSkills.length ? <CaseStudyTagCard label="Skills" values={recruiterSkills} /> : null}
              {recruiterTools.length ? <CaseStudyTagCard label="Tools" values={recruiterTools} /> : null}
            </div>
          </ProjectSection>
        ) : null}

        {project.visibleSections.process && hasPublicProcess ? (
          <ProjectSection eyebrow="Development" id="process" title="Process">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
              {project.process ? (
                <div className="rounded-xl border border-bronze/22 bg-[rgba(17,17,17,0.76)] p-6">
                  <p className="text-[0.65rem] uppercase tracking-[0.18em] text-stardust/38">Current phase</p>
                  <p className="font-display mt-3 text-3xl text-stardust">{project.process.phase}</p>
                  <p className="mt-6 text-5xl font-semibold text-ember">{project.process.progress}%</p>
                </div>
              ) : <CaseStudyCopyCard label="Process summary" value={caseStudy?.processSummary || ''} />}
              <div className="flex flex-col justify-center rounded-xl border border-bronze/22 bg-[linear-gradient(145deg,rgba(45,92,107,0.12),rgba(17,17,17,0.78),rgba(154,108,60,0.1))] p-6 sm:p-8">
                {project.process ? <><div className="flex items-center justify-between gap-4 text-sm"><span className="text-stardust/60">Development arc</span><span className="font-semibold text-ember">{project.process.progress}% complete</span></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-midnight"><div className="h-full rounded-full bg-[linear-gradient(90deg,#c89b3c,#4f8990,#ede3cf)]" style={{ width: `${project.process.progress}%` }} /></div></> : null}
                <p className="mt-6 max-w-2xl text-sm leading-7 text-stardust/52">{caseStudy?.processSummary || 'The public process view summarizes the project’s development without exposing internal tasks or private working notes.'}</p>
              </div>
            </div>
          </ProjectSection>
        ) : null}

        {project.visibleSections.notes && project.notes.length ? (
          <ProjectSection eyebrow="Published notes" title="Reflections">
            <div className="grid gap-4 md:grid-cols-2">
              {project.notes.map((note, index) => <article className="rounded-xl border border-bronze/20 bg-[rgba(17,17,17,0.76)] p-6" key={`${note.title}-${index}`}><p className="text-xs uppercase tracking-[0.17em] text-ember">{note.category}</p><h3 className="mt-3 text-xl font-semibold text-stardust">{note.title}</h3><p className="mt-4 text-sm leading-7 text-stardust/58">{note.body}</p></article>)}
            </div>
          </ProjectSection>
        ) : null}

        {project.visibleSections.editorials && project.editorials.length ? (
          <ProjectSection eyebrow="Presentation stories" title="Editorial Collections" id="editorials">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {project.editorials.map((editorial) => (
                <EditorialCard
                  editorial={editorial}
                  href={`${buildPublicEditorialUrl(profile.usernameSlug, editorial.slug)}?project=${encodeURIComponent(project.slug)}`}
                  key={editorial.key}
                />
              ))}
            </div>
          </ProjectSection>
        ) : null}

        {previousProject || nextProject ? (
          <ProjectSection eyebrow="More work" title="Continue Exploring">
            <div className="grid gap-4 md:grid-cols-2">
              {previousProject ? (
                <ProjectNavCard direction="Previous" profileSlug={profile.usernameSlug} project={previousProject} />
              ) : <div />}
              {nextProject ? (
                <ProjectNavCard direction="Next" profileSlug={profile.usernameSlug} project={nextProject} />
              ) : null}
            </div>
          </ProjectSection>
        ) : null}
      </main>
      <PublicFooter profile={profile} />
    </PublicPortfolioFrame>
  );
}

function ProjectQuickNav({ project }: { project: PortfolioProjectSnapshot }) {
  const links = [
    project.visibleSections.overview ? { href: '#overview', label: 'Overview' } : null,
    project.visibleSections.gallery && project.featuredImages.length ? { href: '#gallery', label: 'Gallery' } : null,
    project.visibleSections.materials && project.materials.length ? { href: '#materials', label: 'Materials' } : null,
    project.visibleSections.skills && (project.caseStudy?.skills.length || project.caseStudy?.tools.length || project.skills.length) ? { href: '#skills', label: 'Skills' } : null,
    project.visibleSections.process && (project.caseStudy?.processSummary || project.process) ? { href: '#process', label: 'Process' } : null,
    project.visibleSections.editorials && project.editorials.length ? { href: '#editorials', label: 'Editorials' } : null,
  ].filter((link): link is { href: string; label: string } => Boolean(link));

  if (links.length < 2) return null;

  return (
    <nav aria-label="Case study sections" className="sticky top-0 z-20 border-b border-bronze/16 bg-[#080909]/88 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-5 py-3 [scrollbar-width:none] sm:px-8 lg:px-12 [&::-webkit-scrollbar]:hidden">
        {links.map((link, index) => (
          <a
            className="inline-flex min-h-9 shrink-0 items-center rounded-full px-3 text-xs font-semibold uppercase tracking-[0.14em] text-stardust/48 transition hover:bg-stardust/[0.06] hover:text-ember"
            href={link.href}
            key={link.href}
          >
            <span className="mr-2 text-ember/70">{String(index + 1).padStart(2, '0')}</span>
            {link.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

function PublicEditorialPage({
  backProjectSlug,
  editorial,
  ownerProject,
  profile,
}: {
  backProjectSlug?: string;
  editorial: PortfolioEditorialSnapshot;
  ownerProject?: PortfolioProjectSnapshot;
  profile: PortfolioHomepageSnapshot['profile'];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scenes = [...editorial.scenes].sort((left, right) => left.order - right.order);
  const activeScene = scenes[activeIndex];
  const homeHref = buildPublicPortfolioUrl(profile.usernameSlug);
  const projectHref = ownerProject
    ? buildPublicPortfolioUrl(profile.usernameSlug, ownerProject.slug)
    : backProjectSlug
      ? buildPublicPortfolioUrl(profile.usernameSlug, backProjectSlug)
      : homeHref;

  const previousScene = () => setActiveIndex((current) => Math.max(0, current - 1));
  const nextScene = () => setActiveIndex((current) => Math.min(scenes.length - 1, current + 1));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') previousScene();
      if (event.key === 'ArrowRight' || event.key === ' ') {
        event.preventDefault();
        nextScene();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [scenes.length]);

  return (
    <PublicPortfolioFrame>
      <PublicHeader profileName={profile.displayName} profileSlug={profile.usernameSlug} />
      <main>
        <section className="relative min-h-[92dvh] overflow-hidden border-b border-bronze/14">
          <div className="absolute inset-0">
            <PortfolioImage image={editorial.cover.image} />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,5,5,0.94),rgba(5,5,5,0.68)_42%,rgba(5,5,5,0.18)),linear-gradient(180deg,rgba(5,5,5,0.16),rgba(5,5,5,0.92))]" />
          </div>
          <div className="relative mx-auto flex min-h-[92dvh] max-w-7xl flex-col justify-end px-5 pb-14 pt-24 sm:px-8 lg:px-12">
            <div className="mb-auto flex flex-wrap gap-3">
              <a className="inline-flex min-h-11 items-center gap-2 rounded-md border border-bronze/30 bg-midnight/48 px-4 text-sm text-stardust/64 backdrop-blur transition hover:border-ember/50 hover:text-ember" href={projectHref}>
                <ArrowLeft size={17} /> {ownerProject || backProjectSlug ? 'Back to project' : 'Back to portfolio'}
              </a>
              <a className="inline-flex min-h-11 items-center gap-2 rounded-md border border-bronze/20 bg-midnight/34 px-4 text-sm text-stardust/50 backdrop-blur transition hover:border-ember/40 hover:text-ember" href={homeHref}>
                Portfolio home
              </a>
            </div>
            <div className="max-w-5xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ember">{editorial.cover.label || editorial.templateType}</p>
              <h1 className="font-display mt-5 text-[clamp(3rem,9vw,7rem)] leading-[0.95] text-stardust">{editorial.title}</h1>
              {editorial.subtitle ? <p className="mt-6 max-w-3xl text-xl leading-8 text-stardust/74 sm:text-2xl">{editorial.subtitle}</p> : null}
              {editorial.description ? <p className="mt-5 max-w-2xl text-base leading-8 text-stardust/56">{editorial.description}</p> : null}
              <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-stardust/44">
                <span className="inline-flex items-center gap-2 rounded-full border border-bronze/24 px-4 py-2">
                  <BookOpen size={15} /> {scenes.length} scenes
                </span>
                {ownerProject ? (
                  <span className="rounded-full border border-bronze/18 px-4 py-2">From {ownerProject.title}</span>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ember">Scene viewer</p>
              <h2 className="font-display mt-2 text-3xl text-stardust sm:text-4xl">{activeScene?.title || 'Editorial scenes'}</h2>
            </div>
            {scenes.length > 1 ? (
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-bronze/28 text-stardust/62 transition enabled:hover:border-ember/50 enabled:hover:text-ember disabled:opacity-32"
                  disabled={activeIndex === 0}
                  onClick={previousScene}
                  type="button"
                >
                  <ArrowLeft size={18} />
                </button>
                <span className="min-w-20 text-center text-xs uppercase tracking-[0.16em] text-stardust/42">{activeIndex + 1} / {scenes.length}</span>
                <button
                  className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-bronze/28 text-stardust/62 transition enabled:hover:border-ember/50 enabled:hover:text-ember disabled:opacity-32"
                  disabled={activeIndex >= scenes.length - 1}
                  onClick={nextScene}
                  type="button"
                >
                  <ArrowRight size={18} />
                </button>
              </div>
            ) : null}
          </div>

          {activeScene ? (
            <PublicEditorialScene scene={activeScene} images={editorial.images} />
          ) : (
            <EmptyEditorialScene />
          )}

          {scenes.length > 1 ? (
            <div className="mt-8 flex snap-x gap-3 overflow-x-auto pb-2">
              {scenes.map((scene, index) => (
                <button
                  className={`min-w-[12rem] snap-start rounded-lg border p-4 text-left transition ${index === activeIndex ? 'border-ember bg-ember/10' : 'border-bronze/22 bg-[rgba(17,17,17,0.72)] hover:border-ember/42'}`}
                  key={scene.key}
                  onClick={() => setActiveIndex(index)}
                  type="button"
                >
                  <span className="text-[0.62rem] uppercase tracking-[0.16em] text-ember">Scene {index + 1}</span>
                  <span className="mt-2 block truncate text-sm font-semibold text-stardust">{scene.title}</span>
                </button>
              ))}
            </div>
          ) : null}
        </section>
      </main>
      <PublicFooter profile={profile} />
    </PublicPortfolioFrame>
  );
}

function PublicEditorialScene({
  images,
  scene,
}: {
  images: readonly PortfolioImageSnapshot[];
  scene: PortfolioEditorialSnapshot['scenes'][number];
}) {
  const imageMap = new Map(images.map((image) => [image.reference, image]));
  const backgroundImage = scene.background.imageReference
    ? imageMap.get(scene.background.imageReference)
    : undefined;
  const orderedBlocks = [...scene.blocks].sort((left, right) => left.order - right.order);

  return (
    <article className="relative min-h-[620px] overflow-hidden rounded-2xl border border-bronze/22 bg-[rgba(17,17,17,0.82)] shadow-[0_28px_90px_rgba(0,0,0,0.35)]">
      {backgroundImage ? (
        <div className="absolute inset-0 opacity-26">
          <PortfolioImage image={backgroundImage} />
        </div>
      ) : null}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(200,155,60,0.14),transparent_32%),linear-gradient(135deg,rgba(8,9,9,0.92),rgba(11,16,18,0.82),rgba(18,14,11,0.9))]" />
      <div className="relative grid min-h-[620px] gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)] lg:p-10">
        <aside className="flex flex-col justify-between gap-8 border-b border-bronze/16 pb-8 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-ember">{scene.sceneType.replace(/-/g, ' ')}</p>
            <h3 className="font-display mt-4 text-[clamp(2.25rem,5vw,4.8rem)] leading-[1.02] text-stardust">{scene.title}</h3>
            {scene.subtitle ? <p className="mt-5 text-lg leading-8 text-stardust/64">{scene.subtitle}</p> : null}
            {scene.description ? <p className="mt-4 text-sm leading-7 text-stardust/48">{scene.description}</p> : null}
          </div>
          <p className="text-[0.62rem] uppercase tracking-[0.16em] text-stardust/30">{scene.narrativeRole}</p>
        </aside>
        <div className="flex min-w-0 flex-col justify-center gap-6">
          {orderedBlocks.length ? (
            orderedBlocks.map((block) => (
              <PublicEditorialBlock block={block} imageMap={imageMap} key={block.key} />
            ))
          ) : (
            <EmptyEditorialScene />
          )}
        </div>
      </div>
    </article>
  );
}

function PublicEditorialBlock({
  block,
  imageMap,
}: {
  block: PortfolioEditorialSnapshot['scenes'][number]['blocks'][number];
  imageMap: ReadonlyMap<string, PortfolioImageSnapshot>;
}) {
  switch (block.type) {
    case 'heading':
      return <PublicHeadingBlock content={block.content} />;
    case 'paragraph':
    case 'text':
      return <p className="max-w-3xl text-base leading-8 text-stardust/68">{contentText(block.content) || 'Editorial copy'}</p>;
    case 'quote':
      return (
        <figure className="max-w-3xl border-l border-ember/70 py-2 pl-5">
          <Quote className="mb-4 text-ember" size={20} />
          <blockquote className="font-display text-2xl leading-9 text-stardust">{contentText(block.content) || 'Editorial quote'}</blockquote>
          {contentString(block.content, 'attribution') ? (
            <figcaption className="mt-4 text-xs uppercase tracking-[0.16em] text-stardust/42">{contentString(block.content, 'attribution')}</figcaption>
          ) : null}
        </figure>
      );
    case 'image':
      return <PublicImageBlock content={block.content} imageMap={imageMap} />;
    case 'gallery':
      return <PublicGalleryBlock content={block.content} imageMap={imageMap} />;
    case 'divider':
      return <div className="h-px max-w-3xl bg-gradient-to-r from-transparent via-ember/60 to-transparent" />;
    case 'spacer':
      return <div className={contentString(block.content, 'size') === 'large' ? 'h-14' : contentString(block.content, 'size') === 'small' ? 'h-4' : 'h-8'} />;
    case 'fabricSwatch':
    case 'materials':
      return <PublicFabricBlock content={block.content} />;
    case 'measurementTable':
    case 'specifications':
      return <PublicMeasurementTable content={block.content} />;
    case 'callout':
      return <PublicCalloutBlock content={block.content} />;
    default:
      return (
        <div className="max-w-3xl rounded-xl border border-bronze/20 bg-midnight/42 p-5 text-sm leading-7 text-stardust/50">
          This block is not yet supported in the public portfolio viewer.
        </div>
      );
  }
}

function PublicHeadingBlock({ content }: { content: unknown }) {
  const eyebrow = contentString(content, 'eyebrow');
  const align = contentAlign(content);
  return (
    <header className={`${align === 'center' ? 'mx-auto text-center' : align === 'right' ? 'ml-auto text-right' : ''} max-w-4xl`}>
      {eyebrow ? <p className="mb-3 text-[0.62rem] uppercase tracking-[0.2em] text-ember">{eyebrow}</p> : null}
      <h4 className="font-display text-[clamp(2rem,5vw,4rem)] leading-[1.04] text-stardust">{contentText(content) || 'Untitled heading'}</h4>
    </header>
  );
}

function PublicImageBlock({
  content,
  imageMap,
}: {
  content: unknown;
  imageMap: ReadonlyMap<string, PortfolioImageSnapshot>;
}) {
  const reference = contentString(content, 'imageReference');
  const image = reference ? imageMap.get(reference) : undefined;
  const url = contentString(content, 'url');
  const caption = contentString(content, 'caption');
  return (
    <figure className="max-w-5xl overflow-hidden rounded-xl border border-bronze/20 bg-midnight/52">
      <div className="aspect-[4/3]">
        {image ? <PortfolioImage image={image} /> : <PublicExternalImage alt={contentString(content, 'alt', caption || 'Editorial image')} url={url} />}
      </div>
      {caption ? <figcaption className="border-t border-bronze/14 px-4 py-3 text-xs leading-5 text-stardust/48">{caption}</figcaption> : null}
    </figure>
  );
}

function PublicGalleryBlock({
  content,
  imageMap,
}: {
  content: unknown;
  imageMap: ReadonlyMap<string, PortfolioImageSnapshot>;
}) {
  const items = contentArray(content, 'images').flatMap((item, index) => {
    if (!isRecord(item)) return [];
    const reference = stringValue(item.imageReference);
    const image = reference ? imageMap.get(reference) : undefined;
    return [{
      alt: stringValue(item.alt) || `Editorial image ${index + 1}`,
      caption: stringValue(item.caption),
      image,
      url: stringValue(item.url),
    }];
  });
  const visibleItems = items.length ? items : [{ alt: 'Image unavailable', caption: undefined, image: undefined, url: undefined }];
  return (
    <div className="grid max-w-6xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {visibleItems.map((item, index) => (
        <figure className="overflow-hidden rounded-xl border border-bronze/20 bg-midnight/52" key={`${item.image?.reference || item.url || 'missing'}-${index}`}>
          <div className="aspect-[3/4]">
            {item.image ? <PortfolioImage image={item.image} /> : <PublicExternalImage alt={item.alt} url={item.url} />}
          </div>
          {item.caption ? <figcaption className="px-3 py-2 text-xs text-stardust/45">{item.caption}</figcaption> : null}
        </figure>
      ))}
    </div>
  );
}

function PublicFabricBlock({ content }: { content: unknown }) {
  const name = contentString(content, 'name', 'Fabric story');
  const composition = contentString(content, 'composition');
  const notes = contentString(content, 'notes');
  const color = contentString(content, 'colorHex', '#9a6c3c');
  return (
    <article className="flex max-w-xl items-center gap-4 rounded-xl border border-bronze/20 bg-midnight/52 p-4">
      <span className="h-14 w-14 shrink-0 rounded-full border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.32)]" style={{ backgroundColor: color }} />
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-ember">
          <SwatchBook size={14} />
          <span className="text-[0.58rem] uppercase tracking-[0.16em]">Fabric Story</span>
        </div>
        <h4 className="mt-2 text-base font-semibold text-stardust">{name}</h4>
        {composition ? <p className="mt-1 text-xs text-stardust/52">{composition}</p> : null}
        {notes ? <p className="mt-2 text-xs leading-5 text-stardust/42">{notes}</p> : null}
      </div>
    </article>
  );
}

function PublicMeasurementTable({ content }: { content: unknown }) {
  const title = contentString(content, 'title', 'Measurements');
  const columns = contentArray(content, 'columns').filter((item): item is string => typeof item === 'string');
  const rows = contentArray(content, 'rows').flatMap((item) => {
    if (!isRecord(item)) return [];
    const label = stringValue(item.label);
    const values = Array.isArray(item.values)
      ? item.values.filter((value): value is string => typeof value === 'string')
      : [];
    return label ? [{ label, values }] : [];
  });
  return (
    <section className="max-w-4xl overflow-hidden rounded-xl border border-bronze/20 bg-midnight/52">
      <header className="flex items-center gap-2 border-b border-bronze/14 px-4 py-3 text-ember">
        <Ruler size={15} />
        <h4 className="text-xs font-semibold uppercase tracking-[0.16em]">{title}</h4>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
          <tbody>
            {(rows.length ? rows : [{ label: 'No measurements published', values: columns.map(() => '—') }]).map((row) => (
              <tr className="border-t border-bronze/10 text-stardust/68" key={row.label}>
                <th className="px-4 py-3 font-medium text-stardust">{row.label}</th>
                {(columns.length ? columns : ['Value']).map((column, index) => <td className="px-4 py-3" key={`${row.label}-${column}`}>{row.values[index] ?? '—'}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PublicCalloutBlock({ content }: { content: unknown }) {
  const title = contentString(content, 'title');
  return (
    <aside className="max-w-3xl rounded-xl border border-ember/34 bg-ember/[0.08] p-5">
      {title ? <h4 className="text-sm font-semibold text-stardust">{title}</h4> : null}
      <p className={`${title ? 'mt-2' : ''} text-sm leading-7 text-stardust/66`}>
        {contentString(content, 'body') || contentText(content) || 'Editorial note'}
      </p>
    </aside>
  );
}

function PublicExternalImage({ alt, url }: { alt: string; url?: string }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[linear-gradient(145deg,#10191c,#080909_52%,#21170f)] px-4 text-center text-stardust/42">
        <ImageOff size={24} />
        <span className="text-xs">Image unavailable</span>
      </div>
    );
  }
  return <img alt={alt} className="h-full w-full object-cover" onError={() => setFailed(true)} src={url} />;
}

function EmptyEditorialScene() {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-bronze/18 bg-midnight/40 px-6 text-center">
      <Sparkles className="text-ember/70" size={26} />
      <p className="mt-4 text-sm leading-7 text-stardust/50">This scene is ready for its public story.</p>
    </div>
  );
}

function PublicPortfolioFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#080909] text-stardust [background-image:linear-gradient(rgba(200,155,60,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(200,155,60,0.025)_1px,transparent_1px),linear-gradient(135deg,#080909_0%,#0b1012_48%,#120e0b_100%)] [background-size:48px_48px,48px_48px,100%_100%]">
      {children}
    </div>
  );
}

function PortfolioContactBand({ profile }: { profile: PortfolioHomepageSnapshot['profile'] }) {
  if (!profile.email && !profile.resumeUrl) return null;

  return (
    <section className="border-t border-bronze/14 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <div className="relative overflow-hidden rounded-2xl border border-bronze/24 bg-[radial-gradient(circle_at_82%_18%,rgba(45,92,107,0.25),transparent_30%),linear-gradient(135deg,rgba(17,17,17,0.96),rgba(29,20,15,0.9))] px-6 py-10 sm:px-10 sm:py-14 lg:flex lg:items-end lg:justify-between lg:gap-10">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ember">Start a conversation</p>
            <h2 className="font-display mt-4 text-3xl leading-tight text-stardust sm:text-5xl">Interested in the work behind the garments?</h2>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-stardust/56 sm:text-base">Reach out for roles, collaborations, or a closer look at the development process.</p>
          </div>
          <div className="mt-8 flex shrink-0 flex-wrap gap-3 lg:mt-0">
            {profile.email ? <PublicAction href={`mailto:${profile.email}`} icon={<Mail size={17} />} label="Contact" primary /> : null}
            {profile.resumeUrl ? <PublicAction href={profile.resumeUrl} icon={<Download size={17} />} label="View Resume" /> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function PublicHeader({ profileName, profileSlug }: { profileName: string; profileSlug: string }) {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <a className="font-display text-sm text-stardust sm:text-base" href={buildPublicPortfolioUrl(profileSlug)}>{profileName || 'Mystic Lore'}</a>
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

function ProjectSection({ children, eyebrow, id, title }: { children: ReactNode; eyebrow: string; id?: string; title: string }) {
  return (
    <section className="scroll-mt-16 border-t border-bronze/14 py-14 sm:py-20" id={id}>
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ember">{eyebrow}</p>
        <h2 className="font-display mb-8 mt-3 text-3xl text-stardust sm:text-4xl">{title}</h2>
        {children}
      </div>
    </section>
  );
}

function ProjectNavCard({
  direction,
  profileSlug,
  project,
}: {
  direction: 'Next' | 'Previous';
  profileSlug: string;
  project: PortfolioProjectSnapshot;
}) {
  return (
    <a
      className="group flex min-h-32 items-center justify-between gap-5 rounded-xl border border-bronze/22 bg-[rgba(17,17,17,0.76)] p-5 transition hover:border-ember/45"
      href={buildPublicPortfolioUrl(profileSlug, project.slug)}
    >
      <div>
        <p className="text-[0.65rem] uppercase tracking-[0.18em] text-ember">{direction} project</p>
        <h3 className="font-display mt-2 text-2xl leading-tight text-stardust">{project.title}</h3>
        {project.description ? (
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-stardust/50">{project.description}</p>
        ) : null}
      </div>
      <ArrowRight
        className={`shrink-0 text-ember transition group-hover:translate-x-1 ${direction === 'Previous' ? 'rotate-180 group-hover:-translate-x-1' : ''}`}
        size={22}
      />
    </a>
  );
}

function ProjectFact({ label, value }: { label: string; value: string }) {
  return <div className="bg-[#0d0f0f] p-5"><p className="text-[0.65rem] uppercase tracking-[0.17em] text-stardust/38">{label}</p><p className="mt-2 text-sm font-semibold text-stardust">{value || 'Not specified'}</p></div>;
}

function CaseStudyCopyCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-bronze/20 bg-[linear-gradient(145deg,rgba(45,92,107,0.08),rgba(17,17,17,0.78),rgba(154,108,60,0.06))] p-5 sm:p-6">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-ember">{label}</p>
      <p className="mt-4 text-sm leading-7 text-stardust/66">{value}</p>
    </article>
  );
}

function CaseStudyTagCard({ label, values }: { label: string; values: readonly string[] }) {
  return (
    <article className="rounded-xl border border-bronze/20 bg-[rgba(17,17,17,0.76)] p-5 sm:p-6">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-ember">{label}</p>
      <div className="mt-4"><SkillList skills={values} /></div>
    </article>
  );
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
          <p className="mt-4 text-sm leading-7 text-stardust/54">This case study is not available or no longer part of the published portfolio.</p>
          <a className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-md border border-bronze/34 px-4 text-sm text-stardust transition hover:border-ember/50 hover:text-ember" href={buildPublicPortfolioUrl(profileSlug)}><ArrowLeft size={17} /> Back to portfolio</a>
        </section>
      </main>
    </PublicPortfolioFrame>
  );
}

function MissingEditorial({ profileSlug }: { profileSlug: string }) {
  return (
    <PublicPortfolioFrame>
      <main className="flex min-h-dvh items-center justify-center px-5 py-16">
        <section className="max-w-lg text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-bronze/30 bg-charcoal text-ember"><BookOpen size={25} /></span>
          <h1 className="font-display mt-6 text-4xl text-stardust">Editorial unavailable.</h1>
          <p className="mt-4 text-sm leading-7 text-stardust/54">This editorial collection is not available or no longer part of the published portfolio.</p>
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

function publicProfileSlugFallback(snapshot: PortfolioHomepageSnapshot) {
  return snapshot.profile.usernameSlug || 'portfolio';
}

function formatYards(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
}

function portfolioInitials(value: string) {
  const initials = value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  return initials || 'ML';
}

function buildPublicEditorialUrl(usernameSlug: string, editorialSlug: string) {
  return `/portfolio/${usernameSlug}/editorials/${editorialSlug}`;
}

function ensureMetaDescription() {
  const existing = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (existing) return existing;

  const meta = document.createElement('meta');
  meta.name = 'description';
  document.head.appendChild(meta);
  return meta;
}

function contentString(content: unknown, key: string, fallback = ''): string {
  if (typeof content === 'string') return content;
  if (!isRecord(content)) return fallback;
  const value = content[key];
  return typeof value === 'string' ? value : fallback;
}

function contentArray(content: unknown, key: string): unknown[] {
  if (!isRecord(content)) return [];
  const value = content[key];
  return Array.isArray(value) ? value : [];
}

function contentText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (typeof content === 'number' || typeof content === 'boolean') return String(content);
  if (content === null || content === undefined) return '';
  if (Array.isArray(content)) {
    return content
      .map((item) => typeof item === 'string' ? item : JSON.stringify(item))
      .join(' · ');
  }
  if (isRecord(content)) {
    for (const key of ['text', 'body', 'quote', 'heading', 'title', 'value']) {
      const value = content[key];
      if (typeof value === 'string') return value;
    }
  }
  return '';
}

function contentAlign(content: unknown) {
  const align = contentString(content, 'align');
  return align === 'center' || align === 'right' ? align : 'left';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}
