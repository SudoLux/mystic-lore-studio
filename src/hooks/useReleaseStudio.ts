import {
  addConstructionDetail,
  addConstructionStep,
  applyConstructionTemplate,
  captureConstructionTemplate,
  createBomItem,
  createConstructionSection,
  moveBomItem,
  moveConstructionSection,
  moveConstructionStep,
  releaseTechnicalSpec,
  setBomSubstitute,
  setConstructionDetailStatus,
  updateBomItem,
  type BomItemInput,
  type ConstructionDetailInput,
  type ConstructionStepInput,
  type ReleaseWaiverInput,
} from '../domains/technical';
import type { CanonicalBomItem, CanonicalConstructionDetail } from '../domains/workspace';
import { assertFreshServerState } from '../domains/versioning';
import { useCanonicalWorkspace } from './useCanonicalWorkspace';

export function useReleaseStudio() {
  const { commitWorkspace, currentActorId, state } = useCanonicalWorkspace();
  const createBom = (input: BomItemInput) => { let id = ''; commitWorkspace((current) => { const result = createBomItem(current, input); id = result.item.id; return result.state; }); return id; };
  const updateBom = (itemId: string, patch: Partial<Omit<CanonicalBomItem, 'id' | 'studioId' | 'createdAt' | 'updatedAt' | 'revision' | 'specId' | 'sortOrder'>>) => commitWorkspace((current) => updateBomItem(current, itemId, patch).state);
  const substituteBom = (itemId: string, substituteId: string | null, costImpact?: number) => commitWorkspace((current) => setBomSubstitute(current, itemId, substituteId, costImpact).state);
  const reorderBom = (itemId: string, direction: -1 | 1) => commitWorkspace((current) => moveBomItem(current, itemId, direction));
  const createSection = (specId: string, name: string) => { let id = ''; commitWorkspace((current) => { const result = createConstructionSection(current, specId, name); id = result.section.id; return result.state; }); return id; };
  const reorderSection = (sectionId: string, direction: -1 | 1) => commitWorkspace((current) => moveConstructionSection(current, sectionId, direction));
  const createStep = (sectionId: string, input: ConstructionStepInput) => { let id = ''; commitWorkspace((current) => { const result = addConstructionStep(current, sectionId, input); id = result.step.id; return result.state; }); return id; };
  const reorderStep = (stepId: string, direction: -1 | 1) => commitWorkspace((current) => moveConstructionStep(current, stepId, direction));
  const createDetail = (stepId: string, input: ConstructionDetailInput) => { let id = ''; commitWorkspace((current) => { const result = addConstructionDetail(current, stepId, input); id = result.detail.id; return result.state; }); return id; };
  const setDetailStatus = (detailId: string, status: CanonicalConstructionDetail['status']) => commitWorkspace((current) => setConstructionDetailStatus(current, detailId, status));
  const captureTemplate = (specId: string, name: string) => { let id = ''; commitWorkspace((current) => { const result = captureConstructionTemplate(current, specId, name); id = result.template.id; return result.state; }); return id; };
  const applyTemplate = (specId: string, templateId: string) => commitWorkspace((current) => applyConstructionTemplate(current, specId, templateId, currentActorId).state);
  const release = async (specId: string, templateId: string, checkpointLabel: string, waivers: ReleaseWaiverInput[]) => {
    if (!state) throw new Error('The workspace is not ready.');
    const spec = state.technicalSpecs.find((item) => item.id === specId);
    const garment = state.garments.find((item) => item.id === spec?.garmentId);
    if (!garment) throw new Error('The release garment is unavailable.');
    assertFreshServerState({
      actualRevision: garment.revision,
      expectedRevision: garment.revision,
      hasConflicts: state.conflicts.some((item) => item.garmentId === garment.id && item.resolution === 'pending'),
      online: navigator.onLine !== false,
    });
    const result = await releaseTechnicalSpec(state, { actorId: currentActorId, checkpointLabel, specId, templateId, waivers });
    commitWorkspace(() => result.state);
    return result;
  };
  return { applyTemplate, captureTemplate, createBom, createDetail, createSection, createStep, currentActorId, release, reorderBom, reorderSection, reorderStep, setDetailStatus, state, substituteBom, updateBom };
}
