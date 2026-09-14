import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mergeByNewest } from '../src/lib/supabaseStudio';
import {
  exportStudioData,
  hydrateStudioData,
  importStudioData,
  LOCAL_DATA_VERSION,
  type StudioData,
} from '../src/lib/studioStorage';

const legacyFixture = readFileSync(
  new URL('./fixtures/legacy-studio-data-v5.json', import.meta.url),
  'utf8',
);

function loadFixture() {
  return importStudioData(legacyFixture);
}

describe('StudioData legacy serialization and merge behavior', () => {
  it('migrates the representative legacy fixture and round-trips its relationships', () => {
    const migrated = loadFixture();
    const hydrated = hydrateStudioData(migrated);
    const restored = importStudioData(exportStudioData(migrated));

    expect(migrated.version).toBe(LOCAL_DATA_VERSION);
    expect(hydrated.projects[0].linkedMaterials).toHaveLength(1);
    expect(hydrated.projects[0].tasks).toHaveLength(1);
    expect(hydrated.projects[0].notes).toHaveLength(1);
    expect(restored.projects[0].heroImage?.storagePath).toContain('users/example-studio');
    expect(restored.projects[0].heroImage?.remoteUrl).toBeUndefined();
  });

  it('uses timestamps for record conflict resolution and retains local-only editorials', () => {
    const local = loadFixture();
    const cloud: StudioData = structuredClone(local);
    cloud.projects[0] = {
      ...cloud.projects[0],
      summary: 'Cloud copy wins because it is newer.',
      updatedAt: '2026-06-22T16:30:00.000Z',
    };
    local.editorialCollections = [createLocalOnlyEditorial()];

    const merged = mergeByNewest(cloud, local, { cloudInitialized: true });

    expect(merged.projects[0].summary).toBe('Cloud copy wins because it is newer.');
    expect(merged.editorialCollections.map((collection) => collection.id)).toEqual([
      'editorial-local-only',
    ]);
  });
});

function createLocalOnlyEditorial() {
  return {
    createdAt: '2026-06-20T16:30:00.000Z',
    description: 'Current behavior: editorials remain local during cloud merge.',
    id: 'editorial-local-only',
    projectId: 'project-legacy-aurora-coat',
    scenes: [],
    subtitle: '',
    templateType: 'fashion-editorial' as const,
    themeId: 'midnight-editorial',
    title: 'Local editorial',
    updatedAt: '2026-06-20T16:30:00.000Z',
  };
}
