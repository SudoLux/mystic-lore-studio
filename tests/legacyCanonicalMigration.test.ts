import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildLegacyCanonicalMigrationPlan,
  executeCanonicalMigration,
  InMemoryCanonicalMigrationStore,
  LegacyMigrationValidationError,
  materializeLegacyReadThrough,
  MigrationInterruptedError,
  rows,
  type LegacyMigrationInput,
} from '../src/domains/migration';
import { importStudioData, type StudioData } from '../src/lib/studioStorage';
import type { SyncOperation } from '../src/lib/studioSyncStorage';

const fixtureText = readFileSync(
  new URL('./fixtures/legacy-studio-data-v5.json', import.meta.url),
  'utf8',
);
const committedReport = JSON.parse(readFileSync(
  new URL(
    '../docs/implementation/evidence/wp2/legacy-studio-data-v5.migration-report.json',
    import.meta.url,
  ),
  'utf8',
));

const OWNER_ID = '10000000-0000-4000-8000-000000000111';
const GENERATED_AT = '2026-06-21T00:00:00.000Z';

function fixtureData() {
  return importStudioData(fixtureText);
}

function migrationInput(
  data: StudioData = fixtureData(),
  overrides: Partial<LegacyMigrationInput> = {},
): LegacyMigrationInput {
  return {
    data,
    generatedAt: GENERATED_AT,
    ownerUserId: OWNER_ID,
    sourceId: 'wp0:legacy-studio-data-v5',
    studioName: 'Example Mystic Lore Studio',
    studioSlug: 'example-mystic-lore-studio',
    timezone: 'America/Los_Angeles',
    ...overrides,
  };
}

