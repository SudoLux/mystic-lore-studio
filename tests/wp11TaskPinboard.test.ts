import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { addTask, deleteTask, updateTask } from '../src/domains/workspace';
import { emptyCanonicalWorkspaceState } from '../src/domains/persistence/canonicalWorkspaceRepository';
import { selectPlanCalendarItems, type PlanTaskItem } from '../src/lib/canonicalPlanPresentation';
import { defaultTaskPinPosition, taskPinboardGroups, taskPinboardPositionKey } from '../src/lib/canonicalTaskPinboard';
import type { CanonicalGarment, CanonicalReleaseTask } from '../src/domains/workspace';

const studioId = '30000000-0000-4000-8000-000000000001';
const timestamp = '2026-09-01T12:00:00.000Z';
const record = { createdAt: timestamp, revision: 1, studioId, updatedAt: timestamp };

describe('WP11P-C Mystic Lore Task Pinboard', () => {
  it('groups the same canonical task records without making task copies', () => {
    const tasks = taskItems();
    const priority = taskPinboardGroups('priority', tasks, new Date(timestamp));
    const due = taskPinboardGroups('due', tasks, new Date(timestamp));
    const garment = taskPinboardGroups('garment', tasks, new Date(timestamp));

    expect(priority.find((group) => group.id === 'urgent')?.tasks.map((item) => item.task.id)).toEqual(['urgent']);
    expect(due.find((group) => group.id === 'today')?.tasks.map((item) => item.task.id)).toEqual(['urgent']);
    expect(garment).toHaveLength(2);
    expect(priority.flatMap((group) => group.tasks).every((item) => tasks.includes(item))).toBe(true);
  });

  it('updates and deletes canonical tasks while Calendar remains only a due-date projection', () => {
    const state = emptyCanonicalWorkspaceState(studioId);
    state.garments = [{ ...record, collectionId: null, garmentCode: 'MLS-1', garmentType: 'Jacket', id: 'garment-1', phase: 'design', status: 'active', title: 'Sutra Jacket' } satisfies CanonicalGarment];
    const added = addTask(state, { description: 'Check drape.', dueAt: null, garmentId: 'garment-1', priority: 'medium', title: 'Review drape' });
    const taskId = added.record.id;
    const updated = updateTask(added.state, taskId, { dueAt: '2026-09-03T12:00:00.000Z', priority: 'high', status: 'in_progress', title: 'Review final drape' });

    expect(updated.releaseTasks[0]).toMatchObject({ priority: 'high', status: 'in_progress', title: 'Review final drape' });
    expect(selectPlanCalendarItems(updated).filter((item) => item.source === 'task')).toHaveLength(1);
    const deleted = deleteTask(updated, taskId);
    expect(deleted.releaseTasks).toHaveLength(0);
    expect(selectPlanCalendarItems(deleted).filter((item) => item.source === 'task')).toHaveLength(0);
    expect(deleted.garments).toHaveLength(1);
  });

  it('keeps freeform coordinates in a distinct presentation key rather than a task field', () => {
    expect(taskPinboardPositionKey(studioId)).toBe(`plan-task-pinboard:${studioId}`);
    expect(defaultTaskPinPosition(4)).toEqual({ x: 282, y: 270 });
    const page = readFileSync(new URL('../src/pages/Plan/PlanPage.tsx', import.meta.url), 'utf8');
    expect(page).toContain('CanonicalIndexedDb');
    expect(page).toContain('taskPinboardPositionKey');
    expect(page).toContain('TaskDetailDrawer');
    expect(page).toContain('FreeformTaskPinboard');
    expect(page).toContain('Completed ·');
  });
});

function taskItems(): PlanTaskItem[] {
  const garment = { collectionName: 'Autumn Study', coverImage: null, garment: { ...record, collectionId: null, garmentCode: 'MLS-1', garmentType: 'Jacket', id: 'garment-1', phase: 'design', status: 'active', title: 'Sutra Jacket' } satisfies CanonicalGarment, nextTask: null, openTaskCount: 2, warning: null };
  const tasks = [
    { ...record, assigneeId: null, description: '', dueAt: '2026-09-01T15:00:00.000Z', garmentId: 'garment-1', id: 'urgent', priority: 'urgent', sortOrder: 0, status: 'todo', title: 'Resolve collar' },
    { ...record, assigneeId: null, description: '', dueAt: '2026-09-05T12:00:00.000Z', garmentId: 'garment-1', id: 'this-week', priority: 'medium', sortOrder: 1, status: 'todo', title: 'Fit sample' },
    { ...record, assigneeId: null, description: '', dueAt: null, garmentId: '', id: 'later', priority: 'low', sortOrder: 2, status: 'todo', title: 'Order thread' },
  ] satisfies CanonicalReleaseTask[];
  return tasks.map((task) => ({ garment: task.garmentId ? garment : null, task }));
}
