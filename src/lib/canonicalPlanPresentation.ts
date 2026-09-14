import type {
  CanonicalCalendarEvent,
  CanonicalGarment,
  CanonicalMediaAsset,
  CanonicalReleaseTask,
  CanonicalWorkspaceState,
} from '../domains/workspace';
import { canonicalGarmentCover } from './canonicalGarmentPresentation';

export const planGarmentPhases: CanonicalGarment['phase'][] = [
  'brief',
  'design',
  'materials',
  'technical',
  'sampling',
  'production',
  'story',
  'portfolio',
];

export type PlanGarmentWarning = {
  label: string;
  tone: 'blocked' | 'hold';
};

/** Presentation-only garment context shared by Flow, Tasks, and Calendar. */
export type PlanGarmentSummary = {
  collectionName: string;
  coverImage: CanonicalMediaAsset | null;
  garment: CanonicalGarment;
  nextTask: CanonicalReleaseTask | null;
  openTaskCount: number;
  warning: PlanGarmentWarning | null;
};

/** Presentation-only task context. The canonical task remains the sole record. */
export type PlanTaskItem = {
  garment: PlanGarmentSummary | null;
  task: CanonicalReleaseTask;
};

/** A transient calendar projection of either a due task or a standalone event. */
export type PlanCalendarItem = {
  endsAt: string | null;
  event: CanonicalCalendarEvent | null;
  garment: PlanGarmentSummary | null;
  id: string;
  kind: string;
  source: 'event' | 'task';
  startsAt: string;
  task: CanonicalReleaseTask | null;
  title: string;
};

export type PlanWorkspacePresentation = {
  calendarItems: PlanCalendarItem[];
  garments: PlanGarmentSummary[];
  openTasks: PlanTaskItem[];
  tasks: PlanTaskItem[];
};

export function selectPlanWorkspacePresentation(state: CanonicalWorkspaceState): PlanWorkspacePresentation {
  const garments = selectPlanGarmentSummaries(state);
  const garmentById = new Map(garments.map((item) => [item.garment.id, item]));
  const tasks = selectPlanTaskItems(state, garmentById);
  return {
    calendarItems: selectPlanCalendarItems(state, garmentById),
    garments,
    openTasks: tasks.filter((item) => isOpenTask(item.task)),
    tasks,
  };
}

export function selectPlanGarmentSummaries(state: CanonicalWorkspaceState): PlanGarmentSummary[] {
  const collections = new Map(state.collections.map((collection) => [collection.id, collection]));
  const tasksByGarment = groupTasksByGarment(state.releaseTasks);

  return state.garments.map((garment) => {
    const openTasks = (tasksByGarment.get(garment.id) ?? []).filter(isOpenTask);
    const blockedTask = openTasks.find((task) => task.status === 'blocked');
    return {
      collectionName: collections.get(garment.collectionId ?? '')?.name ?? 'Independent piece',
      coverImage: canonicalGarmentCover(state, garment.id),
      garment,
      nextTask: sortTasksForAction(openTasks)[0] ?? null,
      openTaskCount: openTasks.length,
      warning: garment.status === 'on_hold'
        ? { label: 'On hold', tone: 'hold' }
        : blockedTask
          ? { label: 'Blocked task', tone: 'blocked' }
          : null,
    };
  });
}

export function selectPlanTaskItems(
  state: CanonicalWorkspaceState,
  garmentById = new Map(selectPlanGarmentSummaries(state).map((item) => [item.garment.id, item])),
): PlanTaskItem[] {
  return [...state.releaseTasks]
    .sort((left, right) => taskSortValue(left).localeCompare(taskSortValue(right)) || left.sortOrder - right.sortOrder || left.id.localeCompare(right.id))
    .map((task) => ({ garment: garmentById.get(task.garmentId) ?? null, task }));
}

/**
 * Converts canonical dated tasks and canonical calendar events into display
 * rows only. It never writes, clones, or persists another task/event record.
 */
export function selectPlanCalendarItems(
  state: CanonicalWorkspaceState,
  garmentById = new Map(selectPlanGarmentSummaries(state).map((item) => [item.garment.id, item])),
): PlanCalendarItem[] {
  const taskItems: PlanCalendarItem[] = state.releaseTasks
    .filter((task) => task.dueAt)
    .map((task) => ({
      endsAt: null,
      event: null,
      garment: garmentById.get(task.garmentId) ?? null,
      id: `task:${task.id}`,
      kind: 'Task due',
      source: 'task',
      startsAt: task.dueAt!,
      task,
      title: task.title,
    }));
  const eventItems: PlanCalendarItem[] = state.calendarEvents.map((event) => ({
    endsAt: event.endsAt,
    event,
    garment: event.garmentId ? garmentById.get(event.garmentId) ?? null : null,
    id: `event:${event.id}`,
    kind: event.eventType,
    source: 'event',
    startsAt: event.startsAt,
    task: null,
    title: event.title,
  }));
  return [...eventItems, ...taskItems].sort((left, right) => left.startsAt.localeCompare(right.startsAt) || left.id.localeCompare(right.id));
}

export function isOpenTask(task: CanonicalReleaseTask) {
  return !['done', 'cancelled'].includes(task.status);
}

export function planTaskStatusLabel(status: CanonicalReleaseTask['status']) {
  return status.replace('_', ' ');
}

function groupTasksByGarment(tasks: CanonicalReleaseTask[]) {
  return tasks.reduce((grouped, task) => {
    const existing = grouped.get(task.garmentId) ?? [];
    grouped.set(task.garmentId, [...existing, task]);
    return grouped;
  }, new Map<string, CanonicalReleaseTask[]>());
}

function sortTasksForAction(tasks: CanonicalReleaseTask[]) {
  return [...tasks].sort((left, right) => taskSortValue(left).localeCompare(taskSortValue(right)) || left.sortOrder - right.sortOrder || left.id.localeCompare(right.id));
}

function taskSortValue(task: CanonicalReleaseTask) {
  const priority = { urgent: '0', high: '1', medium: '2', low: '3' }[task.priority];
  const status = task.status === 'blocked' ? '0' : task.status === 'in_progress' ? '1' : '2';
  return `${status}:${task.dueAt ?? '9999-12-31'}:${priority}`;
}
