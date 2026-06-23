import type { LocalImageAsset } from '../types/studio';
import { compressImageForApp } from './imageCompression';

const DATABASE_NAME = 'mystic-lore-studio-media';
const DATABASE_VERSION = 2;
const BLOB_STORE_NAME = 'image-blobs';
const SYNC_STORE_NAME = 'sync-state';

export async function saveImageBlob(key: string, blob: Blob) {
  const database = await openDatabase();

  await transactionPromise(database, BLOB_STORE_NAME, 'readwrite', (store) =>
    store.put(blob, key),
  );
  database.close();
}

export async function getImageBlob(key: string) {
  const database = await openDatabase();
  const blob = await transactionPromise<Blob | undefined>(
    database,
    BLOB_STORE_NAME,
    'readonly',
    (store) => store.get(key),
  );
  database.close();
  return blob;
}

export async function deleteImageBlob(key: string) {
  const database = await openDatabase();

  await transactionPromise(database, BLOB_STORE_NAME, 'readwrite', (store) =>
    store.delete(key),
  );
  database.close();
}

export async function saveDurableSyncState(key: string, value: unknown) {
  const database = await openDatabase();
  await transactionPromise(database, SYNC_STORE_NAME, 'readwrite', (store) =>
    store.put(value, key),
  );
  database.close();
}

export async function getDurableSyncState<T>(key: string) {
  const database = await openDatabase();
  const value = await transactionPromise<T | undefined>(
    database,
    SYNC_STORE_NAME,
    'readonly',
    (store) => store.get(key),
  );
  database.close();
  return value;
}

export async function deleteDurableSyncState(key: string) {
  const database = await openDatabase();
  await transactionPromise(database, SYNC_STORE_NAME, 'readwrite', (store) =>
    store.delete(key),
  );
  database.close();
}

export async function migrateLegacyImageBlob(image: LocalImageAsset) {
  if (image.blobKey || !image.uploadDataUrl) {
    return image;
  }

  const response = await fetch(image.uploadDataUrl);

  if (!response.ok) {
    return image;
  }

  const blobKey = imageBlobKey(image.id);
  try {
    await saveImageBlob(blobKey, await response.blob());
  } catch {
    return image;
  }

  return {
    ...image,
    blobKey,
    uploadDataUrl: undefined,
    uploadState: image.uploadState === 'uploaded' ? 'uploaded' : 'queued',
  } satisfies LocalImageAsset;
}

export async function hydrateImagePreview(image: LocalImageAsset) {
  let prepared = image;

  if (!prepared.previewBlobKey && prepared.dataUrl?.startsWith('data:image/')) {
    const previewBlobKey = previewImageBlobKey(prepared.id);

    try {
      await saveImageBlob(previewBlobKey, await dataUrlToBlob(prepared.dataUrl));
      prepared = { ...prepared, previewBlobKey };
    } catch {
      return prepared;
    }
  }

  if (prepared.dataUrl || !prepared.previewBlobKey) {
    return prepared;
  }

  try {
    const preview = await getImageBlob(prepared.previewBlobKey);
    return preview
      ? { ...prepared, dataUrl: await blobToDataUrl(preview) }
      : prepared;
  } catch {
    return prepared;
  }
}

export async function cacheRemoteImagePreview(image: LocalImageAsset) {
  const hydrated = await hydrateImagePreview(image);

  if (hydrated.dataUrl || !hydrated.remoteUrl) {
    return hydrated;
  }

  try {
    const response = await fetch(hydrated.remoteUrl);
    if (!response.ok) return hydrated;
    const source = await response.blob();
    const compressed = await compressImageForApp(
      new File([source], hydrated.name, { type: source.type || hydrated.mimeType }),
      {
        dimensionSteps: [480],
        maxDimension: 480,
        maxSizeBytes: 512 * 1024,
        previewDimension: 480,
      },
    );
    const previewBlobKey = previewImageBlobKey(hydrated.id);
    await saveImageBlob(previewBlobKey, compressed.blob);
    return {
      ...hydrated,
      dataUrl: compressed.previewDataUrl,
      previewBlobKey,
    };
  } catch {
    return hydrated;
  }
}

export function imageBlobKey(imageId: string) {
  return `image:${imageId}`;
}

export function previewImageBlobKey(imageId: string) {
  return `preview:${imageId}`;
}

async function dataUrlToBlob(dataUrl: string) {
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error('Could not prepare the image preview.');
  return response.blob();
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result)));
    reader.addEventListener('error', () =>
      reject(new Error('Could not load the offline image preview.')),
    );
    reader.readAsDataURL(blob);
  });
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is unavailable.'));
      return;
    }

    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.addEventListener('upgradeneeded', () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(BLOB_STORE_NAME)) {
        database.createObjectStore(BLOB_STORE_NAME);
      }
      if (!database.objectStoreNames.contains(SYNC_STORE_NAME)) {
        database.createObjectStore(SYNC_STORE_NAME);
      }
    });
    request.addEventListener('success', () => resolve(request.result));
    request.addEventListener('error', () =>
      reject(request.error ?? new Error('Could not open local image storage.')),
    );
  });
}

function transactionPromise<T>(
  database: IDBDatabase,
  storeName: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
) {
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = action(transaction.objectStore(storeName));
    let result: T;

    request.addEventListener('success', () => {
      result = request.result;
    });
    request.addEventListener('error', () =>
      reject(request.error ?? new Error('Could not access local image storage.')),
    );
    transaction.addEventListener('complete', () => resolve(result));
    transaction.addEventListener('abort', () =>
      reject(transaction.error ?? new Error('Local image storage was interrupted.')),
    );
  });
}
