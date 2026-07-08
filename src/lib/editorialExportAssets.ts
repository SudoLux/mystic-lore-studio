import type { EditorialExportImageAssetSnapshot } from './editorialExport';
import { getImageBlob } from './imageBlobStore';
import { refreshSignedImageUrl } from './supabaseStudio';

export type ResolvedEditorialExportImage = Readonly<{
  dataUrl: string;
  mimeType: string;
  quality: 'external' | 'master' | 'preview';
  source: 'external' | 'indexed-db' | 'preview-blob' | 'preview-data' | 'remote' | 'refreshed-remote';
}>;

/** Resolves a snapshot image without consulting editor or viewer state. */
export async function resolveEditorialExportImage(
  asset: EditorialExportImageAssetSnapshot,
): Promise<ResolvedEditorialExportImage | undefined> {
  const remote = await fetchExportImage(asset.source.remoteUrl, asset.mimeType, 'master', 'remote');
  if (remote) return remote;

  if (asset.source.storagePath) {
    try {
      const refreshedUrl = await refreshSignedImageUrl(asset.source.storagePath);
      const refreshed = await fetchExportImage(refreshedUrl, asset.mimeType, 'master', 'refreshed-remote');
      if (refreshed) return refreshed;
    } catch {
      // Local masters and previews remain valid when cloud access is unavailable.
    }
  }

  if (asset.source.blobKey) {
    try {
      const blob = await getImageBlob(asset.source.blobKey);
      if (blob) return blobToResolvedImage(blob, asset.mimeType, 'master', 'indexed-db');
    } catch {
      // Continue to external and preview fallbacks.
    }
  }

  const external = await fetchExportImage(asset.source.externalUrl, asset.mimeType, 'external', 'external');
  if (external) return external;

  if (asset.source.dataUrl?.startsWith('data:')) {
    const mimeType = asset.mimeType
      || asset.source.dataUrl.slice(5, asset.source.dataUrl.indexOf(';'))
      || 'image/jpeg';
    return {
      dataUrl: asset.source.dataUrl,
      mimeType,
      quality: 'preview',
      source: 'preview-data',
    };
  }

  if (!asset.source.previewBlobKey) return undefined;
  try {
    const blob = await getImageBlob(asset.source.previewBlobKey);
    return blob ? blobToResolvedImage(blob, asset.mimeType, 'preview', 'preview-blob') : undefined;
  } catch {
    return undefined;
  }
}

async function fetchExportImage(
  source: string | undefined,
  fallbackMimeType: string | undefined,
  quality: ResolvedEditorialExportImage['quality'],
  sourceType: ResolvedEditorialExportImage['source'],
) {
  if (!source) return undefined;
  if (source.startsWith('data:')) {
    return {
      dataUrl: source,
      mimeType: fallbackMimeType || source.slice(5, source.indexOf(';')) || 'image/jpeg',
      quality,
      source: sourceType,
    } satisfies ResolvedEditorialExportImage;
  }
  try {
    const response = await fetch(source);
    if (!response.ok) return undefined;
    return blobToResolvedImage(await response.blob(), fallbackMimeType, quality, sourceType);
  } catch {
    return undefined;
  }
}

async function blobToResolvedImage(
  blob: Blob,
  fallbackMimeType: string | undefined,
  quality: ResolvedEditorialExportImage['quality'],
  source: ResolvedEditorialExportImage['source'],
): Promise<ResolvedEditorialExportImage> {
  const mimeType = blob.type || fallbackMimeType || 'image/jpeg';
  return {
    dataUrl: bytesToDataUrl(new Uint8Array(await blob.arrayBuffer()), mimeType),
    mimeType,
    quality,
    source,
  };
}

export function bytesToDataUrl(bytes: Uint8Array, mimeType: string) {
  return `data:${mimeType};base64,${encodeBase64(bytes)}`;
}

function encodeBase64(bytes: Uint8Array) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    output += alphabet[first >> 2];
    output += alphabet[((first & 3) << 4) | ((second ?? 0) >> 4)];
    output += index + 1 < bytes.length ? alphabet[((second & 15) << 2) | ((third ?? 0) >> 6)] : '=';
    output += index + 2 < bytes.length ? alphabet[third & 63] : '=';
  }
  return output;
}
