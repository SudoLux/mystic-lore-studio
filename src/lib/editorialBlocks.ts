import type {
  EditorialBlock,
  EditorialBlockType,
  EditorialJsonValue,
} from '../types/editorial';

export type EditableEditorialBlockType = Extract<
  EditorialBlockType,
  'callout' | 'divider' | 'fabricSwatch' | 'gallery' | 'heading' | 'image' | 'paragraph' | 'quote' | 'spacer'
>;

export const editableEditorialBlockOptions: Array<{
  description: string;
  label: string;
  value: EditableEditorialBlockType;
}> = [
  { description: 'An editorial title or section heading.', label: 'Heading', value: 'heading' },
  { description: 'Body copy for story and supporting detail.', label: 'Paragraph', value: 'paragraph' },
  { description: 'A featured quotation with optional credit.', label: 'Quote', value: 'quote' },
  { description: 'A project photograph or external image.', label: 'Image', value: 'image' },
  { description: 'A sequence of existing project photographs.', label: 'Gallery', value: 'gallery' },
  { description: 'A live reference to a project-linked fabric.', label: 'Fabric Swatch', value: 'fabricSwatch' },
  { description: 'A visual break between content moments.', label: 'Divider', value: 'divider' },
  { description: 'Controlled breathing room in the composition.', label: 'Spacer', value: 'spacer' },
  { description: 'A highlighted note, insight, or warning.', label: 'Callout', value: 'callout' },
];

export function createEditorialBlock(
  sceneId: string,
  type: EditableEditorialBlockType,
  order: number,
): EditorialBlock {
  return {
    content: defaultEditorialBlockContent(type),
    id: `editorial-block-${crypto.randomUUID()}`,
    order,
    sceneId,
    settings: {},
    type,
  };
}

export function convertEditorialBlockType(
  block: EditorialBlock,
  type: EditableEditorialBlockType,
): EditorialBlock {
  const transferableText = editorialBlockText(block);
  const content = defaultEditorialBlockContent(type, transferableText);
  return { ...block, content, type };
}

export function editorialBlockLabel(type: EditorialBlockType) {
  return editableEditorialBlockOptions.find((option) => option.value === type)?.label
    ?? type.replaceAll('-', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

export function editorialBlockSummary(block: EditorialBlock) {
  const text = editorialBlockText(block).trim();
  if (text) return text;
  if (block.type === 'image') {
    const content = isRecord(block.content) ? block.content as Record<string, EditorialJsonValue> : {};
    return typeof content.assetName === 'string' && content.assetName
      ? content.assetName
      : 'Image not selected';
  }
  if (block.type === 'gallery') {
    const content = isRecord(block.content) ? block.content as Record<string, EditorialJsonValue> : {};
    const count = Array.isArray(content.images) ? content.images.length : 0;
    return count > 0 ? `${count} linked ${count === 1 ? 'image' : 'images'}` : 'Gallery not configured';
  }
  if (block.type === 'fabricSwatch') return 'Fabric not selected';
  if (block.type === 'divider') return 'Section divider';
  if (block.type === 'spacer') return 'Layout spacing';
  return 'Ready to edit';
}

function defaultEditorialBlockContent(
  type: EditableEditorialBlockType,
  transferableText = '',
): EditorialJsonValue {
  switch (type) {
    case 'heading':
      return { align: 'left', eyebrow: '', level: 2, text: transferableText || 'New heading' };
    case 'paragraph':
      return { align: 'left', text: transferableText || 'Add your editorial story here.' };
    case 'quote':
      return { attribution: '', text: transferableText || 'Add a defining quote.' };
    case 'image':
      return { alt: '', assetId: '', assetName: '', caption: transferableText, fit: 'cover', url: '' };
    case 'gallery':
      return { columns: 3, images: [] };
    case 'fabricSwatch':
      return { colorHex: '#9A6C3C', composition: '', fabricId: '', name: 'Fabric swatch', notes: transferableText };
    case 'divider':
      return { label: '', style: 'gradient' };
    case 'spacer':
      return { size: 'medium' };
    case 'callout':
      return { body: transferableText || 'Add a highlighted editorial note.', title: '', tone: 'highlight' };
  }
}

function editorialBlockText(block: EditorialBlock) {
  if (typeof block.content === 'string') return block.content;
  if (!block.content || typeof block.content !== 'object' || Array.isArray(block.content)) return '';
  const content = block.content as Record<string, unknown>;
  for (const key of ['text', 'body', 'caption', 'title', 'label', 'name']) {
    const value = content[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return '';
}

function isRecord(value: EditorialJsonValue): value is Record<string, EditorialJsonValue> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
