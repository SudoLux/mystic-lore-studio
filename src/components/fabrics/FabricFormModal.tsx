import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  Check,
  CircleDollarSign,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import {
  fabricColorPresets,
  fabricDrapes,
  fabricTypes,
  fiberPresets,
  getFabricColorHex,
  getFabricWeightCategory,
  gsmToOunces,
  handFeelPresets,
  isHexColor,
  normalizeFabricDrape,
  normalizeWovenKnit,
  ouncesToGsm,
} from '../../lib/fabricMetadata';
import { cn } from '../../lib/classes';
import type {
  Fabric,
  FabricArchiveStatus,
  FabricDrape,
  FabricOpacity,
  FabricRarity,
  FabricStatus,
  FabricStorageStatus,
  FabricStretch,
} from '../../types/studio';
import { Button } from '../shared/Button';

type FabricFormModalProps = {
  fabric?: Fabric;
  mode: 'create' | 'edit';
  onClose: () => void;
  onSubmit: (fabric: Fabric) => void;
};

type FiberRow = { fiber: string; id: string; percent: string };
type WeightUnit = 'gsm' | 'oz';

type FabricFormValues = {
  archiveStatus: FabricArchiveStatus;
  bestUses: string[];
  binNumber: string;
  careNotes: string;
  category: string;
  colorFamily: string;
  composition: string;
  costPerYard: string;
  drape: FabricDrape;
  fiberMode: 'builder' | 'custom';
  fiberRows: FiberRow[];
  handFeel: string;
  handFeelPreset: string;
  loreNote: string;
  moodTags: string[];
  name: string;
  opacity: FabricOpacity;
  primaryColor: string;
  primaryColorHex: string;
  purchaseDate: string;
  rarity: FabricRarity;
  reservedYards: string;
  secondaryColors: string[];
  shelf: string;
  storageLocation: string;
  storageStatus: FabricStorageStatus;
  stretch: FabricStretch;
  supplier: string;
  totalYards: string;
  usedYards: string;
  weaveOrKnit: '' | 'Knit' | 'Woven';
  weightUnit: WeightUnit;
  weightValue: string;
  widthInches: string;
};

const steps = [
  { eyebrow: '01', title: 'Identity & Color' },
  { eyebrow: '02', title: 'Inventory' },
  { eyebrow: '03', title: 'Material Specs' },
  { eyebrow: '04', title: 'Storage & Story' },
] as const;

const archiveStatuses: FabricArchiveStatus[] = [
  'Active',
  'Reserved',
  'Low Yardage',
  'Archived',
  'Depleted',
];
const opacities: FabricOpacity[] = ['Sheer', 'Semi-sheer', 'Opaque'];
const rarities: FabricRarity[] = ['Core', 'Seasonal', 'Rare', 'One-off', 'Archive'];
const storageStatuses: FabricStorageStatus[] = [
  'Filed',
  'Reserved',
  'In Use',
  'Low Yardage',
  'Depleted',
];
const stretches: FabricStretch[] = ['None', 'Mechanical', 'Two-way', 'Four-way'];

const inputClassName =
  'h-[52px] w-full rounded-xl border border-bronze/30 bg-midnight/58 px-4 text-base text-stardust outline-none transition placeholder:text-stardust/30 focus:border-ember/65 focus:shadow-[0_0_0_3px_rgba(200,155,60,0.1)] sm:text-sm';
const textareaClassName =
  'min-h-28 w-full rounded-xl border border-bronze/30 bg-midnight/58 px-4 py-3 text-base leading-6 text-stardust outline-none transition placeholder:text-stardust/30 focus:border-ember/65 focus:shadow-[0_0_0_3px_rgba(200,155,60,0.1)] sm:text-sm';

