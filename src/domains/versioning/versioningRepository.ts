import type {
  CanonicalChangeEvent,
  CanonicalConflict,
  CanonicalEntityRevision,
  CanonicalGarmentVersion,
  CanonicalJsonPatch,
  CanonicalRecord,
  CanonicalVersionDependency,
  CanonicalWorkspaceState,
  FreezeFrameScope,
  WorkspaceChangeContext,
} from '../workspace';
import type {
  FreezeFrameInput,
  FreshServerState,
  RestoreCommitInput,
  RestorePreviewResult,
  ScalarMergeResult,
  StructuralDiff,
} from './contracts';

type SnapshotDomain = Record<string, CanonicalRecord[]>;
type FreezeFrameSnapshot = {
  domains: Partial<Record<Exclude<FreezeFrameScope, 'all'>, SnapshotDomain>>;
  garment: CanonicalRecord & Record<string, unknown>;
  legacy?: true;
  schemaVersion: 1;
  scope: FreezeFrameScope;
};

const domainOrder: Array<Exclude<FreezeFrameScope, 'all'>> = ['design', 'technical', 'production', 'editorial', 'portfolio'];
const immutableMeta = new Set(['createdAt', 'updatedAt', 'revision', 'studioId']);
const nonRestorableCollections = new Set(['fitMeasurements', 'fitIssues', 'fitSessionMedia', 'fitSessions', 'sampleRoundMedia', 'mediaAssets', 'productionMilestones', 'productionOrders', 'qcInspections', 'qcResults', 'qcWaivers']);

export function snapshotGarmentScope(state: CanonicalWorkspaceState, garmentId: string, scope: FreezeFrameScope): FreezeFrameSnapshot {
  const garment = state.garments.find((item) => item.id === garmentId);
  if (!garment) throw new Error('Garment not found.');
  const specIds = new Set(state.technicalSpecs.filter((item) => item.garmentId === garmentId).map((item) => item.id));
  const flatIds = new Set(state.technicalFlats.filter((item) => specIds.has(item.specId)).map((item) => item.id));
  const fileAssetIds = new Set(state.technicalFiles.filter((item) => specIds.has(item.specId)).map((item) => item.assetId));
  const setIds = new Set(state.measurementSets.filter((item) => specIds.has(item.specId)).map((item) => item.id));
  const ruleIds = new Set(state.gradeRules.filter((item) => specIds.has(item.specId)).map((item) => item.id));
  const sectionIds = new Set(state.constructionSections.filter((item) => specIds.has(item.specId)).map((item) => item.id));
  const stepIds = new Set(state.constructionSteps.filter((item) => sectionIds.has(item.sectionId)).map((item) => item.id));
  const roundIds = new Set(state.sampleRounds.filter((item) => item.garmentId === garmentId).map((item) => item.id));
  const fitSessionIds = new Set(state.fitSessions.filter((item) => roundIds.has(item.sampleRoundId)).map((item) => item.id));
  const fitIssueIds = new Set(state.fitIssues.filter((item) => fitSessionIds.has(item.fitSessionId)).map((item) => item.id));
  const costSheetIds = new Set(state.costSheets.filter((item) => item.garmentId === garmentId).map((item) => item.id));
  const productionOrderIds = new Set(state.productionOrders.filter((item) => item.garmentId === garmentId).map((item) => item.id));
  const qcInspectionIds = new Set(state.qcInspections.filter((item) => productionOrderIds.has(item.productionOrderId)).map((item) => item.id));
  const boardIds = new Set(state.moodboards.filter((item) => item.garmentId === garmentId).map((item) => item.id));
  const designAssetIds = new Set(state.garmentMedia.filter((item) => item.garmentId === garmentId).map((item) => item.assetId));
  const materialVariantIds = new Set(state.garmentMaterials.filter((item) => item.garmentId === garmentId).map((item) => item.variantId));
  const domains: FreezeFrameSnapshot['domains'] = {};

  if (scope === 'all' || scope === 'design') domains.design = {
    designBriefs: stableRows(state.designBriefs.filter((item) => item.garmentId === garmentId)),
    garmentComponents: stableRows(state.garmentComponents.filter((item) => item.garmentId === garmentId)),
    garmentMaterials: stableRows(state.garmentMaterials.filter((item) => item.garmentId === garmentId)),
    garmentMedia: stableRows(state.garmentMedia.filter((item) => item.garmentId === garmentId)),
    mediaAssets: stableRows(state.mediaAssets.filter((item) => designAssetIds.has(item.id))),
    moodboardItems: stableRows(state.moodboardItems.filter((item) => boardIds.has(item.boardId))),
    moodboards: stableRows(state.moodboards.filter((item) => item.garmentId === garmentId)),
  };
  if (scope === 'all' || scope === 'technical') domains.technical = {
    bomItems: stableRows(state.bomItems.filter((item) => specIds.has(item.specId))),
    constructionDetails: stableRows(state.constructionDetails.filter((item) => stepIds.has(item.stepId))),
    constructionSections: stableRows(state.constructionSections.filter((item) => specIds.has(item.specId))),
    constructionSteps: stableRows(state.constructionSteps.filter((item) => sectionIds.has(item.sectionId))),
    flatAnnotations: stableRows(state.flatAnnotations.filter((item) => flatIds.has(item.flatId))),
    gradeRuleValues: stableRows(state.gradeRuleValues.filter((item) => ruleIds.has(item.gradeRuleId))),
    gradeRules: stableRows(state.gradeRules.filter((item) => specIds.has(item.specId))),
    measurementSets: stableRows(state.measurementSets.filter((item) => specIds.has(item.specId))),
    measurementValues: stableRows(state.measurementValues.filter((item) => setIds.has(item.setId))),
    mediaAssets: stableRows(state.mediaAssets.filter((item) => fileAssetIds.has(item.id))),
    pomPoints: stableRows(state.pomPoints.filter((item) => specIds.has(item.specId))),
    technicalFiles: stableRows(state.technicalFiles.filter((item) => specIds.has(item.specId))),
    technicalFlats: stableRows(state.technicalFlats.filter((item) => specIds.has(item.specId))),
    technicalSpecs: stableRows(state.technicalSpecs.filter((item) => item.garmentId === garmentId)),
  };
  if (scope === 'all' || scope === 'production') domains.production = {
    costItems: stableRows(state.costItems.filter((item) => costSheetIds.has(item.costSheetId))),
    costSheets: stableRows(state.costSheets.filter((item) => item.garmentId === garmentId)),
    fitMeasurements: stableRows(state.fitMeasurements.filter((item) => roundIds.has(item.sampleRoundId))),
    fitIssuePromotions: stableRows(state.fitIssuePromotions.filter((item) => fitIssueIds.has(item.fitIssueId))),
    fitIssues: stableRows(state.fitIssues.filter((item) => fitSessionIds.has(item.fitSessionId))),
    fitSessionMedia: stableRows(state.fitSessionMedia.filter((item) => fitSessionIds.has(item.fitSessionId))),
    fitSessions: stableRows(state.fitSessions.filter((item) => roundIds.has(item.sampleRoundId))),
    inventoryEntries: stableRows(state.inventoryEntries.filter((item) => materialVariantIds.has(item.variantId))),
    productionMilestones: stableRows(state.productionMilestones.filter((item) => productionOrderIds.has(item.productionOrderId))),
    productionOrders: stableRows(state.productionOrders.filter((item) => item.garmentId === garmentId)),
    qcInspections: stableRows(state.qcInspections.filter((item) => productionOrderIds.has(item.productionOrderId))),
    qcResults: stableRows(state.qcResults.filter((item) => qcInspectionIds.has(item.inspectionId))),
    qcWaivers: stableRows(state.qcWaivers.filter((item) => qcInspectionIds.has(item.inspectionId))),
    releaseTasks: stableRows(state.releaseTasks.filter((item) => item.garmentId === garmentId)),
    sampleRoundMedia: stableRows(state.sampleRoundMedia.filter((item) => roundIds.has(item.sampleRoundId))),
    sampleRounds: stableRows(state.sampleRounds.filter((item) => item.garmentId === garmentId)),
  };
  if (scope === 'all' || scope === 'editorial') domains.editorial = {
    versionEditorial: stableRows(state.versionEditorial.filter((item) => item.garmentId === garmentId)),
  };
  if (scope === 'all' || scope === 'portfolio') domains.portfolio = {
    versionPortfolio: stableRows(state.versionPortfolio.filter((item) => item.garmentId === garmentId)),
  };

  return { domains, garment: clone(garment) as FreezeFrameSnapshot['garment'], schemaVersion: 1, scope };
}

