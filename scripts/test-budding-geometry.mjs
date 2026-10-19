import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Numeric coverage of the actual source; browser material and timing are checked
// separately by the homepage interaction runs, not inferred from these curves.
const asModule = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText).toString('base64');
const volumeURL = asModule(await readFile('src/volume-hit-geometry.ts', 'utf8'));
const source = (await readFile('src/buddingGeometry.ts', 'utf8')).replace("from './volume-hit-geometry'", 'from ' + JSON.stringify(volumeURL));
const { buddingGeometry } = await import(asModule(source));
const checks = [];
const check = (name, run) => { run(); checks.push(name); };
const close = (a, b, epsilon = 1e-5) => assert.ok(Math.abs(a - b) <= epsilon, `${a} differs from ${b}`);
function segments(path) {
  assert.match(path, /^M [-\d.]+ [-\d.]+ (C [-\d.]+ [-\d.]+ [-\d.]+ [-\d.]+ [-\d.]+ [-\d.]+ ?)+ Z$/);
  const values = path.match(/-?\d+(?:\.\d+)?/g).map(Number);
  assert.ok(values.every(Number.isFinite));
  let start = values.slice(0, 2);
  const result = [];
  for (let index = 2; index < values.length; index += 6) {
    const segment = [start, values.slice(index, index + 2), values.slice(index + 2, index + 4), values.slice(index + 4, index + 6)];
    result.push(segment); start = segment[3];
  }
  assert.deepEqual(start, result[0][0], 'the seam is closed exactly');
  return result;
}
function samples(path) {
  return segments(path).flatMap(([a, b, c, d]) => Array.from({ length: 9 }, (_, i) => {
    const t = i / 8, u = 1 - t;
    return [0, 1].map(axis => u ** 3 * a[axis] + 3 * u * u * t * b[axis] + 3 * u * t * t * c[axis] + t ** 3 * d[axis]);
  }));
}

for (const diameter of [32, 44, 54, 66]) {
  let lastWidth = 0;
  for (let index = 0; index <= 100; index++) {
    const g = index / 100, shape = buddingGeometry(g, diameter);
    check(`${diameter}px / growth ${g}: finite C2 contour, bounds and anchored layout`, () => {
      assert.equal(shape.growth, g);
      close(shape.height, diameter * 1.4 + 12);
      close(shape.mother.x + shape.mother.width / 2, 6 + diameter / 2);
      close(shape.mother.y + shape.mother.height / 2, shape.height / 2);
      assert.ok(shape.width >= diameter + 12 && shape.width + 1e-5 >= lastWidth, 'layout width never contracts during rightward growth');
      lastWidth = shape.width;
      const curves = segments(shape.path);
      for (let n = 0; n < curves.length; n++) {
        const previous = curves[n], next = curves[(n + 1) % curves.length];
        for (const axis of [0, 1]) {
          close(3 * (previous[3][axis] - previous[2][axis]), 3 * (next[1][axis] - next[0][axis]));
          close(6 * (previous[3][axis] - 2 * previous[2][axis] + previous[1][axis]), 6 * (next[2][axis] - 2 * next[1][axis] + next[0][axis]), 3e-5);
        }
      }
      for (const [x, y] of samples(shape.path)) {
        assert.ok(x >= 5.99 && x <= shape.width - 5.99, `x=${x} stays inside the optical padding`);
        assert.ok(y >= 5.99 && y <= shape.height - 5.99, `y=${y} stays inside the optical padding`);
      }
    });
  }
  check(`${diameter}px: initial round mother and complete joined chamber`, () => {
    const closed = buddingGeometry(0, diameter), open = buddingGeometry(1, diameter);
    const cx = closed.mother.x + diameter / 2, cy = closed.height / 2;
    for (const [x, y] of samples(closed.path)) close(Math.hypot(x - cx, y - cy), diameter / 2, .12);
    assert.ok(open.width > closed.width * 2);
    close(open.chamber.width, 2 * 255 * 1.15 * diameter / 300);
    close(open.chamber.height, diameter * 1.4);
    const points = samples(open.path), neckX = 6 + (430 - 80) * diameter / 300;
    const neck = points.filter(([x]) => Math.abs(x - neckX) < diameter * .06);
    assert.ok(neck.some(([, y]) => y < open.height / 2 - diameter * .15));
    assert.ok(neck.some(([, y]) => y > open.height / 2 + diameter * .15));
  });
}
check('finite invalid-input recovery and clamped progress', () => {
  for (const value of [NaN, Infinity, -Infinity, -1]) assert.deepEqual(buddingGeometry(value), buddingGeometry(0));
  assert.deepEqual(buddingGeometry(2), buddingGeometry(1));
  for (const diameter of [0, -1, NaN, Infinity]) assert.deepEqual(buddingGeometry(.5, diameter), buddingGeometry(.5, 54));
});
check('bounded near/press transform changes only contour, preserving native slots and width', () => {
  const resting = buddingGeometry(.7), moved = buddingGeometry(.7, 54, { offsetX: 1, offsetY: -.5, scaleX: 1.01, scaleY: .98 });
  assert.equal(resting.width, moved.width); assert.equal(resting.height, moved.height);
  assert.deepEqual(resting.mother, moved.mother); assert.deepEqual(resting.chamber, moved.chamber);
  const before = segments(resting.path).flat(1), after = segments(moved.path).flat(1);
  for (let i = 0; i < before.length; i++) {
    close(after[i][0], 33 + (before[i][0] - 33) * 1.01 + 1, 2e-6);
    close(after[i][1], resting.height / 2 + (before[i][1] - resting.height / 2) * .98 - .5, 2e-6);
  }
  assert.deepEqual(buddingGeometry(.7, 54, { offsetX: NaN, scaleY: Infinity }), resting);
});
const endpoints = Object.fromEntries([44, 54].map(diameter => [diameter, [0, .5, 1].map(growth => {
  const { width, height, chamber } = buddingGeometry(growth, diameter);
  return { growth, width, height, chamber };
})]));
console.log(JSON.stringify({ status: 'passed', checks: checks.length, endpoints }, null, 2));
