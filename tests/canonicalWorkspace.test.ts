import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  addComponent,
  addGarment,
  addMaterial,
  attachInspirationReference,
  attachComponent,
  attachMoodboardItem,
  attachAsset,
  createMoodboard,
  attachMaterial,
  createCanonicalWorkspace,
  deleteGarment,
  MAX_INSPIRATION_FIELD_IMAGES,
  materialAvailableQuantity,
  recordInventory,
  removeInspirationReference,
  relationshipOptions,
  setMaterialVariantStatus,
  updateBrief,
} from '../src/domains/workspace';
import { createSeedStudioData, importStudioData } from '../src/lib/studioStorage';

const fixtureText = readFileSync(new URL('./fixtures/legacy-studio-data-v5.json', import.meta.url), 'utf8');
const OWNER_ID = '10000000-0000-4000-8000-000000000111';

async function workspace() {
  return createCanonicalWorkspace({
    data: importStudioData(fixtureText),
    ownerUserId: OWNER_ID,
    studioName: 'Example Mystic Lore Studio',
    studioSlug: 'example-mystic-lore-studio',
  });
}

describe('WP3 canonical garment workspace', () => {
  it('hydrates the first-run browser seed when the default portfolio timestamp is empty', async () => {
    const state = await createCanonicalWorkspace({
      data: createSeedStudioData(),
      ownerUserId: OWNER_ID,
      studioName: 'First-run Studio',
      studioSlug: 'first-run-studio',
    });
    expect(state.garments.length).toBeGreaterThan(0);
  });

  it('hydrates core garment, brief, media, material, and inventory relationships from the accepted migration graph', async () => {
    const state = await workspace();
    expect(state.garments).toHaveLength(1);
    expect(state.designBriefs).toHaveLength(1);
    expect(state.materials).toHaveLength(1);
    expect(state.materialVariants).toHaveLength(1);
    expect(state.garmentMaterials).toHaveLength(1);
    expect(state.mediaAssets).toHaveLength(1);
    expect(state.garmentMedia).toHaveLength(1);
    expect(state.garmentMaterials[0].garmentId).toBe(state.garments[0].id);
    expect(state.garmentMaterials[0].variantId).toBe(state.materialVariants[0].id);
  });

  it('keeps new garment intent in a one-to-one brief rather than copying fields onto the garment', async () => {
    const start = await workspace();
    const created = addGarment(start, { garmentType: 'Coat', phase: 'brief', status: 'draft', title: 'Ritual Coat' });
    const next = updateBrief(created.state, created.record.id, { intent: 'Protective ritual outerwear', keyFeatures: ['high collar'] });
    const garment = next.garments.find((item) => item.id === created.record.id)!;
    const brief = next.designBriefs.find((item) => item.garmentId === garment.id)!;
    expect(garment).not.toHaveProperty('intent');
    expect(brief.intent).toBe('Protective ritual outerwear');
    expect(brief.keyFeatures).toEqual(['high collar']);
  });

  it('uses reusable variants and relationships for material/component links with downstream visibility', async () => {
    const start = await workspace();
    const garment = addGarment(start, { garmentType: 'Vest', phase: 'design', status: 'active', title: 'Orbit Vest' });
    const material = addMaterial(garment.state, { category: 'Fabric', composition: 'Wool', name: 'Midnight wool' });
    const component = addComponent(material.state, { category: 'Hardware', name: 'Orb clasp' });
    const materialLinked = attachMaterial(component.state, garment.record.id, material.variant.id, 'Shell Fabric');
    const linked = attachComponent(materialLinked.state, garment.record.id, component.variant.id, 'Center front');
    expect(relationshipOptions(linked.state, 'material').find((item) => item.id === material.variant.id)?.inUseBy).toContain('Orbit Vest');
    expect(relationshipOptions(linked.state, 'component').find((item) => item.id === component.variant.id)?.inUseBy).toContain('Orbit Vest');
    expect(linked.state.garmentMaterials.every((item) => !('materialName' in item))).toBe(true);
  });

  it('derives inventory from immutable ledger events and validates positive quantities', async () => {
    const start = await workspace();
    const variant = start.materialVariants[0];
    const received = recordInventory(start, variant.id, 'receive', 12, 'PO 42');
    const reserved = recordInventory(received.state, variant.id, 'reserve', 3, 'Garment allocation');
    expect(materialAvailableQuantity(reserved.state, variant.id)).toBeGreaterThanOrEqual(9);
    expect(() => recordInventory(reserved.state, variant.id, 'receive', 0)).toThrow(/positive/);
  });

  it('archives a fabric without removing its garment or inventory evidence, and can restore it', async () => {
    const start = await workspace();
    const variant = start.materialVariants[0];
    const archived = setMaterialVariantStatus(start, variant.id, 'archived');
    expect(archived.materialVariants.find((item) => item.id === variant.id)?.status).toBe('archived');
    expect(archived.garmentMaterials.some((item) => item.variantId === variant.id)).toBe(true);
    expect(archived.inventoryEntries.some((item) => item.variantId === variant.id)).toBe(true);

    const restored = setMaterialVariantStatus(archived, variant.id, 'active');
    expect(restored.materialVariants.find((item) => item.id === variant.id)?.status).toBe('active');
  });

  it('uses one source asset through separate garment and moodboard relationships without duplicating rights', async () => {
    const start = await workspace();
    const garment = start.garments[0];
    const asset = start.mediaAssets[0];
    const board = createMoodboard(start, garment.id);
    const linked = attachAsset(board.state, garment.id, asset.id, 'reference');
    const moodboard = attachMoodboardItem(linked.state, board.board.id, asset.id, 'Shoulder architecture');
    expect(moodboard.state.mediaAssets).toHaveLength(1);
    expect(moodboard.state.garmentMedia).toContainEqual(expect.objectContaining({ assetId: asset.id, garmentId: garment.id }));
    expect(moodboard.state.moodboardItems).toContainEqual(expect.objectContaining({ assetId: asset.id, boardId: board.board.id }));
  });

  it('bounds the garment Inspiration Field at five references without changing the reusable moodboard schema', async () => {
    const start = await workspace();
    const garment = start.garments[0];
    const assets = Array.from({ length: MAX_INSPIRATION_FIELD_IMAGES + 1 }, (_, index) => ({
      ...start.mediaAssets[0],
      checksum: `inspiration-checksum-${index}`,
      id: `inspiration-asset-${index}`,
      storagePath: `studios/${start.studioId}/garments/${garment.id}/inspiration-${index}.jpg`,
    }));
    let next = { ...start, mediaAssets: assets };
    for (const asset of assets.slice(0, MAX_INSPIRATION_FIELD_IMAGES)) {
      next = attachInspirationReference(next, garment.id, asset.id).state;
    }
    expect(next.moodboardItems).toHaveLength(MAX_INSPIRATION_FIELD_IMAGES);
    expect(() => attachInspirationReference(next, garment.id, assets[MAX_INSPIRATION_FIELD_IMAGES].id)).toThrow(/holds up to 5 images/);
  });

  it('removes an Inspiration Field relationship without deleting the private source asset', async () => {
    const start = await workspace();
    const garment = start.garments[0];
    const asset = start.mediaAssets[0];
    const first = attachInspirationReference(start, garment.id, asset.id);
    const secondAsset = {
      ...asset,
      checksum: 'second-inspiration-checksum',
      id: 'second-inspiration-asset',
      storagePath: `studios/${start.studioId}/garments/${garment.id}/second-inspiration.jpg`,
    };
    const second = attachInspirationReference({ ...first.state, mediaAssets: [...first.state.mediaAssets, secondAsset] }, garment.id, secondAsset.id);
    const removed = removeInspirationReference(second.state, garment.id, first.item.id);
    expect(removed.mediaAssets.some((candidate) => candidate.id === asset.id)).toBe(true);
    expect(removed.moodboardItems.some((candidate) => candidate.id === first.item.id)).toBe(false);
    expect(removed.garmentMedia.some((candidate) => candidate.assetId === asset.id && candidate.role === 'reference')).toBe(false);
    expect(removed.moodboardItems.find((candidate) => candidate.id === second.item.id)?.sortOrder).toBe(0);
  });

  it('removes a garment and only its dependent relationship records after explicit confirmation at the UI layer', async () => {
    const start = await workspace();
    const garmentId = start.garments[0].id;
    const next = deleteGarment(start, garmentId);
    expect(next.garments).toHaveLength(0);
    expect(next.designBriefs).toHaveLength(0);
    expect(next.garmentMaterials).toHaveLength(0);
    expect(next.materials).toHaveLength(1);
  });
});
