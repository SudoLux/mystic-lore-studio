import { X } from 'lucide-react';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '../shared/Button';
import {
  materialRoles,
  materialStatuses,
  type ApparelProject,
  type Fabric,
  type LinkedMaterial,
  type MaterialRole,
  type MaterialStatus,
} from '../../types/studio';
import { calculateFabricYardage } from '../../lib/yardage';

type LinkedMaterialFormModalProps = {
  fabrics: Fabric[];
  linkedMaterials: LinkedMaterial[];
  linkedMaterial?: LinkedMaterial;
  mode: 'create' | 'edit';
  onClose: () => void;
  onSubmit: (linkedMaterial: LinkedMaterial) => void;
  project: ApparelProject;
};

type LinkedMaterialFormValues = {
  fabricId: string;
  neededYards: string;
  notes: string;
  reservedYards: string;
  role: MaterialRole;
  status: MaterialStatus;
  usedYards: string;
};

const inputClassName =
  'min-h-12 w-full rounded-2xl border border-bronze/28 bg-midnight/55 px-4 text-sm text-stardust outline-none transition placeholder:text-stardust/32 focus:border-ember/60 disabled:text-stardust/42';

const textareaClassName =
  'min-h-28 w-full rounded-2xl border border-bronze/28 bg-midnight/55 px-4 py-3 text-sm leading-6 text-stardust outline-none transition placeholder:text-stardust/32 focus:border-ember/60';

