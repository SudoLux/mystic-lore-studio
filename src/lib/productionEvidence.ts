import type { CanonicalMediaAsset } from '../domains/workspace';
import { saveImageBlob } from './imageBlobStore';
import { sha256 } from './technicalFiles';
import { stageCanonicalMediaBlob } from '../domains/persistence/canonicalMedia';

/** Stores a private, recoverable local capture before Storage acknowledges it. */
export async function storeProductionEvidence(file: File, studioId: string): Promise<CanonicalMediaAsset> {
  if (!file.size) throw new Error('The selected evidence file is empty.');
  if (!file.type.startsWith('image/')) throw new Error('Fit evidence must be an image capture.');
  const id = crypto.randomUUID();
  const localBlobKey = `production-evidence:${id}`;
  await saveImageBlob(localBlobKey, file);
  const now = new Date().toISOString();
  const asset: CanonicalMediaAsset = {
    createdAt: now, id, revision: 1, studioId, updatedAt: now,
    checksum: await sha256(file), height: null, localBlobKey, mimeType: file.type,
    name: file.name || 'fit-capture.jpg', rights: { source: 'private mobile fit capture' },
    sizeBytes: file.size, storagePath: `studios/${studioId}/samples/evidence/${id}/${sanitize(file.name)}`,
    storageState: 'queued', width: null,
  };
  await stageCanonicalMediaBlob(asset, file);
  return asset;
}

function sanitize(value: string) { return value.normalize('NFKD').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'fit-capture.jpg'; }
