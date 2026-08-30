import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const auth = readFileSync(new URL('../src/pages/Auth/AuthScreen.tsx', import.meta.url), 'utf8');
const authHook = readFileSync(new URL('../src/hooks/useAuth.tsx', import.meta.url), 'utf8');
const mobileNav = readFileSync(new URL('../src/components/layout/MobileNav.tsx', import.meta.url), 'utf8');
const sidebar = readFileSync(new URL('../src/components/layout/Sidebar.tsx', import.meta.url), 'utf8');
const search = readFileSync(new URL('../src/components/layout/GlobalSearch.tsx', import.meta.url), 'utf8');
const today = readFileSync(new URL('../src/pages/Today/TodayPage.tsx', import.meta.url), 'utf8');
const setup = readFileSync(new URL('../src/pages/Auth/FirstStudioSetupScreen.tsx', import.meta.url), 'utf8');

describe('WP10 release-candidate UI corrections', () => {
  it('provides complete recovery initiation and verified password replacement', () => {
    for (const contract of [
      'Forgot your password?',
      'Send Recovery Link',
      'Choose a new password',
      'Save New Password',
      'Confirm password',
    ]) expect(auth).toContain(contract);
    expect(authHook).toContain('resetPasswordForEmail');
    expect(authHook).toContain("event === 'PASSWORD_RECOVERY'");
    expect(authHook).toContain('updateUser({ password })');
    for (const contract of ['First studio setup', 'Canonical spec unit', 'Currency', 'Enter Studio']) {
      expect(setup).toContain(contract);
    }
    expect(authHook).toContain("from('studios')");
    expect(authHook).toContain('.insert({');
    expect(authHook).toContain("from('studio_settings')");
  });

  it('keeps Technical Studio reachable in Field Mode and removes the non-bible shortcut', () => {
    expect(mobileNav).toContain("['technical', 'production'");
    expect(mobileNav).not.toContain("'portfolio', 'stats', 'settings'");
  });

  it('keeps compact access and sign-out controls at least 44 pixels tall', () => {
    expect(auth).toContain("'min-h-11 flex-1");
    expect(sidebar).toContain('mt-3 inline-flex min-h-11');
  });

  it('keeps Today on canonical activity and preserves global keyboard search', () => {
    for (const contract of ['Recent activity', 'Featured garment', 'Offline: your visual workspace']) {
      expect(today).toContain(contract);
    }
    expect(today).toContain('useCanonicalWorkspace');
    expect(search).toContain('Meta+K Control+K');
    expect(search).toContain('Create actions');
    expect(search).toContain("['kanban', 'New task or event']");
  });
});
