import { supabase } from './supabase';
import {
  clearPublicPortfolioSnapshot,
  loadPublicPortfolioSnapshot,
  savePublicPortfolioSnapshot,
} from '../utils/publicPortfolioCache';
import {
  preparePortfolioHomepageSnapshot,
  preparePortfolioProjectSnapshot,
} from '../utils/portfolioSnapshot';
import type {
  PortfolioEditorialSnapshot,
  PortfolioHomepageSnapshot,
  PortfolioProfileSnapshot,
  PortfolioProjectSnapshot,
} from '../utils/portfolioSnapshot';
import type { EditorialCollection } from '../types/editorial';
import type { PortfolioProfile } from '../types/portfolio';
import type { ApparelProject, Fabric, LocalImageAsset } from '../types/studio';
import { getSafePortfolioSettings, slugifyPortfolioValue } from '../utils/portfolioUtils';

const PUBLICATION_TABLE = 'portfolio_publications';
const PORTFOLIO_PROFILE_TABLE = 'portfolio_profiles';
const PUBLISHED_EDITORIALS_TABLE = 'published_editorials';
const PUBLISHED_PROJECTS_TABLE = 'published_portfolio_projects';
const PORTFOLIO_IMAGE_BUCKET = 'portfolio-images';

type PublishPublicPortfolioInput = {
  assets: readonly LocalImageAsset[];
  sourceEditorialCollections?: readonly EditorialCollection[];
  sourceProjects?: readonly ApparelProject[];
  snapshot: PortfolioHomepageSnapshot;
  userId: string;
};

/**
 * The publishing source is intentionally private and only exists while the
 * signed-in Studio app prepares a public snapshot. Anonymous routes never
 * receive this structure or query the underlying Studio tables directly.
 */
export type PortfolioPublicationSource = {
  assets: readonly LocalImageAsset[];
  editorialCollections: readonly EditorialCollection[];
  fabrics: readonly Fabric[];
  portfolioProfile: PortfolioProfile;
  projects: readonly ApparelProject[];
  userId: string;
};

export type PortfolioProjectPublicationResult = {
  generatedAt: string;
  project: PortfolioProjectSnapshot | null;
  projectSlug: string;
  snapshot: PortfolioHomepageSnapshot;
  usernameSlug: string;
};

export async function publishPublicPortfolio({
  assets,
  sourceEditorialCollections,
  sourceProjects,
  snapshot,
  userId,
}: PublishPublicPortfolioInput) {
  if (!supabase) {
    savePublicPortfolioSnapshot(snapshot);
    return snapshot;
  }

  const sourceMap = await publishReferencedImages(assets, snapshot, userId);
  const publishedSnapshot = rewriteImageSources(snapshot, sourceMap);
  const timestamp = new Date().toISOString();
  const { error } = await supabase.from(PUBLICATION_TABLE).upsert({
    published_at: timestamp,
    snapshot: publishedSnapshot,
    updated_at: timestamp,
    user_id: userId,
    username_slug: publishedSnapshot.profile.usernameSlug,
  }, { onConflict: 'user_id' });

  if (error) throw new Error(`Unable to publish portfolio: ${error.message}`);
  await writePublishedPortfolioSnapshots(
    publishedSnapshot,
    userId,
    sourceProjects,
    sourceEditorialCollections,
  );
  savePublicPortfolioSnapshot(publishedSnapshot);
  return publishedSnapshot;
}

/**
 * Publishes the current public-safe profile and every currently public project
 * as one immutable recruiter-facing snapshot. This is the durable cloud
 * counterpart to the local preview cache.
 */
export async function publishPortfolioProfile(
  source: PortfolioPublicationSource,
): Promise<PortfolioHomepageSnapshot> {
  const profileSnapshot = preparePortfolioHomepageSnapshot({
    assets: source.assets,
    editorialCollections: source.editorialCollections,
    fabrics: source.fabrics,
    portfolioProfile: source.portfolioProfile,
    projects: [],
  });
  const snapshot = supabase
    ? profileSnapshot
    : mergeLocalPublication(profileSnapshot, source.portfolioProfile.usernameSlug);

  return publishPublicPortfolio({
    assets: source.assets,
    sourceEditorialCollections: source.editorialCollections,
    sourceProjects: [],
    snapshot,
    userId: source.userId,
  });
}

