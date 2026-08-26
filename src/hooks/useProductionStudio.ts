import {
  attachFitEvidence,
  attachSampleEvidence,
  createFactory,
  createFitIssue,
  createFitSession,
  createSampleRound,
  createSupplier,
  decideFitSession,
  promoteFitIssue,
  receiveSampleRound,
  recordFitMeasurement,
  updateEvidenceCaptureStatus,
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
    createFactory: (input: Parameters<typeof createFactory>[1]) => commit((current) => createFactory(current, input)),
    createFitIssue: (input: Parameters<typeof createFitIssue>[1]) => commit((current) => createFitIssue(current, input)),
    createFitSession: (input: Parameters<typeof createFitSession>[1]) => commit((current) => createFitSession(current, input)),
    createSampleRound: (input: Parameters<typeof createSampleRound>[1]) => commit((current) => createSampleRound(current, input)),
    createSupplier: (input: Parameters<typeof createSupplier>[1]) => commit((current) => createSupplier(current, input)),
    decideFitSession: (input: Parameters<typeof decideFitSession>[1]) => commit((current) => decideFitSession(current, input)),
    promoteFitIssue: (input: PromotionInput) => commit((current) => promoteFitIssue(current, currentActorId, input)),
    receiveSampleRound: (sampleRoundId: string) => commit((current) => receiveSampleRound(current, sampleRoundId)),
    recordFitMeasurement: (input: Parameters<typeof recordFitMeasurement>[1]) => commit((current) => recordFitMeasurement(current, input)),
    retryEvidence: (target: 'sample' | 'session', evidenceId: string) => commitWorkspace((current) => updateEvidenceCaptureStatus(current, { evidenceId, status: navigator.onLine === false ? 'queued' : 'uploaded', target })),
    state,
    uploadEvidence,
  };
}
