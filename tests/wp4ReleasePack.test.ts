import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  addConstructionDetail,
  addConstructionStep,
  applyConstructionTemplate,
  approveFlat,
  captureConstructionTemplate,
  createBomItem,
  createConstructionSection,
  duplicateConstructionSection,
  duplicateConstructionStep,
  createMeasurementSet,
  createPomPoint,
  createSpec,
  generateDeterministicTechPack,
  moveConstructionStep,
  moveConstructionSection,
  moveConstructionStepToSection,
  removeConstructionSection,
  removeConstructionStep,
  removeBomItem,
  registerFlat,
  releaseTechnicalSpec,
  setBomSubstitute,
  updateConstructionStep,
  upsertMeasurementValue,
  validateRelease,
} from '../src/domains/technical';
import { createCanonicalWorkspace, type CanonicalMaterial, type CanonicalMaterialVariant, type CanonicalMediaAsset, type CanonicalTemplate, type CanonicalWorkspaceState } from '../src/domains/workspace';
import { importStudioData } from '../src/lib/studioStorage';

const fixtureText = readFileSync(new URL('./fixtures/legacy-studio-data-v5.json', import.meta.url), 'utf8');
const actorId = '10000000-0000-4000-8000-000000000111';

async function baseWorkspace() {
  const migrated = await createCanonicalWorkspace({ data: importStudioData(fixtureText), ownerUserId: actorId });
  const spec = createSpec(migrated, migrated.garments[0].id, 'M', 'cm');
  return ensureMaterial({ state: spec.state, specId: spec.spec.id, garmentId: migrated.garments[0].id });
}

async function releaseReadyWorkspace() {
  let seeded = await baseWorkspace();
  let state = seeded.state;
  for (const [view, checksum] of [['front', 'a'.repeat(64)], ['back', 'b'.repeat(64)]] as const) {
    const asset = sourceAsset(state.studioId, `${view}.png`, checksum);
    const registered = registerFlat({ ...state, mediaAssets: [...state.mediaAssets, asset] }, seeded.specId, asset.id, view, 'R1');
    state = approveFlat(registered.state, registered.flat.id, actorId);
  }
  const pom = createPomPoint(state, { type: 'create_pom', specId: seeded.specId, code: 'CBL', name: 'Center-back length', method: 'Neck seam straight to hem', anchor: { x: .5, y: .4 } });
  const set = createMeasurementSet(pom.state, seeded.specId, 'Base', 'base');
  const measured = upsertMeasurementValue(set.state, { type: 'upsert_measurement', setId: set.set.id, pomPointId: pom.point.id, size: 'M', target: 72.25, tolerancePlus: .5, toleranceMinus: .25 });
  const bom = createBomItem(measured.state, { specId: seeded.specId, itemType: 'material_variant', materialVariantId: seeded.materialVariantId, description: 'Shell fabric', quantity: 2.25, unit: 'm', placement: 'Main shell', status: 'approved' });
  const section = createConstructionSection(bom.state, seeded.specId, 'Shell assembly');
  const step = addConstructionStep(section.state, section.section.id, { operation: 'Join shoulder seams', machine: 'Single-needle lockstitch', machineRequired: true, stitchSpec: '301 lockstitch · 10 SPI', stitchRequired: true, seamAllowance: 1, status: 'ready' });
  const now = '2026-08-25T00:00:00.000Z';
  const template: CanonicalTemplate = { createdAt: now, id: crypto.randomUUID(), revision: 1, studioId: state.studioId, updatedAt: now, name: 'Complete tech pack', payload: { sections: ['overview', 'flats', 'pom_measurements', 'bom', 'construction', 'grading_files'] }, status: 'active', templateType: 'tech_pack', version: 2 };
  return { ...seeded, state: { ...step.state, templates: [...step.state.templates, template] }, templateId: template.id, pomId: pom.point.id, bomId: bom.item.id, stepId: step.step.id };
}

