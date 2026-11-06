export type VolumeBox = [x: number, y: number, halfWidth: number, halfHeight: number];
export type VolumeDeformation = [anchorX: number, anchorY: number, dx: number, dy: number, squash: number];
export type VolumeGeometry = {
  mother: VolumeBox;
  panel: VolumeBox;
  growth: number;
  neck: number;
  curvature: number;
  detached: boolean;
  motherDeformation: VolumeDeformation;
  panelDeformation: VolumeDeformation;
};

export const clamp = (value: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, value));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export function ease(value: number) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

const deformationRadiusSquared = 11025;
const xScale = (squash: number) => 1 + .45 * squash;
const yScale = (squash: number) => 1 - squash;
const influence = (x: number, y: number, [anchorX, anchorY]: VolumeDeformation) =>
  Math.exp(-((x - anchorX) ** 2 + (y - anchorY) ** 2) / deformationRadiusSquared);

function chamber(x: number, y: number, [cx, cy, rx, ry]: VolumeBox, n: number) {
  const a = Math.max(Math.abs(x - cx) / rx, .00001), b = Math.max(Math.abs(y - cy) / ry, .00001);
  const pa = a ** n, pb = b ** n, sum = pa + pb, norm = sum ** (1 / n);
  const gradient = norm / sum * Math.hypot(pa / (a * rx), pb / (b * ry));
  return Math.max((norm - 1) / Math.max(gradient, .0001), -Math.min(rx, ry));
}

type Distance = (x: number, y: number) => number;

function warpedField(origin: VolumeBox, motion: VolumeDeformation, sample: Distance): Distance {
  const [ox, oy] = origin, [, , dx, dy, squash] = motion;
  if (!(dx || dy || squash)) return sample;
  const sx = xScale(squash), sy = yScale(squash);
  return (x: number, y: number) => {
    const weight = dx || dy ? influence(x, y, motion) : 0;
    return sample(ox + (x - ox) / sx - dx * weight, oy + (y - oy) / sy - dy * weight);
  };
}

function smoothMin(a: number, b: number, neck: number) {
  if (neck < .001) return Math.min(a, b);
  const h = clamp(.5 + .5 * (b - a) / neck, 0, 1);
  return mix(b, a, h) - neck * h * (1 - h);
}

function detachedField(geometry: VolumeGeometry, side: 'mother' | 'panel', exponent: number): Distance {
  const { mother, panel, neck } = geometry;
  const box = geometry[side], motion = side === 'mother' ? geometry.motherDeformation : geometry.panelDeformation;
  if (neck < .001) return warpedField(box, motion, (x, y) => chamber(x, y, box, side === 'mother' ? 2 : exponent));
  // Keep each facing rim's share of the remaining blend until the neck reaches
  // zero. Both distance samples use this lobe's motion, including the fixed cut.
  return warpedField(box, motion, (x, y) => {
    const a = chamber(x, y, mother, 2), b = chamber(x, y, panel, exponent);
    return Math.max(smoothMin(a, b, neck), (side === 'mother' ? a - b : b - a) * .5);
  });
}

// CPU counterpart of the shader's coverage for pointer hits and SVG fallback.
export function coverage(geometry: VolumeGeometry): Distance {
  const { mother, panel, growth, curvature, neck, detached, motherDeformation } = geometry;
  if (growth < .0001) return warpedField(mother, motherDeformation, (x, y) => chamber(x, y, mother, 2));
  const exponent = mix(2, curvature, ease(growth));
  if (detached) {
    const a = detachedField(geometry, 'mother', exponent), b = detachedField(geometry, 'panel', exponent);
    return (x, y) => Math.min(a(x, y), b(x, y));
  }
  return warpedField(mother, motherDeformation, (x, y) =>
    smoothMin(chamber(x, y, mother, 2), chamber(x, y, panel, exponent), neck));
}

export function isDetached(geometry: VolumeGeometry, vertical: boolean) {
  const { mother, panel, growth, curvature, neck } = geometry;
  if (growth < .0001) return false;
  const axis = vertical ? 1 : 0, cross = 1 - axis;
  const first = mother[axis] <= panel[axis] ? mother : panel;
  const second = first === mother ? panel : mother;
  const start = first[axis] + first[axis + 2], end = second[axis] - second[axis + 2];
  if (end <= start) return false;
  if (neck < .001) return true;
  const exponent = mix(2, curvature, ease(growth));
  function gapDistance(along: number) {
    const ratio = (along - first[axis]) / (second[axis] - first[axis]);
    const across = mix(first[cross], second[cross], ratio);
    const x = vertical ? across : along, y = vertical ? along : across;
    return smoothMin(chamber(x, y, mother, 2), chamber(x, y, panel, exponent), neck);
  }
  // Find the saddle on the unwarped common axis so a gesture cannot toggle
  // ownership between the joined field and the two independent lobes.
  let lo = start, hi = end;
  for (let step = 0; step < 16; step++) {
    const left = mix(lo, hi, 1 / 3), right = mix(lo, hi, 2 / 3);
    if (gapDistance(left) < gapDistance(right)) lo = left;
    else hi = right;
  }
  return gapDistance((lo + hi) / 2) > 0;
}

function boundary(inner: number, outer: number, evaluate: (point: number) => number) {
  for (let i = 0; i < 15; i++) {
    const point = (inner + outer) / 2;
    if (evaluate(point) <= 0) inner = point; else outer = point;
  }
  return (inner + outer) / 2;
}

