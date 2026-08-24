import type { StudioData } from '../../lib/studioStorage';
import type {
  SyncImagePayload,
  SyncOperation,
} from '../../lib/studioSyncStorage';
import type {
  LegacyMigrationTombstone,
  MigrationConflict,
  MigrationNotice,
} from './contracts';
import { stableStringify } from './stableIdentity';

export type LegacyQueueReplayResult = {
  conflicts: MigrationConflict[];
  data: StudioData;
  skippedRecords: MigrationNotice[];
  tombstones: LegacyMigrationTombstone[];
  warnings: MigrationNotice[];
};

/**
 * Replays the durable legacy outbox without mutating its source snapshot.
 * Tombstones suppress stale writes; equally old divergent writes remain
 * visible as conflicts instead of being silently overwritten.
 */
export function replayLegacyQueue(
  source: StudioData,
  operations: SyncOperation[] = [],
  initialTombstones: LegacyMigrationTombstone[] = [],
): LegacyQueueReplayResult {
  const data = structuredClone(source);
  const conflicts: MigrationConflict[] = [];
  const warnings: MigrationNotice[] = [];
  const skippedRecords: MigrationNotice[] = [];
  const tombstoneByKey = new Map(
    initialTombstones.map((tombstone) => [tombstoneKey(tombstone.entity, tombstone.clientId), tombstone]),
  );

  for (const tombstone of initialTombstones) {
    const current = findLegacyRecord(data, tombstone.entity, tombstone.clientId);
    if (!current || timestamp(tombstone.deletedAt) >= timestamp(recordTimestamp(current))) {
      deleteLegacyRecord(data, {
        action: 'delete',
        attempts: 0,
        clientId: tombstone.clientId,
        entity: tombstone.entity as SyncOperation['entity'],
        id: `retained-tombstone:${tombstone.entity}:${tombstone.clientId}`,
        key: tombstoneKey(tombstone.entity, tombstone.clientId),
        queuedAt: tombstone.deletedAt,
        updatedAt: tombstone.deletedAt,
      });
    }
  }

  const ordered = [...operations].sort((left, right) =>
    left.queuedAt.localeCompare(right.queuedAt) || left.id.localeCompare(right.id),
  );

  for (const operation of ordered) {
    if (operation.action === 'delete') {
      const tombstone = {
        clientId: operation.clientId,
        deletedAt: operation.updatedAt,
        entity: operation.entity,
      } satisfies LegacyMigrationTombstone;
      const key = tombstoneKey(tombstone.entity, tombstone.clientId);
      const current = tombstoneByKey.get(key);
      if (!current || timestamp(current.deletedAt) <= timestamp(tombstone.deletedAt)) {
        tombstoneByKey.set(key, tombstone);
        deleteLegacyRecord(data, operation);
      }
      continue;
    }

    const deletion = tombstoneByKey.get(tombstoneKey(operation.entity, operation.clientId));
    if (deletion && timestamp(deletion.deletedAt) >= timestamp(operation.updatedAt)) {
      skippedRecords.push({
        code: 'tombstone-wins',
        entity: operation.entity,
        legacyId: operation.clientId,
        message: 'A newer or equal deletion tombstone suppressed this queued write.',
      });
      continue;
    }

    if (!operation.payload || typeof operation.payload !== 'object') {
      skippedRecords.push({
        code: 'malformed-queued-payload',
        entity: operation.entity,
        legacyId: operation.clientId,
        message: 'Queued upsert had no object payload and was retained in recovery evidence.',
      });
      continue;
    }

    if (operation.entity === 'project_image' || operation.entity === 'fabric_image') {
      applyQueuedImage(data, operation, warnings);
      continue;
    }

    const current = findLegacyRecord(data, operation.entity, operation.clientId);
    if (
      current &&
      operation.basePayload &&
      typeof operation.basePayload === 'object'
    ) {
      const merge = mergeWithCommonAncestor(
        operation.basePayload,
        operation.payload,
        current,
      );
      if (merge.conflictingFields.length > 0) {
        conflicts.push({
          clientId: operation.clientId,
          entity: operation.entity,
          fields: merge.conflictingFields,
          operationId: operation.id,
          resolution: 'remote-retained',
        });
      }
      upsertLegacyRecord(data, { ...operation, payload: merge.value });
      continue;
    }
    if (
      current &&
      timestamp(recordTimestamp(current)) >= timestamp(operation.updatedAt) &&
      stableStringify(current) !== stableStringify(operation.payload)
    ) {
      conflicts.push({
        clientId: operation.clientId,
        entity: operation.entity,
        fields: differingFields(operation.payload, current),
        operationId: operation.id,
        resolution: 'remote-retained',
      });
      continue;
    }

    upsertLegacyRecord(data, operation);
  }

  return {
    conflicts,
    data,
    skippedRecords,
    tombstones: [...tombstoneByKey.values()].sort((left, right) =>
      tombstoneKey(left.entity, left.clientId).localeCompare(
        tombstoneKey(right.entity, right.clientId),
      ),
    ),
    warnings,
  };
}

