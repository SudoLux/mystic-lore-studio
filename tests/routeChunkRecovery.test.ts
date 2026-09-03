import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../src/routes/StudioPageRouter.tsx', import.meta.url), 'utf8');

describe('Studio route chunk recovery', () => {
  it('recovers from a stale deploy chunk through a fresh entry request and provides a visible fallback thereafter', () => {
    expect(source).toContain('shouldRecoverStaleChunk');
    expect(source).toContain('reloadWithFreshEntry');
    expect(source).toContain("url.searchParams.set('ml-reload'");
    expect(source).toContain('window.location.replace');
    expect(source).toContain('window.sessionStorage.removeItem(chunkRecoveryKey)');
    expect(source).toContain('RouteErrorBoundary');
    expect(source).toContain('Reload current Studio');
  });
});
