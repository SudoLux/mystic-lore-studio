import { X } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '../shared/Button';
import {
  garmentTypes,
  projectPhases,
  projectStatuses,
  type ApparelProject,
  type GarmentType,
  type ProjectDifficulty,
  type ProjectPhase,
  type ProjectStatus,
  type TaskPriority,
} from '../../types/studio';
import type { StoredProject } from '../../lib/studioStorage';

type ProjectFormModalProps = {
  mode: 'create' | 'edit';
  onClose: () => void;
  onSubmit: (project: StoredProject) => void;
  project?: ApparelProject;
};

type ProjectFormValues = {
  collection: string;
  colorStory: string;
  designIntent: string;
  difficulty: ProjectDifficulty;
  garmentType: GarmentType;
  generalNotes: string;
  keyFeatures: string;
  phase: ProjectPhase;
  priority: TaskPriority;
  progress: string;
  season: string;
  silhouette: string;
  startDate: string;
  status: ProjectStatus;
  summary: string;
  targetDate: string;
  targetWearer: string;
  title: string;
};

const priorities: TaskPriority[] = ['Low', 'Medium', 'High', 'Critical'];
const difficulties: ProjectDifficulty[] = [
  'Light',
  'Moderate',
  'Advanced',
  'Masterwork',
];

const inputClassName =
  'min-h-12 w-full rounded-2xl border border-bronze/28 bg-midnight/55 px-4 text-sm text-stardust outline-none transition placeholder:text-stardust/32 focus:border-ember/60';

const textareaClassName =
  'min-h-28 w-full rounded-2xl border border-bronze/28 bg-midnight/55 px-4 py-3 text-sm leading-6 text-stardust outline-none transition placeholder:text-stardust/32 focus:border-ember/60';

