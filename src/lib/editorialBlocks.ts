import type {
  EditorialBlock,
  EditorialBlockType,
  EditorialJsonValue,
} from '../types/editorial';

export type EditableEditorialBlockType = Extract<
  EditorialBlockType,
  'callout' | 'divider' | 'heading' | 'image' | 'paragraph' | 'quote' | 'spacer'
>;

export const editableEditorialBlockOptions: Array<{
  description: string;
  label: string;
  value: EditableEditorialBlockType;
}> = [
  { description: 'An editorial title or section heading.', label: 'Heading', value: 'heading' },
  { description: 'Body copy for story and supporting detail.', label: 'Paragraph', value: 'paragraph' },
  { description: 'A featured quotation with optional credit.', label: 'Quote', value: 'quote' },
  { description: 'An image loaded from a web address.', label: 'Image URL', value: 'image' },
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
  if (block.type === 'image') return 'Image URL not set';
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
      return { alt: '', caption: transferableText, fit: 'cover', url: '' };
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
  for (const key of ['text', 'body', 'caption', 'title', 'label']) {
    const value = content[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return '';
}
