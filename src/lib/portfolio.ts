import type {
  PortfolioProfile,
  PortfolioProjectSettings,
  PortfolioVisibleSections,
} from '../types/portfolio';

export function createDefaultPortfolioProfile(): PortfolioProfile {
  return {
    bio: '',
    displayName: '',
    headline: '',
    updatedAt: new Date().toISOString(),
    usernameSlug: '',
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
): PortfolioProjectSettings {
  return {
    attachedEditorialCollectionIds: [],
    featured: false,
    featuredPortfolioImageIds: [],
    isPublic: false,
    portfolioSlug: portfolioSlug(projectName),
    updatedAt: new Date().toISOString(),
    visibleSections: createDefaultPortfolioVisibleSections(),
  };
}

export function normalizePortfolioProjectSettings(
  settings: Partial<PortfolioProjectSettings> | undefined,
  projectName = '',
  fallbackUpdatedAt?: string,
): PortfolioProjectSettings {
  const defaults = createDefaultPortfolioProjectSettings(projectName);
  const visibleSections = settings?.visibleSections;

  return {
    ...defaults,
    ...settings,
    attachedEditorialCollectionIds: stringArray(settings?.attachedEditorialCollectionIds),
    featured: settings?.featured === true,
    featuredPortfolioImageIds: stringArray(settings?.featuredPortfolioImageIds),
    isPublic: settings?.isPublic === true,
    portfolioSlug:
      typeof settings?.portfolioSlug === 'string' && settings.portfolioSlug.trim()
        ? portfolioSlug(settings.portfolioSlug)
        : defaults.portfolioSlug,
    updatedAt:
      typeof settings?.updatedAt === 'string' && settings.updatedAt
        ? settings.updatedAt
        : fallbackUpdatedAt || defaults.updatedAt,
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

function portfolioSlug(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0))];
}
