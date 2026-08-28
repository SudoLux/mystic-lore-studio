import { canonicalSupabase } from '../../lib/supabase';
import type { Json } from '../../types/database.generated';
import { sha256Hex } from '../migration/stableIdentity';
import { CanonicalIndexedDb, SupabaseCanonicalWorkspaceRepository } from '../persistence';
import type {
  CanonicalPublication,
  CanonicalPublicationAssetManifest,
  CanonicalWorkspaceState,
} from '../workspace';
import {
  buildPublicCutPreview,
  publishPublicCut,
  type PublicCutPreview,
} from './publicCutRepository';

type PublicCutBatchResult = {
  batchId: string;
  expectedObjectPaths: string[];
  publicationIds: string[];
  status: string;
};

/** Builds the exact preview from fresh canonical rows after flushing the outbox. */
export async function buildFreshPublicCutPreview(studioId: string, profileId: string): Promise<PublicCutPreview> {
  const state = await freshCanonicalState(studioId);
  return await buildPublicCutPreview(state, profileId);
}

/**
 * Begins one private batch, copies every reviewed derivative, then atomically
 * promotes the complete profile/project/editorial set. Browser state supplies
 * identity only; payloads are rebuilt from freshly loaded canonical rows.
 */
export async function commitPublicCutToSupabase(
  _browserState: CanonicalWorkspaceState,
  requestedPublications: readonly CanonicalPublication[],
) {
  if (!canonicalSupabase) throw new Error('Public Cut publishing requires the canonical Supabase repository.');
  const hint = requestedPublications[0];
  if (!hint) throw new Error('A Public Cut requires at least one reviewed source.');
  if (requestedPublications.some((item) => item.profileId !== hint.profileId || item.studioId !== hint.studioId)) {
    throw new Error('A Public Cut batch cannot mix Studios or portfolio profiles.');
  }

  const { data: authData, error: authError } = await canonicalSupabase.auth.getUser();
  if (authError || !authData.user) throw new Error('Sign in again before publishing a Public Cut.');
  const freshState = await freshCanonicalState(hint.studioId);
  const rebuilt = await publishPublicCut(freshState, hint.profileId, authData.user.id, true);
  const publications = await Promise.all(rebuilt.publications.map(preparePublication));
  const batchId = crypto.randomUUID();

  const begin = await canonicalSupabase.schema('ml_private').rpc('begin_public_cut_batch', {
    p_batch_id: batchId,
    p_profile_id: hint.profileId,
    p_publications: publications.map(publicationPayload) as unknown as Json,
    p_studio_id: hint.studioId,
  });
  if (begin.error) throw new Error(`Could not begin the Public Cut batch: ${begin.error.message}`);
  const batch = begin.data as unknown as PublicCutBatchResult;

  for (const publication of publications) {
    for (const [sortOrder, item] of publication.mediaManifest.entries()) {
      await copyPublicationAsset(freshState, batchId, publication, item, sortOrder);
    }
  }

  const commit = await canonicalSupabase.schema('ml_private').rpc('commit_public_cut_batch', {
    p_batch_id: batchId,
  });
  if (commit.error) {
    throw new Error(`The Public Cut remains a private retryable draft: ${commit.error.message}`);
  }
  const committed = commit.data as unknown as PublicCutBatchResult;
  const refreshed = await freshCanonicalState(hint.studioId, false);
  return {
    batchId,
    checksum: rebuilt.preview.checksum,
    history: refreshed.publications.filter((item) => item.profileId === hint.profileId),
    mode: 'cloud' as const,
    publishedIds: committed.publicationIds ?? batch.publicationIds,
  };
}

/** Removes anonymous visibility first; public-object cleanup is retryable. */
export async function unpublishPublicCutFromSupabase(profileId: string) {
  if (!canonicalSupabase) throw new Error('Public Cut unpublishing requires the canonical Supabase repository.');
  const response = await canonicalSupabase.schema('ml_private').rpc('unpublish_public_cut_batch', {
    p_profile_id: profileId,
  });
  if (response.error) throw new Error(`Could not unpublish the Public Cut: ${response.error.message}`);
  const result = response.data as unknown as {
    cleanupPaths: string[];
    publicationIds: string[];
    status: string;
  };
  let cleanupWarning: string | null = null;
  if (result.cleanupPaths?.length) {
    const cleanup = await canonicalSupabase.storage.from('portfolio-assets').remove(result.cleanupPaths);
    if (cleanup.error) {
      cleanupWarning = `Anonymous visibility is removed; copied-media cleanup remains queued: ${cleanup.error.message}`;
    }
  }
  return {
    cleanupWarning,
    mode: 'cloud' as const,
    unpublishedIds: result.publicationIds ?? [],
  };
}

