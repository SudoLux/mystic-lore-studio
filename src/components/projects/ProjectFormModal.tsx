import {
  ArrowLeft,
  ArrowRight,
  Check,
  Lightbulb,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cn } from '../../lib/classes';
import { formatStudioDate } from '../../lib/dates';
import { discardLocalImageAsset } from '../../lib/localImages';
import type {
  ApparelProject,
  GarmentType,
  LocalImageAsset,
  ProjectDetailsInput,
  ProjectDifficulty,
  ProjectHeroImageIntent,
  ProjectPhase,
  ProjectStatus,
  TaskPriority,
} from '../../types/studio';
import {
  garmentTypes,
  projectPhases,
  projectStatuses,
} from '../../types/studio';
import { AdaptiveStoredImage } from '../shared/AdaptiveStoredImage';
import { Badge } from '../shared/Badge';
import { Button } from '../shared/Button';
import { ImageSlot } from '../shared/ImageSlot';

type ProjectFormModalProps = {
  mode: 'create' | 'edit';
  onClose: () => void;
  onSubmit: (submission: ProjectFormSubmission) => void;
  project?: ApparelProject;
  projects: ApparelProject[];
};

export type ProjectFormSubmission = {
  details: ProjectDetailsInput;
  heroImageIntent: ProjectHeroImageIntent;
  id: string;
};