function findLegacyRecord(data: StudioData, entity: string, clientId: string) {
  if (entity === 'profile') return data.portfolioProfile;
  const array = legacyArray(data, entity);
  return array?.find((record) => record.id === clientId);
}

function upsertLegacyRecord(data: StudioData, operation: SyncOperation) {
  if (operation.entity === 'profile') {
    const { id: _id, ...profile } = operation.payload as Record<string, unknown>;
    void _id;
    data.portfolioProfile = profile as unknown as StudioData['portfolioProfile'];
    return;
  }

  const array = legacyArray(data, operation.entity);
  if (!array) return;
  const payload = operation.payload as { id: string };
  const index = array.findIndex((record) => record.id === operation.clientId);
  if (index >= 0) array[index] = payload;
  else array.push(payload);
}

function deleteLegacyRecord(data: StudioData, operation: SyncOperation) {
  const id = operation.clientId;
  if (operation.entity === 'project') {
    data.projects = data.projects.filter((record) => record.id !== id);
    data.linkedMaterials = data.linkedMaterials.filter((record) => record.projectId !== id);
    data.tasks = data.tasks.filter((record) => record.projectId !== id);
    data.notes = data.notes.filter((record) => record.projectId !== id);
    data.lookbookPages = data.lookbookPages.filter((record) => record.projectId !== id);
    data.editorialCollections = data.editorialCollections.filter((record) => record.projectId !== id);
    data.yardageEntries = data.yardageEntries.map((record) =>
      record.projectId === id ? { ...record, projectId: undefined } : record,
    );
    return;
  }

  if (operation.entity === 'fabric') {
    data.fabrics = data.fabrics.filter((record) => record.id !== id);
    data.linkedMaterials = data.linkedMaterials.map((record) =>
      record.fabricId === id ? { ...record, fabricId: undefined } : record,
    );
    data.yardageEntries = data.yardageEntries.filter((record) => record.fabricId !== id);
    return;
  }

  if (operation.entity === 'material') {
    data.linkedMaterials = data.linkedMaterials.filter((record) => record.id !== id);
    data.tasks = data.tasks.map((record) =>
      record.linkedMaterialId === id
        ? { ...record, linkedMaterialId: undefined }
        : record,
    );
    data.yardageEntries = data.yardageEntries.map((record) =>
      record.materialId === id ? { ...record, materialId: undefined } : record,
    );
    return;
  }

  if (operation.entity === 'profile') return;
  const array = legacyArray(data, operation.entity);
  if (!array) return;
  const next = array.filter((record) => record.id !== id);
  array.splice(0, array.length, ...next);
}

