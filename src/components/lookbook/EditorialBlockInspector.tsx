import { useEffect, useState, type ReactNode } from 'react';
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Images,
  Image as ImageIcon,
  MessageSquareText,
  Minus,
  Plus,
  Quote,
  Space,
  Trash2,
  Type,
  SwatchBook,
} from 'lucide-react';
import { cn } from '../../lib/classes';
import { fabricEditorialFallback, projectLinkedEditorialFabrics } from '../../lib/editorialAssets';
import { editorialGalleryLayoutOptions } from '../../lib/editorialMedia';
import type { LinkedEditorialFabric } from '../../lib/editorialAssets';
import {
  convertEditorialBlockType,
  createEditorialBlock,
  editableEditorialBlockOptions,
  editorialBlockLabel,
  editorialBlockSummary,
  type EditableEditorialBlockType,
} from '../../lib/editorialBlocks';
import { getFabricColorHex } from '../../lib/fabricMetadata';
import type { EditorialBlock, EditorialImageContent, EditorialJsonObject, EditorialJsonValue } from '../../types/editorial';
import type { ApparelProject, Fabric, LocalImageAsset } from '../../types/studio';
import { AdaptiveProjectImage } from '../projects/AdaptiveProjectImage';
import { FabricColorOrb } from '../fabrics/FabricColorOrb';
import { EditorialImageFramingControls } from './EditorialImageFramingControls';
import { EditorialMediaPicker } from './EditorialMediaPicker';
import { contentArray, contentString, isContentRecord } from './blocks/blockContent';

type EditorialBlockInspectorProps = {
  activeBlockId?: string;
  blocks: EditorialBlock[];
  editorialImages?: LocalImageAsset[];
  fabrics?: Fabric[];
  hideAdd?: boolean;
  onActiveBlockChange?: (blockId: string) => void;
  onChange: (blocks: EditorialBlock[]) => void;
  onEditMedia?: (block: EditorialBlock) => void;
  onStageAssets?: (images: LocalImageAsset[]) => void;
  project?: ApparelProject;
  sceneId: string;
};

