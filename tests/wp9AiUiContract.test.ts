import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const page = readFileSync(new URL('../src/pages/AiStudio/AiStudioPage.tsx', import.meta.url), 'utf8');
const panel = readFileSync(new URL('../src/components/ai/AiCandidatePanel.tsx', import.meta.url), 'utf8');
const repository = readFileSync(new URL('../src/domains/ai/governedAiRepository.ts', import.meta.url), 'utf8');
const provider = readFileSync(new URL('../src/domains/ai/fakeAiProvider.ts', import.meta.url), 'utf8');

describe('WP9 AI candidate UI contracts', () => {
  it('shows every governed lifecycle state and source inspection', () => {
    for (const label of ['Queued', 'Running', 'Candidate', 'Accepted', 'Rejected', 'Modified after generation']) expect(page).toContain(label);
    for (const label of ['Inspect sources', 'Candidate fields', 'Contextual confidence', 'Commit consequence']) expect(panel).toContain(label);
  });

  it('uses keyboard-accessible field selection and explicit decisions', () => {
    expect(panel).toContain('type="checkbox"');
    expect(panel).toContain('<fieldset');
    expect(panel).toContain('Decision note');
    expect(panel).toContain('Accept selected through domain commands');
    expect(panel).toContain('Reject candidate');
  });

  it('includes offline, conflict, empty, failure, and narrow-screen states', () => {
    for (const label of ['fresh connection', 'Resolve', 'Begin with a focused request', 'Provider failed']) expect(`${page}\n${panel}`).toContain(label);
    expect(page).toMatch(/md:grid-cols|xl:grid-cols/);
    expect(panel).toMatch(/sm:grid-cols|md:grid-cols/);
  });

  it('keeps candidate generation deterministic and routes acceptance through typed commands', () => {
    expect(provider).toContain('deterministic_fake');
    expect(provider).not.toMatch(/fetch\(|openai|anthropic|paid/i);
    for (const command of ['registerFlat', 'createPomPoint', 'createBomItem', 'addConstructionStep', 'recordTechPackValidationRun', 'addEditorialBlock', 'updatePortfolioProject']) expect(repository).toContain(command);
    expect(repository).toContain("origin: 'ai_acceptance'");
    expect(repository).toContain('assertPrivateCandidateBoundary');
  });
});
