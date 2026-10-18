import assert from 'node:assert/strict';
import { volumeRasterSize } from '../src/volume-budget.js';

let cases = 0;
for (const [width, height] of [[1252, 668], [1920, 1080], [390, 844], [100000, 1], [1, 100000], [NaN, 0]]) {
  for (const dpr of [1, 1.25, 2, 3, NaN]) for (const maxPixels of [1, 250000, 1000000, 2000000, 0, Infinity]) {
    const size = volumeRasterSize(width, height, { dpr, maxPixels, maxDimension: 8192 });
    assert.ok(size.width * size.height <= size.maxPixels, 'hard total pixel bound');
    assert.ok(Number.isInteger(size.width) && size.width > 0 && size.width <= 8192);
    assert.ok(Number.isInteger(size.height) && size.height > 0 && size.height <= 8192);
    assert.ok(Number.isFinite(size.scale) && size.scale > 0);
    cases++;
  }
}
assert.deepEqual(volumeRasterSize(1252, 668, { dpr: 1 }), { width: 1252, height: 668, scale: 1, maxPixels: 2000000, constrained: false, limited: false });
const retina = volumeRasterSize(1252, 668, { dpr: 2 });
assert.ok(retina.limited && retina.width * retina.height <= 2000000 && retina.scale > 1.5);
assert.equal(volumeRasterSize(1252, 668, { deviceMemory: 4 }).maxPixels, 1000000);
assert.equal(volumeRasterSize(1252, 668, { hardwareConcurrency: 4 }).maxPixels, 1000000);
assert.equal(volumeRasterSize(1252, 668, { saveData: true, maxPixels: 750000 }).maxPixels, 750000);
assert.equal(volumeRasterSize(100, 100, { dpr: 3, maxDpr: 1.25 }).width, 125);
console.log(JSON.stringify({ status: 'passed', cases, retina }));
