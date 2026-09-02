import type { CanonicalMediaAsset } from '../domains/workspace';
import { getImageBlob, saveImageBlob } from './imageBlobStore';
import { loadCachedCanonicalMediaBlob, stageCanonicalMediaBlob } from '../domains/persistence/canonicalMedia';

export async function storeTechnicalSource(file: File, studioId: string): Promise<CanonicalMediaAsset> {
  if (!file.size) throw new Error('The selected source file is empty.');
  const id = crypto.randomUUID();
  const localBlobKey = `technical-source:${id}`;
  // Safari Private Browsing can reject a File object in IndexedDB even when it
  // accepts the same bytes as a Blob. Keep the original file untouched, but
  // stage a plain Blob for the private offline/cache path.
  const sourceBlob = new Blob([await file.arrayBuffer()], { type: file.type || 'application/octet-stream' });
  const checksum = await sha256(sourceBlob);
  const now = new Date().toISOString();
  const asset = { createdAt: now, id, revision: 1, studioId, updatedAt: now, checksum, height: null, localBlobKey, mimeType: file.type || 'application/octet-stream', name: file.name, rights: { source: 'private studio upload' }, sizeBytes: file.size, storagePath: `studios/${studioId}/technical/${id}/${sanitize(file.name)}`, storageState: 'queued' as const, width: null };
  await stageCanonicalMediaBlob(asset, sourceBlob);
  // This legacy local preview cache is helpful on standard browsers, but must
  // never prevent the canonical source from being queued when Safari blocks a
  // Blob transaction in private mode. The canonical cache has its own safe
  // session fallback and remains the upload authority.
  try {
    await saveImageBlob(localBlobKey, sourceBlob);
  } catch {
    // Canonical staging above keeps the source available for this session and
    // for the normal private Storage upload/retry path.
  }
  return asset;
}

export async function technicalPreviewUrl(asset: CanonicalMediaAsset) {
  const local = asset.localBlobKey ? await getImageBlob(asset.localBlobKey).catch(() => null) : null;
  const blob = local ?? await loadCachedCanonicalMediaBlob(asset);
  return blob ? URL.createObjectURL(blob) : null;
}

export async function sha256(blob: Blob) { const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()); return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join(''); }
function sanitize(value: string) { return value.normalize('NFKD').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'source-file'; }
