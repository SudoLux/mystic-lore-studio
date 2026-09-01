import type { CanonicalWorkspaceState } from '../workspace';
import type {
  CanonicalMigrationReport,
  CanonicalOutboxEntry,
} from './contracts';
import type { CanonicalConflict } from '../workspace';

const databaseName = 'mystic-lore-studio-canonical-v1';
const databaseVersion = 2;
const databaseOpenTimeoutMs = 8_000;

type StoredOutbox = CanonicalOutboxEntry & { id: string; studioId: string };
type StoredWorkspace = { id: string; state: CanonicalWorkspaceState; updatedAt: string };
type StoredRecovery = { id: string; state: CanonicalWorkspaceState; report: CanonicalMigrationReport | null; preservedAt: string };
type StoredMedia = { id: string; blob: Blob; checksum: string; updatedAt: string };
type StoredSetting = { id: string; value: unknown; updatedAt: string };

const memory = {
  media: new Map<string, StoredMedia>(),
  outbox: new Map<string, StoredOutbox>(),
  recovery: new Map<string, StoredRecovery>(),
  settings: new Map<string, StoredSetting>(),
  workspaces: new Map<string, StoredWorkspace>(),
};

export class CanonicalIndexedDb {
  async getWorkspace(studioId: string) {
    return (await getRecord<StoredWorkspace>('workspaces', studioId))?.state ?? null;
  }

  async putWorkspace(state: CanonicalWorkspaceState) {
    await putRecord('workspaces', { id: state.studioId, state, updatedAt: new Date().toISOString() } satisfies StoredWorkspace);
  }

  async getSetting<T>(key: string): Promise<T | null> {
    return ((await getRecord<StoredSetting>('settings', key))?.value as T | undefined) ?? null;
  }

  async putSetting<T>(key: string, value: T) {
    await putRecord('settings', { id: key, updatedAt: new Date().toISOString(), value } satisfies StoredSetting);
  }

  async putOutbox(entry: CanonicalOutboxEntry) {
    await putRecord('outbox', {
      ...entry,
      id: entry.operation.operationId,
      studioId: entry.operation.studioId,
    } satisfies StoredOutbox);
  }

  async deleteOutbox(operationId: string) {
    await deleteRecord('outbox', operationId);
  }

  async listOutbox(studioId: string) {
    const records = await getAllRecords<StoredOutbox>('outbox');
    return records
      .filter((entry) => entry.studioId === studioId)
      .sort((a, b) => a.operation.queuedAt.localeCompare(b.operation.queuedAt));
  }

  async listTransportConflicts(studioId: string): Promise<CanonicalConflict[]> {
    const entries = await this.listOutbox(studioId);
    return entries.flatMap((entry) => entry.status === 'conflict' ? transportConflicts(entry) : []);
  }

  async resolveTransportConflict(studioId: string, conflictId: string, resolution: 'local' | 'remote') {
    const entries = await this.listOutbox(studioId);
    for (const entry of entries) {
      const conflict = transportConflicts(entry).find((item) => item.id === conflictId);
      if (!conflict) continue;
      const serverConflict = entry.conflicts.find((item) => item.entityType === conflict.entityType && item.entityId === conflict.entityId);
      const mutations = entry.operation.mutations.filter((mutation) => {
        if (mutation.entityType !== conflict.entityType || mutation.entityId !== conflict.entityId) return true;
        if (resolution === 'remote') return false;
        mutation.baseRevision = serverConflict?.currentRevision ?? mutation.baseRevision;
        if (mutation.action === 'insert') mutation.action = 'update';
        return true;
      });
      if (mutations.length === 0) {
        await this.deleteOutbox(entry.operation.operationId);
      } else {
        await this.putOutbox({
          ...entry,
          conflicts: entry.conflicts.filter((item) => item.entityType !== conflict.entityType || item.entityId !== conflict.entityId),
          lastError: null,
          operation: { ...entry.operation, mutations },
          status: entry.conflicts.length > 1 ? 'conflict' : 'pending',
        });
      }
      return;
    }
    throw new Error('The queued transport conflict is no longer available. Refresh the Studio.');
  }

  async preserveRecoveryCopy(key: string, state: CanonicalWorkspaceState, report: CanonicalMigrationReport | null = null) {
    await putRecord('recovery', {
      id: key,
      preservedAt: new Date().toISOString(),
      report,
      state,
    } satisfies StoredRecovery);
  }

  async getRecoveryCopy(key: string) {
    return await getRecord<StoredRecovery>('recovery', key);
  }

  async putMediaBlob(key: string, blob: Blob, checksum: string) {
    const record = { blob, checksum, id: key, updatedAt: new Date().toISOString() } satisfies StoredMedia;
    try {
      await putRecord('media', record);
    } catch {
      // Safari Private Browsing can expose IndexedDB but reject Blob/File
      // writes. Keep the file available for this live upload rather than
      // blocking the user; normal browsers still retain the offline cache.
      memory.media.set(key, record);
    }
  }

  async getMediaBlob(key: string) {
    try {
      return await getRecord<StoredMedia>('media', key) ?? memory.media.get(key) ?? null;
    } catch {
      return memory.media.get(key) ?? null;
    }
  }

