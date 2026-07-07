import type { EditorialExportImageAssetSnapshot } from './editorialExport';
import { getImageBlob } from './imageBlobStore';

export type ResolvedEditorialExportImage = Readonly<{
  dataUrl: string;
  mimeType: string;
}>;

/** Resolves a snapshot image without consulting editor or viewer state. */
export async function resolveEditorialExportImage(
  asset: EditorialExportImageAssetSnapshot,
): Promise<ResolvedEditorialExportImage | undefined> {
  const source = asset.source.dataUrl || asset.source.remoteUrl || asset.source.externalUrl;
  if (source?.startsWith('data:')) {
    return {
      dataUrl: source,
      mimeType: asset.mimeType || source.slice(5, source.indexOf(';')) || 'image/jpeg',
    };
  }

  if (source) {
    try {
      const response = await fetch(source);
      if (!response.ok) return undefined;
      const mimeType = response.headers.get('content-type') || asset.mimeType || 'image/jpeg';
      return {
        dataUrl: bytesToDataUrl(new Uint8Array(await response.arrayBuffer()), mimeType),
        mimeType,
      };
    } catch {
      return undefined;
    }
  }

  const blobKey = asset.source.previewBlobKey || asset.source.blobKey;
  if (!blobKey) return undefined;
  try {
    const blob = await getImageBlob(blobKey);
    if (!blob) return undefined;
    const mimeType = blob.type || asset.mimeType || 'image/jpeg';
    return {
      dataUrl: bytesToDataUrl(new Uint8Array(await blob.arrayBuffer()), mimeType),
      mimeType,
    };
  } catch {
    return undefined;
  }
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
