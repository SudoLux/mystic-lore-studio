import { slugifyPortfolioValue } from '../utils/portfolioUtils';
import type { PageId } from '../types/navigation';

export type AppRoute = {
  fabricId?: string;
  page: PageId;
  productionGarmentId?: string;
  projectId?: string;
  technicalGarmentId?: string;
};

export type PublicPortfolioRoute = {
  editorialProjectSlug?: string;
  editorialSlug?: string;
  projectSlug?: string;
  usernameSlug: string;
};

/**
 * Parses the legacy hash routes without touching browser state. Keeping this
 * small parser separate makes the currently shipped route behavior testable.
 */
export function parseStudioHashRoute(hash: string): AppRoute {
  const [section = 'dashboard', recordId] = hash
    .replace(/^#\/?/, '')
    .split('/');

  if (section === 'projects' && recordId) {
    return { page: 'projects', projectId: recordId };
  }

  if (section === 'projects') return { page: 'projects' };

  if (section === 'technical') return recordId
    ? { page: 'technical', technicalGarmentId: recordId }
    : { page: 'technical' };

  if (section === 'production') return recordId
    ? { page: 'production', productionGarmentId: recordId }
    : { page: 'production' };

  if (section === 'fabrics') {
    return recordId
      ? { page: 'fabrics', fabricId: recordId }
      : { page: 'fabrics' };
  }

  if (
    section === 'dashboard' ||
    section === 'kanban' ||
    section === 'production' ||
    section === 'versions' ||
    section === 'lookbooks' ||
    section === 'portfolio' ||
    section === 'stats' ||
    section === 'settings'
  ) {
    return { page: section };
  }

  return { page: 'dashboard' };
}

/** Parses public portfolio paths without requiring a signed-in studio session. */
export function parsePublicPortfolioRoute(
  pathname: string,
  search = '',
): PublicPortfolioRoute | null {
  const [section, usernameSlug, contentType, contentSlug] = pathname
    .split('/')
    .filter(Boolean);

  if (section !== 'portfolio' || !usernameSlug) return null;

  if (contentType === 'editorials') {
    const editorialProjectSlug = new URLSearchParams(search).get('project');
    return {
      editorialProjectSlug: editorialProjectSlug
        ? slugifyPortfolioValue(editorialProjectSlug)
        : undefined,
      editorialSlug: contentSlug ? slugifyPortfolioValue(contentSlug) : undefined,
      usernameSlug: slugifyPortfolioValue(usernameSlug),
    };
  }

  return {
    projectSlug: contentType ? slugifyPortfolioValue(contentType) : undefined,
    usernameSlug: slugifyPortfolioValue(usernameSlug),
  };
}

export function getInitialRoute(): AppRoute {
  return parseStudioHashRoute(window.location.hash);
}

export function getPublicPortfolioRoute(): PublicPortfolioRoute | null {
  return parsePublicPortfolioRoute(window.location.pathname, window.location.search);
}
