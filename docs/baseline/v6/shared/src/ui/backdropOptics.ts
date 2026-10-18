import { SCENE_LIGHT } from './GlassMaterial';

export type BackdropOpticsInput = {
  /** The same world-space union path used by the visible shell. */
  path: string;
  width: number;
  height: number;
  camera: { x: number; y: number; zoom: number };
  light?: { x:number;y:number;z:number };
  version: number;
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

/**
 * Generates an RG normal map, never a copy of the page background. Chrome's
 * backdrop-filter consumes this map and refracts its own live backdrop pixels.
 */
export function createBackdropOptics() {
  const maskCanvas = document.createElement('canvas');
  const mapCanvas = document.createElement('canvas');
  const maskContext = maskCanvas.getContext('2d', { willReadFrequently: true });
  const mapContext = mapCanvas.getContext('2d');
  if (!maskContext || !mapContext) throw new Error('Backdrop optics requires a 2D canvas context.');
  const mask = maskContext;
  const map = mapContext;
  let raw = new Float32Array(0);
  let rim = new Float32Array(0);
  let core = new Float32Array(0);
  let scratch = new Float32Array(0);
  let image: ImageData | undefined;
  let previousInput: BackdropOpticsInput | undefined;
  let previousResult: BackdropOpticsResult | undefined;

  return {
    render(input: BackdropOpticsInput): BackdropOpticsResult {
      const { path, width, height, camera, version } = input;
      const light=input.light??SCENE_LIGHT;
      if (!(width > 0 && height > 0 && camera.zoom > 0) || ![width, height, camera.x, camera.y, camera.zoom,light.x,light.y,light.z].every(Number.isFinite)) {
        throw new Error('Backdrop optics requires finite viewport dimensions and a positive camera zoom.');
      }
      if (previousInput && previousResult && previousInput.path === path &&
          previousInput.width === width && previousInput.height === height && previousInput.camera.x === camera.x &&
          previousInput.camera.y === camera.y && previousInput.camera.zoom === camera.zoom&&
          previousInput.light?.x===light.x&&previousInput.light?.y===light.y&&previousInput.light?.z===light.z) {
        previousResult={...previousResult,version,computeMs:0};return previousResult;
      }
      const start = performance.now();
      const maskScale = Math.min(0.5, 224 / width, 160 / height);
      const mapWidth = Math.max(1, Math.ceil(width * maskScale));
      const mapHeight = Math.max(1, Math.ceil(height * maskScale));
      // Padding keeps a shape continuing beyond the viewport from acquiring a
      // false normal at the screen edge. Only the central map is encoded.
      const padding = Math.ceil(270 * maskScale) + 2;
      const rasterWidth = mapWidth + padding * 2;
      const rasterHeight = mapHeight + padding * 2;
      if (maskCanvas.width !== rasterWidth || maskCanvas.height !== rasterHeight || raw.length !== rasterWidth * rasterHeight) {
        maskCanvas.width = rasterWidth;
        maskCanvas.height = rasterHeight;
        raw = new Float32Array(rasterWidth * rasterHeight);
        rim = new Float32Array(raw.length);
        core = new Float32Array(raw.length);
        scratch = new Float32Array(raw.length);
      }
      if (!image || mapCanvas.width !== mapWidth || mapCanvas.height !== mapHeight) {
        mapCanvas.width = mapWidth;
        mapCanvas.height = mapHeight;
        image = map.createImageData(mapWidth, mapHeight);
      }
      mask.resetTransform();
      mask.clearRect(0, 0, rasterWidth, rasterHeight);
      // Keep this identical to the DOM/SVG world-to-screen transform.
      mask.setTransform(maskScale * camera.zoom, 0, 0, maskScale * camera.zoom,
        padding + maskScale * (width / 2 - camera.x * camera.zoom),
        padding + maskScale * (height / 2 + 8 - camera.y * camera.zoom));
      mask.fillStyle = '#fff';
      mask.fill(new Path2D(path));
      const alpha = mask.getImageData(0, 0, rasterWidth, rasterHeight).data;
      for (let i = 0; i < raw.length; i++) raw[i] = alpha[i * 4 + 3] / 255;
      blur(raw, rim, scratch, rasterWidth, rasterHeight, 4 * maskScale);
      blur(raw, core, scratch, rasterWidth, rasterHeight, 90 * maskScale);
      for (let i = 0; i < raw.length; i++) rim[i] = rim[i] * 12 + core[i] * 140;
      const pixels = image!.data;
      for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
          const source = (y + padding) * rasterWidth + x + padding;
          const target = (y * mapWidth + x) * 4;
          let red = 128;
          let green = 128;
          let reflection = 0;
          if (raw[source] > 0) {
            // One raster pixel spans 1/maskScale CSS pixels.
            const dx = (rim[source + 1] - rim[source - 1]) * maskScale / 2;
            const dy = (rim[source + rasterWidth] - rim[source - rasterWidth]) * maskScale / 2;
            const inverseLength = 1 / Math.sqrt(dx * dx + dy * dy + 1);
            // N=(-dh/dx,-dh/dy,1). Inward sampling magnifies the live backdrop.
            red = Math.round((0.5 + 0.5 * dx * inverseLength) * 255);
            green = Math.round((0.5 + 0.5 * dy * inverseLength) * 255);
            const worldX=((x+.5)/maskScale-width/2)/camera.zoom+camera.x;
            const worldY=((y+.5)/maskScale-height/2-8)/camera.zoom+camera.y;
            const lx=light.x-worldX,ly=light.y-worldY,lz=light.z-rim[source]/camera.zoom;
            const lightLength=Math.sqrt(lx*lx+ly*ly+lz*lz),hx=lx/lightLength,hy=ly/lightLength,hz=lz/lightLength+1;
            const halfLength=Math.sqrt(hx*hx+hy*hy+hz*hz);
            const highlight=Math.max(0,(-dx*hx-dy*hy+hz)*inverseLength/halfLength);
            // B is a narrow mirror response from the very same float normal.
            // It never supplies the transmitted colour or a white body wash.
            reflection=Math.round(255*(Math.pow(highlight,180)*.68+Math.pow(highlight,70)*.035));
          }
          pixels[target] = red;
          pixels[target + 1] = green;
          pixels[target + 2] = reflection;
          pixels[target + 3] = 255;
        }
      }
      map.putImageData(image!, 0, 0);
      const href = mapCanvas.toDataURL('image/png');
      previousInput = { ...input, camera: { ...camera }, light:{...light} };
      previousResult = { href, version, maskScale, mapCssWidth:mapWidth/maskScale, mapCssHeight:mapHeight/maskScale, computeMs: performance.now() - start };
      return previousResult;
    },
    destroy() {
      maskCanvas.width = mapCanvas.width = 0;
      maskCanvas.height = mapCanvas.height = 0;
      raw = rim = core = scratch = new Float32Array(0);
      image = undefined;
      previousInput = previousResult = undefined;
    },
  };
}

