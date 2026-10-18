import { readFile, mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import ts from 'typescript';

const load = async file => {
  const source = await readFile(file, 'utf8');
  const js = ts.transpileModule(source + '\nexport { blur, boxHorizontal, boxVertical };', { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
};
const previous = await load('scripts/fixtures/backdropOptics-1.1.0.ts');
const current = await load('src/backdropOptics.ts');
let seed = 91731, roiCases = 0, boundaryCases = 0;
const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
for (let index = 0; index < 200; index++) {
  const width = index < 10 ? index + 1 : 32 + Math.floor(random() * 100);
  const height = index < 10 ? 11 - index : 32 + Math.floor(random() * 100);
  const left = Math.floor(random() * width * .45), top = Math.floor(random() * height * .45);
  const right = left + Math.floor(random() * (width - left)), bottom = top + Math.floor(random() * (height - top));
  const input = new Float32Array(width * height), a = new Float32Array(input.length), b = new Float32Array(input.length), scratch = new Float32Array(input.length);
  for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) input[y * width + x] = index % 2 ? Math.floor(random() * 256) / 255 : random() * 2 ** -Math.floor(random() * 140);
  for (const sigma of [0, .5, 2, 9, 45]) {
    previous.blur(input, a, scratch, width, height, sigma);
    current.blur(input, b, scratch, width, height, sigma, { left, top, right, bottom });
    assert.deepEqual(b, a, `ROI ${index}: ${width}×${height}, sigma ${sigma}`); roiCases++;
  }
}
for (let width = 1; width <= 20; width++) for (let height = 1; height <= 20; height++) for (const radius of [0, 1, 2, 5, 10, 25]) {
  const input = Float32Array.from({ length: width * height }, () => random()), a = new Float32Array(input.length), b = new Float32Array(input.length);
  for (const method of ['boxHorizontal', 'boxVertical']) {
    previous[method](input, a, width, height, radius); current[method](input, b, width, height, radius);
    assert.deepEqual(b, a, `${method} ${width}×${height}, radius ${radius}`); boundaryCases++;
  }
}
const report = { status: 'passed', exactFloat32RoiCases: roiCases, exactFloat32BoundaryCases: boundaryCases, note: 'Actual Float32 arrays equal the 1.1.0 fixture, including sparse fields, extreme exponents, tiny rasters, oversized kernels and retained cancellation tails.' };
await mkdir('docs/validation/hover-1.1.1', { recursive: true });
await writeFile('docs/validation/hover-1.1.1/kernel-contract.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
