import { X } from 'lucide-react';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '../shared/Button';
import type {
  Fabric,
  FabricArchiveStatus,
  FabricDrape,
  FabricOpacity,
  FabricRarity,
  FabricStatus,
  FabricStorageStatus,
  FabricStretch,
  FabricWeight,
} from '../../types/studio';

type FabricFormModalProps = {
  fabric?: Fabric;
  mode: 'create' | 'edit';
  onClose: () => void;
  onSubmit: (fabric: Fabric) => void;
};

type FabricFormValues = {
  archiveStatus: FabricArchiveStatus;
  bestUses: string;
  binNumber: string;
  careNotes: string;
  category: string;
  colorFamily: string;
  composition: string;
  costPerYard: string;
  drape: FabricDrape;
  handFeel: string;
  loreNote: string;
  moodTags: string;
  name: string;
  opacity: FabricOpacity;
  primaryColor: string;
  purchaseDate: string;
  rarity: FabricRarity;
  reservedYards: string;
  secondaryColors: string;
  shelf: string;
  storageLocation: string;
  storageStatus: FabricStorageStatus;
  stretch: FabricStretch;
  structure: string;
  supplier: string;
  texture: string;
  totalYards: string;
  usedYards: string;
  weaveOrKnit: string;
  weight: FabricWeight;
  widthInches: string;
};

const archiveStatuses: FabricArchiveStatus[] = [
  'Active',
  'Reserved',
  'Low Yardage',
  'Archived',
  'Depleted',
];
const drapes: FabricDrape[] = ['Crisp', 'Structured', 'Fluid', 'Soft', 'Stretch'];
const opacities: FabricOpacity[] = ['Sheer', 'Semi-sheer', 'Opaque'];
const rarities: FabricRarity[] = [
  'Core',
  'Seasonal',
  'Rare',
  'One-off',
  'Archive',
];
const storageStatuses: FabricStorageStatus[] = [
  'Filed',
  'Reserved',
  'In Use',
  'Low Yardage',
  'Depleted',
];
const stretches: FabricStretch[] = ['None', 'Mechanical', 'Two-way', 'Four-way'];
const weights: FabricWeight[] = ['Light', 'Medium', 'Heavy'];

const inputClassName =
  'min-h-12 w-full rounded-2xl border border-bronze/28 bg-midnight/55 px-4 text-sm text-stardust outline-none transition placeholder:text-stardust/32 focus:border-ember/60 disabled:text-stardust/48';

const textareaClassName =
  'min-h-28 w-full rounded-2xl border border-bronze/28 bg-midnight/55 px-4 py-3 text-sm leading-6 text-stardust outline-none transition placeholder:text-stardust/32 focus:border-ember/60';