export async function createFreezeFrame(state: CanonicalWorkspaceState, input: FreezeFrameInput) {
  const garment = requireGarment(state, input.garmentId);
  if (!input.actorId) throw new Error('Freeze Frame creation requires an actor.');
  if (!input.label.trim()) throw new Error('Freeze Frame label is required.');
  if (input.expectedRevision !== garment.revision) throw new Error(`Fresh garment revision required. Expected ${input.expectedRevision}, found ${garment.revision}.`);
  const snapshot = snapshotGarmentScope(state, input.garmentId, input.scope);
  const checksum = await checksumValue(snapshot);
  const versionNo = Math.max(0, ...state.garmentVersions.filter((item) => item.garmentId === garment.id).map((item) => item.versionNo)) + 1;
  const parent = currentVersion(state, garment.id);
  const version = frameRecord(state, {
    createdBy: input.actorId,
    baseRevision: garment.revision,
    checksum,
    garmentId: garment.id,
    kind: input.kind ?? 'named',
    label: input.label.trim(),
    notes: input.notes?.trim() ?? '',
    parentVersionId: parent?.id ?? null,
    scope: input.scope,
    snapshot,
    versionNo,
  });
  const entityRevisions = await revisionsForSnapshot(state, version, input.kind === 'restore' ? 'restore' : 'create');
  const operationId = input.operationId ?? crypto.randomUUID();
  const updatedGarment = touchRecord(garment);
  const event = changeEvent(state, {
    actorId: input.actorId,
    after: version,
    baseRevision: garment.revision,
    before: null,
    entityId: version.id,
    entityType: 'garment_version',
    garmentId: garment.id,
    operation: 'create',
    operationId,
    origin: input.kind === 'restore' ? 'restore' : 'user',
    resultRevision: updatedGarment.revision,
    scope: input.scope,
  });
  return {
    entityRevisions,
    event,
    state: {
      ...state,
      changeEvents: [...state.changeEvents, event],
      entityRevisions: [...state.entityRevisions, ...entityRevisions],
      garments: state.garments.map((item) => item.id === garment.id ? updatedGarment : item),
      garmentVersions: [...state.garmentVersions, version],
    },
    version,
  };
}

export function recordWorkspaceChangeEvents(before: CanonicalWorkspaceState, candidate: CanonicalWorkspaceState, context: WorkspaceChangeContext): CanonicalWorkspaceState {
  if (context.skipAutoLedger) return candidate;
  const operationId = context.operationId ?? crypto.randomUUID();
  const drafts: Array<Omit<Parameters<typeof changeEvent>[1], 'baseRevision' | 'resultRevision'>> = [];
  for (const descriptor of auditDescriptors()) {
    const beforeRows = descriptor.rows(before);
    const afterRows = descriptor.rows(candidate);
    const beforeMap = new Map(beforeRows.map((item) => [item.id, item]));
    const afterMap = new Map(afterRows.map((item) => [item.id, item]));
    for (const id of new Set([...beforeMap.keys(), ...afterMap.keys()])) {
      const previous = beforeMap.get(id) ?? null;
      const next = afterMap.get(id) ?? null;
      if (previous && next && stableStringify(stripMeta(previous)) === stableStringify(stripMeta(next))) continue;
      const garmentId = descriptor.garmentId(candidate, before, next ?? previous!);
      if (!garmentId) continue;
      drafts.push({
        actorId: context.actorId,
        after: next,
        before: previous,
        entityId: id,
        entityType: descriptor.entityType,
        garmentId,
        operation: previous ? next ? 'update' : 'delete' : 'create',
        operationId,
        origin: context.origin ?? 'user',
        scope: descriptor.scope,
      });
    }
  }
  if (!drafts.length) return candidate;
  const affected = new Set(drafts.map((draft) => draft.garmentId).filter((garmentId): garmentId is string => Boolean(garmentId)));
  const revisionByGarment = new Map<string, { base: number; result: number }>();
  const garments = candidate.garments.map((garment) => {
    if (!affected.has(garment.id)) return garment;
    const previous = before.garments.find((item) => item.id === garment.id);
    const base = previous?.revision ?? 0;
    const updated = garment.revision > base ? garment : touchRecord(garment);
    revisionByGarment.set(garment.id, { base, result: updated.revision });
    return updated;
  });
  for (const garmentId of affected) if (!revisionByGarment.has(garmentId)) {
    const previous = before.garments.find((item) => item.id === garmentId);
    revisionByGarment.set(garmentId, { base: previous?.revision ?? 0, result: (previous?.revision ?? 0) + 1 });
  }
  const events = drafts.map((draft) => {
    const garmentId = draft.garmentId!;
    const revision = revisionByGarment.get(garmentId)!;
    return changeEvent(candidate, { ...draft, garmentId, baseRevision: revision.base, resultRevision: revision.result });
  });
  return { ...candidate, garments, changeEvents: [...candidate.changeEvents, ...events] };
}

