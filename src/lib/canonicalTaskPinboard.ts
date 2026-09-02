import type { CanonicalReleaseTask } from '../domains/workspace';
import type { PlanTaskItem } from './canonicalPlanPresentation';

export type TaskPinboardMode = 'priority' | 'garment' | 'due' | 'freeform';

/** Per-device visual coordinates. They deliberately never enter a task record. */
export type TaskPinPosition = { x: number; y: number };
export type TaskPinPositions = Record<string, TaskPinPosition>;

export type TaskPinboardGroup = { id: string; label: string; tasks: PlanTaskItem[] };

export function taskPinboardPositionKey(studioId: string) {
  return `plan-task-pinboard:${studioId}`;
}

export function isCompletedTask(task: CanonicalReleaseTask) {
  return task.status === 'done' || task.status === 'cancelled';
}

export function taskPinboardGroups(mode: Exclude<TaskPinboardMode, 'freeform'>, tasks: PlanTaskItem[], now = new Date()): TaskPinboardGroup[] {
  if (mode === 'garment') return groupByGarment(tasks);
  if (mode === 'due') return groupByDueDate(tasks, now);
  return groupByPriority(tasks, now);
}

export function defaultTaskPinPosition(index: number): TaskPinPosition {
  return { x: 28 + (index % 3) * 254, y: 28 + Math.floor(index / 3) * 242 };
}

export function clampTaskPinPosition(position: TaskPinPosition): TaskPinPosition {
  return { x: Math.max(12, Math.round(position.x)), y: Math.max(12, Math.round(position.y)) };
}

function groupByPriority(tasks: PlanTaskItem[], now: Date): TaskPinboardGroup[] {
  const urgent = tasks.filter(({ task }) => task.priority === 'urgent' || task.status === 'blocked');
  const urgentIds = new Set(urgent.map(({ task }) => task.id));
  const thisWeek = tasks.filter(({ task }) => !urgentIds.has(task.id) && (task.priority === 'high' || isWithinDays(task.dueAt, now, 7)));
  const thisWeekIds = new Set(thisWeek.map(({ task }) => task.id));
  return [
    { id: 'urgent', label: 'Urgent', tasks: urgent },
    { id: 'this-week', label: 'This week', tasks: thisWeek },
    { id: 'later', label: 'Later', tasks: tasks.filter(({ task }) => !urgentIds.has(task.id) && !thisWeekIds.has(task.id)) },
  ];
}

function groupByGarment(tasks: PlanTaskItem[]): TaskPinboardGroup[] {
  const grouped = new Map<string, TaskPinboardGroup>();
  for (const item of tasks) {
    const id = item.garment?.garment.id ?? 'studio-wide';
    const label = item.garment?.garment.title ?? 'Studio-wide';
    const current = grouped.get(id) ?? { id, label, tasks: [] };
    current.tasks.push(item);
    grouped.set(id, current);
  }
  return [...grouped.values()].sort((left, right) => left.label.localeCompare(right.label));
}

function groupByDueDate(tasks: PlanTaskItem[], now: Date): TaskPinboardGroup[] {
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endToday = new Date(startToday); endToday.setDate(endToday.getDate() + 1);
  const endWeek = new Date(startToday); endWeek.setDate(endWeek.getDate() + 7);
  return [
    { id: 'overdue', label: 'Overdue', tasks: tasks.filter(({ task }) => task.dueAt && new Date(task.dueAt) < startToday) },
    { id: 'today', label: 'Today', tasks: tasks.filter(({ task }) => task.dueAt && new Date(task.dueAt) >= startToday && new Date(task.dueAt) < endToday) },
    { id: 'this-week', label: 'This week', tasks: tasks.filter(({ task }) => task.dueAt && new Date(task.dueAt) >= endToday && new Date(task.dueAt) < endWeek) },
    { id: 'later', label: 'Later', tasks: tasks.filter(({ task }) => task.dueAt && new Date(task.dueAt) >= endWeek) },
    { id: 'unscheduled', label: 'No date yet', tasks: tasks.filter(({ task }) => !task.dueAt) },
  ];
}

function isWithinDays(value: string | null, now: Date, days: number) {
  if (!value) return false;
  const target = new Date(value).getTime();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return target >= start && target < start + days * 86_400_000;
}
