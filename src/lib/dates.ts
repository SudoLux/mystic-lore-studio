const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

const defaultDateOptions: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
};

export function parseStudioDate(value?: string | null) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const normalized = value.trim();
  const dateOnlyMatch = dateOnlyPattern.exec(normalized);

  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    const date = new Date(year, month - 1, day);

    return date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
      ? date
      : null;
  }

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatStudioDate(
  value?: string | null,
  options: Intl.DateTimeFormatOptions = defaultDateOptions,
  fallback = 'Date unavailable',
) {
  const date = parseStudioDate(value);

  if (!date) {
    return fallback;
  }

  try {
    return new Intl.DateTimeFormat('en-US', options).format(date);
  } catch {
    return fallback;
  }
}

export function studioDateTimestamp(value?: string | null) {
  return parseStudioDate(value)?.getTime() ?? 0;
}
