import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '../../types/database.generated';
import { normalizeWorkspace, type CanonicalPublication, type CanonicalWorkspaceState } from '../workspace';
import {
  applyPortfolioJoins,
  canonicalCodecRegistry,
  canonicalMutableSnapshot,
  decodeCanonicalRecord,
  encodeCanonicalRecord,
  materializeMutableRows,
  privateHydrationCodecs,
} from './canonicalCodecRegistry';
import { CanonicalIndexedDb } from './canonicalIndexedDb';
import { uploadStagedCanonicalMedia } from './canonicalMedia';
import type {
  CanonicalCommitHandle,
  CanonicalCommitResult,
  CanonicalOperation,
  CanonicalOutboxEntry,
  CanonicalPersistenceMode,
  CanonicalServerConflict,
  CanonicalWorkspaceRepository,
} from './contracts';

const pageSize = 500;
const hydrationConcurrency = 6;
const hydrationRequestTimeoutMs = 20_000;

function transportErrorMessage(reason: unknown) {
  if (reason instanceof Error && reason.message) return reason.message;
  if (reason && typeof reason === 'object' && 'message' in reason && typeof reason.message === 'string') {
    return reason.message;
  }
  return 'Canonical transport failed.';
}

type DynamicQueryResult = {
  data: Record<string, unknown>[] | null;
  error: { message: string } | null;
};

type DynamicQuery = PromiseLike<DynamicQueryResult> & {
  eq(column: string, value: unknown): DynamicQuery;
  order(column: string, options?: { ascending?: boolean }): DynamicQuery;
  range(from: number, to: number): DynamicQuery;
  select(columns?: string): DynamicQuery;
};

type DynamicSchema = {
  from(table: string): DynamicQuery;
};

