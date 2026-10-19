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
  /** Synchronous raster/submission time; renderAsync excludes native PNG wait. */
  computeMs: number;
};

function boxHorizontal(input: Float32Array, output: Float32Array, width: number, height: number, radius: number) {
  const divisor = radius * 2 + 1;
  const innerEnd = width - radius - 1;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    let sum = 0;
    for (let x = 0; x <= radius && x < width; x++) sum += input[row + x];
    // The optical raster's padding keeps the actual kernels smaller than half
    // its width. Retain the general case for a narrower future caller too.
    if (width <= radius * 2 + 1) {
      for (let x = 0; x < width; x++) {
        output[row + x] = sum / divisor;
        if (x - radius >= 0) sum -= input[row + x - radius];
        if (x + radius + 1 < width) sum += input[row + x + radius + 1];
      }
      continue;
    }
    // Keep the old accumulation order (write, subtract, add). Splitting the
    // padded boundaries removes edge tests from the large interior loop.
    let x = 0;
    for (; x < radius; x++) {
      output[row + x] = sum / divisor;
      sum += input[row + x + radius + 1];
    }
    for (; x < innerEnd; x++) {
      output[row + x] = sum / divisor;
      sum -= input[row + x - radius];
      sum += input[row + x + radius + 1];
    }
    for (; x < width; x++) {
      output[row + x] = sum / divisor;
      sum -= input[row + x - radius];
    }
  }
}

// Width is bounded by the existing map and padding limits (< 500 columns).
// Float64 stores the very same JS-number sum as the original scalar loop.
let columnSums = new Float64Array(0);
function boxVertical(input: Float32Array, output: Float32Array, width: number, height: number, radius: number) {
  const divisor = radius * 2 + 1;
  if (columnSums.length < width) columnSums = new Float64Array(width);
  const sums = columnSums; sums.fill(0, 0, width);
  for (let y = 0; y <= radius && y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) sums[x] += input[row + x];
  }
  // Walk contiguous rows instead of revisiting a full strided column. Each
  // column still performs exactly the original subtract/add sequence.
  for (let y = 0; y < height; y++) {
    const row = y * width, remove = (y - radius) * width, add = (y + radius + 1) * width;
    if (y < radius) {
      if (y + radius + 1 < height) {
        for (let x = 0; x < width; x++) { output[row+x] = sums[x] / divisor; sums[x] += input[add+x]; }
      } else {
        for (let x = 0; x < width; x++) output[row+x] = sums[x] / divisor;
      }
    } else if (y + radius + 1 < height) {
      for (let x = 0; x < width; x++) { const sum = sums[x]; output[row+x] = sum / divisor; sums[x] = sum - input[remove+x] + input[add+x]; }
    } else {
      for (let x = 0; x < width; x++) { output[row+x] = sums[x] / divisor; sums[x] -= input[remove+x]; }
    }
  }
}

type Bounds = { left: number; top: number; right: number; bottom: number };

function boxHorizontalRegion(input: Float32Array, output: Float32Array, width: number, height: number, radius: number, bounds: Bounds): Bounds {
  const left = Math.max(0, bounds.left - radius), right = Math.min(width - 1, bounds.right + radius);
  output.fill(0);
  if (bounds.right < bounds.left) return bounds;
  const divisor = radius * 2 + 1;
  let retainedRight = right;
  for (let y = bounds.top; y <= bounds.bottom; y++) {
    const row = y * width;
    let sum = 0;
    for (let x = Math.max(0, left - radius); x <= Math.min(width - 1, left + radius); x++) sum += input[row + x];
    for (let x = left; x <= right; x++) {
      output[row + x] = sum / divisor;
      if (x - radius >= 0) sum -= input[row + x - radius];
      if (x + radius + 1 < width) sum += input[row + x + radius + 1];
    }
    // A JS sliding sum may leave cancellation residue after its mathematically
    // supported window. Preserve that exact tail rather than assuming zero.
    if (sum !== 0 && right + 1 < width) {
      output.fill(sum / divisor, row + right + 1, row + width);
      retainedRight = width - 1;
    }
  }
  return { ...bounds, left, right: retainedRight };
}

