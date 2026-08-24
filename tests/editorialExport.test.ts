import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { prepareEditorialExportSnapshot } from '../src/lib/editorialExport';
import { hydrateStudioData, importStudioData } from '../src/lib/studioStorage';
import type { EditorialCollection } from '../src/types/editorial';

const fixtureText = readFileSync(
  new URL('./fixtures/legacy-studio-data-v5.json', import.meta.url),
  'utf8',
);

function collectionFixture(): EditorialCollection {
  const now = '2026-06-20T16:30:00.000Z';
  return {
    coverImageId: 'image-legacy-aurora-hero',
    createdAt: now,
    description: 'A representative export fixture.',
    id: 'editorial-export-fixture',
    projectId: 'project-legacy-aurora-coat',
    scenes: [
      {
        background: { type: 'color', value: '#080909' },
        blocks: [
          {
            content: { text: 'Final editorial statement.' },
            id: 'block-late',
            order: 2,
            sceneId: 'scene-late',
            settings: {},
            type: 'paragraph',
          },
          {
            content: { text: 'A title appears first.' },
            id: 'block-first',
            order: 1,
            sceneId: 'scene-late',
            settings: {},
            type: 'heading',
          },
        ],
        collectionId: 'editorial-export-fixture',
        createdAt: now,
        id: 'scene-late',
        narrativeRole: 'highlight',
        order: 2,
        sceneType: 'story',
        title: 'Final statement',
        transition: { type: 'fade' },
        updatedAt: now,
      },
      {
        background: { type: 'image', imageId: 'missing-image' },
        blocks: [],
        collectionId: 'editorial-export-fixture',
        createdAt: now,
        fabricIds: ['missing-fabric'],
        id: 'scene-first',
        narrativeRole: 'introduction',
        order: 1,
        sceneType: 'cover',
        title: 'Opening',
        transition: { type: 'fade' },
        updatedAt: now,
      },
    ],
    subtitle: 'Deterministic source ordering',
    templateType: 'fashion-editorial',
    themeId: 'midnight-editorial',
    title: 'Aurora story',
    updatedAt: now,
  };
}

describe('deterministic editorial export', () => {
  it('orders scenes and blocks, preserves input, and records missing assets', () => {
    const project = hydrateStudioData(importStudioData(fixtureText)).projects[0];
    const collection = collectionFixture();
    const inputBefore = structuredClone(collection);
    const options = {
      collection,
      exportedAt: '2026-08-23T00:00:00.000Z',
      fabrics: [],
      project,
    } as const;

    const first = prepareEditorialExportSnapshot(options);
    const second = prepareEditorialExportSnapshot(options);

    expect(first).toEqual(second);
    expect(first.scenes.map((scene) => scene.sceneId)).toEqual(['scene-first', 'scene-late']);
    expect(first.scenes[1].blocks.map((block) => block.blockId)).toEqual(['block-first', 'block-late']);
    expect(first.warnings.map((warning) => warning.code)).toEqual(expect.arrayContaining([
      'empty-scene',
      'missing-fabric-asset',
      'missing-image-asset',
    ]));
    expect(collection).toEqual(inputBefore);
    expect(Object.isFrozen(first)).toBe(true);
  });
});
