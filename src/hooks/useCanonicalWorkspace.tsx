import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  addCollection,
  addCalendarEvent,
  addComponent,
  addGarment,
  addMaterial,
  addTask,
  addTemplate,
  attachAsset,
  attachMoodboardItem,
  attachComponent,
  attachMaterial,
  createCanonicalWorkspace,
  createMoodboard,
  deleteGarment,
  recordInventory,
  relationshipOptions,
  updateBrief,
  updateGarment,
  updateTaskStatus,
  type ComponentInput,
  type GarmentInput,
  type MaterialInput,
} from '../domains/workspace';
import type {
  CanonicalCalendarEvent,
  CanonicalGarmentMedia,
  CanonicalWorkspaceState,
  InventoryEntryType,
  RelationshipOption,
  WorkspaceChangeContext,
  WorkspaceSyncState,
  CanonicalReleaseTask,
} from '../domains/workspace';
import { recordWorkspaceChangeEvents } from '../domains/versioning';
import {
  authoritativeRowsToWorkspace,
  buildCanonicalMutations,
  canonicalMutableSnapshot,
  canonicalValueChecksum,
  CanonicalIndexedDb,
  emptyCanonicalWorkspaceState,
  loadCanonicalPersistenceMode,
  reconcileSyncImportRetry,
  syncImportOperationAlreadyReflected,
  SupabaseCanonicalWorkspaceRepository,
  type CanonicalMigrationReport,
  type CanonicalCommitResult,
  type CanonicalOperation,
  type CanonicalPersistenceMode,
  type CanonicalWorkspaceRepository,
} from '../domains/persistence';
import { recordClientEvent } from '../lib/observability';
import { createRequestBoundCanonicalSupabase } from '../lib/supabase';
import { getStudioData, type StudioData } from '../lib/studioStorage';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.generated';

type CanonicalWorkspaceContextValue = {
  addCollection: (name: string, season?: string) => string;
  addCalendarEvent: (input: Pick<CanonicalCalendarEvent, 'endsAt' | 'eventType' | 'garmentId' | 'startsAt' | 'title'>) => string;
  addComponent: (input: ComponentInput) => { componentId: string; variantId: string };
  addGarment: (input: GarmentInput) => string;
  addMaterial: (input: MaterialInput) => { materialId: string; variantId: string };
  addTask: (input: Pick<CanonicalReleaseTask, 'description' | 'dueAt' | 'garmentId' | 'priority' | 'title'>) => string;
  addTemplate: (input: { name: string; templateType: 'pom' | 'measurement' | 'grading' | 'bom' | 'construction' | 'validation' | 'tech_pack' }) => string;
  attachAsset: (garmentId: string, assetId: string, role: CanonicalGarmentMedia['role']) => void;
  attachMoodboardItem: (boardId: string, assetId: string, caption?: string) => void;
  attachComponent: (garmentId: string, variantId: string, placement?: string) => void;
  attachMaterial: (garmentId: string, variantId: string, role: string, placement?: string) => void;
  createMoodboard: (garmentId: string, title?: string) => string;
  deleteGarment: (garmentId: string) => void;
  commitWorkspace: (change: (current: CanonicalWorkspaceState) => CanonicalWorkspaceState, context?: Omit<WorkspaceChangeContext, 'actorId'>) => void;
  commitWorkspaceAsync: (change: (current: CanonicalWorkspaceState) => CanonicalWorkspaceState, context?: Omit<WorkspaceChangeContext, 'actorId'> & { excludeEntities?: string[] }) => Promise<CanonicalCommitResult | null>;
  currentActorId: string;
  error: string | null;
  isReady: boolean;
  pendingCount: number;
  recordInventory: (variantId: string, entryType: InventoryEntryType, quantity: number, note?: string) => void;
  persistenceMode: CanonicalPersistenceMode;
  refresh: () => Promise<void>;
  requireFreshWorkspace: () => Promise<CanonicalWorkspaceState>;
  resolveTransportConflict: (conflictId: string, resolution: 'local' | 'remote') => Promise<void>;
  relationshipOptions: (kind: 'material' | 'component' | 'asset') => RelationshipOption[];
  retry: () => void;
  state: CanonicalWorkspaceState | null;
  syncState: WorkspaceSyncState;
  updateBrief: (garmentId: string, patch: Parameters<typeof updateBrief>[2]) => void;
  updateGarment: (garmentId: string, patch: Partial<GarmentInput>) => void;
  updateTaskStatus: (taskId: string, status: CanonicalReleaseTask['status']) => void;
};

const startupRequestTimeoutMs = 20_000;