function boxVerticalRegion(input: Float32Array, output: Float32Array, width: number, height: number, radius: number, bounds: Bounds): Bounds {
  const top = Math.max(0, bounds.top - radius), bottom = Math.min(height - 1, bounds.bottom + radius);
  output.fill(0);
  if (bounds.right < bounds.left) return bounds;
  const divisor = radius * 2 + 1;
  if (columnSums.length < width) columnSums = new Float64Array(width);
  const sums = columnSums; sums.fill(0, bounds.left, bounds.right + 1);
  for (let y = Math.max(0, top - radius); y <= Math.min(height - 1, top + radius); y++) {
    const row = y * width;
    for (let x = bounds.left; x <= bounds.right; x++) sums[x] += input[row + x];
  }
  for (let y = top; y <= bottom; y++) {
    const row = y * width, remove = (y - radius) * width, add = (y + radius + 1) * width;
    if (y < radius) {
      if (y + radius + 1 < height) {
        for (let x = bounds.left; x <= bounds.right; x++) { output[row+x] = sums[x] / divisor; sums[x] += input[add+x]; }
      } else {
        for (let x = bounds.left; x <= bounds.right; x++) output[row+x] = sums[x] / divisor;
      }
    } else if (y + radius + 1 < height) {
      for (let x = bounds.left; x <= bounds.right; x++) { const sum = sums[x]; output[row+x] = sum / divisor; sums[x] = sum - input[remove+x] + input[add+x]; }
    } else {
      for (let x = bounds.left; x <= bounds.right; x++) { output[row+x] = sums[x] / divisor; sums[x] -= input[remove+x]; }
    }
  }
  let retainedBottom = bottom;
  for (let x = bounds.left; x <= bounds.right; x++) {
    if (sums[x] !== 0 && bottom + 1 < height) {
      const tail = sums[x] / divisor;
      for (let y = bottom + 1; y < height; y++) output[y * width + x] = tail;
      retainedBottom = height - 1;
    }
  }
  return { ...bounds, top, bottom: retainedBottom };
}

/** Three sliding boxes approximate a Gaussian without quantizing the height field. */
function blur(input: Float32Array, output: Float32Array, scratch: Float32Array, width: number, height: number, sigma: number, initialBounds?: Bounds) {
  const ideal = Math.sqrt(4 * sigma * sigma + 1);
  const lower = Math.max(1, Math.floor(ideal) - (Math.floor(ideal) % 2 === 0 ? 1 : 0));
  const upper = lower + 2;
  const lowerCount = Math.round((12 * sigma * sigma - 3 * lower * lower - 12 * lower - 9) / (-4 * lower - 4));
  output.set(input);
  let bounds = initialBounds;
  for (let pass = 0; pass < 3; pass++) {
    const radius = ((pass < lowerCount ? lower : upper) - 1) / 2;
    if (bounds && !(bounds.left === 0 && bounds.top === 0 && bounds.right === width - 1 && bounds.bottom === height - 1)) {
      const horizontal = boxHorizontalRegion(output, scratch, width, height, radius, bounds);
      bounds = boxVerticalRegion(scratch, output, width, height, radius, horizontal);
    } else {
      boxHorizontal(output, scratch, width, height, radius);
      boxVertical(scratch, output, width, height, radius);
    }
  }
}

// Field calculation is synchronous on one browser thread. Scratch pixels belong
// to this workspace, not each control; asynchronous PNG serialization snapshots
// the completed canvas and no caller receives these shared mutable buffers.
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
const metrics = { renders: 0, previousHits: 0, sharedHits: 0, computations: 0, encodes: 0, asyncRequests: 0, asyncEncodes: 0, asyncCacheHits: 0, asyncDropped: 0, asyncEncodeWallMs: 0 };

