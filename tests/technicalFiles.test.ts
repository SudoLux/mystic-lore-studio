import { describe, expect, it } from 'vitest';
import { loadCachedCanonicalMediaBlob } from '../src/domains/persistence/canonicalMedia';
import { isTechnicalImageAsset, storeTechnicalSource, technicalImageMimeType, technicalPreviewUrl } from '../src/lib/technicalFiles';

describe('Technical source storage', () => {
  it('normalizes a selected File to a plain Blob so private-mode object storage cannot block the canonical upload', async () => {
    const file = new File(['technical source bytes'], 'front-flat.svg', { type: 'image/svg+xml' });
    const asset = await storeTechnicalSource(file, '00000000-0000-4000-8000-000000000001');
    const staged = await loadCachedCanonicalMediaBlob(asset);

    expect(asset.storagePath).toContain('/technical/');
    expect(asset.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(staged).toBeInstanceOf(Blob);
    expect(staged).not.toBeInstanceOf(File);
    expect(await technicalPreviewUrl(asset)).toMatch(/^blob:/);
  });

  it('renders legacy PNG/JPG/SVG source records whose persisted MIME type was generic', () => {
    expect(isTechnicalImageAsset({ mimeType: 'application/octet-stream', name: 'Rōnyn_Jacket_Tech_Flat_Front.png' })).toBe(true);
    expect(technicalImageMimeType({ mimeType: 'application/octet-stream', name: 'back-flat.svg' })).toBe('image/svg+xml');
    expect(isTechnicalImageAsset({ mimeType: 'application/pdf', name: 'tech-pack.pdf' })).toBe(false);
  });
});