export function compareFreezeFrame(state: CanonicalWorkspaceState, sourceVersionId: string, targetVersionId?: string | null): StructuralDiff[] {
  const source = requireVersion(state, sourceVersionId);
  const sourceSnapshot = normalizeVersionSnapshot(source);
  const target = targetVersionId ? requireVersion(state, targetVersionId) : null;
  const targetSnapshot = target ? normalizeVersionSnapshot(target) : snapshotGarmentScope(state, source.garmentId, source.scope);
  const diffs: StructuralDiff[] = [];
  if (!sourceSnapshot.legacy && !targetSnapshot.legacy) diffRecordFields(diffs, source, target, source.scope, 'garments', sourceSnapshot.garment, targetSnapshot.garment, source.garmentId, state.garments.find((item) => item.id === source.garmentId)?.title ?? 'Garment');
  for (const domain of domainOrder) {
    const beforeDomain = sourceSnapshot.domains[domain] ?? {};
    const afterDomain = targetSnapshot.domains[domain] ?? {};
    for (const collection of new Set([...Object.keys(beforeDomain), ...Object.keys(afterDomain)])) {
      const beforeRows = beforeDomain[collection] ?? [];
      const afterRows = afterDomain[collection] ?? [];
      diffCollection(diffs, state, source, target, domain, collection, beforeRows, afterRows);
    }
  }
  return diffs.sort((a, b) => domainOrderIndex(a.domain) - domainOrderIndex(b.domain) || a.collection.localeCompare(b.collection) || a.entityLabel.localeCompare(b.entityLabel) || a.field.localeCompare(b.field));
}

export async function previewRestore(state: CanonicalWorkspaceState, input: Pick<RestoreCommitInput, 'garmentId' | 'scope' | 'selectedKeys' | 'sourceVersionId'>): Promise<RestorePreviewResult> {
  const source = requireVersion(state, input.sourceVersionId);
  if (source.garmentId !== input.garmentId) throw new Error('Restore source does not belong to this garment.');
  const candidates = compareFreezeFrame(state, input.sourceVersionId).filter((item) => item.restorable && scopeIncludes(input.scope, item.domain));
  const affected = input.selectedKeys.length ? candidates.filter((item) => input.selectedKeys.includes(item.key)) : candidates;
  const dependencies = versionDependencies(state, input.garmentId);
  const warnings = dependencyWarnings(state, affected, dependencies);
  const replayPatch = affected.map((item) => patchForDiff(item, true));
  const inversePatch = affected.map((item) => patchForDiff(item, false));
  const previewChecksum = await checksumValue({ affected: affected.map((item) => item.key), dependencies, replayPatch, sourceVersionId: source.id, warnings });
  return { affected, dependencies, inversePatch, previewChecksum, replayPatch, warnings };
}

export async function commitRestore(state: CanonicalWorkspaceState, input: RestoreCommitInput) {
  const garment = requireGarment(state, input.garmentId);
  assertFreshServerState({ actualRevision: garment.revision, expectedRevision: input.expectedRevision, hasConflicts: state.conflicts.some((item) => item.garmentId === garment.id && item.resolution === 'pending'), online: input.online });
  if (input.reason.trim().length < 8) throw new Error('Restore reason must explain the decision.');
  const preview = await previewRestore(state, input);
  if (!preview.affected.length) throw new Error('Select at least one restorable difference.');
  if (preview.previewChecksum !== input.previewChecksum) throw new Error('Restore preview is stale. Refresh the server state and review consequences again.');
  const operationId = input.operationId ?? crypto.randomUUID();
  let restored = state;
  for (const diff of preview.affected) restored = applyStructuralDiff(restored, diff);
  if (preview.affected.some((item) => item.domain === 'technical')) restored = supersedeReleasedWorkingSpec(restored, garment.id);
  const updatedGarment = touchRecord(requireGarment(restored, garment.id));
  restored = { ...restored, garments: restored.garments.map((item) => item.id === garment.id ? updatedGarment : item) };
  const source = requireVersion(state, input.sourceVersionId);
  const snapshot = snapshotGarmentScope(restored, garment.id, input.scope);
  const checksum = await checksumValue(snapshot);
  const versionNo = Math.max(0, ...state.garmentVersions.filter((item) => item.garmentId === garment.id).map((item) => item.versionNo)) + 1;
  const version = frameRecord(state, { createdBy: input.actorId, baseRevision: garment.revision, checksum, garmentId: garment.id, kind: 'restore', label: `Restore · ${source.label}`, notes: input.reason.trim(), parentVersionId: currentVersion(state, garment.id)?.id ?? null, scope: input.scope, snapshot, versionNo });
  const entityRevisions = await revisionsForSnapshot(state, version, 'restore');
  const now = new Date().toISOString();
  const restoreOperation = {
    actorId: input.actorId,
    baseRevision: garment.revision,
    createdAt: now,
    dependencies: preview.dependencies,
    garmentId: garment.id,
    id: operationId,
    inversePatch: preview.inversePatch,
    previewChecksum: preview.previewChecksum,
    reason: input.reason.trim(),
    replayPatch: preview.replayPatch,
    resultRevision: updatedGarment.revision,
    resultVersionId: version.id,
    revision: 1,
    scope: input.scope,
    selectedKeys: preview.affected.map((item) => item.key),
    selectedMeasurementKeys: preview.affected.filter((item) => item.collection === 'measurementValues').map((item) => item.entityId),
    selectedPomPointIds: preview.affected.filter((item) => item.collection === 'pomPoints').map((item) => item.entityId),
    sourceVersionId: source.id,
    studioId: state.studioId,
    updatedAt: now,
  };
  const events = preview.affected.map((diff) => changeEvent(state, { actorId: input.actorId, after: diff.before, baseRevision: garment.revision, before: diff.after, entityId: diff.entityId, entityType: diff.collection, garmentId: garment.id, operation: 'restore', operationId, origin: 'restore', resultRevision: updatedGarment.revision, scope: diff.domain }));
  events.push(changeEvent(state, { actorId: input.actorId, after: version, baseRevision: garment.revision, before: null, entityId: version.id, entityType: 'garment_version', garmentId: garment.id, operation: 'create', operationId, origin: 'restore', resultRevision: updatedGarment.revision, scope: input.scope }));
  const next = {
    ...restored,
    changeEvents: [...restored.changeEvents, ...events],
    entityRevisions: [...restored.entityRevisions, ...entityRevisions],
    garmentVersions: [...restored.garmentVersions, version],
    restoreOperations: [...restored.restoreOperations, restoreOperation],
  };
  return { entityRevisions, events, preview, restoreOperation, state: next, version };
}