type AsyncJob = { ready: () => boolean; run: () => Promise<void>; cancelled: boolean };
const MAX_ASYNC_JOBS = 2;
const asyncQueue: AsyncJob[] = [];
let activeAsyncJobs = 0;
function drainAsyncQueue() {
  for (let i=asyncQueue.length-1;i>=0;i--) if(asyncQueue[i].cancelled)asyncQueue.splice(i,1);
  while(activeAsyncJobs<MAX_ASYNC_JOBS){
    const index=asyncQueue.findIndex(job=>job.ready());
    if(index<0)return;
    const [job]=asyncQueue.splice(index,1);activeAsyncJobs++;
    // Rejection belongs to the requesting promise; the queue always releases
    // its native encoder slot, including cancellation and serialization failure.
    void job.run().finally(()=>{activeAsyncJobs--;drainAsyncQueue();});
  }
}
const aborted=()=>new DOMException('Backdrop optics request was superseded or destroyed.','AbortError');
/** Native asynchronous PNG serialization; no synchronous toDataURL or second
 * field calculation. toBlob snapshots the current canvas bitmap at invocation. */
function encodeAsync(canvas:HTMLCanvasElement):Promise<string>{
  return new Promise((resolve,reject)=>{
    canvas.toBlob(blob=>{
      if(!blob){reject(new Error('Backdrop optics PNG serialization failed.'));return;}
      const reader=new FileReader();
      reader.onerror=()=>reject(reader.error??new Error('Backdrop optics PNG reading failed.'));
      reader.onabort=()=>reject(aborted());
      reader.onload=()=>typeof reader.result==='string'?resolve(reader.result):reject(new Error('Backdrop optics PNG data URL is unavailable.'));
      try{reader.readAsDataURL(blob);}catch(error){reject(error);}
    },'image/png');
  });
}

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
  const previous=cache.get(key);
  if(previous){cacheBytes-=previous.bytes;cache.delete(key);}
  while (cache.size >= MAX_CACHE_ENTRIES || cacheBytes + bytes > MAX_CACHE_BYTES) {
    const oldest = cache.keys().next().value as string;
    cacheBytes -= cache.get(oldest)!.bytes;
    cache.delete(oldest);
  }
  cache.set(key, { result, bytes }); cacheBytes += bytes;
}

/** Internal engineering counters, intentionally not re-exported by the kit API. */
export function getBackdropOpticsDiagnostics() {
  return { ...metrics, owners, workspaceBytes: workspace ? workspace.field.byteLength + workspace.core.byteLength + workspace.scratch.byteLength + columnSums.byteLength : 0,
    cacheEntries: cache.size, cacheBytes, maxCacheEntries: MAX_CACHE_ENTRIES, maxCacheBytes: MAX_CACHE_BYTES,
    activeAsyncJobs, queuedAsyncJobs:asyncQueue.length, maxAsyncJobs:MAX_ASYNC_JOBS };
}

/** Synchronous exact field calculation shared by both serialization paths.
 * Canvas pixels are complete before either encoder snapshots the bitmap. */