async function withStartupRequestTimeout<T>(request: PromiseLike<T>, label: string): Promise<T> {
  let timer: number | undefined;
  try {
    return await Promise.race([
      Promise.resolve(request),
      new Promise<T>((_, reject) => {
        timer = window.setTimeout(() => {
          reject(new Error(`${label} did not respond. Check the beta Data API schema allowlist, then try again.`));
        }, startupRequestTimeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) window.clearTimeout(timer);
  }
}

const CanonicalWorkspaceContext = createContext<CanonicalWorkspaceContextValue | null>(null);

function errorMessage(reason: unknown, fallback: string) {
  if (reason instanceof Error && reason.message) return reason.message;
  if (reason && typeof reason === 'object' && 'message' in reason && typeof reason.message === 'string') {
    return reason.message;
  }
  return fallback;
}

export function CanonicalWorkspaceProvider({
  accessToken,
  children,
  userId,
}: {
  accessToken: string;
  children: ReactNode;
  userId: string;
}) {
  // Legacy storage is read once as migration/recovery input. Its provider and
  // cloud-sync effects are intentionally absent from normal authenticated UI.
  const rawData = useMemo(() => getStudioData(userId), [userId]);
  const [state, setState] = useState<CanonicalWorkspaceState | null>(null);
  const stateRef = useRef<CanonicalWorkspaceState | null>(null);
  const [syncState, setSyncState] = useState<WorkspaceSyncState>('loading');
  const [persistenceMode, setPersistenceMode] = useState<CanonicalPersistenceMode>('local-recovery');
  const [pendingCount, setPendingCount] = useState(0);
  const persistenceModeRef = useRef<CanonicalPersistenceMode>('local-recovery');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const cacheRef = useRef(new CanonicalIndexedDb());
  const requestBoundSupabase = useMemo(
    () => createRequestBoundCanonicalSupabase(accessToken),
    [accessToken],
  );
  const repositoryRef = useRef<SupabaseCanonicalWorkspaceRepository | null>(null);
  const repositoryClientRef = useRef<SupabaseClient<Database> | null>(null);
  if (repositoryClientRef.current !== requestBoundSupabase) {
    repositoryClientRef.current = requestBoundSupabase;
    repositoryRef.current = requestBoundSupabase
      ? new SupabaseCanonicalWorkspaceRepository(requestBoundSupabase, cacheRef.current)
      : null;
  }
  const key = `mystic-lore-studio:canonical-wp3:${userId}`;

  useEffect(() => {
    let cancelled = false;
    setState(null);
    setError(null);
    setSyncState('loading');
    const initialise = async () => {
      try {
        const stored = window.localStorage.getItem(key);
        const parsed = stored ? JSON.parse(stored) as CanonicalWorkspaceState : null;
        const rememberedStudioId = await cacheRef.current.getSetting<string>(`last-studio:${userId}`);
        let canonicalStudioId: string | null;
        let usedOfflineIdentity = false;
        if (navigator.onLine === false) {
          canonicalStudioId = rememberedStudioId;
          usedOfflineIdentity = true;
        } else {
          try {
            canonicalStudioId = await currentCanonicalStudioId(requestBoundSupabase);
          } catch (reason) {
            if (!rememberedStudioId) throw reason;
            canonicalStudioId = rememberedStudioId;
            usedOfflineIdentity = true;
          }
        }
        const recoveryState = parsed?.studioId
          && Array.isArray(parsed.designBriefs)
          && (!canonicalStudioId || parsed.studioId === canonicalStudioId)
          ? hydrateTechnicalState(parsed, rawData)
          : null;
        if (recoveryState) {
          const recoveryKey = `canonical-localstorage:${userId}:${new Date().toISOString()}`;
          await cacheRef.current.preserveRecoveryCopy(recoveryKey, recoveryState);
          window.localStorage.removeItem(key);
        }

        const studioId = canonicalStudioId ?? recoveryState?.studioId;
        const cachedState = studioId ? await cacheRef.current.getWorkspace(studioId) : null;
        let next: CanonicalWorkspaceState;
        let mode: CanonicalPersistenceMode = 'local-recovery';
        let startupQueueError: string | null = null;
        let startupQueueHasConflict = false;

        if (!requestBoundSupabase || !studioId || !repositoryRef.current) {
          next = recoveryState ?? cachedState ?? await createCanonicalWorkspace({
            data: rawData, ownerUserId: userId, studioId: studioId ?? undefined,
          });
          await cacheRef.current.putWorkspace(next);
        } else {
          if (navigator.onLine === false) {
            const rememberedMode = await cacheRef.current.getSetting<CanonicalPersistenceMode>(`persistence-mode:${studioId}`);
            if (!cachedState || !rememberedMode) throw new Error('This device has no cached rollout policy for offline startup.');
            mode = rememberedMode;
            usedOfflineIdentity = true;
          } else {
            try {
              mode = await withStartupRequestTimeout(
                loadCanonicalPersistenceMode(requestBoundSupabase, studioId),
                'ml_private.studio_settings',
              );
              await cacheRef.current.putSetting(`persistence-mode:${studioId}`, mode);
            } catch (reason) {
              const rememberedMode = await cacheRef.current.getSetting<CanonicalPersistenceMode>(`persistence-mode:${studioId}`);
              if (!cachedState || !rememberedMode) throw reason;
              mode = rememberedMode;
              usedOfflineIdentity = true;
            }
          }
          let cloudState = await repositoryRef.current.hydrate(studioId);
          const queuedBeforeRecovery = !usedOfflineIdentity && navigator.onLine !== false
            ? await cacheRef.current.listOutbox(studioId)
            : [];
          for (const entry of queuedBeforeRecovery) {
            if (entry.status === 'conflict') continue;
            const reconciled = reconcileSyncImportRetry(entry, cloudState);
            const alreadyReflected = syncImportOperationAlreadyReflected(entry.operation, cloudState);
            if (reconciled === undefined && !alreadyReflected) continue;
            await cacheRef.current.putSetting(`recovered-operation:${entry.operation.operationId}`, {
              operationId: entry.operation.operationId,
              recoveredAt: new Date().toISOString(),
              reason: reconciled ? 'singleton_identity_rebase' : 'fresh_cloud_parity',
            });
            if (reconciled) await cacheRef.current.putOutbox(reconciled);
            else await cacheRef.current.deleteOutbox(entry.operation.operationId);
          }
          const queuedBeforeImport = !usedOfflineIdentity && navigator.onLine !== false
            ? await cacheRef.current.listOutbox(studioId)
            : [];
          if (queuedBeforeImport.length > 0) {
            // A failed first-device import or offline edit is already the
            // canonical retry unit. Replay it before deciding whether the
            // database still needs a new import operation.
            await repositoryRef.current.flush();
            const queuedAfterReplay = await cacheRef.current.listOutbox(studioId);
            if (queuedAfterReplay.length === 0) {
              cloudState = await repositoryRef.current.refresh();
            } else {
              startupQueueHasConflict = queuedAfterReplay.some((entry) => entry.status === 'conflict');
              startupQueueError = startupQueueHasConflict
                ? 'A previously interrupted canonical operation conflicts with server data. Review the queued conflict before continuing.'
                : queuedAfterReplay.find((entry) => entry.lastError)?.lastError
                  ?? 'A previously interrupted canonical operation is still queued. Check the connection, then try again.';
            }
          }
          if (mode === 'cloud') {
            next = cloudState;
          } else {
            next = recoveryState ?? cachedState ?? (
              hasCanonicalRecords(cloudState)
                ? cloudState
                : await createCanonicalWorkspace({ data: rawData, ownerUserId: userId, studioId })
            );
            await cacheRef.current.putWorkspace(next);
            if (!usedOfflineIdentity && !startupQueueError && mode === 'shadow' && !hasCanonicalRecords(cloudState) && hasCanonicalRecords(next)) {
              const report = await importShadowWorkspace(repositoryRef.current, next);
              await cacheRef.current.preserveRecoveryCopy(report.recoveryCopyKey, next, report);
              if (report.relationshipWarnings.some((warning) => warning.startsWith('trusted_import_required:'))) {
                setError('The mutable graph was shadowed, but protected release evidence remains in the recovery copy. Run the trusted isolated-beta importer before cloud cutover.');
                setSyncState('conflict');
              }
            }
            if (mode === 'shadow' && hasCanonicalRecords(cloudState)) {
              const [localChecksum, cloudChecksum] = await Promise.all([
                canonicalValueChecksum(canonicalMutableSnapshot(next)),
                canonicalValueChecksum(canonicalMutableSnapshot(cloudState)),
              ]);
              if (localChecksum !== cloudChecksum) {
                setError('Shadow comparison found a local/cloud difference. The local recovery copy was preserved and cloud mode remains blocked.');
                setSyncState('conflict');
              }
            }
          }
        }
        if (cancelled) return;
        if (studioId) {
          await cacheRef.current.putSetting(`last-studio:${userId}`, studioId);
          await cacheRef.current.putSetting(`persistence-mode:${studioId}`, mode);
        }
        next = withTransportConflicts(
          next,
          studioId ? await cacheRef.current.listTransportConflicts(studioId) : [],
        );
        persistenceModeRef.current = mode;
        setPersistenceMode(mode);
        stateRef.current = next;
        setState(next);
        const pending = studioId ? await cacheRef.current.listOutbox(studioId) : [];
        setPendingCount(pending.length);
        if (startupQueueError) {
          setError(startupQueueError);
          setSyncState(startupQueueHasConflict ? 'conflict' : 'error');
        } else {
          setSyncState((current) => current === 'conflict' ? current : usedOfflineIdentity || navigator.onLine === false ? 'offline' : 'ready');
        }
      } catch (reason) {
        if (cancelled) return;
        recordClientEvent({ context: { stage: 'hydrate' }, kind: 'migration_warning' });
        setError(errorMessage(reason, 'The canonical workspace could not be prepared.'));
        setSyncState('error');
      }
    };
    void initialise();
    return () => { cancelled = true; };
  }, [attempt, key, rawData, requestBoundSupabase, userId]);

  const reconcileCommit = useCallback(async (
    current: CanonicalWorkspaceState,
    next: CanonicalWorkspaceState,
    context: Omit<WorkspaceChangeContext, 'actorId'> & { excludeEntities?: string[] },
  ) => {
    try {
      const persisted = await persistCanonicalChange({ before: current, context, next, repository: repositoryRef.current, mode: persistenceModeRef.current }, cacheRef.current);
      setPendingCount((await cacheRef.current.listOutbox(next.studioId)).length);
      if (!persisted) {
        setError(null);
        setSyncState(navigator.onLine === false ? 'offline' : 'ready');
        return null;
      }
      if (persisted.result.status === 'conflict') {
        const conflicted = withTransportConflicts(
          next,
          await cacheRef.current.listTransportConflicts(next.studioId),
        );
        stateRef.current = conflicted;
        setState(conflicted);
        setError('This edit conflicts with a newer server revision. It remains queued for Conflict Resolver.');
        setSyncState('conflict');
        return persisted.result;
      }
      if (!operationResultHasParity(persisted.operation, persisted.result)) {
        setError('The server accepted this edit but returned a different authoritative value. Cloud cutover remains blocked.');
        setSyncState('conflict');
        return persisted.result;
      }
      if (persistenceModeRef.current === 'cloud') {
        const latest = stateRef.current;
        if (latest) {
          const reconciled = authoritativeRowsToWorkspace(latest, persisted.result);
          stateRef.current = reconciled;
          setState(reconciled);
          await cacheRef.current.putWorkspace(reconciled);
        }
      }
      setError(null);
      setSyncState('ready');
      setPendingCount((await cacheRef.current.listOutbox(next.studioId)).length);
      return persisted.result;
    } catch (reason) {
      recordClientEvent({ context: { stage: 'canonical_commit' }, kind: 'client_error' });
      setError(errorMessage(reason, 'The edit is cached but could not reach the canonical repository.'));
      setSyncState(navigator.onLine === false ? 'offline' : 'error');
      setPendingCount((await cacheRef.current.listOutbox(next.studioId)).length);
      throw reason;
    }
  }, []);

  const prepareChange = useCallback((
    change: (current: CanonicalWorkspaceState) => CanonicalWorkspaceState,
    context: Omit<WorkspaceChangeContext, 'actorId'> & { excludeEntities?: string[] } = {},
  ) => {
    const current = stateRef.current;
    if (!current) throw new Error('The canonical workspace is not ready.');
    if (persistenceModeRef.current === 'local-recovery') {
      throw new Error('Local recovery mode is read-only. Connect the isolated canonical repository before editing Studio records.');
    }
    const next = recordWorkspaceChangeEvents(current, change(current), { actorId: userId, ...context });
    stateRef.current = next;
    setState(next);
    setSyncState(navigator.onLine === false ? 'offline' : 'ready');
    return { context, current, next };
  }, [userId]);

  const commitAsync = useCallback(async (
    change: (current: CanonicalWorkspaceState) => CanonicalWorkspaceState,
    context: Omit<WorkspaceChangeContext, 'actorId'> & { excludeEntities?: string[] } = {},
  ) => {
    const prepared = prepareChange(change, context);
    return await reconcileCommit(prepared.current, prepared.next, prepared.context);
  }, [prepareChange, reconcileCommit]);

  const commit = useCallback((
    change: (current: CanonicalWorkspaceState) => CanonicalWorkspaceState,
    context: Omit<WorkspaceChangeContext, 'actorId'> = {},
  ) => {
    const prepared = prepareChange(change, context);
    void reconcileCommit(prepared.current, prepared.next, prepared.context).catch(() => undefined);
  }, [prepareChange, reconcileCommit]);

  const refresh = useCallback(async () => {
    const repository = repositoryRef.current;
    if (!repository) return;
    await repository.flush();
    const studioId = stateRef.current?.studioId;
    if (!studioId) return;
    const pending = await cacheRef.current.listOutbox(studioId);
    setPendingCount(pending.length);
    if (pending.length > 0) {
      const current = stateRef.current;
      if (current) {
        const conflicted = withTransportConflicts(
          current,
          await cacheRef.current.listTransportConflicts(studioId),
        );
        stateRef.current = conflicted;
        setState(conflicted);
      }
      setSyncState(pending.some((entry) => entry.status === 'conflict') ? 'conflict' : navigator.onLine === false ? 'offline' : 'ready');
      return;
    }
    const refreshed = await repository.refresh();
    // Once the outbox is empty, the freshly loaded database graph is the only
    // acceptable basis for protected commands in both shadow and cloud mode.
    // Shadow still controls rollout, not per-domain authority.
    if (persistenceModeRef.current !== 'local-recovery') {
      stateRef.current = refreshed;
      setState(refreshed);
    }
    await cacheRef.current.putWorkspace(stateRef.current ?? refreshed);
    setError(null);
    setSyncState('ready');
    setPendingCount(0);
  }, []);

  const requireFreshWorkspace = useCallback(async () => {
    if (persistenceModeRef.current === 'local-recovery' || !repositoryRef.current) {
      throw new Error('This protected action requires the canonical cloud repository. Local recovery mode is read-only for release evidence.');
    }
    if (navigator.onLine === false) throw new Error('This protected action requires a live server connection.');
    await repositoryRef.current.flush();
    const studioId = stateRef.current?.studioId;
    if (!studioId) throw new Error('The canonical Studio is unavailable.');
    const pending = await cacheRef.current.listOutbox(studioId);
    setPendingCount(pending.length);
    if (pending.length) throw new Error('Finish or resolve queued canonical edits before this protected action.');
    const fresh = await repositoryRef.current.refresh();
    stateRef.current = fresh;
    setState(fresh);
    await cacheRef.current.putWorkspace(fresh);
    setError(null);
    setSyncState('ready');
    setPendingCount(0);
    return fresh;
  }, []);

  const resolveTransportConflict = useCallback(async (conflictId: string, resolution: 'local' | 'remote') => {
    const studioId = stateRef.current?.studioId;
    if (!studioId || !repositoryRef.current) throw new Error('The canonical conflict queue is unavailable.');
    await cacheRef.current.resolveTransportConflict(studioId, conflictId, resolution);
    setSyncState('loading');
    await repositoryRef.current.flush();
    const pending = await cacheRef.current.listOutbox(studioId);
    setPendingCount(pending.length);
    if (pending.length === 0) {
      const fresh = await repositoryRef.current.refresh();
      stateRef.current = fresh;
      setState(fresh);
      await cacheRef.current.putWorkspace(fresh);
      setError(null);
      setSyncState('ready');
      return;
    }
    const current = stateRef.current;
    if (current) {
      const conflicted = withTransportConflicts(
        current,
        await cacheRef.current.listTransportConflicts(studioId),
      );
      stateRef.current = conflicted;
      setState(conflicted);
    }
    setSyncState(pending.some((entry) => entry.status === 'conflict') ? 'conflict' : 'error');
  }, []);

  useEffect(() => {
    const handleOnline = () => { void refresh(); };
    const handleOffline = () => setSyncState('offline');
    const handleFocus = () => { if (document.visibilityState === 'visible') void refresh(); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [refresh]);

  const value = useMemo<CanonicalWorkspaceContextValue>(() => ({
    addCollection: (name, season) => { let id = ''; commit((current) => { const result = addCollection(current, name, season); id = result.record.id; return result.state; }); return id; },
    addCalendarEvent: (input) => { let id = ''; commit((current) => { const result = addCalendarEvent(current, input); id = result.record.id; return result.state; }); return id; },
    addComponent: (input) => { let componentId = ''; let variantId = ''; commit((current) => { const result = addComponent(current, input); componentId = result.component.id; variantId = result.variant.id; return result.state; }); return { componentId, variantId }; },
    addGarment: (input) => { let id = ''; commit((current) => { const result = addGarment(current, input); id = result.record.id; return result.state; }); return id; },
    addMaterial: (input) => { let materialId = ''; let variantId = ''; commit((current) => { const result = addMaterial(current, input); materialId = result.material.id; variantId = result.variant.id; return result.state; }); return { materialId, variantId }; },
    addTask: (input) => { let id = ''; commit((current) => { const result = addTask(current, input); id = result.record.id; return result.state; }); return id; },
    addTemplate: (input) => { let id = ''; commit((current) => { const result = addTemplate(current, input); id = result.record.id; return result.state; }); return id; },
    attachAsset: (garmentId, assetId, role) => commit((current) => attachAsset(current, garmentId, assetId, role).state),
    attachMoodboardItem: (boardId, assetId, caption) => commit((current) => attachMoodboardItem(current, boardId, assetId, caption).state),
    attachComponent: (garmentId, variantId, placement) => commit((current) => attachComponent(current, garmentId, variantId, placement).state),
    attachMaterial: (garmentId, variantId, role, placement) => commit((current) => attachMaterial(current, garmentId, variantId, role, placement).state),
    createMoodboard: (garmentId, title) => { let id = ''; commit((current) => { const result = createMoodboard(current, garmentId, title); id = result.board.id; return result.state; }); return id; },
    deleteGarment: (garmentId) => commit((current) => deleteGarment(current, garmentId)),
    commitWorkspace: commit,
    commitWorkspaceAsync: commitAsync,
    currentActorId: userId,
    error,
    isReady: Boolean(state),
    pendingCount,
    persistenceMode,
    recordInventory: (variantId, entryType, quantity, note) => commit((current) => recordInventory(current, variantId, entryType, quantity, note).state),
    relationshipOptions: (kind) => state ? relationshipOptions(state, kind) : [],
    refresh,
    requireFreshWorkspace,
    resolveTransportConflict,
    retry: () => { setAttempt((current) => current + 1); void refresh(); },
    state,
    syncState,
    updateBrief: (garmentId, patch) => commit((current) => updateBrief(current, garmentId, patch)),
    updateGarment: (garmentId, patch) => commit((current) => updateGarment(current, garmentId, patch)),
    updateTaskStatus: (taskId, status) => commit((current) => updateTaskStatus(current, taskId, status)),
  }), [commit, commitAsync, error, pendingCount, persistenceMode, refresh, requireFreshWorkspace, resolveTransportConflict, state, syncState, userId]);

  return <CanonicalWorkspaceContext.Provider value={value}>{children}</CanonicalWorkspaceContext.Provider>;
}

async function persistCanonicalChange(
  input: {
    before: CanonicalWorkspaceState;
    context: Omit<WorkspaceChangeContext, 'actorId'> & { excludeEntities?: string[] };
    mode: CanonicalPersistenceMode;
    next: CanonicalWorkspaceState;
    repository: CanonicalWorkspaceRepository | null;
  },
  cache: CanonicalIndexedDb,
) {
  await cache.putWorkspace(input.next);
  if (!input.repository || input.mode === 'local-recovery') return null;
  const excluded = new Set(input.context.excludeEntities ?? []);
  const mutations = buildCanonicalMutations(input.before, input.next)
    .filter((mutation) => !excluded.has(mutation.entityType));
  if (mutations.length === 0) return null;
  if (mutations.length > 2_000) {
    throw new Error('This command changes more than 2,000 normalized rows. Split it at a product-defined command boundary.');
  }
  const operation: CanonicalOperation = {
    garmentId: inferOperationGarmentId(mutations),
    mutations,
    operationId: input.context.operationId ?? crypto.randomUUID(),
    origin: input.context.origin ?? 'user',
    queuedAt: new Date().toISOString(),
    studioId: input.next.studioId,
  };
  const result = await input.repository.dispatch(operation).committed;
  return { operation, result };
}

async function importShadowWorkspace(
  repository: CanonicalWorkspaceRepository,
  state: CanonicalWorkspaceState,
): Promise<CanonicalMigrationReport> {
  const mutations = buildCanonicalMutations(emptyCanonicalWorkspaceState(state.studioId), state)
    .filter((mutation) => mutation.action === 'insert');
  const operationIds: string[] = [];
  for (let offset = 0; offset < mutations.length; offset += 200) {
    const operationId = crypto.randomUUID();
    operationIds.push(operationId);
    const operation: CanonicalOperation = {
      garmentId: inferOperationGarmentId(mutations.slice(offset, offset + 200)),
      mutations: mutations.slice(offset, offset + 200),
      operationId,
      origin: 'sync',
      queuedAt: new Date(Date.now() + offset).toISOString(),
      studioId: state.studioId,
    };
    const result = await repository.dispatch(operation).committed;
    if (result.status === 'conflict') {
      throw new Error(`Device-local canonical import conflicted in operation ${operationId}.`);
    }
  }
  const relationshipWarnings = relationshipWarningsFor(state);
  return {
    collectionCounts: Object.fromEntries(Object.entries(state)
      .filter(([, value]) => Array.isArray(value))
      .map(([name, value]) => [name, (value as unknown[]).length])),
    createdAt: new Date().toISOString(),
    localStorageRemoved: true,
    operationIds,
    recoveryCopyKey: `canonical-device-import:${state.studioId}:${new Date().toISOString()}`,
    relationshipWarnings,
    sourceChecksum: await canonicalValueChecksum(canonicalMutableSnapshot(state)),
    sourceKey: 'mystic-lore-studio:canonical-wp3',
    studioId: state.studioId,
  };
}

function inferOperationGarmentId(mutations: ReturnType<typeof buildCanonicalMutations>) {
  const ids = new Set<string>();
  for (const mutation of mutations) {
    if (mutation.entityType === 'garments') ids.add(mutation.entityId);
    const garmentId = mutation.row?.garment_id;
    if (typeof garmentId === 'string') ids.add(garmentId);
  }
  return ids.size === 1 ? [...ids][0] : null;
}

function hasCanonicalRecords(state: CanonicalWorkspaceState) {
  return state.garments.length > 0
    || state.materials.length > 0
    || state.editorialCollections.length > 0
    || state.portfolioProfiles.length > 0;
}

function relationshipWarningsFor(state: CanonicalWorkspaceState) {
  const garmentIds = new Set(state.garments.map((item) => item.id));
  const assetIds = new Set(state.mediaAssets.map((item) => item.id));
  const warnings: string[] = [];
  for (const item of state.garmentMedia) {
    if (!garmentIds.has(item.garmentId)) warnings.push(`garment_media:${item.id}:missing_garment`);
    if (!assetIds.has(item.assetId)) warnings.push(`garment_media:${item.id}:missing_asset`);
  }
  for (const item of state.portfolioProjects) {
    if (!garmentIds.has(item.garmentId)) warnings.push(`portfolio_project:${item.id}:missing_garment`);
    for (const assetId of item.selectedAssetIds) {
      if (!assetIds.has(assetId)) warnings.push(`portfolio_project:${item.id}:missing_asset:${assetId}`);
    }
  }
  const protectedCollections: Array<keyof CanonicalWorkspaceState> = [
    'aiAcceptanceCommands', 'aiAcceptances', 'aiArtifacts', 'changeEvents',
    'editorialExports', 'entityRevisions', 'garmentVersions', 'qcWaivers',
    'restoreOperations', 'techPackExports', 'templateApplications',
    'validationRuns', 'validationWaivers',
  ];
  for (const key of protectedCollections) {
    const records = state[key];
    if (Array.isArray(records) && records.length > 0) {
      warnings.push(`trusted_import_required:${String(key)}:${records.length}`);
    }
  }
  return warnings;
}

function withTransportConflicts(
  state: CanonicalWorkspaceState,
  transportConflicts: CanonicalWorkspaceState['conflicts'],
): CanonicalWorkspaceState {
  return {
    ...state,
    conflicts: [
      ...state.conflicts.filter((conflict) => !conflict.id.startsWith('transport:')),
      ...transportConflicts,
    ],
  };
}

function operationResultHasParity(operation: CanonicalOperation, result: CanonicalCommitResult) {
  if (result.status === 'conflict') return false;
  return operation.mutations.every((mutation) => {
    const authoritative = result.authoritativeRows.find((item) =>
      item.entityType === mutation.entityType && item.entityId === mutation.entityId,
    );
    if (!authoritative) return false;
    if (mutation.action === 'delete') return authoritative.row === null;
    if (!mutation.row || !authoritative.row) return false;
    return Object.entries(mutation.row).every(([key, value]) => {
      if (key === 'created_at' || key === 'updated_at' || key === 'revision') return true;
      return JSON.stringify(authoritative.row?.[key]) === JSON.stringify(value);
    });
  });
}

async function currentCanonicalStudioId(client: SupabaseClient<Database> | null) {
  if (!client) return null;
  const response = await withStartupRequestTimeout(
    client.schema('ml_private').from('studios')
      .select('id').order('created_at', { ascending: true }).limit(1).maybeSingle(),
    'ml_private.studios',
  );
  if (response.error) throw response.error;
  return (response.data as { id?: string } | null)?.id ?? null;
}

function hydrateTechnicalState(state: CanonicalWorkspaceState, rawData: StudioData): CanonicalWorkspaceState {
  const now = new Date().toISOString();
  const migratedProfile = state.portfolioProfiles?.length ? state.portfolioProfiles : [{
    avatarAssetId: null,
    bio: rawData.portfolioProfile.bio,
    createdAt: now,
    displayName: rawData.portfolioProfile.displayName || 'Mystic Lore Portfolio',
    email: rawData.portfolioProfile.email ?? '',
    headline: rawData.portfolioProfile.headline,
    id: crypto.randomUUID(),
    location: rawData.portfolioProfile.location ?? '',
    resumePublicUrl: rawData.portfolioProfile.resumeUrl ?? '',
    revision: 1,
    status: 'ready' as const,
    studioId: state.studioId,
    updatedAt: now,
    usernameSlug: rawData.portfolioProfile.usernameSlug || 'designer',
  }];
  return {
    ...state,
    aiAcceptanceCommands: state.aiAcceptanceCommands ?? [],
    aiAcceptances: state.aiAcceptances ?? [],
    aiArtifacts: (state.aiArtifacts ?? []).map((item) => ({
      ...item,
      acceptanceOperationId: item.acceptanceOperationId ?? null,
      acceptedPayloadChecksum: item.acceptedPayloadChecksum ?? null,
      decisionReason: item.decisionReason ?? '',
      fields: item.fields ?? [],
    })),
    aiInputRefs: state.aiInputRefs ?? [],
    aiJobs: state.aiJobs ?? [],
    bomItems: state.bomItems ?? [],
    calendarEvents: state.calendarEvents ?? [],
    changeEvents: (state.changeEvents ?? []).map((item) => ({ ...item, relatedOperationIds: item.relatedOperationIds ?? [] })),
    constructionDetails: state.constructionDetails ?? [],
    constructionSections: state.constructionSections ?? [],
    constructionSteps: state.constructionSteps ?? [],
    costItems: state.costItems ?? [],
    costSheets: state.costSheets ?? [],
    conflicts: state.conflicts ?? [],
    entityRevisions: state.entityRevisions ?? [],
    editorialAssets: state.editorialAssets ?? [],
    editorialBlocks: (state.editorialBlocks ?? []).map((item) => ({
      ...item,
      aiArtifactId: item.aiArtifactId ?? null,
      content: item.content ?? {},
      liveSource: item.liveSource ?? null,
      settings: item.settings ?? {},
      sourceChecksum: item.sourceChecksum ?? null,
      sourceEntityId: item.sourceEntityId ?? null,
      sourceFieldPath: item.sourceFieldPath ?? null,
      sourceGarmentId: item.sourceGarmentId ?? null,
      sourceVersionId: item.sourceVersionId ?? null,
      staleness: item.staleness ?? 'current',
    })),
    editorialCollectionGarments: state.editorialCollectionGarments ?? (state.editorialCollections ?? []).map((collection) => ({
      createdAt: collection.createdAt,
      collectionId: collection.id,
      garmentId: collection.primaryGarmentId ?? (collection as unknown as { garmentId?: string }).garmentId ?? '',
      id: crypto.randomUUID(),
      revision: 1,
      role: 'primary' as const,
      sortOrder: 0,
      studioId: collection.studioId,
      updatedAt: collection.updatedAt,
    })),
    editorialCollections: (state.editorialCollections ?? []).map((item) => ({
      ...item,
      approvedAt: item.approvedAt ?? null,
      approvedBy: item.approvedBy ?? null,
      description: item.description ?? '',
      exportSettings: item.exportSettings ?? {},
      primaryGarmentId: item.primaryGarmentId ?? (item as unknown as { garmentId?: string }).garmentId ?? '',
      primaryGarmentVersionId: item.primaryGarmentVersionId ?? null,
      publishedAt: item.publishedAt ?? null,
      publishedBy: item.publishedBy ?? null,
      status: item.status === 'archived' ? 'archived' : item.status ?? 'draft',
      subtitle: item.subtitle ?? '',
      transition: item.transition ?? {},
    })),
    editorialExports: state.editorialExports ?? [],
    editorialScenes: (state.editorialScenes ?? []).map((item) => ({
      ...item,
      background: item.background ?? {},
      description: item.description ?? '',
      narrativeRole: item.narrativeRole ?? 'supporting',
      subtitle: item.subtitle ?? '',
      transition: item.transition ?? {},
    })),
    factories: (state.factories ?? []).map((item) => ({
      ...item,
      capabilities: item.capabilities ?? {},
      contactEmail: item.contactEmail ?? null,
      contactName: item.contactName ?? null,
      phone: item.phone ?? null,
      supplierId: item.supplierId ?? null,
    })),
    fitIssuePromotions: state.fitIssuePromotions ?? [],
    fitIssues: state.fitIssues ?? [],
    fitSessionMedia: state.fitSessionMedia ?? [],
    fitSessions: state.fitSessions ?? [],
    flatAnnotations: state.flatAnnotations ?? [],
    garmentVersions: (state.garmentVersions ?? []).map((item) => ({
      ...item,
      baseRevision: item.baseRevision ?? state.garments.find((garment) => garment.id === item.garmentId)?.revision ?? 1,
      createdBy: item.createdBy ?? null,
      kind: item.kind ?? 'named',
      notes: item.notes ?? '',
      parentVersionId: item.parentVersionId ?? null,
    })),
    gradeRuleValues: state.gradeRuleValues ?? [],
    gradeRules: state.gradeRules ?? [],
    measurementSets: state.measurementSets ?? [],
    measurementValues: state.measurementValues ?? [],
    pomPoints: state.pomPoints ?? [],
    productionMilestones: state.productionMilestones ?? [],
    productionOrders: state.productionOrders ?? [],
    qcInspections: state.qcInspections ?? [],
    qcResults: state.qcResults ?? [],
    qcTemplateChecks: state.qcTemplateChecks ?? [],
    qcTemplates: state.qcTemplates ?? [],
    qcWaivers: state.qcWaivers ?? [],
    restoreOperations: (state.restoreOperations ?? []).map((item) => ({
      ...item,
      actorId: item.actorId ?? null,
      baseRevision: item.baseRevision ?? 1,
      dependencies: item.dependencies ?? [],
      inversePatch: item.inversePatch ?? [],
      previewChecksum: item.previewChecksum ?? '',
      replayPatch: item.replayPatch ?? [],
      resultRevision: item.resultRevision ?? 1,
      scope: item.scope ?? 'technical',
      selectedKeys: item.selectedKeys ?? [...(item.selectedPomPointIds ?? []), ...(item.selectedMeasurementKeys ?? [])],
    })),
    releaseTasks: state.releaseTasks ?? [],
    sampleRoundMedia: state.sampleRoundMedia ?? [],
    sampleRounds: (state.sampleRounds ?? []).map((item) => ({
      ...item,
      factoryId: item.factoryId ?? null,
      notes: item.notes ?? '',
      requestedAt: item.requestedAt ?? null,
    })),
    fitMeasurements: (state.fitMeasurements ?? []).map((item) => ({
      ...item,
      fitSessionId: item.fitSessionId ?? null,
      garmentVersionId: item.garmentVersionId ?? null,
    })),
    portfolioEditorials: state.portfolioEditorials ?? [],
    portfolioProfiles: migratedProfile,
    portfolioProjects: state.portfolioProjects ?? [],
    portfolioTechnicalExcerpts: state.portfolioTechnicalExcerpts ?? [],
    publications: state.publications ?? [],
    schemaVersion: 10,
    techPackExports: (state.techPackExports ?? []).map((item) => ({
      ...item,
      approvedAt: item.approvedAt ?? null,
      approvedBy: item.approvedBy ?? null,
      generatedAt: item.generatedAt ?? item.createdAt,
      rulesetVersion: item.rulesetVersion ?? 'wp4-flats-v1',
      sectionManifest: item.sectionManifest ?? [],
      storagePath: item.storagePath ?? state.mediaAssets.find((asset) => asset.id === item.exportAssetId)?.storagePath ?? '',
    })),
    technicalFiles: state.technicalFiles ?? [],
    technicalFlats: state.technicalFlats ?? [],
    technicalSpecs: (state.technicalSpecs ?? []).map((item) => ({
      ...item,
      releaseValidationRunId: item.releaseValidationRunId ?? null,
      releaseVersionId: item.releaseVersionId ?? null,
      releasedAt: item.releasedAt ?? null,
      releasedBy: item.releasedBy ?? null,
    })),
    suppliers: (state.suppliers ?? []).map((item) => ({
      ...item,
      capabilities: item.capabilities ?? {},
      minimumOrderQuantity: item.minimumOrderQuantity ?? null,
    })),
    templateApplications: state.templateApplications ?? [],
    validationRuns: (state.validationRuns ?? []).map((item) => ({ ...item, actorId: item.actorId ?? null })),
    validationWaivers: state.validationWaivers ?? [],
    versionDependencies: state.versionDependencies ?? [],
    versionEditorial: state.versionEditorial ?? [],
    versionPortfolio: state.versionPortfolio ?? [],
    templates: (state.templates ?? []).map((template) => ({ ...template, payload: template.payload ?? {} })),
  };
}

export function useCanonicalWorkspace() {
  const value = useContext(CanonicalWorkspaceContext);
  if (!value) throw new Error('useCanonicalWorkspace must be used inside CanonicalWorkspaceProvider.');
  return value;
}
