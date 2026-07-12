import type {
  EditorialCollection,
  EditorialScene,
  EditorialTheme,
} from '../../../types/editorial';
import type { ApparelProject, Fabric } from '../../../types/studio';

export type EditorialSceneRendererProps = {
  authoring?: {
    onSelectBlock: (blockId: string) => void;
    selectedBlockId?: string;
  };
  collection: EditorialCollection;
  fabrics?: Fabric[];
  project?: ApparelProject;
  scene: EditorialScene;
  theme: EditorialTheme;
};
