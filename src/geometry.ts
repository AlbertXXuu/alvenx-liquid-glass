/** All geometry is expressed in world coordinates; x / y are the centre. */
export interface Shape {
  x: number
  y: number
  w: number
  h: number
  r: number
  /** Fullness of the four-sided lens; round buds still stay exact circles. */
  fullness?: number
}

interface Point { x: number; y: number }
interface Segment { p0: Point; p1: Point; p2: Point; p3: Point; endAngle: number }
interface Contour { shape: Shape; circle: boolean; segments: Segment[] }

export const clamp = (value: number, min = 0, max = 1): number =>
  Math.min(max, Math.max(min, value))

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

export const DEFAULT_CONTOUR_FULLNESS = 3.2
export const MIN_CONTOUR_FULLNESS = 2.4
export const MAX_CONTOUR_FULLNESS = 3.8
const fullnessOf = (shape: Shape): number => clamp(shape.fullness ?? DEFAULT_CONTOUR_FULLNESS, MIN_CONTOUR_FULLNESS, MAX_CONTOUR_FULLNESS)

function valid(shape: Shape): boolean {
  return [shape.x, shape.y, shape.w, shape.h, shape.r].every(Number.isFinite) &&
    (shape.fullness === undefined || Number.isFinite(shape.fullness)) && shape.w > 0 && shape.h > 0
}

function radius(shape: Shape): number {
  return clamp(shape.r, 0, Math.min(shape.w, shape.h) / 2)
}

// Keep sub-pixel precision without producing enormous per-frame SVG strings.
const n = (value: number): string => String(Math.round(value * 1000) / 1000)
const xy = (point: Point): string => `${n(point.x)} ${n(point.y)}`

const TAU = Math.PI * 2
const polar = (x: number, y: number): number => {
  const angle = Math.atan2(y, x)
  return angle < -Math.PI / 2 - 1e-10 ? angle + TAU : angle
}

// Uniform periodic cubic B-splines preserve convexity and share first AND
// second derivatives at every knot. This removes the straight-side/corner
// curvature changes of a rounded rectangle. Sampling a smooth squircle rather
// than |cos|^(2/n) also avoids singular derivatives on the four cardinal axes.
const LENS_STEPS = 32
const lensDirections = Array.from({ length: LENS_STEPS }, (_, index) => {
  const angle = -Math.PI / 2 + index * TAU / LENS_STEPS
  return { x: Math.cos(angle), y: Math.sin(angle), cross: Math.sin(angle * 2) ** 2 }
})

/** A centred four-sided plate using the same contour family as content shells. */
export function contourShape(width: number, height: number, fullness = DEFAULT_CONTOUR_FULLNESS): Shape {
  return { x: 0, y: 0, w: width, h: height, r: Math.min(width, height) * 0.2,
    fullness: clamp(fullness, MIN_CONTOUR_FULLNESS, MAX_CONTOUR_FULLNESS) }
}

/** A single contour supplies rendering, clipping, hit tests and neck tangents. */
function contour(shape: Shape): Contour {
  const { x, y, w, h } = shape
  const hw = w / 2, hh = h / 2, r = radius(shape)
  const circle = Math.abs(w - h) < 1e-7 && Math.abs(r - hw) < 1e-7
  if (circle) return { shape, circle, segments: [] }

  // Fullness is calibrated to a Lamé superellipse's diagonal extent. The
  // analytic squircle keeps a small positive curvature along all four sides;
  // unlike the Lamé equation it has no zero-curvature seam at each side centre.
  // Roundness unfolds continuously with the existing radius animation.
  const amount = clamp((Math.min(hw, hh) - r) / (Math.min(w, h) * 0.25))
  const exponent = lerp(2, fullnessOf(shape), amount), diagonalSquared = 2 ** (-2 / exponent)
  const squareness = (2 * diagonalSquared - 1) / diagonalSquared ** 2
  const raw = lensDirections.map(direction => {
    const distance = Math.sqrt(2 / (1 + Math.sqrt(Math.max(0, 1 - squareness * direction.cross))))
    return { x: direction.x * distance, y: direction.y * distance }
  })
  const rawAt = (index: number) => raw[(index + LENS_STEPS) % LENS_STEPS]
  // Cardinal extrema are B-spline knots. Scale once so the exact original
  // bounding box survives every fullness and aspect-ratio transition.
  const extentX = (rawAt(7).x + 4 * rawAt(8).x + rawAt(9).x) / 6
  const extentY = -(rawAt(31).y + 4 * rawAt(0).y + rawAt(1).y) / 6
  const point = (a: Point, b: Point, c: Point, wa: number, wb: number, wc: number, divisor: number): Point => ({
    x: x + (a.x * wa + b.x * wb + c.x * wc) / divisor * hw / extentX,
    y: y + (a.y * wa + b.y * wb + c.y * wc) / divisor * hh / extentY,
  })
  const segments = raw.map((current, index): Segment => {
    const previous = rawAt(index - 1), next = rawAt(index + 1), following = rawAt(index + 2)
    const p0 = point(previous, current, next, 1, 4, 1, 6)
    const p1 = point(current, next, next, 2, 1, 0, 3)
    const p2 = point(current, next, next, 1, 2, 0, 3)
    const p3 = point(current, next, following, 1, 4, 1, 6)
    return { p0, p1, p2, p3,
      endAngle: index === LENS_STEPS - 1 ? Math.PI * 1.5 : polar(p3.x - x, p3.y - y) }
  })
  return { shape, circle, segments }
}

function renderContour(outline: Contour, sx = 1, sy = 1, ox = 0, oy = 0): string {
  const point = (p: Point) => xy({ x: (p.x - ox) / sx, y: (p.y - oy) / sy })
  const { shape } = outline
  if (outline.circle) {
    const top = point({ x: shape.x, y: shape.y - shape.h / 2 })
    const right = point({ x: shape.x + shape.w / 2, y: shape.y })
    const bottom = point({ x: shape.x, y: shape.y + shape.h / 2 })
    const left = point({ x: shape.x - shape.w / 2, y: shape.y })
    const radii = `${n(shape.w / 2 / sx)} ${n(shape.h / 2 / sy)}`
    // Quarter arcs avoid Chromium's diameter-arc bounds inflation while keeping
    // mathematically exact circles (and exact ellipses in local DOM clip space).
    return `M ${top} A ${radii} 0 0 1 ${right} A ${radii} 0 0 1 ${bottom} A ${radii} 0 0 1 ${left} A ${radii} 0 0 1 ${top} Z`
  }
  return `M ${point(outline.segments[0].p0)} ${outline.segments.map(s => `C ${point(s.p1)} ${point(s.p2)} ${point(s.p3)}`).join(' ')} Z`
}

/** Circular nodes stay exact circles; panels use one C2-continuous convex lens. */
export function shellPath(shape: Shape): string {
  return valid(shape) ? renderContour(contour(shape)) : ''
}
