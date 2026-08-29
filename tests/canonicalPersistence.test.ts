import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildCanonicalMutations,
  canonicalMutableSnapshot,
  CanonicalIndexedDb,
  emptyCanonicalWorkspaceState,
  materializeMutableRows,
  reconcileSyncImportRetry,
  syncImportOperationAlreadyReflected,
  tryMergeDisjoint,
} from '../src/domains/persistence';
import type { CanonicalOutboxEntry } from '../src/domains/persistence';
import { createCanonicalWorkspace } from '../src/domains/workspace';
import { importStudioData } from '../src/lib/studioStorage';

const fixtureText = readFileSync(new URL('./fixtures/legacy-studio-data-v5.json', import.meta.url), 'utf8');
const ownerId = '15000000-0000-4000-8000-000000000001';

async function fixtureWorkspace() {
  return await createCanonicalWorkspace({
    data: importStudioData(fixtureText),
    ownerUserId: ownerId,
    studioId: '25000000-0000-4000-8000-000000000001',
    studioName: 'Canonical Persistence Studio',
    studioSlug: 'canonical-persistence-studio',
  });
}

describe('canonical cloud repository cutover', () => {
  it('normalizes portfolio selections into relationship rows instead of JSON fields', async () => {
    const state = await fixtureWorkspace();
    const project = state.portfolioProjects[0];
    expect(project).toBeTruthy();
    const withSelection = {
      ...state,
      portfolioProjects: state.portfolioProjects.map((item) => item.id === project.id
        ? { ...item, selectedAssetIds: state.mediaAssets.slice(0, 2).map((asset) => asset.id) }
        : item),
    };
    const rows = materializeMutableRows(withSelection);
    const encodedProject = canonicalMutableSnapshot(withSelection)[`portfolio_projects:${project.id}`];
    expect(encodedProject).not.toHaveProperty('selected_asset_ids');
    expect([...rows.keys()].filter((key) => key.startsWith('portfolio_project_assets:'))).toHaveLength(
      Math.min(2, state.mediaAssets.length),
    );
  });

  it('keeps a 1,000-row technical grid in one atomic operation group', () => {
    const before = emptyCanonicalWorkspaceState('25000000-0000-4000-8000-000000000001');
    const now = '2026-08-27T12:00:00.000Z';
    const after = {
      ...before,
      measurementValues: Array.from({ length: 1_000 }, (_, index) => ({
        createdAt: now,
        id: `55000000-0000-4000-8000-${index.toString().padStart(12, '0')}`,
        pomPointId: '65000000-0000-4000-8000-000000000001',
        revision: 1,
        setId: '75000000-0000-4000-8000-000000000001',
        size: `S${index}`,
        studioId: before.studioId,
        target: index,
        toleranceMinus: 0.5,
        tolerancePlus: 0.5,
        updatedAt: now,
      })),
    };
    const mutations = buildCanonicalMutations(before, after);
    expect(mutations).toHaveLength(1_000);
    expect(new Set(mutations.map((item) => item.entityType))).toEqual(new Set(['measurement_values']));
  });

  it('persists the canonical graph and retry outbox outside localStorage', async () => {
    const state = await fixtureWorkspace();
    const cache = new CanonicalIndexedDb();
    await cache.putWorkspace(state);
    expect((await cache.getWorkspace(state.studioId))?.studioId).toBe(state.studioId);
    const operationId = '85000000-0000-4000-8000-000000000001';
    await cache.putOutbox({
      attempts: 0,
      baseRows: {},
      conflicts: [],
      dependencyIds: [],
      lastError: null,
      localRows: {},
      operation: {
        garmentId: null,
        mutations: [],
        operationId,
        origin: 'sync',
        queuedAt: '2026-08-27T12:00:00.000Z',
        studioId: state.studioId,
      },
      status: 'pending',
    });
    expect(await cache.listOutbox(state.studioId)).toHaveLength(1);
    await cache.deleteOutbox(operationId);
    expect(await cache.listOutbox(state.studioId)).toHaveLength(0);
  });

  it('retires only insert retries already proven present in the fresh cloud graph', async () => {
    const state = await fixtureWorkspace();
    const inserts = buildCanonicalMutations(emptyCanonicalWorkspaceState(state.studioId), state);
    const operation = {
      garmentId: null,
      mutations: inserts,
      operationId: '86000000-0000-4000-8000-000000000001',
      origin: 'sync' as const,
      queuedAt: '2026-08-27T12:00:00.000Z',
      studioId: state.studioId,
    };
    expect(syncImportOperationAlreadyReflected(operation, state)).toBe(true);
    expect(syncImportOperationAlreadyReflected({
      ...operation,
      mutations: operation.mutations.map((mutation, index) => index === 0
        ? { ...mutation, row: { ...mutation.row, name: 'Unmatched retry value' } }
        : mutation),
    }, state)).toBe(false);

    const profileMutation = operation.mutations.find((mutation) => mutation.entityType === 'portfolio_profiles');
    expect(profileMutation).toBeTruthy();
    expect(syncImportOperationAlreadyReflected({
      ...operation,
      mutations: [{ ...profileMutation!, entityId: '86000000-0000-4000-8000-000000000099' }],
    }, state)).toBe(true);
  });

  it('rebases a raced legacy portfolio identity and keeps only real profile differences', async () => {
    const cloud = await fixtureWorkspace();
    const profile = cloud.portfolioProfiles[0];
    const oldProfileId = '86000000-0000-4000-8000-000000000099';
    const profileInsert = buildCanonicalMutations(emptyCanonicalWorkspaceState(cloud.studioId), cloud)
      .find((mutation) => mutation.entityType === 'portfolio_profiles')!;
    const entry: CanonicalOutboxEntry = {
      attempts: 1,
      baseRows: {},
      conflicts: [],
      dependencyIds: [],
      lastError: 'duplicate portfolio username',
      localRows: {},
      operation: {
        garmentId: null,
        mutations: [{
          ...profileInsert,
          entityId: oldProfileId,
          row: { ...profileInsert.row, status: profile.status === 'ready' ? 'draft' : 'ready' },
        }],
        operationId: '86000000-0000-4000-8000-000000000002',
        origin: 'sync',
        queuedAt: '2026-08-27T12:00:00.000Z',
        studioId: cloud.studioId,
      },
      status: 'failed',
    };
    const reconciled = reconcileSyncImportRetry(entry, cloud);
    expect(reconciled?.operation.mutations).toEqual([expect.objectContaining({
      action: 'update',
      baseRevision: profile.revision,
      entityId: profile.id,
      entityType: 'portfolio_profiles',
      row: { status: profile.status === 'ready' ? 'draft' : 'ready' },
    })]);
    expect(reconciled?.status).toBe('pending');
  });

  it('keeps cloud-stable slugs during a revision-one race while retaining editable changes', async () => {
    const cloud = await fixtureWorkspace();
    const profile = cloud.portfolioProfiles[0];
    const profileInsert = buildCanonicalMutations(emptyCanonicalWorkspaceState(cloud.studioId), cloud)
      .find((mutation) => mutation.entityType === 'portfolio_profiles')!;
    const entry: CanonicalOutboxEntry = {
      attempts: 1,
      baseRows: {},
      conflicts: [],
      dependencyIds: [],
      lastError: 'raced import',
      localRows: {},
      operation: {
        garmentId: null,
        mutations: [{
          ...profileInsert,
          row: { ...profileInsert.row, headline: 'Recovered headline', username_slug: 'older-device-slug' },
        }],
        operationId: '86000000-0000-4000-8000-000000000003',
        origin: 'sync',
        queuedAt: '2026-08-27T12:00:00.000Z',
        studioId: cloud.studioId,
      },
      status: 'failed',
    };
    const reconciled = reconcileSyncImportRetry(entry, cloud);
    expect(reconciled?.operation.mutations[0]).toMatchObject({
      action: 'update',
      entityId: profile.id,
      row: { headline: 'Recovered headline' },
    });
    expect(reconciled?.operation.mutations[0].row).not.toHaveProperty('username_slug');
  });

  it('removes browser-local authority and exposes explicit shadow/cloud coordination', () => {
    const provider = readFileSync(new URL('../src/hooks/useCanonicalWorkspace.tsx', import.meta.url), 'utf8');
    expect(provider).toContain('window.localStorage.removeItem(key)');
    expect(provider).not.toContain('window.localStorage.setItem(key');
    expect(provider).toContain("mode === 'cloud'");
    expect(provider).toContain("mode === 'shadow'");
    expect(provider).toContain("window.addEventListener('online'");
    expect(provider).toContain("window.addEventListener('focus'");
    const replay = provider.indexOf('const queuedBeforeImport');
    const importStart = provider.indexOf('const report = await importShadowWorkspace');
    expect(replay).toBeGreaterThan(-1);
    expect(importStart).toBeGreaterThan(replay);
    expect(provider).toContain('cloudState = await repositoryRef.current.refresh()');
    expect(provider).toContain('!startupQueueError');
    expect(provider).toContain('recovered-operation:');
    expect(provider).toContain('syncImportOperationAlreadyReflected');
    expect(provider).toContain('singleton_identity_rebase');
  });

  it('uses stable pagination and the transactional operation RPC', () => {
    const repository = readFileSync(new URL('../src/domains/persistence/canonicalWorkspaceRepository.ts', import.meta.url), 'utf8');
    expect(repository).toContain('const pageSize = 500');
    expect(repository).toContain('.range(from, from + pageSize - 1)');
    expect(repository).toContain("rpc('commit_canonical_operation'");
    expect(repository).toContain('tryMergeDisjoint');
  });

  it('uses a fresh-source atomic Public Cut and visibility-first unpublish', () => {
    const adapter = readFileSync(new URL('../src/domains/portfolio/supabasePublicCut.ts', import.meta.url), 'utf8');
    expect(adapter).toContain('freshCanonicalState');
    expect(adapter).toContain("rpc('begin_public_cut_batch'");
    expect(adapter).toContain("rpc('commit_public_cut_batch'");
    const unpublish = adapter.indexOf("rpc('unpublish_public_cut_batch'");
    const cleanup = adapter.indexOf("storage.from('portfolio-assets').remove");
    expect(unpublish).toBeGreaterThan(-1);
    expect(cleanup).toBeGreaterThan(unpublish);
  });

  it('checks in generated schema types and types the canonical client', () => {
    const generated = readFileSync(new URL('../src/types/database.generated.ts', import.meta.url), 'utf8');
    const client = readFileSync(new URL('../src/lib/supabase.ts', import.meta.url), 'utf8');
    expect(generated).toContain('commit_canonical_operation');
    expect(generated).toContain('begin_public_cut_batch');
    expect(client).toContain('SupabaseClient<Database>');
    expect(client).toContain('createClient<Database>');
  });

  it('automatically retries disjoint scalar edits without sending server-owned rows back', () => {
    const entry = conflictEntry({ description: 'Base description', title: 'Local title' });
    const merged = tryMergeDisjoint(entry, [{
      currentRevision: 2,
      currentRow: { description: 'Server description', revision: 2, title: 'Base title' },
      entityId: '52000000-0000-4000-8000-000000000001',
      entityType: 'tasks',
      expectedRevision: 1,
      reason: 'stale_revision',
    }]);
    expect(merged?.operation.mutations[0]).toMatchObject({
      baseRevision: 2,
      row: { title: 'Local title' },
    });
    expect(merged?.operation.mutations[0].row).not.toHaveProperty('revision');
  });

  it('keeps same-field conflicts queued for explicit designer resolution', () => {
    const entry = conflictEntry({ description: 'Base description', title: 'Local title' });
    expect(tryMergeDisjoint(entry, [{
      currentRevision: 2,
      currentRow: { description: 'Base description', revision: 2, title: 'Server title' },
      entityId: '52000000-0000-4000-8000-000000000001',
      entityType: 'tasks',
      expectedRevision: 1,
      reason: 'stale_revision',
    }])).toBeNull();
  });
});

function conflictEntry(local: { description: string; title: string }): CanonicalOutboxEntry {
  const operationId = '85000000-0000-4000-8000-000000000099';
  const entityId = '52000000-0000-4000-8000-000000000001';
  const key = `tasks:${entityId}`;
  return {
    attempts: 0,
    baseRows: { [key]: { description: 'Base description', title: 'Base title' } },
    conflicts: [],
    dependencyIds: [],
    lastError: null,
    localRows: { [key]: local },
    operation: {
      garmentId: '42000000-0000-4000-8000-000000000001',
      mutations: [{ action: 'update', baseRevision: 1, entityId, entityType: 'tasks', row: { title: local.title } }],
      operationId,
      origin: 'sync',
      queuedAt: '2026-08-27T12:00:00.000Z',
      studioId: '25000000-0000-4000-8000-000000000001',
    },
    status: 'pending',
  };
}
