import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { emptyCanonicalWorkspaceState } from '../src/domains/persistence/canonicalWorkspaceRepository';
import type { CanonicalGarment, CanonicalGarmentMaterial, CanonicalGarmentMedia, CanonicalMaterial, CanonicalMaterialVariant, CanonicalMediaAsset } from '../src/domains/workspace';
import { canonicalGarmentCover, canonicalGarmentSwatches, recommendedGarmentAction } from '../src/lib/canonicalGarmentPresentation';
import { canonicalMaterialImageFraming, canonicalMaterialVariantCover } from '../src/lib/canonicalMaterialPresentation';

const studioId = '20000000-0000-4000-8000-000000000001';
const timestamp = '2026-08-29T12:00:00.000Z';
const record = { createdAt: timestamp, revision: 1, studioId, updatedAt: timestamp };

describe('WP11C image-first garment experience', () => {
  it('resolves cover imagery from canonical media roles without a legacy project record', () => {
    const state = emptyCanonicalWorkspaceState(studioId);
    const reference = media('reference', 'asset-reference');
    const hero = media('hero', 'asset-hero');
    state.mediaAssets = [reference.asset, hero.asset];
    state.garmentMedia = [reference.relation, hero.relation];
    expect(canonicalGarmentCover(state, 'garment-1')?.id).toBe('asset-hero');
  });

  it('derives material swatches from normalized garment, variant, and material relationships', () => {
    const state = emptyCanonicalWorkspaceState(studioId);
    state.materials = [{ ...record, category: 'woven', composition: '100% wool', id: 'material-1', materialCode: 'MAT-1', name: 'Midnight wool', status: 'active' } satisfies CanonicalMaterial];
    state.materialVariants = [{ ...record, colorHex: '#182437', colorName: 'Midnight', id: 'variant-1', materialId: 'material-1', sku: 'MAT-1-MID', status: 'active', weightGsm: 320, width: 150, widthUnit: 'cm' } satisfies CanonicalMaterialVariant];
    state.garmentMaterials = [{ ...record, garmentId: 'garment-1', id: 'use-1', placement: 'shell', requiredQuantity: 2, reservedQuantity: 2, role: 'shell', status: 'reserved', unit: 'm', variantId: 'variant-1' } satisfies CanonicalGarmentMaterial];
    expect(canonicalGarmentSwatches(state, 'garment-1')).toEqual([{ colorHex: '#182437', colorName: 'Midnight', id: 'variant-1', materialName: 'Midnight wool' }]);
  });

  it('resolves a fabric photograph from the canonical material-media relationship', () => {
    const state = emptyCanonicalWorkspaceState(studioId);
    const asset = media('detail', 'fabric-asset').asset;
    state.mediaAssets = [asset];
    state.materialVariantMedia = [{
      ...record, assetId: asset.id, framing: { objectFit: 'cover' }, id: 'fabric-media-1',
      role: 'swatch', sortOrder: 0, variantId: 'variant-1',
    }];
    expect(canonicalMaterialVariantCover(state, 'variant-1')?.id).toBe('fabric-asset');
  });

  it('keeps one clear phase-aware continuation on garment cards and the dashboard', () => {
    const garment = { ...record, collectionId: null, garmentCode: 'MLS-1', garmentType: 'Jacket', id: 'garment-1', phase: 'technical', status: 'active', title: 'Sutra Jacket' } satisfies CanonicalGarment;
    expect(recommendedGarmentAction(garment).label).toBe('Open Technical Studio');
    const dashboard = readFileSync(new URL('../src/pages/Today/TodayPage.tsx', import.meta.url), 'utf8');
    const library = readFileSync(new URL('../src/pages/GarmentLibrary/GarmentLibraryPage.tsx', import.meta.url), 'utf8');
    const recentGarmentCard = dashboard.slice(dashboard.indexOf('function RecentGarmentCard'), dashboard.indexOf('function PhasePill'));
    expect(dashboard).toContain('data-testid="featured-garment"');
    expect(dashboard).toContain('Recent garments');
    expect(recentGarmentCard).toContain('type="button"');
    expect(recentGarmentCard).toContain('aria-label={`Open ${garment.title}, ${collectionName}, ${garment.phase} garment`}');
    expect(recentGarmentCard).toContain('onClick={onOpen}');
    expect(recentGarmentCard).toContain('>Open garment <ArrowRight');
    expect(recentGarmentCard).not.toContain('<Button');
    expect(library).toContain('data-testid="garment-card"');
    expect(library).toContain('>Continue</Button>');
    expect(library).toContain('aria-expanded={filtersOpen}');
  });

  it('presents a three-view garment set with main-image controls and a private lightbox', () => {
    const workspace = readFileSync(new URL('../src/pages/GarmentWorkspace/CanonicalGarmentWorkspacePage.tsx', import.meta.url), 'utf8');
    const manager = readFileSync(new URL('../src/components/shared/CanonicalGarmentViewManager.tsx', import.meta.url), 'utf8');
    expect(workspace).toContain("garmentViews.length ? 'Manage photos' : 'Upload image'");
    expect(workspace).toContain('GarmentSupportingViewRail');
    expect(workspace).toContain('sectionLabel="Garment photography"');
    expect(workspace).toContain('setPreviewViewAssetId(assetId)');
    expect(workspace).toContain('asset={displayedHero}');
    const viewRail = workspace.slice(workspace.indexOf('function GarmentSupportingViewRail'), workspace.indexOf('function RemoveGarmentViewDialog'));
    expect(viewRail).toContain('onSelect(view.asset.id)');
    expect(viewRail).not.toContain('setGarmentHero');
    expect(manager).toContain('Manage photos');
    expect(manager).toContain('Make main');
    expect(manager).toContain('remove one to upload another');
    expect(manager).toContain('MAX_GARMENT_VIEWS');
  });

  it('uses a focused garment material manager instead of leading with the shared-library picker', () => {
    const workspace = readFileSync(new URL('../src/pages/GarmentWorkspace/CanonicalGarmentWorkspacePage.tsx', import.meta.url), 'utf8');
    const manager = readFileSync(new URL('../src/components/shared/CanonicalGarmentMaterialManager.tsx', import.meta.url), 'utf8');
    const designStudio = workspace.slice(workspace.indexOf('function DesignStudio'), workspace.indexOf('function TechnicalLens'));
    expect(workspace).toContain('<CanonicalGarmentMaterialManager');
    expect(workspace).toContain('Manage materials');
    expect(designStudio).not.toContain('Choose a material');
    expect(manager).toContain('Add material');
    expect(manager).toContain('Remove from garment');
    expect(manager).toContain('Planned yardage');
    expect(manager).toContain("'shell', 'lining', 'trim', 'pocketing', 'binding', 'contrast', 'interfacing'");
  });

  it('delivers private canonical imagery through expiring member-authorized links', () => {
    const image = readFileSync(new URL('../src/components/shared/CanonicalMediaImage.tsx', import.meta.url), 'utf8');
    const media = readFileSync(new URL('../src/domains/persistence/canonicalMedia.ts', import.meta.url), 'utf8');
    const repository = readFileSync(new URL('../src/domains/persistence/canonicalWorkspaceRepository.ts', import.meta.url), 'utf8');
    expect(image).toContain("session?.access_token");
    expect(image).toContain('createRequestBoundCanonicalSupabase');
    expect(image).toContain('resolveCanonicalMediaUrl(delivery, mediaClient)');
    expect(image).toContain('Try image again');
    expect(media).toContain(".createSignedUrl(asset.storagePath, CANONICAL_SIGNED_URL_SECONDS)");
    expect(media).toContain("CANONICAL_SIGNED_URL_SECONDS = 6 * 60 * 60");
    expect(media).toContain('loadCachedCanonicalMediaBlob');
    expect(repository).toContain('}, this.cache, this.client)');
  });

  it('uses only canonical fabric photography as the Material Vault cover', () => {
    const vault = readFileSync(new URL('../src/pages/LibraryVault/LibraryVaultPage.tsx', import.meta.url), 'utf8');
    const materialCard = vault.slice(vault.indexOf('function MaterialCard'), vault.indexOf('function FabricDetail'));
    expect(materialCard).toContain('canonicalMaterialVariantCover(state, variant.id)');
    expect(materialCard).toContain('alt={`${material.name} fabric`}');
    expect(materialCard).not.toContain('canonicalGarmentCover');
  });

  it('persists bounded fabric focal point, fit, and zoom through the canonical media relation', () => {
    const state = emptyCanonicalWorkspaceState(studioId);
    state.materialVariantMedia = [{
      ...record,
      assetId: 'fabric-asset',
      framing: { objectFit: 'contain', objectPositionX: -20, objectPositionY: 140, zoom: 3 },
      id: 'fabric-media-1',
      role: 'swatch',
      sortOrder: 0,
      variantId: 'variant-1',
    }];
    expect(canonicalMaterialImageFraming(state.materialVariantMedia[0])).toEqual({
      objectFit: 'contain', objectPositionX: 0, objectPositionY: 100, zoom: 2.5,
    });
  });

  it('provides the complete Fabric Vault browse, detail, edit, image, and garment-link workflow', () => {
    const vault = readFileSync(new URL('../src/pages/LibraryVault/LibraryVaultPage.tsx', import.meta.url), 'utf8');
    const imageEditor = readFileSync(new URL('../src/components/fabrics/FabricImageEditorDialog.tsx', import.meta.url), 'utf8');
    const editor = readFileSync(new URL('../src/components/fabrics/CanonicalFabricEditorModal.tsx', import.meta.url), 'utf8');
    const upload = readFileSync(new URL('../src/lib/canonicalMediaUpload.ts', import.meta.url), 'utf8');
    expect(vault).toContain('FabricDetail');
    expect(vault).toContain('Gallery view');
    expect(vault).toContain('Compact list view');
    expect(vault).toContain('LinkGarmentDialog');
    expect(vault).toContain('Where this fabric is working');
    expect(imageEditor).toContain('Horizontal focus');
    expect(imageEditor).toContain('Vertical focus');
    expect(imageEditor).toContain('Replace image');
    expect(imageEditor).toContain('Remove image');
    expect(editor).toContain('Technical properties');
    expect(editor).toContain('Supplier & storage');
    expect(upload).toContain('compressImageForApp');
    expect(upload).toContain('maxSizeBytes: 2 * 1024 * 1024');
  });
});

function media(role: CanonicalGarmentMedia['role'], assetId: string) {
  const asset = { ...record, checksum: `${assetId}-checksum`, height: 1200, id: assetId, mimeType: 'image/jpeg', name: `${assetId}.jpg`, rights: {}, sizeBytes: 1024, storagePath: `${studioId}/garments/garment-1/${assetId}.jpg`, width: 900 } satisfies CanonicalMediaAsset;
  const relation = { ...record, assetId, garmentId: 'garment-1', id: `relation-${assetId}`, role, sortOrder: 0 } satisfies CanonicalGarmentMedia;
  return { asset, relation };
}