/** Withdraws the authenticated owner's entire recruiter-facing publication. */
export async function unpublishPortfolioProfile({
  userId,
  usernameSlug = '',
}: {
  userId: string;
  usernameSlug?: string;
}) {
  await removePublicPortfolioPublication(userId, usernameSlug);
}

/**
 * Rebuilds the complete public snapshot around a single Studio project. The
 * returned project contains no private task, Kanban, or raw Studio state.
 */
export async function publishPortfolioProject({
  projectId,
  ...source
}: PortfolioPublicationSource & { projectId: string }): Promise<PortfolioProjectPublicationResult> {
  const project = source.projects.find((candidate) => candidate.id === projectId);
  if (!project) throw new Error('Portfolio project could not be found.');

  const projectSnapshot = preparePortfolioProjectSnapshot({
    assets: source.assets,
    editorialCollections: source.editorialCollections,
    fabrics: source.fabrics,
    project,
  });
  const projectSlug = getSafePortfolioSettings(project).portfolioSlug;
  const usernameSlug = slugifyPortfolioValue(source.portfolioProfile.usernameSlug);

  if (!projectSnapshot) {
    return unpublishPortfolioProject({ projectId, ...source });
  }

  const projectOnlySnapshot = preparePortfolioHomepageSnapshot({
    assets: source.assets,
    editorialCollections: source.editorialCollections,
    fabrics: source.fabrics,
    portfolioProfile: source.portfolioProfile,
    projects: [project],
    generatedAt: projectSnapshot.generatedAt,
  });
  const snapshot = supabase
    ? projectOnlySnapshot
    : mergeLocalPublication(projectOnlySnapshot, source.portfolioProfile.usernameSlug);
  const publishedSnapshot = await publishPublicPortfolio({
    assets: source.assets,
    sourceEditorialCollections: source.editorialCollections,
    sourceProjects: source.projects,
    snapshot,
    userId: source.userId,
  });

  return {
    generatedAt: projectSnapshot.generatedAt,
    project: projectSnapshot,
    projectSlug,
    snapshot: publishedSnapshot,
    usernameSlug,
  };
}

/**
 * Removes one project from the public snapshot without mutating the private
 * Studio record. When no public projects remain, the public snapshot row and
 * its local preview are removed entirely.
 */
