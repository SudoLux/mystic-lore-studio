import type { Json } from '../../types/database.generated';
import { canonicalSupabase } from '../../lib/supabase';
import type {
  CanonicalAiArtifact,
  CanonicalEditorialExport,
  CanonicalGarmentVersion,
  CanonicalQcWaiver,
  CanonicalReleaseTask,
  CanonicalRestoreOperation,
  CanonicalTechPackExport,
  CanonicalValidationRun,
  CanonicalValidationWaiver,
  CanonicalWorkspaceState,
} from '../workspace';
import { buildCanonicalMutations } from './canonicalCodecRegistry';

export type ProtectedCommandResult = {
  status: 'applied' | 'duplicate';
  [key: string]: Json | undefined;
};

function client() {
  if (!canonicalSupabase) throw new Error('The canonical Supabase client is unavailable.');
  return canonicalSupabase;
}

function json(value: unknown) {
  return value as Json;
}

function unwrap<T>(response: { data: T | null; error: { message: string } | null }) {
  if (response.error) throw new Error(response.error.message);
  if (response.data === null) throw new Error('The protected command returned no server evidence.');
  return response.data;
}

export async function createFreezeFrameCommand(input: {
  expectedRevision: number;
  operationId: string;
  version: CanonicalGarmentVersion;
}) {
  const response = await client().schema('ml_private').rpc('create_canonical_freeze_frame', {
    p_checksum: input.version.checksum,
    p_expected_revision: input.expectedRevision,
    p_garment_id: input.version.garmentId,
    p_label: input.version.label,
    p_notes: input.version.notes,
    p_operation_id: input.operationId,
    p_scope_json: json({ domain: input.version.scope }),
    p_snapshot_json: json(input.version.snapshot),
    p_version_kind: input.version.kind,
  });
  return unwrap(response) as ProtectedCommandResult;
}

export async function commitRestoreCommand(input: {
  before: CanonicalWorkspaceState;
  expectedRevision: number;
  mutationOperationId: string;
  operationId: string;
  restore: CanonicalRestoreOperation;
  resultState: CanonicalWorkspaceState;
  version: CanonicalGarmentVersion;
}) {
  // The protected restore command changes the garment/current-version pointer
  // itself. Excluding the client garment row prevents a double revision bump.
  const mutations = buildCanonicalMutations(input.before, input.resultState)
    .filter((mutation) => mutation.entityType !== 'garments');
  const response = await client().schema('ml_private').rpc('commit_canonical_restore', {
    p_dependency_json: json(input.restore.dependencies),
    p_expected_revision: input.expectedRevision,
    p_garment_id: input.restore.garmentId,
    p_inverse_patch: json(input.restore.inversePatch),
    p_label: input.version.label,
    p_mutation_operation_id: input.mutationOperationId,
    p_mutations: json(mutations),
    p_operation_id: input.operationId,
    p_preview_checksum: input.restore.previewChecksum,
    p_reason: input.restore.reason,
    p_replay_patch: json(input.restore.replayPatch),
    p_result_checksum: input.version.checksum,
    p_result_snapshot: json(input.version.snapshot),
    p_scope_json: json({ domain: input.restore.scope }),
    p_selected_keys: json(input.restore.selectedKeys),
    p_source_version_id: input.restore.sourceVersionId,
    p_studio_id: input.restore.studioId,
  });
  return unwrap(response) as ProtectedCommandResult;
}

export async function releaseTechnicalSpecCommand(input: {
  expectedGarmentRevision: number;
  expectedSpecRevision: number;
  operationId: string;
  releasedAt: string;
  specId: string;
  tasks: CanonicalReleaseTask[];
  validationRun: CanonicalValidationRun;
  version: CanonicalGarmentVersion;
  waivers: CanonicalValidationWaiver[];
}) {
  const response = await client().schema('ml_private').rpc('release_technical_spec', {
    p_expected_garment_revision: input.expectedGarmentRevision,
    p_expected_spec_revision: input.expectedSpecRevision,
    p_operation_id: input.operationId,
    p_release: json({
      releasedAt: input.releasedAt,
      tasks: input.tasks,
      validationRun: input.validationRun,
      version: input.version,
      waivers: input.waivers,
    }),
    p_spec_id: input.specId,
  });
  return unwrap(response) as ProtectedCommandResult;
}

