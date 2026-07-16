import type { LocalImageAsset } from '../types/studio';
import { compressImageForApp } from './imageCompression';
import {
  deleteImageBlob,
  displayImageBlobKey,
  imageBlobKey,
  previewImageBlobKey,
  saveImageBlob,
} from './imageBlobStore';

export type ImageProcessingError = Error;

export async function createLocalImageAsset(file: File): Promise<LocalImageAsset> {
  const compressed = await compressImageForApp(file);
  const display = await compressImageForApp(file, {
    dimensionSteps: [1280, 1120, 960],
    maxDimension: 1280,
    maxSizeBytes: 900 * 1024,
    previewDimension: 480,
    qualitySteps: [0.8, 0.72, 0.64, 0.56],
  });
  const id = `image-${crypto.randomUUID()}`;
  const blobKey = imageBlobKey(id);
  const displayBlobKey = displayImageBlobKey(id);
  const previewBlobKey = previewImageBlobKey(id);
  let uploadDataUrl: string | undefined;
  let storedDisplayBlobKey: string | undefined;
  let storedPreviewBlobKey: string | undefined;

  try {
    await saveImageBlob(blobKey, compressed.blob);
  } catch {
    uploadDataUrl = await readBlobAsDataUrl(compressed.blob);
  }

  try {
    await saveImageBlob(displayBlobKey, display.blob);
    storedDisplayBlobKey = displayBlobKey;
  } catch {
    // The master remains available if this device cannot persist a display variant.
  }

  try {
    await saveImageBlob(
      previewBlobKey,
      await dataUrlToBlob(compressed.previewDataUrl),
    );
    storedPreviewBlobKey = previewBlobKey;
  } catch {
    // The in-memory preview remains available when IndexedDB is unavailable.
  }

  return {
    blobKey: uploadDataUrl ? undefined : blobKey,
    dataUrl: compressed.previewDataUrl,
    displayBlobKey: storedDisplayBlobKey,
    displayHeight: display.height,
    displayMimeType: display.mimeType,
    displaySize: display.sizeBytes,
    displayWidth: display.width,
    height: compressed.height,
    id,
    mimeType: compressed.mimeType,
    name: compressed.file.name,
    objectFit: 'cover',
    overlayIntensity: 'auto',
    objectPositionX: 50,
    objectPositionY: 50,
    previewBlobKey: storedPreviewBlobKey,
    size: compressed.sizeBytes,
    uploadDataUrl,
    uploadState: 'queued',
    updatedAt: new Date().toISOString(),
    width: compressed.width,
    zoom: 1,
  };
}

export async function discardLocalImageAsset(image?: LocalImageAsset) {
  if (!image || image.storagePath) return;

  await Promise.all(
    [image.blobKey, image.displayBlobKey, image.previewBlobKey]
      .filter((key): key is string => Boolean(key))
      .map((key) => deleteImageBlob(key).catch(() => undefined)),
  );
}

async function dataUrlToBlob(dataUrl: string) {
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error('Could not prepare this image preview.');
  return response.blob();
}

function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('load', () => resolve(String(reader.result)));
    reader.addEventListener('error', () => reject(new Error('Could not prepare this image.')));
    reader.readAsDataURL(blob);
  });
}
