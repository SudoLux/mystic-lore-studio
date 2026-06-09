import { X } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '../shared/Button';
import {
  noteCategories,
  type ApparelProject,
  type NoteCategory,
  type StudioNote,
} from '../../types/studio';

type NoteFormModalProps = {
  mode: 'create' | 'edit';
  note?: StudioNote;
  onClose: () => void;
  onSubmit: (note: StudioNote) => void;
  project: ApparelProject;
};

type NoteFormValues = {
  body: string;
  category: NoteCategory;
  title: string;
};

const inputClassName =
  'min-h-12 w-full rounded-2xl border border-bronze/28 bg-midnight/55 px-4 text-sm text-stardust outline-none transition placeholder:text-stardust/32 focus:border-ember/60';

const textareaClassName =
  'min-h-36 w-full rounded-2xl border border-bronze/28 bg-midnight/55 px-4 py-3 text-sm leading-6 text-stardust outline-none transition placeholder:text-stardust/32 focus:border-ember/60';

export function NoteFormModal({
  mode,
  note,
  onClose,
  onSubmit,
  project,
}: NoteFormModalProps) {
  const [values, setValues] = useState<NoteFormValues>(() =>
    note ? noteToFormValues(note) : getEmptyFormValues(),
  );

  const updateValue = <Key extends keyof NoteFormValues>(
    key: Key,
    value: NoteFormValues[Key],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(formValuesToNote(values, project, note));
  };

  return (
    <div className="studio-scrollbar fixed inset-0 z-50 overflow-y-auto bg-midnight/82 px-3 py-4 backdrop-blur-xl sm:px-5 sm:py-6">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-bronze/30 bg-[linear-gradient(135deg,rgba(27,58,99,0.28),rgba(10,10,10,0.96),rgba(61,43,31,0.58))] shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-bronze/24 bg-midnight/92 p-4 backdrop-blur-xl sm:p-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-ember">
              {mode === 'create' ? 'Add Note' : 'Edit Note'}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-stardust">
              {mode === 'create' ? `${project.name} journal note` : values.title}
            </h2>
          </div>
          <button
            aria-label="Close note form"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-bronze/30 bg-midnight/65 text-stardust/72 transition hover:border-ember/45 hover:text-stardust"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={1.9} />
          </button>
        </div>

        <form className="space-y-5 p-4 sm:p-6" onSubmit={handleSubmit}>
          <FormSection title="Journal Entry">
            <TextField
              label="Title"
              onChange={(value) => updateValue('title', value)}
              required
              value={values.title}
            />
            <SelectField
              label="Category"
              onChange={(value) => updateValue('category', value as NoteCategory)}
              value={values.category}
            />
            <TextAreaField
              label="Body"
              onChange={(value) => updateValue('body', value)}
              required
              value={values.body}
            />
          </FormSection>

          <div className="sticky bottom-0 -mx-4 -mb-4 flex flex-col gap-3 border-t border-bronze/24 bg-midnight/92 p-4 backdrop-blur-xl sm:-mx-6 sm:-mb-6 sm:flex-row sm:justify-end sm:p-6">
            <Button onClick={onClose} type="button" variant="ghost">
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {mode === 'create' ? 'Add Note' : 'Save Changes'}
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
  onChange,
  required,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
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
        type="text"
        value={value}
      />
    </label>
  );
}

function SelectField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
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
        {noteCategories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextAreaField({
  label,
  onChange,
  required,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
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
        required={required}
        value={value}
      />
    </label>
  );
}

function getEmptyFormValues(): NoteFormValues {
  return {
    body: '',
    category: 'Design Note',
    title: '',
  };
}

function noteToFormValues(note: StudioNote): NoteFormValues {
  return {
    body: note.body,
    category: note.category,
    title: note.title,
  };
}

function formValuesToNote(
  values: NoteFormValues,
  project: ApparelProject,
  existingNote?: StudioNote,
): StudioNote {
  const today = todayString();
  const safeTitle = values.title.trim() || 'Untitled Note';

  return {
    body: values.body.trim(),
    category: values.category,
    createdAt: existingNote?.createdAt ?? today,
    id: existingNote?.id ?? createNoteId(safeTitle),
    projectId: project.id,
    title: safeTitle,
    updatedAt: existingNote ? today : undefined,
  };
}

function createNoteId(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);

  return `note-${slug || 'untitled'}-${Date.now().toString(36)}`;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}
