import type {
  CanonicalEditorialBlock,
  CanonicalEditorialCollection,
  CanonicalEditorialCollectionGarment,
  CanonicalEditorialExport,
  CanonicalEditorialScene,
  CanonicalWorkspaceState,
  EditorialLiveSource,
} from '../workspace/contracts';
import { normalizeWorkspace } from '../workspace/workspaceStore';

const now = () => new Date().toISOString();
const record = (studioId: string) => ({ createdAt: now(), id: crypto.randomUUID(), revision: 1, studioId, updatedAt: now() });
const touch = <T extends { revision: number; updatedAt: string }>(value: T): T => ({ ...value, revision: value.revision + 1, updatedAt: now() });
const stable = (value: unknown): string => JSON.stringify(value, (_key, candidate) => candidate && typeof candidate === 'object' && !Array.isArray(candidate) ? Object.fromEntries(Object.entries(candidate).sort(([a], [b]) => a.localeCompare(b))) : candidate);

export type EditorialMigrationReport = { collections: number; blocks: number; scenes: number; source: 'legacy-lookbook-and-editorial'; warnings: string[] };
export function editorialMigrationReport(state: CanonicalWorkspaceState): EditorialMigrationReport {
  return { blocks: state.editorialBlocks.length, collections: state.editorialCollections.length, scenes: state.editorialScenes.length, source: 'legacy-lookbook-and-editorial', warnings: state.editorialCollections.filter((collection) => !collection.primaryGarmentId).map((collection) => `Collection ${collection.id} has no primary garment.`) };
}

export function createEditorialCollection(state: CanonicalWorkspaceState, input: { garmentId: string; title: string; templateType?: string; supportingGarmentIds?: string[] }): { collection: CanonicalEditorialCollection; state: CanonicalWorkspaceState } {
  if (!state.garments.some((garment) => garment.id === input.garmentId)) throw new Error('Choose a canonical garment before creating an editorial collection.');
  const collection: CanonicalEditorialCollection = { ...record(state.studioId), approvedAt: null, approvedBy: null, description: '', exportSettings: {}, primaryGarmentId: input.garmentId, primaryGarmentVersionId: null, publishedAt: null, publishedBy: null, status: 'draft', subtitle: '', templateType: input.templateType ?? 'fashion-editorial', themeId: null, title: input.title.trim() || 'Untitled collection', transition: {} };
  const related: CanonicalEditorialCollectionGarment[] = [{ ...record(state.studioId), collectionId: collection.id, garmentId: input.garmentId, role: 'primary', sortOrder: 0 }];
  for (const [index, garmentId] of [...new Set(input.supportingGarmentIds ?? [])].filter((value) => value !== input.garmentId).entries()) {
    if (!state.garments.some((garment) => garment.id === garmentId)) throw new Error('Supporting garments must belong to this studio.');
    related.push({ ...record(state.studioId), collectionId: collection.id, garmentId, role: 'supporting', sortOrder: index + 1 });
  }
  return { collection, state: normalizeWorkspace({ ...state, editorialCollectionGarments: [...state.editorialCollectionGarments, ...related], editorialCollections: [...state.editorialCollections, collection] }) };
}

export function addEditorialScene(state: CanonicalWorkspaceState, collectionId: string, title = 'New scene'): { scene: CanonicalEditorialScene; state: CanonicalWorkspaceState } {
  const collection = state.editorialCollections.find((item) => item.id === collectionId);
  if (!collection) throw new Error('Editorial collection not found.');
  if (collection.status === 'published') throw new Error('Published collections require an explicit revision before editing.');
  const scene: CanonicalEditorialScene = { ...record(state.studioId), background: {}, collectionId, description: '', narrativeRole: 'supporting', sceneType: 'story', sortOrder: state.editorialScenes.filter((item) => item.collectionId === collectionId).length, subtitle: '', title, transition: { type: 'fade' } };
  return { scene, state: normalizeWorkspace({ ...state, editorialCollections: state.editorialCollections.map((item) => item.id === collectionId ? touch(item) : item), editorialScenes: [...state.editorialScenes, scene] }) };
}