export async function unpublishPortfolioProject({
  projectId,
  ...source
}: PortfolioPublicationSource & { projectId: string }): Promise<PortfolioProjectPublicationResult> {
  const project = source.projects.find((candidate) => candidate.id === projectId);
  if (!project) throw new Error('Portfolio project could not be found.');

  const snapshot = preparePortfolioHomepageSnapshot({
    assets: source.assets,
    editorialCollections: source.editorialCollections,
    fabrics: source.fabrics,
    portfolioProfile: source.portfolioProfile,
    projects: [],
  });
  const projectSlug = getSafePortfolioSettings(project).portfolioSlug;
  const usernameSlug = slugifyPortfolioValue(source.portfolioProfile.usernameSlug);

  if (supabase) {
    const cloud = supabase;
    const hiddenProject = await cloud
      .from(PUBLISHED_PROJECTS_TABLE)
      .update({ is_public: false, updated_at: snapshot.generatedAt })
      .eq('user_id', source.userId)
      .eq('project_id', project.id);
    if (hiddenProject.error) throw new Error(`Unable to unpublish project: ${hiddenProject.error.message}`);
    const attachedEditorialIds = new Set(getSafePortfolioSettings(project).attachedEditorialCollectionIds);
    const attachedEditorials = source.editorialCollections.filter((collection) => (
      attachedEditorialIds.has(collection.id)
      && !source.projects.some((candidate) => {
        if (candidate.id === project.id) return false;
        const candidateSettings = getSafePortfolioSettings(candidate);
        return candidateSettings.isPublic
          && Boolean(candidateSettings.publishedAt)
          && candidateSettings.attachedEditorialCollectionIds.includes(collection.id);
      })
    ));
    const editorialWrites = await Promise.all(attachedEditorials.map((collection) => cloud
      .from(PUBLISHED_EDITORIALS_TABLE)
      .update({ is_public: false, updated_at: snapshot.generatedAt })
      .eq('user_id', source.userId)
      .eq('editorial_id', collection.id)));
    const editorialFailure = editorialWrites.find(({ error }) => error);
    if (editorialFailure?.error) {
      throw new Error(`Unable to unpublish attached editorial: ${editorialFailure.error.message}`);
    }
  } else {
    const published = loadPublicPortfolioSnapshot(usernameSlug);
    if (published) {
      savePublicPortfolioSnapshot({
        ...published,
        editorials: uniqueEditorialSnapshots(
          published.projects
            .filter((candidate) => candidate.slug !== projectSlug)
            .flatMap((candidate) => candidate.editorials),
        ),
        generatedAt: snapshot.generatedAt,
        projects: published.projects.filter((candidate) => candidate.slug !== projectSlug),
      });
    }
  }
  if (supabase) clearPublicPortfolioSnapshot(snapshot.profile.usernameSlug);
  return {
    generatedAt: snapshot.generatedAt,
    project: null,
    projectSlug,
    snapshot,
    usernameSlug,
  };
}

export async function fetchPublicPortfolio(usernameSlug: string) {
  if (!supabase) return null;
  const publishedSnapshot = await fetchPublishedPortfolioHomepage(usernameSlug);
  if (publishedSnapshot) return publishedSnapshot;

  // Compatibility fallback for an already-published profile while the new
  // snapshot-table migration is being rolled out. New writes use the tables
  // above; anonymous routes never query private Studio data in either case.
  const { data, error } = await supabase
    .from(PUBLICATION_TABLE)
    .select('snapshot')
    .eq('username_slug', usernameSlug)
    .maybeSingle();

  if (error) throw new Error(`Unable to load public portfolio: ${error.message}`);
  return isPortfolioSnapshot(data?.snapshot) ? data.snapshot : null;
}

/** Fetches the public homepage from only the anonymous-safe snapshot tables. */
export async function fetchPublishedPortfolioHomepage(usernameSlug: string) {
  const profile = await fetchPublishedPortfolioProfile(usernameSlug);
  if (!profile) return null;

  const [projects, editorials] = await Promise.all([
    fetchPublishedPortfolioProjects(usernameSlug),
    fetchPublishedEditorials(usernameSlug),
  ]);
  return createPublishedHomepageSnapshot(profile, projects, editorials);
}

/** Fetches exactly one public project snapshot for a case-study route. */
export async function fetchPublishedPortfolioProject(
  usernameSlug: string,
  projectSlug: string,
) {
  if (!supabase) return null;
  const profile = await fetchPublishedPortfolioProfile(usernameSlug);
  if (!profile) return null;

  const { data, error } = await supabase
    .from(PUBLISHED_PROJECTS_TABLE)
    .select('snapshot')
    .eq('username_slug', usernameSlug)
    .eq('project_slug', projectSlug)
    .eq('is_public', true)
    .maybeSingle();
  if (error) throw new Error(`Unable to load public project: ${error.message}`);
  if (!isPortfolioProjectSnapshot(data?.snapshot)) return null;

  const project = data.snapshot;
  return createPublishedHomepageSnapshot(profile, [project], project.editorials);
}

