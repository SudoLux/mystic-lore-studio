import { canonicalSupabase } from '../../lib/supabase';
import type { CanonicalMediaAsset } from '../workspace';
import { CanonicalIndexedDb } from './canonicalIndexedDb';
import { canonicalValueChecksum } from './canonicalIndexedDb';

const cache = new CanonicalIndexedDb();

/** Retains bytes before any network work so capture survives interruption. */
export async function stageCanonicalMediaBlob(asset: CanonicalMediaAsset, blob: Blob) {
  const checksum = await sha256(blob);
  if (checksum !== asset.checksum) throw new Error('Media bytes do not match the canonical checksum.');
  await cache.putMediaBlob(asset.id, blob, checksum);
}

export async function loadCanonicalMediaBlob(asset: CanonicalMediaAsset) {
  return await loadCanonicalStoredBlob(asset);
}

export async function loadCanonicalStoredBlob(asset: {
  checksum: string;
  id: string;
  name?: string;
  storagePath: string;
}) {
  const staged = await cache.getMediaBlob(asset.id);
  if (staged) return staged.blob;
  if (!canonicalSupabase) return null;
  const response = await canonicalSupabase.storage.from('studio-assets').download(asset.storagePath);
  if (response.error) throw new Error(response.error.message);
  const checksum = await sha256(response.data);
  if (checksum !== asset.checksum) throw new Error(`Stored media checksum mismatch for ${asset.name ?? asset.id}.`);
  await cache.putMediaBlob(asset.id, response.data, checksum);
  return response.data;
}

export async function uploadStagedCanonicalMedia(
  asset: Pick<CanonicalMediaAsset, 'checksum' | 'id' | 'mimeType' | 'storagePath'>,
  store = cache,
) {
  if (!canonicalSupabase) throw new Error('Canonical Storage is unavailable.');
  const staged = await store.getMediaBlob(asset.id);
  if (!staged) return false;
  if (staged.checksum !== asset.checksum) throw new Error('Staged media checksum changed before upload.');
  const upload = await canonicalSupabase.storage.from('studio-assets').upload(asset.storagePath, staged.blob, {
    cacheControl: '31536000',
    contentType: asset.mimeType,
    upsert: false,
  });
  if (!upload.error) return true;
  const existing = await canonicalSupabase.storage.from('studio-assets').download(asset.storagePath);
  if (existing.error) throw new Error(upload.error.message);
  if (await sha256(existing.data) !== asset.checksum) {
    throw new Error('A different object already exists at the canonical media path.');
  }
  return true;
}

async function sha256(blob: Blob) {
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
    return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
  }
  // Tests without SubtleCrypto still get the same deterministic fallback used
  // by the canonical cache; production browsers always take the SHA-256 path.
  return canonicalValueChecksum([...new Uint8Array(await blob.arrayBuffer())]);
}
