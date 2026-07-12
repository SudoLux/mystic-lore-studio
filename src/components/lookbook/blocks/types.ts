import type { EditorialBlock, EditorialTheme } from '../../../types/editorial';
import type { ApparelProject, Fabric } from '../../../types/studio';

export type EditorialBlockRendererProps = {
  authoring?: {
    onSelectBlock: (blockId: string) => void;
    selectedBlockId?: string;
  };
  block: EditorialBlock;
  fabrics?: Fabric[];
  prominent?: boolean;
  project?: ApparelProject;
  theme: EditorialTheme;
};
