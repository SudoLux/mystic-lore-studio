import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import {
  buildLegacyCanonicalMigrationPlan,
  executeCanonicalMigration,
  MigrationInterruptedError,
  SupabaseCanonicalMigrationStore,
  type CanonicalMigrationTable,
} from '../src/domains/migration';
import { sha256Hex, stableStringify } from '../src/domains/migration/stableIdentity';
import { importStudioData } from '../src/lib/studioStorage';

const fixtureText = readFileSync(
  new URL('./fixtures/legacy-studio-data-v5.json', import.meta.url),
  'utf8',
);
const localUrl = process.env.RC_SUPABASE_URL ?? '';
const serviceRoleKey = process.env.RC_SUPABASE_SERVICE_ROLE_KEY ?? '';
const runIntegration = process.env.RUN_LOCAL_SUPABASE_RC === '1';

describe.skipIf(!runIntegration)('WP10 local production migration rehearsal', () => {
  it('recovers an interrupted trusted migration and keeps a duplicate run unchanged', async () => {
    expect(isLocalSupabaseUrl(localUrl)).toBe(true);
    expect(serviceRoleKey.length).toBeGreaterThan(20);

    const admin = createClient(localUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const created = await admin.auth.admin.createUser({
      email: 'rc-audit@mystic-lore.local',
      email_confirm: true,
      password: 'Local-RC-Audit-Only-2026!',
    });
    if (created.error) throw created.error;

    const source = importStudioData(fixtureText);
    const plan = await buildLegacyCanonicalMigrationPlan({
      data: source,
      generatedAt: '2026-08-27T12:00:00.000Z',
      ownerUserId: created.data.user.id,
      sourceId: 'wp10:legacy-studio-data-v5-release-candidate',
      studioName: 'Mystic Lore RC Audit Studio',
      studioSlug: 'mystic-lore-rc-audit-studio',
      timezone: 'America/Los_Angeles',
    });
    const store = new SupabaseCanonicalMigrationStore(admin, true);
    let interruption: MigrationInterruptedError | null = null;

    try {
      await executeCanonicalMigration(plan, store, {
        includeServerBatches: true,
        interruptAfterBatches: 5,
      });
    } catch (error) {
      if (!(error instanceof MigrationInterruptedError)) throw error;
      interruption = error;
    }

    expect(interruption?.evidence.appliedBatches).toBe(5);
    expect(plan.retention.originalData).toEqual(source);

    const recovery = await executeCanonicalMigration(plan, store, {
      includeServerBatches: true,
    });
    const firstSnapshot = await readCanonicalSnapshot(admin, plan.batches.map((batch) => batch.table));
    const firstChecksum = await sha256Hex(firstSnapshot);
    const duplicate = await executeCanonicalMigration(plan, store, {
      includeServerBatches: true,
    });
    const secondSnapshot = await readCanonicalSnapshot(admin, plan.batches.map((batch) => batch.table));
    const secondChecksum = await sha256Hex(secondSnapshot);

    expect(recovery.completed).toBe(true);
    expect(duplicate).toMatchObject({ completed: true, inserted: 0, updated: 0 });
    expect(duplicate.unchanged).toBeGreaterThan(0);
    expect(secondChecksum).toBe(firstChecksum);
    expect(plan.report.roundTrip).toMatchObject({ exact: true, unexplainedDataLoss: 0 });

    for (const [table, expectedCount] of Object.entries(plan.report.rowCounts.canonical)) {
      const actualCount = firstSnapshot[table as CanonicalMigrationTable]?.length ?? 0;
      if (table === 'change_events') expect(actualCount).toBeGreaterThanOrEqual(expectedCount);
      else expect(actualCount).toBe(expectedCount);
    }

    const publications = await countRows(admin, 'ml_public', 'publications');
    const publicationAssets = await countRows(admin, 'ml_public', 'publication_assets');
    expect(publications).toBe(0);
    expect(publicationAssets).toBe(0);

    const garments = ids(firstSnapshot.garments);
    const variants = ids(firstSnapshot.material_variants);
    const assets = ids(firstSnapshot.media_assets);
    const editorials = ids(firstSnapshot.editorial_collections);
    expect(firstSnapshot.garment_materials.every((row) => (
      garments.has(String(row.garment_id)) && variants.has(String(row.variant_id))
    ))).toBe(true);
    expect(firstSnapshot.garment_media.every((row) => (
      garments.has(String(row.garment_id)) && assets.has(String(row.asset_id))
    ))).toBe(true);
    expect(firstSnapshot.portfolio_projects.every((row) => garments.has(String(row.garment_id)))).toBe(true);
    expect(firstSnapshot.editorial_scenes.every((row) => editorials.has(String(row.collection_id)))).toBe(true);

    const evidence = {
      schemaVersion: 'ml-studio-2-rc-migration-evidence-v1',
      source: {
        checksum: plan.report.checksums.source,
        fixture: 'tests/fixtures/legacy-studio-data-v5.json',
        retained: true,
      },
      migration: {
        canonicalPlanChecksum: plan.report.checksums.canonicalPlan,
        canonicalDatabaseChecksum: secondChecksum,
        completed: recovery.completed,
        interruptedAfterBatches: interruption?.evidence.appliedBatches,
        publicationAssetsCreated: publicationAssets,
        publicationsCreated: publications,
        roundTripExact: plan.report.roundTrip.exact,
        unexplainedDataLoss: plan.report.roundTrip.unexplainedDataLoss,
      },
      report: {
        conflicts: plan.report.conflicts.length,
        idMappings: plan.report.idMappings.length,
        schemaVersion: plan.report.schemaVersion,
        skippedRecords: plan.report.skippedRecords.length,
        warnings: plan.report.warnings.length,
      },
      relationships: {
        editorialSceneParentsValid: true,
        garmentMaterialLinksValid: true,
        garmentMediaLinksValid: true,
        portfolioGarmentSelectionsValid: true,
      },
      retry: {
        checksumStable: secondChecksum === firstChecksum,
        inserted: duplicate.inserted,
        unchanged: duplicate.unchanged,
        updated: duplicate.updated,
      },
      rowCounts: Object.fromEntries(
        Object.entries(firstSnapshot).map(([table, records]) => [table, records.length]),
      ),
      warnings: plan.report.warnings,
    };

    console.info(`RC_MIGRATION_EVIDENCE=${stableStringify(evidence)}`);
  }, 60_000);
});

async function readCanonicalSnapshot(
  client: ReturnType<typeof createClient>,
  tables: CanonicalMigrationTable[],
) {
  const snapshot = {} as Record<CanonicalMigrationTable, Array<Record<string, unknown>>>;
  for (const table of [...new Set(tables)].sort()) {
    const response = await client.schema('ml_private').from(table).select('*');
    if (response.error) throw response.error;
    snapshot[table] = [...(response.data as Array<Record<string, unknown>>)]
      .sort((left, right) => stableStringify(left).localeCompare(stableStringify(right)));
  }
  return snapshot;
}

async function countRows(
  client: ReturnType<typeof createClient>,
  schema: 'ml_private' | 'ml_public',
  table: string,
) {
  const response = await client
    .schema(schema)
    .from(table)
    .select('*', { count: 'exact', head: true });
  if (response.error) throw response.error;
  return response.count ?? 0;
}

function isLocalSupabaseUrl(value: string) {
  try {
    return ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(new URL(value).hostname);
  } catch {
    return false;
  }
}

function ids(records: Array<Record<string, unknown>>) {
  return new Set(records.map((record) => String(record.id)));
}
