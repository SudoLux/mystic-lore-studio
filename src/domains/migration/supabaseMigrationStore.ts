import type { SupabaseClient } from '@supabase/supabase-js';
import type { CanonicalMigrationBatch } from './contracts';
import type {
  CanonicalMigrationStore,
  MigrationWriteResult,
} from './migrationExecutor';
import { stableStringify } from './stableIdentity';

type MigrationLookup = {
  eq: (field: string, value: unknown) => MigrationLookup;
  is: (field: string, value: null) => MigrationLookup;
  maybeSingle: () => Promise<{
    data: Record<string, unknown> | null;
    error: { code?: string; message: string } | null;
  }>;
};

/**
 * Injectable cloud writer for an authenticated canonical Studio schema.
 * Production callers must never pass a service key to browser code; server-only
 * batches are rejected unless this store is explicitly created in a trusted
 * migration process.
 */
export class SupabaseCanonicalMigrationStore implements CanonicalMigrationStore {
  constructor(
    private readonly client: SupabaseClient,
    private readonly allowServerBatches = false,
  ) {}

  async upsert(batch: CanonicalMigrationBatch): Promise<MigrationWriteResult> {
    if (batch.access === 'server' && !this.allowServerBatches) {
      throw new Error(
        `Server-authored canonical batch ${batch.table} cannot run in a public client.`,
      );
    }
    if (batch.writeMode === 'insert-ignore') {
      const result: MigrationWriteResult = { inserted: 0, unchanged: 0, updated: 0 };
      for (const row of batch.rows as never[]) {
        const { error } = await this.client
          .schema('ml_private')
          .from(batch.table)
          .insert(row);
        if (!error) result.inserted += 1;
        else if (error.code === '23505') result.unchanged += 1;
        else throw error;
      }
      return result;
    }

    const result: MigrationWriteResult = { inserted: 0, unchanged: 0, updated: 0 };
    const conflictFields = batch.onConflict.split(',');

    // Do not issue an UPDATE for an identical row. Canonical mutable tables
    // advance revision/updated_at on every UPDATE, so a blind PostgREST upsert
    // would make a harmless migration retry look like a user-authored change.
    for (const row of batch.rows as Array<Record<string, unknown>>) {
      let lookup = this.client
        .schema('ml_private')
        .from(batch.table)
        .select('*') as unknown as MigrationLookup;

      for (const field of conflictFields) {
        lookup = row[field] === null
          ? lookup.is(field, null)
          : lookup.eq(field, row[field]);
      }

      const existing = await lookup.maybeSingle();
      if (existing.error) throw existing.error;

      if (existing.data && rowsMatch(existing.data, row)) {
        result.unchanged += 1;
        continue;
      }

      const { error } = await this.client
        .schema('ml_private')
        .from(batch.table)
        .upsert(row as never, { onConflict: batch.onConflict });
      if (error) throw error;
      if (existing.data) result.updated += 1;
      else result.inserted += 1;
    }
    return result;
  }
}

function rowsMatch(existing: Record<string, unknown>, candidate: Record<string, unknown>) {
  return Object.entries(candidate).every(([key, value]) => {
    if (key === 'created_at' || key === 'updated_at' || key === 'revision') return true;
    return stableStringify(normalizeComparableValue(existing[key]))
      === stableStringify(normalizeComparableValue(value));
  });
}

function normalizeComparableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeComparableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, item]) => [key, normalizeComparableValue(item)]),
    );
  }
  if (
    typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
  ) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.valueOf())) return parsed.toISOString();
  }
  return value;
}
