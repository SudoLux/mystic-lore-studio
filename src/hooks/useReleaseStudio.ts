import {
  addConstructionDetail,
  addConstructionStep,
  applyConstructionTemplate,
  captureConstructionTemplate,
  createBomItem,
  createConstructionSection,
  duplicateConstructionSection,
  duplicateConstructionStep,
  moveBomItem,
  removeBomItem,
  moveConstructionSection,
  moveConstructionStep,
  moveConstructionStepToSection,
  removeConstructionSection,
  removeConstructionStep,
  releaseTechnicalSpec,
  setBomSubstitute,
  setConstructionDetailStatus,
  updateBomItem,
  updateConstructionSection,
  updateConstructionStep,
  type BomItemInput,
  type ConstructionDetailInput,
  type ConstructionStepInput,
  type ReleaseWaiverInput,
} from '../domains/technical';
import type { CanonicalBomItem, CanonicalConstructionDetail } from '../domains/workspace';
import { assertFreshServerState } from '../domains/versioning';
import { releaseTechnicalSpecCommand } from '../domains/persistence';
import { useCanonicalWorkspace } from './useCanonicalWorkspace';

export function useReleaseStudio() {
  const { commitWorkspace, currentActorId, requireFreshWorkspace, state } = useCanonicalWorkspace();
  const createBom = (input: BomItemInput) => { let id = ''; commitWorkspace((current) => { const result = createBomItem(current, input); id = result.item.id; return result.state; }); return id; };
  const updateBom = (itemId: string, patch: Partial<Omit<CanonicalBomItem, 'id' | 'studioId' | 'createdAt' | 'updatedAt' | 'revision' | 'specId' | 'sortOrder'>>) => commitWorkspace((current) => updateBomItem(current, itemId, patch).state);
  const substituteBom = (itemId: string, substituteId: string | null, costImpact?: number) => commitWorkspace((current) => setBomSubstitute(current, itemId, substituteId, costImpact).state);
  const reorderBom = (itemId: string, direction: -1 | 1) => commitWorkspace((current) => moveBomItem(current, itemId, direction));
  const removeBom = (itemId: string) => commitWorkspace((current) => removeBomItem(current, itemId).state);
  const createSection = (specId: string, name: string) => { let id = ''; commitWorkspace((current) => { const result = createConstructionSection(current, specId, name); id = result.section.id; return result.state; }); return id; };
  const duplicateSection = (sectionId: string) => { let id = ''; commitWorkspace((current) => { const result = duplicateConstructionSection(current, sectionId); id = result.section.id; return result.state; }); return id; };
  const reorderSection = (sectionId: string, direction: -1 | 1) => commitWorkspace((current) => moveConstructionSection(current, sectionId, direction));
  const createStep = (sectionId: string, input: ConstructionStepInput) => { let id = ''; commitWorkspace((current) => { const result = addConstructionStep(current, sectionId, input); id = result.step.id; return result.state; }); return id; };
  const updateSection = (sectionId: string, patch: { name: string; status: 'draft' | 'approved' | 'superseded' }) => commitWorkspace((current) => updateConstructionSection(current, sectionId, patch).state);
  const removeSection = (sectionId: string) => commitWorkspace((current) => removeConstructionSection(current, sectionId).state);
  const updateStep = (stepId: string, patch: Required<ConstructionStepInput>) => commitWorkspace((current) => updateConstructionStep(current, stepId, patch).state);
  const removeStep = (stepId: string) => commitWorkspace((current) => removeConstructionStep(current, stepId).state);
  const duplicateStep = (stepId: string) => { let id = ''; commitWorkspace((current) => { const result = duplicateConstructionStep(current, stepId); id = result.step.id; return result.state; }); return id; };
  const moveStepToSection = (stepId: string, sectionId: string) => commitWorkspace((current) => moveConstructionStepToSection(current, stepId, sectionId));
  const reorderStep = (stepId: string, direction: -1 | 1) => commitWorkspace((current) => moveConstructionStep(current, stepId, direction));
  const createDetail = (stepId: string, input: ConstructionDetailInput) => { let id = ''; commitWorkspace((current) => { const result = addConstructionDetail(current, stepId, input); id = result.detail.id; return result.state; }); return id; };
  const setDetailStatus = (detailId: string, status: CanonicalConstructionDetail['status']) => commitWorkspace((current) => setConstructionDetailStatus(current, detailId, status));
  const captureTemplate = (specId: string, name: string) => { let id = ''; commitWorkspace((current) => { const result = captureConstructionTemplate(current, specId, name); id = result.template.id; return result.state; }); return id; };
  const applyTemplate = (specId: string, templateId: string) => commitWorkspace((current) => applyConstructionTemplate(current, specId, templateId, currentActorId).state);
  const release = async (specId: string, templateId: string, checkpointLabel: string, waivers: ReleaseWaiverInput[]) => {
    const fresh = await requireFreshWorkspace();
    const spec = fresh.technicalSpecs.find((item) => item.id === specId);
    if (!spec) throw new Error('The technical specification is unavailable.');
    const garment = fresh.garments.find((item) => item.id === spec?.garmentId);
    if (!garment) throw new Error('The release garment is unavailable.');
    assertFreshServerState({
      actualRevision: garment.revision,
      expectedRevision: garment.revision,
      hasConflicts: fresh.conflicts.some((item) => item.garmentId === garment.id && item.resolution === 'pending'),
      online: true,
    });
    const result = await releaseTechnicalSpec(fresh, { actorId: currentActorId, checkpointLabel, specId, templateId, waivers });
    const operationId = crypto.randomUUID();
    await releaseTechnicalSpecCommand({
      expectedGarmentRevision: garment.revision,
      expectedSpecRevision: spec.revision,
      operationId,
      releasedAt: result.state.technicalSpecs.find((item) => item.id === spec.id)?.releasedAt ?? new Date().toISOString(),
      specId,
      tasks: result.tasks,
      validationRun: result.run,
      version: result.version,
      waivers: result.waivers,
    });
    const committed = await requireFreshWorkspace();
    return { ...result, state: committed };
  };
  return { applyTemplate, captureTemplate, createBom, createDetail, createSection, createStep, currentActorId, duplicateSection, duplicateStep, moveStepToSection, release, removeBom, removeSection, removeStep, reorderBom, reorderSection, reorderStep, setDetailStatus, state, substituteBom, updateBom, updateSection, updateStep };
}
