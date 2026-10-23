import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { VolumeBuddingLink, GlassClock } from '../dist/index.js';

// The integration must preserve the accepted geometry, shader and raster source.
for (const name of ['geometry.ts', 'reference-volume.ts', 'first-frame.ts']) {
  const accepted = (await readFile(`showcase/budding-refinement-review/${name}`, 'utf8')).replaceAll('../../src/', '../').replaceAll('\r\n', '\n');
  assert.equal((await readFile(`src/budding-volume/${name}`, 'utf8')).replaceAll('\r\n', '\n'), accepted, name);
}
const html = renderToString(createElement(VolumeBuddingLink, {
  clock: new GlassClock(), id: 'installed-volume', href: '/destination', earlyActivation: true,
}));
assert.match(html, /data-volume-budding="installed-volume"/);
assert.match(html, /data-budding-early="true"/);
assert.match(html, /data-enhanced="false"/);
assert.match(html, /href="\/destination"/);
assert.equal((html.match(/data:image\/png;base64,/g) || []).length, 2);
assert.equal((html.match(/data-first-frame="(?:44|54)"/g) || []).length, 2);
assert.doesNotMatch(html, /operator="out"/);
assert.doesNotMatch(html, /<canvas|<button/);
console.log('Volume budding promotion: accepted geometry/material/frame identity and native SSR passed.');
