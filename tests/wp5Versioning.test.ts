import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  assertFreshServerState,
  checksumValue,
  commitRestore,
  compareFreezeFrame,
  createFreezeFrame,
  deleteFreezeFrame,
  mergeMediaByChecksum,
  mergeOrderedChildren,
  mergeScalarChanges,
  previewRestore,
  recordWorkspaceChangeEvents,
  replayChangeLedger,
  resolveDeleteEditConflict,
  reverseReplayChangeLedger,
  snapshotGarmentScope,
} from '../src/domains/versioning';
import { createCanonicalWorkspace, updateBrief, type CanonicalRecord, type CanonicalWorkspaceState } from '../src/domains/workspace';
import { importStudioData } from '../src/lib/studioStorage';

const fixtureText = readFileSync(new URL('./fixtures/legacy-studio-data-v5.json', import.meta.url), 'utf8');
const actorId = '10000000-0000-4000-8000-000000000111';
async function workspace() { return createCanonicalWorkspace({ data: importStudioData(fixtureText), ownerUserId: actorId }); }

describe('WP5 append-only versioning and scoped restore', () => {
  it('captures deterministic named Freeze Frames with parent/current identity and entity checksums', async () => {
    const start = await workspace(); const garment = start.garments[0];
    const snapshot = snapshotGarmentScope(start, garment.id, 'all');
    expect(await checksumValue(snapshot)).toHaveLength(64);
    const first = await createFreezeFrame(start, { actorId, expectedRevision: garment.revision, garmentId: garment.id, label: 'Design review', scope: 'all' });
    const second = await createFreezeFrame(first.state, { actorId, expectedRevision: first.state.garments[0].revision, garmentId: garment.id, label: 'Technical handoff', scope: 'technical' });
    expect(first.version).toMatchObject({ baseRevision: garment.revision, createdBy: actorId, kind: 'named', parentVersionId: null, versionNo: 1 });
    expect(second.version.parentVersionId).toBe(first.version.id);
    expect(second.state.garments[0].revision).toBe(garment.revision + 2);
    expect(first.entityRevisions.every((item) => item.checksum.length === 64)).toBe(true);
    expect(first.event).toMatchObject({ actorId, operation: 'create', origin: 'user', garmentId: garment.id });
  });

  it('records high-value mutations with grouped replay and inverse evidence', async () => {
    const start = await workspace(); const garment = start.garments[0];
    const changed = updateBrief(start, garment.id, { intent: 'Refined market and silhouette intent' });
    const next = recordWorkspaceChangeEvents(start, changed, { actorId, operationId: '70000000-0000-4000-8000-000000000001', origin: 'user' });
    const event = next.changeEvents.find((item) => item.entityType === 'design_brief')!;
    expect(event).toMatchObject({ actorId, baseRevision: garment.revision, resultRevision: garment.revision + 1, operation: 'update', origin: 'user' });
    expect(event.jsonPatch[0]).toMatchObject({ op: 'replace', path: '/' });
    expect(replayChangeLedger([event]).get(`design_brief:${event.entityId}`)).toMatchObject({ intent: 'Refined market and silhouette intent' });
    expect(reverseReplayChangeLedger([event]).get(`design_brief:${event.entityId}`)).toMatchObject({ intent: start.designBriefs[0].intent });
  });

  it('understands ordered rows, BOM cost, media checksum, editorial staleness, and portfolio selection', async () => {
    const start = await workspace(); const garment = start.garments[0]; const now = '2026-08-25T12:00:00.000Z';
    const base = withVersioningRows(start, garment.id, now);
    const frozen = await createFreezeFrame(base, { actorId, expectedRevision: garment.revision, garmentId: garment.id, label: 'Cross-domain review', scope: 'all' });
    const candidate = {
      ...frozen.state,
      bomItems: frozen.state.bomItems.map((item) => ({ ...item, costImpact: 18, substituteItemId: 'offer-alt', revision: item.revision + 1 })),
      constructionSteps: frozen.state.constructionSteps.map((item) => ({ ...item, sortOrder: 2048, stepNumber: 2, revision: item.revision + 1 })),
      mediaAssets: frozen.state.mediaAssets.map((item, index) => index === 0 ? { ...item, checksum: 'f'.repeat(64), revision: item.revision + 1 } : item),
      versionEditorial: frozen.state.versionEditorial.map((item) => ({ ...item, liveDataStaleness: 'source_changed' as const, revision: item.revision + 1 })),
      versionPortfolio: frozen.state.versionPortfolio.map((item) => ({ ...item, selectedAssetIds: [], revision: item.revision + 1 })),
    };
    const diffs = compareFreezeFrame(candidate, frozen.version.id);
    expect(diffs.some((item) => item.collection === 'bomItems' && item.field === 'costImpact' && item.warning?.includes('supplier'))).toBe(true);
    expect(diffs.some((item) => item.collection === 'constructionSteps' && item.kind === 'moved')).toBe(true);
    expect(diffs.some((item) => item.collection === 'mediaAssets' && item.field === 'checksum' && !item.restorable)).toBe(true);
    expect(diffs.some((item) => item.collection === 'versionEditorial' && item.field === 'liveDataStaleness')).toBe(true);
    expect(diffs.some((item) => item.collection === 'versionPortfolio' && item.field === 'selectedAssetIds')).toBe(true);
  });

  it('previews consequences and restores selected structure as a new child without rewriting earlier history', async () => {
    const start = await workspace(); const garment = start.garments[0];
    const first = await createFreezeFrame(start, { actorId, expectedRevision: garment.revision, garmentId: garment.id, label: 'Approved brief', scope: 'design' });
    const edited = recordWorkspaceChangeEvents(first.state, updateBrief(first.state, garment.id, { intent: 'Experimental revision' }), { actorId });
    const second = await createFreezeFrame(edited, { actorId, expectedRevision: edited.garments.find((item) => item.id === garment.id)!.revision, garmentId: garment.id, label: 'Experimental brief', scope: 'design' });
    const withDependency = { ...second.state, versionDependencies: [{ artifactId: 'release-1', kind: 'release' as const, label: 'Factory release A', versionId: first.version.id }] };
    const diff = compareFreezeFrame(withDependency, first.version.id).find((item) => item.collection === 'designBriefs' && item.field === 'intent')!;
    const preview = await previewRestore(withDependency, { garmentId: garment.id, scope: 'design', selectedKeys: [diff.key], sourceVersionId: first.version.id });
    expect(preview.warnings.join(' ')).toMatch(/Factory release A.*will not change/);
    const restored = await commitRestore(withDependency, { actorId, expectedRevision: withDependency.garments.find((item) => item.id === garment.id)!.revision, garmentId: garment.id, online: true, previewChecksum: preview.previewChecksum, reason: 'Return to the approved brief direction', scope: 'design', selectedKeys: [diff.key], sourceVersionId: first.version.id });
    expect(restored.state.designBriefs[0].intent).toBe(start.designBriefs[0].intent);
    expect(restored.version).toMatchObject({ kind: 'restore', parentVersionId: second.version.id, versionNo: 3 });
    expect(restored.state.garmentVersions.find((item) => item.id === first.version.id)).toEqual(first.version);
    expect(restored.restoreOperation).toMatchObject({ sourceVersionId: first.version.id, resultVersionId: restored.version.id, selectedKeys: [diff.key] });
    expect(restored.state.versionDependencies[0].versionId).toBe(first.version.id);
  });

  it('requires fresh online state and blocks protected release frames', async () => {
    expect(() => assertFreshServerState({ actualRevision: 4, expectedRevision: 4, hasConflicts: false, online: false })).toThrow(/online/);
    expect(() => assertFreshServerState({ actualRevision: 5, expectedRevision: 4, hasConflicts: false, online: true })).toThrow(/Fresh server state/);
    expect(() => assertFreshServerState({ actualRevision: 4, expectedRevision: 4, hasConflicts: true, online: true })).toThrow(/concurrent/);
    const start = await workspace(); const garment = start.garments[0];
    const released = await createFreezeFrame(start, { actorId, expectedRevision: garment.revision, garmentId: garment.id, kind: 'release', label: 'Factory release', scope: 'technical' });
    expect(() => deleteFreezeFrame(released.state, released.version.id, actorId)).toThrow(/protected/);
  });

  it('applies page-33 conflict rules for scalar fields, ordered children, media, and tombstones', async () => {
    const state = await workspace(); const garment = state.garments[0];
    const different = mergeScalarChanges(state, { actorId, base: { title: 'A', phase: 'concept' }, entityId: garment.id, entityType: 'garment', garmentId: garment.id, local: { title: 'B', phase: 'concept' }, localOperationId: 'local', remote: { title: 'A', phase: 'development' }, remoteOperationId: 'remote' });
    expect(different.conflicts).toHaveLength(0); expect(different.merged).toEqual({ title: 'B', phase: 'development' });
    expect(different.event).toMatchObject({ origin: 'sync', relatedOperationIds: ['local', 'remote'] });
    const same = mergeScalarChanges(state, { actorId, base: { title: 'A' }, entityId: garment.id, entityType: 'garment', garmentId: garment.id, local: { title: 'B' }, localOperationId: 'local', remote: { title: 'C' }, remoteOperationId: 'remote' });
    expect(same.conflicts[0]).toMatchObject({ baseValue: 'A', localValue: 'B', remoteValue: 'C', resolution: 'pending' }); expect(same.event).toBeNull();
    const ordered = mergeOrderedChildren([{ id: 'a', sortOrder: 1 }], [{ id: 'a', sortOrder: 2 }], [{ id: 'a', sortOrder: 3 }]);
    expect(ordered.warnings[0]).toMatch(/moved differently/); expect(ordered.items[0].fractionalSortKey).toBe(1024);
    const media = mergeMediaByChecksum([{ id: 'a', checksum: 'same' }, { id: 'b', checksum: 'same' }], [{ assetId: 'b', role: 'hero' }]);
    expect(media.assets).toHaveLength(1); expect(media.relationships[0]).toMatchObject({ assetId: 'a', role: 'hero' });
    const tombstone = resolveDeleteEditConflict({ id: 'old', title: 'edited' }, { clientId: 'device-a', deletedAt: '2026-08-25T00:00:00Z' });
    expect(tombstone.tombstoneWins).toBe(true); expect(tombstone.restoreAsNewRevision.id).not.toBe('old');
  });
});