function transformedCenter(box: VolumeBox, origin: VolumeBox, motion: VolumeDeformation): [number, number] {
  const [, , dx, dy, squash] = motion, [ox, oy] = origin;
  const sx = xScale(squash), sy = yScale(squash);
  const cx = ox + (box[0] - ox) * sx, cy = oy + (box[1] - oy) * sy;
  let x = cx, y = cy;
  if (dx || dy) {
    for (let i = 0; i < 12; i++) {
      const weight = influence(x, y, motion);
      x = cx + sx * dx * weight;
      y = cy + sy * dy * weight;
    }
  }
  return [x, y];
}

type Point = (x: number, y: number) => string;

function bodyPath(box: VolumeBox, motion: VolumeDeformation, point: Point, distance: Distance, reachPadding = 0) {
  const [, , dx, dy, squash] = motion;
  const [cx, cy] = transformedCenter(box, box, motion);
  const reach = Math.hypot(xScale(squash) * (box[2] + Math.abs(dx) + reachPadding),
    yScale(squash) * (box[3] + Math.abs(dy) + reachPadding)) + 1;
  const points: string[] = [];
  for (let i = 0; i < 128; i++) {
    const angle = i * (Math.PI * 2 / 128);
    const ux = Math.cos(angle), uy = Math.sin(angle);
    const radius = boundary(0, reach, value => distance(cx + ux * value, cy + uy * value));
    points.push(point(cx + ux * radius, cy + uy * radius));
  }
  return `M ${points.join(' L ')} Z`;
}

function joinedPaths(geometry: VolumeGeometry, vertical: boolean, point: Point) {
  const { mother, panel, neck, motherDeformation: motion } = geometry;
  const axis = vertical ? 1 : 0, cross = 1 - axis;
  const along = axis + 2, across = cross + 2;
  const [, , dx, dy, squash] = motion;
  const sx = xScale(squash), sy = yScale(squash);
  const stretch = vertical ? sy : sx, crossStretch = vertical ? sx : sy;
  const alongPull = Math.abs(vertical ? dy : dx) * stretch;
  const crossPull = (vertical ? dx : dy) * crossStretch;
  const distance = coverage(geometry);
  const sample = (a: number, b: number) => vertical ? distance(b, a) : distance(a, b);
  const shared = mother[cross];
  const shift = panel[axis] - mother[axis];
  function center(a: number) {
    const u = shift ? clamp((a - mother[axis]) / (shift * stretch), 0, 1) : 0;
    const origin = shared + (panel[cross] - shared) * u * crossStretch;
    let b = origin;
    if (crossPull) {
      for (let i = 0; i < 6; i++) {
        const x = vertical ? b : a, y = vertical ? a : b;
        b = origin + crossPull * influence(x, y, motion);
      }
    }
    return b;
  }
  const start = Math.min(mother[axis] - mother[along], panel[axis] - panel[along]);
  const end = Math.max(mother[axis] + mother[along], panel[axis] + panel[along]);
  const lo = mother[axis] + (start - mother[axis]) * stretch - alongPull - neck / 4 - 2;
  const hi = mother[axis] + (end - mother[axis]) * stretch + alongPull + neck / 4 + 2;
  const reach = (Math.max(mother[across], panel[across]) + Math.abs(panel[cross] - shared)) * crossStretch
    + Math.abs(crossPull) + neck / 4 + 3;
  const onCenter = (a: number) => sample(a, center(a));
  const spans: [number, number][] = [];
  let left: number | undefined;
  let previous = lo;
  for (let i = 1; i <= 192; i++) {
    const a = mix(lo, hi, i / 192);
    if (onCenter(a) <= 0) {
      if (left === undefined) left = boundary(a, previous, onCenter);
    } else if (left !== undefined) {
      spans.push([left, boundary(previous, a, onCenter)]);
      left = undefined;
    }
    previous = a;
  }
  return spans.map(([first, last]) => {
    const top: string[] = [], bottom: string[] = [];
    const project: Point = vertical ? (a, b) => point(b, a) : point;
    for (let i = 0; i <= 64; i++) {
      const a = mix(first, last, (1 - Math.cos(Math.PI * i / 64)) / 2);
      const c = center(a), row = (b: number) => sample(a, b);
      top.push(project(a, boundary(c, c - reach, row)));
      bottom.push(project(a, boundary(c, c + reach, row)));
    }
    return `M ${[...top, ...bottom.reverse()].join(' L ')} Z`;
  });
}

export function hitContours(geometry: VolumeGeometry, vertical: boolean, scale: number, offsetX: number, offsetY: number) {
  const { mother, panel, growth, curvature, neck, detached, motherDeformation, panelDeformation } = geometry;
  const point: Point = (x, y) => `${(x * scale + offsetX).toFixed(2)} ${(y * scale + offsetY).toFixed(2)}`;
  const exponent = mix(2, curvature, ease(growth));
  if (detached && growth >= .0001) {
    // Separate sampling keeps the inactive path identical while its sibling moves.
    const motherPath = bodyPath(mother, motherDeformation, point, detachedField(geometry, 'mother', exponent), neck / 4);
    const panelPath = bodyPath(panel, panelDeformation, point, detachedField(geometry, 'panel', exponent), neck / 4);
    return { path: `${motherPath} ${panelPath}`, parts: 2, motherPath, panelPath };
  }
  const motherDistance = warpedField(mother, motherDeformation, (x, y) => chamber(x, y, mother, 2));
  const motherPath = bodyPath(mother, motherDeformation, point, motherDistance);
  if (growth < .0001) return { path: motherPath, parts: 1, motherPath, panelPath: '' };
  const paths = joinedPaths(geometry, vertical, point);
  return { path: paths.join(' '), parts: paths.length, motherPath, panelPath: '' };
}
