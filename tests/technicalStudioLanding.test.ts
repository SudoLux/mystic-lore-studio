import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createCanonicalWorkspace } from '../src/domains/workspace';
import { technicalLandingGarments } from '../src/lib/technicalLandingPresentation';
import { importStudioData } from '../src/lib/studioStorage';

const ownerUserId = '10000000-0000-4000-8000-000000000999';
const fixture = readFileSync(new URL('./fixtures/legacy-studio-data-v5.json', import.meta.url), 'utf8');
const workspace = () => createCanonicalWorkspace({ data: importStudioData(fixture), ownerUserId });

describe('Technical Studio landing presentation', () => {
  it('uses missing canonical technical data to explain a not-started garment', async () => {
    const state = await workspace();
    const garment = state.garments.find((item) => !state.technicalSpecs.some((spec) => spec.garmentId === item.id)) ?? state.garments[0];
    const row = technicalLandingGarments({ ...state, technicalSpecs: state.technicalSpecs.filter((spec) => spec.garmentId !== garment.id) }).find((item) => item.garment.id === garment.id)!;
    expect(row.readiness).toEqual({ label: 'Not started', percent: 0, state: 'not_started' });
    expect(row.nextAction).toBe('Start technical specification');
    expect(row.issues).toContainEqual(expect.objectContaining({ code: 'technical.spec_not_started' }));
    expect(row.progress.every((item) => item.state === 'not_started')).toBe(true);
  });

  it('uses the existing released canonical spec as the only release-ready state', async () => {
    const initial = await workspace();
    const garment = initial.garments[0];
    const state = {
      ...initial,
      technicalSpecs: [{
        baseSize: 'M',
        createdAt: '2026-01-01T00:00:00.000Z',
        garmentId: garment.id,
        id: 'released-spec',
        releaseValidationRunId: 'validation-run',
        releaseVersionId: 'release-version',
        releasedAt: '2026-01-02T00:00:00.000Z',
        releasedBy: ownerUserId,
        revision: 1,
        revisionLabel: 'A',
        status: 'released' as const,
        studioId: initial.studioId,
        unit: 'cm' as const,
        updatedAt: '2026-01-02T00:00:00.000Z',
      }],
    };
    const row = technicalLandingGarments(state)[0];
    expect(row.readiness).toEqual({ label: 'Release ready', percent: 100, state: 'release_ready' });
    expect(row.progress.find((item) => item.id === 'release')).toMatchObject({ state: 'complete' });
  });
});
