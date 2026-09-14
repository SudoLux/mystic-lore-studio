import type {
  CanonicalMigrationBatch,
  CanonicalMigrationPlan,
  CanonicalMigrationTable,
} from './contracts';
import { sha256Hex, stableStringify } from './stableIdentity';

export type MigrationWriteResult = {
  inserted: number;
  unchanged: number;
  updated: number;
};

export interface CanonicalMigrationStore {
  upsert(batch: CanonicalMigrationBatch): Promise<MigrationWriteResult>;
}

export type MigrationExecutionEvidence = {
  appliedBatches: number;
  completed: boolean;
  finalChecksum?: string;
  inserted: number;
  planChecksum: string;
  skippedServerRows: number;
  unchanged: number;
  updated: number;
};

export type MigrationExecutionOptions = {
  includeServerBatches?: boolean;
  interruptAfterBatches?: number;
};

export class MigrationInterruptedError extends Error {
  constructor(public readonly evidence: MigrationExecutionEvidence) {
    super('Canonical migration was intentionally interrupted after a completed batch.');
    this.name = 'MigrationInterruptedError';
  }
}

export async function executeCanonicalMigration(
  plan: CanonicalMigrationPlan,
  store: CanonicalMigrationStore,
  options: MigrationExecutionOptions = {},
) {
  const evidence: MigrationExecutionEvidence = {
    appliedBatches: 0,
    completed: false,
    inserted: 0,
    planChecksum: plan.report.checksums.canonicalPlan,
    skippedServerRows: 0,
    unchanged: 0,
    updated: 0,
  };

  for (const batch of plan.batches) {
    if (batch.rows.length === 0) continue;
    if (batch.access === 'server' && !options.includeServerBatches) {
      evidence.skippedServerRows += batch.rows.length;
      continue;
    }

    const result = await store.upsert(batch);
    evidence.appliedBatches += 1;
    evidence.inserted += result.inserted;
    evidence.unchanged += result.unchanged;
    evidence.updated += result.updated;

    if (
      options.interruptAfterBatches !== undefined &&
      evidence.appliedBatches >= options.interruptAfterBatches
    ) {
      throw new MigrationInterruptedError(evidence);
    }
  }

  evidence.completed = true;
  if (store instanceof InMemoryCanonicalMigrationStore) {
    evidence.finalChecksum = await store.checksum();
  }
  return evidence;
}

export class InMemoryCanonicalMigrationStore implements CanonicalMigrationStore {
  private readonly tables = new Map<CanonicalMigrationTable, Map<string, object>>();

  async upsert(batch: CanonicalMigrationBatch) {
    const table = this.tables.get(batch.table) ?? new Map<string, object>();
    this.tables.set(batch.table, table);
    const result: MigrationWriteResult = { inserted: 0, unchanged: 0, updated: 0 };
    const conflictFields = batch.onConflict.split(',');

    for (const row of batch.rows as object[]) {
      const record = row as Record<string, unknown>;
      const key = conflictFields.map((field) => stableStringify(record[field])).join('|');
      const existing = table.get(key);
      if (!existing) {
        table.set(key, structuredClone(row));
        result.inserted += 1;
      } else if (stableStringify(existing) === stableStringify(row)) {
        result.unchanged += 1;
      } else if (batch.writeMode === 'insert-ignore') {
        result.unchanged += 1;
      } else {
        table.set(key, structuredClone(row));
        result.updated += 1;
      }
    }

    return result;
  }

  count(table: CanonicalMigrationTable) {
    return this.tables.get(table)?.size ?? 0;
  }

  records(table: CanonicalMigrationTable) {
    return [...(this.tables.get(table)?.values() ?? [])].map((row) => structuredClone(row));
  }

  serialize() {
    return stableStringify(
      [...this.tables.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([table, records]) => ({
          records: [...records.entries()].sort(([left], [right]) => left.localeCompare(right)),
          table,
        })),
    );
  }

  static reload(serialized: string) {
    const store = new InMemoryCanonicalMigrationStore();
    const tables = JSON.parse(serialized) as Array<{
      records: Array<[string, object]>;
      table: CanonicalMigrationTable;
    }>;
    for (const { records, table } of tables) {
      store.tables.set(table, new Map(records));
    }
    return store;
  }

  async checksum() {
    return sha256Hex(this.serialize());
  }
}
