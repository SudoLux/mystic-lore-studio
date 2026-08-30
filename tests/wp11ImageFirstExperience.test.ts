import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { emptyCanonicalWorkspaceState } from '../src/domains/persistence/canonicalWorkspaceRepository';
import type { CanonicalGarment, CanonicalGarmentMaterial, CanonicalGarmentMedia, CanonicalMaterial, CanonicalMaterialVariant, CanonicalMediaAsset } from '../src/domains/workspace';
import { canonicalGarmentCover, canonicalGarmentSwatches, recommendedGarmentAction } from '../src/lib/canonicalGarmentPresentation';

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

  it('keeps one clear phase-aware continuation on garment cards and the dashboard', () => {
    const garment = { ...record, collectionId: null, garmentCode: 'MLS-1', garmentType: 'Jacket', id: 'garment-1', phase: 'technical', status: 'active', title: 'Sutra Jacket' } satisfies CanonicalGarment;
    expect(recommendedGarmentAction(garment).label).toBe('Open Technical Studio');
    const dashboard = readFileSync(new URL('../src/pages/Today/TodayPage.tsx', import.meta.url), 'utf8');
    const library = readFileSync(new URL('../src/pages/GarmentLibrary/GarmentLibraryPage.tsx', import.meta.url), 'utf8');
    expect(dashboard).toContain('data-testid="featured-garment"');
    expect(dashboard).toContain('Recent garments');
    expect(library).toContain('data-testid="garment-card"');
    expect(library).toContain('>Continue</Button>');
    expect(library).toContain('aria-expanded={filtersOpen}');
  });
});

function media(role: CanonicalGarmentMedia['role'], assetId: string) {
  const asset = { ...record, checksum: `${assetId}-checksum`, height: 1200, id: assetId, mimeType: 'image/jpeg', name: `${assetId}.jpg`, rights: {}, sizeBytes: 1024, storagePath: `${studioId}/garments/garment-1/${assetId}.jpg`, width: 900 } satisfies CanonicalMediaAsset;
  const relation = { ...record, assetId, garmentId: 'garment-1', id: `relation-${assetId}`, role, sortOrder: 0 } satisfies CanonicalGarmentMedia;
  return { asset, relation };
}