async function freshCanonicalState(studioId: string, requireEmptyOutbox = true) {
  if (!canonicalSupabase) throw new Error('The canonical Supabase repository is unavailable.');
  const cache = new CanonicalIndexedDb();
  const repository = new SupabaseCanonicalWorkspaceRepository(canonicalSupabase, cache);
  await repository.hydrate(studioId);
  await repository.flush();
  const pending = await cache.listOutbox(studioId);
  if (requireEmptyOutbox && pending.length > 0) {
    throw new Error('Release actions require an empty canonical outbox and resolved server conflicts.');
  }
  return await repository.refresh();
}

async function preparePublication(publication: CanonicalPublication): Promise<CanonicalPublication> {
  const manifest = publication.mediaManifest.map((item) => withPublicationPath(item, publication.id));
  const snapshot = replacePublicationPaths(publication.snapshot, publication.profileId, publication.id);
  const checksum = await sha256Hex({
    manifest: manifest.map(({ checksum: value, copiedFromChecksum, role, sourceAssetId }) => ({
      checksum: value, copiedFromChecksum, role, sourceAssetId,
    })),
    snapshot,
  });
  return { ...publication, checksum, mediaManifest: manifest, snapshot };
}

function publicationPayload(publication: CanonicalPublication) {
  return {
    checksum: publication.checksum,
    id: publication.id,
    mediaManifest: publication.mediaManifest.map(manifestRow),
    publicPath: publication.publicPath,
    publicationType: publication.publicationType,
    snapshot: publication.snapshot,
    sourceId: publication.sourceId,
    sourceRevision: publication.sourceRevision,
    sourceVersionId: publication.sourceVersionId,
  };
}

async function copyPublicationAsset(
  state: CanonicalWorkspaceState,
  batchId: string,
  publication: CanonicalPublication,
  item: CanonicalPublicationAssetManifest,
  sortOrder: number,
) {
  const source = state.mediaDerivatives.find((candidate) =>
    candidate.id === item.sourceDerivativeId && candidate.assetId === item.sourceAssetId,
  );
  if (!source) throw new Error(`Selected media derivative ${item.sourceDerivativeId} is missing.`);
  const download = await canonicalSupabase!.storage.from('studio-assets').download(source.storagePath);
  if (download.error || !download.data) {
    throw new Error(`Could not read private derivative: ${download.error?.message ?? 'missing object'}`);
  }
  const checksum = await blobChecksum(download.data);
  if (checksum !== item.copiedFromChecksum) {
    throw new Error(`Private derivative ${item.sourceDerivativeId} no longer matches its reviewed checksum.`);
  }
  const asset = state.mediaAssets.find((candidate) => candidate.id === item.sourceAssetId);
  const stage = await canonicalSupabase!.schema('ml_private').rpc('stage_public_cut_asset', {
    p_asset: {
      ...manifestRow(item),
      height: asset?.height ?? null,
      sizeBytes: download.data.size,
      sortOrder,
      width: asset?.width ?? null,
    } as unknown as Json,
    p_batch_id: batchId,
    p_publication_id: publication.id,
  });
  if (stage.error) throw new Error(`Could not stage copied derivative evidence: ${stage.error.message}`);

  const upload = await canonicalSupabase!.storage.from('portfolio-assets').upload(
    item.publicStoragePath,
    download.data,
    { contentType: item.mimeType, upsert: false },
  );
  if (upload.error) {
    if (!/already exists|duplicate/i.test(upload.error.message)) {
      throw new Error(`Could not copy public derivative: ${upload.error.message}`);
    }
    const existing = await canonicalSupabase!.storage.from('portfolio-assets').download(item.publicStoragePath);
    if (existing.error || !existing.data || await blobChecksum(existing.data) !== item.checksum) {
      throw new Error('The retry path contains a different public object; the batch remains private.');
    }
  }
}

function withPublicationPath(
  item: CanonicalPublicationAssetManifest,
  publicationId: string,
): CanonicalPublicationAssetManifest {
  const publicationAssetId = crypto.randomUUID();
  const filename = item.publicStoragePath.split('/').at(-1) ?? 'asset.bin';
  return {
    ...item,
    publicationAssetId,
    publicStoragePath: `publications/${publicationId}/${publicationAssetId}/${filename}`,
  };
}

function manifestRow(item: CanonicalPublicationAssetManifest) {
  return {
    altText: item.altText,
    checksum: item.checksum,
    copiedFromChecksum: item.copiedFromChecksum,
    mimeType: item.mimeType,
    publicationAssetId: item.publicationAssetId,
    publicStoragePath: item.publicStoragePath,
    role: item.role,
    sourceAssetId: item.sourceAssetId,
    sourceDerivativeId: item.sourceDerivativeId,
  };
}

function replacePublicationPaths(snapshot: Record<string, unknown>, fromId: string, toId: string) {
  return JSON.parse(JSON.stringify(snapshot).replaceAll(`/publications/${fromId}/`, `/publications/${toId}/`)) as Record<string, unknown>;
}

async function blobChecksum(blob: Blob) {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}
