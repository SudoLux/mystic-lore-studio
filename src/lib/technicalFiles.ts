import type { CanonicalMediaAsset } from '../domains/workspace';
import { getImageBlob, saveImageBlob } from './imageBlobStore';

export async function storeTechnicalSource(file: File, studioId: string): Promise<CanonicalMediaAsset> {
  if (!file.size) throw new Error('The selected source file is empty.');
  const id = crypto.randomUUID();
  const localBlobKey = `technical-source:${id}`;
  const checksum = await sha256(file);
  await saveImageBlob(localBlobKey, file);
  const now = new Date().toISOString();
  return { createdAt: now, id, revision: 1, studioId, updatedAt: now, checksum, height: null, localBlobKey, mimeType: file.type || 'application/octet-stream', name: file.name, rights: { source: 'private studio upload' }, sizeBytes: file.size, storagePath: `studios/${studioId}/technical/${id}/${sanitize(file.name)}`, storageState: 'stored', width: null };
}

export async function technicalPreviewUrl(asset: CanonicalMediaAsset) {
  if (!asset.localBlobKey) return null;
  const blob = await getImageBlob(asset.localBlobKey);
  return blob ? URL.createObjectURL(blob) : null;
}

export async function sha256(blob: Blob) { const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()); return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join(''); }
function sanitize(value: string) { return value.normalize('NFKD').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'source-file'; }