export function FabricFormModal({
  fabric,
  mode,
  onClose,
  onSubmit,
}: FabricFormModalProps) {
  const [values, setValues] = useState<FabricFormValues>(() =>
    fabric ? fabricToFormValues(fabric) : getEmptyFormValues(),
  );
  const yardageRemaining = useMemo(
    () =>
      Math.max(
        0,
        parseNumber(values.totalYards) -
          parseNumber(values.reservedYards) -
          parseNumber(values.usedYards),
      ),
    [values.reservedYards, values.totalYards, values.usedYards],
  );
  const totalCost = useMemo(
    () => parseNumber(values.totalYards) * parseNumber(values.costPerYard),
    [values.costPerYard, values.totalYards],
  );

  const updateValue = <Key extends keyof FabricFormValues>(
    key: Key,
    value: FabricFormValues[Key],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(formValuesToFabric(values, fabric));
  };

  return (
    <div className="studio-scrollbar fixed inset-0 z-50 overflow-y-auto bg-midnight/82 px-3 py-4 backdrop-blur-xl sm:px-5 sm:py-6">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-bronze/30 bg-[linear-gradient(135deg,rgba(45,92,107,0.26),rgba(10,10,10,0.96),rgba(61,43,31,0.58))] shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-bronze/24 bg-midnight/92 p-4 backdrop-blur-xl sm:p-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-ember">
              {mode === 'create' ? 'Add Fabric' : 'Edit Fabric'}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-stardust">
              {mode === 'create' ? 'Create fabric record' : values.name}
            </h2>
          </div>
          <button
            aria-label="Close fabric form"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-bronze/30 bg-midnight/65 text-stardust/72 transition hover:border-ember/45 hover:text-stardust"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={1.9} />
          </button>
        </div>

        <form className="space-y-5 p-4 sm:p-6" onSubmit={handleSubmit}>
          <FormSection title="Fabric Identity">
            <TextField
              label="Name"
              onChange={(value) => updateValue('name', value)}
              required
              value={values.name}
            />
            <TextField
              label="Fabric type"
              onChange={(value) => updateValue('category', value)}
              required
              value={values.category}
            />
            <TextField
              label="Color family"
              onChange={(value) => updateValue('colorFamily', value)}
              value={values.colorFamily}
            />
            <TextField
              label="Primary color"
              onChange={(value) => updateValue('primaryColor', value)}
              value={values.primaryColor}
            />
            <TextField
              label="Secondary colors"
              onChange={(value) => updateValue('secondaryColors', value)}
              value={values.secondaryColors}
            />
            <TextField
              label="Supplier/source"
              onChange={(value) => updateValue('supplier', value)}
              value={values.supplier}
            />
          </FormSection>

          <FormSection title="Yardage and Cost">
            <TextField
              label="Yardage total"
              min={0}
              onChange={(value) => updateValue('totalYards', value)}
              step="0.01"
              type="number"
              value={values.totalYards}
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
            <TextField
              disabled
              label="Yardage remaining"
              onChange={() => undefined}
              value={`${formatNumber(yardageRemaining)} yd`}
            />
            <TextField
              label="Cost per yard"
              min={0}
              onChange={(value) => updateValue('costPerYard', value)}
              step="0.01"
              type="number"
              value={values.costPerYard}
            />
            <TextField
              disabled
              label="Total cost"
              onChange={() => undefined}
              value={formatCurrency(totalCost)}
            />
          </FormSection>

          <FormSection title="Material Specs">
            <TextField
              label="Width inches"
              min={0}
              onChange={(value) => updateValue('widthInches', value)}
              step="0.01"
              type="number"
              value={values.widthInches}
            />
            <TextField
              label="Fiber content"
              onChange={(value) => updateValue('composition', value)}
              value={values.composition}
            />
            <TextField
              label="Weave or knit"
              onChange={(value) => updateValue('weaveOrKnit', value)}
              value={values.weaveOrKnit}
            />
            <SelectField
              label="Weight"
              onChange={(value) => updateValue('weight', value as FabricWeight)}
              options={weights}
              value={values.weight}
            />
            <SelectField
              label="Stretch"
              onChange={(value) => updateValue('stretch', value as FabricStretch)}
              options={stretches}
              value={values.stretch}
            />
            <SelectField
              label="Opacity"
              onChange={(value) => updateValue('opacity', value as FabricOpacity)}
              options={opacities}
              value={values.opacity}
            />
            <SelectField
              label="Drape"
              onChange={(value) => updateValue('drape', value as FabricDrape)}
              options={drapes}
              value={values.drape}
            />
            <TextField
              label="Hand feel"
              onChange={(value) => updateValue('handFeel', value)}
              value={values.handFeel}
            />
            <TextField
              label="Texture"
              onChange={(value) => updateValue('texture', value)}
              value={values.texture}
            />
            <TextField
              label="Structure"
              onChange={(value) => updateValue('structure', value)}
              value={values.structure}
            />
          </FormSection>

          <FormSection title="Storage and Status">
            <TextField
              label="Purchase date"
              onChange={(value) => updateValue('purchaseDate', value)}
              type="date"
              value={values.purchaseDate}
            />
            <TextField
              label="Storage location"
              onChange={(value) => updateValue('storageLocation', value)}
              value={values.storageLocation}
            />
            <TextField
              label="Bin number"
              onChange={(value) => updateValue('binNumber', value)}
              value={values.binNumber}
            />
            <TextField
              label="Shelf"
              onChange={(value) => updateValue('shelf', value)}
              value={values.shelf}
            />
            <SelectField
              label="Storage status"
              onChange={(value) =>
                updateValue('storageStatus', value as FabricStorageStatus)
              }
              options={storageStatuses}
              value={values.storageStatus}
            />
            <SelectField
              label="Archive status"
              onChange={(value) =>
                updateValue('archiveStatus', value as FabricArchiveStatus)
              }
              options={archiveStatuses}
              value={values.archiveStatus}
            />
            <SelectField
              label="Rarity"
              onChange={(value) => updateValue('rarity', value as FabricRarity)}
              options={rarities}
              value={values.rarity}
            />
          </FormSection>

          <FormSection title="Use and Lore">
            <TextAreaField
              helper="Separate uses with commas or line breaks."
              label="Best uses"
              onChange={(value) => updateValue('bestUses', value)}
              value={values.bestUses}
            />
            <TextAreaField
              label="Care notes"
              onChange={(value) => updateValue('careNotes', value)}
              value={values.careNotes}
            />
            <TextAreaField
              helper="Separate mood tags with commas or line breaks."
              label="Mood tags"
              onChange={(value) => updateValue('moodTags', value)}
              value={values.moodTags}
            />
            <TextAreaField
              label="Lore note"
              onChange={(value) => updateValue('loreNote', value)}
              value={values.loreNote}
            />
          </FormSection>

          <div className="sticky bottom-0 -mx-4 -mb-4 flex flex-col gap-3 border-t border-bronze/24 bg-midnight/92 p-4 backdrop-blur-xl sm:-mx-6 sm:-mb-6 sm:flex-row sm:justify-end sm:p-6">
            <Button onClick={onClose} type="button" variant="ghost">
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {mode === 'create' ? 'Add Fabric' : 'Save Changes'}
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
  disabled,
  label,
  max,
  min,
  onChange,
  required,
  step,
  type = 'text',
  value,
}: {
  disabled?: boolean;
  label: string;
  max?: number;
  min?: number;
  onChange: (value: string) => void;
  required?: boolean;
  step?: string;
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
        disabled={disabled}
        max={max}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        step={step}
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
      {helper ? (
        <span className="mt-2 block text-xs text-stardust/42">{helper}</span>
      ) : null}
    </label>
  );
}

