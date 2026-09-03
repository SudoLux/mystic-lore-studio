import { useCanonicalWorkspace } from './useCanonicalWorkspace';
import {
  applyMeasurementCsv,
  commitGradePreview,
  createMeasurementSet,
  createTechnicalCheckpoint,
  executeMeasurementCommand,
  restoreMeasurementSelection,
  type MeasurementCommand,
} from '../domains/technical';

export function useMeasurements() {
  const { commitWorkspace, state } = useCanonicalWorkspace();
  const execute = (command: MeasurementCommand) => commitWorkspace((current) => executeMeasurementCommand(current, command));
  const ensureBaseSet = (specId: string) => {
    let id = '';
    commitWorkspace((current) => { const result = createMeasurementSet(current, specId, 'Base', 'base'); id = result.set.id; return result.state; });
    return id;
  };
  const importCsv = (specId: string, setId: string, text: string) => {
    let errors: ReturnType<typeof applyMeasurementCsv>['errors'] = [];
    commitWorkspace((current) => { const result = applyMeasurementCsv(current, specId, setId, text); errors = result.errors; return result.state; });
    return errors;
  };
  const commitGrade = (sourceSetId: string, gradeRuleId: string, name: string, overrides: Record<string, number> = {}) => {
    let setId = '';
    commitWorkspace((current) => { const result = commitGradePreview(current, sourceSetId, gradeRuleId, name, overrides); setId = result.set.id; return result.state; });
    return setId;
  };
  const createAndCommitGrade = (sourceSetId: string, input: Extract<MeasurementCommand, { type: 'create_grade_rule' }>, name: string, overrides: Record<string, number> = {}) => {
    let setId = '';
    commitWorkspace((current) => {
      const created = executeMeasurementCommand(current, input);
      const rule = created.gradeRules.at(-1);
      if (!rule) throw new Error('Grade rule could not be created.');
      const result = commitGradePreview(created, sourceSetId, rule.id, name, overrides);
      setId = result.set.id;
      return result.state;
    });
    return setId;
  };
  const createCheckpoint = async (specId: string, label?: string, notes?: string) => {
    if (!state) throw new Error('Workspace is not ready.');
    const result = await createTechnicalCheckpoint(state, specId, label, { notes });
    commitWorkspace((current) => ({ ...current, garmentVersions: [...current.garmentVersions, result.version] }));
    return result.version.id;
  };
  const restoreSelection = async (specId: string, sourceVersionId: string, selection: { pomPointIds: string[]; measurementKeys: string[] }, reason: string) => {
    if (!state) throw new Error('Workspace is not ready.');
    const source = state.garmentVersions.find((item) => item.id === sourceVersionId);
    if (!source) throw new Error('Checkpoint not found.');
    const stagedResultId = crypto.randomUUID();
    const restored = restoreMeasurementSelection(state, sourceVersionId, stagedResultId, specId, selection, reason);
    const checkpoint = await createTechnicalCheckpoint(restored.state, specId);
    commitWorkspace((current) => {
      const replay = restoreMeasurementSelection(current, sourceVersionId, checkpoint.version.id, specId, selection, reason);
      return { ...replay.state, garmentVersions: [...replay.state.garmentVersions, checkpoint.version] };
    });
    return checkpoint.version.id;
  };
  return { commitGrade, createAndCommitGrade, createCheckpoint, ensureBaseSet, execute, importCsv, restoreSelection, state };
}
