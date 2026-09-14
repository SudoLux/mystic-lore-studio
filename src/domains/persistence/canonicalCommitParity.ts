import type { CanonicalCommitResult, CanonicalMutableEntity, CanonicalOperation } from './contracts';

// Only known timestamptz fields receive date normalization. Text/JSON values
// that happen to look like dates must still match exactly.
const timestampFields: Partial<Record<CanonicalMutableEntity, readonly string[]>> = {
  tasks: ['due_at'],
  calendar_events: ['starts_at', 'ends_at'],
};

function timestampIdentity(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = value.match(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.(\d{1,6}))?(?:Z|[+-]\d{2}:\d{2})$/);
  if (!match) return null;
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) return null;
  // Retain PostgreSQL microseconds rather than accidentally accepting a real
  // difference smaller than JavaScript Date's millisecond precision.
  return `${milliseconds}:${(match[1] ?? '').padEnd(6, '0').slice(3)}`;
}

export function operationResultHasParity(operation: CanonicalOperation, result: CanonicalCommitResult): boolean {
  if (result.status === 'conflict') return false;
  return operation.mutations.every((mutation) => {
    const authoritative = result.authoritativeRows.find((item) =>
      item.entityType === mutation.entityType && item.entityId === mutation.entityId,
    );
    if (!authoritative) return false;
    if (mutation.action === 'delete') return authoritative.row === null;
    if (!mutation.row || !authoritative.row) return false;
    return Object.entries(mutation.row).every(([key, value]) => {
      if (key === 'created_at' || key === 'updated_at' || key === 'revision') return true;
      const received = authoritative.row?.[key];
      if (JSON.stringify(received) === JSON.stringify(value)) return true;
      if (!timestampFields[mutation.entityType]?.includes(key)) return false;
      const expectedTime = timestampIdentity(value);
      return expectedTime !== null && expectedTime === timestampIdentity(received);
    });
  });
}
