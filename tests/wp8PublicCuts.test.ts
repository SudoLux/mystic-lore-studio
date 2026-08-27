import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildPublicCutPreview,
  privacyScanPublicCut,
  publicationHistory,
  publishPublicCut,
  sanitizePublicEditorialContent,
  selectPortfolioProject,
  unpublishPublicCut,
} from '../src/domains/portfolio';
import type { CanonicalGarmentVersion, CanonicalWorkspaceState } from '../src/domains/workspace';
import { createCanonicalWorkspace } from '../src/domains/workspace';
import { importStudioData } from '../src/lib/studioStorage';

const fixture = readFileSync(new URL('./fixtures/legacy-studio-data-v5.json', import.meta.url), 'utf8');
const owner = '10000000-0000-4000-8000-000000000111';

async function readyWorkspace() {
  let state = await createCanonicalWorkspace({ data: importStudioData(fixture), ownerUserId: owner, studioName: 'WP8 Studio', studioSlug: 'wp8-studio' });
  const profile = state.portfolioProfiles[0];
  const garment = state.garments[0];
  const now = '2026-08-26T12:00:00.000Z';
  const version: CanonicalGarmentVersion = {
    baseRevision: garment.revision, checksum: 'a'.repeat(64), createdAt: now, createdBy: owner, garmentId: garment.id,
    id: crypto.randomUUID(), kind: 'named', label: 'Portfolio approved', notes: '', parentVersionId: null, revision: 1,
    scope: 'all', snapshot: {}, studioId: state.studioId, updatedAt: now, versionNo: 1,
  };
  const sourceAsset = state.mediaAssets[0] ? { ...state.mediaAssets[0], rights: { ...state.mediaAssets[0].rights, license: 'owned' } } : null;
  if (!sourceAsset) throw new Error('Fixture needs one media asset.');
  const derivative = {
    ...sourceAsset, assetId: sourceAsset.id, checksum: 'b'.repeat(64), id: crypto.randomUUID(), storagePath: `studios/${state.studioId}/assets/portfolio/${sourceAsset.id}.webp`, variant: 'portfolio' as const,
  };
  state = {
    ...state,
    garmentVersions: [version],
    mediaAssets: state.mediaAssets.map((item) => item.id === sourceAsset.id ? sourceAsset : item),
    mediaDerivatives: [derivative],
    portfolioEditorials: state.portfolioEditorials.map((item) => ({ ...item, visibility: 'private' as const })),
    portfolioProfiles: state.portfolioProfiles.map((item) => ({ ...item, avatarAssetId: null })),
    portfolioProjects: state.portfolioProjects.map((item) => ({ ...item, visibility: 'private' as const })),
  };
  const selected = selectPortfolioProject(state, profile.id, garment.id, { selectedAssetIds: [sourceAsset.id], visibility: 'ready' });
  state = { ...selected.state, portfolioProjects: selected.state.portfolioProjects.map((item) => item.id === selected.record.id ? { ...item, sourceVersionId: version.id } : item) };
  return { profileId: profile.id, projectId: selected.record.id, state, version };
}

describe('WP8 Public Cuts', () => {
  it('uses a recursive denylist and root allowlist for privacy regression fixtures', () => {
    const safe = { profile: { displayName: 'Mystic Lore' }, projects: [], editorials: [], generatedAt: '2026-08-26T00:00:00Z' };
    expect(privacyScanPublicCut(safe)).toEqual([]);
    for (const key of ['tasks', 'notes', 'fitIssues', 'costSheets', 'suppliers', 'factories', 'technicalFiles', 'pomPoints', 'rawAiInputs']) {
      expect(privacyScanPublicCut({ ...safe, profile: { nested: { [key]: ['private'] } } }).some((item) => item.path.includes(key))).toBe(true);
    }
    expect(privacyScanPublicCut({ ...safe, surprise: true })[0].reason).toContain('allowlist');
  });

  it('allowlists editorial block fields and rewrites only selected asset references', () => {
    const images = new Map([['safe-asset', { alt: 'Safe', fit: 'cover' as const, positionX: 50, positionY: 50, reference: 'publication-asset:safe', src: '/storage/v1/object/public/portfolio-assets/publications/safe.webp', usage: ['editorial'], zoom: 1 }]]);
    const result = sanitizePublicEditorialContent({ assetId: 'safe-asset', notes: 'private', prompt: 'private', text: 'Public copy', url: 'https://private.example/raw.jpg' }, images);
    expect(result).toEqual({ imageReference: 'publication-asset:safe', text: 'Public copy' });
  });

  it('builds an exact anonymous payload from selected relationships and copied public derivatives only', async () => {
    const { state, profileId } = await readyWorkspace();
    const preview = await buildPublicCutPreview(state, profileId);
    const serialized = JSON.stringify(preview.snapshot);
    expect(preview.findings).toEqual([]);
    expect(preview.warnings).toEqual([]);
    expect(preview.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(preview.manifest).toHaveLength(1);
    expect(preview.manifest[0].publicStoragePath).toMatch(/^publications\/[0-9a-f-]{36}\/[0-9a-f-]{36}\//);
    expect(preview.manifest[0].copiedFromChecksum).toBe('b'.repeat(64));
    expect(serialized).not.toMatch(/tasks|notes|fitIssues|costSheets|suppliers|factories|technicalFiles|pomPoints|rawAiInputs/i);
    expect(new TextEncoder().encode(serialized).byteLength).toBeLessThan(150_000);
  });

  it('marks a selection stale instead of silently repointing its source version', async () => {
    const { state, profileId, version } = await readyWorkspace();
    const newer = { ...version, id: crypto.randomUUID(), label: 'Later frame', versionNo: 2 };
    const preview = await buildPublicCutPreview({ ...state, garmentVersions: [version, newer] }, profileId);
    expect(preview.isStale).toBe(true);
    expect(preview.sourceVersions[0].versionId).toBe(version.id);
  });

  it('creates new immutable snapshot records and retains unpublished history', async () => {
    const { state, profileId } = await readyWorkspace();
    const first = await publishPublicCut(state, profileId, owner, true);
    expect(first.publications.map((item) => item.publicationType)).toContain('profile');
    expect(first.publications.map((item) => item.publicationType)).toContain('project');
    expect(first.publications.every((item) => item.isCurrent && item.isPublic)).toBe(true);
    const unpublished = unpublishPublicCut(first.state, profileId, true);
    expect(publicationHistory(unpublished, profileId).every((item) => !item.isCurrent && !item.isPublic && item.unpublishedAt)).toBe(true);
    const second = await publishPublicCut(unpublished, profileId, owner, true);
    expect(publicationHistory(second.state, profileId).length).toBe(first.publications.length * 2);
    expect(new Set(publicationHistory(second.state, profileId).map((item) => item.id)).size).toBe(first.publications.length * 2);
  });

  it('requires fresh server state for publish and unpublish commits', async () => {
    const { state, profileId } = await readyWorkspace();
    await expect(publishPublicCut(state, profileId, owner, false)).rejects.toThrow('fresh server');
    expect(() => unpublishPublicCut(state, profileId, false)).toThrow('fresh server');
  });

  it('excludes media when public rights or a portfolio derivative are missing', async () => {
    const { state, profileId } = await readyWorkspace();
    const noRights: CanonicalWorkspaceState = { ...state, mediaAssets: state.mediaAssets.map((item) => ({ ...item, rights: {} })) };
    const preview = await buildPublicCutPreview(noRights, profileId);
    expect(preview.manifest).toEqual([]);
    expect(preview.warnings.join(' ')).toContain('rights-cleared');
  });
});