export function LinkedMaterialFormModal({
  fabrics,
  linkedMaterials,
  linkedMaterial,
  mode,
  onClose,
  onSubmit,
  project,
}: LinkedMaterialFormModalProps) {
  const [values, setValues] = useState<LinkedMaterialFormValues>(() =>
    linkedMaterial
      ? linkedMaterialToFormValues(linkedMaterial, fabrics)
      : getEmptyFormValues(fabrics),
  );
  const selectedFabric = fabrics.find((fabric) => fabric.id === values.fabricId);
  const yardageSummary = selectedFabric
    ? calculateFabricYardage(selectedFabric, linkedMaterials, [project])
    : undefined;
  const hasMissingLinkedFabric =
    Boolean(linkedMaterial?.fabricId) &&
    !fabrics.some((fabric) => fabric.id === linkedMaterial?.fabricId);
  const fabricOptions = useMemo(
    () => [
      ...(hasMissingLinkedFabric && linkedMaterial?.fabricId
        ? [
            {
              label: `${linkedMaterial.materialName} (missing fabric record)`,
              value: linkedMaterial.fabricId,
            },
          ]
        : []),
      ...fabrics.map((fabric) => ({
        label: `${fabric.name} / ${formatNumber(
          calculateFabricYardage(fabric, linkedMaterials, [project]).availableYards,
        )} yd available`,
        value: fabric.id,
      })),
    ],
    [fabrics, hasMissingLinkedFabric, linkedMaterial, linkedMaterials, project],
  );

  const updateValue = <Key extends keyof LinkedMaterialFormValues>(
    key: Key,
    value: LinkedMaterialFormValues[Key],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(formValuesToLinkedMaterial(values, project, fabrics, linkedMaterial));
  };

  return (
    <div className="studio-scrollbar fixed inset-0 z-50 overflow-y-auto bg-midnight/82 px-3 py-4 backdrop-blur-xl sm:px-5 sm:py-6">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-bronze/30 bg-[linear-gradient(135deg,rgba(45,92,107,0.28),rgba(10,10,10,0.96),rgba(61,43,31,0.58))] shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-bronze/24 bg-midnight/92 p-4 backdrop-blur-xl sm:p-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-ember">
              {mode === 'create' ? 'Link Fabric' : 'Edit Material Link'}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-stardust">
              {project.name} materials
            </h2>
          </div>
          <button
            aria-label="Close material form"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-bronze/30 bg-midnight/65 text-stardust/72 transition hover:border-ember/45 hover:text-stardust"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={1.9} />
          </button>
        </div>

        <form className="space-y-5 p-4 sm:p-6" onSubmit={handleSubmit}>
          <FormSection title="Fabric Relationship">
            <SelectField
              disabled={fabricOptions.length === 0}
              label="Fabric"
              onChange={(value) => updateValue('fabricId', value)}
              options={
                fabricOptions.length > 0
                  ? fabricOptions
                  : [{ label: 'No fabrics available', value: '' }]
              }
              value={values.fabricId}
            />
            <SelectField
              label="Material role"
              onChange={(value) => updateValue('role', value as MaterialRole)}
              options={materialRoles.map((role) => ({ label: role, value: role }))}
              value={values.role}
            />
            <SelectField
              label="Material status"
              onChange={(value) => updateValue('status', value as MaterialStatus)}
              options={materialStatuses.map((status) => ({
                label: status,
                value: status,
              }))}
              value={values.status}
            />
            <TextField
              disabled
              label="Fabric yardage available"
              onChange={() => undefined}
              value={
                yardageSummary === undefined
                  ? 'Unavailable'
                  : `${formatNumber(yardageSummary.availableYards)} yd`
              }
            />
          </FormSection>

          <FormSection title="Yardage">
            <TextField
              label="Yardage needed"
              min={0}
              onChange={(value) => updateValue('neededYards', value)}
              step="0.01"
              type="number"
              value={values.neededYards}
            />
            <TextField
              label="Yardage reserved"
              min={0}
              onChange={(value) => updateValue('reservedYards', value)}
              step="0.01"
              type="number"
              value={values.reservedYards}
            />
            <TextField
              label="Yardage used"
              min={0}
              onChange={(value) => updateValue('usedYards', value)}
              step="0.01"
              type="number"
              value={values.usedYards}
            />
            <TextAreaField
              label="Notes"
              onChange={(value) => updateValue('notes', value)}
              value={values.notes}
            />
          </FormSection>

          <div className="sticky bottom-0 -mx-4 -mb-4 flex flex-col gap-3 border-t border-bronze/24 bg-midnight/92 p-4 backdrop-blur-xl sm:-mx-6 sm:-mb-6 sm:flex-row sm:justify-end sm:p-6">
            <Button onClick={onClose} type="button" variant="ghost">
              Cancel
            </Button>
            <Button disabled={!values.fabricId} type="submit" variant="primary">
              {mode === 'create' ? 'Link Fabric' : 'Save Link'}
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

function SelectField({
  disabled,
  label,
  onChange,
  options,
  value,
}: {
  disabled?: boolean;
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
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value || option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextField({
  disabled,
  label,
  min,
  onChange,
  step,
  type = 'text',
  value,
}: {
  disabled?: boolean;
  label: string;
  min?: number;
  onChange: (value: string) => void;
  step?: string;
  type?: 'number' | 'text';
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-stardust/42">
        {label}
      </span>
      <input
        className={inputClassName}
        disabled={disabled}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        step={step}
        type={type}
        value={value}
      />
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

function getEmptyFormValues(fabrics: Fabric[]): LinkedMaterialFormValues {
  return {
    fabricId: fabrics[0]?.id ?? '',
    neededYards: '0',
    notes: '',
    reservedYards: '0',
    role: 'Shell Fabric',
    status: 'Selected',
    usedYards: '0',
  };
}

function linkedMaterialToFormValues(
  linkedMaterial: LinkedMaterial,
  fabrics: Fabric[],
): LinkedMaterialFormValues {
  return {
    fabricId: linkedMaterial.fabricId ?? fabrics[0]?.id ?? '',
    neededYards: linkedMaterial.neededYards.toString(),
    notes: linkedMaterial.notes ?? '',
    reservedYards: linkedMaterial.reservedYards.toString(),
    role: linkedMaterial.role,
    status: linkedMaterial.status,
    usedYards: linkedMaterial.usedYards.toString(),
  };
}

function formValuesToLinkedMaterial(
  values: LinkedMaterialFormValues,
  project: ApparelProject,
  fabrics: Fabric[],
  existingMaterial?: LinkedMaterial,
): LinkedMaterial {
  const fabric = fabrics.find((item) => item.id === values.fabricId);

  return {
    fabricId: values.fabricId || undefined,
    id: existingMaterial?.id ?? createLinkedMaterialId(project.id, fabric?.name),
    materialName:
      fabric?.name ?? existingMaterial?.materialName ?? 'Unlinked material',
    neededYards: parseNumber(values.neededYards),
    notes: values.notes.trim() || undefined,
    projectId: project.id,
    reservedYards: parseNumber(values.reservedYards),
    role: values.role,
    status: values.status,
    usedYards: parseNumber(values.usedYards),
  };
}

function createLinkedMaterialId(projectId: string, fabricName = 'material') {
  const slug = `${projectId}-${fabricName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 56);

  return `link-${slug || 'material'}-${Date.now().toString(36)}`;
}


function parseNumber(value: string) {
  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    return 0;
  }

  return Math.max(0, parsed);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(value);
}
