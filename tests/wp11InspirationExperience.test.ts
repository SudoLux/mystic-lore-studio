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
    expect(materialVault).toContain('Where this fabric is working');
    expect(materialVault).toContain('Composition & construction');
    expect(materialVault).toContain('Supplier');
    expect(materialVault).toContain('Inventory');
    expect(materialVault).toContain('Media & references');
    expect(materialVault).toContain('profile?.loreNote');
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

  it('keeps the Inspiration Field bounded, viewable, and safely removable through canonical links', () => {
    const workspaceStore = readFileSync('src/domains/workspace/workspaceStore.ts', 'utf8');
    const presentation = readFileSync('src/lib/canonicalGarmentPresentation.ts', 'utf8');
    const lightbox = readFileSync('src/components/shared/CanonicalMediaLightbox.tsx', 'utf8');
    const canonicalMedia = readFileSync('src/components/shared/CanonicalMediaImage.tsx', 'utf8');
    expect(garmentWorkspace).toContain('MAX_INSPIRATION_FIELD_IMAGES');
    expect(garmentWorkspace).toContain('Inspiration field full');
    expect(garmentWorkspace).toContain('Remove this reference?');
    expect(garmentWorkspace).toContain('View full image');
    expect(garmentWorkspace).toContain('CanonicalMediaLightbox');
    expect(presentation).toContain('canonicalInspirationReferences');
    expect(workspaceStore).toContain('attachInspirationReference');
    expect(workspaceStore).toContain('removeInspirationReference');
    expect(workspaceStore).toContain('The media asset');
    expect(lightbox).toContain("event.key === 'ArrowLeft'");
    expect(lightbox).toContain("event.key === 'ArrowRight'");
    expect(lightbox).toContain("event.key === 'Escape'");
    expect(lightbox).toContain("event.key === 'Tab'");
    expect(lightbox).toContain('returnFocusRef.current?.focus()');
    expect(canonicalMedia).toContain('onActivate?:');
  });
});