export function assertFreshServerState(input: FreshServerState) {
  if (!input.online) throw new Error('Release, publish, and restore require an online server commit.');
  if (input.hasConflicts) throw new Error('Resolve all concurrent changes before this commit.');
  if (input.actualRevision !== input.expectedRevision) throw new Error(`Fresh server state is required. Expected revision ${input.expectedRevision}, found ${input.actualRevision}.`);
}

export function replayChangeLedger(events: CanonicalChangeEvent[]) {
  const entities = new Map<string, unknown>();
  for (const event of [...events].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.id.localeCompare(b.id))) applyLedgerPatch(entities, event.entityType, event.entityId, event.jsonPatch);
  return entities;
}

export function reverseReplayChangeLedger(events: CanonicalChangeEvent[]) {
  const entities = replayChangeLedger(events);
  for (const event of [...events].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id))) applyLedgerPatch(entities, event.entityType, event.entityId, event.inversePatch);
  return entities;
}

export function mergeScalarChanges(state: CanonicalWorkspaceState, input: { actorId: string; base: Record<string, unknown>; entityId: string; entityType: string; garmentId: string; local: Record<string, unknown>; localOperationId: string; remote: Record<string, unknown>; remoteOperationId: string }): ScalarMergeResult {
  const merged = { ...input.base };
  const conflicts: CanonicalConflict[] = [];
  for (const field of new Set([...Object.keys(input.local), ...Object.keys(input.remote)])) {
    const baseValue = input.base[field];
    const localValue = input.local[field];
    const remoteValue = input.remote[field];
    const localChanged = stableStringify(localValue) !== stableStringify(baseValue);
    const remoteChanged = stableStringify(remoteValue) !== stableStringify(baseValue);
    if (localChanged && remoteChanged && stableStringify(localValue) !== stableStringify(remoteValue)) {
      conflicts.push(conflictRecord(state, { ...input, baseValue, field, localValue, remoteValue }));
    } else merged[field] = localChanged ? localValue : remoteChanged ? remoteValue : baseValue;
  }
  const garment = requireGarment(state, input.garmentId);
  const event = conflicts.length ? null : changeEvent(state, {
    actorId: input.actorId,
    after: merged,
    baseRevision: garment.revision,
    before: input.base,
    entityId: input.entityId,
    entityType: input.entityType,
    garmentId: input.garmentId,
    operation: 'update',
    operationId: crypto.randomUUID(),
    origin: 'sync',
    relatedOperationIds: [input.localOperationId, input.remoteOperationId],
    resultRevision: garment.revision + 1,
    scope: 'all',
  });
  return { conflicts, event, merged };
}

export function resolveConflict(state: CanonicalWorkspaceState, conflictId: string, resolution: CanonicalConflict['resolution'], customValue?: unknown) {
  const conflict = state.conflicts.find((item) => item.id === conflictId);
  if (!conflict) throw new Error('Conflict not found.');
  if (resolution === 'pending') throw new Error('Choose local, remote, or a new value.');
  const resolvedValue = resolution === 'local' ? conflict.localValue : resolution === 'remote' ? conflict.remoteValue : customValue;
  return { ...state, conflicts: state.conflicts.map((item) => item.id === conflictId ? touchRecord({ ...item, resolution, resolvedValue }) : item) };
}

export function mergeOrderedChildren<T extends { id: string; sortOrder: number }>(base: T[], local: T[], remote: T[]) {
  const warnings: string[] = [];
  const baseMap = new Map(base.map((item) => [item.id, item]));
  const localMap = new Map(local.map((item) => [item.id, item]));
  const remoteMap = new Map(remote.map((item) => [item.id, item]));
  const items = [...new Set([...baseMap.keys(), ...localMap.keys(), ...remoteMap.keys()])].flatMap((id) => {
    const baseline = baseMap.get(id);
    const localItem = localMap.get(id);
    const remoteItem = remoteMap.get(id);
    if (!localItem && !remoteItem) return [];
    if (baseline && localItem && remoteItem && localItem.sortOrder !== baseline.sortOrder && remoteItem.sortOrder !== baseline.sortOrder && localItem.sortOrder !== remoteItem.sortOrder) warnings.push(`Ordered item ${id} moved differently on both devices.`);
    return [{ ...(localItem ?? remoteItem)!, fractionalSortKey: localItem?.sortOrder ?? remoteItem!.sortOrder }];
  }).sort((a, b) => a.fractionalSortKey - b.fractionalSortKey || a.id.localeCompare(b.id));
  return { items: items.map((item, index) => ({ ...item, fractionalSortKey: (index + 1) * 1024 })), warnings };
}

export function mergeMediaByChecksum<TAsset extends { checksum: string; id: string }, TRelation extends { assetId: string }>(assets: TAsset[], relationships: TRelation[]) {
  const canonicalByChecksum = new Map<string, TAsset>();
  const idMap = new Map<string, string>();
  for (const asset of assets) { const canonical = canonicalByChecksum.get(asset.checksum) ?? asset; canonicalByChecksum.set(asset.checksum, canonical); idMap.set(asset.id, canonical.id); }
  return { assets: [...canonicalByChecksum.values()], relationships: relationships.map((item) => ({ ...item, assetId: idMap.get(item.assetId) ?? item.assetId })) };
}