function getEmptyFormValues(): FabricFormValues {
  return {
    archiveStatus: 'Active',
    bestUses: '',
    binNumber: '',
    careNotes: '',
    category: '',
    colorFamily: '',
    composition: '',
    costPerYard: '0',
    drape: 'Structured',
    handFeel: '',
    loreNote: '',
    moodTags: '',
    name: '',
    opacity: 'Opaque',
    primaryColor: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    rarity: 'Core',
    reservedYards: '0',
    secondaryColors: '',
    shelf: '',
    storageLocation: '',
    storageStatus: 'Filed',
    stretch: 'None',
    structure: '',
    supplier: '',
    texture: '',
    totalYards: '0',
    usedYards: '0',
    weaveOrKnit: '',
    weight: 'Medium',
    widthInches: '0',
  };
}

function fabricToFormValues(fabric: Fabric): FabricFormValues {
  return {
    archiveStatus: fabric.archiveStatus,
    bestUses: fabric.bestUses.join('\n'),
    binNumber: fabric.binNumber,
    careNotes: fabric.careNotes,
    category: fabric.category,
    colorFamily: fabric.colorFamily,
    composition: fabric.composition,
    costPerYard: fabric.costPerYard.toString(),
    drape: fabric.drape,
    handFeel: fabric.handFeel,
    loreNote: fabric.loreNote,
    moodTags: fabric.moodTags.join('\n'),
    name: fabric.name,
    opacity: fabric.opacity,
    primaryColor: fabric.primaryColor,
    purchaseDate: fabric.purchaseDate,
    rarity: fabric.rarity,
    reservedYards: fabric.reservedYards.toString(),
    secondaryColors: fabric.secondaryColors.join('\n'),
    shelf: fabric.shelf,
    storageLocation: fabric.storageLocation,
    storageStatus: fabric.storageStatus,
    stretch: fabric.stretch,
    structure: fabric.structure,
    supplier: fabric.supplier,
    texture: fabric.texture,
    totalYards: fabric.totalYards.toString(),
    usedYards: fabric.usedYards.toString(),
    weaveOrKnit: fabric.weaveOrKnit,
    weight: fabric.weight,
    widthInches: fabric.widthInches.toString(),
  };
}

