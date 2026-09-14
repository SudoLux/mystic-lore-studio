import type {
  AiEntityType,
  AiWorkflow,
  CanonicalAiAcceptance,
  CanonicalAiArtifact,
  CanonicalAiJob,
  CanonicalWorkspaceState,
} from '../workspace';

export type AiInputReferenceRequest = {
  entityId: string;
  entityType: AiEntityType;
  fieldPath?: string;
  sourceVersionId?: string | null;
};

export type QueueAiJobInput = {
  actorId: string;
  garmentId: string;
  idempotencyKey?: string;
  inputRefs: AiInputReferenceRequest[];
  promptTemplateVersion: string;
  retryOfJobId?: string | null;
  selectedModel?: string;
  workflow: AiWorkflow;
};

export type AcceptAiArtifactInput = {
  actorId: string;
  actorRole: 'owner' | 'editor' | 'reviewer' | 'viewer';
  artifactId: string;
  decisionNote: string;
  online?: boolean;
  operationId?: string;
  selectedFieldKeys: string[];
};

export type RejectAiArtifactInput = {
  actorId: string;
  actorRole: 'owner' | 'editor' | 'reviewer' | 'viewer';
  artifactId: string;
  decisionNote: string;
};

export type AiAcceptanceResult = {
  acceptance: CanonicalAiAcceptance;
  artifact: CanonicalAiArtifact;
  domainChangeEventIds: string[];
  state: CanonicalWorkspaceState;
};

export type FakeAiCandidate = Pick<CanonicalAiArtifact, 'candidate' | 'confidence' | 'fields' | 'provenance'>;

export const aiWorkflowLabels: Record<AiWorkflow, string> = {
  bom_assistance: 'BOM assistance',
  construction_recommendations: 'Construction recommendations',
  editorial_generation: 'Editorial generation',
  pom_assistance: 'POM assistance',
  portfolio_drafting: 'Portfolio drafting',
  tech_pack_validation: 'Tech-pack validation',
  technical_flat_generation: 'Technical flat generation',
};

export const aiCommitConsequences: Record<AiWorkflow, string> = {
  bom_assistance: 'Selected rows enter the BOM through the normal linked-item validation command.',
  construction_recommendations: 'Selected operations become ordered construction steps and remain editable before release.',
  editorial_generation: 'Selected blocks enter the private editorial draft with candidate provenance attached.',
  pom_assistance: 'Selected points become stable POM records; measurements and tolerances remain separate human decisions.',
  portfolio_drafting: 'Selected copy updates private portfolio curation only. Publishing still requires a Public Cut privacy scan.',
  tech_pack_validation: 'The current release rules are rerun and stored as a validation run; no release or waiver is created.',
  technical_flat_generation: 'Selected views register as unapproved flat revisions using private source media; approval remains manual.',
};

export type AiJobWithArtifact = { artifact: CanonicalAiArtifact | null; job: CanonicalAiJob };
