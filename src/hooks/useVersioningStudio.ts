import { useMemo } from 'react';
import {
  commitRestore,
  compareFreezeFrame,
  createFreezeFrame,
  deleteFreezeFrame,
  previewRestore,
  resolveConflict,
  type FreezeFrameInput,
  type RestoreCommitInput,
} from '../domains/versioning';
import type { CanonicalConflict } from '../domains/workspace';
import {
  commitRestoreCommand,
  createFreezeFrameCommand,
  deleteFreezeFrameCommand,
} from '../domains/persistence';
import { useCanonicalWorkspace } from './useCanonicalWorkspace';

export function useVersioningStudio(garmentId: string | null) {
  const { commitWorkspace, currentActorId, requireFreshWorkspace, resolveTransportConflict, state, syncState } = useCanonicalWorkspace();
  const versions = useMemo(() => state?.garmentVersions.filter((item) => item.garmentId === garmentId).sort((a, b) => b.versionNo - a.versionNo) ?? [], [garmentId, state]);
  const createFrame = async (input: Omit<FreezeFrameInput, 'actorId' | 'garmentId'>) => {
    if (!garmentId) throw new Error('Select a garment before creating a Freeze Frame.');
    const fresh = await requireFreshWorkspace();
    const operationId = crypto.randomUUID();
    const result = await createFreezeFrame(fresh, { ...input, actorId: currentActorId, garmentId, operationId });
    const receipt = await createFreezeFrameCommand({ expectedRevision: input.expectedRevision, operationId, version: result.version });
    const committed = await requireFreshWorkspace();
    const version = committed.garmentVersions.find((item) => item.id === receipt.versionId);
    if (!version) throw new Error('The server committed the Freeze Frame but its evidence could not be reloaded.');
    return { ...result, state: committed, version };
  };
  const preview = async (sourceVersionId: string, scope: RestoreCommitInput['scope'], selectedKeys: string[]) => {
    if (!state || !garmentId) throw new Error('Select a garment before preparing restore.');
    return previewRestore(state, { garmentId, scope, selectedKeys, sourceVersionId });
  };
  const restore = async (input: Omit<RestoreCommitInput, 'actorId' | 'garmentId' | 'online'>) => {
    if (!garmentId) throw new Error('Select a garment before restoring.');
    const fresh = await requireFreshWorkspace();
    const operationId = input.operationId ?? crypto.randomUUID();
    const result = await commitRestore(fresh, { ...input, actorId: currentActorId, garmentId, online: true, operationId });
    const receipt = await commitRestoreCommand({
      before: fresh,
      expectedRevision: input.expectedRevision,
      mutationOperationId: crypto.randomUUID(),
      operationId,
      restore: result.restoreOperation,
      resultState: result.state,
      version: result.version,
    });
    const committed = await requireFreshWorkspace();
    const version = committed.garmentVersions.find((item) => item.id === receipt.versionId);
    if (!version) throw new Error('The server committed the restore but its resulting Freeze Frame could not be reloaded.');
    return { ...result, state: committed, version };
  };
  const removeFrame = async (versionId: string) => {
    const fresh = await requireFreshWorkspace();
    const version = fresh.garmentVersions.find((item) => item.id === versionId);
    const garment = fresh.garments.find((item) => item.id === version?.garmentId);
    if (!version || !garment) throw new Error('Freeze Frame is unavailable.');
    deleteFreezeFrame(fresh, versionId, currentActorId);
    await deleteFreezeFrameCommand(versionId, garment.revision);
    await requireFreshWorkspace();
  };
  const resolve = (conflictId: string, resolution: CanonicalConflict['resolution'], customValue?: unknown) => {
    if (conflictId.startsWith('transport:') && (resolution === 'local' || resolution === 'remote')) {
      void resolveTransportConflict(conflictId, resolution);
      return;
    }
    commitWorkspace((current) => resolveConflict(current, conflictId, resolution, customValue), { origin: 'sync' });
  };
  return {
    compare: (sourceVersionId: string, targetVersionId?: string | null) => state ? compareFreezeFrame(state, sourceVersionId, targetVersionId) : [],
    conflicts: state?.conflicts.filter((item) => item.garmentId === garmentId && item.resolution === 'pending') ?? [],
    createFrame,
    currentActorId,
    preview,
    removeFrame,
    resolve,
    restore,
    state,
    syncState,
    versions,
  };
}
