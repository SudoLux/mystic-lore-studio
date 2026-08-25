import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { addFlatAnnotation, approveFlat, createSpec, createTechnicalCheckpoint, deterministicExportFilename, prepareFlatComparison, registerFlat, setAnnotationStatus, validateTechnicalSpec } from '../src/domains/technical';
import { createCanonicalWorkspace, type CanonicalMediaAsset } from '../src/domains/workspace';
import { importStudioData } from '../src/lib/studioStorage';

const fixtureText = readFileSync(new URL('./fixtures/legacy-studio-data-v5.json', import.meta.url), 'utf8');
async function workspace() { return createCanonicalWorkspace({ data: importStudioData(fixtureText), ownerUserId: '10000000-0000-4000-8000-000000000111' }); }
function sourceAsset(studioId: string, name: string, checksum: string): CanonicalMediaAsset { const now = '2026-08-24T00:00:00.000Z'; return { createdAt: now, id: crypto.randomUUID(), revision: 1, studioId, updatedAt: now, checksum, height: 1200, localBlobKey: `technical-source:${name}`, mimeType: 'image/png', name, rights: { source: 'test source' }, sizeBytes: 100, storagePath: `studios/${studioId}/technical/${name}`, storageState: 'stored', width: 900 }; }

describe('WP4 Technical Studio foundation', () => {
  it('creates a garment-owned spec and validates missing required views', async () => {
    const start = await workspace();
    const result = createSpec(start, start.garments[0].id, 'M', 'cm');
    expect(result.state.technicalSpecs).toHaveLength(1);
    expect(validateTechnicalSpec(result.state, result.spec.id).map((issue) => issue.field)).toEqual(['front', 'back']);
  });

  it('preserves source/revision identity and prepares flat comparison without pixel-only state', async () => {
    const start = await workspace(); const created = createSpec(start, start.garments[0].id, 'M', 'cm');
    const first = sourceAsset(start.studioId, 'front-r1.png', 'a'.repeat(64));
    const second = sourceAsset(start.studioId, 'front-r2.png', 'b'.repeat(64));
    const withAssets = { ...created.state, mediaAssets: [...created.state.mediaAssets, first, second] };
    const r1 = registerFlat(withAssets, created.spec.id, first.id, 'front', 'R1');
    const r2 = registerFlat(r1.state, created.spec.id, second.id, 'front', 'R2');
    const comparison = prepareFlatComparison(r2.state, created.spec.id, 'front');
    expect(comparison?.current).toMatchObject({ checksum: 'b'.repeat(64), revisionLabel: 'R2' });
    expect(comparison?.previous).toMatchObject({ checksum: 'a'.repeat(64), revisionLabel: 'R1' });
  });

  it('blocks approval for open critical annotations and permits it after structured resolution', async () => {
    const start = await workspace(); const created = createSpec(start, start.garments[0].id, 'M', 'cm');
    const asset = sourceAsset(start.studioId, 'front.png', 'c'.repeat(64));
    const flat = registerFlat({ ...created.state, mediaAssets: [...created.state.mediaAssets, asset] }, created.spec.id, asset.id, 'front', 'R1');
    const annotated = addFlatAnnotation(flat.state, { type: 'add_annotation', flatId: flat.flat.id, anchor: { x: .25, y: .5 }, label: 'Armhole mismatch', severity: 'critical' });
    expect(() => approveFlat(annotated.state, flat.flat.id, null)).toThrow(/critical/);
    const resolved = setAnnotationStatus(annotated.state, annotated.annotation.id, 'resolved');
    expect(approveFlat(resolved, flat.flat.id, null).technicalFlats.find((item) => item.id === flat.flat.id)?.approvedAt).toBeTruthy();
  });

  it('freezes reproducible source evidence and derives deterministic filename inputs', async () => {
    let state = await workspace(); const created = createSpec(state, state.garments[0].id, 'M', 'cm'); state = created.state;
    for (const [view, checksum] of [['front', 'd'.repeat(64)], ['back', 'e'.repeat(64)]] as const) { const asset = sourceAsset(state.studioId, `${view}.png`, checksum); const result = registerFlat({ ...state, mediaAssets: [...state.mediaAssets, asset] }, created.spec.id, asset.id, view, 'R1'); state = approveFlat(result.state, result.flat.id, null); }
    expect(validateTechnicalSpec(state, created.spec.id, true)).toHaveLength(0);
    const frozen = await createTechnicalCheckpoint(state, created.spec.id);
    expect(frozen.version.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(deterministicExportFilename('ML-001', 1, 2, frozen.version.checksum, 'zip')).toMatch(/^ML-001-tech-v001-template-v2-[a-f0-9]{8}\.zip$/);
  });
});
