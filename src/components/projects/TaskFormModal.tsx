import { X } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '../shared/Button';
import {
  taskCategories,
  taskStatuses,
  type ApparelProject,
  type LinkedMaterial,
  type StudioTask,
  type TaskCategory,
  type TaskPriority,
  type TaskStatus,
} from '../../types/studio';

type TaskFormModalProps = {
  mode: 'create' | 'edit';
  onClose: () => void;
  onSubmit: (task: StudioTask) => void;
  project: ApparelProject;
  task?: StudioTask;
};

type TaskFormValues = {
  category: TaskCategory;
  description: string;
  dueDate: string;
  linkedMaterialId: string;
  notes: string;
  priority: TaskPriority;
  status: TaskStatus;
  title: string;
};

const priorities: TaskPriority[] = ['Low', 'Medium', 'High', 'Critical'];

const inputClassName =
  'min-h-12 w-full rounded-2xl border border-bronze/28 bg-midnight/55 px-4 text-sm text-stardust outline-none transition placeholder:text-stardust/32 focus:border-ember/60';

const textareaClassName =
  'min-h-28 w-full rounded-2xl border border-bronze/28 bg-midnight/55 px-4 py-3 text-sm leading-6 text-stardust outline-none transition placeholder:text-stardust/32 focus:border-ember/60';

export function TaskFormModal({
  mode,
  onClose,
  onSubmit,
  project,
  task,
}: TaskFormModalProps) {
  const [values, setValues] = useState<TaskFormValues>(() =>
    task ? taskToFormValues(task) : getEmptyFormValues(project),
  );

  const updateValue = <Key extends keyof TaskFormValues>(
    key: Key,
    value: TaskFormValues[Key],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(formValuesToTask(values, project, task));
  };

  return (
    <div className="studio-scrollbar fixed inset-0 z-50 overflow-y-auto bg-midnight/82 px-3 py-4 backdrop-blur-xl sm:px-5 sm:py-6">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-bronze/30 bg-[linear-gradient(135deg,rgba(27,58,99,0.28),rgba(10,10,10,0.96),rgba(61,43,31,0.58))] shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-bronze/24 bg-midnight/92 p-4 backdrop-blur-xl sm:p-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-ember">
              {mode === 'create' ? 'Add Task' : 'Edit Task'}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-stardust">
              {mode === 'create' ? `${project.name} task` : values.title}
            </h2>
          </div>
          <button
            aria-label="Close task form"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-bronze/30 bg-midnight/65 text-stardust/72 transition hover:border-ember/45 hover:text-stardust"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={1.9} />
          </button>
        </div>

        <form className="space-y-5 p-4 sm:p-6" onSubmit={handleSubmit}>
          <FormSection title="Task Brief">
            <TextField
              label="Title"
              onChange={(value) => updateValue('title', value)}
              required
              value={values.title}
            />
            <SelectField
              label="Linked fabric/material"
              onChange={(value) => updateValue('linkedMaterialId', value)}
              options={[
                { label: 'No linked material', value: '' },
                ...project.linkedMaterials.map(materialToOption),
              ]}
              value={values.linkedMaterialId}
            />
            <TextAreaField
              label="Description"
              onChange={(value) => updateValue('description', value)}
              value={values.description}
            />
            <TextAreaField
              label="Notes"
              onChange={(value) => updateValue('notes', value)}
              value={values.notes}
            />
          </FormSection>

          <FormSection title="Workflow">
            <SelectField
              label="Status"
              onChange={(value) => updateValue('status', value as TaskStatus)}
              options={taskStatuses.map((status) => ({
                label: status,
                value: status,
              }))}
              value={values.status}
            />
            <SelectField
              label="Category"
              onChange={(value) => updateValue('category', value as TaskCategory)}
              options={taskCategories.map((category) => ({
                label: category,
                value: category,
              }))}
              value={values.category}
            />
            <SelectField
              label="Priority"
              onChange={(value) => updateValue('priority', value as TaskPriority)}
              options={priorities.map((priority) => ({
                label: priority,
                value: priority,
              }))}
              value={values.priority}
            />
            <TextField
              label="Due date"
              onChange={(value) => updateValue('dueDate', value)}
              type="date"
              value={values.dueDate}
            />
          </FormSection>

          <div className="sticky bottom-0 -mx-4 -mb-4 flex flex-col gap-3 border-t border-bronze/24 bg-midnight/92 p-4 backdrop-blur-xl sm:-mx-6 sm:-mb-6 sm:flex-row sm:justify-end sm:p-6">
            <Button onClick={onClose} type="button" variant="ghost">
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {mode === 'create' ? 'Add Task' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-3xl border border-bronze/28 bg-[linear-gradient(145deg,rgba(237,227,207,0.06),rgba(10,10,10,0.18))] p-4 shadow-[inset_0_1px_0_rgba(237,227,207,0.035)] sm:p-5">
      <h3 className="text-lg font-semibold text-stardust">{title}</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function TextField({
  label,
  onChange,
  required,
  type = 'text',
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: 'date' | 'text';
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-stardust/42">
        {label}
      </span>
      <input
        className={inputClassName}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-stardust/42">
        {label}
      </span>
      <select
        className={inputClassName}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value || 'none'} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextAreaField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block md:col-span-2">
      <span className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-stardust/42">
        {label}
      </span>
      <textarea
        className={textareaClassName}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function getEmptyFormValues(project: ApparelProject): TaskFormValues {
  return {
    category: getDefaultCategory(project),
    description: '',
    dueDate: '',
    linkedMaterialId: '',
    notes: '',
    priority: 'Medium',
    status: 'To Do',
    title: '',
  };
}

function taskToFormValues(task: StudioTask): TaskFormValues {
  return {
    category: task.category,
    description: task.description,
    dueDate: task.dueDate ?? '',
    linkedMaterialId: task.linkedMaterialId ?? '',
    notes: task.notes ?? '',
    priority: task.priority,
    status: task.status,
    title: task.title,
  };
}

function formValuesToTask(
  values: TaskFormValues,
  project: ApparelProject,
  existingTask?: StudioTask,
): StudioTask {
  const safeTitle = values.title.trim() || 'Untitled Task';
  const linkedMaterialId = values.linkedMaterialId || undefined;

  return {
    category: values.category,
    description: values.description.trim(),
    dueDate: values.dueDate || undefined,
    id: existingTask?.id ?? createTaskId(safeTitle),
    linkedMaterialId,
    notes: values.notes.trim() || undefined,
    phase: existingTask?.phase ?? project.phase,
    priority: values.priority,
    projectId: project.id,
    status: values.status,
    title: safeTitle,
  };
}

function materialToOption(material: LinkedMaterial) {
  return {
    label: `${material.materialName} / ${material.role}`,
    value: material.id,
  };
}

function getDefaultCategory(project: ApparelProject): TaskCategory {
  if (project.phase === 'Materials') {
    return 'Fabric';
  }

  if (project.phase === 'Pattern Drafting') {
    return 'Pattern';
  }

  if (project.phase === 'Sample Sewing' || project.phase === 'Final Build') {
    return 'Sewing';
  }

  if (project.phase === 'Fitting') {
    return 'Fitting';
  }

  if (project.phase === 'Revision') {
    return 'Revision';
  }

  if (project.phase === 'Photoshoot') {
    return 'Photography';
  }

  if (project.phase === 'Lookbook Ready') {
    return 'Lookbook';
  }

  if (project.phase === 'Research') {
    return 'Research';
  }

  return 'Concept';
}

function createTaskId(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);

  return `task-${slug || 'untitled'}-${Date.now().toString(36)}`;
}
