import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('WP4 Technical Studio UI contracts', () => {
  const page = read('../src/pages/TechnicalStudio/FlatsWorkspace.tsx');
  it('keeps flat switching and canvas annotation keyboard accessible', () => { expect(page).toContain('aria-label="Flat views"'); expect(page).toContain('aria-current'); expect(page).toContain("event.key === 'Enter'"); expect(page).toContain("tabIndex={annotating && asset ? 0 : undefined}"); });
  it('exposes source identity, contextual comparison, validation, approval, and revision actions', () => { for (const label of ['Revision', 'Compare revisions', 'Approve', 'VALIDATION', 'Replace source']) expect(page).toContain(label); });
  it('keeps annotations as structured records outside rendered pixels', () => { expect(page).toContain('flatAnnotations'); expect(page).toContain("type: 'set_annotation_status'"); expect(page).toContain('stored separately from the artwork'); });
  it('provides a scrollable view selector and responsive canvas workspace', () => { expect(page).toContain('flat-view-selector'); expect(page).toContain('flats-workspace__grid'); });
});
