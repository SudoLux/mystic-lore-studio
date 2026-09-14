import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  acceptAiArtifact,
  aiArtifactSourcesFresh,
  aiCandidatePanelState,
  assertPrivateCandidateBoundary,
  completeAiJobWithFakeProvider,
  defaultAiInputRefs,
  queueAiJob,
  rejectAiArtifact,
  retryAiJob,
  startAiJob,
} from '../src/domains/ai';
import { createEditorialCollection, addEditorialScene } from '../src/domains/editorial/studioRepository';
import { createSpec } from '../src/domains/technical/technicalRepository';
import type { AiWorkflow, CanonicalWorkspaceState } from '../src/domains/workspace';
import { createCanonicalWorkspace } from '../src/domains/workspace';
import { importStudioData } from '../src/lib/studioStorage';

const fixture = readFileSync(new URL('./fixtures/legacy-studio-data-v5.json', import.meta.url), 'utf8');
const owner = '10000000-0000-4000-8000-000000000222';
const workflows: AiWorkflow[] = ['technical_flat_generation', 'pom_assistance', 'bom_assistance', 'construction_recommendations', 'tech_pack_validation', 'editorial_generation', 'portfolio_drafting'];

async function readyWorkspace() {
  let state = await createCanonicalWorkspace({ data: importStudioData(fixture), ownerUserId: owner, studioName: 'WP9 Studio', studioSlug: 'wp9-studio' });
  const garment = state.garments[0];
  if (!state.technicalSpecs.some((item) => item.garmentId === garment.id)) state = createSpec(state, garment.id, 'M', 'cm').state;
  if (!state.editorialCollections.some((item) => item.primaryGarmentId === garment.id)) {
    const collection = createEditorialCollection(state, { garmentId: garment.id, title: 'WP9 Editorial' });
    state = addEditorialScene(collection.state, collection.collection.id, 'Opening').state;
  }
  return { garment, state };
}

function generate(state: CanonicalWorkspaceState, workflow: AiWorkflow, suffix = workflow) {
  const garmentId = state.garments[0].id;
  const queued = queueAiJob(state, { actorId: owner, garmentId, idempotencyKey: `wp9:${suffix}`, inputRefs: defaultAiInputRefs(state, garmentId, workflow), promptTemplateVersion: `wp9-${workflow}-v1`, workflow });
  const running = startAiJob(queued.state, queued.job.id);
  return completeAiJobWithFakeProvider(running.state, running.job.id);
}

