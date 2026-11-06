import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/workspace-volume/geometry.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
});
const { coverage, hitContours, isDetached } = await import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));

function fixture(vertical) {
  return {
    mother: vertical ? [510, 155, 75, 72] : [225, 270, 106, 106],
    panel: vertical ? [478, 410, 175, 102] : [665, 305, 194, 87],
    growth: 1, neck: 0, curvature: 4.2, detached: true,
    motherDeformation: [0, 0, 0, 0, 0],
    panelDeformation: [0, 0, 0, 0, 0],
  };
}

for (const vertical of [false, true]) {
  const base = fixture(vertical);
  const outlines = geometry => hitContours(geometry, vertical, 1.31, 13, -17);
  const rest = outlines(base);
  assert.equal(rest.parts, 2);
  assert.equal(rest.path, rest.motherPath + ' ' + rest.panelPath);

  for (const [active, fixed] of [['mother', 'panel'], ['panel', 'mother']]) {
    const [anchorX, anchorY] = base[active];
    for (const [dx, dy, squash] of [[32, -29, .115], [-31, 26, -.041]]) {
      const motion = { ...base, [active + 'Deformation']: [anchorX, anchorY, dx, dy, squash] };
      const moved = outlines(motion);
      assert.notEqual(moved[active + 'Path'], rest[active + 'Path']);
      assert.equal(moved[fixed + 'Path'], rest[fixed + 'Path']);
      assert.equal(moved.parts, 2);
      const [x, y, halfWidth] = base[fixed];
      for (const sample of [x - halfWidth, x, x + halfWidth])
        assert.equal(coverage(motion)(sample, y), coverage(base)(sample, y));
    }
  }

  const [mx, my, mrX, mrY] = base.mother, [px, py, prX, prY] = base.panel;
  const aligned = {
    ...base, growth: .92, detached: false,
    panel: vertical ? [mx, py, prX, prY] : [px, my, prX, prY],
  };
  assert.equal(isDetached(aligned, vertical), true);
  const gap = vertical ? py - prY - my - mrY : px - prX - mx - mrX;
  const joined = { ...aligned, neck: 3 * gap };
  assert.equal(isDetached(joined, vertical), false);
  assert.equal(outlines(joined).parts, 1);
  const nearlySeparated = { ...aligned, neck: gap };
  assert.equal(isDetached(nearlySeparated, vertical), true);
  assert.equal(isDetached({ ...joined, motherDeformation: [mx, my, 32, -32, .1] }, vertical), false);
  const beforeSwitch = { ...aligned, neck: 2 * gap - .04 };
  const afterSwitch = { ...beforeSwitch, detached: true };
  assert.equal(isDetached(beforeSwitch, vertical), true);
  const priorCoverage = coverage(beforeSwitch), splitCoverage = coverage(afterSwitch);
  for (let along = 0; along <= 1000; along += 2) {
    for (let across = -50; across <= 50; across += 5) {
      const [x, y] = vertical ? [mx + across, along] : [along, my + across];
      assert.equal(priorCoverage(x, y) <= 0, splitCoverage(x, y) <= 0, 'switch preserves the positive-neck silhouette');
    }
  }
  const splitPath = outlines(afterSwitch);
  assert.equal(splitPath.parts, 2);
  assert.notEqual(splitPath.motherPath, outlines({ ...afterSwitch, neck: 0 }).motherPath,
    'facing edge retains the remaining neck through detachment');
  const movedSplitPath = outlines({ ...afterSwitch, motherDeformation: [mx, my, 18, -18, .04] });
  assert.notEqual(movedSplitPath.motherPath, splitPath.motherPath);
  assert.equal(movedSplitPath.panelPath, splitPath.panelPath, 'remaining neck deformation is still isolated by lobe');

  const dormant = { ...base, growth: 0, detached: false };
  const dormantShape = outlines(dormant);
  assert.equal(dormantShape.parts, 1);
  assert.equal(dormantShape.path, dormantShape.motherPath);
  assert.equal(dormantShape.panelPath, '');
}
console.log('Workspace volume contours, independent deformation, and joined saddle: passed');