describe('WP4 BOM, construction, release, and deterministic tech pack', () => {
  it('rejects missing canonical links and incompatible units while accepting explicit free text', async () => {
    const start = await baseWorkspace();
    expect(() => createBomItem(start.state, { specId: start.specId, itemType: 'material_variant', materialVariantId: null, description: 'Missing shell', quantity: 1, unit: 'm', placement: 'Shell' })).toThrow(/material variant/);
    expect(() => createBomItem(start.state, { specId: start.specId, itemType: 'material_variant', materialVariantId: start.materialVariantId, description: 'Wrong unit', quantity: 1, unit: 'pair', placement: 'Shell' })).toThrow(/not valid/);
    expect(() => createBomItem(start.state, { specId: start.specId, itemType: 'custom', description: 'Custom thread', intentionalFreeText: false, quantity: 1, unit: 'roll', placement: 'Assembly' })).toThrow(/explicitly marked/);
    const custom = createBomItem(start.state, { specId: start.specId, itemType: 'custom', description: 'Custom hand-dyed thread', intentionalFreeText: true, quantity: 1, unit: 'roll', placement: 'Topstitch', status: 'approved' });
    expect(custom.item).toMatchObject({ intentionalFreeText: true, materialVariantId: null, componentVariantId: null });
  });

  it('records substitutes, shortages, and signed cost impact against stable BOM rows', async () => {
    const start = await baseWorkspace();
    const primary = createBomItem(start.state, { specId: start.specId, itemType: 'custom', description: 'Primary button', intentionalFreeText: true, quantity: 6, unit: 'each', placement: 'Center front', shortageQuantity: 2, status: 'shortage' });
    const alternate = createBomItem(primary.state, { specId: start.specId, itemType: 'custom', description: 'Alternate button', intentionalFreeText: true, quantity: 6, unit: 'each', placement: 'Center front', status: 'approved' });
    const substituted = setBomSubstitute(alternate.state, primary.item.id, alternate.item.id, 4.5);
    expect(substituted.item).toMatchObject({ id: primary.item.id, substituteItemId: alternate.item.id, status: 'substituted', costImpact: 4.5 });
  });

  it('removes only a garment BOM row, compacts order, and protects active substitute links', async () => {
    const start = await baseWorkspace();
    const first = createBomItem(start.state, { specId: start.specId, itemType: 'custom', description: 'Shell button', intentionalFreeText: true, quantity: 6, unit: 'each', placement: 'Center front', status: 'approved' });
    const second = createBomItem(first.state, { specId: start.specId, itemType: 'custom', description: 'Spare button', intentionalFreeText: true, quantity: 1, unit: 'each', placement: 'Packaging', status: 'approved' });
    const linked = setBomSubstitute(second.state, first.item.id, second.item.id);
    expect(() => removeBomItem(linked.state, second.item.id)).toThrow(/approved substitute/);
    const removed = removeBomItem(linked.state, first.item.id);
    expect(removed.state.bomItems.find((item) => item.id === first.item.id)).toBeUndefined();
    expect(removed.state.bomItems.find((item) => item.id === second.item.id)).toMatchObject({ sortOrder: 0 });
  });

  it('reorders construction by stable identity and copies templates without later silent rewrites', async () => {
    const start = await baseWorkspace();
    const section = createConstructionSection(start.state, start.specId, 'Assembly');
    const finishing = createConstructionSection(section.state, start.specId, 'Finishing');
    const movedSections = moveConstructionSection(finishing.state, finishing.section.id, -1);
    expect(movedSections.constructionSections.filter((item) => item.specId === start.specId).sort((a, b) => a.sortOrder - b.sortOrder).map((item) => item.id)).toEqual([finishing.section.id, section.section.id]);
    const first = addConstructionStep(movedSections, section.section.id, { operation: 'Staystitch neckline', machine: 'Single needle', stitchSpec: '301', status: 'ready' });
    const second = addConstructionStep(first.state, section.section.id, { operation: 'Close shoulder', machine: 'Single needle', stitchSpec: '301', status: 'ready' });
    const third = addConstructionStep(second.state, section.section.id, { operation: 'Set sleeve', machine: 'Single needle', stitchSpec: '301', status: 'ready' });
    const detail = addConstructionDetail(third.state, third.step.id, { callout: 'Ease sleeve cap between notches', anchor: { x: .55, y: .3 }, severity: 'warning' });
    const moved = moveConstructionStep(detail.state, third.step.id, -1);
    expect(moved.constructionSteps.filter((item) => item.sectionId === section.section.id).sort((a, b) => a.sortOrder - b.sortOrder).map((item) => item.id)).toEqual([first.step.id, third.step.id, second.step.id]);
    const captured = captureConstructionTemplate(moved, start.specId, 'Jacket assembly');
    const applied = applyConstructionTemplate(captured.state, start.specId, captured.template.id, actorId);
    const copiedStepId = applied.application.mapping.copiedIds.find((id) => applied.state.constructionSteps.some((step) => step.id === id))!;
    const copiedOperation = applied.state.constructionSteps.find((item) => item.id === copiedStepId)!.operation;
    captured.template.payload = { sections: [{ name: 'Changed later', steps: [] }] };
    expect(applied.state.constructionSteps.find((item) => item.id === copiedStepId)?.operation).toBe(copiedOperation);
    expect(applied.application.mapping.sourceVersion).toBe(1);
  });

  it('keeps construction edits, duplicates, cross-section moves, and removals garment-owned', async () => {
    const start = await baseWorkspace();
    const body = createConstructionSection(start.state, start.specId, 'Body assembly');
    const collar = createConstructionSection(body.state, start.specId, 'Collar construction');
    const first = addConstructionStep(collar.state, body.section.id, { operation: 'Join shoulders', machine: 'Single needle', machineRequired: true, stitchSpec: '301', stitchRequired: true, seamAllowance: .5, status: 'ready' });
    const edited = updateConstructionStep(first.state, first.step.id, { operation: 'Join shoulder seams', machine: 'Single needle', machineRequired: true, stitchSpec: '301 Lockstitch', stitchRequired: true, seamAllowance: .5, status: 'approved' });
    expect(edited.step).toMatchObject({ operation: 'Join shoulder seams', status: 'approved' });
    const duplicate = duplicateConstructionStep(edited.state, first.step.id);
    expect(duplicate.step.id).not.toBe(first.step.id);
    const moved = moveConstructionStepToSection(duplicate.state, duplicate.step.id, collar.section.id);
    expect(moved.constructionSteps.find((step) => step.id === duplicate.step.id)?.sectionId).toBe(collar.section.id);
    const removedStep = removeConstructionStep(moved, first.step.id);
    expect(removedStep.state.constructionSteps.some((step) => step.id === first.step.id)).toBe(false);
    const copiedSection = duplicateConstructionSection(removedStep.state, collar.section.id);
    expect(copiedSection.section.id).not.toBe(collar.section.id);
    const removedSection = removeConstructionSection(copiedSection.state, collar.section.id);
    expect(removedSection.state.constructionSections.some((section) => section.id === collar.section.id)).toBe(false);
  });

  it('requires audited warning waivers and rejects privacy waivers', async () => {
    const ready = await releaseReadyWorkspace();
    const shortageState = { ...ready.state, bomItems: ready.state.bomItems.map((item) => item.id === ready.bomId ? { ...item, status: 'shortage' as const, shortageQuantity: .5 } : item) };
    const preview = validateRelease(shortageState, ready.specId, { checkpointLabel: 'Release A', templateId: ready.templateId });
    expect(preview.waivable.map((item) => item.code)).toContain('bom.shortage');
    const released = await releaseTechnicalSpec(shortageState, { actorId, checkpointLabel: 'Release A', specId: ready.specId, templateId: ready.templateId, waivers: [{ ruleCode: 'bom.shortage', reason: 'Temporary shortage approved for proto release.', followUpTaskTitle: 'Resolve shell shortage before production' }] });
    expect(released.waivers[0]).toMatchObject({ actorId, ruleCode: 'bom.shortage', followUpTaskId: released.tasks[0].id });
    expect(released.run.status).toBe('warning');

    const sourceAssetId = ready.state.technicalFiles[0].assetId;
    const privateFailure = { ...ready.state, mediaAssets: ready.state.mediaAssets.map((asset) => asset.id === sourceAssetId ? { ...asset, rights: {} } : asset) };
    await expect(releaseTechnicalSpec(privateFailure, { actorId, checkpointLabel: 'Release privacy', specId: ready.specId, templateId: ready.templateId, waivers: [{ ruleCode: 'privacy.source_rights_missing', reason: 'Attempted privacy bypass is forbidden.', followUpTaskTitle: 'Add provenance' }] })).rejects.toThrow(/cannot be waived/);
  });

  it('repeats deterministic structured export bytes from the same approved version', async () => {
    const ready = await releaseReadyWorkspace();
    expect(validateRelease(ready.state, ready.specId, { checkpointLabel: 'Release approved', templateId: ready.templateId }).issues).toEqual([]);
    const released = await releaseTechnicalSpec(ready.state, { actorId, checkpointLabel: 'Release approved', specId: ready.specId, templateId: ready.templateId, waivers: [] });
    const loadSource = async (assetId: string) => new TextEncoder().encode(`source-bytes:${assetId}`);
    const first = await generateDeterministicTechPack(released.state, ready.specId, released.version.id, ready.templateId, loadSource);
    const second = await generateDeterministicTechPack(released.state, ready.specId, released.version.id, ready.templateId, loadSource);
    expect(first.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(second.checksum).toBe(first.checksum);
    expect(Array.from(second.bytes)).toEqual(Array.from(first.bytes));
    expect(first.sectionManifest.map((item) => item.id)).toEqual(['overview', 'flats', 'pom_measurements', 'bom', 'construction', 'grading_files']);
    expect(released.state.technicalSpecs.find((item) => item.id === ready.specId)).toMatchObject({ status: 'released', releaseVersionId: released.version.id, releaseValidationRunId: released.run.id });
  });
});

function ensureMaterial(seed: { state: CanonicalWorkspaceState; specId: string; garmentId: string }) {
  if (seed.state.materialVariants[0]) return { ...seed, materialVariantId: seed.state.materialVariants[0].id };
  const now = '2026-08-25T00:00:00.000Z';
  const material: CanonicalMaterial = { createdAt: now, id: crypto.randomUUID(), revision: 1, studioId: seed.state.studioId, updatedAt: now, category: 'woven', composition: '100% wool', materialCode: 'MAT-001', name: 'Wool twill', status: 'active' };
  const variant: CanonicalMaterialVariant = { createdAt: now, id: crypto.randomUUID(), revision: 1, studioId: seed.state.studioId, updatedAt: now, colorHex: '#111111', colorName: 'Black', materialId: material.id, sku: 'WT-BLK', status: 'active', weightGsm: 320, width: 150, widthUnit: 'cm' };
  return { ...seed, state: { ...seed.state, materials: [...seed.state.materials, material], materialVariants: [...seed.state.materialVariants, variant] }, materialVariantId: variant.id };
}

function sourceAsset(studioId: string, name: string, checksum: string): CanonicalMediaAsset {
  const now = '2026-08-25T00:00:00.000Z';
  return { createdAt: now, id: crypto.randomUUID(), revision: 1, studioId, updatedAt: now, checksum, height: 1200, localBlobKey: `technical-source:${name}`, mimeType: 'image/png', name, rights: { source: 'approved studio technical source' }, sizeBytes: 100, storagePath: `studios/${studioId}/technical/sources/${name}`, storageState: 'stored', width: 900 };
}