export function reorderEditorialScene(state: CanonicalWorkspaceState, collectionId: string, sceneId: string, direction: 'up' | 'down') {
  const scenes = state.editorialScenes.filter((scene) => scene.collectionId === collectionId).sort((a, b) => a.sortOrder - b.sortOrder);
  const index = scenes.findIndex((scene) => scene.id === sceneId);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= scenes.length) return state;
  [scenes[index], scenes[target]] = [scenes[target], scenes[index]];
  const order = new Map(scenes.map((scene, sortOrder) => [scene.id, sortOrder]));
  return normalizeWorkspace({ ...state, editorialScenes: state.editorialScenes.map((scene) => order.has(scene.id) ? touch({ ...scene, sortOrder: order.get(scene.id)! }) : scene) });
}

export function addEditorialBlock(state: CanonicalWorkspaceState, sceneId: string, blockType: string, content: Record<string, unknown> = {}): { block: CanonicalEditorialBlock; state: CanonicalWorkspaceState } {
  if (!state.editorialScenes.some((scene) => scene.id === sceneId)) throw new Error('Editorial scene not found.');
  const block: CanonicalEditorialBlock = { ...record(state.studioId), aiArtifactId: null, blockType, content, liveSource: null, sceneId, settings: {}, sortOrder: state.editorialBlocks.filter((item) => item.sceneId === sceneId).length, sourceChecksum: null, sourceEntityId: null, sourceFieldPath: null, sourceGarmentId: null, sourceVersionId: null, staleness: 'current' };
  return { block, state: normalizeWorkspace({ ...state, editorialBlocks: [...state.editorialBlocks, block] }) };
}

type LiveDataInput = { sceneId: string; source: EditorialLiveSource; garmentId: string; versionId: string | null; entityId: string | null; fieldPath: string; label?: string };
export function addStoryFromSystemBlock(state: CanonicalWorkspaceState, input: LiveDataInput): { block: CanonicalEditorialBlock; state: CanonicalWorkspaceState } {
  const collectionId = state.editorialScenes.find((scene) => scene.id === input.sceneId)?.collectionId;
  const collection = state.editorialCollections.find((item) => item.id === collectionId);
  const allowed = collection && state.editorialCollectionGarments.some((row) => row.collectionId === collection.id && row.garmentId === input.garmentId);
  if (!allowed) throw new Error('Story from System can only reference the primary or a supporting garment.');
  const value = readApprovedFact(state, input);
  if (value === undefined) throw new Error('Story from System requires an approved, version-pinned garment fact.');
  const result = addEditorialBlock(state, input.sceneId, 'live-data', { label: input.label ?? input.fieldPath, value });
  const sourceChecksum = checksum(stable({ fieldPath: input.fieldPath, value, versionId: input.versionId }));
  const block = { ...result.block, liveSource: input.source, sourceChecksum, sourceEntityId: input.entityId, sourceFieldPath: input.fieldPath, sourceGarmentId: input.garmentId, sourceVersionId: input.versionId, staleness: 'current' as const };
  return { block, state: normalizeWorkspace({ ...result.state, editorialBlocks: result.state.editorialBlocks.map((item) => item.id === block.id ? block : item) }) };
}

export function refreshEditorialLiveData(state: CanonicalWorkspaceState): CanonicalWorkspaceState {
  return normalizeWorkspace({ ...state, editorialBlocks: state.editorialBlocks.map((block) => {
    if (!block.liveSource || !block.sourceFieldPath || !block.sourceGarmentId) return block;
    const value = readApprovedFact(state, { entityId: block.sourceEntityId, fieldPath: block.sourceFieldPath, garmentId: block.sourceGarmentId, source: block.liveSource, versionId: block.sourceVersionId });
    const expected = value === undefined ? null : checksum(stable({ fieldPath: block.sourceFieldPath, value, versionId: block.sourceVersionId }));
    return block.sourceChecksum === expected ? block : touch({ ...block, staleness: expected ? 'source_changed' : 'missing_source' });
  }) });
}

