import { volumeHitContour, type VolumeGeometry } from './volume-hit-geometry';

/** Native foreground placement in the same local coordinates as the path. */
export type BuddingRect = { x: number; y: number; width: number; height: number };
export type BuddingGeometry = {
  path: string; width: number; height: number;
  mother: BuddingRect; chamber: BuddingRect; growth: number;
};
export type BuddingTransform = { offsetX?: number; offsetY?: number; scaleX?: number; scaleY?: number };

type Point = [number, number];
const resting: VolumeGeometry = {
  parentX: 1, parentY: 1, childX: 1.15, childY: 1,
  deformX: 500, deformY: 280, deformDX: 0, deformDY: 0, curvature: 3.2,
};
const padding = 6;
const number = (value: number) => String(Math.round(value * 1e6) / 1e6);
const pair = (point: Point) => `${number(point[0])} ${number(point[1])}`;

/** The same uniform periodic cubic B-spline construction as the C2 lens family.
 * All segments share their first and second derivatives, including the seam.
 * Its convex-hull property keeps the interpolated rim inside the sampled bounds.
 */
function smoothBoundary(points: Point[]): string {
  const count = points.length;
  const at = (index: number) => points[(index + count) % count];
  const blend = (a: Point, b: Point, c: Point, wa: number, wb: number, wc: number, divisor: number): Point => [
    (a[0] * wa + b[0] * wb + c[0] * wc) / divisor,
    (a[1] * wa + b[1] * wb + c[1] * wc) / divisor,
  ];
  const first = blend(at(-1), at(0), at(1), 1, 4, 1, 6);
  return `M ${pair(first)} ${points.map((current, index) => {
    const next = at(index + 1);
    const p1 = blend(current, next, next, 2, 1, 0, 3);
    const p2 = blend(current, next, next, 1, 2, 0, 3);
    const p3 = blend(current, next, at(index + 2), 1, 4, 1, 6);
    return `C ${pair(p1)} ${pair(p2)} ${pair(p3)}`;
  }).join(' ')} Z`;
}

/** The approved volume's mother, soft connection and growing chamber, expressed
 * as one small-control C2 contour. This supplies geometry only: LiquidControl
 * owns backdrop optics, so no simulated environment or colored overlay is added.
 * Rectangle x/y values are their top-left corners; mother position stays fixed.
 */
export function buddingGeometry(growth: number, motherDiameter = 54, transform: BuddingTransform = {}): BuddingGeometry {
  const g = Number.isFinite(growth) ? Math.max(0, Math.min(1, growth)) : 0;
  const diameter = Number.isFinite(motherDiameter) && motherDiameter > 0 ? motherDiameter : 54;
  const scale = diameter / 300;
  const height = 1.4 * diameter + padding * 2;
  const centerY = height / 2;
  const centerX = padding + diameter / 2;
  const restingPoints: Point[] = volumeHitContour(resting, g, 64).points.map(([x, y]) => [
    padding + (x - 80) * scale,
    centerY + (y - 280) * scale,
  ]);
  const width = Math.max(diameter + padding * 2, Math.max(...restingPoints.map(point => point[0])) + padding);
  const finite = (value: number | undefined, fallback: number) => value !== undefined && Number.isFinite(value) ? value : fallback;
  const offsetX = finite(transform.offsetX, 0), offsetY = finite(transform.offsetY, 0);
  const scaleX = finite(transform.scaleX, 1), scaleY = finite(transform.scaleY, 1);
  const points: Point[] = restingPoints.map(([x, y]) => [
    centerX + (x - centerX) * scaleX + offsetX,
    centerY + (y - centerY) * scaleY + offsetY,
  ]);
  const ease = g * g * (3 - 2 * g), size = g ** .85;
  const chamberX = 373 + 317 * ease, radiusX = 255 * resting.childX * size, radiusY = 210 * size;
  return {
    path: smoothBoundary(points), width, height, growth: g,
    mother: { x: padding, y: centerY - diameter / 2, width: diameter, height: diameter },
    chamber: {
      x: padding + (chamberX - radiusX - 80) * scale,
      y: centerY - radiusY * scale,
      width: radiusX * 2 * scale, height: radiusY * 2 * scale,
    },
  };
}
