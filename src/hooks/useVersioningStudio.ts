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
import { useCanonicalWorkspace } from './useCanonicalWorkspace';

export function useVersioningStudio(garmentId: string | null) {
  const { commitWorkspace, currentActorId, state, syncState } = useCanonicalWorkspace();
  const versions = useMemo(() => state?.garmentVersions.filter((item) => item.garmentId === garmentId).sort((a, b) => b.versionNo - a.versionNo) ?? [], [garmentId, state]);
  const createFrame = async (input: Omit<FreezeFrameInput, 'actorId' | 'garmentId'>) => {
    if (!state || !garmentId) throw new Error('Select a garment before creating a Freeze Frame.');
    const result = await createFreezeFrame(state, { ...input, actorId: currentActorId, garmentId });
    commitWorkspace(() => result.state, { skipAutoLedger: true });
    return result;
  };
  const preview = async (sourceVersionId: string, scope: RestoreCommitInput['scope'], selectedKeys: string[]) => {
    if (!state || !garmentId) throw new Error('Select a garment before preparing restore.');
    return previewRestore(state, { garmentId, scope, selectedKeys, sourceVersionId });
  };
  const restore = async (input: Omit<RestoreCommitInput, 'actorId' | 'garmentId' | 'online'>) => {
    if (!state || !garmentId) throw new Error('Select a garment before restoring.');
    const result = await commitRestore(state, { ...input, actorId: currentActorId, garmentId, online: navigator.onLine !== false });
    commitWorkspace(() => result.state, { skipAutoLedger: true });
    return result;
  };
  const removeFrame = (versionId: string) => {
    if (!state) return;
    commitWorkspace(() => deleteFreezeFrame(state, versionId, currentActorId), { skipAutoLedger: true });
  };
  const resolve = (conflictId: string, resolution: CanonicalConflict['resolution'], customValue?: unknown) => {
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
