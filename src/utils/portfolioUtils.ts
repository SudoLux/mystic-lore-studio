import type {
  PortfolioProfile,
  PortfolioProjectSettings,
  PortfolioVisibleSections,
} from '../types/portfolio';
import type { EditorialCollection } from '../types/editorial';
import type { LocalImageAsset } from '../types/studio';

export type PortfolioProjectLike = {
  description?: string;
  galleryImages?: Array<{ id: string }>;
  generalNotes?: string;
  heroImage?: { id: string };
  linkedMaterials?: Array<{ id: string }>;
  name?: string;
  portfolio?: Partial<PortfolioProjectSettings>;
  summary?: string;
  title?: string;
  updatedAt?: string;
};

export type PortfolioReadinessStatus = 'needs_attention' | 'ready';

export type PortfolioReadinessCheck = {
  label: string;
  passed: boolean;
  state: 'needs_attention' | 'ready' | 'warning';
};

export type PortfolioReadinessReport = {
  checks: PortfolioReadinessCheck[];
  score: number;
  status: PortfolioReadinessStatus;
  suggestions: string[];
  warnings: string[];
};

export type PortfolioReadinessInput = {
  assets: readonly Pick<LocalImageAsset, 'id'>[];
  editorialCollections: readonly Pick<EditorialCollection, 'id'>[];
  portfolioProfile: Partial<PortfolioProfile>;
  projects: readonly PortfolioProjectLike[];
};

export function slugifyPortfolioValue(value: string): string {
  const slug = value
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'untitled';
}

export function ensureUniquePortfolioSlug(
  baseSlug: string,
  existingSlugs: string[],
): string {
  const normalizedBase = slugifyPortfolioValue(baseSlug);
  const usedSlugs = new Set(existingSlugs.map(slugifyPortfolioValue));
  if (!usedSlugs.has(normalizedBase)) return normalizedBase;

  let suffix = 2;
  while (usedSlugs.has(`${normalizedBase}-${suffix}`)) suffix += 1;
  return `${normalizedBase}-${suffix}`;
}

export function getPortfolioProjectTitle(project: PortfolioProjectLike): string {
  return firstText(
    project.portfolio?.customPortfolioTitle,
    project.name,
    project.title,
  ) || 'Untitled Project';
}

export function getPortfolioProjectDescription(
  project: PortfolioProjectLike,
): string {
  return firstText(
    project.portfolio?.customPortfolioDescription,
    project.description,
    project.summary,
  );
}

export function buildPublicPortfolioUrl(
  usernameSlug: string,
  projectSlug?: string,
): string {
  const profilePath = `/portfolio/${slugifyPortfolioValue(usernameSlug)}`;
  return projectSlug?.trim()
    ? `${profilePath}/${slugifyPortfolioValue(projectSlug)}`
    : profilePath;
}

export function createDefaultPortfolioProfile(
  updatedAt = '',
): PortfolioProfile {
  return {
    bio: '',
    displayName: '',
    headline: '',
    updatedAt,
    usernameSlug: '',
  };
}

export function normalizePortfolioProfile(
  profile: Partial<PortfolioProfile> | undefined,
): PortfolioProfile {
  const defaults = createDefaultPortfolioProfile();

  return {
    avatarImageId: optionalText(profile?.avatarImageId),
    bio: text(profile?.bio),
    displayName: text(profile?.displayName),
    email: optionalText(profile?.email),
    headline: text(profile?.headline),
    location: optionalText(profile?.location),
    publishedAt: optionalText(profile?.publishedAt),
    resumeUrl: optionalText(profile?.resumeUrl),
    updatedAt: text(profile?.updatedAt) || defaults.updatedAt,
    usernameSlug: profile?.usernameSlug?.trim()
      ? slugifyPortfolioValue(profile.usernameSlug)
      : defaults.usernameSlug,
  };
}

export function createDefaultPortfolioVisibleSections(): PortfolioVisibleSections {
  return {
    downloads: false,
    editorials: true,
    gallery: true,
    materials: true,
    notes: false,
    overview: true,
    process: true,
    skills: true,
  };
}

