import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { navigationGroups, navigationItems } from '../src/data/navigation';
import { Sidebar } from '../src/components/layout/Sidebar';
import { AtelierImageFrame } from '../src/components/shared/AtelierImageFrame';
import { readFileSync } from 'node:fs';

const styles = readFileSync(new URL('../src/styles/index.css', import.meta.url), 'utf8');

describe('WP11 Digital Atelier foundation', () => {
  it('groups every existing destination without changing its route identity', () => {
    expect(navigationItems.map((item) => item.group)).toContain('tools');
    expect(navigationGroups.map((group) => group.id)).toEqual(['studio', 'make', 'present', 'tools']);
    expect(navigationItems).toHaveLength(12);
    expect(new Set(navigationItems.map((item) => item.id)).size).toBe(12);
  });

  it('keeps every destination keyboard reachable while visually grouping Studio tools', () => {
    const markup = renderToStaticMarkup(createElement(Sidebar, {
      activePage: 'projects', navItems: navigationItems, onNavigate: () => undefined,
    }));
    expect(markup).toContain('Studio tools');
    expect(markup.match(/type="button"/g)).toHaveLength(navigationItems.length);
  });

  it('provides shared atelier surfaces and image framing primitives', () => {
    const frame = renderToStaticMarkup(createElement(AtelierImageFrame, { emphasis: 'hero' }, 'Image'));
    expect(frame).toContain('data-image-frame="hero"');
    for (const token of ['.atelier-panel', '.atelier-page-header', '.atelier-image-frame', '.atelier-empty-state', '.atelier-tablist', '.atelier-table-shell']) {
      expect(styles).toContain(token);
    }
  });
});
