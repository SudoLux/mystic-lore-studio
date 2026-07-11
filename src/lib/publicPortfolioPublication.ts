import { supabase } from './supabase';
import { savePublicPortfolioSnapshot } from '../utils/publicPortfolioCache';
import type { PortfolioHomepageSnapshot } from '../utils/portfolioSnapshot';
import type { LocalImageAsset } from '../types/studio';

const PUBLICATION_TABLE = 'portfolio_publications';
const PORTFOLIO_IMAGE_BUCKET = 'portfolio-images';

type PublishPublicPortfolioInput = {
  assets: readonly LocalImageAsset[];
  snapshot: PortfolioHomepageSnapshot;
  userId: string;
};

export async function publishPublicPortfolio({
  assets,
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
  savePublicPortfolioSnapshot(publishedSnapshot);
  return publishedSnapshot;
}

export async function fetchPublicPortfolio(usernameSlug: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(PUBLICATION_TABLE)
    .select('snapshot')
    .eq('username_slug', usernameSlug)
    .maybeSingle();

  if (error) throw new Error(`Unable to load public portfolio: ${error.message}`);
  return isPortfolioSnapshot(data?.snapshot) ? data.snapshot : null;
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
    && isRecord(value.profile)
    && typeof value.profile.usernameSlug === 'string'
    && Array.isArray(value.projects)
    && Array.isArray(value.editorials);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
