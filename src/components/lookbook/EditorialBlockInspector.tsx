import { useEffect, useState, type ReactNode } from 'react';
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Image as ImageIcon,
  MessageSquareText,
  Minus,
  Plus,
  Quote,
  Space,
  Trash2,
  Type,
} from 'lucide-react';
import { cn } from '../../lib/classes';
import {
  convertEditorialBlockType,
  createEditorialBlock,
  editableEditorialBlockOptions,
  editorialBlockLabel,
  editorialBlockSummary,
  type EditableEditorialBlockType,
} from '../../lib/editorialBlocks';
import type { EditorialBlock, EditorialJsonObject, EditorialJsonValue } from '../../types/editorial';
import { contentString, isContentRecord } from './blocks/blockContent';

type EditorialBlockInspectorProps = {
  blocks: EditorialBlock[];
  onChange: (blocks: EditorialBlock[]) => void;
  sceneId: string;
};

export function EditorialBlockInspector({
  blocks,
  onChange,
  sceneId,
}: EditorialBlockInspectorProps) {
  const orderedBlocks = [...blocks].sort((a, b) => a.order - b.order);
  const [activeBlockId, setActiveBlockId] = useState(orderedBlocks[0]?.id ?? '');
  const [newBlockType, setNewBlockType] = useState<EditableEditorialBlockType>('heading');
  const activeBlock = orderedBlocks.find((block) => block.id === activeBlockId) ?? orderedBlocks[0];

  useEffect(() => {
    if (activeBlockId && orderedBlocks.some((block) => block.id === activeBlockId)) return;
    setActiveBlockId(orderedBlocks[0]?.id ?? '');
  }, [activeBlockId, orderedBlocks]);

  const commit = (nextBlocks: EditorialBlock[]) => {
    onChange(nextBlocks.map((block, order) => ({ ...block, order })));
  };

  const addBlock = () => {
    const block = createEditorialBlock(sceneId, newBlockType, orderedBlocks.length);
    commit([...orderedBlocks, block]);
    setActiveBlockId(block.id);
  };

  const updateBlock = (updatedBlock: EditorialBlock) => {
    commit(orderedBlocks.map((block) => block.id === updatedBlock.id ? updatedBlock : block));
  };

  const moveBlock = (direction: -1 | 1) => {
    if (!activeBlock) return;
    const currentIndex = orderedBlocks.findIndex((block) => block.id === activeBlock.id);
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= orderedBlocks.length) return;
    const reordered = [...orderedBlocks];
    [reordered[currentIndex], reordered[nextIndex]] = [reordered[nextIndex], reordered[currentIndex]];
    commit(reordered);
  };

  const deleteBlock = () => {
    if (!activeBlock) return;
    const currentIndex = orderedBlocks.findIndex((block) => block.id === activeBlock.id);
    const remaining = orderedBlocks.filter((block) => block.id !== activeBlock.id);
    commit(remaining);
    setActiveBlockId(remaining[Math.min(currentIndex, remaining.length - 1)]?.id ?? '');
  };

  return (
    <section className="border-t border-bronze/18 pt-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-ember">Content Blocks</p>
          <p className="mt-1 text-xs text-stardust/38">{orderedBlocks.length} in this scene</p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <select
          aria-label="New block type"
          className="h-11 min-w-0 flex-1 rounded-xl border border-bronze/28 bg-midnight/64 px-3 text-xs text-stardust outline-none focus:border-ember/58"
          onChange={(event) => setNewBlockType(event.target.value as EditableEditorialBlockType)}
          value={newBlockType}
        >
          {editableEditorialBlockOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <button aria-label="Add content block" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-ember/38 bg-ember/9 text-ember transition hover:bg-ember/16" onClick={addBlock} type="button"><Plus size={17} /></button>
      </div>

      {orderedBlocks.length > 0 ? (
        <>
          <div className="mt-3 space-y-2">
            {orderedBlocks.map((block, index) => (
              <button
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition',
                  block.id === activeBlock?.id
                    ? 'border-ember/48 bg-ember/[0.08]'
                    : 'border-stardust/9 bg-midnight/28 hover:border-bronze/30',
                )}
                key={block.id}
                onClick={() => setActiveBlockId(block.id)}
                type="button"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-bronze/22 text-ember/78">{blockIcon(block.type)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.58rem] uppercase tracking-[0.13em] text-stardust/34">{String(index + 1).padStart(2, '0')} · {editorialBlockLabel(block.type)}</span>
                  <span className="mt-1 block truncate text-xs text-stardust/66">{editorialBlockSummary(block)}</span>
                </span>
              </button>
            ))}
          </div>

          {activeBlock ? (
            <div className="mt-4 rounded-xl border border-bronze/22 bg-midnight/34 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-stardust">Edit {editorialBlockLabel(activeBlock.type)}</p>
                <div className="flex gap-1">
                  <BlockToolButton disabled={activeBlock.order <= 0} label="Move block up" onClick={() => moveBlock(-1)}><ChevronUp size={15} /></BlockToolButton>
                  <BlockToolButton disabled={activeBlock.order >= orderedBlocks.length - 1} label="Move block down" onClick={() => moveBlock(1)}><ChevronDown size={15} /></BlockToolButton>
                  <BlockToolButton danger label="Delete block" onClick={deleteBlock}><Trash2 size={14} /></BlockToolButton>
                </div>
              </div>
              <div className="mt-4">
                <BlockFields block={activeBlock} onChange={updateBlock} />
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-bronze/22 px-4 py-6 text-center">
          <FileText className="mx-auto text-ember/62" size={19} />
          <p className="mt-3 text-xs leading-5 text-stardust/42">Add a heading or paragraph to begin composing this scene.</p>
        </div>
      )}
    </section>
  );
}

