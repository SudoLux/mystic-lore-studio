import type {
  EditorialCollection,
  EditorialScene,
  EditorialTheme,
} from '../../../types/editorial';
import type { ApparelProject, Fabric } from '../../../types/studio';

export type EditorialSceneRendererProps = {
  collection: EditorialCollection;
  fabrics?: Fabric[];
  project?: ApparelProject;
  scene: EditorialScene;
  theme: EditorialTheme;
};