export function ProjectFormModal({
  mode,
  onClose,
  onSubmit,
  project,
}: ProjectFormModalProps) {
  const [values, setValues] = useState<ProjectFormValues>(() =>
    project ? projectToFormValues(project) : getEmptyFormValues(),
  );

  const updateValue = <Key extends keyof ProjectFormValues>(
    key: Key,
    value: ProjectFormValues[Key],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(formValuesToProject(values, project));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-midnight/82 px-3 py-4 backdrop-blur-xl sm:px-5 sm:py-6">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-bronze/30 bg-[linear-gradient(135deg,rgba(27,58,99,0.28),rgba(10,10,10,0.96),rgba(61,43,31,0.58))] shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-bronze/24 bg-midnight/92 p-4 backdrop-blur-xl sm:p-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-ember">
              {mode === 'create' ? 'New Project' : 'Edit Project'}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-stardust">
              {mode === 'create' ? 'Create garment project' : values.title}
            </h2>
          </div>
          <button
            aria-label="Close project form"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-bronze/30 bg-midnight/65 text-stardust/72 transition hover:border-ember/45 hover:text-stardust"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={1.9} />
          </button>
        </div>

        <form className="space-y-5 p-4 sm:p-6" onSubmit={handleSubmit}>
          <FormSection title="Project Identity">
            <TextField
              label="Title"
              onChange={(value) => updateValue('title', value)}
              required
              value={values.title}
            />
            <SelectField
              label="Garment type"
              onChange={(value) => updateValue('garmentType', value as GarmentType)}
              options={garmentTypes}
              value={values.garmentType}
            />
            <TextField
              label="Collection"
              onChange={(value) => updateValue('collection', value)}
              value={values.collection}
            />
            <TextField
              label="Season"
              onChange={(value) => updateValue('season', value)}
              value={values.season}
            />
          </FormSection>

          <FormSection title="Workflow">
            <SelectField
              label="Status"
              onChange={(value) => updateValue('status', value as ProjectStatus)}
              options={projectStatuses}
              value={values.status}
            />
            <SelectField
              label="Workflow phase"
              onChange={(value) => updateValue('phase', value as ProjectPhase)}
              options={projectPhases}
              value={values.phase}
            />
            <SelectField
              label="Priority"
              onChange={(value) => updateValue('priority', value as TaskPriority)}
              options={priorities}
              value={values.priority}
            />
            <SelectField
              label="Difficulty"
              onChange={(value) =>
                updateValue('difficulty', value as ProjectDifficulty)
              }
              options={difficulties}
              value={values.difficulty}
            />
            <TextField
              label="Progress percentage"
              max={100}
              min={0}
              onChange={(value) => updateValue('progress', value)}
              type="number"
              value={values.progress}
            />
          </FormSection>

          <FormSection title="Creative Brief">
            <TextAreaField
              label="Design intent"
              onChange={(value) => updateValue('designIntent', value)}
              value={values.designIntent}
            />
            <TextAreaField
              label="Description"
              onChange={(value) => updateValue('summary', value)}
              value={values.summary}
            />
            <TextAreaField
              label="Target wearer"
              onChange={(value) => updateValue('targetWearer', value)}
              value={values.targetWearer}
            />
            <TextAreaField
              label="Silhouette"
              onChange={(value) => updateValue('silhouette', value)}
              value={values.silhouette}
            />
            <TextAreaField
              helper="One feature per line."
              label="Key features"
              onChange={(value) => updateValue('keyFeatures', value)}
              value={values.keyFeatures}
            />
            <TextAreaField
              label="Color story"
              onChange={(value) => updateValue('colorStory', value)}
              value={values.colorStory}
            />
            <TextAreaField
              label="General notes"
              onChange={(value) => updateValue('generalNotes', value)}
              value={values.generalNotes}
            />
          </FormSection>

          <FormSection title="Schedule">
            <TextField
              label="Start date"
              onChange={(value) => updateValue('startDate', value)}
              type="date"
              value={values.startDate}
            />
            <TextField
              label="Due date"
              onChange={(value) => updateValue('targetDate', value)}
              type="date"
              value={values.targetDate}
            />
          </FormSection>

          <div className="sticky bottom-0 -mx-4 -mb-4 flex flex-col gap-3 border-t border-bronze/24 bg-midnight/92 p-4 backdrop-blur-xl sm:-mx-6 sm:-mb-6 sm:flex-row sm:justify-end sm:p-6">
            <Button onClick={onClose} type="button" variant="ghost">
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {mode === 'create' ? 'Create Project' : 'Save Changes'}
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
    <section className="rounded-3xl border border-bronze/24 bg-stardust/[0.045] p-4 sm:p-5">
      <h3 className="text-lg font-semibold text-stardust">{title}</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function TextField({
  label,
  max,
  min,
  onChange,
  required,
  type = 'text',
  value,
}: {
  label: string;
  max?: number;
  min?: number;
  onChange: (value: string) => void;
  required?: boolean;
  type?: 'date' | 'number' | 'text';
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-stardust/42">
        {label}
      </span>
      <input
        className={inputClassName}
        max={max}
        min={min}
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
  options: readonly string[];
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
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextAreaField({
  helper,
  label,
  onChange,
  value,
}: {
  helper?: string;
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
      {helper ? <span className="mt-2 block text-xs text-stardust/42">{helper}</span> : null}
    </label>
  );
}

function getEmptyFormValues(): ProjectFormValues {
  return {
    collection: 'Mystic Lore Core',
    colorStory: '',
    designIntent: '',
    difficulty: 'Moderate',
    garmentType: 'Jacket',
    generalNotes: '',
    keyFeatures: '',
    phase: 'Concept',
    priority: 'Medium',
    progress: '0',
    season: 'Fall 2026',
    silhouette: '',
    startDate: new Date().toISOString().slice(0, 10),
    status: 'Idea',
    summary: '',
    targetDate: '',
    targetWearer: '',
    title: '',
  };
}

function projectToFormValues(project: ApparelProject): ProjectFormValues {
  return {
    collection: project.collection,
    colorStory: project.colorStory,
    designIntent: project.designIntent,
    difficulty: project.difficulty,
    garmentType: project.garmentType,
    generalNotes: project.generalNotes,
    keyFeatures: project.keyFeatures.join('\n'),
    phase: project.phase,
    priority: project.priority,
    progress: project.progress.toString(),
    season: project.season,
    silhouette: project.silhouette,
    startDate: project.startDate,
    status: project.status,
    summary: project.summary,
    targetDate: project.targetDate ?? '',
    targetWearer: project.targetWearer,
    title: project.name,
  };
}

function formValuesToProject(
  values: ProjectFormValues,
  existingProject?: ApparelProject,
): StoredProject {
  const keyFeatures = values.keyFeatures
    .split('\n')
    .map((feature) => feature.trim())
    .filter(Boolean);
  const safeTitle = values.title.trim() || 'Untitled Project';

  return {
    collection: values.collection.trim() || 'Unassigned',
    colorStory: values.colorStory.trim(),
    designIntent: values.designIntent.trim(),
    difficulty: values.difficulty,
    garmentType: values.garmentType,
    galleryImages: existingProject?.galleryImages,
    generalNotes: values.generalNotes.trim(),
    heroImage: existingProject?.heroImage,
    id: existingProject?.id ?? createProjectId(safeTitle),
    keyFeatures,
    name: safeTitle,
    phase: values.phase,
    priority: values.priority,
    progress: clampProgress(values.progress),
    season: values.season.trim() || 'Unscheduled',
    silhouette: values.silhouette.trim(),
    startDate: values.startDate || new Date().toISOString().slice(0, 10),
    status: values.status,
    summary: values.summary.trim(),
    tags: buildProjectTags(values, keyFeatures),
    targetDate: values.targetDate || undefined,
    targetWearer: values.targetWearer.trim(),
  };
}

function buildProjectTags(values: ProjectFormValues, keyFeatures: string[]) {
  return Array.from(
    new Set(
      [values.garmentType, values.collection, ...keyFeatures]
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  ).slice(0, 8);
}

function clampProgress(value: string) {
  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function createProjectId(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);

  return `project-${slug || 'untitled'}-${Date.now().toString(36)}`;
}
