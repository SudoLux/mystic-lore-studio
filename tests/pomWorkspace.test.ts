import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createPomPoint, createSpec, updatePomPoint } from '../src/domains/technical';
import { createCanonicalWorkspace } from '../src/domains/workspace';
import { normalizedAnchor, pointView } from '../src/pages/TechnicalStudio/PomWorkspace';
import { importStudioData } from '../src/lib/studioStorage';

const fixtureText = readFileSync(new URL('./fixtures/legacy-studio-data-v5.json', import.meta.url), 'utf8');

async function workspace() {
  const state = await createCanonicalWorkspace({ data: importStudioData(fixtureText), ownerUserId: '10000000-0000-4000-8000-000000000111' });
  return createSpec(state, state.garments[0].id, 'M', 'cm');
}

describe('POM workspace coordinate compatibility', () => {
  it('normalizes click positions against one flat surface and clamps its edges', () => {
    const bounds = { left: 100, top: 200, width: 400, height: 800 };
    expect(normalizedAnchor(300, 600, bounds)).toEqual({ x: .5, y: .5 });
    expect(normalizedAnchor(50, 1200, bounds)).toEqual({ x: 0, y: 1 });
  });

  it('persists a Back-specific anchor without changing the stable POM identity', async () => {
    const start = await workspace();
    const created = createPomPoint(start.state, { type: 'create_pom', specId: start.spec.id, code: 'SW', name: 'Shoulder width', method: 'Measure shoulder point to shoulder point', anchor: { x: .45, y: .2, view: 'back' } });
    const updated = updatePomPoint(created.state, created.point.id, { diagramAnchor: { x: .5, y: .25, view: 'back' } }, created.point.revision);
    const point = updated.pomPoints.find((item) => item.id === created.point.id)!;
    expect(point.code).toBe('SW');
    expect(pointView(point)).toBe('back');
    expect(point.diagramAnchor).toEqual({ x: .5, y: .25, view: 'back' });
  });

  it('keeps legacy anchors usable by resolving an absent view to Front', () => {
    expect(pointView({ diagramAnchor: { x: .4, y: .3 } })).toBe('front');
  });
});
