import type { Fabric, LinkedMaterial } from '../../types/studio';
import type { DomainCommand, DomainRepository, DomainSelector } from '../shared/contracts';

export type MaterialCommand =
  | DomainCommand<'material.create', LinkedMaterial>
  | DomainCommand<'material.update', LinkedMaterial>
  | DomainCommand<'material.delete', { id: string }>;

export interface MaterialRepository extends DomainRepository<LinkedMaterial, LinkedMaterial> {
  apply(command: MaterialCommand): Promise<void>;
}

export type MaterialSelectors = {
  fabricById: DomainSelector<{ fabrics: Fabric[]; id: string }, Fabric | null>;
  linkedToGarment: DomainSelector<{ materials: LinkedMaterial[]; projectId: string }, LinkedMaterial[]>;
};
