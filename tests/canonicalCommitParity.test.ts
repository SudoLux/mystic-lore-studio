import { describe, expect, it } from 'vitest';
import { operationResultHasParity } from '../src/domains/persistence/canonicalCommitParity';
import type { CanonicalCommitResult, CanonicalOperation } from '../src/domains/persistence/contracts';

function fixture(row: Record<string, unknown>, received: Record<string, unknown>) {
  const operation: CanonicalOperation = {
    operationId: 'operation', studioId: 'studio', garmentId: null,
    origin: 'user', queuedAt: '2026-09-13T19:00:00.000Z',
    mutations: [{ entityType: 'tasks', entityId: 'task', action: 'update', baseRevision: 1, row }],
  };
  const result: CanonicalCommitResult = {
    status: 'applied', operationId: 'operation', eventIds: [],
    authoritativeRows: [{ entityType: 'tasks', entityId: 'task', row: received }],
  };
  return { operation, result };
}

describe('authoritative timestamp parity', () => {
  it.each(['2026-09-13T19:00:00+00:00', '2026-09-13T12:00:00-07:00'])('accepts the same instant: %s', (received) => {
    const { operation, result } = fixture({ due_at: '2026-09-13T19:00:00.000Z' }, { due_at: received });
    expect(operationResultHasParity(operation, result)).toBe(true);
  });
  it.each([null, 'invalid', '2026-09-13T19:00:01Z', '2026-09-13T19:00:00.000001Z'])('rejects real differences: %s', (received) => {
    const { operation, result } = fixture({ due_at: '2026-09-13T19:00:00Z' }, { due_at: received });
    expect(operationResultHasParity(operation, result)).toBe(false);
  });
  it('does not normalize date-like task titles or discard status edits', () => {
    for (const key of ['title', 'status']) {
      const { operation, result } = fixture({ [key]: '2026-09-13T19:00:00Z' }, { [key]: '2026-09-13T19:00:00+00:00' });
      expect(operationResultHasParity(operation, result)).toBe(false);
    }
  });
  it('checks calendar dates using the same physical instant', () => {
    const { operation, result } = fixture({ starts_at: '2026-09-13T19:00:00Z', ends_at: null }, { starts_at: '2026-09-13T12:00:00-07:00', ends_at: null });
    operation.mutations[0].entityType = 'calendar_events';
    result.authoritativeRows[0].entityType = 'calendar_events';
    expect(operationResultHasParity(operation, result)).toBe(true);
  });
  it('retains missing-row, delete, server-conflict and revision semantics', () => {
    const { operation, result } = fixture({ title: 'task', revision: 1 }, { title: 'task', revision: 2 });
    expect(operationResultHasParity(operation, result)).toBe(true);
    expect(operationResultHasParity(operation, { status: 'conflict', conflicts: [], authoritativeRows: result.authoritativeRows })).toBe(false);
    expect(operationResultHasParity(operation, { ...result, authoritativeRows: [] })).toBe(false);
    operation.mutations[0].action = 'delete';
    expect(operationResultHasParity(operation, result)).toBe(false);
    result.authoritativeRows[0].row = null;
    expect(operationResultHasParity(operation, result)).toBe(true);
  });
});