function applyQueuedImage(
  data: StudioData,
  operation: SyncOperation,
  warnings: MigrationNotice[],
) {
  const payload = operation.payload as SyncImagePayload;
  if (!payload.image || !payload.ownerId) {
    warnings.push({
      code: 'malformed-image-operation',
      entity: operation.entity,
      legacyId: operation.clientId,
      message: 'Queued media payload was retained but could not be attached to an owner.',
    });
    return;
  }

  if (payload.ownerType === 'fabric') {
    const fabric = data.fabrics.find((record) => record.id === payload.ownerId);
    if (fabric) fabric.image = payload.image;
    return;
  }

  if (payload.ownerType === 'lookbook') {
    const page = data.lookbookPages.find((record) => record.id === payload.ownerId);
    if (page) page.heroImage = payload.image;
    return;
  }

  const project = data.projects.find((record) => record.id === payload.ownerId);
  if (!project) return;
  if (payload.slotType === 'hero') project.heroImage = payload.image;
  else if (payload.slotType.startsWith('gallery')) {
    const images = [...(project.galleryImages ?? [])];
    images[payload.order] = payload.image;
    project.galleryImages = images.filter(Boolean);
  } else {
    const images = [...(project.editorialImages ?? [])];
    images[payload.order] = payload.image;
    project.editorialImages = images.filter(Boolean);
  }
}

function legacyArray(data: StudioData, entity: string): Array<{ id: string }> | null {
  if (entity === 'project') return data.projects;
  if (entity === 'fabric') return data.fabrics;
  if (entity === 'material') return data.linkedMaterials;
  if (entity === 'task') return data.tasks;
  if (entity === 'note') return data.notes;
  if (entity === 'lookbook') return data.lookbookPages;
  if (entity === 'yardage') return data.yardageEntries;
  return null;
}

function differingFields(local: object, remote: object) {
  const localRecord = local as Record<string, unknown>;
  const remoteRecord = remote as Record<string, unknown>;
  return [...new Set([...Object.keys(localRecord), ...Object.keys(remoteRecord)])]
    .filter((field) => stableStringify(localRecord[field]) !== stableStringify(remoteRecord[field]))
    .sort()
    .map((field) => ({
      field,
      local: localRecord[field],
      remote: remoteRecord[field],
    }));
}

function mergeWithCommonAncestor(base: object, local: object, remote: object) {
  const baseRecord = base as Record<string, unknown>;
  const localRecord = local as Record<string, unknown>;
  const remoteRecord = remote as Record<string, unknown>;
  const value: Record<string, unknown> = {};
  const conflictingFields: MigrationConflict['fields'] = [];
  const fields = [...new Set([
    ...Object.keys(baseRecord),
    ...Object.keys(localRecord),
    ...Object.keys(remoteRecord),
  ])].sort();

  for (const field of fields) {
    if (field === 'updatedAt') {
      value[field] = timestamp(String(localRecord[field] ?? '')) >=
        timestamp(String(remoteRecord[field] ?? ''))
        ? localRecord[field]
        : remoteRecord[field];
      continue;
    }
    if (field === 'createdAt') {
      value[field] = remoteRecord[field] ?? localRecord[field] ?? baseRecord[field];
      continue;
    }
    const localChanged = stableStringify(localRecord[field]) !== stableStringify(baseRecord[field]);
    const remoteChanged = stableStringify(remoteRecord[field]) !== stableStringify(baseRecord[field]);
    if (
      localChanged &&
      remoteChanged &&
      stableStringify(localRecord[field]) !== stableStringify(remoteRecord[field])
    ) {
      conflictingFields.push({
        before: baseRecord[field],
        field,
        local: localRecord[field],
        remote: remoteRecord[field],
      });
      value[field] = remoteRecord[field];
    } else if (localChanged) {
      value[field] = localRecord[field];
    } else {
      value[field] = remoteRecord[field];
    }
  }

  return { conflictingFields, value };
}

function recordTimestamp(record: unknown) {
  const value = record as { createdAt?: string; updatedAt?: string };
  return value.updatedAt ?? value.createdAt ?? '1970-01-01T00:00:00.000Z';
}

function tombstoneKey(entity: string, clientId: string) {
  return `${entity}:${clientId}`;
}

function timestamp(value: string) {
  return Date.parse(value) || 0;
}
