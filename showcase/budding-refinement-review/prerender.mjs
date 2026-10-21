// Build-time progressive first frame for this isolated review only.
// Run after its separate R6 Vite build. Never modifies the default site-dist.
import { readFile, writeFile, lstat, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { createElement, StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

const reviewDirectory = dirname(fileURLToPath(import.meta.url));
const kit = resolve(reviewDirectory, '../..');
const entryRelative = 'showcase/budding-refinement-review/index.html';
const args = process.argv.slice(2);
if (!args.length || args.includes('--help')) {
  console.log('Usage: node showcase/budding-refinement-review/prerender.mjs --out-dir <separate-R6-build> --base /ui/releases/budding-review-20261022-r6/');
  console.log('After the client build, render the same Review/StrictMode tree into its unique empty root. The default site-dist and previous review builds are not written.');
  process.exit(0);
}
const options = new Map();
for (let i = 0; i < args.length; i += 2) {
  const key = args[i], value = args[i + 1];
  if (!['--out-dir', '--base'].includes(key) || !value || value.startsWith('--') || options.has(key)) throw Error('Pass each of --out-dir and --base exactly once.');
  options.set(key, value);
}
if (!options.has('--out-dir') || !options.has('--base')) throw Error('Both --out-dir and --base are required.');
const outDirectory = resolve(process.cwd(), options.get('--out-dir'));
const base = options.get('--base');
if (!base.startsWith('/') || !base.endsWith('/') || base.includes('//') || /[\\?#]/.test(base) || base.split('/').slice(1, -1).some(part => !part || part === '.' || part === '..')) throw Error('The client base must be an absolute URL path ending in /.');
const defaultRelative = relative(join(kit, 'site-dist'), outDirectory);
if (!defaultRelative || (!defaultRelative.startsWith('..') && !isAbsolute(defaultRelative))) throw Error('Use a separate R6 output directory; the existing site-dist is read only.');
const stat = await lstat(outDirectory);
if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error('Expected an ordinary, already built output directory.');
const entry = join(outDirectory, entryRelative);
const entryStat = await lstat(entry);
if (!entryStat.isFile() || entryStat.isSymbolicLink()) throw Error('Expected the ordinary built review HTML.');
const actualRoot = await realpath(outDirectory), actualEntry = await realpath(entry);
const entryLocation = relative(actualRoot, actualEntry);
if (entryLocation.startsWith('..') || isAbsolute(entryLocation)) throw Error('The entry resolves outside the selected output.');
const built = await readFile(entry, 'utf8');
const emptyRoots = [...built.matchAll(/<div\b(?=[^>]*\bid=["']root["'])[^>]*>\s*<\/div>/gi)];
if (emptyRoots.length !== 1 || [...built.matchAll(/\bid=["']root["']/gi)].length !== 1) throw Error('The built review must contain exactly one empty root; refusing a second prerender.');
if (!built.includes('name="robots" content="noindex"')) throw Error('Only the isolated noindex review may be prerendered.');
const modules = [...built.matchAll(/<script\b[^>]*type=["']module["'][^>]*src=["']([^"']+)["']/gi)].map(match => match[1]);
const styles = [...built.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)].map(match => match[1]);
if (!modules.length || !styles.length || [...modules, ...styles].some(url => !url.startsWith(`${base}assets/`))) throw Error('The client entry does not use the supplied build base.');
for (const url of [...modules, ...styles]) {
  const name = url.slice(base.length);
  if (/[\\?#]/.test(name) || name.split('/').some(part => !part || part === '.' || part === '..')) throw Error('Invalid built resource URL.');
  const resource = join(outDirectory, name), resourceStat = await lstat(resource);
  if (!resourceStat.isFile() || resourceStat.isSymbolicLink()) throw Error('A referenced client resource is missing or not ordinary.');
  const resolved = relative(actualRoot, await realpath(resource));
  if (resolved.startsWith('..') || isAbsolute(resolved)) throw Error('A client resource resolves outside the build.');
}
if (typeof globalThis.document !== 'undefined' || typeof globalThis.window !== 'undefined') throw Error('Run the build-time render in Node without browser DOM shims.');

const sha256 = data => createHash('sha256').update(data).digest('hex');
const earlySource = await readFile(join(reviewDirectory, 'early-activation.js'), 'utf8');
// Parse without executing. The early controller must remain a classic script,
// so it can respond before the full module graph is available under CSP self.
new Script(earlySource, { filename: 'early-activation.js' });
const earlySha256 = sha256(earlySource);
const earlyName = `assets/budding-early-activation-${earlySha256.slice(0, 12)}.js`;
if (/budding-early-activation-/.test(built)) throw Error('The built entry already contains the early controller.');
let server;
let markup;
const verifiedFrames = [];
try {
  server = await createServer({
    root: kit,
    configFile: join(kit, 'vite.config.mjs'),
    base,
    appType: 'custom',
    logLevel: 'warn',
    clearScreen: false,
    server: { middlewareMode: true, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  const [{ Review }, { firstFrames }, { refinementGeometry }] = await Promise.all([
    server.ssrLoadModule('/showcase/budding-refinement-review/main.tsx'),
    server.ssrLoadModule('/showcase/budding-refinement-review/first-frame.ts'),
    server.ssrLoadModule('/showcase/budding-refinement-review/geometry.ts'),
  ]);
  if (typeof Review !== 'function' || typeof refinementGeometry !== 'function') throw Error('The review must export its actual Review component and geometry.');
  for (const diameter of [44, 54]) {
    const frame = firstFrames?.[diameter], shape = refinementGeometry(0, diameter), full = refinementGeometry(1, diameter);
    // The recorded CSS slot rounds the coverage kernel's sub-0.001px tail;
    // the actual contour itself must remain byte-for-byte identical.
    if (!frame || frame.diameter !== diameter || Math.abs(frame.cssWidth - shape.width) > .001 || Math.abs(frame.cssHeight - shape.height) > .001 || frame.path !== shape.path) throw Error(`The ${diameter}px static frame differs from the actual resting geometry.`);
    if (!Number.isFinite(frame.textureCssWidth) || Math.abs(frame.textureCssWidth - (full.width + 2)) > .001 || frame.width !== Math.ceil((full.width + 2) * 1.5) || frame.height !== Math.ceil(full.height * 1.5)) throw Error(`The ${diameter}px texture must use the actual reference canvas extent and 1.5x raster without stretching.`);
    if (!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(frame.png)) throw Error('Static material must be the supplied inline PNG, not a source asset URL.');
    const png = Buffer.from(frame.png.slice(frame.png.indexOf(',') + 1), 'base64');
    if (png.length < 24 || !png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || png.readUInt32BE(16) !== frame.width || png.readUInt32BE(20) !== frame.height || sha256(png) !== frame.sha256) throw Error(`The ${diameter}px PNG metadata or digest differs from the recorded material frame.`);
    verifiedFrames.push({ diameter, cssWidth: frame.cssWidth, cssHeight: frame.cssHeight, textureCssWidth: frame.textureCssWidth, rasterWidth: frame.width, rasterHeight: frame.height, pngSha256: frame.sha256 });
  }
  markup = renderToString(createElement(StrictMode, null, createElement(Review)));
  if (!markup || !markup.includes('budding-refinement-review') || !markup.includes('Grow. Separate. Return.') || !markup.includes('The production component')) throw Error('The actual complete review was not rendered.');
  for (const diameter of [44, 54]) {
    if (!markup.includes(firstFrames[diameter].png) || [...markup.matchAll(new RegExp(`data-first-frame=["']${diameter}["']`, 'g'))].length !== 1) throw Error(`The rendered tree omits or duplicates its ${diameter}px responsive static material.`);
  }
  const growthValues = [...markup.matchAll(/data-growth=["']([^"']+)["']/g)].map(match => Number(match[1]));
  if (!growthValues.length || growthValues.some(value => value !== 0)) throw Error('The server frame must start at the actual resting growth value.');
  if (!/<button\b/.test(markup) || !/<a\b[^>]*href=["']https:\/\/alvenx\.com\/ui\/["']/.test(markup)) throw Error('The initial native review actions are missing.');
  if (/\/(?:@fs|@vite)\//.test(markup)) throw Error('The server output contains a development-only resource URL.');
  if (typeof globalThis.document !== 'undefined' || typeof globalThis.window !== 'undefined') throw Error('The server render introduced browser DOM globals.');
} finally {
  await server?.close();
}

// Preserve the already built head, modules, CSS and provenance preparation.
// Only the unique empty root is replaced after every SSR/asset check passes.
const empty = emptyRoots[0];
const opening = empty[0].match(/^<div\b[^>]*>/i)?.[0];
if (!opening) throw Error('Could not preserve the built root opening tag.');
const withMarkup = built.slice(0, empty.index) + `${opening}${markup}</div>` + built.slice(empty.index + empty[0].length);
const firstModule = /<script\b[^>]*type=["']module["'][^>]*>/.exec(withMarkup);
if (!firstModule) throw Error('The built main module disappeared during prerender.');
const rendered = withMarkup.slice(0, firstModule.index) + `<script defer src="${base}${earlyName}"></script>` + withMarkup.slice(firstModule.index);
if (await readFile(entry, 'utf8') !== built) throw Error('The client entry changed during SSR; rebuild and rerun before writing.');
await writeFile(join(outDirectory, earlyName), earlySource, { flag: 'wx' });
await writeFile(entry, rendered);
console.log(JSON.stringify({
  status: 'prerendered', entry: entryRelative, outDirectory, base,
  render: 'actual Review inside StrictMode; Node without DOM globals',
  initialGrowth: 0,
  previousHtmlSha256: sha256(built), htmlSha256: sha256(rendered), htmlBytes: Buffer.byteLength(rendered),
  markupBytes: Buffer.byteLength(markup), responsiveFrames: verifiedFrames,
  earlyController: { path: earlyName, bytes: Buffer.byteLength(earlySource), sha256: earlySha256, execution: 'external defer before the main module; no inline script' },
  defaultSiteDistChanged: false,
}, null, 2));
