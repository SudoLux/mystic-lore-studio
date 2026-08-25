import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useStudioData } from './useStudioData';
import {
  addCollection,
  addComponent,
  addGarment,
  addMaterial,
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
  type ComponentInput,
  type GarmentInput,
  type MaterialInput,
} from '../domains/workspace';
import type {
  CanonicalGarmentMedia,
  CanonicalWorkspaceState,
  InventoryEntryType,
  RelationshipOption,
  WorkspaceSyncState,
} from '../domains/workspace';

type CanonicalWorkspaceContextValue = {
  addCollection: (name: string, season?: string) => string;
  addComponent: (input: ComponentInput) => { componentId: string; variantId: string };
  addGarment: (input: GarmentInput) => string;
  addMaterial: (input: MaterialInput) => { materialId: string; variantId: string };
  addTemplate: (input: { name: string; templateType: 'pom' | 'measurement' | 'grading' | 'bom' | 'construction' | 'validation' | 'tech_pack' }) => string;
  attachAsset: (garmentId: string, assetId: string, role: CanonicalGarmentMedia['role']) => void;
  attachMoodboardItem: (boardId: string, assetId: string, caption?: string) => void;
  attachComponent: (garmentId: string, variantId: string, placement?: string) => void;
  attachMaterial: (garmentId: string, variantId: string, role: string, placement?: string) => void;
  createMoodboard: (garmentId: string, title?: string) => string;
  deleteGarment: (garmentId: string) => void;
  commitWorkspace: (change: (current: CanonicalWorkspaceState) => CanonicalWorkspaceState) => void;
  error: string | null;
  isReady: boolean;
  recordInventory: (variantId: string, entryType: InventoryEntryType, quantity: number, note?: string) => void;
  relationshipOptions: (kind: 'material' | 'component' | 'asset') => RelationshipOption[];
  retry: () => void;
  state: CanonicalWorkspaceState | null;
  syncState: WorkspaceSyncState;
  updateBrief: (garmentId: string, patch: Parameters<typeof updateBrief>[2]) => void;
  updateGarment: (garmentId: string, patch: Partial<GarmentInput>) => void;
};

const CanonicalWorkspaceContext = createContext<CanonicalWorkspaceContextValue | null>(null);

export function CanonicalWorkspaceProvider({ children, userId }: { children: ReactNode; userId: string }) {
  const { rawData } = useStudioData();
  const [state, setState] = useState<CanonicalWorkspaceState | null>(null);
  const [syncState, setSyncState] = useState<WorkspaceSyncState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
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
        const next = parsed?.studioId && Array.isArray(parsed.designBriefs)
          ? hydrateTechnicalState(parsed)
          : await createCanonicalWorkspace({ data: rawData, ownerUserId: userId });
        if (cancelled) return;
        window.localStorage.setItem(key, JSON.stringify(next));
        setState(next);
        setSyncState(navigator.onLine === false ? 'offline' : 'ready');
      } catch (reason) {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : 'The canonical workspace could not be prepared.');
        setSyncState('error');
      }
    };
    void initialise();
    return () => { cancelled = true; };
  }, [attempt, key, rawData, userId]);

  const commit = useCallback((change: (current: CanonicalWorkspaceState) => CanonicalWorkspaceState) => {
    setState((current) => {
      if (!current) return current;
      const next = change(current);
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
        setError(null);
        setSyncState(navigator.onLine === false ? 'offline' : 'ready');
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Changes remain in this tab but could not be saved locally.');
        setSyncState('error');
      }
      return next;
    });
  }, [key]);

  const value = useMemo<CanonicalWorkspaceContextValue>(() => ({
    addCollection: (name, season) => { let id = ''; commit((current) => { const result = addCollection(current, name, season); id = result.record.id; return result.state; }); return id; },
    addComponent: (input) => { let componentId = ''; let variantId = ''; commit((current) => { const result = addComponent(current, input); componentId = result.component.id; variantId = result.variant.id; return result.state; }); return { componentId, variantId }; },
    addGarment: (input) => { let id = ''; commit((current) => { const result = addGarment(current, input); id = result.record.id; return result.state; }); return id; },
    addMaterial: (input) => { let materialId = ''; let variantId = ''; commit((current) => { const result = addMaterial(current, input); materialId = result.material.id; variantId = result.variant.id; return result.state; }); return { materialId, variantId }; },
    addTemplate: (input) => { let id = ''; commit((current) => { const result = addTemplate(current, input); id = result.record.id; return result.state; }); return id; },
    attachAsset: (garmentId, assetId, role) => commit((current) => attachAsset(current, garmentId, assetId, role).state),
    attachMoodboardItem: (boardId, assetId, caption) => commit((current) => attachMoodboardItem(current, boardId, assetId, caption).state),
    attachComponent: (garmentId, variantId, placement) => commit((current) => attachComponent(current, garmentId, variantId, placement).state),
    attachMaterial: (garmentId, variantId, role, placement) => commit((current) => attachMaterial(current, garmentId, variantId, role, placement).state),
    createMoodboard: (garmentId, title) => { let id = ''; commit((current) => { const result = createMoodboard(current, garmentId, title); id = result.board.id; return result.state; }); return id; },
    deleteGarment: (garmentId) => commit((current) => deleteGarment(current, garmentId)),
    commitWorkspace: commit,
    error,
    isReady: Boolean(state),
    recordInventory: (variantId, entryType, quantity, note) => commit((current) => recordInventory(current, variantId, entryType, quantity, note).state),
    relationshipOptions: (kind) => state ? relationshipOptions(state, kind) : [],
    retry: () => setAttempt((current) => current + 1),
    state,
    syncState,
    updateBrief: (garmentId, patch) => commit((current) => updateBrief(current, garmentId, patch)),
    updateGarment: (garmentId, patch) => commit((current) => updateGarment(current, garmentId, patch)),
  }), [commit, error, state, syncState]);

  return <CanonicalWorkspaceContext.Provider value={value}>{children}</CanonicalWorkspaceContext.Provider>;
}

function hydrateTechnicalState(state: CanonicalWorkspaceState): CanonicalWorkspaceState {
  return {
    ...state,
    flatAnnotations: state.flatAnnotations ?? [],
    garmentVersions: state.garmentVersions ?? [],
    gradeRuleValues: state.gradeRuleValues ?? [],
    gradeRules: state.gradeRules ?? [],
    measurementSets: state.measurementSets ?? [],
    measurementValues: state.measurementValues ?? [],
    pomPoints: state.pomPoints ?? [],
    restoreOperations: state.restoreOperations ?? [],
    sampleRounds: state.sampleRounds ?? [],
    fitMeasurements: state.fitMeasurements ?? [],
    schemaVersion: 3,
    techPackExports: state.techPackExports ?? [],
    technicalFiles: state.technicalFiles ?? [],
    technicalFlats: state.technicalFlats ?? [],
    technicalSpecs: state.technicalSpecs ?? [],
    validationRuns: state.validationRuns ?? [],
    templates: (state.templates ?? []).map((template) => ({ ...template, payload: template.payload ?? {} })),
  };
}

export function useCanonicalWorkspace() {
  const value = useContext(CanonicalWorkspaceContext);
  if (!value) throw new Error('useCanonicalWorkspace must be used inside CanonicalWorkspaceProvider.');
  return value;
}
