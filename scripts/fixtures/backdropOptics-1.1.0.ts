const SCENE_LIGHT = { x: -450, y: -350, z: 950 };

export type BackdropOpticsInput = {
  /** The same world-space union path used by the visible shell. */
  path: string;
  width: number;
  height: number;
  camera: { x: number; y: number; zoom: number };
  light?: { x:number;y:number;z:number };
  version: number;
  /** Omit unused mirror-channel work for displacement-only consumers. */
  channels?: 'rg' | 'rgb';
};

export type BackdropOpticsResult = {
  href: string;
  version: number;
  maskScale: number;
  mapCssWidth: number;
  mapCssHeight: number;
  computeMs: number;
};

function boxHorizontal(input: Float32Array, output: Float32Array, width: number, height: number, radius: number) {
  const divisor = radius * 2 + 1;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    let sum = 0;
    for (let x = 0; x <= radius && x < width; x++) sum += input[row + x];
    for (let x = 0; x < width; x++) {
      output[row + x] = sum / divisor;
      if (x - radius >= 0) sum -= input[row + x - radius];
      if (x + radius + 1 < width) sum += input[row + x + radius + 1];
    }
  }
}

function boxVertical(input: Float32Array, output: Float32Array, width: number, height: number, radius: number) {
  const divisor = radius * 2 + 1;
  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let y = 0; y <= radius && y < height; y++) sum += input[y * width + x];
    for (let y = 0; y < height; y++) {
      output[y * width + x] = sum / divisor;
      if (y - radius >= 0) sum -= input[(y - radius) * width + x];
      if (y + radius + 1 < height) sum += input[(y + radius + 1) * width + x];
    }
  }
}

/** Three sliding boxes approximate a Gaussian without quantizing the height field. */
function blur(input: Float32Array, output: Float32Array, scratch: Float32Array, width: number, height: number, sigma: number) {
  const ideal = Math.sqrt(4 * sigma * sigma + 1);
  const lower = Math.max(1, Math.floor(ideal) - (Math.floor(ideal) % 2 === 0 ? 1 : 0));
  const upper = lower + 2;
  const lowerCount = Math.round((12 * sigma * sigma - 3 * lower * lower - 12 * lower - 9) / (-4 * lower - 4));
  output.set(input);
  for (let pass = 0; pass < 3; pass++) {
    const radius = ((pass < lowerCount ? lower : upper) - 1) / 2;
    boxHorizontal(output, scratch, width, height, radius);
    boxVertical(scratch, output, width, height, radius);
  }
}

// Every render is synchronous on one browser thread. Scratch pixels belong to
// this workspace, not to each mounted control; no caller receives these buffers.
// Dimensions remain bounded by the map limits and the existing padded kernel.
type Workspace = {
  maskCanvas: HTMLCanvasElement; mapCanvas: HTMLCanvasElement;
  mask: CanvasRenderingContext2D; map: CanvasRenderingContext2D;
  field: Float32Array; core: Float32Array; scratch: Float32Array;
  image?: ImageData;
};
type CachedMap = Omit<BackdropOpticsResult, 'version' | 'computeMs'>;
const MAX_CACHE_ENTRIES = 48;
const MAX_CACHE_BYTES = 2 * 1024 * 1024;
let workspace: Workspace | undefined;
let owners = 0;
let cacheBytes = 0;
const cache = new Map<string, { result: CachedMap; bytes: number }>();
const metrics = { renders: 0, previousHits: 0, sharedHits: 0, computations: 0, encodes: 0 };

function getWorkspace(): Workspace {
  if (!workspace) {
    const maskCanvas = document.createElement('canvas'), mapCanvas = document.createElement('canvas');
    const mask = maskCanvas.getContext('2d', { willReadFrequently: true }), map = mapCanvas.getContext('2d');
    if (!mask || !map) throw new Error('Backdrop optics requires a 2D canvas context.');
    workspace = { maskCanvas, mapCanvas, mask, map, field: new Float32Array(0), core: new Float32Array(0), scratch: new Float32Array(0) };
  }
  return workspace;
}

