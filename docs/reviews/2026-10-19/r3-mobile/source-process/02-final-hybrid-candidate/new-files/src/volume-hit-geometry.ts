/** CPU coverage counterpart of volume-renderer.js. This only supplies the
 * browser's pre-contact hit surface; the renderer remains the visual source.
 * Lighting/ambient changes do not rebuild this path. */
export type VolumeGeometry = {
  parentX: number; parentY: number; childX: number; childY: number;
  deformX: number; deformY: number; deformDX: number; deformDY: number; curvature: number;
};

type Point = [number, number];
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

export function volumeCoverage(geometry: VolumeGeometry, growth: number) {
  // Match the renderer's public bounds before evaluating its field.
  const px = 150 * clamp(geometry.parentX, .85, 1.15), py = 150 * clamp(geometry.parentY, .85, 1.15);
  const g = clamp(growth, 0, 1), ease = g * g * (3 - 2 * g), size = g ** .85;
  const cx = 373 + 317 * ease, rx = Math.max(.1, 255 * clamp(geometry.childX, .85, 1.15) * size);
  const ry = Math.max(.1, 210 * clamp(geometry.childY, .85, 1.15) * size), exponent = 2 + (clamp(geometry.curvature, 2, 5.2) - 2) * ease;
  const union = 24 + 136 * Math.sqrt(g);
  const dx = clamp(geometry.deformDX, -32, 32), dy = clamp(geometry.deformDY, -32, 32);
  const deformX = clamp(geometry.deformX, -100, 1100), deformY = clamp(geometry.deformY, -100, 660);
  function chamber(x: number, y: number, halfX: number, halfY: number, n: number) {
    const qx = Math.max(Math.abs(x) / halfX, .00001), qy = Math.max(Math.abs(y) / halfY, .00001);
    // The parent is always an ellipse; avoid general powers in that branch.
    const powerX = n === 2 ? qx * qx : qx ** n, powerY = n === 2 ? qy * qy : qy ** n;
    const sum = powerX + powerY, norm = n === 2 ? Math.sqrt(sum) : sum ** (1 / n), factor = norm / sum;
    const gx = powerX / qx * factor / halfX, gy = powerY / qy * factor / halfY;
    return Math.max((norm - 1) / Math.max(Math.sqrt(gx * gx + gy * gy), .0001), -Math.min(halfX, halfY));
  }
  const distance = (x: number, y: number) => {
    if (dx || dy) {
      const weight = Math.exp(-((x - deformX) ** 2 + (y - deformY) ** 2) / 11025);
      x -= dx * weight; y -= dy * weight;
    }
    const parent = chamber(x - 230, y - 280, px, py, 2);
    if (g < .0001) return parent;
    const child = chamber(x - cx, y - 280, rx, ry, exponent);
    const h = clamp(.5 + .5 * (child - parent) / union, 0, 1);
    return child + (parent - child) * h - union * h * (1 - h);
  };
  // The approved bounded Gaussian deformation is injective. Find the
  // preimage of the horizontal primitive centreline, including tip motion.
  const centreY = (x: number) => {
    let y = 280;
    if (dy) for (let i = 0; i < 6; i++) y = 280 + dy * Math.exp(-((x - deformX) ** 2 + (y - deformY) ** 2) / 11025);
    return y;
  };
  return { distance, centreY };
}

/** 128 cosine-spaced segments put extra samples at the high-curvature tips.
 * Root refinement is below .04 logical px. The returned polygon follows the
 * same coverage field, including the neck, budding and local deformation. */
export function volumeHitContour(geometry: VolumeGeometry, growth: number, segments = 128): { path: string; points: Point[] } {
  const { distance, centreY } = volumeCoverage(geometry, growth);
  let low = -100, high = 230;
  for (let i = 0; i < 16; i++) { const x = (low + high) / 2; if (distance(x, centreY(x)) > 0) low = x; else high = x; }
  const left = (low + high) / 2;
  low = 230; high = 1100;
  for (let i = 0; i < 16; i++) { const x = (low + high) / 2; if (distance(x, centreY(x)) <= 0) low = x; else high = x; }
  const right = (low + high) / 2;
  const upper: Point[] = [], lower: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const x = left + (right - left) * (1 - Math.cos(Math.PI * i / segments)) / 2, cy = centreY(x);
    let outer = -100, inner = cy;
    for (let j = 0; j < 14; j++) { const y = (outer + inner) / 2; if (distance(x, y) > 0) outer = y; else inner = y; }
    upper.push([x, (outer + inner) / 2]);
    outer = 660; inner = cy;
    for (let j = 0; j < 14; j++) { const y = (outer + inner) / 2; if (distance(x, y) > 0) outer = y; else inner = y; }
    lower.push([x, (outer + inner) / 2]);
  }
  const points = [...upper, ...lower.reverse()];
  return { points, path: points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ') + ' Z' };
}