type ProjectFormValues = {
  collection: string;
  colorStory: string;
  designIntent: string;
  difficulty: ProjectDifficulty;
  garmentType: GarmentType | '';
  generalNotes: string;
  keyFeatures: string[];
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

const steps = [
  { eyebrow: '01', title: 'Identity & Image' },
  { eyebrow: '02', title: 'Creative Direction' },
  { eyebrow: '03', title: 'Workflow & Schedule' },
  { eyebrow: '04', title: 'Review & Notes' },
] as const;

const priorities: TaskPriority[] = ['Low', 'Medium', 'High', 'Critical'];
const difficulties: ProjectDifficulty[] = ['Light', 'Moderate', 'Advanced', 'Masterwork'];

const phaseRecommendations: Record<ProjectPhase, { progress: number; status: ProjectStatus }> = {
  Archived: { progress: 100, status: 'Archived' },
  Concept: { progress: 5, status: 'Idea' },
  'Final Build': { progress: 85, status: 'Ready for Production' },
  Fitting: { progress: 60, status: 'Active' },
  'Lookbook Ready': { progress: 100, status: 'Completed' },
  Materials: { progress: 20, status: 'Active' },
  'Pattern Drafting': { progress: 35, status: 'Active' },
  Photoshoot: { progress: 92, status: 'Active' },
  Research: { progress: 10, status: 'Idea' },
  Revision: { progress: 70, status: 'Active' },
  'Sample Sewing': { progress: 45, status: 'Active' },
};

const inputClassName =
  'h-[52px] w-full rounded-xl border border-bronze/30 bg-midnight/58 px-4 text-base text-stardust outline-none transition placeholder:text-stardust/30 focus:border-ember/65 focus:shadow-[0_0_0_3px_rgba(200,155,60,0.1)] sm:text-sm';
const textareaClassName =
  'min-h-28 w-full rounded-xl border border-bronze/30 bg-midnight/58 px-4 py-3 text-base leading-6 text-stardust outline-none transition placeholder:text-stardust/30 focus:border-ember/65 focus:shadow-[0_0_0_3px_rgba(200,155,60,0.1)] sm:text-sm';

export function ProjectFormModal({
  mode,
  onClose,
  onSubmit,
  project,
  projects,
}: ProjectFormModalProps) {
  const initialValues = useMemo(
    () => (project ? projectToFormValues(project) : getEmptyFormValues()),
    [project],
  );
  const initialValuesRef = useRef(initialValues);
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [heroImage, setHeroImage] = useState<LocalImageAsset | undefined>(project?.heroImage);
  const [heroImageIntent, setHeroImageIntent] = useState<ProjectHeroImageIntent>({ type: 'unchanged' });
  const [values, setValues] = useState<ProjectFormValues>(initialValues);

  const collectionSuggestions = useMemo(
    () => getSuggestions(projects.map((item) => item.collection), values.collection),
    [projects, values.collection],
  );
  const seasonSuggestions = useMemo(
    () => getSuggestions(projects.map((item) => item.season), values.season),
    [projects, values.season],
  );
  const recommendation = phaseRecommendations[values.phase];
  const progressValue = clampProgress(values.progress);
  const isDirty = heroImageIntent.type !== 'unchanged' ||
    JSON.stringify(values) !== JSON.stringify(initialValuesRef.current);

  useEffect(() => {
    contentRef.current?.scrollTo({ behavior: 'smooth', top: 0 });
  }, [activeStep]);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || discardOpen) return;
      event.preventDefault();
      if (isDirty) setDiscardOpen(true);
      else onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [discardOpen, isDirty, onClose]);

  const updateValue = <Key extends keyof ProjectFormValues>(
    key: Key,
    value: ProjectFormValues[Key],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const goToStep = (step: number) => {
    setActiveStep(Math.min(steps.length - 1, Math.max(0, step)));
  };

  const goToNextStep = () => {
    setActiveStep((current) => Math.min(steps.length - 1, current + 1));
  };

  const goToPreviousStep = () => {
    setActiveStep((current) => Math.max(0, current - 1));
  };

  const requestClose = () => {
    if (isDirty) {
      setDiscardOpen(true);
      return;
    }
    onClose();
  };

  const discardChanges = async () => {
    if (
      heroImageIntent.type === 'set' &&
      heroImage?.id !== project?.heroImage?.id
    ) {
      await discardLocalImageAsset(heroImage);
    }
    onClose();
  };

  const saveHeroImage = (image: LocalImageAsset) => {
    if (
      heroImageIntent.type === 'set' &&
      heroImage?.id !== image.id &&
      heroImage?.id !== project?.heroImage?.id
    ) {
      void discardLocalImageAsset(heroImage);
    }
    setHeroImage(image);
    setHeroImageIntent({ image, type: 'set' });
  };

  const removeHeroImage = () => {
    if (
      heroImageIntent.type === 'set' &&
      heroImage?.id !== project?.heroImage?.id
    ) {
      void discardLocalImageAsset(heroImage);
    }
    setHeroImage(undefined);
    setHeroImageIntent(project?.heroImage ? { type: 'remove' } : { type: 'unchanged' });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (activeStep < steps.length - 1) goToNextStep();
  };

  const saveProject = () => {
    if (activeStep !== steps.length - 1) return;

    const validation = validateProjectForm(values);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      goToStep(getErrorStep(validation));
      return;
    }

    const details = formValuesToProjectDetails(values);
    onSubmit({
      details,
      heroImageIntent,
      id: project?.id ?? createProjectId(details.name),
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-midnight/88 p-0 backdrop-blur-xl sm:p-5">
      <div className="mx-auto flex h-dvh max-w-6xl flex-col overflow-hidden border-bronze/30 bg-[linear-gradient(135deg,rgba(27,58,99,0.24),rgba(10,10,10,0.98),rgba(61,43,31,0.5))] shadow-[0_30px_100px_rgba(0,0,0,0.52)] sm:h-auto sm:max-h-[calc(100dvh-2.5rem)] sm:rounded-3xl sm:border">
        <header className="z-30 flex shrink-0 items-start justify-between gap-4 border-b border-bronze/24 bg-midnight/94 px-4 py-4 backdrop-blur-xl sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-ember">
              {mode === 'create' ? 'New Project' : 'Edit Project'} - Step {activeStep + 1} of 4
            </p>
            <h2 className="font-display mt-1 truncate text-xl text-stardust sm:text-2xl">
              {mode === 'create' ? 'Create garment project' : values.title || 'Untitled project'}
            </h2>
          </div>
          <button
            aria-label="Close project form"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-bronze/30 bg-midnight/65 text-stardust/72 transition hover:border-ember/45 hover:text-stardust"
            onClick={requestClose}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={1.9} />
          </button>
        </header>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <MobileStepProgress activeStep={activeStep} onSelect={goToStep} />

          <div ref={contentRef} className="studio-scrollbar min-h-0 flex-1 overflow-y-auto lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
            <StepNavigation activeStep={activeStep} onSelect={goToStep} />

            <div className="min-w-0 p-4 sm:p-6 lg:p-8">
              {activeStep === 0 ? (
                <FormSection
                  description="Set the garment identity and establish its lead visual."
                  title="Identity & Image"
                >
                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.92fr)]">
                    <div className="min-w-0 space-y-6">
                      <TextField
                        error={errors.title}
                        label="Project title"
                        onChange={(value) => updateValue('title', value)}
                        placeholder="Name this garment project"
                        required
                        value={values.title}
                      />

                      <ChoiceField
                        error={errors.garmentType}
                        label="Garment type"
                        onChange={(value) => updateValue('garmentType', value as GarmentType)}
                        options={garmentTypes}
                        value={values.garmentType}
                      />

                      <div className="grid gap-4 md:grid-cols-2">
                        <SuggestionField
                          label="Collection"
                          onChange={(value) => updateValue('collection', value)}
                          placeholder="Collection or capsule"
                          suggestions={collectionSuggestions}
                          value={values.collection}
                        />
                        <SuggestionField
                          label="Season"
                          onChange={(value) => updateValue('season', value)}
                          placeholder="Season or release window"
                          suggestions={seasonSuggestions}
                          value={values.season}
                        />
                      </div>
                    </div>

                    <div>
                      <FieldLabel label="Project hero (optional)" />
                      <ImageSlot
                        adjustmentContext="projectHero"
                        aspectClassName="aspect-[4/5] sm:aspect-[4/3] xl:aspect-[3/4]"
                        className="mt-2 max-h-[32rem] bg-midnight/40"
                        compact
                        controlsMode="menu"
                        label="Project Hero"
                        onRemove={removeHeroImage}
                        onSave={saveHeroImage}
                        placeholderText="Add a lead garment image"
                        projectAdaptive
                        showReadabilityOverlay={false}
                        value={heroImage}
                      />
                      <p className="mt-2 text-xs leading-5 text-stardust/42">
                        Portrait garment images are preserved with adaptive framing. You can refine the focal point before saving.
                      </p>
                    </div>
                  </div>
                </FormSection>
              ) : null}

              {activeStep === 1 ? (
                <FormSection
                  description="Capture the intent, shape, wearer, and visual language behind the garment."
                  title="Creative Direction"
                >
                  <div className="grid gap-5 md:grid-cols-2">
                    <TextAreaField
                      label="Design intent"
                      onChange={(value) => updateValue('designIntent', value)}
                      placeholder="What should this garment communicate or accomplish?"
                      value={values.designIntent}
                    />
                    <TextAreaField
                      label="Description"
                      onChange={(value) => updateValue('summary', value)}
                      placeholder="A concise overview of the garment"
                      value={values.summary}
                    />
                    <TextAreaField
                      label="Target wearer"
                      onChange={(value) => updateValue('targetWearer', value)}
                      placeholder="Who is this piece being designed for?"
                      value={values.targetWearer}
                    />
                    <TextAreaField
                      label="Silhouette"
                      onChange={(value) => updateValue('silhouette', value)}
                      placeholder="Describe volume, proportion, length, and line"
                      value={values.silhouette}
                    />
                    <div className="md:col-span-2">
                      <FeatureTokenField
                        onChange={(features) => updateValue('keyFeatures', features)}
                        values={values.keyFeatures}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <TextAreaField
                        label="Color story"
                        onChange={(value) => updateValue('colorStory', value)}
                        placeholder="Describe the palette and how color supports the garment story"
                        value={values.colorStory}
                      />
                    </div>
                  </div>
                </FormSection>
              ) : null}

              {activeStep === 2 ? (
                <FormSection
                  description="Place the garment in the studio workflow and define its working timeline."
                  title="Workflow & Schedule"
                >
                  <WorkflowRecommendation
                    onApplyProgress={() => updateValue('progress', recommendation.progress.toString())}
                    onApplyStatus={() => updateValue('status', recommendation.status)}
                    progress={progressValue}
                    recommendation={recommendation}
                    status={values.status}
                  />

                  <div className="mt-7 grid gap-7">
                    <ChoiceField
                      label="Project status"
                      onChange={(value) => updateValue('status', value as ProjectStatus)}
                      options={projectStatuses}
                      value={values.status}
                    />
                    <ChoiceField
                      label="Workflow phase"
                      onChange={(value) => updateValue('phase', value as ProjectPhase)}
                      options={projectPhases}
                      value={values.phase}
                    />
                    <div className="grid gap-6 xl:grid-cols-2">
                      <ChoiceField
                        label="Priority"
                        onChange={(value) => updateValue('priority', value as TaskPriority)}
                        options={priorities}
                        value={values.priority}
                      />
                      <ChoiceField
                        label="Difficulty"
                        onChange={(value) => updateValue('difficulty', value as ProjectDifficulty)}
                        options={difficulties}
                        value={values.difficulty}
                      />
                    </div>
                    <ProgressField
                      error={errors.progress}
                      onChange={(value) => updateValue('progress', value)}
                      value={values.progress}
                    />
                    <div className="grid gap-4 md:grid-cols-2">
                      <TextField
                        label="Start date"
                        onChange={(value) => updateValue('startDate', value)}
                        type="date"
                        value={values.startDate}
                      />
                      <TextField
                        error={errors.targetDate}
                        label="Target date"
                        onChange={(value) => updateValue('targetDate', value)}
                        type="date"
                        value={values.targetDate}
                      />
                    </div>
                  </div>
                </FormSection>
              ) : null}

              {activeStep === 3 ? (
                <FormSection
                  description="Review the studio signal, add any final notes, and save when it feels right."
                  title="Review & Notes"
                >
                  <ProjectReview
                    heroImage={heroImage}
                    onEdit={goToStep}
                    progress={progressValue}
                    values={values}
                  />
                  <div className="mt-6">
                    <TextAreaField
                      label="General notes"
                      onChange={(value) => updateValue('generalNotes', value)}
                      placeholder="Anything the studio should keep in view as this project develops"
                      value={values.generalNotes}
                    />
                  </div>
                </FormSection>
              ) : null}
            </div>
          </div>

          <footer className="z-30 flex shrink-0 items-center justify-between gap-3 border-t border-bronze/24 bg-midnight/94 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:px-6">
            <Button onClick={requestClose} size="sm" type="button" variant="ghost">Cancel</Button>
            <div className="flex items-center gap-2">
              {activeStep > 0 ? (
                <Button icon={<ArrowLeft size={16} />} onClick={goToPreviousStep} size="sm" type="button">Back</Button>
              ) : null}
              {activeStep < steps.length - 1 ? (
                <Button icon={<ArrowRight size={16} />} onClick={goToNextStep} size="sm" type="button" variant="primary">Next</Button>
              ) : (
                <Button icon={<Check size={16} />} onClick={saveProject} size="sm" type="button" variant="primary">
                  {mode === 'create' ? 'Create Project' : 'Save Changes'}
                </Button>
              )}
            </div>
          </footer>
        </form>
      </div>

      {discardOpen ? (
        <DiscardDialog
          onCancel={() => setDiscardOpen(false)}
          onDiscard={() => void discardChanges()}
        />
      ) : null}
    </div>
  );
}