/** Fetches exactly one public editorial snapshot for an editorial route. */
export async function fetchPublishedEditorial(
  usernameSlug: string,
  editorialSlug: string,
) {
  if (!supabase) return null;
  const profile = await fetchPublishedPortfolioProfile(usernameSlug);
  if (!profile) return null;

  const { data, error } = await supabase
    .from(PUBLISHED_EDITORIALS_TABLE)
    .select('snapshot')
    .eq('username_slug', usernameSlug)
    .eq('editorial_slug', editorialSlug)
    .eq('is_public', true)
    .maybeSingle();
  if (error) throw new Error(`Unable to load public editorial: ${error.message}`);
  if (!isPortfolioEditorialSnapshot(data?.snapshot)) return null;

  return createPublishedHomepageSnapshot(profile, [], [data.snapshot]);
}

async function removePublicPortfolioPublication(userId: string, usernameSlug: string) {
  if (!supabase) {
    clearPublicPortfolioSnapshot(usernameSlug);
    return;
  }

  const results = await Promise.all([
    supabase.from(PUBLICATION_TABLE).delete().eq('user_id', userId),
    supabase.from(PORTFOLIO_PROFILE_TABLE).delete().eq('user_id', userId),
    supabase.from(PUBLISHED_PROJECTS_TABLE).delete().eq('user_id', userId),
    supabase.from(PUBLISHED_EDITORIALS_TABLE).delete().eq('user_id', userId),
  ]);
  const failed = results.find(({ error }) => error);
  if (failed?.error) throw new Error(`Unable to unpublish portfolio: ${failed.error.message}`);
  clearPublicPortfolioSnapshot(usernameSlug);
}

/**
 * Mirrors a sanitized aggregate snapshot into the normalized public tables.
 * No private Studio row is copied here: only data already produced by the
 * portfolio snapshot helpers is written to anonymous-readable tables.
 */
async function writePublishedPortfolioSnapshots(
  snapshot: PortfolioHomepageSnapshot,
  userId: string,
  sourceProjects: readonly ApparelProject[] = [],
  sourceEditorialCollections: readonly EditorialCollection[] = [],
) {
  if (!supabase) return;

  const timestamp = new Date().toISOString();
  const profile = snapshot.profile;
  const profileRow = {
    avatar_image_url: profile.avatar?.src ?? null,
    bio: profile.bio || null,
    display_name: profile.displayName || 'Mystic Lore Portfolio',
    email: profile.email ?? null,
    headline: profile.headline || null,
    is_public: true,
    location: profile.location ?? null,
    resume_url: profile.resumeUrl ?? null,
    snapshot: profile,
    updated_at: timestamp,
    user_id: userId,
    username_slug: profile.usernameSlug,
  };
  const projectRows = snapshot.projects.map((project) => ({
    cover_image_url: project.coverImage?.src ?? null,
    description: project.description || null,
    is_public: true,
    project_id: sourceProjects.find(
      (candidate) => getSafePortfolioSettings(candidate).portfolioSlug === project.slug,
    )?.id ?? `portfolio:${project.slug}`,
    project_slug: project.slug,
    snapshot: project,
    title: project.title,
    updated_at: timestamp,
    user_id: userId,
    username_slug: profile.usernameSlug,
  }));
  const editorialRows = snapshot.editorials.map((editorial) => ({
    editorial_id: sourceEditorialCollections.find(
      (candidate) => slugifyPortfolioValue(candidate.title) === editorial.slug,
    )?.id ?? editorial.key,
    editorial_slug: editorial.slug,
    is_public: true,
    snapshot: editorial,
    title: editorial.title,
    updated_at: timestamp,
    user_id: userId,
    username_slug: profile.usernameSlug,
  }));

  const writes = await Promise.all([
    supabase.from(PORTFOLIO_PROFILE_TABLE).upsert(profileRow, { onConflict: 'username_slug' }),
    projectRows.length
      ? supabase.from(PUBLISHED_PROJECTS_TABLE).upsert(projectRows, { onConflict: 'username_slug,project_slug' })
      : Promise.resolve({ error: null }),
    editorialRows.length
      ? supabase.from(PUBLISHED_EDITORIALS_TABLE).upsert(editorialRows, { onConflict: 'username_slug,editorial_slug' })
      : Promise.resolve({ error: null }),
  ]);
  const writeFailure = writes.find(({ error }) => error);
  if (writeFailure?.error) {
    throw new Error(`Unable to publish public portfolio snapshots: ${writeFailure.error.message}`);
  }
}

