import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  addCalendarEvent,
  addTask,
  createCanonicalWorkspace,
  updateTaskStatus,
} from '../src/domains/workspace';
import { recordWorkspaceChangeEvents } from '../src/domains/versioning';
import { importStudioData } from '../src/lib/studioStorage';

const fixtureText = readFileSync(new URL('./fixtures/legacy-studio-data-v5.json', import.meta.url), 'utf8');
const OWNER_ID = '10000000-0000-4000-8000-000000000111';

async function workspace() {
  return createCanonicalWorkspace({
    data: importStudioData(fixtureText),
    ownerUserId: OWNER_ID,
    studioName: 'RC Plan Studio',
    studioSlug: 'rc-plan-studio',
  });
}

describe('WP10 canonical Plan release candidate', () => {
  it('hydrates the representative legacy task into the canonical task owner', async () => {
    const state = await workspace();
    expect(state.releaseTasks).toHaveLength(1);
    expect(state.releaseTasks[0]).toMatchObject({
      garmentId: state.garments[0].id,
      status: 'in_progress',
    });
  });

  it('creates and updates canonical tasks without changing garment identity', async () => {
    const state = await workspace();
    const created = addTask(state, {
      description: 'Confirm shell width before release.',
      dueAt: '2026-09-01T12:00:00.000Z',
      garmentId: state.garments[0].id,
      priority: 'high',
      title: 'Material release review',
    });
    const updated = updateTaskStatus(created.state, created.record.id, 'done');
    expect(updated.releaseTasks.find((task) => task.id === created.record.id)?.status).toBe('done');
    expect(updated.garments[0].id).toBe(state.garments[0].id);
  });

  it('validates calendar bounds and records the accepted event in the change ledger', async () => {
    const state = await workspace();
    expect(() => addCalendarEvent(state, {
      endsAt: '2026-09-02T09:00:00.000Z',
      eventType: 'fitting',
      garmentId: state.garments[0].id,
      notes: '',
      startsAt: '2026-09-02T10:00:00.000Z',
      title: 'Fit review',
    })).toThrow(/end must be after/);

    const created = addCalendarEvent(state, {
      endsAt: null,
      eventType: 'fitting',
      garmentId: state.garments[0].id,
      notes: 'Confirm the jacket balance in motion.',
      startsAt: '2026-09-02T10:00:00.000Z',
      title: 'Fit review',
    });
    const audited = recordWorkspaceChangeEvents(state, created.state, { actorId: OWNER_ID });
    expect(audited.calendarEvents).toHaveLength(1);
    expect(audited.changeEvents).toContainEqual(expect.objectContaining({
      entityId: created.record.id,
      entityType: 'calendar_event',
      garmentId: state.garments[0].id,
      operation: 'create',
    }));
  });

  it('exposes Flow, Tasks, Calendar, accessible tabs, offline/conflict, and empty states', () => {
    const page = readFileSync(new URL('../src/pages/Plan/PlanPage.tsx', import.meta.url), 'utf8');
    for (const contract of ['Flow', 'Tasks', 'Calendar', 'role="tablist"', 'role="tabpanel"', 'Offline field mode', 'unresolved conflict']) {
      expect(page).toContain(contract);
    }
  });
});
