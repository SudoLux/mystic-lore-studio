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
  authoring,
  blocks,
  className = 'mt-6 flex flex-col gap-[var(--editorial-content-gap)]',
  fabrics,
  prominent = false,
  project,
  theme,
}: {
  authoring?: EditorialBlockRendererProps['authoring'];
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
          <div
            className={authoring ? `group/editorial-block relative cursor-pointer rounded-lg outline-offset-4 transition ${authoring.selectedBlockId === block.id ? 'outline outline-2 outline-ember/80' : 'hover:outline hover:outline-1 hover:outline-ember/40'}` : undefined}
            key={block.id}
            onClick={authoring ? (event) => { event.stopPropagation(); authoring.onSelectBlock(block.id); } : undefined}
          >
            <EditorialBlockRenderer
              authoring={authoring}
              block={block}
              fabrics={fabrics}
              prominent={prominent}
              project={project}
              theme={theme}
            />
            {authoring ? <span className="pointer-events-none absolute right-2 top-2 rounded-full border border-ember/28 bg-midnight/86 px-2 py-1 text-[0.5rem] uppercase tracking-[0.12em] text-ember opacity-0 shadow-lg transition group-hover/editorial-block:opacity-100">Edit</span> : null}
          </div>
        ))}
    </div>
  );
}
