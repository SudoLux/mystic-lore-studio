import type {
  ApparelProject,
  ProjectDetailsInput,
  ProjectHeroImageIntent,
} from '../../types/studio';
import type {
  DomainCommand,
  DomainRepository,
  DomainSelector,
} from '../shared/contracts';

/** The stable 2.0 garment workspace vocabulary. */
export const garmentLenses = [
  'overview',
  'design',
  'technical',
  'production',
  'editorial',
  'portfolio',
] as const;

export type GarmentLens = (typeof garmentLenses)[number];

export type GarmentCommand =
  | DomainCommand<'garment.create', ApparelProject>
  | DomainCommand<'garment.update-details', { details: ProjectDetailsInput; id: string }>
  | DomainCommand<'garment.update-hero', { id: string; intent: ProjectHeroImageIntent }>
  | DomainCommand<'garment.delete', { id: string }>;

export interface GarmentRepository
  extends DomainRepository<ApparelProject, ProjectDetailsInput> {
  apply(command: GarmentCommand): Promise<void>;
}

export type GarmentSelectors = {
  byId: DomainSelector<{ id: string; projects: ApparelProject[] }, ApparelProject | null>;
  byLens: DomainSelector<{ lens: GarmentLens; project: ApparelProject }, unknown>;
};

/** Legacy projects remain the current garment adapter through WP2. */
export const legacyGarmentSelectors: GarmentSelectors = {
  byId: ({ id, projects }) => projects.find((project) => project.id === id) ?? null,
  byLens: ({ lens, project }) => {
    if (lens === 'design') return project.designIntent;
    if (lens === 'technical') return project.keyFeatures;
    if (lens === 'production') return project.tasks;
    if (lens === 'editorial') return project.lookbookPages;
    if (lens === 'portfolio') return project.portfolio;
    return project;
  },
};