describe('WP9 governed AI candidates', () => {
  it('supports every bounded workflow with complete deterministic provenance and no paid provider', async () => {
    let { state } = await readyWorkspace();
    for (const workflow of workflows) {
      const before = { bom: state.bomItems.length, construction: state.constructionSteps.length, editorial: state.editorialBlocks.length, flats: state.technicalFlats.length, pom: state.pomPoints.length, portfolio: state.portfolioProjects.map((item) => item.caseStudy), validations: state.validationRuns.length };
      const result = generate(state, workflow);
      expect(result.artifact.artifactType).toBe(workflow);
      expect(result.artifact.provenance).toMatchObject({ generatedBy: 'deterministic_fake', model: 'deterministic-fake-v1', promptTemplateVersion: `wp9-${workflow}-v1`, sourceChecksum: result.job.sourceChecksum });
      expect(result.artifact.fields.length).toBeGreaterThan(0);
      expect(result.artifact.candidateChecksum).toMatch(/^[a-f0-9]{64}$/);
      expect({ bom: result.state.bomItems.length, construction: result.state.constructionSteps.length, editorial: result.state.editorialBlocks.length, flats: result.state.technicalFlats.length, pom: result.state.pomPoints.length, portfolio: result.state.portfolioProjects.map((item) => item.caseStudy), validations: result.state.validationRuns.length }).toEqual(before);
      state = result.state;
    }
  });

  it('accepts a safe field selection through typed POM commands and immutable audit receipts', async () => {
    const { state } = await readyWorkspace();
    const generated = generate(state, 'pom_assistance');
    const operationId = crypto.randomUUID();
    const firstField = generated.artifact.fields[0].key;
    const result = acceptAiArtifact(generated.state, { actorId: owner, actorRole: 'owner', artifactId: generated.artifact.id, decisionNote: 'Reviewed method and anchor against the garment flat.', online: true, operationId, selectedFieldKeys: [firstField] });
    expect(result.state.pomPoints).toHaveLength(state.pomPoints.length + 1);
    expect(result.artifact.decision).toBe('accepted');
    expect(result.acceptance.operationId).toBe(operationId);
    expect(result.acceptance.acceptedPayloadChecksum).toMatch(/^[a-f0-9]{64}$/);
    expect(result.acceptance.acceptedPayloadChecksum).not.toBe(generated.artifact.candidateChecksum);
    expect(result.state.aiAcceptanceCommands).toHaveLength(1);
    expect(result.state.aiAcceptanceCommands[0]).toMatchObject({ commandType: 'measurement.create-pom', fieldKey: firstField, targetEntityType: 'pom_point' });
    expect(result.state.changeEvents.some((item) => item.operationId === operationId && item.origin === 'ai_acceptance' && item.entityType === 'pom_point')).toBe(true);
    expect(result.state.changeEvents.some((item) => item.operationId === operationId && item.operation === 'accept_ai' && item.entityType === 'ai_artifact')).toBe(true);
    const retriedCommit = acceptAiArtifact(result.state, { actorId: owner, actorRole: 'owner', artifactId: generated.artifact.id, decisionNote: 'Reviewed method and anchor against the garment flat.', online: true, operationId, selectedFieldKeys: [firstField] });
    expect(retriedCommit.state).toBe(result.state);
  });

  it('blocks stale, offline, and read-only acceptance before any domain write', async () => {
    const { state } = await readyWorkspace();
    const generated = generate(state, 'pom_assistance');
    const artifact = generated.artifact;
    const selectedFieldKeys = [artifact.fields[0].key];
    expect(() => acceptAiArtifact(generated.state, { actorId: owner, actorRole: 'reviewer', artifactId: artifact.id, decisionNote: 'Reviewer attempted a decision.', selectedFieldKeys })).toThrow('owner or editor');
    expect(() => acceptAiArtifact(generated.state, { actorId: owner, actorRole: 'owner', artifactId: artifact.id, decisionNote: 'Offline acceptance is not allowed.', online: false, selectedFieldKeys })).toThrow('fresh server state');
    const garment = generated.state.garments[0];
    const stale = { ...generated.state, garments: generated.state.garments.map((item) => item.id === garment.id ? { ...item, revision: item.revision + 1, updatedAt: new Date().toISOString() } : item) };
    expect(aiArtifactSourcesFresh(stale, artifact)).toBe(false);
    expect(aiCandidatePanelState(stale, generated.job, artifact)).toBe('modified_after_generation');
    expect(() => acceptAiArtifact(stale, { actorId: owner, actorRole: 'owner', artifactId: artifact.id, decisionNote: 'Attempted to accept stale evidence.', online: true, selectedFieldKeys })).toThrow('sources changed');
    expect(stale.pomPoints).toHaveLength(state.pomPoints.length);
  });

  it('records rejection without mutating candidate payload or domain records', async () => {
    const { state } = await readyWorkspace();
    const generated = generate(state, 'bom_assistance');
    const before = JSON.stringify(generated.artifact.candidate);
    const result = rejectAiArtifact(generated.state, { actorId: owner, actorRole: 'editor', artifactId: generated.artifact.id, decisionNote: 'The proposed relationship needs a different material.' });
    expect(result.artifact.decision).toBe('rejected');
    expect(JSON.stringify(result.artifact.candidate)).toBe(before);
    expect(result.state.bomItems).toHaveLength(state.bomItems.length);
    expect(result.state.changeEvents.at(-1)).toMatchObject({ entityType: 'ai_artifact', operation: 'update', origin: 'user' });
  });

  it('makes queue and retry behavior idempotent', async () => {
    const { state } = await readyWorkspace();
    const garmentId = state.garments[0].id;
    const input = { actorId: owner, garmentId, idempotencyKey: 'stable-request', inputRefs: defaultAiInputRefs(state, garmentId, 'pom_assistance'), promptTemplateVersion: 'wp9-pom-v1', workflow: 'pom_assistance' as const };
    const first = queueAiJob(state, input);
    const duplicate = queueAiJob(first.state, input);
    expect(duplicate.created).toBe(false);
    expect(duplicate.job.id).toBe(first.job.id);
    const retry = retryAiJob(first.state, first.job.id, owner, 'stable-retry');
    const duplicateRetry = retryAiJob(retry.state, first.job.id, owner, 'stable-retry');
    expect(duplicateRetry.job.id).toBe(retry.job.id);
    expect(retry.job.retryOfJobId).toBe(first.job.id);
    expect(retry.job.attemptNo).toBe(2);
  });

  it('fails closed when prompts or public storage paths appear in private AI artifacts', async () => {
    const { state } = await readyWorkspace();
    expect(() => assertPrivateCandidateBoundary({ rawPrompt: 'private instruction' }, state.studioId)).toThrow('forbidden boundary');
    expect(() => assertPrivateCandidateBoundary({ storagePath: 'publications/candidate.png' }, state.studioId)).toThrow('public storage path');
    expect(() => assertPrivateCandidateBoundary({ storagePath: `studios/${state.studioId}/ai/candidate.png` }, state.studioId)).not.toThrow();
  });
});
