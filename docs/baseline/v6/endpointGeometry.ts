import { contourShape } from '../../src/spatial/geometry.ts';

/** Local end-cap matching for the existing symmetric C2 contourShape lens.
 * width/height are the visible shell dimensions, not its host dimensions.
 * Cap centres belong to the rail: left = trackStart + railRadius,
 * right = trackEnd - railRadius. Add the corresponding returned offset to
 * obtain the visible lens centre. This is local curvature matching, not a
 * constant gap around the whole contour.
 */
export function endpointGeometry(width: number, height: number, railRadius: number, fullness = 2.4) {
  if (![width, height, railRadius, fullness].every(Number.isFinite) ||
      width <= 0 || height <= 0 || railRadius < 0) {
    throw new RangeError('Endpoint geometry requires finite positive shell dimensions and a non-negative rail radius.');
  }

  // contourShape's r = .2 * min(width,height) saturates the contour's
  // roundness blend, so its clamped fullness is the sampling exponent.
  const shape = contourShape(width, height, fullness);
  const exponent = shape.fullness!;
  const diagonalSquared = 2 ** (-2 / exponent);
  const squareness = (2 * diagonalSquared - 1) / diagonalSquared ** 2;
  // The neighbour of a cardinal knot in geometry.ts's 32-point periodic
  // cubic B-spline. Work from unrounded control geometry, never SVG text.
  const angle = 2 * Math.PI / 32;
  const distance = Math.sqrt(2 / (1 + Math.sqrt(Math.max(0,
    1 - squareness * Math.sin(2 * angle) ** 2))));
  const x = Math.cos(angle) * distance, y = Math.sin(angle) * distance;
  const extent = (x + 2) / 3;
  const halfWidth = width / 2, halfHeight = height / 2;
  // At the right pole: B' = (0, dy), B'' = (ddx, 0).
  // R = |B'|^3 / |B' x B''|; reflection gives the same left radius.
  const dy = halfHeight * y / extent;
  const ddx = 2 * halfWidth * (x - 1) / extent;
  const radius = dy * dy / -ddx;
  if (!Number.isFinite(radius) || radius <= railRadius) {
    throw new RangeError('The rail cap must be smaller than the lens end curvature radius.');
  }
  return {
    radius,
    gap: radius - railRadius,
    leftCenterFromCap: halfWidth - radius,
    rightCenterFromCap: radius - halfWidth,
  };
}

// During deformation, call with the current displayed width/height. Place the
// host at desiredLensCentre - currentLocalShapeCentre (including local x/y
// shifts), then add any explicit elastic drag offset. Releasing that offset
// restores the same cap anchor without changing the range/switch value.
