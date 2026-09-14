import type {
  ProjectPhase,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
} from '../../types/studio';

export function canonicalGarmentStatus(status: ProjectStatus) {
  const values: Record<ProjectStatus, 'active' | 'approved' | 'archived' | 'draft' | 'on_hold' | 'released'> = {
    Active: 'active',
    Archived: 'archived',
    Blocked: 'on_hold',
    Completed: 'released',
    Idea: 'draft',
    Paused: 'on_hold',
    'Ready for Production': 'approved',
  };
  return values[status];
}

export function legacyGarmentStatus(
  status: 'active' | 'approved' | 'archived' | 'cancelled' | 'draft' | 'on_hold' | 'released',
): ProjectStatus {
  if (status === 'active') return 'Active';
  if (status === 'approved') return 'Ready for Production';
  if (status === 'archived') return 'Archived';
  if (status === 'on_hold') return 'Paused';
  if (status === 'released') return 'Completed';
  return status === 'cancelled' ? 'Blocked' : 'Idea';
}

export function canonicalGarmentPhase(phase: ProjectPhase) {
  const values: Record<ProjectPhase, 'brief' | 'design' | 'materials' | 'portfolio' | 'production' | 'sampling' | 'story' | 'technical'> = {
    Archived: 'portfolio',
    Concept: 'brief',
    'Final Build': 'production',
    Fitting: 'sampling',
    'Lookbook Ready': 'story',
    Materials: 'materials',
    'Pattern Drafting': 'technical',
    Photoshoot: 'story',
    Research: 'design',
    Revision: 'design',
    'Sample Sewing': 'sampling',
  };
  return values[phase];
}

export function legacyGarmentPhase(
  phase: 'brief' | 'design' | 'materials' | 'portfolio' | 'production' | 'sampling' | 'story' | 'technical',
): ProjectPhase {
  if (phase === 'brief') return 'Concept';
  if (phase === 'design') return 'Revision';
  if (phase === 'materials') return 'Materials';
  if (phase === 'production') return 'Final Build';
  if (phase === 'sampling') return 'Fitting';
  if (phase === 'story') return 'Lookbook Ready';
  if (phase === 'technical') return 'Pattern Drafting';
  return 'Archived';
}

export function canonicalTaskStatus(status: TaskStatus) {
  const values: Record<TaskStatus, 'blocked' | 'done' | 'in_progress' | 'todo'> = {
    Blocked: 'blocked',
    Done: 'done',
    'In Progress': 'in_progress',
    Review: 'in_progress',
    'To Do': 'todo',
  };
  return values[status];
}

export function legacyTaskStatus(
  status: 'blocked' | 'cancelled' | 'done' | 'in_progress' | 'todo',
): TaskStatus {
  if (status === 'blocked') return 'Blocked';
  if (status === 'done') return 'Done';
  if (status === 'in_progress') return 'In Progress';
  return status === 'cancelled' ? 'Blocked' : 'To Do';
}

export function canonicalTaskPriority(priority: TaskPriority) {
  const values: Record<TaskPriority, 'high' | 'low' | 'medium' | 'urgent'> = {
    Critical: 'urgent',
    High: 'high',
    Low: 'low',
    Medium: 'medium',
  };
  return values[priority];
}

export function legacyTaskPriority(
  priority: 'high' | 'low' | 'medium' | 'urgent',
): TaskPriority {
  if (priority === 'high') return 'High';
  if (priority === 'low') return 'Low';
  if (priority === 'urgent') return 'Critical';
  return 'Medium';
}
