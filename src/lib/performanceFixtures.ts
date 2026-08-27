import type { CanonicalWorkspaceState } from '../domains/workspace';

export type PerformanceFixture = {
  imageHeavyEditorialAssets: Array<{ id: string; sizeBytes: number }>;
  largeGarmentAssets: Array<{ id: string; role: string }>;
  publicCards: Array<{ path: string; title: string }>;
  syncQueue: Array<{ id: string; operation: string }>;
  technicalGridRows: Array<{ pointCode: string; size: string; target: number; tolerance: number }>;
};

/** Deterministic, content-free shapes used to measure workbench scale locally. */
export function createPerformanceFixture(state: CanonicalWorkspaceState): PerformanceFixture {
  const garment = state.garments[0];
  const garmentAssets = state.garmentMedia.filter((item) => item.garmentId === garment?.id);
  return {
    imageHeavyEditorialAssets: Array.from({ length: 180 }, (_, index) => ({ id: `editorial-image-${index}`, sizeBytes: 2_400_000 })),
    largeGarmentAssets: Array.from({ length: 120 }, (_, index) => ({ id: garmentAssets[index % Math.max(garmentAssets.length, 1)]?.assetId ?? `asset-${index}`, role: garmentAssets[index % Math.max(garmentAssets.length, 1)]?.role ?? 'reference' })),
    publicCards: Array.from({ length: 60 }, (_, index) => ({ path: `/p/fixture/project-${index}`, title: `Public fixture ${index + 1}` })),
    syncQueue: Array.from({ length: 300 }, (_, index) => ({ id: `sync-${index}`, operation: index % 9 === 0 ? 'upload_media' : 'upsert_record' })),
    technicalGridRows: Array.from({ length: 1_000 }, (_, index) => ({ pointCode: `POM-${String(index + 1).padStart(4, '0')}`, size: ['XS', 'S', 'M', 'L', 'XL'][index % 5], target: 40 + index / 10, tolerance: 0.5 })),
  };
}

export function measureFixture<T>(work: () => T) {
  const start = typeof performance === 'undefined' ? Date.now() : performance.now();
  const value = work();
  const end = typeof performance === 'undefined' ? Date.now() : performance.now();
  return { durationMs: end - start, value };
}
