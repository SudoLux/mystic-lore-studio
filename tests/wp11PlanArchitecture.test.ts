import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { emptyCanonicalWorkspaceState } from '../src/domains/persistence/canonicalWorkspaceRepository';
import type { CanonicalCalendarEvent, CanonicalGarment, CanonicalGarmentMedia, CanonicalMediaAsset, CanonicalReleaseTask } from '../src/domains/workspace';
import { selectPlanCalendarItems, selectPlanGarmentSummaries, selectPlanTaskItems, selectPlanWorkspacePresentation } from '../src/lib/canonicalPlanPresentation';

const studioId = '30000000-0000-4000-8000-000000000001';
const timestamp = '2026-09-01T12:00:00.000Z';
const record = { createdAt: timestamp, revision: 1, studioId, updatedAt: timestamp };

describe('WP11P Plan workspace architecture', () => {
  it('reuses canonical garment context across Flow and Tasks', () => {
    const state = fixture();
    const [summary] = selectPlanGarmentSummaries(state);
    const tasks = selectPlanTaskItems(state);

    expect(summary).toMatchObject({ collectionName: 'Autumn Study', openTaskCount: 2 });
    expect(summary.coverImage?.id).toBe('asset-hero');
    expect(summary.nextTask?.id).toBe('task-blocked');
    expect(summary.warning?.label).toBe('Blocked task');
    expect(tasks.find((item) => item.task.id === 'task-progress')?.garment?.garment.id).toBe('garment-1');
  });

  it('projects dated tasks and standalone events into Calendar without creating duplicate domain records', () => {
    const state = fixture();
    const calendar = selectPlanCalendarItems(state);

    expect(calendar).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'task:task-progress', source: 'task', task: expect.objectContaining({ id: 'task-progress' }), event: null }),
      expect.objectContaining({ id: 'event:fit-review', source: 'event', event: expect.objectContaining({ id: 'fit-review' }), task: null }),
    ]));
    expect(state.releaseTasks).toHaveLength(3);
    expect(state.calendarEvents).toHaveLength(1);
    expect(selectPlanWorkspacePresentation(state).openTasks).toHaveLength(2);
  });

  it('keeps the Plan shell, scrollable Flow foundation, and accessible tab contract', () => {
    const page = readFileSync(new URL('../src/pages/Plan/PlanPage.tsx', import.meta.url), 'utf8');
    expect(page).toContain('PlanWorkspaceTabs');
    expect(page).toContain('role="tablist"');
    expect(page).toContain("['ArrowLeft', 'ArrowRight', 'Home', 'End']");
    expect(page).toContain('overflow-x-auto');
    expect(page).toContain('selectPlanWorkspacePresentation');
  });
});

function fixture() {
  const state = emptyCanonicalWorkspaceState(studioId);
  state.collections = [{ ...record, id: 'collection-1', name: 'Autumn Study', season: 'FW26', sortOrder: 0, status: 'active' }];
  state.garments = [{ ...record, collectionId: 'collection-1', garmentCode: 'MLS-1', garmentType: 'Jacket', id: 'garment-1', phase: 'sampling', status: 'active', title: 'Sutra Jacket' } satisfies CanonicalGarment];
  state.mediaAssets = [{ ...record, checksum: 'hero-checksum', height: 1200, id: 'asset-hero', mimeType: 'image/jpeg', name: 'sutra.jpg', rights: {}, sizeBytes: 1024, storagePath: `${studioId}/assets/sutra.jpg`, width: 900 } satisfies CanonicalMediaAsset];
  state.garmentMedia = [{ ...record, assetId: 'asset-hero', garmentId: 'garment-1', id: 'hero-link', role: 'hero', sortOrder: 0 } satisfies CanonicalGarmentMedia];
  state.releaseTasks = [
    { ...record, assigneeId: null, description: '', dueAt: '2026-09-03T12:00:00.000Z', garmentId: 'garment-1', id: 'task-progress', priority: 'high', sortOrder: 0, status: 'in_progress', title: 'Review first sample' },
    { ...record, assigneeId: null, description: '', dueAt: null, garmentId: 'garment-1', id: 'task-blocked', priority: 'urgent', sortOrder: 1, status: 'blocked', title: 'Resolve sleeve balance' },
    { ...record, assigneeId: null, description: '', dueAt: null, garmentId: 'garment-1', id: 'task-done', priority: 'low', sortOrder: 2, status: 'done', title: 'Archive reference' },
  ] satisfies CanonicalReleaseTask[];
  state.calendarEvents = [{ ...record, assigneeId: null, endsAt: null, eventType: 'fitting', garmentId: 'garment-1', id: 'fit-review', notes: '', startsAt: '2026-09-02T10:00:00.000Z', title: 'Fit review' } satisfies CanonicalCalendarEvent];
  return state;
}