export function resolveDeleteEditConflict<T extends { id: string }>(edited: T, tombstone: { clientId: string; deletedAt: string }) {
  return { restoreAsNewRevision: { ...edited, id: crypto.randomUUID() }, tombstone, tombstoneWins: true };
}

export function deleteFreezeFrame(state: CanonicalWorkspaceState, versionId: string, actorId: string) {
  const version = requireVersion(state, versionId);
  const dependencies = versionDependencies(state, version.garmentId).filter((item) => item.versionId === version.id);
  if (version.kind === 'release' || dependencies.length || state.garmentVersions.some((item) => item.parentVersionId === version.id) || currentVersion(state, version.garmentId)?.id === version.id) throw new Error('Freeze Frame is protected by a release, export, order, publication, parent, or current-version relationship.');
  const event = changeEvent(state, { actorId, after: null, baseRevision: requireGarment(state, version.garmentId).revision, before: version, entityId: version.id, entityType: 'garment_version', garmentId: version.garmentId, operation: 'delete', operationId: crypto.randomUUID(), origin: 'user', resultRevision: requireGarment(state, version.garmentId).revision, scope: version.scope });
  return { ...state, changeEvents: [...state.changeEvents, event], entityRevisions: state.entityRevisions.filter((item) => item.garmentVersionId !== version.id), garmentVersions: state.garmentVersions.filter((item) => item.id !== version.id) };
}

export function versionDependencies(state: CanonicalWorkspaceState, garmentId: string): CanonicalVersionDependency[] {
  const specIds = new Set(state.technicalSpecs.filter((item) => item.garmentId === garmentId).map((item) => item.id));
  const derived: CanonicalVersionDependency[] = [
    ...state.technicalSpecs.filter((item) => item.garmentId === garmentId && item.releaseVersionId).map((item) => ({ artifactId: item.id, kind: 'release' as const, label: `Technical release ${item.revisionLabel}`, versionId: item.releaseVersionId! })),
    ...state.techPackExports.filter((item) => specIds.has(item.specId)).map((item) => ({ artifactId: item.id, kind: 'export' as const, label: item.deterministicFilename, versionId: item.garmentVersionId })),
    ...state.productionOrders.filter((item) => item.garmentId === garmentId).map((item) => ({ artifactId: item.id, kind: 'order' as const, label: `Production order ${item.orderCode}`, versionId: item.garmentVersionId })),
  ];
  return uniqueBy([...derived, ...state.versionDependencies], (item) => `${item.kind}:${item.artifactId}`);
}

