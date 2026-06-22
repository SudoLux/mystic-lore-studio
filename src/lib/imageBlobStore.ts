import type { LocalImageAsset } from '../types/studio';

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

export function imageBlobKey(imageId: string) {
  return `image:${imageId}`;
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
