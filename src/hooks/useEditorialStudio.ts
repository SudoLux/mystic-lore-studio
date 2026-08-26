import { useMemo } from 'react';
import {
  addEditorialBlock,
  addEditorialScene,
  addStoryFromSystemBlock,
  createEditorialCollection,
  createEditorialExport,
  editorialMigrationReport,
  refreshEditorialLiveData,
  reorderEditorialScene,
  setEditorialPublishState,
} from '../domains/editorial/studioRepository';
import { useCanonicalWorkspace } from './useCanonicalWorkspace';

export function useEditorialStudio() {
  const { commitWorkspace, currentActorId, state, syncState } = useCanonicalWorkspace();
  const collections = useMemo(() => state?.editorialCollections ?? [], [state]);
  return {
    addBlock: (sceneId: string, blockType: string, content?: Record<string, unknown>) => { if (!state) return; commitWorkspace((current) => addEditorialBlock(current, sceneId, blockType, content).state); },
    addScene: (collectionId: string, title?: string) => { if (!state) return; commitWorkspace((current) => addEditorialScene(current, collectionId, title).state); },
    addStoryFromSystem: (input: Parameters<typeof addStoryFromSystemBlock>[1]) => { if (!state) return; commitWorkspace((current) => addStoryFromSystemBlock(current, input).state); },
    collections,
    createCollection: (input: Parameters<typeof createEditorialCollection>[1]) => { if (!state) return; let id = ''; commitWorkspace((current) => { const result = createEditorialCollection(current, input); id = result.collection.id; return result.state; }); return id; },
    createExport: async (collectionId: string, format: 'pdf' | 'image') => { if (!state) throw new Error('Editorial workspace is still loading.'); const result = await createEditorialExport(state, collectionId, format, currentActorId); commitWorkspace(() => result.state, { skipAutoLedger: true, origin: 'publication' }); return result.exportRecord; },
    migrationReport: state ? editorialMigrationReport(state) : null,
    refreshLiveData: () => commitWorkspace((current) => refreshEditorialLiveData(current), { origin: 'system' }),
    reorderScene: (collectionId: string, sceneId: string, direction: 'up' | 'down') => commitWorkspace((current) => reorderEditorialScene(current, collectionId, sceneId, direction)),
    setPublishState: (collectionId: string, status: 'approved' | 'published') => commitWorkspace((current) => setEditorialPublishState(current, collectionId, status, currentActorId), { origin: 'publication' }),
    state,
    syncState,
  };
}