function formValuesToFabric(
  values: FabricFormValues,
  existingFabric?: Fabric,
): Fabric {
  const safeName = values.name.trim() || 'Untitled Fabric';
  const secondaryColors = parseList(values.secondaryColors);
  const bestUses = parseList(values.bestUses);
  const moodTags = parseList(values.moodTags);
  const totalYards = parseNumber(values.totalYards);
  const reservedYards = parseNumber(values.reservedYards);
  const usedYards = parseNumber(values.usedYards);
  const costPerYard = parseNumber(values.costPerYard);
  const status = getFabricStatus({
    archiveStatus: values.archiveStatus,
    reservedYards,
    storageStatus: values.storageStatus,
    totalYards,
    usedYards,
  });

  return {
    archiveStatus: values.archiveStatus,
    bestUses,
    binNumber: values.binNumber.trim(),
    careNotes: values.careNotes.trim(),
    category: values.category.trim() || 'Uncategorized',
    colorFamily: values.colorFamily.trim() || values.primaryColor.trim(),
    composition: values.composition.trim(),
    costPerYard,
    drape: values.drape,
    handFeel: values.handFeel.trim(),
    id: existingFabric?.id ?? createFabricId(safeName),
    image: existingFabric?.image,
    loreNote: values.loreNote.trim(),
    moodTags,
    name: safeName,
    notes: values.loreNote.trim() || existingFabric?.notes || '',
    opacity: values.opacity,
    primaryColor: values.primaryColor.trim() || values.colorFamily.trim(),
    purchaseDate:
      values.purchaseDate || existingFabric?.purchaseDate || todayString(),
    rarity: values.rarity,
    reservedYards,
    secondaryColors,
    shelf: values.shelf.trim(),
    status,
    storageLocation: values.storageLocation.trim(),
    storageStatus: values.storageStatus,
    stretch: values.stretch,
    structure: values.structure.trim(),
    supplier: values.supplier.trim(),
    tags: buildFabricTags(values, bestUses, moodTags),
    texture: values.texture.trim(),
    totalYards,
    updatedAt: todayString(),
    usedYards,
    weaveOrKnit: values.weaveOrKnit.trim(),
    weight: values.weight,
    widthInches: parseNumber(values.widthInches),
  };
}

function getFabricStatus({
  archiveStatus,
  reservedYards,
  storageStatus,
  totalYards,
  usedYards,
}: {
  archiveStatus: FabricArchiveStatus;
  reservedYards: number;
  storageStatus: FabricStorageStatus;
  totalYards: number;
  usedYards: number;
}): FabricStatus {
  const remainingYards = totalYards - reservedYards - usedYards;

  if (
    archiveStatus === 'Depleted' ||
    storageStatus === 'Depleted' ||
    remainingYards <= 0
  ) {
    return 'Depleted';
  }

  if (archiveStatus === 'Reserved' || storageStatus === 'Reserved') {
    return 'Reserved';
  }

  if (
    archiveStatus === 'Low Yardage' ||
    storageStatus === 'Low Yardage' ||
    remainingYards <= 5
  ) {
    return 'Low Stock';
  }

  return 'In Stock';
}

function buildFabricTags(
  values: FabricFormValues,
  bestUses: string[],
  moodTags: string[],
) {
  return Array.from(
    new Set(
      [
        values.category,
        values.colorFamily,
        values.composition,
        values.weight,
        ...bestUses,
        ...moodTags,
      ]
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  ).slice(0, 10);
}

function parseList(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNumber(value: string) {
  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    return 0;
  }

  return Math.max(0, parsed);
}

function createFabricId(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);

  return `fabric-${slug || 'untitled'}-${Date.now().toString(36)}`;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    currency: 'USD',
    maximumFractionDigits: 2,
    style: 'currency',
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(value);
}
