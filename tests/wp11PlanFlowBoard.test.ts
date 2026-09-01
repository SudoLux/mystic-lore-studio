import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { updateGarment } from '../src/domains/workspace';
import { emptyCanonicalWorkspaceState } from '../src/domains/persistence/canonicalWorkspaceRepository';
import type { CanonicalGarment } from '../src/domains/workspace';
import { planGarmentPhases } from '../src/lib/canonicalPlanPresentation';

const studioId = '30000000-0000-4000-8000-000000000002';
const timestamp = '2026-09-01T12:00:00.000Z';
const record = { createdAt: timestamp, revision: 1, studioId, updatedAt: timestamp };

describe('WP11P-B Flow board', () => {
  it('moves one canonical garment through every Flow stage without creating another garment', () => {
    const state = emptyCanonicalWorkspaceState(studioId);
    state.garments = [{
      ...record,
      collectionId: null,
      garmentCode: 'ML-001',
      garmentType: 'Jacket',
      id: 'garment-flow',
      phase: 'brief',
      status: 'active',
      title: 'Flow Jacket',
    } satisfies CanonicalGarment];

    for (const phase of planGarmentPhases) {
      const updated = updateGarment(state, 'garment-flow', { phase });
      expect(updated.garments).toHaveLength(1);
      expect(updated.garments[0]).toMatchObject({ id: 'garment-flow', phase });
    }
  });

  it('keeps drag/drop, explicit stage selection, image-led cards, and garment navigation on the same Flow surface', () => {
    const page = readFileSync(new URL('../src/pages/Plan/PlanPage.tsx', import.meta.url), 'utf8');
    for (const contract of [
      'DndContext',
      'DragOverlay',
      'KeyboardSensor',
      'useDraggable',
      'useDroppable',
      'onOpenGarment',
      'CanonicalMediaImage',
      'moveGarment',
      'aria-label="Garment development flow"',
      'overflow-x-auto',
      'w-[20rem]',
      'Open ${summary.garment.title}',
    ]) {
      expect(page).toContain(contract);
    }
  });
});
