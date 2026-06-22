import {
  createSeedStudioData,
  getLegacyStudioData,
  type StudioData,
} from './studioStorage';

const OUTBOX_VERSION = 1;
const PREFIX = 'mystic-lore-studio:sync';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';
export type SyncEntity =
  | 'project'
  | 'fabric'
  | 'task'
  | 'note'
  | 'material'
  | 'lookbook'
  | 'project_image'
  | 'fabric_image'
  | 'yardage';

export type SyncDeletion = {
  clientId: string;
  deletedAt: string;
  entity: SyncEntity;
  storagePaths?: string[];
};

export type StudioSyncOutbox = {
  deletions: SyncDeletion[];
  queuedAt: string;
  snapshot: StudioData;
  version: number;
};

export type MigrationDecision = 'pending' | 'dismissed' | 'completed';

export function getSyncOutbox(userId: string): StudioSyncOutbox | null {
  return readJson<StudioSyncOutbox>(outboxKey(userId));
}

export function saveSyncOutbox(
  userId: string,
  snapshot: StudioData,
  deletions: SyncDeletion[] = [],
) {
  const current = getSyncOutbox(userId);
  const deletionByKey = new Map(
    [...(current?.deletions ?? []), ...deletions].map((deletion) => [
      `${deletion.entity}:${deletion.clientId}`,
      deletion,
    ]),
  );
  const outbox: StudioSyncOutbox = {
    deletions: [...deletionByKey.values()],
    queuedAt: new Date().toISOString(),
    snapshot,
    version: OUTBOX_VERSION,
  };

  window.localStorage.setItem(outboxKey(userId), JSON.stringify(outbox));
  return outbox;
}

export function clearSyncOutbox(userId: string) {
  window.localStorage.removeItem(outboxKey(userId));
}

export function getMigrationDecision(userId: string): MigrationDecision {
  return (
    window.localStorage.getItem(migrationKey(userId)) as MigrationDecision | null
  ) ?? 'pending';
}

export function setMigrationDecision(
  userId: string,
  decision: MigrationDecision,
) {
  window.localStorage.setItem(migrationKey(userId), decision);
}

export function preserveLegacyBackup(userId: string) {
  const key = backupKey(userId);

  if (window.localStorage.getItem(key)) {
    return;
  }

  const legacy = getLegacyStudioData();

  if (legacy) {
    window.localStorage.setItem(key, JSON.stringify(legacy));
  }
}

export function isUntouchedSeedData(data: StudioData) {
  return stableStringify(toComparableData(data)) ===
    stableStringify(toComparableData(createSeedStudioData()));
}

export function hasMeaningfulLocalData(data: StudioData) {
  return !isUntouchedSeedData(data);
}

function toComparableData(data: StudioData) {
  const clean = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map(clean);
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .filter(
            ([key]) =>
              ![
                'createdAt',
                'updatedAt',
                'remoteUrl',
                'signedUrlExpiresAt',
                'uploadState',
              ].includes(key),
          )
          .map(([key, item]) => [key, clean(item)]),
      );
    }

    return value;
  };

  return clean({
    fabrics: data.fabrics,
    linkedMaterials: data.linkedMaterials,
    lookbookPages: data.lookbookPages,
    notes: data.notes,
    projects: data.projects,
    tasks: data.tasks,
    yardageEntries: data.yardageEntries,
  });
}

function stableStringify(value: unknown) {
  return JSON.stringify(sortObject(value));
}

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, sortObject(item)]),
    );
  }

  return value;
}

function readJson<T>(key: string): T | null {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function outboxKey(userId: string) {
  return `${PREFIX}:outbox:${userId}`;
}

function migrationKey(userId: string) {
  return `${PREFIX}:migration:${userId}:v1`;
}

function backupKey(userId: string) {
  return `${PREFIX}:legacy-backup:${userId}`;
}
