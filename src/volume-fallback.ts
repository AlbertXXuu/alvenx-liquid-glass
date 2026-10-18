// Static fallback outline samples the same symmetric, fully grown resting
// sceneDistance as the volume shader. This is a pearl illustration, not WebGL
// optics or an alternative simulation; native foreground content stays usable.
const distance = (x: number, y: number, cx: number, rx: number, ry: number, exponent: number) => {
  const qx = Math.max(Math.abs(x - cx) / rx, .00001), qy = Math.max(Math.abs(y - 280) / ry, .00001);
  const sum = qx ** exponent + qy ** exponent, norm = sum ** (1 / exponent);
  const factor = sum ** (1 / exponent - 1);
  const gradient = Math.hypot(qx ** (exponent - 1) * factor / rx, qy ** (exponent - 1) * factor / ry);
  return Math.max((norm - 1) / Math.max(gradient, .0001), -Math.min(rx, ry));
};
function sceneDistance(x: number, y: number) {
  const a = distance(x, y, 230, 150, 150, 2), b = distance(x, y, 690, 255, 210, 3.2);
  const h = Math.min(1, Math.max(0, .5 + .5 * (b - a) / 160));
  return b + (a - b) * h - 160 * h * (1 - h);
}
let cached = '';
export function volumeFallbackPath() {
  if (cached) return cached;
  const upper: Array<[number, number]> = [];
  // The resting scene has one symmetric vertical interval at every covered x.
  // A 1px sample with binary refinement preserves its union/neck contour.
  for (let x = 0; x <= 1000; x++) {
    if (sceneDistance(x, 280) > 0) continue;
    let low = 0, high = 280;
    for (let i = 0; i < 16; i++) { const mid = (low + high) / 2; if (sceneDistance(x, mid) > 0) low = mid; else high = mid; }
    upper.push([x, (low + high) / 2]);
  }
  const points = [...upper, ...upper.slice().reverse().map(([x, y]): [number, number] => [x, 560 - y])];
  cached = points.map(([x, y], index) => `${index ? 'L' : 'M'}${x} ${y.toFixed(3)}`).join(' ') + ' Z';
  return cached;
}
