import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const moduleUrl = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText).toString('base64');

const geometryUrl = moduleUrl(await read('../src/geometry.ts'));
const withGeometry = async path => moduleUrl((await read(path))
  .replace("'../src/geometry'", JSON.stringify(geometryUrl)));
const { contourShape, cubicFramePath, shellPath } = await import(geometryUrl);
const { createTextLensTransition, sampleTextLensTransition } = await import(await withGeometry('../showcase/text-lens-motion.ts'));
const { textLensOutline } = await import(await withGeometry('../showcase/text-lens-shape.ts'));

function close(actual, expected, epsilon = 1e-7) {
  assert.ok(Math.abs(actual - expected) <= epsilon, 'Values differ: ' + actual + ', ' + expected);
}

function segments(path, count, closed = true) {
  assert.match(path, /^M [-\d.]+ [-\d.]+( C( [-\d.]+){6})+( Z)?$/);
  assert.equal(path.endsWith(' Z'), closed);
  const numbers = path.match(/-?\d+(?:\.\d+)?/g).map(Number);
  const curves = [];
  for (let offset = 0; offset < numbers.length - 2; offset += 6) {
    curves.push(Array.from({ length: 4 }, (_, index) => numbers.slice(offset + 2 * index, offset + 2 * index + 2)));
  }
  assert.equal(curves.length, count);
  return curves;
}

function verifyOutline(pose) {
  const { width, height } = pose;
  const outline = textLensOutline(pose);
  const shape = { ...contourShape(width - 4, height - 4, 2.65), x: width / 2, y: height / 2 };
  assert.equal(outline, shellPath(shape), 'The optical surface uses the same full kit contour');
  const outside = segments(outline, 32);
  close(outside[7][3][1], outside[23][3][1], .00101);
  for (const [index, closing] of outside.entries()) {
    const opening = outside[(index + 1) % outside.length];
    assert.deepEqual(closing[3], opening[0]);
    compareDerivatives(closing, opening, .00601, .01801);
  }
}

function compareDerivatives(closing, opening, tangentTolerance, curvatureTolerance) {
  for (const axis of [0, 1]) {
    const left = closing.map(point => point[axis]);
    const right = opening.map(point => point[axis]);
    close(3 * (left[3] - left[2]), 3 * (right[1] - right[0]), tangentTolerance);
    close(6 * (left[3] - 2 * left[2] + left[1]), 6 * (right[2] - 2 * right[1] + right[0]), curvatureTolerance);
  }
}

function verifyFrame(width, height, radius) {
  const path = cubicFramePath(width, height, radius);
  const corners = [...path.matchAll(/L ([^C]+)(C [^LZ]+)(?=L|Z)/g)];
  assert.equal(corners.length, 4);
  for (const [, start, curves] of corners) {
    const [first, second] = segments('M ' + start + curves.trim(), 2, false);
    compareDerivatives(first, second, .00601, .01801);
    const [a, b, c] = first;
    const [, d, e, f] = second;
    assert.ok((a[0] === b[0] && b[0] === c[0]) || (a[1] === b[1] && b[1] === c[1]));
    assert.ok((d[0] === e[0] && e[0] === f[0]) || (d[1] === e[1] && e[1] === f[1]));
  }
}

for (const fixture of [[1120, 70, 26], [354, 70, 26], [615, 64, 20], [65, 36, 20], [354, 400, 24]]) verifyFrame(...fixture);
assert.equal(cubicFramePath(0, 40, 20), '');

const rest = { x: 162.25, y: 112.5, width: 104, height: 104, strength: .64 };
const start = { x: 340, y: 83, width: 131.1, height: 82.35, strength: .91 };
const velocity = { x: .17, y: -.125, width: .036, height: -.013, strength: .0004 };
const bounds = { x: [65, 348], y: [62, 249], width: [80, 156], height: [70, 131], strength: [0, 1] };
const transition = createTextLensTransition(start, rest, 1500, 400, velocity, bounds);
const first = sampleTextLensTransition(transition, 1500);
assert.deepEqual(first.pose, start, 'Release starts at the displayed drag pose');
close(first.velocity.x, 3 * (bounds.x[1] - start.x) / transition.duration);
for (const axis of ['y', 'width', 'height', 'strength']) close(first.velocity[axis], velocity[axis]);

for (let time = 1500; time <= 1900; time += 5) {
  const state = sampleTextLensTransition(transition, time);
  for (const [axis, [min, max]] of Object.entries(bounds)) {
    assert.ok(state.pose[axis] >= min && state.pose[axis] <= max, axis + ' exceeded its envelope');
    if (time > 1500 && time < 1900) {
      const after = sampleTextLensTransition(transition, time + .001).pose[axis];
      const before = sampleTextLensTransition(transition, time - .001).pose[axis];
      close((after - before) / .002, state.velocity[axis]);
    }
  }
  verifyOutline(state.pose);
}

const final = sampleTextLensTransition(transition, 1900);
assert.deepEqual(final.pose, rest);
assert.equal(final.done, true);
assert.ok(Object.values(final.velocity).every(value => value === 0));
assert.deepEqual(sampleTextLensTransition(transition, 1910), final);

const active = sampleTextLensTransition(transition, 1565);
const reversed = createTextLensTransition(active.pose, start, 1565, 92, active.velocity, bounds);
const reversal = sampleTextLensTransition(reversed, 1565);
assert.deepEqual(reversal.pose, active.pose, 'Retargeting takes the last displayed pose');
for (const axis of Object.keys(rest)) close(reversal.velocity[axis], active.velocity[axis]);
const reduced = createTextLensTransition(start, rest, 1500, 0, velocity, bounds);
assert.deepEqual(sampleTextLensTransition(reduced, 1500), final);

for (const [width, height] of [[130, 50], [261.2005, 99.4007], [416.75, 173.3], [318, 32.349]]) {
  for (const strength of [0, 44, 86]) {
    verifyOutline({ x: 13, y: 71, width, height, strength });
  }
}

console.log('Text lens: 81 motion poses and 12 size/pressure cases preserve the single 32-segment C2 outline; five frame sizes verify eight cubic corner segments, and cubic timing and reduced motion pass');