export async function recordTechPackExportCommand(input: {
  expectedSpecRevision: number;
  exportRecord: CanonicalTechPackExport;
  operationId: string;
}) {
  const response = await client().schema('ml_private').rpc('record_tech_pack_export', {
    p_expected_spec_revision: input.expectedSpecRevision,
    p_export: json(input.exportRecord),
    p_operation_id: input.operationId,
    p_spec_id: input.exportRecord.specId,
  });
  return unwrap(response) as ProtectedCommandResult;
}

export async function recordEditorialExportCommand(input: {
  expectedRevision: number;
  exportRecord: CanonicalEditorialExport;
  operationId: string;
}) {
  const response = await client().schema('ml_private').rpc('record_editorial_export', {
    p_collection_id: input.exportRecord.collectionId,
    p_expected_revision: input.expectedRevision,
    p_export: json(input.exportRecord),
    p_operation_id: input.operationId,
  });
  return unwrap(response) as ProtectedCommandResult;
}

export async function commitQcWaiverCommand(input: {
  expectedRevision: number;
  operationId: string;
  task: CanonicalReleaseTask;
  waiver: CanonicalQcWaiver;
}) {
  const response = await client().schema('ml_private').rpc('commit_qc_waiver', {
    p_expected_revision: input.expectedRevision,
    p_operation_id: input.operationId,
    p_qc_result_id: input.waiver.qcResultId,
    p_task: json(input.task),
    p_waiver: json(input.waiver),
  });
  return unwrap(response) as ProtectedCommandResult;
}

export async function decideQcInspectionCommand(input: {
  decision: 'approve' | 'hold' | 'reject';
  expectedRevision: number;
  inspectionId: string;
  operationId: string;
}) {
  const response = await client().schema('ml_private').rpc('decide_qc_inspection', {
    p_decision: input.decision,
    p_expected_revision: input.expectedRevision,
    p_inspection_id: input.inspectionId,
    p_operation_id: input.operationId,
  });
  return unwrap(response) as ProtectedCommandResult;
}

export async function transitionAiJobCommand(input: {
  artifact?: CanonicalAiArtifact | null;
  errorCode?: string | null;
  expectedRevision: number;
  jobId: string;
  status: 'running' | 'candidate' | 'failed';
}) {
  const response = await client().schema('ml_private').rpc('transition_ai_job', {
    p_artifact: input.artifact ? json(input.artifact) : null,
    ...(input.errorCode ? { p_error_code: input.errorCode } : {}),
    p_expected_revision: input.expectedRevision,
    p_job_id: input.jobId,
    p_status: input.status,
  });
  return unwrap(response) as ProtectedCommandResult;
}

export async function recordAiValidationCandidateCommand(input: {
  artifactId: string;
  operationId: string;
  run: CanonicalValidationRun;
}) {
  const response = await client().schema('ml_private').rpc('record_ai_validation_candidate', {
    p_artifact_id: input.artifactId,
    p_operation_id: input.operationId,
    p_run: json(input.run),
  });
  return unwrap(response) as ProtectedCommandResult;
}

export async function acceptAiArtifactCommand(input: {
  acceptedPayloadChecksum: string;
  artifactId: string;
  commandReceipts: Array<{ changeEventId: string; commandType: string; fieldKey: string }>;
  decisionNote: string;
  expectedSourceChecksum: string;
  operationId: string;
}) {
  const response = await client().schema('ml_private').rpc('accept_ai_artifact', {
    p_accepted_payload_checksum: input.acceptedPayloadChecksum,
    p_artifact_id: input.artifactId,
    p_command_receipts: json(input.commandReceipts),
    p_decision_note: input.decisionNote,
    p_expected_source_checksum: input.expectedSourceChecksum,
    p_operation_id: input.operationId,
  });
  return unwrap(response);
}

export async function rejectAiArtifactCommand(artifactId: string, decisionNote: string) {
  const response = await client().schema('ml_private').rpc('reject_ai_artifact', {
    p_artifact_id: artifactId,
    p_decision_note: decisionNote,
  });
  if (response.error) throw new Error(response.error.message);
}

export async function deleteFreezeFrameCommand(versionId: string, expectedGarmentRevision: number) {
  const response = await client().schema('ml_private').rpc('delete_freeze_frame', {
    p_expected_garment_revision: expectedGarmentRevision,
    p_version_id: versionId,
  });
  if (response.error) throw new Error(response.error.message);
}
