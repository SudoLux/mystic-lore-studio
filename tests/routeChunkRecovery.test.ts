import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../src/routes/StudioPageRouter.tsx', import.meta.url), 'utf8');

describe('Studio route chunk recovery', () => {
  it('recovers once from a stale deploy chunk and provides a visible fallback thereafter', () => {
    expect(source).toContain('shouldRecoverStaleChunk');
    expect(source).toContain('window.location.reload()');
    expect(source).toContain('RouteErrorBoundary');
    expect(source).toContain('Reload Studio');
  });
});
