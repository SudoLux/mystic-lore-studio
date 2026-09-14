import { describe, expect, it } from 'vitest';
import {
  parsePublicPortfolioRoute,
  parseStudioHashRoute,
} from '../src/lib/appRoutes';

describe('current route behavior', () => {
  it('parses supported hash routes and record details', () => {
    expect(parseStudioHashRoute('#/projects/project-aurora')).toEqual({
      page: 'projects',
      projectId: 'project-aurora',
    });
    expect(parseStudioHashRoute('#/fabrics/fabric-twill')).toEqual({
      fabricId: 'fabric-twill',
      page: 'fabrics',
    });
    expect(parseStudioHashRoute('#/kanban')).toEqual({ page: 'kanban' });
    expect(parseStudioHashRoute('#/technical/garment-aurora')).toEqual({ page: 'technical', technicalGarmentId: 'garment-aurora' });
    expect(parseStudioHashRoute('#/production/garment-aurora')).toEqual({ page: 'production', productionGarmentId: 'garment-aurora' });
  });

  it('falls back to dashboard for an unknown hash route', () => {
    expect(parseStudioHashRoute('#/unknown/record')).toEqual({ page: 'dashboard' });
  });

  it('parses public portfolio and editorial paths with normalized slugs', () => {
    expect(parsePublicPortfolioRoute('/portfolio/Mario Heard/Aurora Coat')).toEqual({
      projectSlug: 'aurora-coat',
      usernameSlug: 'mario-heard',
    });
    expect(parsePublicPortfolioRoute('/portfolio/Mario Heard/editorials/Autumn Story', '?project=Aurora Coat')).toEqual({
      editorialProjectSlug: 'aurora-coat',
      editorialSlug: 'autumn-story',
      usernameSlug: 'mario-heard',
    });
  });
});