  async deleteMediaBlob(key: string) {
    memory.media.delete(key);
    try {
      await deleteRecord('media', key);
    } catch {
      // The staged copy was already cleared from this session. Browsers that
      // reject private-mode Blob transactions have nothing durable to clear.
    }
  }
}

function transportConflicts(entry: CanonicalOutboxEntry): CanonicalConflict[] {
  return entry.conflicts.map((conflict) => {
    const key = `${conflict.entityType}:${conflict.entityId}`;
    const base = entry.baseRows[key] ?? null;
    const local = entry.localRows[key] ?? null;
    const remote = conflict.currentRow;
    const localChanged = changedFields(base, local);
    const remoteChanged = changedFields(base, remote);
    const overlapping = [...localChanged].filter((field) => remoteChanged.has(field));
    const now = entry.operation.queuedAt;
    return {
      baseValue: base,
      createdAt: now,
      entityId: conflict.entityId,
      entityType: conflict.entityType,
      field: overlapping.length ? overlapping.join(', ') : '$record',
      garmentId: entry.operation.garmentId
        ?? String(local?.garment_id ?? remote?.garment_id ?? ''),
      id: `transport:${entry.operation.operationId}:${conflict.entityType}:${conflict.entityId}`,
      localOperationId: entry.operation.operationId,
      localValue: local,
      remoteOperationId: `server:r${conflict.currentRevision ?? 'missing'}`,
      remoteValue: remote,
      resolution: 'pending',
      revision: 1,
      studioId: entry.operation.studioId,
      updatedAt: now,
    };
  });
}

function changedFields(base: Record<string, unknown> | null, value: Record<string, unknown> | null) {
  if (!base || !value) return new Set(['$record']);
  const ignored = new Set(['created_at', 'updated_at', 'revision']);
  return new Set([...new Set([...Object.keys(base), ...Object.keys(value)])]
    .filter((key) => !ignored.has(key) && stableValue(base[key]) !== stableValue(value[key])));
}

function stableValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`;
  if (value && typeof value === 'object') return JSON.stringify(Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))));
  return JSON.stringify(value);
}

async function openCanonicalDatabase() {
  if (typeof indexedDB === 'undefined') return null;
  return await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion);
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      callback();
    };
    const timeout = window.setTimeout(() => {
      finish(() => reject(new Error('The Studio cache is still preparing. Close other Mystic Lore beta tabs, then reload this page.')));
    }, databaseOpenTimeoutMs);
    request.onupgradeneeded = () => {
      const database = request.result;
      for (const store of ['workspaces', 'outbox', 'recovery', 'media', 'settings']) {
        if (!database.objectStoreNames.contains(store)) database.createObjectStore(store, { keyPath: 'id' });
      }
    };
    request.onblocked = () => {
      finish(() => reject(new Error('The Studio cache is in use by another beta tab. Close other Mystic Lore beta tabs, then reload this page.')));
    };
    request.onerror = () => finish(() => reject(request.error ?? new Error('Canonical IndexedDB could not be opened.')));
    request.onsuccess = () => finish(() => resolve(request.result));
  });
}

async function getRecord<T>(store: keyof typeof memory, id: string): Promise<T | null> {
  const database = await openCanonicalDatabase();
  if (!database) return (memory[store].get(id) as T | undefined) ?? null;
  return await transactionResult<T | null>(database, store, 'readonly', (objectStore) => objectStore.get(id), null);
}

async function getAllRecords<T>(store: keyof typeof memory): Promise<T[]> {
  const database = await openCanonicalDatabase();
  if (!database) return [...memory[store].values()] as T[];
  return await transactionResult<T[]>(database, store, 'readonly', (objectStore) => objectStore.getAll(), []);
}

async function putRecord<T extends { id: string }>(store: keyof typeof memory, value: T) {
  const database = await openCanonicalDatabase();
  if (!database) {
    (memory[store] as unknown as Map<string, typeof value>).set(value.id, value);
    return;
  }
  await transactionResult(database, store, 'readwrite', (objectStore) => objectStore.put(value), undefined);
}

async function deleteRecord(store: keyof typeof memory, id: string) {
  const database = await openCanonicalDatabase();
  if (!database) {
    memory[store].delete(id);
    return;
  }
  await transactionResult(database, store, 'readwrite', (objectStore) => objectStore.delete(id), undefined);
}

async function transactionResult<T>(
  database: IDBDatabase,
  storeName: string,
  mode: IDBTransactionMode,
  requestFactory: (store: IDBObjectStore) => IDBRequest,
  fallback: T,
) {
  return await new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = requestFactory(transaction.objectStore(storeName));
    request.onsuccess = () => resolve((request.result as T) ?? fallback);
    request.onerror = () => reject(request.error ?? new Error(`IndexedDB ${storeName} request failed.`));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => reject(transaction.error ?? new Error(`IndexedDB ${storeName} transaction failed.`));
  });
}

export async function canonicalStateChecksum(state: CanonicalWorkspaceState) {
  return await canonicalValueChecksum(state);
}

export async function canonicalValueChecksum(value: unknown) {
  const bytes = new TextEncoder().encode(stableJson(value));
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
  }
  let hash = 0x811c9dc5;
  for (const byte of bytes) hash = Math.imul(hash ^ byte, 0x01000193);
  return (hash >>> 0).toString(16).padStart(8, '0').repeat(8);
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