export async function checksumValue(value: unknown) {
  const bytes = new TextEncoder().encode(stableStringify(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((item) => item.toString(16).padStart(2, '0')).join('');
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}

function auditDescriptors(): Array<{ entityType: string; garmentId: (after: CanonicalWorkspaceState, before: CanonicalWorkspaceState, row: CanonicalRecord) => string | null; rows: (state: CanonicalWorkspaceState) => CanonicalRecord[]; scope: FreezeFrameScope }> {
  const direct = (field: string) => (_after: CanonicalWorkspaceState, _before: CanonicalWorkspaceState, row: CanonicalRecord) => String((row as unknown as Record<string, unknown>)[field] ?? '') || null;
  const spec = (after: CanonicalWorkspaceState, before: CanonicalWorkspaceState, row: CanonicalRecord) => findBoth(after.technicalSpecs, before.technicalSpecs, String((row as unknown as Record<string, unknown>).specId))?.garmentId ?? null;
  const flat = (after: CanonicalWorkspaceState, before: CanonicalWorkspaceState, row: CanonicalRecord) => { const value = findBoth(after.technicalFlats, before.technicalFlats, String((row as unknown as Record<string, unknown>).flatId)); return value ? spec(after, before, { ...value, specId: value.specId } as unknown as CanonicalRecord) : null; };
  const set = (after: CanonicalWorkspaceState, before: CanonicalWorkspaceState, row: CanonicalRecord) => { const value = findBoth(after.measurementSets, before.measurementSets, String((row as unknown as Record<string, unknown>).setId)); return value ? spec(after, before, { ...value, specId: value.specId } as unknown as CanonicalRecord) : null; };
  const section = (after: CanonicalWorkspaceState, before: CanonicalWorkspaceState, row: CanonicalRecord) => { const value = findBoth(after.constructionSections, before.constructionSections, String((row as unknown as Record<string, unknown>).sectionId)); return value ? spec(after, before, { ...value, specId: value.specId } as unknown as CanonicalRecord) : null; };
  const step = (after: CanonicalWorkspaceState, before: CanonicalWorkspaceState, row: CanonicalRecord) => { const value = findBoth(after.constructionSteps, before.constructionSteps, String((row as unknown as Record<string, unknown>).stepId)); return value ? section(after, before, { ...value, sectionId: value.sectionId } as unknown as CanonicalRecord) : null; };
  const round = (after: CanonicalWorkspaceState, before: CanonicalWorkspaceState, row: CanonicalRecord) => findBoth(after.sampleRounds, before.sampleRounds, String((row as unknown as Record<string, unknown>).sampleRoundId))?.garmentId ?? null;
  const session = (after: CanonicalWorkspaceState, before: CanonicalWorkspaceState, row: CanonicalRecord) => { const value = findBoth(after.fitSessions, before.fitSessions, String((row as unknown as Record<string, unknown>).fitSessionId)); return value ? round(after, before, { ...value, sampleRoundId: value.sampleRoundId } as unknown as CanonicalRecord) : null; };
  const issue = (after: CanonicalWorkspaceState, before: CanonicalWorkspaceState, row: CanonicalRecord) => { const value = findBoth(after.fitIssues, before.fitIssues, String((row as unknown as Record<string, unknown>).fitIssueId)); return value ? session(after, before, { ...value, fitSessionId: value.fitSessionId } as unknown as CanonicalRecord) : null; };
  const costSheet = (after: CanonicalWorkspaceState, before: CanonicalWorkspaceState, row: CanonicalRecord) => findBoth(after.costSheets, before.costSheets, String((row as unknown as Record<string, unknown>).costSheetId))?.garmentId ?? null;
  const productionOrder = (after: CanonicalWorkspaceState, before: CanonicalWorkspaceState, row: CanonicalRecord) => findBoth(after.productionOrders, before.productionOrders, String((row as unknown as Record<string, unknown>).productionOrderId))?.garmentId ?? null;
  const qcInspection = (after: CanonicalWorkspaceState, before: CanonicalWorkspaceState, row: CanonicalRecord) => { const value = findBoth(after.qcInspections, before.qcInspections, String((row as unknown as Record<string, unknown>).inspectionId)); return value ? productionOrder(after, before, { ...value, productionOrderId: value.productionOrderId } as unknown as CanonicalRecord) : null; };
  return [
    { entityType: 'garment', garmentId: (_a, _b, row) => row.id, rows: (s) => s.garments, scope: 'all' },
    { entityType: 'design_brief', garmentId: direct('garmentId'), rows: (s) => s.designBriefs, scope: 'design' },
    { entityType: 'garment_media', garmentId: direct('garmentId'), rows: (s) => s.garmentMedia, scope: 'design' },
    { entityType: 'moodboard', garmentId: direct('garmentId'), rows: (s) => s.moodboards, scope: 'design' },
    { entityType: 'garment_material', garmentId: direct('garmentId'), rows: (s) => s.garmentMaterials, scope: 'design' },
    { entityType: 'garment_component', garmentId: direct('garmentId'), rows: (s) => s.garmentComponents, scope: 'design' },
    { entityType: 'technical_spec', garmentId: direct('garmentId'), rows: (s) => s.technicalSpecs, scope: 'technical' },
    { entityType: 'technical_flat', garmentId: spec, rows: (s) => s.technicalFlats, scope: 'technical' },
    { entityType: 'flat_annotation', garmentId: flat, rows: (s) => s.flatAnnotations, scope: 'technical' },
    { entityType: 'technical_file', garmentId: spec, rows: (s) => s.technicalFiles, scope: 'technical' },
    { entityType: 'pom_point', garmentId: spec, rows: (s) => s.pomPoints, scope: 'technical' },
    { entityType: 'measurement_set', garmentId: spec, rows: (s) => s.measurementSets, scope: 'technical' },
    { entityType: 'measurement_value', garmentId: set, rows: (s) => s.measurementValues, scope: 'technical' },
    { entityType: 'grade_rule', garmentId: spec, rows: (s) => s.gradeRules, scope: 'technical' },
    { entityType: 'bom_item', garmentId: spec, rows: (s) => s.bomItems, scope: 'technical' },
    { entityType: 'construction_section', garmentId: spec, rows: (s) => s.constructionSections, scope: 'technical' },
    { entityType: 'construction_step', garmentId: section, rows: (s) => s.constructionSteps, scope: 'technical' },
    { entityType: 'construction_detail', garmentId: step, rows: (s) => s.constructionDetails, scope: 'technical' },
    { entityType: 'sample_round', garmentId: direct('garmentId'), rows: (s) => s.sampleRounds, scope: 'production' },
    { entityType: 'sample_round_media', garmentId: round, rows: (s) => s.sampleRoundMedia, scope: 'production' },
    { entityType: 'fit_session', garmentId: round, rows: (s) => s.fitSessions, scope: 'production' },
    { entityType: 'fit_session_media', garmentId: session, rows: (s) => s.fitSessionMedia, scope: 'production' },
    { entityType: 'fit_issue', garmentId: session, rows: (s) => s.fitIssues, scope: 'production' },
    { entityType: 'fit_issue_promotion', garmentId: issue, rows: (s) => s.fitIssuePromotions, scope: 'production' },
    { entityType: 'fit_measurement', garmentId: round, rows: (s) => s.fitMeasurements, scope: 'production' },
    { entityType: 'cost_sheet', garmentId: direct('garmentId'), rows: (s) => s.costSheets, scope: 'production' },
    { entityType: 'cost_item', garmentId: costSheet, rows: (s) => s.costItems, scope: 'production' },
    { entityType: 'production_order', garmentId: direct('garmentId'), rows: (s) => s.productionOrders, scope: 'production' },
    { entityType: 'production_milestone', garmentId: productionOrder, rows: (s) => s.productionMilestones, scope: 'production' },
    { entityType: 'qc_inspection', garmentId: productionOrder, rows: (s) => s.qcInspections, scope: 'production' },
    { entityType: 'qc_result', garmentId: qcInspection, rows: (s) => s.qcResults, scope: 'production' },
    { entityType: 'qc_waiver', garmentId: qcInspection, rows: (s) => s.qcWaivers, scope: 'production' },
    { entityType: 'release_task', garmentId: direct('garmentId'), rows: (s) => s.releaseTasks, scope: 'production' },
    { entityType: 'editorial_collection', garmentId: direct('garmentId'), rows: (s) => s.versionEditorial, scope: 'editorial' },
    { entityType: 'portfolio_project', garmentId: direct('garmentId'), rows: (s) => s.versionPortfolio, scope: 'portfolio' },
    { entityType: 'garment_version', garmentId: direct('garmentId'), rows: (s) => s.garmentVersions, scope: 'all' },
  ];
}

function diffCollection(result: StructuralDiff[], state: CanonicalWorkspaceState, source: CanonicalGarmentVersion, target: CanonicalGarmentVersion | null, domain: FreezeFrameScope, collection: string, beforeRows: CanonicalRecord[], afterRows: CanonicalRecord[]) {
  const beforeMap = new Map(beforeRows.map((item) => [item.id, item]));
  const afterMap = new Map(afterRows.map((item) => [item.id, item]));
  for (const id of new Set([...beforeMap.keys(), ...afterMap.keys()])) {
    const before = beforeMap.get(id) ?? null;
    const after = afterMap.get(id) ?? null;
    const label = recordLabel(state, collection, before ?? after!);
    if (!before || !after) {
      result.push(diffEntry(source, target, domain, collection, id, label, '$record', before ? 'removed' : 'added', before, after));
      continue;
    }
    diffRecordFields(result, source, target, domain, collection, before, after, id, label);
  }
}

function diffRecordFields(result: StructuralDiff[], source: CanonicalGarmentVersion, target: CanonicalGarmentVersion | null, domain: FreezeFrameScope, collection: string, before: Record<string, unknown>, after: Record<string, unknown>, id: string, label: string) {
  for (const field of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (immutableMeta.has(field)) continue;
    if (stableStringify(before[field]) === stableStringify(after[field])) continue;
    const moved = (field === 'sortOrder' || field === 'stepNumber') && before[field] != null && after[field] != null;
    result.push(diffEntry(source, target, domain, collection, id, label, field, moved ? 'moved' : 'changed', before[field], after[field]));
  }
}

function diffEntry(source: CanonicalGarmentVersion, target: CanonicalGarmentVersion | null, domain: FreezeFrameScope, collection: string, entityId: string, entityLabel: string, field: string, kind: StructuralDiff['kind'], before: unknown, after: unknown): StructuralDiff {
  return {
    after,
    afterActorId: target?.createdBy ?? null,
    afterAt: target?.createdAt ?? 'Working state',
    before,
    beforeActorId: source.createdBy,
    beforeAt: source.createdAt,
    collection,
    domain,
    entityId,
    entityLabel,
    field,
    key: `${domain}:${collection}:${entityId}:${field}`,
    kind,
    restorable: !nonRestorableCollections.has(collection),
    warning: diffWarning(collection, field),
  };
}

function applyStructuralDiff(state: CanonicalWorkspaceState, diff: StructuralDiff): CanonicalWorkspaceState {
  const rows = (state as unknown as Record<string, unknown>)[diff.collection];
  if (!Array.isArray(rows)) return state;
  const records = rows as CanonicalRecord[];
  let next: CanonicalRecord[];
  if (diff.field === '$record') {
    if (diff.before == null) next = records.filter((item) => item.id !== diff.entityId);
    else {
      const restored = restoreRecord(diff.before as CanonicalRecord);
      next = [...records.filter((item) => item.id !== diff.entityId), restored];
    }
  } else next = records.map((item) => item.id === diff.entityId ? touchRecord({ ...item, [diff.field]: clone(diff.before) }) : item);
  return { ...state, [diff.collection]: next } as CanonicalWorkspaceState;
}

function supersedeReleasedWorkingSpec(state: CanonicalWorkspaceState, garmentId: string) {
  return { ...state, technicalSpecs: state.technicalSpecs.map((item) => item.garmentId === garmentId && item.status === 'released' ? touchRecord({ ...item, status: 'superseded' as const }) : item) };
}

function dependencyWarnings(state: CanonicalWorkspaceState, affected: StructuralDiff[], dependencies: CanonicalVersionDependency[]) {
  const warnings = dependencies.map((item) => `${title(item.kind)} “${item.label}” remains pinned to Freeze Frame ${item.versionId.slice(0, 8)} and will not change.`);
  if (affected.some((item) => item.collection === 'bomItems') && state.garmentMaterials.some((item) => item.reservedQuantity > 0)) warnings.push('BOM restore may change requirements while inventory reservations remain active.');
  if (affected.some((item) => item.domain === 'editorial' || item.domain === 'portfolio')) warnings.push('Published snapshots remain unchanged until an explicit fresh-state publish.');
  if (affected.some((item) => item.collection === 'mediaAssets')) warnings.push('Source assets are retained while any relationship still references their checksum.');
  if (affected.some((item) => item.collection === 'fitMeasurements')) warnings.push('Later sample actuals are evidence and are excluded from restore unless Production explicitly owns a future restore rule.');
  return [...new Set(warnings)];
}

function patchForDiff(diff: StructuralDiff, restore: boolean): CanonicalJsonPatch {
  const value = restore ? diff.before : diff.after;
  const path = `/${diff.collection}/${diff.entityId}${diff.field === '$record' ? '' : `/${diff.field}`}`;
  if (value == null) return { op: 'remove', path };
  return { op: diff.kind === 'added' && !restore || diff.kind === 'removed' && restore ? 'add' : 'replace', path, value: clone(value) };
}

function changeEvent(state: CanonicalWorkspaceState, input: { actorId: string | null; after: unknown; baseRevision: number | null; before: unknown; entityId: string; entityType: string; garmentId: string | null; operation: CanonicalChangeEvent['operation']; operationId: string; origin: CanonicalChangeEvent['origin']; relatedOperationIds?: string[]; resultRevision: number | null; scope: FreezeFrameScope }): CanonicalChangeEvent {
  const now = new Date().toISOString();
  return {
    actorId: input.actorId,
    baseRevision: input.baseRevision,
    createdAt: now,
    entityId: input.entityId,
    entityType: input.entityType,
    garmentId: input.garmentId,
    id: crypto.randomUUID(),
    inversePatch: rootPatch(input.after, input.before),
    jsonPatch: rootPatch(input.before, input.after),
    occurredAt: now,
    operation: input.operation,
    operationId: input.operationId,
    origin: input.origin,
    relatedOperationIds: input.relatedOperationIds ?? [],
    resultRevision: input.resultRevision,
    revision: 1,
    scope: input.scope,
    studioId: state.studioId,
    updatedAt: now,
  };
}

function rootPatch(before: unknown, after: unknown): CanonicalJsonPatch[] {
  if (after == null) return [{ op: 'remove', path: '/' }];
  return [{ op: before == null ? 'add' : 'replace', path: '/', value: clone(after) }];
}

function applyLedgerPatch(entities: Map<string, unknown>, entityType: string, entityId: string, patches: CanonicalJsonPatch[]) {
  const key = `${entityType}:${entityId}`;
  for (const patch of patches) {
    if (patch.path !== '/') continue;
    if (patch.op === 'remove') entities.delete(key); else entities.set(key, clone(patch.value));
  }
}

async function revisionsForSnapshot(state: CanonicalWorkspaceState, version: CanonicalGarmentVersion, operation: CanonicalEntityRevision['operation']) {
  const snapshot = version.snapshot as FreezeFrameSnapshot;
  const rows: Array<{ domain: FreezeFrameScope; entity: CanonicalRecord; entityType: string }> = [{ domain: version.scope, entity: snapshot.garment, entityType: 'garment' }];
  for (const domain of domainOrder) for (const [collection, records] of Object.entries(snapshot.domains[domain] ?? {})) for (const entity of records) rows.push({ domain, entity, entityType: collection });
  return Promise.all(rows.map(async ({ domain, entity, entityType }): Promise<CanonicalEntityRevision> => {
    const now = new Date().toISOString();
    return { checksum: await checksumValue(entity), createdAt: now, entityId: entity.id, entityType, garmentVersionId: version.id, id: crypto.randomUUID(), operation, revision: 1, scope: domain, snapshot: clone(entity) as Record<string, unknown>, studioId: state.studioId, updatedAt: now };
  }));
}

function frameRecord(state: CanonicalWorkspaceState, input: Omit<CanonicalGarmentVersion, keyof CanonicalRecord>): CanonicalGarmentVersion {
  const now = new Date().toISOString();
  return { ...input, createdAt: now, id: crypto.randomUUID(), revision: 1, studioId: state.studioId, updatedAt: now };
}

function conflictRecord(state: CanonicalWorkspaceState, input: { actorId: string; baseValue: unknown; entityId: string; entityType: string; field: string; garmentId: string; localOperationId: string; localValue: unknown; remoteOperationId: string; remoteValue: unknown }): CanonicalConflict {
  const now = new Date().toISOString();
  return { baseValue: input.baseValue, createdAt: now, entityId: input.entityId, entityType: input.entityType, field: input.field, garmentId: input.garmentId, id: crypto.randomUUID(), localOperationId: input.localOperationId, localValue: input.localValue, remoteOperationId: input.remoteOperationId, remoteValue: input.remoteValue, resolution: 'pending', revision: 1, studioId: state.studioId, updatedAt: now };
}

function currentVersion(state: CanonicalWorkspaceState, garmentId: string) { return state.garmentVersions.filter((item) => item.garmentId === garmentId).sort((a, b) => b.versionNo - a.versionNo)[0] ?? null; }
function requireGarment(state: CanonicalWorkspaceState, garmentId: string) { const garment = state.garments.find((item) => item.id === garmentId); if (!garment) throw new Error('Garment not found.'); return garment; }
function requireVersion(state: CanonicalWorkspaceState, versionId: string) { const version = state.garmentVersions.find((item) => item.id === versionId); if (!version) throw new Error('Freeze Frame not found.'); return version; }
function stableRows<T extends CanonicalRecord>(rows: T[]): T[] { return [...rows].map(clone).sort((a, b) => ('sortOrder' in a && 'sortOrder' in b ? Number(a.sortOrder) - Number(b.sortOrder) : 0) || a.id.localeCompare(b.id)); }
function stripMeta(value: CanonicalRecord) { const { createdAt: _createdAt, updatedAt: _updatedAt, revision: _revision, ...rest } = value; return rest; }
function touchRecord<T extends CanonicalRecord>(value: T): T { return { ...value, revision: value.revision + 1, updatedAt: new Date().toISOString() }; }
function restoreRecord<T extends CanonicalRecord>(value: T): T { return { ...clone(value), revision: value.revision + 1, updatedAt: new Date().toISOString() }; }
function clone<T>(value: T): T { return value == null ? value : structuredClone(value); }
function findBoth<T extends { id: string }>(after: T[], before: T[], id: string) { return after.find((item) => item.id === id) ?? before.find((item) => item.id === id); }
function scopeIncludes(scope: FreezeFrameScope, domain: FreezeFrameScope) { return scope === 'all' || domain === 'all' || scope === domain; }
function domainOrderIndex(domain: FreezeFrameScope) { return domain === 'all' ? -1 : domainOrder.indexOf(domain); }
function title(value: string) { return value ? value[0].toUpperCase() + value.slice(1) : value; }
function uniqueBy<T>(items: T[], key: (item: T) => string) { return [...new Map(items.map((item) => [key(item), item])).values()]; }
function recordLabel(_state: CanonicalWorkspaceState, collection: string, record: CanonicalRecord) { const value = record as unknown as Record<string, unknown>; return String(value.title ?? value.name ?? value.description ?? value.operation ?? value.code ?? `${collection} ${record.id.slice(0, 8)}`); }
function diffWarning(collection: string, field: string) {
  if (collection === 'bomItems' && ['substituteItemId', 'costImpact', 'quantity', 'placement', 'supplierItemId'].includes(field)) return 'Review reservations, supplier commitments, and open production work.';
  if (collection === 'constructionSteps' && ['sortOrder', 'stepNumber'].includes(field)) return 'Construction operation order will change.';
  if (collection === 'costSheets' || collection === 'costItems') return 'Review approved margin, supplier commitments, and pinned production orders.';
  if (collection === 'productionOrders') return 'Orders remain pinned to their released source and are never silently repointed.';
  if (collection === 'qcResults' || collection === 'qcWaivers') return 'Recorded inspection evidence and release decisions remain protected.';
  if (collection === 'mediaAssets' && field === 'checksum') return 'The source asset remains retained while referenced elsewhere.';
  if (collection === 'versionEditorial' && field === 'liveDataStaleness') return 'Published editorial snapshots remain unchanged until republished.';
  if (collection === 'versionPortfolio') return 'The Public Cut remains unchanged until explicit publish.';
  return undefined;
}

function normalizeVersionSnapshot(version: CanonicalGarmentVersion): FreezeFrameSnapshot {
  const snapshot = version.snapshot as Record<string, unknown>;
  if (snapshot.schemaVersion === 1 && snapshot.domains && snapshot.garment) return snapshot as FreezeFrameSnapshot;
  const technicalKeys = ['bomItems', 'constructionDetails', 'constructionSections', 'constructionSteps', 'flatAnnotations', 'gradeRuleValues', 'gradeRules', 'measurementSets', 'measurementValues', 'pomPoints', 'technicalFiles', 'technicalFlats'];
  const technical: SnapshotDomain = {};
  for (const key of technicalKeys) if (Array.isArray(snapshot[key])) technical[key] = clone(snapshot[key]) as CanonicalRecord[];
  if (snapshot.spec && typeof snapshot.spec === 'object') technical.technicalSpecs = [clone(snapshot.spec) as CanonicalRecord];
  const garment = snapshot.garment && typeof snapshot.garment === 'object'
    ? clone(snapshot.garment) as FreezeFrameSnapshot['garment']
    : { createdAt: version.createdAt, id: version.garmentId, revision: version.baseRevision, studioId: version.studioId, updatedAt: version.updatedAt };
  return { domains: { technical }, garment, legacy: true, schemaVersion: 1, scope: 'technical' };
}
