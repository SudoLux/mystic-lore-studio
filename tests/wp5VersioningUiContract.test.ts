import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const page = readFileSync(new URL('../src/pages/Versions/VersionsPage.tsx', import.meta.url), 'utf8');
const diff = readFileSync(new URL('../src/components/versioning/DiffViewer.tsx', import.meta.url), 'utf8');
const frame = readFileSync(new URL('../src/components/versioning/FreezeFrameDialog.tsx', import.meta.url), 'utf8');
const restore = readFileSync(new URL('../src/components/versioning/RestorePreview.tsx', import.meta.url), 'utf8');
const conflict = readFileSync(new URL('../src/components/versioning/ConflictResolver.tsx', import.meta.url), 'utf8');
const gate = readFileSync(new URL('../src/components/versioning/ReleaseGate.tsx', import.meta.url), 'utf8');

describe('WP5 Versions, Diff, and Restore UI contracts', () => {
  it('exposes a garment timeline and A/B structural comparison route', () => {
    for (const label of ['Timeline', 'Version A', 'Version B', 'Structural comparison', 'Export diff']) expect(page).toContain(label);
    expect(page).toContain('Current working state');
    expect(page).toContain('FreezeFrameDialog');
  });

  it('renders accessible table and narrow-screen cards with selective restore', () => {
    expect(diff).toContain('<table');
    expect(diff).toContain('md:hidden');
    expect(diff).toContain('type="checkbox"');
    expect(diff).toContain('restorable');
    expect(diff).toContain('warning');
  });

  it('captures named, scoped checkpoints in an accessible dialog', () => {
    expect(frame).toContain('aria-modal="true"');
    expect(frame).toContain('role="dialog"');
    expect(frame).toContain('freezeFrameScopes');
    expect(frame).toContain('Decision note');
  });

  it('shows downstream consequences and requires reasoned proposal-preview-commit restore', () => {
    for (const label of ['Restore preview', 'Pinned evidence', 'Restore reason', 'Commit as new version']) expect(restore).toContain(label);
    expect(page).toContain('Preview restore');
    expect(page).toContain('selectedKeys');
  });

  it('provides shared conflict and fresh-state release gate patterns', () => {
    for (const label of ['Base', 'This device', 'Server', 'Keep this device', 'Use server']) expect(conflict).toContain(label);
    for (const label of ['Fresh-state gate', 'Connection required', 'No unresolved conflicts', 'Fresh revision']) expect(gate).toContain(label);
    expect(gate).toContain('never queued blindly');
  });
});
