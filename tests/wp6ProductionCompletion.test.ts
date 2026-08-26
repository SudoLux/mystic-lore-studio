import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  addCostItem,
  addProductionMilestone,
  approveCostSheet,
  calculateCostScenario,
  createCostSheet,
  createFactory,
  createProductionOrder,
  createQcTemplate,
  decideQcInspection,
  isProductionOrderStale,
  productionTimeline,
  recordQcResult,
  setCostSheetScenario,
  startQcInspection,
  updateProductionOrderStatus,
  updateProductionMilestone,
  waiveQcResult,
} from '../src/domains/production';
import { recordWorkspaceChangeEvents, versionDependencies } from '../src/domains/versioning';
import { createCanonicalWorkspace, type CanonicalTechnicalSpec, type CanonicalWorkspaceState } from '../src/domains/workspace';
import { createFreezeFrame } from '../src/domains/versioning';
import { importStudioData } from '../src/lib/studioStorage';

const fixtureText = readFileSync(new URL('./fixtures/legacy-studio-data-v5.json', import.meta.url), 'utf8');
const actorId = '10000000-0000-4000-8000-000000000111';
async function workspace() { return createCanonicalWorkspace({ data: importStudioData(fixtureText), ownerUserId: actorId }); }

describe('WP6 quantity costing, pinned orders, QC, and timeline', () => {
  it('calculates quantity scenarios, fixed order costs, waste, COGS, wholesale, and margin at four decimals', () => {
    const items = [
      { basis: 'per_unit', total: 12.3457 },
      { basis: 'per_order', total: 100 },
    ] as Parameters<typeof calculateCostScenario>[0];
    expect(calculateCostScenario(items, 100, 25)).toEqual({ calculatedTotal: 1334.57, cogsPerUnit: 13.3457, marginPercent: 46.6172, wholesaleUnitPrice: 25 });
    expect(() => calculateCostScenario(items, 0, 25)).toThrow(/positive whole number/);
    expect(() => calculateCostScenario(items, 100, -1)).toThrow(/non-negative/);
  });

  it('keeps exact ISO currency and recalculates material, trim, labor, overhead, and freight scenarios', async () => {
    const prepared = await releasedWorkspace();
    const created = createCostSheet(prepared.state, { currency: 'usd', garmentId: prepared.garmentId, garmentVersionId: prepared.versionId, name: '100 unit launch', quantityBasis: 100, wholesaleUnitPrice: 60 });
    let next = created.state;
    for (const [category, unitCost, wastePercent, basis] of [
      ['material', 10.005, 10, 'per_unit'], ['trim', 2.5, 0, 'per_unit'], ['labor', 8, 0, 'per_unit'], ['overhead', 200, 0, 'per_order'], ['freight', 100, 0, 'per_order'],
    ] as const) next = addCostItem(next, { basis, category, costSheetId: created.costSheet.id, description: category, quantity: 1, unitCost, wastePercent }).state;
    const sheet = next.costSheets.find((item) => item.id === created.costSheet.id)!;
    expect(sheet).toMatchObject({ calculatedTotal: 2450.55, cogsPerUnit: 24.5055, currency: 'USD', marginPercent: 59.1575 });
    expect(setCostSheetScenario(next, sheet.id, 250, 55).costSheet).toMatchObject({ calculatedTotal: 5676.375, cogsPerUnit: 22.7055, marginPercent: 58.7173 });
    expect(() => createCostSheet(prepared.state, { currency: '$', garmentId: prepared.garmentId, garmentVersionId: prepared.versionId, name: 'Bad', quantityBasis: 1, wholesaleUnitPrice: 1 })).toThrow(/ISO/);
    expect(() => addCostItem(next, { basis: 'per_unit', category: 'material', costSheetId: sheet.id, description: 'Bad waste', quantity: 1, unitCost: 1, wastePercent: 101 })).toThrow(/100/);
  });

  it('pins an order to an approved cost sheet and release, warns after a later version, and never repoints it', async () => {
    const prepared = await approvedSheet();
    const factory = createFactory(prepared.state, { capabilities: { cutAndSew: true }, leadTimeDays: 30, minimumOrderQuantity: 50, name: 'Order Factory', supplierId: null });
    const order = createProductionOrder(factory.state, actorId, { costSheetId: prepared.sheetId, factoryId: factory.factory.id, garmentId: prepared.garmentId, garmentVersionId: prepared.versionId, orderCode: 'ML-PO-001', quantity: 100, targetDeliveryDate: '2027-03-15' });
    const placed = updateProductionOrderStatus(order.state, order.productionOrder.id, 'placed');
    const milestone = addProductionMilestone(placed.state, { name: 'Cutting complete', productionOrderId: order.productionOrder.id, targetDate: '2027-02-01' });
    const completedMilestone = updateProductionMilestone(milestone.state, milestone.milestone.id, 'complete');
    expect(placed.productionOrder.garmentVersionId).toBe(prepared.versionId);
    expect(completedMilestone.milestone).toMatchObject({ completedAt: expect.any(String), status: 'complete' });
    expect(versionDependencies(completedMilestone.state, prepared.garmentId)).toContainEqual(expect.objectContaining({ artifactId: order.productionOrder.id, kind: 'order', versionId: prepared.versionId }));
    expect(() => updateProductionOrderStatus(order.state, order.productionOrder.id, 'shipped')).toThrow(/cannot move/);
    const garment = completedMilestone.state.garments.find((item) => item.id === prepared.garmentId)!;
    const later = await createFreezeFrame(completedMilestone.state, { actorId, expectedRevision: garment.revision, garmentId: garment.id, label: 'Later edit', scope: 'technical' });
    expect(isProductionOrderStale(later.state, order.productionOrder.id)).toBe(true);
    expect(later.state.productionOrders[0].garmentVersionId).toBe(prepared.versionId);
    expect(() => createProductionOrder(factory.state, actorId, { costSheetId: prepared.sheetId, factoryId: factory.factory.id, garmentId: prepared.garmentId, garmentVersionId: 'not-released', orderCode: 'ML-PO-002', quantity: 10 })).toThrow(/Freeze Frame|release/);
  });

  it('applies a versioned QC checklist, blocks failures, and records a waiver with actor, reason, time, rule, and task', async () => {
    const prepared = await orderedWorkspace();
    const template = createQcTemplate(prepared.state, { name: 'Final QC', checks: [{ checkCode: 'MEASURE', name: 'Measurements', severity: 'critical' }, { checkCode: 'SEAMS', name: 'Seams', severity: 'high' }] });
    const started = startQcInspection(template.state, { productionOrderId: prepared.orderId, templateId: template.template.id });
    const failed = recordQcResult(started.state, actorId, { notes: 'Chest exceeds tolerance.', qcResultId: started.results[0].id, result: 'fail' });
    const passed = recordQcResult(failed.state, actorId, { qcResultId: started.results[1].id, result: 'pass' });
    expect(() => decideQcInspection(passed.state, actorId, { decision: 'approve', inspectionId: started.inspection.id })).toThrow(/blocked/);
    const waived = waiveQcResult(passed.state, actorId, { followUpTaskTitle: 'Correct chest before reorder', qcResultId: started.results[0].id, reason: 'Accepted for photography units only.' });
    expect(waived.waiver).toMatchObject({ actorId, affectedCheckCode: 'MEASURE', followUpTaskId: waived.task.id, inspectionId: started.inspection.id, reason: 'Accepted for photography units only.' });
    const decided = decideQcInspection(waived.state, actorId, { decision: 'approve', inspectionId: started.inspection.id });
    expect(decided.inspection).toMatchObject({ releaseDecision: 'approve', status: 'decided' });
    expect(decided.productionOrder.status).toBe('closed');
  });

  it('integrates sample-to-QC chronology and records approval, status, and waiver mutations in the change ledger', async () => {
    const prepared = await orderedWorkspace();
    const milestone = addProductionMilestone(prepared.state, { name: 'Factory ex-date', productionOrderId: prepared.orderId, targetDate: '2027-02-20' });
    const template = createQcTemplate(milestone.state, { name: 'Inline QC', checks: [{ checkCode: 'FINISH', name: 'Finish', severity: 'medium' }] });
    const inspection = startQcInspection(template.state, { productionOrderId: prepared.orderId, templateId: template.template.id });
    const failed = recordQcResult(inspection.state, actorId, { qcResultId: inspection.results[0].id, result: 'fail' });
    const waived = waiveQcResult(failed.state, actorId, { followUpTaskTitle: 'Repair finish', qcResultId: inspection.results[0].id, reason: 'Repair approved before shipment.' });
    const audited = recordWorkspaceChangeEvents(failed.state, waived.state, { actorId });
    expect(audited.changeEvents.some((item) => item.entityType === 'qc_waiver' && item.actorId === actorId && item.origin === 'user')).toBe(true);
    expect(productionTimeline(audited, prepared.garmentId).map((item) => item.kind)).toEqual(expect.arrayContaining(['cost', 'order', 'milestone', 'qc']));
  });
});

