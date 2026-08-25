import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('WP3 canonical UI accessibility and state contracts', () => {
  it('provides semantic state feedback for loading, offline, and error recovery', () => {
    const source = read('../src/components/shared/CanonicalWorkspaceState.tsx');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('aria-live="assertive"');
    expect(source).toContain('role="alert"');
    expect(source).toContain('Preparing your canonical garment workspace');
    expect(source).toContain('Retry');
  });

  it('keeps relationship selection keyboard-native and exposes current selection/downstream use', () => {
    const source = read('../src/components/shared/RelationshipPicker.tsx');
    expect(source).toContain('type="button"');
    expect(source).toContain('aria-pressed');
    expect(source).toContain('Used by');
    expect(source).toContain('Create inline');
  });

  it('uses a visible destructive confirmation and an accessible lens switcher', () => {
    const source = read('../src/pages/GarmentWorkspace/CanonicalGarmentWorkspacePage.tsx');
    expect(source).toContain('confirmDelete');
    expect(source).toContain('Delete this garment');
    expect(source).toContain('aria-current');
    expect(source).toContain('type="button"');
  });

  it('retains narrow-screen readable cards and table fallback surfaces', () => {
    const library = read('../src/pages/GarmentLibrary/GarmentLibraryPage.tsx');
    const vault = read('../src/pages/LibraryVault/LibraryVaultPage.tsx');
    expect(library).toContain('sm:grid-cols-2');
    expect(library).toContain('overflow-x-auto');
    expect(vault).toContain('xl:grid-cols');
  });
});
