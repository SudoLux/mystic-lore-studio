import type { EditorialJsonValue } from '../../../types/editorial';

export function isContentRecord(
  value: unknown,
): value is Record<string, EditorialJsonValue | undefined> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function contentString(
  content: unknown,
  key: string,
  fallback = '',
) {
  if (typeof content === 'string') return content;
  if (!isContentRecord(content)) return fallback;
  const value = content[key];
  return typeof value === 'string' ? value : fallback;
}

export function contentNumber(
  content: unknown,
  key: string,
  fallback: number,
) {
  if (!isContentRecord(content)) return fallback;
  const value = content[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function contentArray(content: unknown, key: string) {
  if (!isContentRecord(content)) return [];
  const value = content[key];
  return Array.isArray(value) ? value : [];
}

export function contentText(content: unknown) {
  if (typeof content === 'string') return content;
  if (typeof content === 'number' || typeof content === 'boolean') return String(content);
  if (content === null || content === undefined) return '';
  if (Array.isArray(content)) {
    return content
      .map((item) => typeof item === 'string' ? item : JSON.stringify(item))
      .join(' · ');
  }
  if (isContentRecord(content)) {
    for (const key of ['text', 'body', 'quote', 'heading', 'title', 'value']) {
      const value = content[key];
      if (typeof value === 'string') return value;
    }
  }
  try {
    return JSON.stringify(content);
  } catch {
    return '';
  }
}

export function contentAlign(content: unknown) {
  const align = contentString(content, 'align');
  return align === 'center' || align === 'right' ? align : 'left';
}