/**
 * Local development keeps the same explicit-publish contract as Supabase.
 * It merges a just-published profile or project into the last public cache
 * instead of rebuilding it from private Studio state.
 */
function mergeLocalPublication(
  incoming: PortfolioHomepageSnapshot,
  usernameSlug: string,
): PortfolioHomepageSnapshot {
  const existing = loadPublicPortfolioSnapshot(usernameSlug);
  if (!existing) return incoming;

  const projectsBySlug = new Map(existing.projects.map((project) => [project.slug, project]));
  incoming.projects.forEach((project) => projectsBySlug.set(project.slug, project));
  const projects = [...projectsBySlug.values()];

  return {
    editorials: uniqueEditorialSnapshots(projects.flatMap((project) => project.editorials)),
    generatedAt: incoming.generatedAt,
    profile: incoming.profile,
    projects,
  };
}

function uniqueEditorialSnapshots(editorials: readonly PortfolioEditorialSnapshot[]) {
  const seen = new Set<string>();
  return editorials.filter((editorial) => {
    if (seen.has(editorial.slug)) return false;
    seen.add(editorial.slug);
    return true;
  });
}

async function fetchPublishedPortfolioProfile(usernameSlug: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(PORTFOLIO_PROFILE_TABLE)
    .select('snapshot')
    .eq('username_slug', usernameSlug)
    .eq('is_public', true)
    .maybeSingle();
  if (error) throw new Error(`Unable to load public portfolio profile: ${error.message}`);
  return isPortfolioProfileSnapshot(data?.snapshot) ? data.snapshot : null;
}

async function fetchPublishedPortfolioProjects(usernameSlug: string) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(PUBLISHED_PROJECTS_TABLE)
    .select('snapshot')
    .eq('username_slug', usernameSlug)
    .eq('is_public', true)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(`Unable to load public projects: ${error.message}`);
  return (data ?? [])
    .map(({ snapshot }) => snapshot)
    .filter(isPortfolioProjectSnapshot);
}

async function fetchPublishedEditorials(usernameSlug: string) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(PUBLISHED_EDITORIALS_TABLE)
    .select('snapshot')
    .eq('username_slug', usernameSlug)
    .eq('is_public', true)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(`Unable to load public editorials: ${error.message}`);
  return (data ?? [])
    .map(({ snapshot }) => snapshot)
    .filter(isPortfolioEditorialSnapshot);
}

function createPublishedHomepageSnapshot(
  profile: PortfolioHomepageSnapshot['profile'],
  projects: readonly PortfolioProjectSnapshot[],
  editorials: readonly PortfolioEditorialSnapshot[],
): PortfolioHomepageSnapshot {
  return {
    editorials,
    generatedAt: new Date().toISOString(),
    profile,
    projects,
  };
}

async function publishReferencedImages(
  assets: readonly LocalImageAsset[],
  snapshot: PortfolioHomepageSnapshot,
  userId: string,
) {
  const referencedSources = collectImageSources(snapshot);
  const sourceMap = new Map<string, string>();
  const relevantAssets = assets.filter((asset) => {
    const source = imageSource(asset);
    return Boolean(source && referencedSources.has(source));
  });

  await Promise.all(relevantAssets.map(async (asset) => {
    const source = imageSource(asset);
    if (!source) return;

    try {
      let blob: Blob | undefined;
      for (const candidate of assetSources(asset)) {
        const response = await fetch(candidate);
        if (!response.ok) continue;
        blob = await response.blob();
        break;
      }
      if (!blob) return;
      const contentType = normalizedImageType(blob.type || asset.mimeType);
      const path = `users/${userId}/portfolio/${asset.id}.${extensionFor(contentType)}`;
      const { error } = await supabase!.storage
        .from(PORTFOLIO_IMAGE_BUCKET)
        .upload(path, blob, { cacheControl: '3600', contentType, upsert: true });
      if (error) return;
      const { data } = supabase!.storage.from(PORTFOLIO_IMAGE_BUCKET).getPublicUrl(path);
      if (data.publicUrl) sourceMap.set(source, data.publicUrl);
    } catch {
      // Preserve the current source. The public renderer already has a graceful
      // image fallback and the next publish attempt can repair the asset.
    }
  }));

  return sourceMap;
}

