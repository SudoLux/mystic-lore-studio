import { describe, expect, it } from 'vitest';
import { navigationItems } from '../src/data/navigation';
import {
  parsePublicPortfolioRoute,
  parseStudioHashRoute,
} from '../src/lib/appRoutes';
import { garmentLenses, legacyGarmentSelectors } from '../src/domains/garments/contracts';

describe('WP1 route parity', () => {
  it('keeps every primary navigation item reachable through its current hash route', () => {
    for (const item of navigationItems) {
      const hash = item.id === 'dashboard' ? '#' : `#/${item.id}`;
      expect(parseStudioHashRoute(hash)).toEqual({ page: item.id });
    }
  });

  it('keeps record detail routes and public routes in their separate route spaces', () => {
    expect(parseStudioHashRoute('#/projects/garment-001')).toEqual({
      page: 'projects',
      projectId: 'garment-001',
    });
    expect(parseStudioHashRoute('#/fabrics/material-001')).toEqual({
      fabricId: 'material-001',
      page: 'fabrics',
    });
    expect(parsePublicPortfolioRoute('/portfolio/mario/editorials/aurora', '?project=aurora-coat')).toEqual({
      editorialProjectSlug: 'aurora-coat',
      editorialSlug: 'aurora',
      usernameSlug: 'mario',
    });
  });

  it('defines the six garment lenses without changing the legacy project adapter', () => {
    expect(garmentLenses).toEqual([
      'overview',
      'design',
      'technical',
      'production',
      'editorial',
      'portfolio',
    ]);
    expect(legacyGarmentSelectors.byId({ id: 'missing', projects: [] })).toBeNull();
  });
});