export function createDefaultPortfolioProjectSettings(
  projectName = '',
  updatedAt = '',
): PortfolioProjectSettings {
  return {
    attachedEditorialCollectionIds: [],
    featured: false,
    featuredPortfolioImageIds: [],
    isPublic: false,
    portfolioSlug: slugifyPortfolioValue(projectName),
    updatedAt,
    visibleSections: createDefaultPortfolioVisibleSections(),
  };
}

export function normalizePortfolioProjectSettings(
  settings: Partial<PortfolioProjectSettings> | undefined,
  projectName = '',
  fallbackUpdatedAt = '',
): PortfolioProjectSettings {
  const defaults = createDefaultPortfolioProjectSettings(
    projectName,
    fallbackUpdatedAt,
  );
  const visibleSections = settings?.visibleSections;

  return {
    ...defaults,
    ...settings,
    attachedEditorialCollectionIds: stringArray(
      settings?.attachedEditorialCollectionIds,
    ),
    featured: settings?.featured === true,
    featuredPortfolioImageIds: stringArray(
      settings?.featuredPortfolioImageIds,
    ),
    isPublic: settings?.isPublic === true,
    portfolioSlug:
      typeof settings?.portfolioSlug === 'string'
        ? slugifyPortfolioValue(settings.portfolioSlug)
        : defaults.portfolioSlug,
    updatedAt:
      typeof settings?.updatedAt === 'string'
        ? settings.updatedAt
        : defaults.updatedAt,
    visibleSections: {
      downloads: visibleSections?.downloads === true,
      editorials: visibleSections?.editorials !== false,
      gallery: visibleSections?.gallery !== false,
      materials: visibleSections?.materials !== false,
      notes: visibleSections?.notes === true,
      overview: visibleSections?.overview !== false,
      process: visibleSections?.process !== false,
      skills: visibleSections?.skills !== false,
    },
  };
}

export function getSafePortfolioSettings(
  project: PortfolioProjectLike,
): PortfolioProjectSettings {
  return normalizePortfolioProjectSettings(
    project.portfolio,
    firstText(project.name, project.title),
    project.updatedAt,
  );
}

export function sortPortfolioProjects<T extends PortfolioProjectLike>(
  projects: readonly T[],
): T[] {
  return [...projects].sort((left, right) => {
    const leftSettings = getSafePortfolioSettings(left);
    const rightSettings = getSafePortfolioSettings(right);
    if (leftSettings.isPublic !== rightSettings.isPublic) {
      return leftSettings.isPublic ? -1 : 1;
    }
    if (leftSettings.featured !== rightSettings.featured) {
      return leftSettings.featured ? -1 : 1;
    }

    const updatedDifference = portfolioTimestamp(right) - portfolioTimestamp(left);
    if (updatedDifference) return updatedDifference;
    return getPortfolioProjectTitle(left).localeCompare(
      getPortfolioProjectTitle(right),
    );
  });
}