function collectImageSources(snapshot: PortfolioHomepageSnapshot) {
  const sources = new Set<string>();
  visit(snapshot, (record) => {
    if (typeof record.src === 'string' && record.src) sources.add(record.src);
  });
  return sources;
}

function rewriteImageSources(
  snapshot: PortfolioHomepageSnapshot,
  sourceMap: ReadonlyMap<string, string>,
): PortfolioHomepageSnapshot {
  return rewriteValue(snapshot, sourceMap) as PortfolioHomepageSnapshot;
}

function rewriteValue(value: unknown, sourceMap: ReadonlyMap<string, string>): unknown {
  if (Array.isArray(value)) return value.map((item) => rewriteValue(item, sourceMap));
  if (!isRecord(value)) return value;

  const next = Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, rewriteValue(item, sourceMap)]),
  );
  if (typeof next.src === 'string' && sourceMap.has(next.src)) {
    next.src = sourceMap.get(next.src);
  }
  return next;
}

function visit(value: unknown, visitor: (record: Record<string, unknown>) => void) {
  if (Array.isArray(value)) {
    value.forEach((item) => visit(item, visitor));
    return;
  }
  if (!isRecord(value)) return;
  visitor(value);
  Object.values(value).forEach((item) => visit(item, visitor));
}

function imageSource(asset: LocalImageAsset) {
  return asset.remoteUrl || asset.dataUrl || asset.uploadDataUrl;
}

function assetSources(asset: LocalImageAsset) {
  return [...new Set([
    asset.remoteUrl,
    asset.dataUrl,
    asset.uploadDataUrl,
  ].filter((source): source is string => Boolean(source)))];
}

function normalizedImageType(value: string) {
  if (value === 'image/png' || value === 'image/jpeg') return value;
  return 'image/webp';
}

function extensionFor(mimeType: string) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/jpeg') return 'jpg';
  return 'webp';
}

function isPortfolioSnapshot(value: unknown): value is PortfolioHomepageSnapshot {
  return isRecord(value)
    && isPortfolioProfileSnapshot(value.profile)
    && Array.isArray(value.projects)
    && value.projects.every(isPortfolioProjectSnapshot)
    && Array.isArray(value.editorials)
    && value.editorials.every(isPortfolioEditorialSnapshot);
}

function isPortfolioProfileSnapshot(value: unknown): value is PortfolioProfileSnapshot {
  return isRecord(value)
    && typeof value.usernameSlug === 'string'
    && typeof value.displayName === 'string'
    && typeof value.headline === 'string'
    && typeof value.bio === 'string';
}

function isPortfolioProjectSnapshot(value: unknown): value is PortfolioProjectSnapshot {
  return isRecord(value)
    && typeof value.slug === 'string'
    && typeof value.title === 'string'
    && typeof value.description === 'string'
    && Array.isArray(value.featuredImages)
    && Array.isArray(value.editorials)
    && isRecord(value.visibleSections);
}

function isPortfolioEditorialSnapshot(value: unknown): value is PortfolioEditorialSnapshot {
  return isRecord(value)
    && typeof value.key === 'string'
    && typeof value.slug === 'string'
    && typeof value.title === 'string'
    && isRecord(value.cover)
    && Array.isArray(value.scenes)
    && Array.isArray(value.images);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
