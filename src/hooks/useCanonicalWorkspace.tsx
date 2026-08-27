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
  WorkspaceChangeContext,
  WorkspaceSyncState,
} from '../domains/workspace';
import { recordWorkspaceChangeEvents } from '../domains/versioning';

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
  commitWorkspace: (change: (current: CanonicalWorkspaceState) => CanonicalWorkspaceState, context?: Omit<WorkspaceChangeContext, 'actorId'>) => void;
  currentActorId: string;
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
          ? hydrateTechnicalState(parsed, rawData)
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

  const commit = useCallback((change: (current: CanonicalWorkspaceState) => CanonicalWorkspaceState, context: Omit<WorkspaceChangeContext, 'actorId'> = {}) => {
    setState((current) => {
      if (!current) return current;
      const next = recordWorkspaceChangeEvents(current, change(current), { actorId: userId, ...context });
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
  }, [key, userId]);

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
    currentActorId: userId,
    error,
    isReady: Boolean(state),
    recordInventory: (variantId, entryType, quantity, note) => commit((current) => recordInventory(current, variantId, entryType, quantity, note).state),
    relationshipOptions: (kind) => state ? relationshipOptions(state, kind) : [],
    retry: () => setAttempt((current) => current + 1),
    state,
    syncState,
    updateBrief: (garmentId, patch) => commit((current) => updateBrief(current, garmentId, patch)),
    updateGarment: (garmentId, patch) => commit((current) => updateGarment(current, garmentId, patch)),
  }), [commit, error, state, syncState, userId]);

  return <CanonicalWorkspaceContext.Provider value={value}>{children}</CanonicalWorkspaceContext.Provider>;
}

function hydrateTechnicalState(state: CanonicalWorkspaceState, rawData: ReturnType<typeof useStudioData>['rawData']): CanonicalWorkspaceState {
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
    bomItems: state.bomItems ?? [],
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
    schemaVersion: 9,
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