function remember(key: string, result: CachedMap) {
  // UTF-16 is a conservative bound for the ASCII key/data URL. This budget
  // includes the retained key and image string, not just compressed PNG bytes.
  const bytes = (key.length + result.href.length) * 2 + 128;
  if (bytes > MAX_CACHE_BYTES) return;
  while (cache.size >= MAX_CACHE_ENTRIES || cacheBytes + bytes > MAX_CACHE_BYTES) {
    const oldest = cache.keys().next().value as string;
    cacheBytes -= cache.get(oldest)!.bytes;
    cache.delete(oldest);
  }
  cache.set(key, { result, bytes }); cacheBytes += bytes;
}

/** Internal engineering counters, intentionally not re-exported by the kit API. */
export function getBackdropOpticsDiagnostics() {
  return { ...metrics, owners, workspaceBytes: workspace ? workspace.field.byteLength + workspace.core.byteLength + workspace.scratch.byteLength : 0,
    cacheEntries: cache.size, cacheBytes, maxCacheEntries: MAX_CACHE_ENTRIES, maxCacheBytes: MAX_CACHE_BYTES };
}

/**
 * Generates an RG normal map, never a copy of the page background. The native
 * backdrop-filter consumes it and refracts its own live backdrop pixels.
 * RGB remains the default for callers that also use the original mirror channel.
 */