function MobileStepProgress({ activeStep, onSelect }: { activeStep: number; onSelect: (step: number) => void }) {
  return (
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
            onClick={() => onSelect(index)}
            type="button"
          />
        ))}
      </div>
      <p className="mt-2 text-sm font-medium text-stardust/72">{steps[activeStep].title}</p>
    </div>
  );
}

function StepNavigation({ activeStep, onSelect }: { activeStep: number; onSelect: (step: number) => void }) {
  return (
    <nav className="hidden border-r border-bronze/20 p-5 lg:block" aria-label="Project form sections">
      <div className="sticky top-6 space-y-2">
        {steps.map((step, index) => (
          <button
            className={cn(
              'flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition',
              index === activeStep
                ? 'border-ember/50 bg-ember/12 text-stardust'
                : 'border-transparent text-stardust/52 hover:border-bronze/25 hover:bg-stardust/[0.04] hover:text-stardust/78',
            )}
            key={step.title}
            onClick={() => onSelect(index)}
            type="button"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-bronze/30 text-[0.68rem] font-semibold text-ember">
              {index < activeStep ? <Check size={13} /> : step.eyebrow}
            </span>
            <span className="text-sm font-medium">{step.title}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function FormSection({ children, description, title }: { children: ReactNode; description: string; title: string }) {
  return (
    <section>
      <h3 className="font-display text-2xl text-stardust">{title}</h3>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-stardust/48">{description}</p>
      <div className="mt-7">{children}</div>
    </section>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <span className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-stardust/42">
      {label}{required ? <span className="ml-1 text-ember">*</span> : null}
    </span>
  );
}

function FieldError({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-xs text-ember">{children}</p>;
}

function TextField({
  error,
  label,
  onChange,
  placeholder,
  required,
  type = 'text',
  value,
}: {
  error?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: 'date' | 'text';
  value: string;
}) {
  return (
    <label className="block">
      <FieldLabel label={label} required={required} />
      <input
        className={cn(inputClassName, error && 'border-ember/70')}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
      {error ? <FieldError>{error}</FieldError> : null}
    </label>
  );
}

function TextAreaField({ label, onChange, placeholder, value }: { label: string; onChange: (value: string) => void; placeholder?: string; value: string }) {
  return (
    <label className="block">
      <FieldLabel label={label} />
      <textarea
        className={textareaClassName}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function ChoiceField({ error, label, onChange, options, value }: { error?: string; label: string; onChange: (value: string) => void; options: readonly string[]; value: string }) {
  return (
    <div>
      <FieldLabel label={label} required={label === 'Garment type'} />
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            className={cn(
              'min-h-11 rounded-full border px-4 text-sm font-medium transition',
              value === option
                ? 'border-ember/65 bg-ember/14 text-stardust shadow-[0_8px_24px_rgba(200,155,60,0.1)]'
                : 'border-bronze/25 bg-midnight/38 text-stardust/58 hover:border-bronze/58 hover:text-stardust/82',
            )}
            key={option}
            onClick={() => onChange(option)}
            type="button"
          >
            {option}
          </button>
        ))}
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}

function SuggestionField({ label, onChange, placeholder, suggestions, value }: { label: string; onChange: (value: string) => void; placeholder: string; suggestions: string[]; value: string }) {
  return (
    <div>
      <TextField label={label} onChange={onChange} placeholder={placeholder} value={value} />
      {suggestions.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions.map((suggestion) => (
            <button
              className="rounded-full border border-bronze/22 bg-midnight/32 px-3 py-1.5 text-xs text-stardust/52 transition hover:border-ember/45 hover:text-stardust"
              key={suggestion}
              onClick={() => onChange(suggestion)}
              type="button"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FeatureTokenField({ onChange, values }: { onChange: (values: string[]) => void; values: string[] }) {
  const [draft, setDraft] = useState('');

  const addDraft = () => {
    const next = draft.trim();
    if (!next) return;
    if (!values.some((feature) => feature.toLowerCase() === next.toLowerCase())) {
      onChange([...values, next]);
    }
    setDraft('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' && event.key !== ',') return;
    event.preventDefault();
    addDraft();
  };

  return (
    <div>
      <FieldLabel label="Key features" />
      <div className="rounded-xl border border-bronze/30 bg-midnight/58 p-3 focus-within:border-ember/65 focus-within:shadow-[0_0_0_3px_rgba(200,155,60,0.1)]">
        {values.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {values.map((feature) => (
              <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-ember/34 bg-ember/10 px-3 text-sm text-stardust/78" key={feature}>
                {feature}
                <button aria-label={`Remove ${feature}`} className="text-stardust/40 hover:text-ember" onClick={() => onChange(values.filter((item) => item !== feature))} type="button">
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <Plus className="shrink-0 text-ember/72" size={17} />
          <input
            className="h-10 min-w-0 flex-1 bg-transparent text-base text-stardust outline-none placeholder:text-stardust/30 sm:text-sm"
            onBlur={addDraft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a signature detail and press Enter"
            value={draft}
          />
        </div>
      </div>
      <p className="mt-2 text-xs text-stardust/38">Add one construction or design signature at a time.</p>
    </div>
  );
}

function WorkflowRecommendation({
  onApplyProgress,
  onApplyStatus,
  progress,
  recommendation,
  status,
}: {
  onApplyProgress: () => void;
  onApplyStatus: () => void;
  progress: number;
  recommendation: { progress: number; status: ProjectStatus };
  status: ProjectStatus;
}) {
  const protectStatus = status === 'Paused' || status === 'Blocked';
  const statusAligned = protectStatus || status === recommendation.status;
  const progressAligned = progress === recommendation.progress;

  return (
    <div className="rounded-2xl border border-ember/26 bg-[linear-gradient(135deg,rgba(200,155,60,0.1),rgba(45,92,107,0.08),rgba(10,10,10,0.32))] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ember/32 bg-midnight/48 text-ember">
          <Lightbulb size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-stardust">Studio recommendation</p>
          <p className="mt-1 text-sm leading-6 text-stardust/50">
            This phase typically signals {recommendation.status} at {recommendation.progress}% progress. Nothing changes unless you apply it.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {!statusAligned ? <Button onClick={onApplyStatus} size="sm" type="button">Use {recommendation.status}</Button> : null}
            {!progressAligned ? <Button onClick={onApplyProgress} size="sm" type="button">Use {recommendation.progress}%</Button> : null}
            {statusAligned && progressAligned ? <Badge variant="teal">Workflow aligned</Badge> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressField({ error, onChange, value }: { error?: string; onChange: (value: string) => void; value: string }) {
  const progress = clampProgress(value);
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <FieldLabel label="Project progress" />
        <span className="text-sm font-semibold text-ember">{progress}%</span>
      </div>
      <div className="grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_6rem]">
        <input
          aria-label="Project progress slider"
          className="h-3 w-full accent-[#C89B3C]"
          max={100}
          min={0}
          onChange={(event) => onChange(event.target.value)}
          type="range"
          value={progress}
        />
        <div className="relative">
          <input
            aria-label="Project progress percentage"
            className={cn(inputClassName, 'pr-9', error && 'border-ember/70')}
            inputMode="numeric"
            max={100}
            min={0}
            onChange={(event) => onChange(event.target.value)}
            onFocus={(event) => { if (event.currentTarget.value === '0') event.currentTarget.select(); }}
            type="number"
            value={value}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stardust/38">%</span>
        </div>
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}

function ProjectReview({ heroImage, onEdit, progress, values }: { heroImage?: LocalImageAsset; onEdit: (step: number) => void; progress: number; values: ProjectFormValues }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-bronze/28 bg-midnight/38 shadow-[0_24px_70px_rgba(0,0,0,0.24)]">
      <div className="grid lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
        <div className="relative aspect-[4/5] min-h-64 overflow-hidden border-b border-bronze/22 lg:aspect-auto lg:min-h-[26rem] lg:border-b-0 lg:border-r">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(200,155,60,0.25),transparent_30%),linear-gradient(145deg,rgba(27,58,99,0.7),rgba(10,10,10,0.8),rgba(61,43,31,0.72))]" />
          {heroImage ? <AdaptiveStoredImage asset={heroImage} className="absolute inset-0" /> : null}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-midnight via-midnight/70 to-transparent p-5 pt-20">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-ember">Project preview</p>
            <p className="font-display mt-2 text-2xl leading-tight text-stardust">{values.title.trim() || 'Untitled project'}</p>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant="teal">{values.status}</Badge>
            <Badge variant="bronze">{values.phase}</Badge>
            <Badge variant="ember">{progress}%</Badge>
          </div>
          <p className="mt-4 text-sm leading-6 text-stardust/56">{values.summary.trim() || values.designIntent.trim() || 'The project story can continue developing after creation.'}</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <ReviewDatum label="Garment" value={values.garmentType || 'Not selected'} />
            <ReviewDatum label="Collection" value={values.collection.trim() || 'Unassigned'} />
            <ReviewDatum label="Season" value={values.season.trim() || 'Unscheduled'} />
            <ReviewDatum label="Target" value={values.targetDate ? formatStudioDate(values.targetDate) : 'Not scheduled'} />
          </div>

          {values.keyFeatures.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {values.keyFeatures.map((feature) => <span className="rounded-full border border-bronze/26 bg-midnight/42 px-3 py-1.5 text-xs text-stardust/60" key={feature}>{feature}</span>)}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-2 border-t border-bronze/18 pt-5">
            <Button onClick={() => onEdit(0)} size="sm" type="button">Edit identity</Button>
            <Button onClick={() => onEdit(1)} size="sm" type="button">Edit direction</Button>
            <Button onClick={() => onEdit(2)} size="sm" type="button">Edit workflow</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-bronze/20 bg-midnight/34 p-3">
      <p className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-stardust/36">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-stardust/82">{value}</p>
    </div>
  );
}

function DiscardDialog({ onCancel, onDiscard }: { onCancel: () => void; onDiscard: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-midnight/82 p-4 backdrop-blur-xl" role="presentation">
      <div aria-labelledby="discard-project-title" aria-modal="true" className="w-full max-w-md rounded-2xl border border-bronze/34 bg-[linear-gradient(145deg,rgba(27,58,99,0.25),rgba(10,10,10,0.98),rgba(61,43,31,0.52))] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.52)]" role="dialog">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-ember/34 bg-ember/10 text-ember"><Trash2 size={18} /></span>
        <h3 className="mt-4 text-xl font-semibold text-stardust" id="discard-project-title">Discard project changes?</h3>
        <p className="mt-2 text-sm leading-6 text-stardust/52">Your existing project remains safe. Unsaved form values and temporary images will be removed.</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={onCancel} type="button" variant="ghost">Keep editing</Button>
          <Button onClick={onDiscard} type="button" variant="primary">Discard</Button>
        </div>
      </div>
    </div>
  );
}

function getEmptyFormValues(): ProjectFormValues {
  return {
    collection: '',
    colorStory: '',
    designIntent: '',
    difficulty: 'Moderate',
    garmentType: '',
    generalNotes: '',
    keyFeatures: [],
    phase: 'Concept',
    priority: 'Medium',
    progress: '0',
    season: '',
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
    keyFeatures: [...project.keyFeatures],
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

function formValuesToProjectDetails(values: ProjectFormValues): ProjectDetailsInput {
  const keyFeatures = Array.from(new Set(values.keyFeatures.map((feature) => feature.trim()).filter(Boolean)));
  return {
    collection: values.collection.trim() || 'Unassigned',
    colorStory: values.colorStory.trim(),
    designIntent: values.designIntent.trim(),
    difficulty: values.difficulty,
    garmentType: values.garmentType as GarmentType,
    generalNotes: values.generalNotes.trim(),
    keyFeatures,
    name: values.title.trim(),
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

function validateProjectForm(values: ProjectFormValues) {
  const errors: Record<string, string> = {};
  if (!values.title.trim()) errors.title = 'Add a project title.';
  if (!values.garmentType) errors.garmentType = 'Choose a garment type.';
  const progress = Number(values.progress);
  if (!Number.isFinite(progress) || progress < 0 || progress > 100) errors.progress = 'Progress must be between 0 and 100.';
  if (values.startDate && values.targetDate && values.targetDate < values.startDate) errors.targetDate = 'Target date cannot be before the start date.';
  return errors;
}

function getErrorStep(errors: Record<string, string>) {
  if (errors.title || errors.garmentType) return 0;
  if (errors.progress || errors.targetDate) return 2;
  return 3;
}

function getSuggestions(values: string[], currentValue: string) {
  const current = currentValue.trim().toLowerCase();
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
    .filter((value) => value.toLowerCase() !== current)
    .slice(0, 6);
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
  if (Number.isNaN(parsed)) return 0;
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
