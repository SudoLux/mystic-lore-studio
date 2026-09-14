import type { CanonicalMediaAsset } from '../domains/workspace';
import { stageCanonicalMediaBlob } from '../domains/persistence/canonicalMedia';
import { compressImageForApp } from './imageCompression';

const maxGarmentImageBytes = 25 * 1024 * 1024;

export async function prepareCanonicalGarmentImage(
  file: File,
  studioId: string,
  garmentId: string,
): Promise<CanonicalMediaAsset> {
  if (!file.size) throw new Error('Choose an image that contains data.');
  if (!file.type.startsWith('image/')) throw new Error('Choose a JPG, PNG, WebP, HEIC, or another image format.');
  if (file.size > maxGarmentImageBytes) throw new Error('Choose an image smaller than 25 MB.');
  const id = crypto.randomUUID();
  const checksum = await sha256(file);
  const dimensions = await imageDimensions(file);
  const now = new Date().toISOString();
  const asset: CanonicalMediaAsset = {
    checksum,
    createdAt: now,
    height: dimensions?.height ?? null,
    id,
    mimeType: file.type,
    name: file.name,
    revision: 1,
    rights: { source: 'private garment upload' },
    sizeBytes: file.size,
    storagePath: `studios/${studioId}/garments/${garmentId}/${id}/${sanitize(file.name)}`,
    storageState: 'queued',
    studioId,
    updatedAt: now,
    width: dimensions?.width ?? null,
  };
  await stageCanonicalMediaBlob(asset, file);
  return asset;
}

export async function prepareCanonicalMaterialImage(
  file: File,
  studioId: string,
  variantId: string,
): Promise<CanonicalMediaAsset> {
  const compressed = await compressImageForApp(file, {
    maxDimension: 2000,
    maxSizeBytes: 2 * 1024 * 1024,
    previewDimension: 640,
  });
  return prepareCanonicalImage(compressed.file, studioId, `assets/materials/${variantId}`, 'private material upload');
}

async function prepareCanonicalImage(
  file: File,
  studioId: string,
  relativePath: string,
  source: string,
): Promise<CanonicalMediaAsset> {
  if (!file.size) throw new Error('Choose an image that contains data.');
  if (!file.type.startsWith('image/')) throw new Error('Choose a JPG, PNG, WebP, HEIC, or another image format.');
  if (file.size > maxGarmentImageBytes) throw new Error('Choose an image smaller than 25 MB.');
  const id = crypto.randomUUID();
  const checksum = await sha256(file);
  const dimensions = await imageDimensions(file);
  const now = new Date().toISOString();
  const asset: CanonicalMediaAsset = {
    checksum, createdAt: now, height: dimensions?.height ?? null, id,
    mimeType: file.type, name: file.name, revision: 1, rights: { source },
    sizeBytes: file.size,
    storagePath: `studios/${studioId}/${relativePath}/${id}/${sanitize(file.name)}`,
    storageState: 'queued', studioId, updatedAt: now,
    width: dimensions?.width ?? null,
  };
  await stageCanonicalMediaBlob(asset, file);
  return asset;
}

async function imageDimensions(file: File) {
  if (typeof createImageBitmap !== 'function') return null;
  try {
    const image = await createImageBitmap(file);
    const dimensions = { height: image.height, width: image.width };
    image.close();
    return dimensions;
  } catch {
    return null;
  }
}

async function sha256(blob: Blob) {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

function sanitize(value: string) {
  return value.normalize('NFKD').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'garment-image';
}
