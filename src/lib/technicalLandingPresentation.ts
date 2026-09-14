import { activeFlat, requiredFlatViews, validateRelease } from '../domains/technical';
import type { CanonicalGarment, CanonicalTechnicalSpec, CanonicalValidationIssue, CanonicalWorkspaceState } from '../domains/workspace';

export type TechnicalProgressState = 'not_started' | 'in_progress' | 'complete' | 'warning';
export type TechnicalReadinessState = 'not_started' | 'in_progress' | 'needs_attention' | 'nearly_ready' | 'release_ready';

export type TechnicalProgressStep = {
  id: 'flats' | 'pom' | 'bom' | 'construction' | 'sample' | 'release';
  label: string;
  state: TechnicalProgressState;
};

export type TechnicalLandingGarment = {
  garment: CanonicalGarment;
  issues: CanonicalValidationIssue[];
  nextAction: string;
  progress: TechnicalProgressStep[];
  readiness: { label: string; percent: number; state: TechnicalReadinessState };
  spec: CanonicalTechnicalSpec | null;
};

/**
 * Presentation-only technical readiness. Every indication comes from the
 * existing technical and release records; this selector never creates or
 * stores a parallel release state.
 */
export function technicalLandingGarments(state: CanonicalWorkspaceState): TechnicalLandingGarment[] {
  const templateId = state.templates.find((item) => item.templateType === 'tech_pack' && item.status === 'active')?.id ?? '';
  return state.garments.map((garment) => {
    const spec = state.technicalSpecs.find((item) => item.garmentId === garment.id) ?? null;
    if (!spec) {
      const progress = progressWithoutSpec();
      return {
        garment,
        issues: [presentationIssue('technical.spec_not_started', 'Technical specification has not been started.')],
        nextAction: 'Start technical specification',
        progress,
        readiness: { label: 'Not started', percent: 0, state: 'not_started' },
        spec: null,
      };
    }

    // A non-empty checkpoint label intentionally removes only the form-field
    // prompt from the overview. Template availability remains a true gate.
    const issues = validateRelease(state, spec.id, { checkpointLabel: 'Technical Studio readiness', templateId }).issues;
    const progress = technicalProgress(state, spec, issues);
    const complete = progress.filter((item) => item.state === 'complete').length;
    const percent = spec.status === 'released' ? 100 : Math.round((complete / progress.length) * 100);
    const hasBlockingIssue = issues.some((item) => item.severity === 'critical');
    const readiness = spec.status === 'released'
      ? { label: 'Release ready', percent: 100, state: 'release_ready' as const }
      : hasBlockingIssue
        ? { label: 'Needs attention', percent, state: 'needs_attention' as const }
        : percent >= 67
          ? { label: 'Nearly ready', percent, state: 'nearly_ready' as const }
          : { label: 'In progress', percent, state: 'in_progress' as const };

    return { garment, issues, nextAction: nextTechnicalAction(state, spec, issues), progress, readiness, spec };
  });
}

function technicalProgress(
  state: CanonicalWorkspaceState,
  spec: CanonicalTechnicalSpec,
  issues: CanonicalValidationIssue[],
): TechnicalProgressStep[] {
  const hasIssue = (domains: Array<CanonicalValidationIssue['domain']>) => issues.some((item) => domains.includes(item.domain));
  const requiredFlats = requiredFlatViews.map((view) => activeFlat(state, spec.id, view));
  const flatsPresent = requiredFlats.filter(Boolean).length;
  const flatsComplete = requiredFlats.every((flat) => Boolean(flat?.approvedAt)) && !hasIssue(['flats']);
  const pomPoints = state.pomPoints.filter((item) => item.specId === spec.id);
  const baseSet = state.measurementSets.find((item) => item.specId === spec.id && item.sampleType === 'base');
  const bomItems = state.bomItems.filter((item) => item.specId === spec.id);
  const sections = state.constructionSections.filter((item) => item.specId === spec.id);
  const sectionIds = new Set(sections.map((item) => item.id));
  const constructionSteps = state.constructionSteps.filter((item) => sectionIds.has(item.sectionId));
  const samples = state.sampleRounds.filter((item) => item.garmentId === spec.garmentId);

  return [
    { id: 'flats', label: 'Flats', state: flatsComplete ? 'complete' : flatsPresent ? 'in_progress' : 'not_started' },
    {
      id: 'pom',
      label: 'POM / specs',
      state: pomPoints.length && baseSet && !hasIssue(['pom', 'measurements']) ? 'complete' : pomPoints.length || baseSet ? 'in_progress' : 'not_started',
    },
    { id: 'bom', label: 'BOM', state: !bomItems.length ? 'not_started' : hasIssue(['bom']) ? 'warning' : 'complete' },
    {
      id: 'construction',
      label: 'Construction',
      state: !sections.length ? 'not_started' : hasIssue(['construction']) ? 'warning' : constructionSteps.length ? 'complete' : 'in_progress',
    },
    {
      id: 'sample',
      label: 'Sample / evidence',
      state: samples.some((item) => item.status === 'approved' || item.status === 'reviewed') ? 'complete' : samples.length ? 'in_progress' : 'not_started',
    },
    { id: 'release', label: 'Release', state: spec.status === 'released' ? 'complete' : issues.some((item) => item.severity === 'critical') ? 'warning' : 'not_started' },
  ];
}

function nextTechnicalAction(state: CanonicalWorkspaceState, spec: CanonicalTechnicalSpec, issues: CanonicalValidationIssue[]) {
  if (!activeFlat(state, spec.id, 'front')) return 'Add front flat';
  if (!activeFlat(state, spec.id, 'back')) return 'Add back flat';
  if (!state.pomPoints.some((item) => item.specId === spec.id)) return 'Add POM points';
  if (!state.measurementSets.some((item) => item.specId === spec.id && item.sampleType === 'base')) return 'Set base measurements';
  if (!state.bomItems.some((item) => item.specId === spec.id)) return 'Review BOM';
  if (!state.constructionSections.some((item) => item.specId === spec.id)) return 'Add construction details';
  if (issues.some((item) => item.severity === 'critical')) return `Resolve ${issues.filter((item) => item.severity === 'critical').length} blocker${issues.filter((item) => item.severity === 'critical').length === 1 ? '' : 's'}`;
  if (issues.length) return `Resolve ${issues.length} item${issues.length === 1 ? '' : 's'}`;
  return spec.status === 'released' ? 'Open tech pack' : 'Prepare release';
}

function progressWithoutSpec(): TechnicalProgressStep[] {
  return [
    { id: 'flats', label: 'Flats', state: 'not_started' },
    { id: 'pom', label: 'POM / specs', state: 'not_started' },
    { id: 'bom', label: 'BOM', state: 'not_started' },
    { id: 'construction', label: 'Construction', state: 'not_started' },
    { id: 'sample', label: 'Sample / evidence', state: 'not_started' },
    { id: 'release', label: 'Release', state: 'not_started' },
  ];
}

function presentationIssue(code: string, message: string): CanonicalValidationIssue {
  return { code, domain: 'release', field: 'technicalSpecs', message, severity: 'error' };
}
