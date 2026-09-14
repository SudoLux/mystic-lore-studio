import type {
  CanonicalConflict,
  CanonicalJsonPatch,
  CanonicalVersionDependency,
  FreezeFrameKind,
  FreezeFrameScope,
} from '../workspace';

export const freezeFrameScopes: FreezeFrameScope[] = ['all', 'design', 'technical', 'production', 'editorial', 'portfolio'];

export type FreezeFrameInput = {
  actorId: string;
  expectedRevision: number;
  garmentId: string;
  kind?: FreezeFrameKind;
  label: string;
  notes?: string;
  operationId?: string;
  scope: FreezeFrameScope;
};

export type StructuralDiffKind = 'added' | 'removed' | 'changed' | 'moved';

export type StructuralDiff = {
  after: unknown;
  afterActorId: string | null;
  afterAt: string;
  before: unknown;
  beforeActorId: string | null;
  beforeAt: string;
  collection: string;
  domain: FreezeFrameScope;
  entityId: string;
  entityLabel: string;
  field: string;
  key: string;
  kind: StructuralDiffKind;
  restorable: boolean;
  warning?: string;
};

export type FreshServerState = {
  actualRevision: number;
  expectedRevision: number;
  hasConflicts: boolean;
  online: boolean;
};

export type RestorePreviewResult = {
  affected: StructuralDiff[];
  dependencies: CanonicalVersionDependency[];
  previewChecksum: string;
  replayPatch: CanonicalJsonPatch[];
  inversePatch: CanonicalJsonPatch[];
  warnings: string[];
};

export type RestoreCommitInput = {
  actorId: string;
  expectedRevision: number;
  garmentId: string;
  online: boolean;
  operationId?: string;
  previewChecksum: string;
  reason: string;
  scope: FreezeFrameScope;
  selectedKeys: string[];
  sourceVersionId: string;
};

export type ScalarMergeResult = {
  conflicts: CanonicalConflict[];
  event: import('../workspace').CanonicalChangeEvent | null;
  merged: Record<string, unknown>;
};
