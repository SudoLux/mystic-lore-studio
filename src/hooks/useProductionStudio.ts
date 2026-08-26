import {
  attachFitEvidence,
  attachSampleEvidence,
  addCostItem,
  addProductionMilestone,
  approveCostSheet,
  createFactory,
  createCostSheet,
  createFitIssue,
  createFitSession,
  createSampleRound,
  createSupplier,
  createProductionOrder,
  createQcTemplate,
  decideQcInspection,
  decideFitSession,
  promoteFitIssue,
  receiveSampleRound,
  recordQcResult,
  recordFitMeasurement,
  setCostSheetScenario,
  startQcInspection,
  updateEvidenceCaptureStatus,
  updateProductionOrderStatus,
  updateProductionMilestone,
  waiveQcResult,
  type PromotionInput,
} from '../domains/production';
import { storeProductionEvidence } from '../lib/productionEvidence';
import { useCanonicalWorkspace } from './useCanonicalWorkspace';
import type { CanonicalWorkspaceState } from '../domains/workspace';

export function useProductionStudio() {
  const { commitWorkspace, currentActorId, state } = useCanonicalWorkspace();
  const commit = <T extends { state: CanonicalWorkspaceState },>(operation: (current: CanonicalWorkspaceState) => T): T => {
    let result: T | undefined;
    commitWorkspace((current) => { const next = operation(current); result = next; return next.state; });
    if (!result) throw new Error('Production command did not produce a result.');
    return result;
  };
  const uploadEvidence = async (target: { id: string; type: 'sample' | 'session' }, file: File) => {
    if (!state) throw new Error('The production workspace is not ready.');
    const asset = await storeProductionEvidence(file, state.studioId);
    let evidenceId = '';
    commitWorkspace((current) => {
      const result = target.type === 'sample'
        ? attachSampleEvidence(current, { asset, sampleRoundId: target.id })
        : attachFitEvidence(current, { asset, fitSessionId: target.id });
      evidenceId = result.evidence.id;
      return result.state;
    });
    if (navigator.onLine !== false) commitWorkspace((current) => updateEvidenceCaptureStatus(current, { evidenceId, status: 'uploaded', target: target.type }));
    return evidenceId;
  };
  return {
    addCostItem: (input: Parameters<typeof addCostItem>[1]) => commit((current) => addCostItem(current, input)),
    addProductionMilestone: (input: Parameters<typeof addProductionMilestone>[1]) => commit((current) => addProductionMilestone(current, input)),
    approveCostSheet: (costSheetId: string) => commit((current) => approveCostSheet(current, currentActorId, costSheetId)),
    createFactory: (input: Parameters<typeof createFactory>[1]) => commit((current) => createFactory(current, input)),
    createCostSheet: (input: Parameters<typeof createCostSheet>[1]) => commit((current) => createCostSheet(current, input)),
    createFitIssue: (input: Parameters<typeof createFitIssue>[1]) => commit((current) => createFitIssue(current, input)),
    createFitSession: (input: Parameters<typeof createFitSession>[1]) => commit((current) => createFitSession(current, input)),
    createSampleRound: (input: Parameters<typeof createSampleRound>[1]) => commit((current) => createSampleRound(current, input)),
    createSupplier: (input: Parameters<typeof createSupplier>[1]) => commit((current) => createSupplier(current, input)),
    createProductionOrder: (input: Parameters<typeof createProductionOrder>[2]) => commit((current) => createProductionOrder(current, currentActorId, input)),
    createQcTemplate: (input: Parameters<typeof createQcTemplate>[1]) => commit((current) => createQcTemplate(current, input)),
    decideQcInspection: (input: Parameters<typeof decideQcInspection>[2]) => commit((current) => decideQcInspection(current, currentActorId, input)),
    decideFitSession: (input: Parameters<typeof decideFitSession>[1]) => commit((current) => decideFitSession(current, input)),
    promoteFitIssue: (input: PromotionInput) => commit((current) => promoteFitIssue(current, currentActorId, input)),
    receiveSampleRound: (sampleRoundId: string) => commit((current) => receiveSampleRound(current, sampleRoundId)),
    recordQcResult: (input: Parameters<typeof recordQcResult>[2]) => commit((current) => recordQcResult(current, currentActorId, input)),
    recordFitMeasurement: (input: Parameters<typeof recordFitMeasurement>[1]) => commit((current) => recordFitMeasurement(current, input)),
    setCostSheetScenario: (costSheetId: string, quantityBasis: number, wholesaleUnitPrice: number) => commit((current) => setCostSheetScenario(current, costSheetId, quantityBasis, wholesaleUnitPrice)),
    startQcInspection: (input: Parameters<typeof startQcInspection>[1]) => commit((current) => startQcInspection(current, input)),
    retryEvidence: (target: 'sample' | 'session', evidenceId: string) => commitWorkspace((current) => updateEvidenceCaptureStatus(current, { evidenceId, status: navigator.onLine === false ? 'queued' : 'uploaded', target })),
    state,
    updateProductionOrderStatus: (productionOrderId: string, status: Parameters<typeof updateProductionOrderStatus>[2]) => commit((current) => updateProductionOrderStatus(current, productionOrderId, status)),
    updateProductionMilestone: (milestoneId: string, status: Parameters<typeof updateProductionMilestone>[2]) => commit((current) => updateProductionMilestone(current, milestoneId, status)),
    uploadEvidence,
    waiveQcResult: (input: Parameters<typeof waiveQcResult>[2]) => commit((current) => waiveQcResult(current, currentActorId, input)),
  };
}
