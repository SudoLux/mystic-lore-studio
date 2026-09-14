import type { PortfolioProfile, PortfolioProjectSettings } from '../../types/portfolio';
import type { ApparelProject } from '../../types/studio';
import type { DomainCommand, DomainSelector } from '../shared/contracts';

export type PortfolioCommand =
  | DomainCommand<'portfolio.update-profile', Partial<PortfolioProfile>>
  | DomainCommand<'portfolio.update-project-settings', { projectId: string; settings: Partial<PortfolioProjectSettings> }>
  | DomainCommand<'portfolio.publish', { projectId: string }>
  | DomainCommand<'portfolio.unpublish', { projectId: string }>;

export interface PortfolioProfileRepository {
  apply(command: PortfolioCommand): Promise<void>;
  get(): Promise<PortfolioProfile | null>;
  save(profile: PortfolioProfile): Promise<PortfolioProfile>;
}

export type PortfolioSelectors = {
  publicProjects: DomainSelector<ApparelProject[], ApparelProject[]>;
};