function baseRecord(studioId: string, id: string, now: string): CanonicalRecord { return { createdAt: now, id, revision: 1, studioId, updatedAt: now }; }
function withVersioningRows(state: CanonicalWorkspaceState, garmentId: string, now: string): CanonicalWorkspaceState {
  const specId = '81000000-0000-4000-8000-000000000001'; const sectionId = '82000000-0000-4000-8000-000000000001';
  return {
    ...state,
    technicalSpecs: [...state.technicalSpecs, { ...baseRecord(state.studioId, specId, now), baseSize: 'M', garmentId, releaseValidationRunId: null, releaseVersionId: null, releasedAt: null, releasedBy: null, revisionLabel: 'A', status: 'draft', unit: 'cm' }],
    bomItems: [{ ...baseRecord(state.studioId, '83000000-0000-4000-8000-000000000001', now), componentVariantId: null, costImpact: 0, currency: 'USD', description: 'Custom label', intentionalFreeText: true, itemType: 'custom', materialVariantId: null, placement: 'Inside neck', quantity: 1, shortageQuantity: 0, sortOrder: 0, specId, status: 'approved', substituteItemId: null, supplierItemId: null, unit: 'piece', unitCost: 2 }],
    constructionSections: [{ ...baseRecord(state.studioId, sectionId, now), name: 'Assembly', sortOrder: 0, specId, status: 'draft' }],
    constructionSteps: [{ ...baseRecord(state.studioId, '84000000-0000-4000-8000-000000000001', now), machine: 'Single needle', machineRequired: true, operation: 'Close side seams', seamAllowance: 1, sectionId, sortOrder: 1024, status: 'ready', stepNumber: 1, stitchRequired: true, stitchSpec: '301' }],
    versionEditorial: [{ ...baseRecord(state.studioId, '85000000-0000-4000-8000-000000000001', now), garmentId, liveDataStaleness: 'current', sortOrder: 0, title: 'Atelier Notes' }],
    versionPortfolio: [{ ...baseRecord(state.studioId, '86000000-0000-4000-8000-000000000001', now), caseStudy: 'Development story', garmentId, selectedAssetIds: state.mediaAssets.slice(0, 1).map((item) => item.id), sortOrder: 0, visibility: 'ready' }],
  };
}
