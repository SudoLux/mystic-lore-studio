import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  addCollection,
  addCalendarEvent,
  addComponent,
  addGarment,
  addMaterial,
  addTask,
  addTemplate,
  addGarmentView,
  attachAsset,
  attachInspirationReference,
  attachMoodboardItem,
  attachComponent,
  attachMaterial,
  createMoodboard,
  deleteCalendarEvent,
  MAX_GARMENT_VIEWS,
  removeInspirationReference,
  removeGarmentMaterial,
  removeGarmentView,
  recordInventory,
  relationshipOptions,
  setGarmentHero,
  updateBrief,
  updateCalendarEvent,
  updateGarment,
  updateGarmentMaterial,
  updateTask,
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
  CanonicalMaterialVariantMedia,
} from '../domains/workspace';
import { recordWorkspaceChangeEvents } from '../domains/versioning';
import {
  authoritativeRowsToWorkspace,
  buildCanonicalMutations,
  CanonicalIndexedDb,
  emptyCanonicalWorkspaceState,
  loadCanonicalPersistenceMode,
  isRetryableWorkspaceReadError,
  reconcileSyncImportRetry,
  repairDuplicateMediaAssetRetry,
  repairPlaceholderPortfolioSlug,
  syncImportOperationAlreadyReflected,
  SupabaseCanonicalWorkspaceRepository,
  type CanonicalCommitResult,
  type CanonicalOperation,
  type CanonicalPersistenceMode,
  type CanonicalWorkspaceRepository,
} from '../domains/persistence';
import { recordClientEvent } from '../lib/observability';
import { operationResultHasParity } from '../domains/persistence/canonicalCommitParity';
import { createRequestBoundCanonicalSupabase } from '../lib/supabase';
import { readStoredStudioData } from '../lib/studioStorage';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.generated';
import { prepareCanonicalGarmentImage, prepareCanonicalMaterialImage } from '../lib/canonicalMediaUpload';
import { discardStagedCanonicalMedia } from '../domains/persistence/canonicalMedia';
import type { CanonicalMaterialImageFraming } from '../lib/canonicalMaterialPresentation';