async function releasedWorkspace() {
  const start = await workspace(); const garment = start.garments[0];
  const frozen = await createFreezeFrame(start, { actorId, expectedRevision: garment.revision, garmentId: garment.id, label: 'Production release', scope: 'all' });
  const now = '2026-08-26T12:00:00.000Z';
  const spec: CanonicalTechnicalSpec = { baseSize: 'M', createdAt: now, garmentId: garment.id, id: crypto.randomUUID(), releaseValidationRunId: crypto.randomUUID(), releaseVersionId: frozen.version.id, releasedAt: now, releasedBy: actorId, revision: 1, revisionLabel: 'PROD-A', status: 'released', studioId: frozen.state.studioId, unit: 'cm', updatedAt: now };
  return { garmentId: garment.id, state: { ...frozen.state, technicalSpecs: [...frozen.state.technicalSpecs, spec] }, versionId: frozen.version.id };
}

async function approvedSheet() {
  const prepared = await releasedWorkspace();
  const created = createCostSheet(prepared.state, { currency: 'USD', garmentId: prepared.garmentId, garmentVersionId: prepared.versionId, name: 'Approved 100', quantityBasis: 100, wholesaleUnitPrice: 50 });
  const item = addCostItem(created.state, { basis: 'per_unit', category: 'labor', costSheetId: created.costSheet.id, description: 'Cut and sew', quantity: 1, unitCost: 15 });
  const approved = approveCostSheet(item.state, actorId, created.costSheet.id);
  return { ...prepared, sheetId: created.costSheet.id, state: approved.state };
}

async function orderedWorkspace() {
  const prepared = await approvedSheet();
  const factory = createFactory(prepared.state, { capabilities: { cutAndSew: true }, leadTimeDays: 20, minimumOrderQuantity: 25, name: 'QC Factory', supplierId: null });
  const order = createProductionOrder(factory.state, actorId, { costSheetId: prepared.sheetId, factoryId: factory.factory.id, garmentId: prepared.garmentId, garmentVersionId: prepared.versionId, orderCode: `ML-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, quantity: 100 });
  return { ...prepared, orderId: order.productionOrder.id, state: order.state };
}
