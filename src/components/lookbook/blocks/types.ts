import type { EditorialBlock, EditorialTheme } from '../../../types/editorial';

export type EditorialBlockRendererProps = {
  block: EditorialBlock;
  prominent?: boolean;
  theme: EditorialTheme;
};