export function getPortfolioReadinessReport({
  assets,
  editorialCollections,
  portfolioProfile,
  projects,
}: PortfolioReadinessInput): PortfolioReadinessReport {
  const normalizedProfile = normalizePortfolioProfile(portfolioProfile);
  const assetIds = new Set(assets.map((asset) => asset.id));
  const editorialIds = new Set(editorialCollections.map((collection) => collection.id));
  const publicProjects = projects.filter(
    (project) => getSafePortfolioSettings(project).isPublic,
  );
  const hasPublicProjects = publicProjects.length > 0;
  const publicProjectsWithMissingSlug = publicProjects.filter(
    (project) => !getSafePortfolioSettings(project).portfolioSlug || getSafePortfolioSettings(project).portfolioSlug === 'untitled',
  );
  const publicProjectsWithMissingTitle = publicProjects.filter(
    (project) => getPortfolioProjectTitle(project) === 'Untitled Project',
  );
  const publicProjectsWithMissingCover = publicProjects.filter(
    (project) => !hasPortfolioCoverImage(project, assetIds),
  );
  const publicProjectsWithMissingDescription = publicProjects.filter(
    (project) => !getPortfolioProjectDescription(project),
  );
  const publicProjectsWithMissingFeaturedImages = publicProjects.filter((project) => {
    const settings = getSafePortfolioSettings(project);
    return settings.visibleSections.gallery
      && !settings.featuredPortfolioImageIds.some((imageId) => assetIds.has(imageId));
  });
  const publicProjectsMissingEditorials = publicProjects.filter((project) => {
    const settings = getSafePortfolioSettings(project);
    return settings.visibleSections.editorials
      && !settings.attachedEditorialCollectionIds.some((collectionId) => editorialIds.has(collectionId));
  });
  const publicProjectsMissingMaterials = publicProjects.filter((project) => {
    const settings = getSafePortfolioSettings(project);
    return settings.visibleSections.materials && !project.linkedMaterials?.length;
  });
  const publicProjectsWithUnavailableDownloads = publicProjects.filter(
    (project) => getSafePortfolioSettings(project).visibleSections.downloads,
  );
  const projectsWithPublicNotes = publicProjects.filter(
    (project) => getSafePortfolioSettings(project).visibleSections.notes,
  );

  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (!normalizedProfile.displayName) {
    warnings.push('Add a display name before sharing the portfolio.');
  }
  if (!normalizedProfile.usernameSlug) {
    warnings.push('Add a username slug so the public portfolio URL is stable.');
  }
  if (!normalizedProfile.headline) {
    warnings.push('Add a portfolio headline so recruiters understand your role quickly.');
  }
  if (!normalizedProfile.bio) {
    warnings.push('Add a short bio that frames your design and technical strengths.');
  }
  if (!hasPublicProjects) {
    warnings.push('Mark at least one project public before sharing.');
  }
  publicProjectsWithMissingSlug.forEach((project) => {
    warnings.push(`${getPortfolioProjectTitle(project)} needs a portfolio URL slug.`);
  });
  publicProjectsWithMissingTitle.forEach((project) => {
    warnings.push(`${getPortfolioProjectTitle(project)} needs a recruiter-facing title.`);
  });
  publicProjectsWithMissingCover.forEach((project) => {
    warnings.push(`${getPortfolioProjectTitle(project)} needs a public cover image.`);
  });
  publicProjectsWithMissingDescription.forEach((project) => {
    warnings.push(`${getPortfolioProjectTitle(project)} needs a recruiter-facing description.`);
  });
  publicProjectsMissingEditorials.forEach((project) => {
    warnings.push(`${getPortfolioProjectTitle(project)} has Editorials enabled but no editorial collections attached.`);
  });
  publicProjectsWithMissingFeaturedImages.forEach((project) => {
    warnings.push(`${getPortfolioProjectTitle(project)} has Gallery enabled but no featured images selected.`);
  });
  publicProjectsMissingMaterials.forEach((project) => {
    warnings.push(`${getPortfolioProjectTitle(project)} has Materials enabled but no materials are linked.`);
  });
  publicProjectsWithUnavailableDownloads.forEach((project) => {
    warnings.push(`${getPortfolioProjectTitle(project)} has Downloads enabled, but no public download assets are available yet.`);
  });
  projectsWithPublicNotes.forEach((project) => {
    warnings.push(`${getPortfolioProjectTitle(project)} has Notes enabled. Review them carefully before sharing.`);
  });

  if (!normalizedProfile.email) {
    suggestions.push('Add a contact email when you are ready for recruiters to reach out.');
  }
  if (!normalizedProfile.resumeUrl) {
    suggestions.push('Add a resume URL if you want the public portfolio to link directly to it.');
  }
  if (!publicProjects.some((project) => getSafePortfolioSettings(project).featured)) {
    suggestions.push('Feature one or two strongest public projects so they appear first.');
  }

  const checks: PortfolioReadinessCheck[] = [
    {
      label: 'Display name is ready',
      passed: Boolean(normalizedProfile.displayName),
      state: normalizedProfile.displayName ? 'ready' : 'needs_attention',
    },
    {
      label: 'Headline is ready',
      passed: Boolean(normalizedProfile.headline),
      state: normalizedProfile.headline ? 'ready' : 'needs_attention',
    },
    {
      label: 'Bio is ready',
      passed: Boolean(normalizedProfile.bio),
      state: normalizedProfile.bio ? 'ready' : 'needs_attention',
    },
    {
      label: 'Public portfolio URL is ready',
      passed: Boolean(normalizedProfile.usernameSlug),
      state: normalizedProfile.usernameSlug ? 'ready' : 'needs_attention',
    },
    {
      label: 'At least one public project',
      passed: hasPublicProjects,
      state: hasPublicProjects ? 'ready' : 'needs_attention',
    },
    {
      label: 'Each public project has a portfolio URL',
      passed: hasPublicProjects && publicProjectsWithMissingSlug.length === 0,
      state: hasPublicProjects && publicProjectsWithMissingSlug.length === 0 ? 'ready' : 'needs_attention',
    },
    {
      label: 'Each public project has a title',
      passed: hasPublicProjects && publicProjectsWithMissingTitle.length === 0,
      state: hasPublicProjects && publicProjectsWithMissingTitle.length === 0 ? 'ready' : 'needs_attention',
    },
    {
      label: 'Each public project has a cover image',
      passed: hasPublicProjects && publicProjectsWithMissingCover.length === 0,
      state: hasPublicProjects && publicProjectsWithMissingCover.length === 0 ? 'ready' : 'needs_attention',
    },
    {
      label: 'Each public project has a description',
      passed: hasPublicProjects && publicProjectsWithMissingDescription.length === 0,
      state: hasPublicProjects && publicProjectsWithMissingDescription.length === 0 ? 'ready' : 'needs_attention',
    },
    {
      label: 'Gallery selections are ready when enabled',
      passed: hasPublicProjects && publicProjectsWithMissingFeaturedImages.length === 0,
      state: hasPublicProjects && publicProjectsWithMissingFeaturedImages.length === 0 ? 'ready' : 'needs_attention',
    },
    {
      label: 'Attached editorials exist if Editorials is enabled',
      passed: hasPublicProjects && publicProjectsMissingEditorials.length === 0,
      state: hasPublicProjects && publicProjectsMissingEditorials.length === 0 ? 'ready' : 'needs_attention',
    },
    {
      label: 'Materials are linked when Materials is enabled',
      passed: hasPublicProjects && publicProjectsMissingMaterials.length === 0,
      state: hasPublicProjects && publicProjectsMissingMaterials.length === 0 ? 'ready' : 'needs_attention',
    },
    {
      label: 'Downloads have public files available',
      passed: hasPublicProjects && publicProjectsWithUnavailableDownloads.length === 0,
      state: hasPublicProjects && publicProjectsWithUnavailableDownloads.length === 0 ? 'ready' : 'needs_attention',
    },
    {
      label: 'Notes are not accidentally enabled',
      passed: projectsWithPublicNotes.length === 0,
      state: projectsWithPublicNotes.length ? 'warning' : 'ready',
    },
  ];
  const score = Math.round(
    (checks.filter((check) => check.passed).length / checks.length) * 100,
  );

  return {
    checks,
    score,
    status: warnings.length ? 'needs_attention' : 'ready',
    suggestions,
    warnings,
  };
}

function firstText(...values: Array<string | undefined>) {
  return values.find((value) => value?.trim())?.trim() ?? '';
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean))];
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function optionalText(value: unknown): string | undefined {
  return text(value) || undefined;
}

function portfolioTimestamp(project: PortfolioProjectLike): number {
  const settings = getSafePortfolioSettings(project);
  const timestamp = Date.parse(settings.updatedAt || project.updatedAt || '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function hasPortfolioCoverImage(
  project: PortfolioProjectLike,
  assetIds: ReadonlySet<string>,
): boolean {
  const settings = getSafePortfolioSettings(project);
  const selectedCoverId = settings.portfolioCoverImageId?.trim();
  if (selectedCoverId) {
    return assetIds.has(selectedCoverId);
  }
  return Boolean(
    (project.heroImage && assetIds.has(project.heroImage.id))
      || project.galleryImages?.some((image) => assetIds.has(image.id)),
  );
}
