import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Sidebar } from '../src/components/layout/Sidebar';
import { navigationItems } from '../src/data/navigation';
import { resolveStudioShellMode, STUDIO_SHELL_CONTRACT } from '../src/routes/studioShellContract';

describe('WP1 responsive shell and keyboard navigation contract', () => {
  it('keeps the fixed desktop shell and compact mobile/tablet shell at the existing breakpoint', () => {
    expect(STUDIO_SHELL_CONTRACT).toMatchObject({
      desktopBreakpoint: 1024,
      desktopSidebar: 'fixed',
      mobileNavigation: 'bottom-dock',
      threadline: 'optional',
    });
    expect(resolveStudioShellMode(390)).toBe('compact');
    expect(resolveStudioShellMode(820)).toBe('compact');
    expect(resolveStudioShellMode(1024)).toBe('desktop');
  });

  it('uses semantic native buttons for keyboard-reachable primary navigation', () => {
    const markup = renderToStaticMarkup(
      createElement(Sidebar, {
        activePage: 'projects',
        navItems: navigationItems,
        onNavigate: () => undefined,
      }),
    );

    expect(markup).toContain('aria-label="Primary navigation"');
    expect(markup.match(/type="button"/g)).toHaveLength(navigationItems.length);
    expect(markup).toContain('aria-label="Projects"');
    expect(markup).toContain('aria-current="page"');
  });
});
