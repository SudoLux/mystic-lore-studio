import type { LocalImageAsset } from '../types/studio';
import { compressImageForApp } from './imageCompression';
import { imageBlobKey, saveImageBlob } from './imageBlobStore';

export type ImageProcessingError = Error;

export async function createLocalImageAsset(file: File): Promise<LocalImageAsset> {
  const compressed = await compressImageForApp(file);
  const id = `image-${crypto.randomUUID()}`;
  const blobKey = imageBlobKey(id);
  let uploadDataUrl: string | undefined;

  try {
    await saveImageBlob(blobKey, compressed.blob);
  } catch {
    uploadDataUrl = await readBlobAsDataUrl(compressed.blob);
  }

  return {
    blobKey: uploadDataUrl ? undefined : blobKey,
    dataUrl: compressed.previewDataUrl,
    height: compressed.height,
    id,
    mimeType: compressed.mimeType,
    name: compressed.file.name,
    objectFit: 'cover',
    overlayIntensity: 'auto',
    objectPositionX: 50,
    objectPositionY: 50,
    size: compressed.sizeBytes,
    uploadDataUrl,
    uploadState: 'queued',
    updatedAt: new Date().toISOString(),
    width: compressed.width,
    zoom: 1,
  };
}

function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('load', () => resolve(String(reader.result)));
    reader.addEventListener('error', () => reject(new Error('Could not prepare this image.')));
    reader.readAsDataURL(blob);
  });
}
