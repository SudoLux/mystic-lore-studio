import type { EditorialCollection, EditorialScene } from '../../types/editorial';
import type { DomainCommand, DomainRepository, DomainSelector } from '../shared/contracts';

export type EditorialCommand =
  | DomainCommand<'editorial.create', EditorialCollection>
  | DomainCommand<'editorial.update', EditorialCollection>
  | DomainCommand<'editorial.delete', { id: string }>;

export interface EditorialRepository
  extends DomainRepository<EditorialCollection, EditorialCollection> {
  apply(command: EditorialCommand): Promise<void>;
}

export type EditorialSelectors = {
  orderedScenes: DomainSelector<EditorialCollection, EditorialScene[]>;
  forGarment: DomainSelector<{ collections: EditorialCollection[]; projectId: string }, EditorialCollection[]>;
};
