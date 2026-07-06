import type { ComponentType } from 'react';
import type { EditorialBlockType } from '../../../types/editorial';
import { FabricSwatchBlock, MeasurementTableBlock } from './DataBlocks';
import { DividerBlock, SpacerBlock } from './LayoutBlocks';
import { GalleryBlock, ImageBlock } from './MediaBlocks';
import { CalloutBlock, HeadingBlock, ParagraphBlock, QuoteBlock } from './TextBlocks';
import type { EditorialBlockRendererProps } from './types';
import { UnknownBlock } from './UnknownBlock';

const blockRenderers: Partial<
  Record<EditorialBlockType, ComponentType<EditorialBlockRendererProps>>
> = {
  callout: CalloutBlock,
  divider: DividerBlock,
  fabricSwatch: FabricSwatchBlock,
  gallery: GalleryBlock,
  heading: HeadingBlock,
  image: ImageBlock,
  materials: FabricSwatchBlock,
  measurementTable: MeasurementTableBlock,
  paragraph: ParagraphBlock,
  quote: QuoteBlock,
  spacer: SpacerBlock,
  specifications: MeasurementTableBlock,
  text: ParagraphBlock,
};

export function EditorialBlockRenderer(props: EditorialBlockRendererProps) {
  const Renderer = blockRenderers[props.block.type] ?? UnknownBlock;
  return <Renderer {...props} />;
}

export function EditorialBlockList({
  blocks,
  className = 'mt-6 flex flex-col gap-[var(--editorial-content-gap)]',
  fabrics,
  prominent = false,
  project,
  theme,
}: {
  blocks: EditorialBlockRendererProps['block'][];
  className?: string;
  fabrics?: EditorialBlockRendererProps['fabrics'];
  prominent?: boolean;
  project?: EditorialBlockRendererProps['project'];
  theme: EditorialBlockRendererProps['theme'];
}) {
  if (blocks.length === 0) return null;
  return (
    <div className={className}>
      {[...blocks]
        .sort((a, b) => a.order - b.order)
        .map((block) => (
          <EditorialBlockRenderer
            block={block}
            fabrics={fabrics}
            key={block.id}
            prominent={prominent}
            project={project}
            theme={theme}
          />
        ))}
    </div>
  );
}