export function FabricFormModal({ fabric, mode, onClose, onSubmit }: FabricFormModalProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [values, setValues] = useState<FabricFormValues>(() =>
    fabric ? fabricToFormValues(fabric) : getEmptyFormValues(),
  );

  const totalYards = parseNumber(values.totalYards);
  const reservedYards = parseNumber(values.reservedYards);
  const usedYards = parseNumber(values.usedYards);
  const yardageRemaining = totalYards - reservedYards - usedYards;
  const totalCost = totalYards * parseNumber(values.costPerYard);
  const weightGsm = getWeightGsm(values);
  const weightCategory = getFabricWeightCategory(weightGsm, fabric?.weight ?? 'Medium');
  const fiberTotal = values.fiberRows.reduce(
    (total, row) => total + parseNumber(row.percent),
    0,
  );

  const updateValue = <Key extends keyof FabricFormValues>(
    key: Key,
    value: FabricFormValues[Key],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateFabricForm(values);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      setActiveStep(getErrorStep(validation));
      return;
    }
    onSubmit(formValuesToFabric(values, fabric));
  };

  const changeWeightUnit = (unit: WeightUnit) => {
    if (unit === values.weightUnit) return;
    const current = parseOptionalNumber(values.weightValue);
    const converted = current
      ? unit === 'gsm'
        ? ouncesToGsm(current)
        : gsmToOunces(current)
      : undefined;
    setValues((state) => ({
      ...state,
      weightUnit: unit,
      weightValue: converted ? formatDecimal(converted) : '',
    }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-midnight/86 p-0 backdrop-blur-xl sm:p-5">
      <div className="mx-auto flex h-dvh max-w-6xl flex-col overflow-hidden border-bronze/30 bg-[linear-gradient(135deg,rgba(45,92,107,0.22),rgba(10,10,10,0.98),rgba(61,43,31,0.48))] shadow-[0_30px_100px_rgba(0,0,0,0.5)] sm:h-auto sm:max-h-[calc(100dvh-2.5rem)] sm:rounded-3xl sm:border">
        <header className="z-30 flex shrink-0 items-start justify-between gap-4 border-b border-bronze/24 bg-midnight/94 px-4 py-4 backdrop-blur-xl sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-ember">
              {mode === 'create' ? 'Add Fabric' : 'Edit Fabric'} · Step {activeStep + 1} of 4
            </p>
            <h2 className="mt-1 truncate text-xl font-semibold text-stardust sm:text-2xl">
              {mode === 'create' ? 'Create fabric record' : values.name}
            </h2>
          </div>
          <button
            aria-label="Close fabric form"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-bronze/30 bg-midnight/65 text-stardust/72 transition hover:border-ember/45 hover:text-stardust"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={1.9} />
          </button>
        </header>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="shrink-0 border-b border-bronze/20 px-4 py-3 lg:hidden">
            <div className="grid grid-cols-4 gap-2">
              {steps.map((step, index) => (
                <button
                  aria-label={`Open ${step.title}`}
                  className={cn(
                    'h-2 rounded-full transition',
                    index === activeStep ? 'bg-ember' : index < activeStep ? 'bg-teal' : 'bg-stardust/12',
                  )}
                  key={step.title}
                  onClick={() => setActiveStep(index)}
                  type="button"
                />
              ))}
            </div>
            <p className="mt-2 text-sm font-medium text-stardust/72">{steps[activeStep].title}</p>
          </div>

          <div className="studio-scrollbar min-h-0 flex-1 overflow-y-auto lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
            <nav className="hidden border-r border-bronze/20 p-5 lg:block" aria-label="Fabric form sections">
              <div className="sticky top-28 space-y-2">
                {steps.map((step, index) => (
                  <button
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition',
                      index === activeStep
                        ? 'border-ember/50 bg-ember/12 text-stardust'
                        : 'border-transparent text-stardust/52 hover:border-bronze/25 hover:bg-stardust/[0.04] hover:text-stardust/78',
                    )}
                    key={step.title}
                    onClick={() => setActiveStep(index)}
                    type="button"
                  >
                    <span className="text-xs font-semibold text-ember">{step.eyebrow}</span>
                    <span className="text-sm font-medium">{step.title}</span>
                  </button>
                ))}
              </div>
            </nav>

            <div className="min-w-0 p-4 sm:p-6 lg:p-8">
              {activeStep === 0 ? (
                <FormSection
                  description="Name the textile and establish the color signal used throughout the studio."
                  title="Identity & Color"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextField error={errors.name} label="Name" onChange={(value) => updateValue('name', value)} value={values.name} />
                    <PresetTextField
                      error={errors.category}
                      label="Fabric type"
                      onChange={(value) => updateValue('category', value)}
                      options={fabricTypes}
                      value={values.category}
                    />
                    <TextField label="Supplier/source" onChange={(value) => updateValue('supplier', value)} value={values.supplier} />
                  </div>

                  <div className="mt-7 border-t border-bronze/20 pt-6">
                    <FieldLabel label="Primary color" />
                    <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 xl:grid-cols-10">
                      {fabricColorPresets.map((preset) => {
                        const selected = values.colorFamily === preset.label;
                        return (
                          <button
                            aria-label={`Select ${preset.label}`}
                            className={cn(
                              'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border bg-midnight/42 text-[0.65rem] text-stardust/64 transition',
                              selected ? 'border-ember shadow-[0_0_24px_rgba(200,155,60,0.2)]' : 'border-bronze/22 hover:border-bronze/55',
                            )}
                            key={preset.label}
                            onClick={() => {
                              setValues((current) => ({
                                ...current,
                                colorFamily: preset.label,
                                primaryColor: preset.label,
                                primaryColorHex: preset.hex,
                              }));
                              setErrors((current) => ({ ...current, primaryColor: '' }));
                            }}
                            type="button"
                          >
                            <span className="h-6 w-6 rounded-full border border-white/25 shadow-inner" style={{ backgroundColor: preset.hex }} />
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                    {errors.primaryColor ? <FieldError>{errors.primaryColor}</FieldError> : null}

                    <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem]">
                      <TextField
                        helper="Optional shade name, such as Crimson, Oxblood, or Sage."
                        label="Shade name"
                        onChange={(value) => updateValue('primaryColor', value)}
                        value={values.primaryColor}
                      />
                      <ColorValueField
                        onChange={(value) => updateValue('primaryColorHex', value)}
                        value={values.primaryColorHex}
                      />
                    </div>

                    <div className="mt-5">
                      <FieldLabel label="Secondary colors" />
                      <div className="flex flex-wrap gap-2">
                        {fabricColorPresets.map((preset) => {
                          const selected = values.secondaryColors.includes(preset.label);
                          return (
                            <button
                              className={cn(
                                'inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm transition',
                                selected ? 'border-ember/65 bg-ember/12 text-stardust' : 'border-bronze/25 bg-midnight/36 text-stardust/58 hover:border-bronze/55',
                              )}
                              key={preset.label}
                              onClick={() => updateValue(
                                'secondaryColors',
                                selected
                                  ? values.secondaryColors.filter((color) => color !== preset.label)
                                  : [...values.secondaryColors, preset.label],
                              )}
                              type="button"
                            >
                              <span className="h-4 w-4 rounded-full border border-white/20" style={{ backgroundColor: preset.hex }} />
                              {preset.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </FormSection>
              ) : null}

              {activeStep === 1 ? (
                <FormSection description="Record the working inventory and let the studio calculate the rest." title="Inventory">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <NumberField error={errors.totalYards} label="Total yardage" min={0} onChange={(value) => updateValue('totalYards', value)} step="0.01" unit="yd" value={values.totalYards} />
                    <NumberField label="Reserved yardage" min={0} onChange={(value) => updateValue('reservedYards', value)} step="0.01" unit="yd" value={values.reservedYards} />
                    <NumberField label="Used yardage" min={0} onChange={(value) => updateValue('usedYards', value)} step="0.01" unit="yd" value={values.usedYards} />
                    <NumberField label="Cost per yard" min={0} onChange={(value) => updateValue('costPerYard', value)} prefix="$" step="0.01" value={values.costPerYard} />
                    <TextField label="Purchase date" onChange={(value) => updateValue('purchaseDate', value)} type="date" value={values.purchaseDate} />
                  </div>

                  {yardageRemaining < 0 ? (
                    <Notice tone="warning">Reserved and used yardage exceed the recorded total by {formatNumber(Math.abs(yardageRemaining))} yd.</Notice>
                  ) : null}

                  <div className="mt-6 grid gap-3 min-[360px]:grid-cols-2">
                    <CalculationCard icon={<Calculator size={18} />} label="Remaining yardage" value={`${formatNumber(yardageRemaining)} yd`} />
                    <CalculationCard icon={<CircleDollarSign size={18} />} label="Total cost" value={formatCurrency(totalCost)} />
                  </div>
                </FormSection>
              ) : null}

              {activeStep === 2 ? (
                <FormSection description="Capture measurable construction behavior and the fabric's dominant hand." title="Material Specs">
                  <div className="grid gap-5 md:grid-cols-2">
                    <NumberField error={errors.widthInches} label="Width" min={0} onChange={(value) => updateValue('widthInches', value)} step="0.01" unit="in" value={values.widthInches} />
                    <ChoiceField error={errors.weaveOrKnit} label="Woven/Knit" onChange={(value) => updateValue('weaveOrKnit', value as 'Knit' | 'Woven')} options={['Woven', 'Knit']} value={values.weaveOrKnit} />
                  </div>

                  <div className="mt-6">
                    <FiberCompositionBuilder
                      composition={values.composition}
                      fiberMode={values.fiberMode}
                      fiberRows={values.fiberRows}
                      fiberTotal={fiberTotal}
                      onCompositionChange={(value) => updateValue('composition', value)}
                      onModeChange={(value) => updateValue('fiberMode', value)}
                      onRowsChange={(value) => updateValue('fiberRows', value)}
                    />
                  </div>

                  <div className="mt-7 border-t border-bronze/20 pt-6">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <FieldLabel label="Exact fabric weight" />
                        <p className="text-sm text-stardust/48">Enter ounces per square yard or switch to GSM.</p>
                      </div>
                      <SegmentedControl options={['oz', 'gsm']} value={values.weightUnit} onChange={(value) => changeWeightUnit(value as WeightUnit)} labels={{ gsm: 'GSM', oz: 'oz/yd²' }} />
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.55fr)]">
                      <NumberField error={errors.weightValue} label={values.weightUnit === 'oz' ? 'Weight in ounces' : 'Weight in GSM'} min={0} onChange={(value) => updateValue('weightValue', value)} step="0.01" unit={values.weightUnit === 'oz' ? 'oz/yd²' : 'GSM'} value={values.weightValue} />
                      <CalculationCard
                        compact
                        icon={<Calculator size={17} />}
                        label="Converted weight"
                        value={weightGsm ? values.weightUnit === 'oz' ? `${formatNumber(weightGsm)} GSM` : `${formatNumber(gsmToOunces(weightGsm))} oz/yd²` : 'Not measured'}
                      />
                    </div>
                    <p className="mt-3 text-sm text-stardust/52">Category: <span className="font-medium text-ember">{weightCategory}</span></p>
                  </div>

                  <div className="mt-7 grid gap-6 border-t border-bronze/20 pt-6">
                    <ChoiceField label="Stretch" onChange={(value) => updateValue('stretch', value as FabricStretch)} options={stretches} value={values.stretch} />
                    <ChoiceField label="Opacity" onChange={(value) => updateValue('opacity', value as FabricOpacity)} options={opacities} value={values.opacity} />
                    <ChoiceField label="Drape" onChange={(value) => updateValue('drape', value as FabricDrape)} options={fabricDrapes} value={values.drape} />
                    <ChoiceField label="Hand feel" onChange={(value) => {
                      updateValue('handFeelPreset', value);
                      if (value !== 'Custom') updateValue('handFeel', value);
                    }} options={handFeelPresets} value={values.handFeelPreset} />
                    {values.handFeelPreset === 'Custom' ? (
                      <TextField label="Custom hand feel" onChange={(value) => updateValue('handFeel', value)} value={values.handFeel} />
                    ) : null}
                  </div>
                </FormSection>
              ) : null}

              {activeStep === 3 ? (
                <FormSection description="File the textile, describe its intended use, and preserve its studio story." title="Storage & Story">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <TextField label="Storage location" onChange={(value) => updateValue('storageLocation', value)} value={values.storageLocation} />
                    <TextField label="Bin number" onChange={(value) => updateValue('binNumber', value)} value={values.binNumber} />
                    <TextField label="Shelf" onChange={(value) => updateValue('shelf', value)} value={values.shelf} />
                  </div>
                  <div className="mt-6 grid gap-6">
                    <ChoiceField label="Storage status" onChange={(value) => updateValue('storageStatus', value as FabricStorageStatus)} options={storageStatuses} value={values.storageStatus} />
                    <ChoiceField label="Archive status" onChange={(value) => updateValue('archiveStatus', value as FabricArchiveStatus)} options={archiveStatuses} value={values.archiveStatus} />
                    <ChoiceField label="Rarity" onChange={(value) => updateValue('rarity', value as FabricRarity)} options={rarities} value={values.rarity} />
                  </div>
                  <div className="mt-7 grid gap-5 border-t border-bronze/20 pt-6">
                    <TagField label="Best uses" onChange={(value) => updateValue('bestUses', value)} placeholder="Type a garment use and press Enter" values={values.bestUses} />
                    <TextAreaField label="Care notes" onChange={(value) => updateValue('careNotes', value)} value={values.careNotes} />
                    <TagField label="Mood tags" onChange={(value) => updateValue('moodTags', value)} placeholder="Type a mood and press Enter" values={values.moodTags} />
                    <TextAreaField label="Lore note" onChange={(value) => updateValue('loreNote', value)} value={values.loreNote} />
                  </div>
                </FormSection>
              ) : null}
            </div>
          </div>

          <footer className="z-30 flex shrink-0 items-center justify-between gap-3 border-t border-bronze/24 bg-midnight/94 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:px-6">
            <Button onClick={onClose} size="sm" type="button" variant="ghost">Cancel</Button>
            <div className="flex items-center gap-2">
              {activeStep > 0 ? (
                <Button icon={<ArrowLeft size={16} />} onClick={() => setActiveStep((step) => step - 1)} size="sm" type="button">Back</Button>
              ) : null}
              {activeStep < steps.length - 1 ? (
                <Button icon={<ArrowRight size={16} />} onClick={() => setActiveStep((step) => step + 1)} size="sm" type="button" variant="primary">Next</Button>
              ) : (
                <Button icon={<Check size={16} />} size="sm" type="submit" variant="primary">
                  {mode === 'create' ? 'Add Fabric' : 'Save Changes'}
                </Button>
              )}
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}

function FormSection({ children, description, title }: { children: ReactNode; description: string; title: string }) {
  return (
    <section>
      <h3 className="text-2xl font-semibold text-stardust">{title}</h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-stardust/52">{description}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <span className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-stardust/46">{label}</span>;
}

function FieldError({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-xs font-medium text-ember">{children}</p>;
}

function TextField({ error, helper, label, onChange, type = 'text', value }: { error?: string; helper?: string; label: string; onChange: (value: string) => void; type?: 'date' | 'text'; value: string }) {
  return (
    <label className="block min-w-0">
      <FieldLabel label={label} />
      <input className={cn(inputClassName, error && 'border-ember')} onChange={(event) => onChange(event.target.value)} type={type} value={value} />
      {helper ? <span className="mt-2 block text-xs text-stardust/42">{helper}</span> : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </label>
  );
}

function NumberField({ error, label, min, onChange, prefix, step, unit, value }: { error?: string; label: string; min?: number; onChange: (value: string) => void; prefix?: string; step?: string; unit?: string; value: string }) {
  return (
    <label className="block min-w-0">
      <FieldLabel label={label} />
      <span className="relative block">
        {prefix ? <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stardust/52">{prefix}</span> : null}
        <input
          className={cn(
            inputClassName,
            prefix && 'pl-8',
            unit && (unit.length <= 2 ? 'pr-11' : 'pr-20'),
            error && 'border-ember',
          )}
          inputMode="decimal"
          min={min}
          onChange={(event) => onChange(event.target.value)}
          step={step}
          type="number"
          value={value}
        />
        {unit ? <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-stardust/42">{unit}</span> : null}
      </span>
      {error ? <FieldError>{error}</FieldError> : null}
    </label>
  );
}

function PresetTextField({ error, label, onChange, options, value }: { error?: string; label: string; onChange: (value: string) => void; options: readonly string[]; value: string }) {
  return (
    <div className="md:col-span-2">
      <FieldLabel label={label} />
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <ChoiceButton key={option} onClick={() => onChange(option === 'Other' ? '' : option)} selected={value === option}>{option}</ChoiceButton>
        ))}
      </div>
      <input className={cn(inputClassName, 'mt-3', error && 'border-ember')} onChange={(event) => onChange(event.target.value)} placeholder="Choose a preset or enter a custom fabric type" value={value} />
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}

function ChoiceField({ error, label, onChange, options, value }: { error?: string; label: string; onChange: (value: string) => void; options: readonly string[]; value: string }) {
  return (
    <div>
      <FieldLabel label={label} />
      <div className="flex flex-wrap gap-2">
        {options.map((option) => <ChoiceButton key={option} onClick={() => onChange(option)} selected={value === option}>{option}</ChoiceButton>)}
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}

function ChoiceButton({ children, onClick, selected }: { children: ReactNode; onClick: () => void; selected: boolean }) {
  return (
    <button
      className={cn(
        'min-h-11 rounded-full border px-4 text-sm font-medium transition',
        selected ? 'border-ember/65 bg-ember/14 text-stardust shadow-[0_8px_24px_rgba(200,155,60,0.1)]' : 'border-bronze/25 bg-midnight/38 text-stardust/58 hover:border-bronze/58 hover:text-stardust/82',
      )}
      onClick={onClick}
      type="button"
    >{children}</button>
  );
}

function SegmentedControl({ labels, onChange, options, value }: { labels?: Record<string, string>; onChange: (value: string) => void; options: readonly string[]; value: string }) {
  return (
    <div className="inline-flex rounded-xl border border-bronze/30 bg-midnight/60 p-1">
      {options.map((option) => (
        <button className={cn('min-h-9 rounded-lg px-4 text-sm font-medium transition', value === option ? 'bg-ember text-midnight' : 'text-stardust/55')} key={option} onClick={() => onChange(option)} type="button">
          {labels?.[option] ?? option}
        </button>
      ))}
    </div>
  );
}

function ColorValueField({ onChange, value }: { onChange: (value: string) => void; value: string }) {
  const safeValue = isHexColor(value) ? value : '#C89B3C';
  return (
    <label className="block">
      <FieldLabel label="Exact color" />
      <span className="flex h-[52px] items-center gap-3 rounded-xl border border-bronze/30 bg-midnight/58 px-3">
        <input aria-label="Choose exact color" className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0" onChange={(event) => onChange(event.target.value.toUpperCase())} type="color" value={safeValue} />
        <input aria-label="Exact color hex" className="min-w-0 flex-1 bg-transparent text-sm uppercase text-stardust outline-none" maxLength={7} onChange={(event) => onChange(event.target.value.toUpperCase())} value={value} />
      </span>
    </label>
  );
}

function CalculationCard({ compact = false, icon, label, value }: { compact?: boolean; icon: ReactNode; label: string; value: string }) {
  return (
    <div className={cn('rounded-2xl border border-teal/28 bg-[linear-gradient(145deg,rgba(45,92,107,0.18),rgba(10,10,10,0.5))] p-4 shadow-[inset_0_1px_0_rgba(237,227,207,0.04)]', compact && 'flex min-h-[76px] items-center gap-3 py-3')}>
      <div className="flex items-center justify-between gap-3 text-teal">
        {icon}
        {!compact ? <span className="rounded-full border border-teal/28 px-2 py-0.5 text-[0.62rem] uppercase tracking-[0.12em] text-stardust/48">Calculated</span> : null}
      </div>
      <div className={compact ? 'min-w-0' : 'mt-4'}>
        <p className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-stardust/42">{label}</p>
        <p className="mt-1 text-lg font-semibold text-stardust">{value}</p>
      </div>
    </div>
  );
}

function FiberCompositionBuilder({ composition, fiberMode, fiberRows, fiberTotal, onCompositionChange, onModeChange, onRowsChange }: { composition: string; fiberMode: 'builder' | 'custom'; fiberRows: FiberRow[]; fiberTotal: number; onCompositionChange: (value: string) => void; onModeChange: (value: 'builder' | 'custom') => void; onRowsChange: (value: FiberRow[]) => void }) {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><FieldLabel label="Fiber content" /><p className="text-sm text-stardust/48">Build a blend or keep a custom mill description.</p></div>
        <SegmentedControl labels={{ builder: 'Blend builder', custom: 'Custom text' }} onChange={(value) => onModeChange(value as 'builder' | 'custom')} options={['builder', 'custom']} value={fiberMode} />
      </div>
      {fiberMode === 'custom' ? (
        <textarea className={cn(textareaClassName, 'mt-3')} onChange={(event) => onCompositionChange(event.target.value)} value={composition} />
      ) : (
        <div className="mt-3 space-y-3">
          <datalist id="fabric-fiber-presets">{fiberPresets.map((fiber) => <option key={fiber} value={fiber} />)}</datalist>
          {fiberRows.map((row) => (
            <div className="grid grid-cols-[minmax(0,1fr)_7rem_2.75rem] gap-2" key={row.id}>
              <input className={inputClassName} list="fabric-fiber-presets" onChange={(event) => onRowsChange(fiberRows.map((item) => item.id === row.id ? { ...item, fiber: event.target.value } : item))} placeholder="Fiber" value={row.fiber} />
              <NumberField label="" min={0} onChange={(value) => onRowsChange(fiberRows.map((item) => item.id === row.id ? { ...item, percent: value } : item))} step="0.1" unit="%" value={row.percent} />
              <button aria-label={`Remove ${row.fiber || 'fiber'}`} className="mt-0 flex h-[52px] items-center justify-center rounded-xl border border-bronze/25 text-stardust/48 transition hover:border-ember/50 hover:text-ember" onClick={() => onRowsChange(fiberRows.filter((item) => item.id !== row.id))} type="button"><Trash2 size={17} /></button>
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button icon={<Plus size={16} />} onClick={() => onRowsChange([...fiberRows, createFiberRow('', '')])} size="sm" type="button">Add fiber</Button>
            <span className={cn('text-sm font-medium', fiberRows.length > 0 && Math.abs(fiberTotal - 100) > 0.01 ? 'text-ember' : 'text-teal')}>{formatNumber(fiberTotal)}% total</span>
          </div>
          {fiberRows.length > 0 && Math.abs(fiberTotal - 100) > 0.01 ? <Notice tone="warning">Fiber percentages should total 100%.</Notice> : null}
        </div>
      )}
    </div>
  );
}

function TagField({ label, onChange, placeholder, values }: { label: string; onChange: (value: string[]) => void; placeholder: string; values: string[] }) {
  const [draft, setDraft] = useState('');
  const addDraft = () => {
    const next = draft.trim();
    if (!next) return;
    if (!values.some((value) => value.toLowerCase() === next.toLowerCase())) onChange([...values, next]);
    setDraft('');
  };
  return (
    <div>
      <FieldLabel label={label} />
      <div className="rounded-xl border border-bronze/30 bg-midnight/58 p-3 focus-within:border-ember/65">
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-bronze/30 bg-stardust/[0.05] px-3 text-sm text-stardust/72" key={value}>
              {value}<button aria-label={`Remove ${value}`} className="text-stardust/42 hover:text-ember" onClick={() => onChange(values.filter((item) => item !== value))} type="button"><X size={13} /></button>
            </span>
          ))}
        </div>
        <input className="mt-2 h-10 w-full bg-transparent text-base text-stardust outline-none placeholder:text-stardust/30 sm:text-sm" onBlur={addDraft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); addDraft(); } }} placeholder={placeholder} value={draft} />
      </div>
    </div>
  );
}

function TextAreaField({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return <label className="block"><FieldLabel label={label} /><textarea className={textareaClassName} onChange={(event) => onChange(event.target.value)} value={value} /></label>;
}

function Notice({ children, tone }: { children: ReactNode; tone: 'warning' }) {
  return <p className={cn('mt-4 rounded-xl border px-4 py-3 text-sm leading-6', tone === 'warning' && 'border-ember/35 bg-ember/8 text-ember')}>{children}</p>;
}

function getEmptyFormValues(): FabricFormValues {
  return {
    archiveStatus: 'Active', bestUses: [], binNumber: '', careNotes: '', category: '', colorFamily: '', composition: '', costPerYard: '0', drape: 'Balanced', fiberMode: 'builder', fiberRows: [], handFeel: '', handFeelPreset: '', loreNote: '', moodTags: [], name: '', opacity: 'Opaque', primaryColor: '', primaryColorHex: '#C89B3C', purchaseDate: todayString(), rarity: 'Core', reservedYards: '0', secondaryColors: [], shelf: '', storageLocation: '', storageStatus: 'Filed', stretch: 'None', supplier: '', totalYards: '0', usedYards: '0', weaveOrKnit: '', weightUnit: 'oz', weightValue: '', widthInches: '0',
  };
}

function fabricToFormValues(fabric: Fabric): FabricFormValues {
  const fiberRows = parseFiberRows(fabric.composition);
  const handFeelPreset = handFeelPresets.includes(fabric.handFeel as typeof handFeelPresets[number]) ? fabric.handFeel : fabric.handFeel ? 'Custom' : '';
  const weightUnit = fabric.weightInputUnit ?? 'oz';
  return {
    archiveStatus: fabric.archiveStatus,
    bestUses: [...fabric.bestUses],
    binNumber: fabric.binNumber,
    careNotes: fabric.careNotes,
    category: fabric.category,
    colorFamily: inferColorFamily(fabric),
    composition: fabric.composition,
    costPerYard: fabric.costPerYard.toString(),
    drape: normalizeFabricDrape(fabric.drape),
    fiberMode: fiberRows.length > 0 ? 'builder' : 'custom',
    fiberRows,
    handFeel: fabric.handFeel,
    handFeelPreset,
    loreNote: fabric.loreNote,
    moodTags: [...fabric.moodTags],
    name: fabric.name,
    opacity: fabric.opacity,
    primaryColor: inferPrimaryShade(fabric),
    primaryColorHex: getFabricColorHex(fabric),
    purchaseDate: fabric.purchaseDate,
    rarity: fabric.rarity,
    reservedYards: fabric.reservedYards.toString(),
    secondaryColors: [...fabric.secondaryColors],
    shelf: fabric.shelf,
    storageLocation: fabric.storageLocation,
    storageStatus: fabric.storageStatus,
    stretch: fabric.stretch,
    supplier: fabric.supplier,
    totalYards: fabric.totalYards.toString(),
    usedYards: fabric.usedYards.toString(),
    weaveOrKnit: normalizeWovenKnit(fabric.weaveOrKnit),
    weightUnit,
    weightValue: fabric.weightGsm ? formatDecimal(weightUnit === 'gsm' ? fabric.weightGsm : gsmToOunces(fabric.weightGsm)) : '',
    widthInches: fabric.widthInches.toString(),
  };
}

function formValuesToFabric(values: FabricFormValues, existingFabric?: Fabric): Fabric {
  const safeName = values.name.trim() || 'Untitled Fabric';
  const totalYards = parseNumber(values.totalYards);
  const reservedYards = parseNumber(values.reservedYards);
  const usedYards = parseNumber(values.usedYards);
  const weightGsm = getWeightGsm(values);
  const composition = values.fiberMode === 'builder' && values.fiberRows.length > 0
    ? values.fiberRows.filter((row) => row.fiber.trim()).map((row) => `${formatNumber(parseNumber(row.percent))}% ${row.fiber.trim()}`).join(', ')
    : values.composition.trim();
  return {
    archiveStatus: values.archiveStatus,
    bestUses: values.bestUses,
    binNumber: values.binNumber.trim(),
    careNotes: values.careNotes.trim(),
    category: values.category.trim() || 'Uncategorized',
    colorFamily: values.colorFamily,
    composition,
    costPerYard: parseNumber(values.costPerYard),
    drape: values.drape,
    handFeel: values.handFeel.trim(),
    id: existingFabric?.id ?? createFabricId(safeName),
    image: existingFabric?.image,
    loreNote: values.loreNote.trim(),
    moodTags: values.moodTags,
    name: safeName,
    notes: values.loreNote.trim() || existingFabric?.notes || '',
    opacity: values.opacity,
    primaryColor: values.primaryColor.trim() || values.colorFamily,
    primaryColorHex: isHexColor(values.primaryColorHex) ? values.primaryColorHex.toUpperCase() : undefined,
    purchaseDate: values.purchaseDate || existingFabric?.purchaseDate || todayString(),
    rarity: values.rarity,
    reservedYards,
    secondaryColors: values.secondaryColors,
    shelf: values.shelf.trim(),
    status: getFabricStatus({ archiveStatus: values.archiveStatus, reservedYards, storageStatus: values.storageStatus, totalYards, usedYards }),
    storageLocation: values.storageLocation.trim(),
    storageStatus: values.storageStatus,
    stretch: values.stretch,
    structure: existingFabric?.structure ?? '',
    supplier: values.supplier.trim(),
    tags: buildFabricTags(values, composition),
    texture: existingFabric?.texture ?? '',
    totalYards,
    updatedAt: new Date().toISOString(),
    usedYards,
    weaveOrKnit: values.weaveOrKnit,
    weight: getFabricWeightCategory(weightGsm, existingFabric?.weight ?? 'Medium'),
    weightGsm,
    weightInputUnit: values.weightUnit,
    widthInches: parseNumber(values.widthInches),
  };
}

function validateFabricForm(values: FabricFormValues) {
  const errors: Record<string, string> = {};
  if (!values.name.trim()) errors.name = 'Enter a fabric name.';
  if (!values.category.trim()) errors.category = 'Choose or enter a fabric type.';
  if (!values.colorFamily || !isHexColor(values.primaryColorHex)) errors.primaryColor = 'Choose a primary color.';
  if (parseNumber(values.totalYards) <= 0) errors.totalYards = 'Total yardage must be greater than zero.';
  if (parseNumber(values.widthInches) <= 0) errors.widthInches = 'Fabric width must be greater than zero.';
  if (!values.weaveOrKnit) errors.weaveOrKnit = 'Choose Woven or Knit.';
  if (values.weightValue.trim() && !parseOptionalNumber(values.weightValue)) errors.weightValue = 'Enter a weight greater than zero.';
  return errors;
}

function getErrorStep(errors: Record<string, string>) {
  if (errors.name || errors.category || errors.primaryColor) return 0;
  if (errors.totalYards) return 1;
  if (errors.widthInches || errors.weaveOrKnit || errors.weightValue) return 2;
  return 3;
}

function getWeightGsm(values: FabricFormValues) {
  const value = parseOptionalNumber(values.weightValue);
  if (!value) return undefined;
  return values.weightUnit === 'oz' ? ouncesToGsm(value) : value;
}

function parseFiberRows(composition: string) {
  const parts = composition.split(',').map((part) => part.trim()).filter(Boolean);
  const rows = parts.map((part) => {
    const match = part.match(/^(\d+(?:\.\d+)?)%\s+(.+)$/);
    return match ? createFiberRow(match[2], match[1]) : null;
  });
  return rows.every(Boolean) ? (rows.filter(Boolean) as FiberRow[]) : [];
}

function createFiberRow(fiber: string, percent: string): FiberRow {
  return { fiber, id: `fiber-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, percent };
}

function inferColorFamily(fabric: Fabric) {
  const values = [fabric.colorFamily, fabric.primaryColor].map((value) => value.toLowerCase());
  return fabricColorPresets.find((preset) => values.some((value) => value.includes(preset.label.toLowerCase())))?.label ?? fabric.colorFamily;
}

function inferPrimaryShade(fabric: Fabric) {
  const colorFamilyIsPreset = fabricColorPresets.some(
    (preset) => preset.label.toLowerCase() === fabric.colorFamily.toLowerCase(),
  );
  const primaryColorIsPreset = fabricColorPresets.some(
    (preset) => preset.label.toLowerCase() === fabric.primaryColor.toLowerCase(),
  );

  if (!colorFamilyIsPreset && primaryColorIsPreset) return fabric.colorFamily;
  return fabric.primaryColor;
}

function getFabricStatus({ archiveStatus, reservedYards, storageStatus, totalYards, usedYards }: { archiveStatus: FabricArchiveStatus; reservedYards: number; storageStatus: FabricStorageStatus; totalYards: number; usedYards: number }): FabricStatus {
  const remainingYards = totalYards - reservedYards - usedYards;
  if (archiveStatus === 'Depleted' || storageStatus === 'Depleted' || remainingYards <= 0) return 'Depleted';
  if (archiveStatus === 'Reserved' || storageStatus === 'Reserved') return 'Reserved';
  if (archiveStatus === 'Low Yardage' || storageStatus === 'Low Yardage' || remainingYards <= 5) return 'Low Stock';
  return 'In Stock';
}

function buildFabricTags(values: FabricFormValues, composition: string) {
  return Array.from(new Set([values.category, values.colorFamily, composition, getFabricWeightCategory(getWeightGsm(values)), ...values.bestUses, ...values.moodTags].map((tag) => tag.trim().toLowerCase()).filter(Boolean))).slice(0, 10);
}

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function parseOptionalNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function createFabricId(name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
  return `fabric-${slug || 'untitled'}-${Date.now().toString(36)}`;
}

function todayString() { return new Date().toISOString().slice(0, 10); }
function formatDecimal(value: number) { return Number(value.toFixed(2)).toString(); }
function formatCurrency(value: number) { return new Intl.NumberFormat('en-US', { currency: 'USD', maximumFractionDigits: 2, style: 'currency' }).format(value); }
function formatNumber(value: number) { return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value); }
