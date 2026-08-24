import type { SupabaseClient } from '@supabase/supabase-js';
import type { CanonicalMigrationBatch } from './contracts';
import type {
  CanonicalMigrationStore,
  MigrationWriteResult,
} from './migrationExecutor';

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

    for (let index = 0; index < batch.rows.length; index += 200) {
      const rows = batch.rows.slice(index, index + 200) as never[];
      const { error } = await this.client
        .schema('ml_private')
        .from(batch.table)
        .upsert(rows, { onConflict: batch.onConflict });
      if (error) throw error;
    }
    return { inserted: batch.rows.length, unchanged: 0, updated: 0 };
  }
}
