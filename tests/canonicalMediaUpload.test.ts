import { describe, expect, it, vi } from 'vitest';
import { uploadStagedCanonicalMedia } from '../src/domains/persistence/canonicalMedia';

const asset = {
  checksum: 'expected-checksum',
  id: 'asset-id',
  mimeType: 'image/png',
  storagePath: 'studios/studio-id/garments/garment-id/asset-id/test.png',
};

describe('canonical media upload', () => {
  it('uploads staged media as raw bytes so Safari cannot submit an empty multipart file', async () => {
    const upload = vi.fn().mockResolvedValue({ data: { path: asset.storagePath }, error: null });
    const client = {
      storage: { from: vi.fn().mockReturnValue({ upload }) },
    };
    const store = {
      getMediaBlob: vi.fn().mockResolvedValue({
        blob: new Blob(['studio image bytes'], { type: asset.mimeType }),
        checksum: asset.checksum,
      }),
    };

    await uploadStagedCanonicalMedia(asset, store as never, client as never);

    const [, body, options] = upload.mock.calls[0];
    expect(body).toBeInstanceOf(ArrayBuffer);
    expect(body.byteLength).toBeGreaterThan(0);
    expect(options).toMatchObject({ contentType: 'image/png', upsert: false });
  });

  it('rejects an empty staged file before contacting Storage', async () => {
    const upload = vi.fn();
    const client = {
      storage: { from: vi.fn().mockReturnValue({ upload }) },
    };
    const store = {
      getMediaBlob: vi.fn().mockResolvedValue({
        blob: new Blob([], { type: asset.mimeType }),
        checksum: asset.checksum,
      }),
    };

    await expect(uploadStagedCanonicalMedia(asset, store as never, client as never))
      .rejects.toThrow('contains no data');
    expect(upload).not.toHaveBeenCalled();
  });
});
