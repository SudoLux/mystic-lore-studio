import type {
  PortfolioProfile,
  PortfolioProjectSettings,
  PortfolioVisibleSections,
} from '../types/portfolio';

export type PortfolioProjectLike = {
  description?: string;
  name?: string;
  portfolio?: Partial<PortfolioProjectSettings>;
  summary?: string;
  title?: string;
  updatedAt?: string;
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
