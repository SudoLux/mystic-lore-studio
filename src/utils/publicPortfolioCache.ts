import type { PortfolioHomepageSnapshot } from './portfolioSnapshot';
import { slugifyPortfolioValue } from './portfolioUtils';

const PUBLIC_PORTFOLIO_CACHE_PREFIX = 'mystic-lore-studio:public-portfolio';

export function savePublicPortfolioSnapshot(snapshot: PortfolioHomepageSnapshot) {
  if (!canUseLocalStorage()) return;
  const slug = slugifyPortfolioValue(snapshot.profile.usernameSlug);

  try {
    window.localStorage.setItem(cacheKey(slug), JSON.stringify(snapshot));
  } catch {
    // The authenticated studio remains usable when a browser declines this
    // optional, sanitized public-preview cache.
  }
}

export function loadPublicPortfolioSnapshot(usernameSlug: string) {
  if (!canUseLocalStorage()) return null;

  try {
    const serialized = window.localStorage.getItem(
      cacheKey(slugifyPortfolioValue(usernameSlug)),
    );
    if (!serialized) return null;
    const value: unknown = JSON.parse(serialized);
    return isPortfolioSnapshot(value) ? value : null;
  } catch {
    return null;
  }
}

function cacheKey(usernameSlug: string) {
  return `${PUBLIC_PORTFOLIO_CACHE_PREFIX}:${usernameSlug}`;
}

function canUseLocalStorage() {
  return typeof window !== 'undefined' && 'localStorage' in window;
}

function isPortfolioSnapshot(value: unknown): value is PortfolioHomepageSnapshot {
  if (!isRecord(value) || !isRecord(value.profile)) return false;
  return typeof value.generatedAt === 'string'
    && typeof value.profile.usernameSlug === 'string'
    && Array.isArray(value.projects)
    && Array.isArray(value.editorials);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
