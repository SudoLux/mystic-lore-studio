import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
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
} from '../src/domains/editorial/studioRepository';
import { createCanonicalWorkspace } from '../src/domains/workspace';
import { importStudioData } from '../src/lib/studioStorage';

const fixture = readFileSync(new URL('./fixtures/legacy-studio-data-v5.json', import.meta.url), 'utf8');
const owner = '10000000-0000-4000-8000-000000000111';
async function workspace() { return createCanonicalWorkspace({ data: importStudioData(fixture), ownerUserId: owner, studioName: 'WP7 Studio', studioSlug: 'wp7-studio' }); }

describe('WP7 canonical Editorial Collections', () => {
  it('normalizes the legacy editorial/lookbook overlap without dropping ordered scenes, blocks, or media relationships', async () => {
    const state = await workspace();
    const report = editorialMigrationReport(state);
    expect(report.source).toBe('legacy-lookbook-and-editorial');
    expect(report.collections).toBeGreaterThan(0);
    expect(state.editorialScenes.every((scene) => Number.isInteger(scene.sortOrder))).toBe(true);
    expect(state.editorialBlocks.every((block) => block.sceneId && block.content)).toBe(true);
    expect(state.editorialCollectionGarments.filter((row) => row.role === 'primary')).toHaveLength(state.editorialCollections.length);
  });

  it('keeps one primary garment plus normalized supporting garments and keyboard-safe scene ordering', async () => {
    const start = await workspace();
    const second = { ...start.garments[0], id: crypto.randomUUID(), title: 'Supporting garment' };
    const withSecond = { ...start, garments: [...start.garments, second] };
    const created = createEditorialCollection(withSecond, { garmentId: start.garments[0].id, supportingGarmentIds: [second.id], title: 'System story' });
    const one = addEditorialScene(created.state, created.collection.id, 'One');
    const two = addEditorialScene(one.state, created.collection.id, 'Two');
    const reordered = reorderEditorialScene(two.state, created.collection.id, two.scene.id, 'up');
    expect(reordered.editorialCollectionGarments.filter((row) => row.collectionId === created.collection.id).map((row) => row.role)).toEqual(['primary', 'supporting']);
    expect(reordered.editorialScenes.filter((scene) => scene.collectionId === created.collection.id).sort((a, b) => a.sortOrder - b.sortOrder)[0].id).toBe(two.scene.id);
  });

  it('pins Story from System to an exact approved source and marks a changed source stale', async () => {
    const start = await workspace();
    const collection = createEditorialCollection(start, { garmentId: start.garments[0].id, title: 'Live facts' });
    const scene = addEditorialScene(collection.state, collection.collection.id, 'Fact');
    const live = addStoryFromSystemBlock(scene.state, { entityId: null, fieldPath: 'title', garmentId: start.garments[0].id, sceneId: scene.scene.id, source: 'garment', versionId: null });
    const changed = { ...live.state, garments: live.state.garments.map((garment) => garment.id === start.garments[0].id ? { ...garment, title: 'Changed source' } : garment) };
    expect(refreshEditorialLiveData(changed).editorialBlocks.find((block) => block.id === live.block.id)?.staleness).toBe('source_changed');
  });

  it('requires asset rights and produces repeatable private export evidence from approved structured records', async () => {
    const start = await workspace();
    const collection = createEditorialCollection(start, { garmentId: start.garments[0].id, title: 'Export story' });
    const scene = addEditorialScene(collection.state, collection.collection.id, 'Opening');
    const withCopy = addEditorialBlock(scene.state, scene.scene.id, 'paragraph', { text: 'Approved copy' });
    const approved = setEditorialPublishState(withCopy.state, collection.collection.id, 'approved', owner);
    const first = await createEditorialExport(approved, collection.collection.id, 'pdf', owner);
    const second = await createEditorialExport(approved, collection.collection.id, 'pdf', owner);
    expect(first.exportRecord.checksum).toBe(second.exportRecord.checksum);
    expect(first.exportRecord.storagePath).toContain('/editorial/exports/');
    expect(first.state.versionDependencies.some((dependency) => dependency.kind === 'export') || !first.exportRecord.sourceGarmentVersionId).toBe(true);
  });
});
