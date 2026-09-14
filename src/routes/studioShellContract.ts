/**
 * Shared responsive shell contract for the existing Tailwind implementation.
 * Keeping it explicit gives route and accessibility tests a stable target
 * without changing the current visual shell.
 */
export const STUDIO_SHELL_CONTRACT = {
  desktopBreakpoint: 1024,
  desktopSidebar: 'fixed',
  mobileNavigation: 'bottom-dock',
  tabletNavigation: 'bottom-dock',
  threadline: 'optional',
} as const;

export type StudioShellMode = 'compact' | 'desktop';

export function resolveStudioShellMode(viewportWidth: number): StudioShellMode {
  return viewportWidth >= STUDIO_SHELL_CONTRACT.desktopBreakpoint
    ? 'desktop'
    : 'compact';
}
