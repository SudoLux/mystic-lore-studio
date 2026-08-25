import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('WP4 Technical Studio UI contracts', () => {
  const page = read('../src/pages/TechnicalStudio/TechnicalStudioPage.tsx');
  it('keeps flat switching and canvas annotation keyboard accessible', () => { expect(page).toContain('aria-label="Flat views"'); expect(page).toContain('aria-current'); expect(page).toContain("event.key === 'Enter'"); expect(page).toContain('tabIndex={asset ? 0'); });
  it('exposes source identity, comparison, warnings, approval, and revision actions', () => { for (const label of ['New revision', 'Compare', 'Approve', 'Validation', 'storageState']) expect(page).toContain(label); });
  it('keeps annotations as structured records outside rendered pixels', () => { expect(page).toContain('flatAnnotations'); expect(page).toContain('set_annotation_status'); expect(page).toContain('Coordinates and text are saved as records'); });
  it('provides narrow-screen fallback before the wide technical layout', () => { expect(page).toContain('overflow-x-auto'); expect(page).toContain('xl:grid-cols'); });
});