describe('WP2 legacy-to-canonical migration dry run', () => {
  it('maps the representative fixture deterministically and round-trips without unexplained loss', async () => {
    const first = await buildLegacyCanonicalMigrationPlan(migrationInput());
    const second = await buildLegacyCanonicalMigrationPlan(migrationInput());

    expect(first.report.checksums.canonicalPlan).toBe(second.report.checksums.canonicalPlan);
    expect(first.report.idMappings).toEqual(second.report.idMappings);
    expect(first.report.roundTrip).toMatchObject({ exact: true, unexplainedDataLoss: 0 });
    expect(first.report.rowCounts.canonical).toMatchObject({
      editorial_collections: 1,
      garments: 1,
      garment_materials: 1,
      inventory_entries: 2,
      materials: 1,
      media_assets: 1,
      portfolio_projects: 1,
      tasks: 1,
    });
    expect(first.report.warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining([
        'device-settings-retained',
        'legacy-notes-retained',
        'legacy-yardage-fields-inferred',
        'lookbook-bridge-retained',
        'provisional-media-checksum',
        'public-cut-not-created',
      ]),
    );
    expect(first.batches.every((batch) => !batch.table.startsWith('publication'))).toBe(true);
    expect(rows(first, 'portfolio_projects')[0].case_study_json).toHaveProperty(
      'legacyPortfolioSettings',
    );
    expect(first.report).toEqual(committedReport);
  });

  it('migrates an empty aggregate without inventing garment-domain rows', async () => {
    const empty = fixtureData();
    empty.projects = [];
    empty.fabrics = [];
    empty.linkedMaterials = [];
    empty.tasks = [];
    empty.notes = [];
    empty.lookbookPages = [];
    empty.yardageEntries = [];
    empty.editorialCollections = [];

    const plan = await buildLegacyCanonicalMigrationPlan(migrationInput(empty));

    expect(rows(plan, 'garments')).toHaveLength(0);
    expect(rows(plan, 'studios')).toHaveLength(1);
    expect(rows(plan, 'studio_members')).toHaveLength(1);
    expect(plan.report.roundTrip.exact).toBe(true);
  });

  it('is safe to run twice and turns the second pass into unchanged upserts', async () => {
    const plan = await buildLegacyCanonicalMigrationPlan(migrationInput());
    const store = new InMemoryCanonicalMigrationStore();
    const first = await executeCanonicalMigration(plan, store, {
      includeServerBatches: true,
    });
    const firstChecksum = await store.checksum();
    const second = await executeCanonicalMigration(plan, store, {
      includeServerBatches: true,
    });

    expect(first.inserted).toBeGreaterThan(0);
    expect(second.inserted).toBe(0);
    expect(second.updated).toBe(0);
    expect(second.unchanged).toBe(first.inserted);
    expect(await store.checksum()).toBe(firstChecksum);
  });

  it('recovers from a completed-batch interruption and converges on the clean-run checksum', async () => {
    const plan = await buildLegacyCanonicalMigrationPlan(migrationInput());
    const interruptedStore = new InMemoryCanonicalMigrationStore();

    await expect(
      executeCanonicalMigration(plan, interruptedStore, {
        includeServerBatches: true,
        interruptAfterBatches: 5,
      }),
    ).rejects.toBeInstanceOf(MigrationInterruptedError);

    const recovered = await executeCanonicalMigration(plan, interruptedStore, {
      includeServerBatches: true,
    });
    const cleanStore = new InMemoryCanonicalMigrationStore();
    await executeCanonicalMigration(plan, cleanStore, { includeServerBatches: true });

    expect(recovered.completed).toBe(true);
    expect(await interruptedStore.checksum()).toBe(await cleanStore.checksum());
  });

  it('rejects malformed input before a store can be mutated', async () => {
    const malformed = fixtureData();
    malformed.projects.push(structuredClone(malformed.projects[0]));

    await expect(
      buildLegacyCanonicalMigrationPlan(migrationInput(malformed, {
        ownerUserId: 'not-a-uuid',
      })),
    ).rejects.toBeInstanceOf(LegacyMigrationValidationError);
  });

  it('replays newer offline writes, records deletes as tombstones, and emits server audit batches', async () => {
    const data = fixtureData();
    const updatedTask = {
      ...data.tasks[0],
      title: 'Offline sleeve mobility review',
      updatedAt: '2026-06-23T10:00:00.000Z',
    };
    const operations = [
      operation('task', 'upsert', updatedTask.id, updatedTask, updatedTask.updatedAt),
      operation(
        'note',
        'delete',
        data.notes[0].id,
        undefined,
        '2026-06-23T10:05:00.000Z',
      ),
    ];

    const plan = await buildLegacyCanonicalMigrationPlan(migrationInput(data, {
      queuedWrites: operations,
    }));

    expect(plan.retention.effectiveData.tasks[0].title).toBe(updatedTask.title);
    expect(plan.retention.effectiveData.notes).toHaveLength(0);
    expect(rows(plan, 'sync_tombstones')).toHaveLength(1);
    expect(rows(plan, 'change_events')).toHaveLength(2);
    expect(plan.report.conflicts).toHaveLength(0);
    expect(plan.report.roundTrip.exact).toBe(true);
  });

  it('lets a newer tombstone suppress a stale source record', async () => {
    const data = fixtureData();
    const projectId = data.projects[0].id;
    const plan = await buildLegacyCanonicalMigrationPlan(migrationInput(data, {
      tombstones: [{
        clientId: projectId,
        deletedAt: '2026-07-01T00:00:00.000Z',
        entity: 'project',
      }],
    }));

    expect(rows(plan, 'garments')).toHaveLength(0);
    expect(rows(plan, 'sync_tombstones')).toHaveLength(1);
    expect(plan.retention.originalData.projects).toHaveLength(1);
    expect(plan.retention.effectiveData.projects).toHaveLength(0);
  });

  it('deduplicates media by checksum while preserving distinct usage relationships', async () => {
    const data = fixtureData();
    const hero = data.projects[0].heroImage!;
    data.projects[0].galleryImages = [{ ...hero, id: 'image-duplicate-gallery' }];

    const plan = await buildLegacyCanonicalMigrationPlan(migrationInput(data));

    expect(rows(plan, 'media_assets')).toHaveLength(1);
    expect(rows(plan, 'garment_media')).toHaveLength(2);
    expect(plan.report.warnings.some((warning) => warning.code === 'media-deduplicated')).toBe(true);
  });

  it('preserves both authoring models when a lookbook page overlaps an Editorial Collection', async () => {
    const data = fixtureData();
    data.editorialCollections = [{
      createdAt: '2026-06-20T16:30:00.000Z',
      description: 'Normalized editorial source.',
      id: 'editorial-aurora-study',
      projectId: data.projects[0].id,
      scenes: [],
      subtitle: '',
      templateType: 'fashion-editorial',
      themeId: 'midnight-editorial',
      title: data.lookbookPages[0].title,
      updatedAt: '2026-06-20T16:30:00.000Z',
    }];

    const plan = await buildLegacyCanonicalMigrationPlan(migrationInput(data));

    expect(rows(plan, 'editorial_collections')).toHaveLength(2);
    expect(plan.report.editorialLookbookOverlaps).toEqual([{
      editorialCollectionId: 'editorial-aurora-study',
      lookbookPageId: data.lookbookPages[0].id,
      policy: 'preserve-both-until-wp7',
    }]);
    expect(plan.retention.effectiveData.editorialCollections).toHaveLength(1);
    expect(plan.retention.effectiveData.lookbookPages).toHaveLength(1);
  });

  it('retains the current record and exposes a same-record stale-write conflict', async () => {
    const data = fixtureData();
    const staleTask = {
      ...data.tasks[0],
      title: 'Stale offline title',
      updatedAt: '2026-06-19T10:00:00.000Z',
    };
    const plan = await buildLegacyCanonicalMigrationPlan(migrationInput(data, {
      queuedWrites: [operation('task', 'upsert', staleTask.id, staleTask, staleTask.updatedAt)],
    }));

    expect(plan.report.conflicts).toHaveLength(1);
    expect(plan.report.conflicts[0].fields.map((field) => field.field)).toContain('title');
    expect(plan.retention.effectiveData.tasks[0].title).toBe(data.tasks[0].title);
  });

  it('merges different offline and remote fields when a common ancestor is available', async () => {
    const data = fixtureData();
    const baseTask = structuredClone(data.tasks[0]);
    baseTask.status = 'To Do';
    baseTask.updatedAt = '2026-06-18T10:00:00.000Z';
    const localTask = {
      ...baseTask,
      title: 'Locally clarified fitting task',
      updatedAt: '2026-06-23T10:00:00.000Z',
    };
    const queued = operation('task', 'upsert', localTask.id, localTask, localTask.updatedAt);
    queued.basePayload = baseTask;

    const plan = await buildLegacyCanonicalMigrationPlan(migrationInput(data, {
      queuedWrites: [queued],
    }));

    expect(plan.report.conflicts).toHaveLength(0);
    expect(plan.retention.effectiveData.tasks[0]).toMatchObject({
      status: data.tasks[0].status,
      title: localTask.title,
    });
  });

  it('reloads applied canonical state without changing its checksum', async () => {
    const plan = await buildLegacyCanonicalMigrationPlan(migrationInput());
    const store = new InMemoryCanonicalMigrationStore();
    await executeCanonicalMigration(plan, store, { includeServerBatches: true });
    const reloaded = InMemoryCanonicalMigrationStore.reload(store.serialize());

    expect(await reloaded.checksum()).toBe(await store.checksum());
    expect(reloaded.count('garments')).toBe(1);
  });

  it('reads canonical changes through the legacy shape while preserving untouched domains', async () => {
    const plan = await buildLegacyCanonicalMigrationPlan(migrationInput());
    rows(plan, 'garments')[0].title = 'Canonical Aurora Coat';
    rows(plan, 'tasks')[0].status = 'done';
    rows(plan, 'materials')[0].name = 'Canonical Weather Twill';

    const view = materializeLegacyReadThrough(plan);

    expect(view.projects[0].name).toBe('Canonical Aurora Coat');
    expect(view.tasks[0].status).toBe('Done');
    expect(view.fabrics[0].name).toBe('Canonical Weather Twill');
    expect(view.notes).toEqual(plan.retention.effectiveData.notes);
    expect(view.settings).toEqual(plan.retention.effectiveData.settings);
    expect(view.lookbookPages).toEqual(plan.retention.effectiveData.lookbookPages);
  });
});

function operation(
  entity: SyncOperation['entity'],
  action: SyncOperation['action'],
  clientId: string,
  payload: unknown,
  updatedAt: string,
): SyncOperation {
  return {
    action,
    attempts: 0,
    clientId,
    entity,
    id: `operation-${entity}-${clientId}-${action}`,
    key: `${entity}:${clientId}`,
    payload,
    queuedAt: updatedAt,
    updatedAt,
  };
}