function rasterize(input: BackdropOpticsInput) {
  const { path, width, height, camera } = input;
  const light = input.light ?? SCENE_LIGHT, channels = input.channels ?? 'rgb';
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
  const bounds: Bounds = { left:rasterWidth, top:rasterHeight, right:-1, bottom:-1 };
  for (let y = 0; y < rasterHeight; y++) for (let x = 0; x < rasterWidth; x++) {
    const i = y * rasterWidth + x, value = alpha[i * 4 + 3]; field[i] = value / 255;
    if (value > 0) {
      if (x < bounds.left) bounds.left = x; if (x > bounds.right) bounds.right = x;
      if (y < bounds.top) bounds.top = y; bounds.bottom = y;
    }
  }
  // Compute the broad field first, then reuse the original raw buffer for
  // the narrow field. The retained alpha still supplies exact membership.
  // Both blur results and the final Float32 rounding match the v6 pipeline.
  blur(field, core, scratch, rasterWidth, rasterHeight, 90 * maskScale, bounds);
  blur(field, field, scratch, rasterWidth, rasterHeight, 4 * maskScale, bounds);
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
  return { mapCanvas, maskScale, mapWidth, mapHeight, start };
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
  let asyncActive=false;
  let queued:{job:AsyncJob;reject:(reason:unknown)=>void}|undefined;

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
      const { mapCanvas, maskScale, mapWidth, mapHeight, start } = rasterize(input);
      const href = mapCanvas.toDataURL('image/png'); metrics.encodes++;
      const result: CachedMap = { href, maskScale, mapCssWidth: mapWidth / maskScale, mapCssHeight: mapHeight / maskScale };
      remember(key, result);
      previousKey = key;
      previousResult = { ...result, version, computeMs: performance.now() - start };
      return previousResult;
    },
    /** Exact same raster and shared LRU as render(), with asynchronous native
     * PNG encoding. At most one request executes per owner; a queued request
     * can be superseded before doing pixel work. The consumer commits the whole
     * matching path/map frame together after this promise resolves. */
    renderAsync(input:BackdropOpticsInput):Promise<BackdropOpticsResult>{
      const {path,width,height,camera,version}=input,light=input.light??SCENE_LIGHT;
      if(!(width>0&&height>0&&camera.zoom>0)||![width,height,camera.x,camera.y,camera.zoom,light.x,light.y,light.z].every(Number.isFinite))return Promise.reject(new Error('Backdrop optics requires finite viewport dimensions and a positive camera zoom.'));
      if(destroyed)return Promise.reject(aborted());
      const channels=input.channels??'rgb';
      const key=JSON.stringify([path,width,height,camera.x,camera.y,camera.zoom,...(channels==='rgb'?[light.x,light.y,light.z]:[]),channels]);
      metrics.asyncRequests++;
      if(queued){queued.job.cancelled=true;queued.reject(aborted());queued=undefined;metrics.asyncDropped++;drainAsyncQueue();}
      if(previousKey===key&&previousResult){metrics.asyncCacheHits++;return Promise.resolve({...previousResult,version,computeMs:0});}
      const hit=cache.get(key);
      if(hit){
        metrics.asyncCacheHits++;cache.delete(key);cache.set(key,hit);previousKey=key;
        previousResult={...hit.result,version,computeMs:0};return Promise.resolve(previousResult);
      }
      const snapshot={...input,camera:{...camera},light:{...light}};
      return new Promise((resolve,reject)=>{
        const job:AsyncJob={cancelled:false,ready:()=>!asyncActive,run:async()=>{
          queued=undefined;asyncActive=true;
          try{
            if(destroyed)throw aborted();
            // A different owner may have completed the same map while this
            // request waited for an encoder slot. Reuse it without recomputing.
            const cached=cache.get(key);
            if(cached){
              metrics.asyncCacheHits++;cache.delete(key);cache.set(key,cached);
              previousKey=key;previousResult={...cached.result,version,computeMs:0};resolve(previousResult);return;
            }
            const {mapCanvas,maskScale,mapWidth,mapHeight,start}=rasterize(snapshot);
            const encodeStart=performance.now(),pending=encodeAsync(mapCanvas);
            const computeMs=performance.now()-start;
            metrics.asyncEncodes++;
            const href=await pending;
            metrics.asyncEncodeWallMs+=performance.now()-encodeStart;
            if(destroyed)throw aborted();
            const result:CachedMap={href,maskScale,mapCssWidth:mapWidth/maskScale,mapCssHeight:mapHeight/maskScale};
            remember(key,result);previousKey=key;previousResult={...result,version,computeMs};resolve(previousResult);
          }catch(error){reject(error);}finally{asyncActive=false;}
        }};
        queued={job,reject};asyncQueue.push(job);drainAsyncQueue();
      });
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if(queued){queued.job.cancelled=true;queued.reject(aborted());queued=undefined;metrics.asyncDropped++;drainAsyncQueue();}
      previousKey = previousResult = undefined;
      if (--owners === 0) {
        if (workspace) {
          workspace.maskCanvas.width = workspace.mapCanvas.width = 0;
          workspace.maskCanvas.height = workspace.mapCanvas.height = 0;
        }
        workspace = undefined; columnSums = new Float64Array(0); cache.clear(); cacheBytes = 0;
      }
    },
  };
}
