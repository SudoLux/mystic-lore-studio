import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const manager = readFileSync(new URL('../src/pages/PortfolioStudio/PortfolioStudioPage.tsx', import.meta.url), 'utf8');
const preview = readFileSync(new URL('../src/pages/PortfolioStudio/PublicCutPreview.tsx', import.meta.url), 'utf8');
const publicRoute = readFileSync(new URL('../src/routes/PublicPortfolioRoute.tsx', import.meta.url), 'utf8');
const publicLoader = readFileSync(new URL('../src/lib/canonicalPublications.ts', import.meta.url), 'utf8');

describe('WP8 portfolio UI and anonymous route contracts', () => {
  it('provides profile, project, editorial, publish, history, privacy, stale, and explicit unpublish controls', () => {
    for (const contract of ['projects', 'editorials', 'profile', 'publish', 'Publication history', 'Privacy & readiness', 'Unpublish current cut']) expect(manager).toContain(contract);
  });

  it('renders the exact public component inside an accessible modal preview', () => {
    expect(preview).toContain('role="dialog"');
    expect(preview).toContain('aria-modal="true"');
    expect(preview).toContain('<PublicPortfolioPage isPublished snapshot={preview.snapshot} />');
  });

  it('keeps anonymous routes physically separated from private workspace hydration', () => {
    expect(publicRoute).toContain("../lib/canonicalPublications");
    expect(publicLoader).toContain(".schema('ml_public')");
    expect(publicLoader).not.toMatch(/CanonicalWorkspace|StudioData|ml_private|useCanonicalWorkspace/);
    expect(publicLoader).toContain(".eq('is_current', true)");
    expect(publicLoader).toContain(".is('unpublished_at', null)");
  });

  it('includes narrow-screen and keyboard-safe native controls', () => {
    expect(manager).toMatch(/overflow-x-auto/);
    expect(manager).toMatch(/sm:grid-cols|lg:grid-cols|xl:grid-cols/);
    expect(manager).toContain('Move ${title} up');
    expect(manager).toContain('type="button"');
  });
});
