import type {
  EditorialCollection,
  EditorialScene,
  EditorialTheme,
} from '../../../types/editorial';
import type { ApparelProject } from '../../../types/studio';

export type EditorialSceneRendererProps = {
  collection: EditorialCollection;
  project?: ApparelProject;
  scene: EditorialScene;
  theme: EditorialTheme;
};