type CanonicalWorkspaceContextValue = {
  addCollection: (name: string, season?: string) => string;
  addCalendarEvent: (input: Pick<CanonicalCalendarEvent, 'endsAt' | 'eventType' | 'garmentId' | 'notes' | 'startsAt' | 'title'>) => string;
  addComponent: (input: ComponentInput) => { componentId: string; variantId: string };
  addGarment: (input: GarmentInput) => string;
  addMaterial: (input: MaterialInput) => { materialId: string; variantId: string };
  addTask: (input: Pick<CanonicalReleaseTask, 'description' | 'dueAt' | 'garmentId' | 'priority' | 'title'>) => string;
  addTemplate: (input: { name: string; templateType: 'pom' | 'measurement' | 'grading' | 'bom' | 'construction' | 'validation' | 'tech_pack' }) => string;
  attachAsset: (garmentId: string, assetId: string, role: CanonicalGarmentMedia['role']) => void;
  attachInspirationReference: (garmentId: string, assetId: string, caption?: string) => void;
  attachMoodboardItem: (boardId: string, assetId: string, caption?: string) => void;
  attachComponent: (garmentId: string, variantId: string, placement?: string) => void;
  attachMaterial: (garmentId: string, variantId: string, role: string, placement?: string) => void;
  linkMaterialToGarment: (garmentId: string, variantId: string, role: string, placement: string, requiredQuantity: number) => void;
  createMoodboard: (garmentId: string, title?: string) => string;
  deleteGarment: (garmentId: string) => Promise<void>;
  deleteMaterialVariant: (variantId: string) => Promise<void>;
  deleteEditorialCollection: (collectionId: string) => Promise<void>;
  deleteCalendarEvent: (eventId: string) => void;
  deleteTask: (taskId: string) => Promise<void>;
  commitWorkspace: (change: (current: CanonicalWorkspaceState) => CanonicalWorkspaceState, context?: Omit<WorkspaceChangeContext, 'actorId'>) => void;
  commitWorkspaceConfirmed: (change: (current: CanonicalWorkspaceState) => CanonicalWorkspaceState) => Promise<void>;
  commitWorkspaceAsync: (change: (current: CanonicalWorkspaceState) => CanonicalWorkspaceState, context?: Omit<WorkspaceChangeContext, 'actorId'> & { excludeEntities?: string[] }) => Promise<CanonicalCommitResult | null>;
  currentActorId: string;
  error: string | null;
  isReady: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
  recordInventory: (variantId: string, entryType: InventoryEntryType, quantity: number, note?: string) => void;
  removeGarmentView: (garmentId: string, assetId: string) => void;
  removeGarmentMaterial: (relationshipId: string) => void;
  removeInspirationReference: (garmentId: string, assetId: string, inspirationItemId?: string | null) => void;
  persistenceMode: CanonicalPersistenceMode;
  refresh: () => Promise<void>;
  requireFreshWorkspace: () => Promise<CanonicalWorkspaceState>;
  resolveTransportConflict: (conflictId: string, resolution: 'local' | 'remote') => Promise<void>;
  relationshipOptions: (kind: 'material' | 'component' | 'asset') => RelationshipOption[];
  retry: () => Promise<void>;
  state: CanonicalWorkspaceState | null;
  syncState: WorkspaceSyncState;
  setGarmentHero: (garmentId: string, assetId: string) => void;
  updateBrief: (garmentId: string, patch: Parameters<typeof updateBrief>[2]) => void;
  updateGarment: (garmentId: string, patch: Partial<GarmentInput>) => void;
  updateCalendarEvent: (eventId: string, patch: Parameters<typeof updateCalendarEvent>[2]) => void;
  updateGarmentMaterial: (relationshipId: string, patch: { requiredQuantity: number; role: string }) => void;
  updateTask: (taskId: string, patch: Parameters<typeof updateTask>[2]) => void;
  updateTaskStatus: (taskId: string, status: CanonicalReleaseTask['status']) => void;
  uploadGarmentMedia: (garmentId: string, file: File, role: CanonicalGarmentMedia['role']) => Promise<string>;
  uploadGarmentView: (garmentId: string, file: File) => Promise<string>;
  uploadInspirationMedia: (garmentId: string, file: File) => Promise<string>;
  uploadMaterialMedia: (variantId: string, file: File) => Promise<string>;
  replaceMaterialMedia: (variantId: string, file: File, framing?: CanonicalMaterialImageFraming) => Promise<string>;
  removeMaterialMedia: (variantId: string) => void;
  updateMaterialMediaFraming: (variantId: string, framing: CanonicalMaterialImageFraming) => void;
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
  const rawData = useMemo(() => readStoredStudioData(userId), [userId]);
  const [state, setState] = useState<CanonicalWorkspaceState | null>(null);
  const stateRef = useRef<CanonicalWorkspaceState | null>(null);
  const [syncState, setSyncState] = useState<WorkspaceSyncState>('loading');
  const [persistenceMode, setPersistenceMode] = useState<CanonicalPersistenceMode>('local-recovery');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);
  const activeCommitsRef = useRef(0);
  const changeGenerationRef = useRef(0);
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
    stateRef.current = null;
    setLastSyncedAt(null);
    setPendingCount(0);
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
            if (!rememberedStudioId || !isRetryableWorkspaceReadError(reason)) throw reason;
            canonicalStudioId = rememberedStudioId;
            usedOfflineIdentity = true;
          }
        }
        const recoveryState = parsed?.studioId
          && Array.isArray(parsed.designBriefs)
          && (!canonicalStudioId || parsed.studioId === canonicalStudioId)
          ? hydrateTechnicalState(parsed)
          : null;
        if (recoveryState) {
          const recoveryKey = `canonical-localstorage:${userId}:${new Date().toISOString()}`;
          await cacheRef.current.preserveRecoveryCopy(recoveryKey, recoveryState);
          window.localStorage.removeItem(key);
        }

        if (!canonicalStudioId && requestBoundSupabase && navigator.onLine !== false) {
          throw new Error('Your account no longer has access to a Studio. Sign in again.');
        }
        const studioId = canonicalStudioId ?? recoveryState?.studioId;
        const cachedSnapshot = studioId ? await cacheRef.current.getWorkspace(studioId) : null;
        // IndexedDB survives deploys. Fill in collections introduced by newer
        // workspace contracts before comparing or replaying an older cache so
        // a harmless schema addition never strands a Studio at startup.
        const cachedState = cachedSnapshot ? hydrateTechnicalState(cachedSnapshot) : null;
        if (cachedState && cachedState !== cachedSnapshot) await cacheRef.current.putWorkspace(cachedState);
        let next: CanonicalWorkspaceState;
        let mode: CanonicalPersistenceMode = 'local-recovery';
        let startupQueueError: string | null = null;
        let startupQueueHasConflict = false;

        if (!requestBoundSupabase || !studioId || !repositoryRef.current) {
          if (!studioId || (!recoveryState && !cachedState)) {
            throw new Error('No accessible Studio was found. Sign in again or finish Studio setup.');
          }
          next = recoveryState ?? cachedState!;
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
              if (!cachedState || !rememberedMode || !isRetryableWorkspaceReadError(reason)) throw reason;
              mode = rememberedMode;
              usedOfflineIdentity = true;
            }
          }
          let cloudState = await repositoryRef.current.hydrate(studioId);
          const loaded = repositoryRef.current.lastLoad;
          setLastSyncedAt(loaded?.confirmedAt ?? await cacheRef.current.getSetting<string>(`last-sync:${studioId}`));
          if (loaded?.source === 'cache') usedOfflineIdentity = true;
          if (loaded?.source === 'cloud') setLastSyncedAt(loaded.confirmedAt);
          if (loaded?.error && navigator.onLine !== false) startupQueueError = `Cloud could not be verified. Showing this device’s saved copy. ${loaded.error}`;
          const queuedBeforeRecovery = !usedOfflineIdentity && navigator.onLine !== false
            ? await cacheRef.current.listOutbox(studioId)
            : [];
          for (const originalEntry of queuedBeforeRecovery) {
            const duplicateMediaRepair = repairDuplicateMediaAssetRetry(originalEntry, cloudState);
            const entry = repairPlaceholderPortfolioSlug(duplicateMediaRepair ?? originalEntry, cloudState)
              ?? duplicateMediaRepair
              ?? originalEntry;
            if (entry.status === 'conflict') continue;
            const reconciled = reconcileSyncImportRetry(entry, cloudState);
            const alreadyReflected = syncImportOperationAlreadyReflected(entry.operation, cloudState);
            const repairedEntry = reconciled === undefined && entry !== originalEntry ? entry : reconciled;
            if (repairedEntry === undefined && !alreadyReflected) continue;
            if (cachedState) {
              await cacheRef.current.preserveRecoveryCopy(
                `canonical-raced-import:${entry.operation.operationId}:${new Date().toISOString()}`,
                cachedState,
              );
            }
            await cacheRef.current.putSetting(`recovered-operation:${entry.operation.operationId}`, {
              operationId: entry.operation.operationId,
              recoveredAt: new Date().toISOString(),
              reason: duplicateMediaRepair
                ? 'duplicate_media_identity_rebase'
                : repairedEntry
                  ? 'singleton_identity_rebase'
                  : 'fresh_cloud_parity',
            });
            if (repairedEntry) await cacheRef.current.putOutbox(repairedEntry);
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
          // Empty cloud workspaces are intentional. Legacy/sample content is
          // recovery input only and is never automatically imported here.
          if (loaded?.confirmedAt) await cacheRef.current.putSetting(`last-sync:${studioId}`, loaded.confirmedAt);
          const pending = await cacheRef.current.listOutbox(studioId);
          next = pending.length > 0 && cachedState ? cachedState : cloudState;
          await cacheRef.current.putWorkspace(next);
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
    const generation = changeGenerationRef.current;
    activeCommitsRef.current += 1;
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
      if (persistenceModeRef.current !== 'local-recovery' && generation === changeGenerationRef.current) {
        const latest = stateRef.current;
        if (latest) {
          const reconciled = authoritativeRowsToWorkspace(latest, persisted.result);
          stateRef.current = reconciled;
          setState(reconciled);
          await cacheRef.current.putWorkspace(reconciled);
        }
      }
      setError(null);
      const confirmedAt = new Date().toISOString();
      setLastSyncedAt(confirmedAt);
      await cacheRef.current.putSetting(`last-sync:${next.studioId}`, confirmedAt);
      const remaining = await cacheRef.current.listOutbox(next.studioId);
      setPendingCount(remaining.length);
      setSyncState(remaining.some((entry) => entry.status === 'conflict') ? 'conflict' : remaining.some((entry) => entry.status === 'failed') ? 'error' : remaining.length || activeCommitsRef.current > 1 ? 'saving' : 'ready');
      return persisted.result;
    } catch (reason) {
      recordClientEvent({ context: { stage: 'canonical_commit' }, kind: 'client_error' });
      setError(errorMessage(reason, 'The edit is cached but could not reach the canonical repository.'));
      setSyncState(navigator.onLine === false ? 'offline' : 'error');
      setPendingCount((await cacheRef.current.listOutbox(next.studioId)).length);
      throw reason;
    } finally {
      activeCommitsRef.current -= 1;
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
    changeGenerationRef.current += 1;
    stateRef.current = next;
    setState(next);
    setSyncState(navigator.onLine === false ? 'offline' : 'saving');
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
    if (refreshPromiseRef.current) return await refreshPromiseRef.current;
    const repository = repositoryRef.current;
    const studioId = stateRef.current?.studioId;
    if (!repository || !studioId) return;
    const generation = changeGenerationRef.current;
    const work = async () => {
      try {
        if (navigator.onLine === false) { setSyncState('offline'); throw new Error('You are offline. Cloud sync has not been verified.'); }
        await repository.flush();
        const pending = await cacheRef.current.listOutbox(studioId);
        setPendingCount(pending.length);
        if (pending.length) {
          if (stateRef.current) setState(stateRef.current = withTransportConflicts(stateRef.current, await cacheRef.current.listTransportConflicts(studioId)));
          const failed = pending.find((entry) => entry.status === 'failed');
          setError(failed?.lastError ?? null);
          setSyncState(pending.some((entry) => entry.status === 'conflict') ? 'conflict' : failed ? 'error' : 'saving');
          throw new Error(failed?.lastError ?? 'Your queued changes must finish or be reviewed before this Studio is current.');
        }
        if (!activeCommitsRef.current) setSyncState('loading');
        const fresh = await repository.refresh();
        // A read that started before a local edit cannot replace that edit.
        if (repository !== repositoryRef.current || generation !== changeGenerationRef.current || activeCommitsRef.current) return;
        if ((await cacheRef.current.listOutbox(studioId)).length) return;
        stateRef.current = fresh;
        setState(fresh);
        await repository.acceptSnapshot(fresh);
        setLastSyncedAt(repository.lastLoad?.confirmedAt ?? null);
        await cacheRef.current.putSetting(`last-sync:${studioId}`, repository.lastLoad?.confirmedAt);
        setError(null);
        setSyncState('ready');
      } catch (reason) {
        if (repository !== repositoryRef.current) return;
        setError(errorMessage(reason, 'Cloud sync could not be verified. Your saved copy remains available.'));
        setSyncState((current) => current === 'conflict' ? 'conflict' : navigator.onLine === false ? 'offline' : 'error');
        throw reason;
      }
    };
    refreshPromiseRef.current = work();
    try { await refreshPromiseRef.current; }
    finally { refreshPromiseRef.current = null; }
  }, []);

  const retry = useCallback(async () => {
    const repository = repositoryRef.current;
    if (!repository) {
      setAttempt((current) => current + 1);
      return;
    }
    await repository.retryFailed();
    await refresh();
  }, [refresh]);

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
    const generation = changeGenerationRef.current;
    if (activeCommitsRef.current) throw new Error('Wait for your changes to finish saving.');
    const fresh = await repositoryRef.current.refresh();
    if (generation !== changeGenerationRef.current || activeCommitsRef.current) throw new Error('The Studio changed while refreshing. Review it again before continuing.');
    stateRef.current = fresh;
    setState(fresh);
    await repositoryRef.current.acceptSnapshot(fresh);
    setLastSyncedAt(repositoryRef.current.lastLoad?.confirmedAt ?? null);
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
      await refresh();
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
  }, [refresh]);

  useEffect(() => {
    const requestRefresh = () => { void refresh().catch(() => undefined); };
    const handleOnline = requestRefresh;
    const handleOffline = () => setSyncState('offline');
    const handleFocus = () => { if (document.visibilityState === 'visible') requestRefresh(); };
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible' && navigator.onLine !== false) requestRefresh(); }, 30_000);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [refresh]);

  const deletionPromiseRef = useRef<Promise<void> | null>(null);
  const deleteItem = useCallback(async (kind: 'garment' | 'material_variant' | 'editorial' | 'task', id: string) => {
    if (deletionPromiseRef.current) throw new Error('Wait for the current removal to finish.');
    const current = stateRef.current;
    const items = kind === 'garment' ? current?.garments : kind === 'material_variant' ? current?.materialVariants : kind === 'editorial' ? current?.editorialCollections : current?.releaseTasks;
    const item = items?.find((record) => record.id === id);
    if (!current || !item || !requestBoundSupabase) throw new Error('Refresh your Studio before removing this item.');
    if (navigator.onLine === false) throw new Error('Connect to the internet before confirming removal.');
    const work = async () => {
      await requireFreshWorkspace();
      const retryKey = `cleanup:${current.studioId}:${kind}:${id}:${item.revision}`;
      const operationId = await cacheRef.current.getSetting<string>(retryKey) ?? crypto.randomUUID();
      await cacheRef.current.putSetting(retryKey, operationId);
      changeGenerationRef.current += 1;
      activeCommitsRef.current += 1;
      setSyncState('saving');
      try {
        const response = await requestBoundSupabase.schema('ml_private').rpc('delete_studio_item', {
          p_studio_id: current.studioId, p_kind: kind, p_item_id: id,
          p_expected_revision: item.revision, p_operation_id: operationId,
        });
        if (response.error) throw new Error(response.error.message);
        const result = response.data as { status?: string } | null;
        if (!result || !['applied', 'duplicate'].includes(result.status ?? '')) throw new Error('Removal was not confirmed by the server.');
      } finally { activeCommitsRef.current -= 1; }
      // Bypass an earlier in-flight read, then verify the resulting graph.
      if (refreshPromiseRef.current) await refreshPromiseRef.current.catch(() => undefined);
      await refresh();
    };
    deletionPromiseRef.current = work();
    try { await deletionPromiseRef.current; }
    catch (reason) { setError(errorMessage(reason, 'Removal could not be confirmed.')); setSyncState('error'); throw reason; }
    finally { deletionPromiseRef.current = null; }
  }, [refresh, requireFreshWorkspace, requestBoundSupabase]);

  const value = useMemo<CanonicalWorkspaceContextValue>(() => ({
    addCollection: (name, season) => { let id = ''; commit((current) => { const result = addCollection(current, name, season); id = result.record.id; return result.state; }); return id; },
    addCalendarEvent: (input) => { let id = ''; commit((current) => { const result = addCalendarEvent(current, input); id = result.record.id; return result.state; }); return id; },
    addComponent: (input) => { let componentId = ''; let variantId = ''; commit((current) => { const result = addComponent(current, input); componentId = result.component.id; variantId = result.variant.id; return result.state; }); return { componentId, variantId }; },
    addGarment: (input) => { let id = ''; commit((current) => { const result = addGarment(current, input); id = result.record.id; return result.state; }); return id; },
    addMaterial: (input) => { let materialId = ''; let variantId = ''; commit((current) => { const result = addMaterial(current, input); materialId = result.material.id; variantId = result.variant.id; return result.state; }); return { materialId, variantId }; },
    addTask: (input) => { let id = ''; commit((current) => { const result = addTask(current, input); id = result.record.id; return result.state; }); return id; },
    addTemplate: (input) => { let id = ''; commit((current) => { const result = addTemplate(current, input); id = result.record.id; return result.state; }); return id; },
    attachAsset: (garmentId, assetId, role) => commit((current) => attachAsset(current, garmentId, assetId, role).state),
    attachInspirationReference: (garmentId, assetId, caption) => commit((current) => attachInspirationReference(current, garmentId, assetId, caption).state),
    attachMoodboardItem: (boardId, assetId, caption) => commit((current) => attachMoodboardItem(current, boardId, assetId, caption).state),
    attachComponent: (garmentId, variantId, placement) => commit((current) => attachComponent(current, garmentId, variantId, placement).state),
    attachMaterial: (garmentId, variantId, role, placement) => commit((current) => attachMaterial(current, garmentId, variantId, role, placement).state),
    linkMaterialToGarment: (garmentId, variantId, role, placement, requiredQuantity) => commit((current) => {
      const result = attachMaterial(current, garmentId, variantId, role, placement);
      const now = new Date().toISOString();
      return {
        ...result.state,
        garmentMaterials: result.state.garmentMaterials.map((relationship) => relationship.id === result.relationship.id
          ? { ...relationship, requiredQuantity, revision: relationship.revision + 1, updatedAt: now }
          : relationship),
      };
    }),
    createMoodboard: (garmentId, title) => { let id = ''; commit((current) => { const result = createMoodboard(current, garmentId, title); id = result.board.id; return result.state; }); return id; },
    deleteGarment: (garmentId) => deleteItem('garment', garmentId),
    deleteMaterialVariant: (variantId) => deleteItem('material_variant', variantId),
    deleteEditorialCollection: (collectionId) => deleteItem('editorial', collectionId),
    deleteCalendarEvent: (eventId) => commit((current) => deleteCalendarEvent(current, eventId)),
    deleteTask: (taskId) => deleteItem('task', taskId),
    commitWorkspace: commit,
    commitWorkspaceAsync: commitAsync,
    commitWorkspaceConfirmed: async (change) => { const result = await commitAsync(change); if (result?.status === 'conflict') throw new Error('This item changed on another device. Resolve its conflicting edits before continuing.'); },
    currentActorId: userId,
    error,
    isReady: Boolean(state),
    pendingCount,
    lastSyncedAt,
    persistenceMode,
    recordInventory: (variantId, entryType, quantity, note) => commit((current) => recordInventory(current, variantId, entryType, quantity, note).state),
    removeGarmentMaterial: (relationshipId) => commit((current) => removeGarmentMaterial(current, relationshipId)),
    removeGarmentView: (garmentId, assetId) => commit((current) => removeGarmentView(current, garmentId, assetId)),
    removeInspirationReference: (garmentId, assetId, inspirationItemId) => commit((current) => removeInspirationReference(current, garmentId, assetId, inspirationItemId)),
    relationshipOptions: (kind) => state ? relationshipOptions(state, kind) : [],
    refresh,
    requireFreshWorkspace,
    resolveTransportConflict,
    retry,
    state,
    syncState,
    setGarmentHero: (garmentId, assetId) => commit((current) => setGarmentHero(current, garmentId, assetId)),
    updateBrief: (garmentId, patch) => commit((current) => updateBrief(current, garmentId, patch)),
    updateGarment: (garmentId, patch) => commit((current) => updateGarment(current, garmentId, patch)),
    updateCalendarEvent: (eventId, patch) => commit((current) => updateCalendarEvent(current, eventId, patch)),
    updateGarmentMaterial: (relationshipId, patch) => commit((current) => updateGarmentMaterial(current, relationshipId, patch)),
    updateTask: (taskId, patch) => commit((current) => updateTask(current, taskId, patch)),
    updateTaskStatus: (taskId, status) => commit((current) => updateTaskStatus(current, taskId, status)),
    uploadGarmentMedia: async (garmentId, file, role) => {
      const current = stateRef.current;
      if (!current) throw new Error('The garment workspace is not ready.');
      if (persistenceModeRef.current === 'local-recovery') throw new Error('Connect the canonical Studio before uploading imagery.');
      if (!current.garments.some((garment) => garment.id === garmentId)) throw new Error('Garment not found.');
      const asset = await prepareCanonicalGarmentImage(file, current.studioId, garmentId);
      await commitAsync((workspace) => {
        const withAsset = { ...workspace, mediaAssets: [...workspace.mediaAssets, asset] };
        return attachAsset(withAsset, garmentId, asset.id, role).state;
      });
      return asset.id;
    },
    uploadGarmentView: async (garmentId, file) => {
      const current = stateRef.current;
      if (!current) throw new Error('The garment workspace is not ready.');
      if (persistenceModeRef.current === 'local-recovery') throw new Error('Connect the canonical Studio before uploading imagery.');
      if (!current.garments.some((garment) => garment.id === garmentId)) throw new Error('Garment not found.');
      const currentViewCount = new Set(current.garmentMedia
        .filter((relation) => relation.garmentId === garmentId && (relation.role === 'hero' || relation.role === 'gallery'))
        .map((relation) => relation.assetId)).size;
      if (currentViewCount >= MAX_GARMENT_VIEWS) throw new Error(`A garment can have up to ${MAX_GARMENT_VIEWS} images. Remove one before uploading another.`);
      const asset = await prepareCanonicalGarmentImage(file, current.studioId, garmentId);
      await commitAsync((workspace) => addGarmentView({
        ...workspace,
        mediaAssets: [...workspace.mediaAssets, asset],
      }, garmentId, asset.id));
      return asset.id;
    },
    uploadInspirationMedia: async (garmentId, file) => {
      const current = stateRef.current;
      if (!current) throw new Error('The garment workspace is not ready.');
      if (persistenceModeRef.current === 'local-recovery') throw new Error('Connect the canonical Studio before uploading imagery.');
      if (!current.garments.some((garment) => garment.id === garmentId)) throw new Error('Garment not found.');
      const asset = await prepareCanonicalGarmentImage(file, current.studioId, garmentId);
      let resolvedAssetId = asset.id;
      await commitAsync((workspace) => {
        const existing = workspace.mediaAssets.find((candidate) => candidate.checksum === asset.checksum);
        if (existing) {
          resolvedAssetId = existing.id;
          return attachInspirationReference(workspace, garmentId, existing.id).state;
        }
        return attachInspirationReference({
          ...workspace,
          mediaAssets: [...workspace.mediaAssets, asset],
        }, garmentId, asset.id).state;
      });
      if (resolvedAssetId !== asset.id) {
        await discardStagedCanonicalMedia(asset.id);
      }
      return resolvedAssetId;
    },
    uploadMaterialMedia: async (variantId, file) => {
      return await replaceMaterialMedia(stateRef, persistenceModeRef, commitAsync, variantId, file);
    },
    replaceMaterialMedia: async (variantId, file, framing) => {
      return await replaceMaterialMedia(stateRef, persistenceModeRef, commitAsync, variantId, file, framing);
    },
    removeMaterialMedia: (variantId) => commit((workspace) => ({
      ...workspace,
      materialVariantMedia: workspace.materialVariantMedia.filter((relation) => relation.variantId !== variantId || relation.role !== 'swatch'),
    })),
    updateMaterialMediaFraming: (variantId, framing) => commit((workspace) => {
      const now = new Date().toISOString();
      return {
        ...workspace,
        materialVariantMedia: workspace.materialVariantMedia.map((relation) => relation.variantId === variantId && relation.role === 'swatch'
          ? { ...relation, framing, revision: relation.revision + 1, updatedAt: now }
          : relation),
      };
    }),
  }), [commit, commitAsync, deleteItem, error, lastSyncedAt, pendingCount, persistenceMode, refresh, requireFreshWorkspace, resolveTransportConflict, retry, state, syncState, userId]);

  return <CanonicalWorkspaceContext.Provider value={value}>{children}</CanonicalWorkspaceContext.Provider>;
}

async function replaceMaterialMedia(
  stateRef: { current: CanonicalWorkspaceState | null },
  persistenceModeRef: { current: CanonicalPersistenceMode },
  commitAsync: CanonicalWorkspaceContextValue['commitWorkspaceAsync'],
  variantId: string,
  file: File,
  framing: CanonicalMaterialImageFraming = { objectFit: 'cover', objectPositionX: 50, objectPositionY: 50, zoom: 1 },
) {
  const current = stateRef.current;
  if (!current) throw new Error('The material workspace is not ready.');
  if (persistenceModeRef.current === 'local-recovery') throw new Error('Connect the canonical Studio before uploading imagery.');
  if (!current.materialVariants.some((variant) => variant.id === variantId)) throw new Error('Material variant not found.');
  const asset = await prepareCanonicalMaterialImage(file, current.studioId, variantId);
  const now = new Date().toISOString();
  await commitAsync((workspace) => {
    const existing = workspace.materialVariantMedia
      .filter((item) => item.variantId === variantId && item.role === 'swatch')
      .sort((left, right) => left.sortOrder - right.sortOrder)[0];
    const relation: CanonicalMaterialVariantMedia = existing
      ? { ...existing, assetId: asset.id, framing, revision: existing.revision + 1, updatedAt: now }
      : {
          assetId: asset.id, createdAt: now, framing, id: crypto.randomUUID(), revision: 1,
          role: 'swatch', sortOrder: 0, studioId: workspace.studioId, updatedAt: now, variantId,
        };
    return {
      ...workspace,
      mediaAssets: [...workspace.mediaAssets, asset],
      materialVariantMedia: [
        ...workspace.materialVariantMedia.filter((item) => item.variantId !== variantId || item.role !== 'swatch'),
        relation,
      ],
    };
  });
  return asset.id;
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

function inferOperationGarmentId(mutations: ReturnType<typeof buildCanonicalMutations>) {
  const ids = new Set<string>();
  for (const mutation of mutations) {
    if (mutation.entityType === 'garments') ids.add(mutation.entityId);
    if (typeof mutation.row?.garment_id === 'string') ids.add(mutation.row.garment_id);
  }
  // A garment deletion cannot retain a receipt FK to its deleted root.
  if (mutations.some((mutation) => mutation.entityType === 'garments' && mutation.action === 'delete')) return null;
  return ids.size === 1 ? [...ids][0] : null;
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

function hydrateTechnicalState(partialState: CanonicalWorkspaceState): CanonicalWorkspaceState {
  // Recovery copies and IndexedDB caches may have been saved before a later
  // work package added a normalized collection. Start with the current empty
  // contract so every collection is iterable, then retain every saved value.
  const state: CanonicalWorkspaceState = {
    ...emptyCanonicalWorkspaceState(partialState.studioId),
    ...partialState,
  };
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
    portfolioProfiles: state.portfolioProfiles ?? [],
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
      sizeRange: Array.isArray(item.sizeRange) && item.sizeRange.length ? item.sizeRange : [item.baseSize],
      sizeSystem: item.sizeSystem ?? 'custom',
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