function BlockFields({
  block,
  onChange,
}: {
  block: EditorialBlock;
  onChange: (block: EditorialBlock) => void;
}) {
  const isEditable = editableEditorialBlockOptions.some((option) => option.value === block.type);
  const updateContent = (updates: Record<string, EditorialJsonValue>) => {
    const currentContent = isContentRecord(block.content)
      ? block.content as EditorialJsonObject
      : {};
    onChange({ ...block, content: { ...currentContent, ...updates } });
  };

  return (
    <div className="space-y-4">
      <BlockField label="Block type">
        <select
          className={fieldClassName}
          onChange={(event) => onChange(convertEditorialBlockType(block, event.target.value as EditableEditorialBlockType))}
          value={isEditable ? block.type : ''}
        >
          {!isEditable ? <option value="">{editorialBlockLabel(block.type)} (legacy)</option> : null}
          {editableEditorialBlockOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </BlockField>

      {block.type === 'heading' ? (
        <>
          <BlockField label="Heading"><input className={fieldClassName} onChange={(event) => updateContent({ text: event.target.value })} value={contentString(block.content, 'text')} /></BlockField>
          <BlockField label="Eyebrow (optional)"><input className={fieldClassName} onChange={(event) => updateContent({ eyebrow: event.target.value })} value={contentString(block.content, 'eyebrow')} /></BlockField>
          <AlignmentField block={block} onChange={updateContent} />
        </>
      ) : null}

      {block.type === 'paragraph' ? (
        <>
          <BlockField label="Paragraph"><textarea className={textAreaClassName} onChange={(event) => updateContent({ text: event.target.value })} value={contentString(block.content, 'text')} /></BlockField>
          <AlignmentField block={block} onChange={updateContent} />
        </>
      ) : null}

      {block.type === 'quote' ? (
        <>
          <BlockField label="Quote"><textarea className={textAreaClassName} onChange={(event) => updateContent({ text: event.target.value })} value={contentString(block.content, 'text')} /></BlockField>
          <BlockField label="Attribution (optional)"><input className={fieldClassName} onChange={(event) => updateContent({ attribution: event.target.value })} value={contentString(block.content, 'attribution')} /></BlockField>
        </>
      ) : null}

      {block.type === 'image' ? (
        <>
          <BlockField label="Image URL"><input className={fieldClassName} inputMode="url" onChange={(event) => updateContent({ url: event.target.value })} placeholder="https://..." type="url" value={contentString(block.content, 'url')} /></BlockField>
          <BlockField label="Alt text"><input className={fieldClassName} onChange={(event) => updateContent({ alt: event.target.value })} placeholder="Describe the image" value={contentString(block.content, 'alt')} /></BlockField>
          <BlockField label="Caption (optional)"><input className={fieldClassName} onChange={(event) => updateContent({ caption: event.target.value })} value={contentString(block.content, 'caption')} /></BlockField>
          <BlockField label="Image fit">
            <select className={fieldClassName} onChange={(event) => updateContent({ fit: event.target.value })} value={contentString(block.content, 'fit', 'cover')}>
              <option value="cover">Fill frame</option>
              <option value="contain">Fit entire image</option>
            </select>
          </BlockField>
        </>
      ) : null}

      {block.type === 'divider' ? (
        <>
          <BlockField label="Label (optional)"><input className={fieldClassName} onChange={(event) => updateContent({ label: event.target.value })} value={contentString(block.content, 'label')} /></BlockField>
          <BlockField label="Style">
            <select className={fieldClassName} onChange={(event) => updateContent({ style: event.target.value })} value={contentString(block.content, 'style', 'gradient')}>
              <option value="gradient">Gradient</option><option value="solid">Solid</option><option value="dotted">Dotted</option>
            </select>
          </BlockField>
        </>
      ) : null}

      {block.type === 'spacer' ? (
        <BlockField label="Spacing size">
          <select className={fieldClassName} onChange={(event) => updateContent({ size: event.target.value })} value={contentString(block.content, 'size', 'medium')}>
            <option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option>
          </select>
        </BlockField>
      ) : null}

      {block.type === 'callout' ? (
        <>
          <BlockField label="Title (optional)"><input className={fieldClassName} onChange={(event) => updateContent({ title: event.target.value })} value={contentString(block.content, 'title')} /></BlockField>
          <BlockField label="Callout"><textarea className={textAreaClassName} onChange={(event) => updateContent({ body: event.target.value })} value={contentString(block.content, 'body')} /></BlockField>
          <BlockField label="Tone">
            <select className={fieldClassName} onChange={(event) => updateContent({ tone: event.target.value })} value={contentString(block.content, 'tone', 'highlight')}>
              <option value="highlight">Highlight</option><option value="note">Note</option><option value="warning">Warning</option>
            </select>
          </BlockField>
        </>
      ) : null}

      {!isEditable ? <p className="rounded-lg border border-bronze/20 bg-midnight/42 p-3 text-xs leading-5 text-stardust/44">This existing block is preserved. Choose one of the supported types above to replace it with an editable block.</p> : null}
    </div>
  );
}

function AlignmentField({
  block,
  onChange,
}: {
  block: EditorialBlock;
  onChange: (updates: Record<string, EditorialJsonValue>) => void;
}) {
  return (
    <BlockField label="Alignment">
      <select className={fieldClassName} onChange={(event) => onChange({ align: event.target.value })} value={contentString(block.content, 'align', 'left')}>
        <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
      </select>
    </BlockField>
  );
}

function BlockField({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[0.58rem] font-semibold uppercase tracking-[0.13em] text-stardust/38">{label}</span>
      {children}
    </label>
  );
}

function BlockToolButton({
  children,
  danger = false,
  disabled = false,
  label,
  onClick,
}: {
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button aria-label={label} className={cn('flex h-8 w-8 items-center justify-center rounded-lg border border-bronze/18 text-stardust/44 transition hover:border-bronze/40 hover:text-stardust disabled:opacity-20', danger ? 'hover:border-red-300/30 hover:text-red-200' : '')} disabled={disabled} onClick={onClick} type="button">{children}</button>
  );
}

function blockIcon(type: EditorialBlock['type']) {
  switch (type) {
    case 'heading': return <Type size={14} />;
    case 'paragraph': case 'text': return <FileText size={14} />;
    case 'quote': return <Quote size={14} />;
    case 'image': return <ImageIcon size={14} />;
    case 'divider': return <Minus size={14} />;
    case 'spacer': return <Space size={14} />;
    case 'callout': return <MessageSquareText size={14} />;
    default: return <FileText size={14} />;
  }
}

const fieldClassName = 'h-11 w-full rounded-xl border border-bronze/24 bg-midnight/68 px-3 text-xs text-stardust outline-none transition placeholder:text-stardust/24 focus:border-ember/56';
const textAreaClassName = 'min-h-24 w-full resize-y rounded-xl border border-bronze/24 bg-midnight/68 px-3 py-3 text-xs leading-5 text-stardust outline-none transition placeholder:text-stardust/24 focus:border-ember/56';
