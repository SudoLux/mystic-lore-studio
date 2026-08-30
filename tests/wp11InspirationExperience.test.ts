import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const garmentWorkspace = readFileSync('src/pages/GarmentWorkspace/CanonicalGarmentWorkspacePage.tsx', 'utf8');
const materialVault = readFileSync('src/pages/LibraryVault/LibraryVaultPage.tsx', 'utf8');
const mediaUpload = readFileSync('src/lib/canonicalMediaUpload.ts', 'utf8');
const workspaceProvider = readFileSync('src/hooks/useCanonicalWorkspace.tsx', 'utf8');

describe('WP11D inspiration-first Studio experience', () => {
  it('opens the garment workspace with creative context before technical records', () => {
    expect(garmentWorkspace).toContain('data-testid="garment-inspiration-hero"');
    expect(garmentWorkspace).toContain('Creative description');
    expect(garmentWorkspace).toContain('Material story');
    expect(garmentWorkspace).toContain('Inspiration field');
    expect(garmentWorkspace.indexOf('garment-inspiration-hero')).toBeLessThan(garmentWorkspace.indexOf('Technical Studio'));
    expect(garmentWorkspace).not.toContain('canonical identity');
    expect(garmentWorkspace).not.toContain('One garment, one relationship graph');
  });

  it('presents materials as a visual textile archive with technical depth secondary', () => {
    expect(materialVault).toContain('Textile archive');
    expect(materialVault).toContain('Browse by feel and color');
    expect(materialVault).toContain('Material personality');
    expect(materialVault).toContain('Garments using this fabric');
    expect(materialVault).toContain('Supplier details');
    expect(materialVault).toContain('Technical specifications');
    expect(materialVault).toContain('<details className="rounded-[1.2rem]');
    expect(materialVault).not.toContain('<details className="rounded-[1.2rem] bg-stardust/[0.025] p-5" open>');
  });

  it('keeps all new imagery in canonical private media and garment relationships', () => {
    expect(garmentWorkspace).toContain('CanonicalMediaImage');
    expect(materialVault).toContain('CanonicalMediaImage');
    expect(workspaceProvider).toContain('prepareCanonicalGarmentImage');
    expect(workspaceProvider).toContain('attachAsset(withAsset, garmentId, asset.id, role).state');
    expect(mediaUpload).toContain('stageCanonicalMediaBlob');
    expect(mediaUpload).toContain('studios/${studioId}/garments/${garmentId}');
    expect(mediaUpload).toContain('25 * 1024 * 1024');
    expect(mediaUpload).not.toContain('localStorage');
  });
});
