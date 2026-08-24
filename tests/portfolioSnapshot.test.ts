import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { hydrateStudioData, importStudioData } from '../src/lib/studioStorage';
import { preparePortfolioProjectSnapshot } from '../src/utils/portfolioSnapshot';

const fixtureText = readFileSync(
  new URL('./fixtures/legacy-studio-data-v5.json', import.meta.url),
  'utf8',
);

function publicProject(withNotes = false) {
  const data = hydrateStudioData(importStudioData(fixtureText));
  const project = {
    ...data.projects[0],
    portfolio: {
      ...data.projects[0].portfolio!,
      isPublic: true,
      visibleSections: {
        ...data.projects[0].portfolio!.visibleSections,
        notes: withNotes,
      },
    },
  };
  return { data, project };
}

describe('public portfolio sanitization', () => {
  it('excludes a private project entirely', () => {
    const data = hydrateStudioData(importStudioData(fixtureText));
    expect(preparePortfolioProjectSnapshot({
      assets: [],
      editorialCollections: [],
      fabrics: data.fabrics,
      generatedAt: '2026-08-23T00:00:00.000Z',
      project: data.projects[0],
    })).toBeNull();
  });

  it('does not include private notes until notes are explicitly enabled', () => {
    const { data, project } = publicProject(false);
    const snapshot = preparePortfolioProjectSnapshot({
      assets: [],
      editorialCollections: [],
      fabrics: data.fabrics,
      generatedAt: '2026-08-23T00:00:00.000Z',
      project,
    });

    expect(snapshot?.notes).toEqual([]);
    expect(JSON.stringify(snapshot)).not.toContain('Keep this fixture note private by default.');
  });

  it('includes notes only after deliberate public enablement', () => {
    const { data, project } = publicProject(true);
    const snapshot = preparePortfolioProjectSnapshot({
      assets: [],
      editorialCollections: [],
      fabrics: data.fabrics,
      generatedAt: '2026-08-23T00:00:00.000Z',
      project,
    });

    expect(snapshot?.notes[0]?.title).toBe('Private fitting observation');
  });
});
