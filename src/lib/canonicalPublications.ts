import { supabase } from './supabase';
import type { PortfolioHomepageSnapshot } from '../utils/portfolioSnapshot';

type PublicationRow = { public_path: string; snapshot_json: unknown };

/**
 * Anonymous portfolio reads intentionally have no private-domain imports. The
 * database RLS policy is the second boundary: only current immutable public
 * rows can be returned.
 */
export function fetchPublicPortfolio(usernameSlug: string) {
  return fetchCurrentPublication(`/portfolio/${safeSlug(usernameSlug)}`);
}

export function fetchPublishedPortfolioProject(usernameSlug: string, projectSlug: string) {
  return fetchCurrentPublication(`/portfolio/${safeSlug(usernameSlug)}/${safeSlug(projectSlug)}`);
}

export function fetchPublishedEditorial(usernameSlug: string, editorialSlug: string) {
  return fetchCurrentPublication(`/portfolio/${safeSlug(usernameSlug)}/editorials/${safeSlug(editorialSlug)}`);
}

async function fetchCurrentPublication(publicPath: string): Promise<PortfolioHomepageSnapshot | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .schema('ml_public')
    .from('publications')
    .select('public_path,snapshot_json')
    .eq('public_path', publicPath)
    .eq('is_public', true)
    .eq('is_current', true)
    .is('unpublished_at', null)
    .maybeSingle();
  if (error) throw new Error(`Unable to load the public snapshot: ${error.message}`);
  return publicationSnapshot(data as PublicationRow | null);
}

function publicationSnapshot(row: PublicationRow | null): PortfolioHomepageSnapshot | null {
  const value = row?.snapshot_json;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const snapshot = value as Partial<PortfolioHomepageSnapshot>;
  if (!snapshot.profile || typeof snapshot.profile !== 'object') return null;
  if (!Array.isArray(snapshot.projects) || !Array.isArray(snapshot.editorials)) return null;
  if (typeof snapshot.profile.usernameSlug !== 'string' || typeof snapshot.generatedAt !== 'string') return null;
  return snapshot as PortfolioHomepageSnapshot;
}

function safeSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