export function EditorialBlockInspector({
  activeBlockId: controlledActiveBlockId,
  blocks,
  editorialImages = [],
  fabrics = [],
  hideAdd = false,
  onActiveBlockChange,
  onChange,
  onEditMedia,
  onStageAssets,
  project,
  sceneId,
}: EditorialBlockInspectorProps) {
  const orderedBlocks = [...blocks].sort((a, b) => a.order - b.order);
  const [internalActiveBlockId, setInternalActiveBlockId] = useState(orderedBlocks[0]?.id ?? '');
  const activeBlockId = controlledActiveBlockId ?? internalActiveBlockId;
  const setActiveBlockId = (blockId: string) => {
    setInternalActiveBlockId(blockId);
    onActiveBlockChange?.(blockId);
  };
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

      {!hideAdd ? <div className="mt-3 flex gap-2">
        <select
          aria-label="New block type"
          className="h-11 min-w-0 flex-1 rounded-xl border border-bronze/28 bg-midnight/64 px-3 text-xs text-stardust outline-none focus:border-ember/58"
          onChange={(event) => setNewBlockType(event.target.value as EditableEditorialBlockType)}
          value={newBlockType}
        >
          {editableEditorialBlockOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <button aria-label="Add content block" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-ember/38 bg-ember/9 text-ember transition hover:bg-ember/16" onClick={addBlock} type="button"><Plus size={17} /></button>
      </div> : null}

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
                <BlockFields block={activeBlock} editorialImages={editorialImages} fabrics={fabrics} onChange={updateBlock} onEditMedia={onEditMedia} onStageAssets={onStageAssets} project={project} />
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
  editorialImages,
  fabrics,
  onChange,
  onEditMedia,
  onStageAssets,
  project,
}: {
  block: EditorialBlock;
  editorialImages: LocalImageAsset[];
  fabrics: Fabric[];
  onChange: (block: EditorialBlock) => void;
  onEditMedia?: (block: EditorialBlock) => void;
  onStageAssets?: (images: LocalImageAsset[]) => void;
  project?: ApparelProject;
}) {
  const isEditable = editableEditorialBlockOptions.some((option) => option.value === block.type);
  const updateContent = (updates: Record<string, EditorialJsonValue>) => {
    const currentContent = isContentRecord(block.content)
      ? block.content as EditorialJsonObject
      : {};
    onChange({ ...block, content: { ...currentContent, ...updates } });
  };
  const projectImages = project
    ? [project.heroImage, ...(project.galleryImages ?? [])]
      .filter((image): image is LocalImageAsset => Boolean(image))
    : [];
  const availableImages = [...projectImages, ...editorialImages];
  const linkedFabrics = projectLinkedEditorialFabrics(project, fabrics);

  return (
    <div className="space-y-4">
      <details className="rounded-xl border border-bronze/18 bg-midnight/24">
        <summary className="cursor-pointer list-none px-3 py-2.5 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-stardust/42">Fine tune block type</summary>
        <div className="border-t border-bronze/14 p-3">
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
        </div>
      </details>

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
          {onEditMedia ? (
            <button className="flex min-h-14 w-full items-center justify-between rounded-xl border border-ember/32 bg-ember/[0.07] px-4 text-left transition hover:bg-ember/[0.12]" onClick={() => onEditMedia(block)} type="button">
              <span><span className="block text-xs font-semibold text-stardust">Open Media Composer</span><span className="mt-1 block text-[0.62rem] text-stardust/40">Choose, crop, and caption this photograph.</span></span>
              <ImageIcon className="text-ember" size={18} />
            </button>
          ) : <BlockField label="Image source">
            <EditorialMediaPicker
              editorialImages={editorialImages}
              maxSelections={1}
              onAddAssets={(images) => onStageAssets?.(images)}
              onSelect={(image) => updateContent({ assetId: image.id, assetName: image.name, url: '' })}
              projectImages={projectImages}
              selectedIds={[contentString(block.content, 'assetId')]}
            />
          </BlockField>}
          {!onEditMedia ? <><BlockField label="Or external image URL"><input className={fieldClassName} inputMode="url" onChange={(event) => updateContent({ assetId: '', assetName: '', url: event.target.value })} placeholder="https://..." type="url" value={contentString(block.content, 'url')} /></BlockField>
          <BlockField label="Alt text"><input className={fieldClassName} onChange={(event) => updateContent({ alt: event.target.value })} placeholder="Describe the image" value={contentString(block.content, 'alt')} /></BlockField>
          <BlockField label="Caption (optional)"><input className={fieldClassName} onChange={(event) => updateContent({ caption: event.target.value })} value={contentString(block.content, 'caption')} /></BlockField>
          <EditorialImageFramingControls asset={availableImages.find((image) => image.id === contentString(block.content, 'assetId'))} content={block.content as EditorialImageContent} onChange={updateContent} /></> : null}
        </>
      ) : null}

      {block.type === 'gallery' ? (
        onEditMedia ? (
          <button className="flex min-h-14 w-full items-center justify-between rounded-xl border border-ember/32 bg-ember/[0.07] px-4 text-left transition hover:bg-ember/[0.12]" onClick={() => onEditMedia(block)} type="button">
            <span><span className="block text-xs font-semibold text-stardust">Open Photo Layout</span><span className="mt-1 block text-[0.62rem] text-stardust/40">Select images and compare assisted compositions.</span></span>
            <Images className="text-ember" size={18} />
          </button>
        ) : <GalleryAssetEditor
          editorialImages={editorialImages}
          images={availableImages}
          items={contentArray(block.content, 'images')}
          onChange={(images) => updateContent({ images })}
          onColumnsChange={(columns) => updateContent({ columns })}
          onLayoutChange={(layout) => updateContent({ layout })}
          onStageAssets={onStageAssets}
          projectImages={projectImages}
        />
      ) : null}

      {block.type === 'fabricSwatch' ? (
        <BlockField label="Project fabric">
          <FabricPicker
            fabrics={linkedFabrics}
            onSelect={({ fabric, material }) => {
              const fallback = fabricEditorialFallback(fabric, material);
              updateContent({
                colorHex: fallback.colorHex ?? getFabricColorHex(fabric),
                composition: fallback.composition ?? '',
                fabricId: fabric.id,
                name: fabric.name,
                notes: fallback.notes ?? '',
              });
            }}
            selectedId={contentString(block.content, 'fabricId')}
          />
        </BlockField>
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

function GalleryAssetEditor({
  editorialImages,
  images,
  items,
  onChange,
  onColumnsChange,
  onLayoutChange,
  onStageAssets,
  projectImages,
}: {
  editorialImages: LocalImageAsset[];
  images: LocalImageAsset[];
  items: EditorialJsonValue[];
  onChange: (items: EditorialJsonValue[]) => void;
  onColumnsChange: (columns: number) => void;
  onLayoutChange: (layout: string) => void;
  onStageAssets?: (images: LocalImageAsset[]) => void;
  projectImages: LocalImageAsset[];
}) {
  const selectedIds = items.flatMap((item) => isContentRecord(item) && typeof item.assetId === 'string' ? [item.assetId] : []);
  const addImage = (image: LocalImageAsset) => {
    if (selectedIds.includes(image.id)) return;
    if (items.length >= 6) return;
    onChange([...items, { alt: image.name, assetId: image.id, assetName: image.name, caption: '', fitMode: 'smart', frame: 'auto', url: '' }]);
  };
  const move = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const reordered = [...items];
    [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
    onChange(reordered);
  };
  const updateItem = (index: number, updates: Record<string, EditorialJsonValue>) => {
    onChange(items.map((item, itemIndex) =>
      itemIndex === index && isContentRecord(item)
        ? { ...item, ...updates }
        : item,
    ));
  };

  return (
    <div className="space-y-4">
      <BlockField label="Add gallery media">
        <EditorialMediaPicker
          editorialImages={editorialImages}
          maxSelections={6}
          onAddAssets={(newImages) => {
            onStageAssets?.(newImages);
            const additions = newImages
              .filter((image) => !selectedIds.includes(image.id))
              .slice(0, Math.max(0, 6 - selectedIds.length))
              .map((image) => ({ alt: image.name, assetId: image.id, assetName: image.name, caption: '', fitMode: 'smart', frame: 'auto', url: '' }));
            if (additions.length) onChange([...items, ...additions]);
          }}
          onSelect={addImage}
          projectImages={projectImages}
          selectedIds={selectedIds}
          selectUploaded={false}
        />
      </BlockField>
      <BlockField label={`Gallery order · ${items.length}`}>
        {items.length > 0 ? (
          <div className="space-y-2">
            {items.map((item, index) => {
              const content = isContentRecord(item) ? item : {};
              const assetId = typeof content.assetId === 'string' ? content.assetId : '';
              const asset = images.find((image) => image.id === assetId);
              const label = asset?.name || (typeof content.assetName === 'string' ? content.assetName : '') || (typeof content.url === 'string' ? content.url : '') || `Image ${index + 1}`;
              return (
                <div className="relative flex items-center gap-2 rounded-lg border border-bronze/18 bg-midnight/36 p-2" key={`${assetId || label}-${index}`}>
                  <div className="h-12 w-10 shrink-0 overflow-hidden rounded-md border border-stardust/10 bg-midnight">
                    {asset ? <AdaptiveProjectImage asset={asset} className="h-full w-full" mode="thumbnail" /> : <ImageIcon className="m-auto mt-3 text-stardust/24" size={16} />}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-xs text-stardust/62">{label}</span>
                  <BlockToolButton disabled={index === 0} label="Move image up" onClick={() => move(index, -1)}><ChevronUp size={14} /></BlockToolButton>
                  <BlockToolButton disabled={index === items.length - 1} label="Move image down" onClick={() => move(index, 1)}><ChevronDown size={14} /></BlockToolButton>
                  <BlockToolButton danger label="Remove image" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={14} /></BlockToolButton>
                  <details className="shrink-0">
                    <summary className="cursor-pointer list-none rounded-lg border border-bronze/18 px-2 py-1 text-[0.58rem] text-stardust/48 transition hover:border-bronze/42">Frame</summary>
                    <div className="absolute right-0 z-30 mt-2 w-[18rem] rounded-xl border border-bronze/30 bg-[#11100f] p-3 shadow-[0_18px_45px_rgba(0,0,0,.58)]">
                      <EditorialImageFramingControls asset={asset} content={content as EditorialImageContent} onChange={(updates) => updateItem(index, updates)} />
                    </div>
                  </details>
                </div>
              );
            })}
          </div>
        ) : <PickerEmptyState message="Choose up to six project or editorial photos to compose this gallery." />}
      </BlockField>
      <BlockField label="Assisted layout">
        <div className="grid grid-cols-2 gap-2">
          {editorialGalleryLayoutOptions.map((option) => (
            <button className="h-9 rounded-lg border border-bronze/18 px-2 text-xs text-stardust/58 transition hover:border-bronze/44" key={option.value} onClick={() => { onLayoutChange(option.value); onColumnsChange(option.value === 'diptych' ? 2 : option.value === 'feature' ? 1 : 3); }} type="button">{option.label}</button>
          ))}
        </div>
        <p className="mt-2 text-xs text-stardust/34">The selected layout adapts to the number and orientation of your images.</p>
      </BlockField>
    </div>
  );
}

function FabricPicker({
  fabrics,
  onSelect,
  selectedId,
}: {
  fabrics: LinkedEditorialFabric[];
  onSelect: (record: LinkedEditorialFabric) => void;
  selectedId: string;
}) {
  if (fabrics.length === 0) return <PickerEmptyState message="Link a Fabric Vault record in Project Materials before adding a fabric swatch." />;
  return (
    <div className="space-y-2">
      {fabrics.map((record) => {
        const selected = record.fabric.id === selectedId;
        return (
          <button aria-pressed={selected} className={cn('flex w-full items-center gap-3 rounded-xl border p-3 text-left transition', selected ? 'border-ember/58 bg-ember/10' : 'border-bronze/20 bg-midnight/34 hover:border-bronze/46')} key={record.fabric.id} onClick={() => onSelect(record)} type="button">
            <FabricColorOrb className="h-8 w-8" fabric={record.fabric} />
            <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-stardust">{record.fabric.name}</span><span className="mt-1 block truncate text-[0.62rem] text-stardust/42">{record.material.role} · {record.fabric.composition}</span></span>
            {selected ? <span className="text-ember">✓</span> : null}
          </button>
        );
      })}
    </div>
  );
}

function PickerEmptyState({ message }: { message: string }) {
  return <div className="rounded-lg border border-dashed border-bronze/22 px-3 py-4 text-center text-xs leading-5 text-stardust/38">{message}</div>;
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
    case 'gallery': return <Images size={14} />;
    case 'fabricSwatch': case 'materials': return <SwatchBook size={14} />;
    case 'divider': return <Minus size={14} />;
    case 'spacer': return <Space size={14} />;
    case 'callout': return <MessageSquareText size={14} />;
    default: return <FileText size={14} />;
  }
}

const fieldClassName = 'h-11 w-full rounded-xl border border-bronze/24 bg-midnight/68 px-3 text-xs text-stardust outline-none transition placeholder:text-stardust/24 focus:border-ember/56';
const textAreaClassName = 'min-h-24 w-full resize-y rounded-xl border border-bronze/24 bg-midnight/68 px-3 py-3 text-xs leading-5 text-stardust outline-none transition placeholder:text-stardust/24 focus:border-ember/56';