async function mapWithConcurrency<T, Result>(
  items: readonly T[],
  worker: (item: T) => Promise<Result>,
): Promise<Result[]> {
  const results = new Array<Result>(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(hydrationConcurrency, items.length);

  await Promise.all(Array.from({ length: workerCount }, async () => {
    for (;;) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  }));

  return results;
}

async function withHydrationTimeout<T>(request: Promise<T>, label: string): Promise<T> {
  let timer: number | undefined;
  try {
    return await Promise.race([
      request,
      new Promise<T>((_, reject) => {
        timer = window.setTimeout(() => {
          reject(new Error(`${label} did not respond. Check the beta Data API schema allowlist, then try again.`));
        }, hydrationRequestTimeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) window.clearTimeout(timer);
  }
}

export class SupabaseCanonicalWorkspaceRepository implements CanonicalWorkspaceRepository {
  private studioId: string | null = null;
  private flushPromise: Promise<void> | null = null;
  private readonly projectedRows = new Map<string, Record<string, unknown>>();
  private readonly pending = new Map<string, {
    reject: (reason: unknown) => void;
    resolve: (result: CanonicalCommitResult) => void;
  }>();

  constructor(
    private readonly client: SupabaseClient<Database>,
    private readonly cache = new CanonicalIndexedDb(),
  ) {}

  async hydrate(studioId: string) {
    this.studioId = studioId;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      const cached = await this.cache.getWorkspace(studioId);
      if (!cached) throw new Error('This device has no cached canonical workspace for offline startup.');
      this.resetProjection(cached);
      return cached;
    }
    try {
      const state = await this.loadCloudState(studioId);
      this.resetProjection(state);
      await this.cache.putWorkspace(state);
      return state;
    } catch (reason) {
      const cached = await this.cache.getWorkspace(studioId);
      if (cached) {
        this.resetProjection(cached);
        return cached;
      }
      throw reason;
    }
  }

  dispatch(operation: CanonicalOperation): CanonicalCommitHandle {
    const committed = new Promise<CanonicalCommitResult>((resolve, reject) => {
      this.pending.set(operation.operationId, { reject, resolve });
    });
    void this.enqueue(operation).then(() => {
      if (typeof navigator === 'undefined' || navigator.onLine !== false) void this.flush();
    }).catch((reason) => this.pending.get(operation.operationId)?.reject(reason));
    return { committed, operationId: operation.operationId };
  }

  async flush() {
    if (!this.studioId || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
    if (this.flushPromise) return await this.flushPromise;
    this.flushPromise = this.flushEntries();
    try {
      await this.flushPromise;
    } finally {
      this.flushPromise = null;
    }
  }

  async refresh() {
    if (!this.studioId) throw new Error('The canonical repository has not been hydrated.');
    return await this.hydrate(this.studioId);
  }

  private async enqueue(operation: CanonicalOperation) {
    const queued = await this.cache.listOutbox(operation.studioId);
    const baseRows: Record<string, Record<string, unknown> | null> = {};
    const localRows: Record<string, Record<string, unknown> | null> = {};
    for (const mutation of operation.mutations) {
      const key = `${mutation.entityType}:${mutation.entityId}`;
      const base = this.projectedRows.get(key) ?? null;
      baseRows[key] = base ? { ...base } : null;
      const local = mutation.action === 'delete'
        ? null
        : mutation.action === 'insert'
          ? { ...(mutation.row ?? {}) }
          : { ...(base ?? {}), ...(mutation.row ?? {}) };
      localRows[key] = local;
      if (local) this.projectedRows.set(key, local);
      else this.projectedRows.delete(key);
    }
    await this.cache.putOutbox({
      attempts: 0,
      baseRows,
      conflicts: [],
      dependencyIds: queued.map((entry) => entry.operation.operationId),
      lastError: null,
      localRows,
      operation,
      status: 'pending',
    });
  }

  private async flushEntries() {
    const entries = await this.cache.listOutbox(this.studioId!);
    for (const entry of entries) {
      if (entry.status === 'conflict') break;
      try {
        const result = await this.send(entry.operation);
        if (result.status === 'conflict') {
          const merged = tryMergeDisjoint(entry, result.conflicts);
          if (merged) {
            await this.cache.putOutbox(merged);
            const retryResult = await this.send(merged.operation);
            if (retryResult.status === 'conflict') {
              await this.keepConflict(merged, retryResult.conflicts);
              this.pending.get(entry.operation.operationId)?.resolve(retryResult);
              continue;
            }
            await this.complete(entry.operation.operationId, retryResult);
            continue;
          }
          await this.keepConflict(entry, result.conflicts);
          this.pending.get(entry.operation.operationId)?.resolve(result);
          continue;
        }
        await this.complete(entry.operation.operationId, result);
      } catch (reason) {
        await this.cache.putOutbox({
          ...entry,
          attempts: entry.attempts + 1,
          lastError: transportErrorMessage(reason),
          status: 'failed',
        });
        this.pending.get(entry.operation.operationId)?.reject(reason);
        break;
      }
    }
  }

  private async complete(operationId: string, result: CanonicalCommitResult) {
    if (result.status !== 'conflict') {
      for (const authoritative of result.authoritativeRows) {
        const key = `${authoritative.entityType}:${authoritative.entityId}`;
        if (!authoritative.row) {
          this.projectedRows.delete(key);
          continue;
        }
        const entry = canonicalCodecRegistry.find((candidate) => candidate.entityType === authoritative.entityType);
        if (entry) this.projectedRows.set(key, encodeCanonicalRecord(entry, decodeCanonicalRecord(entry, authoritative.row)));
      }
    }
    await this.cache.deleteOutbox(operationId);
    this.pending.get(operationId)?.resolve(result);
    this.pending.delete(operationId);
  }

  private async keepConflict(entry: CanonicalOutboxEntry, conflicts: CanonicalServerConflict[]) {
    await this.cache.putOutbox({
      ...entry,
      attempts: entry.attempts + 1,
      conflicts,
      lastError: 'The server changed the same record. Designer review is required.',
      status: 'conflict',
    });
  }

  private async send(operation: CanonicalOperation): Promise<CanonicalCommitResult> {
    // Media bytes are a dependency of their metadata row. Upload first, then
    // let the idempotent RPC commit metadata and relationships atomically.
    for (const mutation of operation.mutations) {
      if (mutation.entityType !== 'media_assets' || mutation.action === 'delete' || !mutation.row) continue;
      await uploadStagedCanonicalMedia({
        checksum: String(mutation.row.checksum),
        id: mutation.entityId,
        mimeType: String(mutation.row.mime_type),
        storagePath: String(mutation.row.storage_path),
      }, this.cache);
    }
    const response = await this.client.schema('ml_private').rpc('commit_canonical_operation', {
      p_garment_id: operation.garmentId as string,
      p_mutations: operation.mutations as unknown as Json,
      p_operation_id: operation.operationId,
      p_origin: operation.origin,
      p_studio_id: operation.studioId,
    });
    if (response.error) throw response.error;
    return response.data as unknown as CanonicalCommitResult;
  }

  private async loadCloudState(studioId: string) {
    const state = emptyCanonicalWorkspaceState(studioId);
    const joins: Record<string, Record<string, unknown>[]> = {};
    // A first-time Studio has many collections. Bounded hydration avoids
    // exhausting a browser's request pool and makes startup deterministic.
    const results = await mapWithConcurrency(privateHydrationCodecs, async (entry) => ({
      entry,
      rows: await withHydrationTimeout(
        this.loadAllPages('ml_private', entry.table, studioId),
        `ml_private.${entry.table}`,
      ),
    }));
    for (const { entry, rows } of results) {
      if (!entry.stateKey) {
        joins[entry.table] = rows;
        continue;
      }
      (state[entry.stateKey] as unknown[]) = rows.map((row) => decodeCanonicalRecord(entry, row));
    }

    const publicationRows = await withHydrationTimeout(
      this.loadAllPages('ml_public', 'publications', studioId),
      'ml_public.publications',
    );
    state.publications = publicationRows.map(decodePublication);
    return normalizeWorkspace(applyPortfolioJoins(state, joins));
  }

  private resetProjection(state: CanonicalWorkspaceState) {
    this.projectedRows.clear();
    for (const [key, value] of materializeMutableRows(state)) {
      this.projectedRows.set(key, encodeCanonicalRecord(value.codec, value.record));
    }
  }

  private async loadAllPages(schema: 'ml_private' | 'ml_public', table: string, studioId: string) {
    const rows: Record<string, unknown>[] = [];
    const dynamicSchema = this.client.schema(schema) as unknown as DynamicSchema;
    for (let from = 0; ; from += pageSize) {
      const response = await dynamicSchema.from(table).select('*')
        .eq('studio_id', studioId).order('id', { ascending: true })
        .range(from, from + pageSize - 1);
      if (response.error) throw new Error(`${schema}.${table}: ${response.error.message}`);
      const page = response.data ?? [];
      rows.push(...page);
      if (page.length < pageSize) return rows;
    }
  }
}

export async function loadCanonicalPersistenceMode(
  client: SupabaseClient<Database>,
  studioId: string,
): Promise<CanonicalPersistenceMode> {
  const response = await client.schema('ml_private').from('studio_settings')
    .select('version_policy').eq('studio_id', studioId).maybeSingle();
  if (response.error) throw response.error;
  const policy = response.data?.version_policy;
  const object = policy && typeof policy === 'object' && !Array.isArray(policy)
    ? policy as Record<string, unknown>
    : {};
  const value = object.canonicalPersistence ?? object.canonical_persistence;
  return value === 'cloud' || value === 'local-recovery' || value === 'shadow'
    ? value
    : 'shadow';
}

export function emptyCanonicalWorkspaceState(studioId: string): CanonicalWorkspaceState {
  return {
    aiAcceptanceCommands: [], aiAcceptances: [], aiArtifacts: [], aiInputRefs: [], aiJobs: [],
    annotations: [], bomItems: [], calendarEvents: [], changeEvents: [], collections: [],
    componentVariants: [], components: [], constructionDetails: [], constructionSections: [],
    constructionSteps: [], costItems: [], costSheets: [], designBriefs: [], entityRevisions: [],
    editorialAssets: [], editorialBlocks: [], editorialCollectionGarments: [], editorialCollections: [],
    editorialExports: [], editorialScenes: [], factories: [], fitIssuePromotions: [], fitIssues: [],
    garmentComponents: [], garmentMaterials: [], garmentMedia: [], garments: [], conflicts: [],
    inventoryEntries: [], materialVariants: [], materials: [], mediaAssets: [], mediaDerivatives: [],
    moodboardItems: [], moodboards: [], flatAnnotations: [], fitSessionMedia: [], fitSessions: [],
    garmentVersions: [], gradeRuleValues: [], gradeRules: [], measurementSets: [], measurementValues: [],
    pomPoints: [], portfolioEditorials: [], portfolioProfiles: [], portfolioProjects: [],
    portfolioTechnicalExcerpts: [], publications: [], productionMilestones: [], productionOrders: [],
    qcInspections: [], qcResults: [], qcTemplateChecks: [], qcTemplates: [], qcWaivers: [],
    restoreOperations: [], releaseTasks: [], sampleRoundMedia: [], sampleRounds: [], fitMeasurements: [],
    schemaVersion: 10, studioId, suppliers: [], supplierItems: [], templates: [], templateApplications: [],
    technicalFiles: [], technicalFlats: [], technicalSpecs: [], techPackExports: [], validationRuns: [],
    validationWaivers: [], versionDependencies: [], versionEditorial: [], versionPortfolio: [],
  };
}

function decodePublication(row: Record<string, unknown>): CanonicalPublication {
  const createdAt = String(row.created_at ?? row.published_at ?? new Date(0).toISOString());
  return {
    checksum: String(row.checksum),
    createdAt,
    createdBy: String(row.created_by ?? ''),
    id: String(row.id),
    isCurrent: Boolean(row.is_current),
    isPublic: Boolean(row.is_public),
    mediaManifest: Array.isArray(row.media_manifest) ? row.media_manifest as CanonicalPublication['mediaManifest'] : [],
    profileId: String(row.profile_id),
    publicPath: String(row.public_path),
    publicationType: row.publication_type as CanonicalPublication['publicationType'],
    publishedAt: String(row.published_at ?? createdAt),
    revision: Number(row.source_revision ?? 1),
    snapshot: row.snapshot_json as Record<string, unknown>,
    sourceId: String(row.source_id),
    sourceRevision: Number(row.source_revision ?? 1),
    sourceVersionId: row.source_version_id ? String(row.source_version_id) : null,
    studioId: String(row.studio_id),
    unpublishedAt: row.unpublished_at ? String(row.unpublished_at) : null,
    updatedAt: String(row.unpublished_at ?? row.published_at ?? createdAt),
  };
}

export function tryMergeDisjoint(
  entry: CanonicalOutboxEntry,
  conflicts: CanonicalServerConflict[],
): CanonicalOutboxEntry | null {
  const nextMutations = [...entry.operation.mutations];
  for (const conflict of conflicts) {
    const index = nextMutations.findIndex((mutation) =>
      mutation.entityType === conflict.entityType && mutation.entityId === conflict.entityId,
    );
    const mutation = nextMutations[index];
    if (!mutation || mutation.action !== 'update' || !mutation.row || !conflict.currentRow) return null;
    const key = `${mutation.entityType}:${mutation.entityId}`;
    const base = entry.baseRows[key] ?? {};
    const localChanged = new Set(Object.keys(mutation.row));
    const serverChanged = changedKeys(base, conflict.currentRow, Object.keys(base));
    if ([...localChanged].some((field) => serverChanged.has(field))) return null;
    nextMutations[index] = {
      ...mutation,
      baseRevision: conflict.currentRevision,
      row: mutation.row,
    };
  }
  return {
    ...entry,
    attempts: entry.attempts + 1,
    baseRows: Object.fromEntries(conflicts.map((conflict) => [
      `${conflict.entityType}:${conflict.entityId}`, conflict.currentRow,
    ])),
    conflicts: [],
    lastError: null,
    operation: { ...entry.operation, mutations: nextMutations },
    status: 'pending',
  };
}

function changedKeys(base: Record<string, unknown>, value: Record<string, unknown>, keys = Object.keys(value)) {
  const ignored = new Set(['created_at', 'updated_at', 'revision']);
  return new Set(keys.filter((key) => !ignored.has(key) && stableJson(base[key]) !== stableJson(value[key])));
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') return JSON.stringify(Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))));
  return JSON.stringify(value);
}

/**
 * A browser can lose the response after the server committed an initial
 * shadow import. Before replaying that insert-only operation, prove that every
 * requested value is already represented by the freshly hydrated graph. The
 * portfolio profile is a Studio singleton, so an older device-local profile
 * id may be equivalent when its stable username and complete payload match.
 */
export function syncImportOperationAlreadyReflected(
  operation: CanonicalOperation,
  cloudState: CanonicalWorkspaceState,
) {
  if (operation.origin !== 'sync'
    || operation.mutations.length === 0
    || operation.mutations.some((mutation) => mutation.action !== 'insert' || !mutation.row)) return false;

  const snapshot = canonicalMutableSnapshot(cloudState);
  const portfolioProfiles = Object.entries(snapshot)
    .filter(([key]) => key.startsWith('portfolio_profiles:'))
    .map(([, row]) => row);

  return operation.mutations.every((mutation) => {
    const expected = mutation.row!;
    const current = snapshot[`${mutation.entityType}:${mutation.entityId}`];
    if (current && rowContainsExpected(current, expected)) return true;
    if (mutation.entityType !== 'portfolio_profiles') return false;
    return portfolioProfiles.some((profile) =>
      profile.username_slug === expected.username_slug
      && rowContainsExpected(profile, expected));
  });
}

/**
 * Two devices may race while adopting an older browser-local Studio. Stable
 * domain ids converge, but a pre-WP8 portfolio profile used a random id. When
 * the database already owns that one-per-Studio profile, rebase the losing
 * import onto the authoritative id, discard rows already proven identical,
 * and retain only a safe profile update for actual field differences.
 */
export function reconcileSyncImportRetry(
  entry: CanonicalOutboxEntry,
  cloudState: CanonicalWorkspaceState,
): CanonicalOutboxEntry | null | undefined {
  const { operation } = entry;
  if (operation.origin !== 'sync'
    || operation.mutations.length === 0
    || operation.mutations.some((mutation) => mutation.action === 'delete' || !mutation.row)) return undefined;

  const snapshot = canonicalMutableSnapshot(cloudState);
  const materialized = materializeMutableRows(cloudState);
  const cloudProfiles = Object.entries(snapshot)
    .filter(([key]) => key.startsWith('portfolio_profiles:'))
    .map(([key, row]) => ({ id: key.slice('portfolio_profiles:'.length), row }));
  const aliases = new Map<string, string>();
  for (const mutation of operation.mutations) {
    if (mutation.entityType !== 'portfolio_profiles') continue;
    const profile = cloudProfiles.find((candidate) =>
      candidate.row.username_slug === mutation.row?.username_slug)
      ?? (cloudProfiles.length === 1 ? cloudProfiles[0] : undefined);
    if (profile && profile.id !== mutation.entityId) aliases.set(mutation.entityId, profile.id);
  }

  const mutations: CanonicalOperation['mutations'] = [];
  const baseRows: CanonicalOutboxEntry['baseRows'] = {};
  const localRows: CanonicalOutboxEntry['localRows'] = {};
  for (const original of operation.mutations) {
    const entityId = replaceAliasedIdentity(original.entityId, aliases) as string;
    const expected = replaceAliasedIdentity(original.row!, aliases) as Record<string, unknown>;
    const key = `${original.entityType}:${entityId}`;
    const current = snapshot[key];
    if (current && rowContainsExpected(current, expected)) continue;

    if (!current) {
      if (original.action === 'update') return undefined;
      mutations.push({ ...original, entityId, row: expected });
      baseRows[key] = null;
      localRows[key] = expected;
      continue;
    }
    const revision = Number(materialized.get(key)?.record.revision ?? 0);
    if (revision !== 1) return undefined;
    // Inventory is append-only. When two initial imports race on the same
    // stable entry id, retain the committed cloud evidence and preserve the
    // losing device snapshot instead of attempting an illegal rewrite.
    if (original.entityType === 'inventory_entries') continue;
    const stableColumns = canonicalStableColumns[original.entityType] ?? [];
    const changed = Object.fromEntries(Object.entries(expected)
      .filter(([column, value]) => !stableColumns.includes(column) && stableJson(current[column]) !== stableJson(value)));
    if (Object.keys(changed).length === 0) continue;
    mutations.push({
      action: 'update',
      baseRevision: revision,
      entityId,
      entityType: original.entityType,
      row: changed,
    });
    baseRows[key] = current;
    localRows[key] = { ...current, ...changed };
  }

  if (mutations.length === 0) return null;
  return {
    ...entry,
    baseRows,
    conflicts: [],
    lastError: null,
    localRows,
    operation: { ...operation, garmentId: null, mutations },
    status: 'pending',
  };
}

/** The legacy placeholder was never a public identity choice. Portfolio routes
 * are globally unique, so give only that placeholder a deterministic Studio
 * suffix when another isolated beta account already claimed it. */
export function repairPlaceholderPortfolioSlug(
  entry: CanonicalOutboxEntry,
  cloudState: CanonicalWorkspaceState,
): CanonicalOutboxEntry | undefined {
  if (entry.operation.origin !== 'sync'
    || cloudState.portfolioProfiles.length > 0
    || !entry.lastError?.includes('portfolio_profiles_username_slug_key')) return undefined;
  let repaired = false;
  const usernameSlug = `designer-${entry.operation.studioId.slice(0, 8)}`;
  const mutations = entry.operation.mutations.map((mutation) => {
    if (mutation.entityType !== 'portfolio_profiles'
      || !mutation.row
      || mutation.row.username_slug !== 'designer') return mutation;
    repaired = true;
    return { ...mutation, row: { ...mutation.row, username_slug: usernameSlug } };
  });
  if (!repaired) return undefined;
  const localRows = Object.fromEntries(Object.entries(entry.localRows).map(([key, row]) => [
    key,
    key.startsWith('portfolio_profiles:') && row
      ? { ...row, username_slug: usernameSlug }
      : row,
  ]));
  return {
    ...entry,
    lastError: null,
    localRows,
    operation: { ...entry.operation, mutations },
    status: 'pending',
  };
}

const canonicalStableColumns: Partial<Record<CanonicalOperation['mutations'][number]['entityType'], string[]>> = {
  components: ['component_code'],
  garments: ['garment_code'],
  materials: ['material_code'],
  portfolio_editorials: ['slug'],
  portfolio_profiles: ['username_slug'],
  portfolio_projects: ['slug'],
};

function replaceAliasedIdentity(value: unknown, aliases: Map<string, string>): unknown {
  if (typeof value === 'string') {
    let next = value;
    for (const [from, to] of aliases) next = next.replaceAll(from, to);
    return next;
  }
  if (Array.isArray(value)) return value.map((item) => replaceAliasedIdentity(item, aliases));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => [key, replaceAliasedIdentity(item, aliases)]));
  }
  return value;
}

function rowContainsExpected(current: Record<string, unknown>, expected: Record<string, unknown>) {
  return Object.entries(expected).every(([key, value]) => stableJson(current[key]) === stableJson(value));
}

export function authoritativeRowsToWorkspace(
  current: CanonicalWorkspaceState,
  result: CanonicalCommitResult,
) {
  if (result.status === 'conflict') return current;
  const next = { ...current };
  for (const authoritative of result.authoritativeRows) {
    const entry = canonicalCodecRegistry.find((item) => item.entityType === authoritative.entityType);
    if (!entry?.stateKey) continue;
    const records = [...(next[entry.stateKey] as unknown[])] as Record<string, unknown>[];
    const index = records.findIndex((record) => record.id === authoritative.entityId);
    if (!authoritative.row) {
      if (index >= 0) records.splice(index, 1);
    } else {
      const decoded = decodeCanonicalRecord(entry, authoritative.row);
      if (index >= 0) records[index] = decoded;
      else records.push(decoded);
    }
    (next[entry.stateKey] as unknown[]) = records;
  }
  return normalizeWorkspace(next);
}

export function encodedWorkspaceRows(state: CanonicalWorkspaceState) {
  return Object.fromEntries(canonicalCodecRegistry.flatMap((entry) => {
    if (!entry.stateKey) return [];
    return [[entry.table, (state[entry.stateKey] as unknown[]).map((record) =>
      encodeCanonicalRecord(entry, record as Record<string, unknown>))]];
  }));
}