export function createBackdropOptics() {
  getWorkspace(); owners++;
  let previousKey: string | undefined;
  let previousResult: BackdropOpticsResult | undefined;
  let destroyed = false;

  return {
    render(input: BackdropOpticsInput): BackdropOpticsResult {
      const { path, width, height, camera, version } = input;
      const light=input.light??SCENE_LIGHT;
      if (!(width > 0 && height > 0 && camera.zoom > 0) || ![width, height, camera.x, camera.y, camera.zoom,light.x,light.y,light.z].every(Number.isFinite)) {
        throw new Error('Backdrop optics requires finite viewport dimensions and a positive camera zoom.');
      }
      if (destroyed) throw new Error('Backdrop optics has been destroyed.');
      const channels = input.channels ?? 'rgb';
      const key = JSON.stringify([path, width, height, camera.x, camera.y, camera.zoom,
        ...(channels === 'rgb' ? [light.x, light.y, light.z] : []), channels]);
      metrics.renders++;
      if (previousKey === key && previousResult) {
        metrics.previousHits++;
        previousResult = { ...previousResult, version, computeMs: 0 }; return previousResult;
      }
      const hit = cache.get(key);
      if (hit) {
        metrics.sharedHits++;
        cache.delete(key); cache.set(key, hit);
        previousKey = key;
        previousResult = { ...hit.result, version, computeMs: 0 }; return previousResult;
      }
      const start = performance.now();
      metrics.computations++;
      const working = getWorkspace();
      const { maskCanvas, mapCanvas, mask, map } = working;
      const maskScale = Math.min(0.5, 224 / width, 160 / height);
      const mapWidth = Math.max(1, Math.ceil(width * maskScale));
      const mapHeight = Math.max(1, Math.ceil(height * maskScale));
      // Padding keeps a shape continuing beyond the viewport from acquiring a
      // false normal at the screen edge. Only the central map is encoded.
      const padding = Math.ceil(270 * maskScale) + 2;
      const rasterWidth = mapWidth + padding * 2;
      const rasterHeight = mapHeight + padding * 2;
      if (maskCanvas.width !== rasterWidth || maskCanvas.height !== rasterHeight) {
        maskCanvas.width = rasterWidth; maskCanvas.height = rasterHeight;
      }
      const length = rasterWidth * rasterHeight;
      if (working.field.length < length) {
        working.field = new Float32Array(length);
        working.core = new Float32Array(length);
        working.scratch = new Float32Array(length);
      }
      const field = working.field.subarray(0, length), core = working.core.subarray(0, length), scratch = working.scratch.subarray(0, length);
      if (!working.image || mapCanvas.width !== mapWidth || mapCanvas.height !== mapHeight) {
        mapCanvas.width = mapWidth; mapCanvas.height = mapHeight;
        working.image = map.createImageData(mapWidth, mapHeight);
      }
      const image = working.image;
      mask.resetTransform();
      mask.clearRect(0, 0, rasterWidth, rasterHeight);
      // Keep this identical to the DOM/SVG world-to-screen transform.
      mask.setTransform(maskScale * camera.zoom, 0, 0, maskScale * camera.zoom,
        padding + maskScale * (width / 2 - camera.x * camera.zoom),
        padding + maskScale * (height / 2 + 8 - camera.y * camera.zoom));
      mask.fillStyle = '#fff';
      mask.fill(new Path2D(path));
      const alpha = mask.getImageData(0, 0, rasterWidth, rasterHeight).data;
      for (let i = 0; i < length; i++) field[i] = alpha[i * 4 + 3] / 255;
      // Compute the broad field first, then reuse the original raw buffer for
      // the narrow field. The retained alpha still supplies exact membership.
      // Both blur results and the final Float32 rounding match the v6 pipeline.
      blur(field, core, scratch, rasterWidth, rasterHeight, 90 * maskScale);
      blur(field, field, scratch, rasterWidth, rasterHeight, 4 * maskScale);
      for (let i = 0; i < length; i++) field[i] = field[i] * 12 + core[i] * 140;
      const pixels = image.data;
      for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
          const source = (y + padding) * rasterWidth + x + padding;
          const target = (y * mapWidth + x) * 4;
          let red = 128;
          let green = 128;
          let reflection = 0;
          if (alpha[source * 4 + 3] > 0) {
            // One raster pixel spans 1/maskScale CSS pixels.
            const dx = (field[source + 1] - field[source - 1]) * maskScale / 2;
            const dy = (field[source + rasterWidth] - field[source - rasterWidth]) * maskScale / 2;
            const inverseLength = 1 / Math.sqrt(dx * dx + dy * dy + 1);
            // N=(-dh/dx,-dh/dy,1). Inward sampling magnifies the live backdrop.
            red = Math.round((0.5 + 0.5 * dx * inverseLength) * 255);
            green = Math.round((0.5 + 0.5 * dy * inverseLength) * 255);
            if (channels === 'rgb') {
              const worldX=((x+.5)/maskScale-width/2)/camera.zoom+camera.x;
              const worldY=((y+.5)/maskScale-height/2-8)/camera.zoom+camera.y;
              const lx=light.x-worldX,ly=light.y-worldY,lz=light.z-field[source]/camera.zoom;
              const lightLength=Math.sqrt(lx*lx+ly*ly+lz*lz),hx=lx/lightLength,hy=ly/lightLength,hz=lz/lightLength+1;
              const halfLength=Math.sqrt(hx*hx+hy*hy+hz*hz);
              const highlight=Math.max(0,(-dx*hx-dy*hy+hz)*inverseLength/halfLength);
              // B is a narrow mirror response from the very same float normal.
              // It never supplies the transmitted colour or a white body wash.
              reflection=Math.round(255*(Math.pow(highlight,180)*.68+Math.pow(highlight,70)*.035));
            }
          }
          pixels[target] = red;
          pixels[target + 1] = green;
          pixels[target + 2] = reflection;
          pixels[target + 3] = 255;
        }
      }
      map.putImageData(image, 0, 0);
      const href = mapCanvas.toDataURL('image/png'); metrics.encodes++;
      const result: CachedMap = { href, maskScale, mapCssWidth: mapWidth / maskScale, mapCssHeight: mapHeight / maskScale };
      remember(key, result);
      previousKey = key;
      previousResult = { ...result, version, computeMs: performance.now() - start };
      return previousResult;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      previousKey = previousResult = undefined;
      if (--owners === 0) {
        if (workspace) {
          workspace.maskCanvas.width = workspace.mapCanvas.width = 0;
          workspace.maskCanvas.height = workspace.mapCanvas.height = 0;
        }
        workspace = undefined; cache.clear(); cacheBytes = 0;
      }
    },
  };
}