export async function createEditorialExport(state: CanonicalWorkspaceState, collectionId: string, format: CanonicalEditorialExport['format'], _actorId: string): Promise<{ exportRecord: CanonicalEditorialExport; state: CanonicalWorkspaceState }> {
  const collection = state.editorialCollections.find((item) => item.id === collectionId);
  if (!collection) throw new Error('Editorial collection not found.');
  if (!['approved', 'ready', 'published'].includes(collection.status)) throw new Error('Approve the collection before creating an export.');
  const checked = refreshEditorialLiveData(state);
  if (checked.editorialBlocks.some((block) => checked.editorialScenes.some((scene) => scene.id === block.sceneId && scene.collectionId === collectionId) && block.staleness !== 'current')) throw new Error('Refresh or resolve stale Story from System blocks before export.');
  const assets = checked.editorialAssets.filter((asset) => asset.collectionId === collectionId);
  for (const asset of assets) { const source = checked.mediaAssets.find((item) => item.id === asset.assetId); if (!source?.rights?.license) throw new Error(`Asset rights are required before export: ${source?.name ?? asset.assetId}.`); }
  const manifest = { assets: assets.map((asset) => ({ assetId: asset.assetId, role: asset.role, usage: asset.usage })).sort((a, b) => a.assetId.localeCompare(b.assetId)), blocks: checked.editorialBlocks.filter((block) => checked.editorialScenes.some((scene) => scene.id === block.sceneId && scene.collectionId === collectionId)).sort((a, b) => a.sortOrder - b.sortOrder), collection, scenes: checked.editorialScenes.filter((scene) => scene.collectionId === collectionId).sort((a, b) => a.sortOrder - b.sortOrder) };
  const checksumValue = await sha256(stable(manifest));
  const generatedAt = now();
  const exportRecord: CanonicalEditorialExport = { ...record(checked.studioId), approvedAt: null, approvedBy: null, checksum: checksumValue, collectionId, collectionRevision: collection.revision, format, generatedAt, manifest, sourceGarmentVersionId: collection.primaryGarmentVersionId, storagePath: `studios/${checked.studioId}/editorial/exports/${collectionId}/${format}-${checksumValue.slice(0, 12)}.${format === 'pdf' ? 'pdf' : 'png'}` };
  return { exportRecord, state: normalizeWorkspace({ ...checked, editorialExports: [...checked.editorialExports, exportRecord], versionDependencies: collection.primaryGarmentVersionId ? [...checked.versionDependencies, { artifactId: exportRecord.id, kind: 'export', label: collection.title, versionId: collection.primaryGarmentVersionId }] : checked.versionDependencies }) };
}

export function setEditorialPublishState(state: CanonicalWorkspaceState, collectionId: string, status: 'approved' | 'published', actorId: string) {
  const nowValue = now();
  return normalizeWorkspace({ ...state, editorialCollections: state.editorialCollections.map((collection) => collection.id !== collectionId ? collection : touch({ ...collection, approvedAt: status === 'approved' ? nowValue : collection.approvedAt, approvedBy: status === 'approved' ? actorId : collection.approvedBy, publishedAt: status === 'published' ? nowValue : collection.publishedAt, publishedBy: status === 'published' ? actorId : collection.publishedBy, status })) });
}

function readApprovedFact(state: CanonicalWorkspaceState, input: Pick<LiveDataInput, 'source' | 'garmentId' | 'versionId' | 'entityId' | 'fieldPath'>): unknown {
  if (input.versionId && !state.garmentVersions.some((version) => version.id === input.versionId && version.garmentId === input.garmentId)) return undefined;
  const source = input.source === 'garment' ? state.garments.find((item) => item.id === input.garmentId) : input.source === 'design_brief' ? state.designBriefs.find((item) => item.garmentId === input.garmentId) : input.source === 'technical_spec' ? state.technicalSpecs.find((item) => item.garmentId === input.garmentId && ['approved', 'released'].includes(item.status)) : input.source === 'garment_version' ? state.garmentVersions.find((item) => item.id === input.versionId) : input.source === 'measurement_set' ? state.measurementSets.find((item) => item.id === input.entityId && item.status === 'approved') : input.source === 'construction_step' ? state.constructionSteps.find((item) => item.id === input.entityId && item.status === 'approved') : undefined;
  if (!source) return undefined;
  return input.fieldPath.split('.').reduce<unknown>((value, key) => value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined, source);
}

function checksum(value: string) { let hash = 2166136261; for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619); return (`0000000${(hash >>> 0).toString(16)}`).slice(-8); }
async function sha256(value: string) { if (globalThis.crypto?.subtle) return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map((byte) => byte.toString(16).padStart(2, '0')).join(''); return checksum(value); }
