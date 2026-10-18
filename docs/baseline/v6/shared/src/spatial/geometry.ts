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
interface BoundaryPoint extends Point { nx: number; ny: number }
interface Segment { p0: Point; p1: Point; p2: Point; p3: Point; endAngle: number }
interface Contour { shape: Shape; circle: boolean; segments: Segment[] }

export const clamp = (value: number, min = 0, max = 1): number =>
  Math.min(max, Math.max(min, value))

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

export const DEFAULT_CONTOUR_FULLNESS = 3.2
export const MIN_CONTOUR_FULLNESS = 2.4
export const MAX_CONTOUR_FULLNESS = 3.8
const fullnessOf = (shape: Shape): number => clamp(shape.fullness ?? DEFAULT_CONTOUR_FULLNESS, MIN_CONTOUR_FULLNESS, MAX_CONTOUR_FULLNESS)

export function lerpShape(a: Shape, b: Shape, progress: number): Shape {
  const t = clamp(progress)
  if (t === 0) return { ...a }
  if (t === 1) return { ...b }
  return {
    x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t),
    w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t), r: lerp(a.r, b.r, t),
    ...(a.fullness !== undefined || b.fullness !== undefined ? { fullness: lerp(fullnessOf(a), fullnessOf(b), t) } : {}),
  }
}

const smooth = (t: number): number => t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2

/** A round bud inflates first; travel and the final panel aspect follow it. */
export function buddingShape(from: Shape, to: Shape, progress: number, fresh = false): Shape {
  const t = clamp(progress), small = Math.min(from.w, from.h), large = Math.min(to.w, to.h)
  if (t === 0) return { ...from }
  if (t === 1) return { ...to }
  // Reversed transitions continue the current outline, including its aspect.
  if (Math.abs(from.w - from.h) > 1e-5 || Math.abs(from.r - small / 2) > 1e-5) return lerpShape(from, to, smooth(t))
  const travelDelay = fresh ? 0.10 : 0, inflationDelay = fresh ? 0.02 : 0, unfoldDelay = fresh ? 0.30 : 0.18
  // After the edge phase the centre clears neighbouring slots before the
  // chamber reaches full volume. It settles slightly before the final unfold.
  const travel = smooth(clamp((t - travelDelay) / (fresh ? 0.78 : 1)))
  const inflation = smooth(clamp((t - inflationDelay) / (1 - inflationDelay)))
  const unfold = smooth(clamp((t - unfoldDelay) / (1 - unfoldDelay)))
  const diameter = lerp(small, large, inflation)
  return {
    x: lerp(from.x, to.x, travel), y: lerp(from.y, to.y, travel),
    w: diameter + (to.w - large) * unfold, h: diameter + (to.h - large) * unfold,
    r: Math.min(diameter / 2, lerp(diameter / 2, to.r, unfold)),
    ...(from.fullness !== undefined || to.fullness !== undefined ? { fullness: lerp(fullnessOf(from), fullnessOf(to), unfold) } : {}),
  }
}

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

/** CSS clip-path for a DOM box whose transform scales baseW/baseH to this Shape. */
export function contentClipPath(shape: Shape, baseW: number, baseH: number): string {
  if (!valid(shape) || !Number.isFinite(baseW) || !Number.isFinite(baseH) || baseW <= 0 || baseH <= 0) return 'none'
  return `path("${renderContour(contour(shape), shape.w / baseW, shape.h / baseH, shape.x - shape.w / 2, shape.y - shape.h / 2)}")`
}

function evaluate(segment: Segment, t: number): Point {
  const u = 1 - t, { p0, p1, p2, p3 } = segment
  return {
    x: u ** 3 * p0.x + 3 * u ** 2 * t * p1.x + 3 * u * t ** 2 * p2.x + t ** 3 * p3.x,
    y: u ** 3 * p0.y + 3 * u ** 2 * t * p1.y + 3 * u * t ** 2 * p2.y + t ** 3 * p3.y,
  }
}

/** Ray / actual Bézier contour intersection, with its exact local tangent. */
function boundary(outline: Contour, angle: number): BoundaryPoint {
  const { shape, circle, segments } = outline
  const vx = Math.cos(angle), vy = Math.sin(angle)
  if (circle) return { x: shape.x + vx * shape.w / 2, y: shape.y + vy * shape.h / 2, nx: vx, ny: vy }
  const target = polar(vx, vy)
  const segment = segments.find(s => s.endAngle >= target - 1e-10) || segments[segments.length - 1]
  let low = 0, high = 1
  for (let iteration = 0; iteration < 25; iteration++) {
    const t = (low + high) / 2, p = evaluate(segment, t)
    if (vx * (p.y - shape.y) - vy * (p.x - shape.x) < 0) low = t
    else high = t
  }
  const t = (low + high) / 2, u = 1 - t, { p0, p1, p2, p3 } = segment
  const tx = 3 * (u ** 2 * (p1.x - p0.x) + 2 * u * t * (p2.x - p1.x) + t ** 2 * (p3.x - p2.x))
  const ty = 3 * (u ** 2 * (p1.y - p0.y) + 2 * u * t * (p2.y - p1.y) + t ** 2 * (p3.y - p2.y))
  const length = Math.hypot(tx, ty) || 1
  return { ...evaluate(segment, t), nx: ty / length, ny: -tx / length }
}

function contains(outline: Contour, point: Point): boolean {
  const dx = point.x - outline.shape.x, dy = point.y - outline.shape.y
  const distance = Math.hypot(dx, dy)
  if (distance < 1e-7) return true
  const edge = boundary(outline, Math.atan2(dy, dx))
  return distance <= Math.hypot(edge.x - outline.shape.x, edge.y - outline.shape.y) + 1e-7
}

/** Uses the visible contour, never its decorative glow or nominal bounding box. */
export function shapeContainsPoint(shape: Shape, point: Point): boolean {
  return valid(shape) && contains(contour(shape), point)
}

/**
 * Insets of a clear rectangular DOM reading area. All four corners sit inside
 * the actual displayed contour, including during fullness/aspect transitions.
 * A rounder lens needs more inset; fuller corners release that space again.
 */
export function safeContentInsets(shape: Shape, clearance = 6): { top: number; right: number; bottom: number; left: number } {
  if (!valid(shape)) return { top: 0, right: 0, bottom: 0, left: 0 }
  const hw = shape.w / 2, hh = shape.h / 2
  const edge = boundary(contour(shape), Math.atan2(hh, hw))
  const factor = clamp(Math.min((edge.x - shape.x) / hw, (edge.y - shape.y) / hh))
  const insetX = Math.min(hw, hw * (1 - factor) + Math.max(0, clearance))
  const insetY = Math.min(hh, hh * (1 - factor) + Math.max(0, clearance))
  return { top: insetY, right: insetX, bottom: insetY, left: insetX }
}

/** The initial bubble straddles the actual parent edge instead of its centre. */
export function edgeBudShape(parent: Shape, target: Shape, size = 18): Shape {
  const angle = Math.atan2(target.y - parent.y, target.x - parent.x)
  const edge = boundary(contour(parent), angle), inset = size * 0.28
  return { x: edge.x - Math.cos(angle) * inset, y: edge.y - Math.sin(angle) * inset, w: size, h: size, r: size / 2,
    ...(target.fullness !== undefined ? { fullness: fullnessOf(target) } : {}) }
}

function attachment(outline: Contour, other: Contour, axis: number, side: number, spread: number): BoundaryPoint | null {
  let point = boundary(outline, axis + side * spread)
  if (!contains(other, point)) return point

  // During budding, shells overlap. Move the attachment outside that overlap so
  // the neck joins the exposed contours instead of folding inside either shell.
  let low = spread
  for (let step = 1; step <= 24; step++) {
    const high = lerp(spread, Math.PI, step / 24)
    point = boundary(outline, axis + side * high)
    if (!contains(other, point)) {
      let end = high
      for (let iteration = 0; iteration < 12; iteration++) {
        const mid = (low + end) / 2
        if (contains(other, boundary(outline, axis + side * mid))) low = mid
        else end = mid
      }
      // Fade in the extra clearance as overlap increases. Applying it in one
      // step would make the anchor jump when the shells first touch this ray.
      const clearance = spread * 0.45 * clamp((end - spread) / Math.max(spread, 0.001))
      let cleared = Math.min(Math.PI, end + clearance)
      // A nearly contained, differently proportioned shell can expose only a
      // narrow arc. Do not advance through that arc and back inside the other
      // shell; otherwise the membrane folds behind both facing edges.
      if (contains(other, boundary(outline, axis + side * cleared))) {
        let outside = end, inside = cleared
        for (let iteration = 0; iteration < 12; iteration++) {
          const mid = (outside + inside) / 2
          if (contains(other, boundary(outline, axis + side * mid))) inside = mid
          else outside = mid
        }
        cleared = outside
      }
      return boundary(outline, axis + side * cleared)
    }
    low = high
  }
  return null // One shell contains the other: their union needs no bridge.
}

const cross = (a: Point, b: Point): number => a.x * b.y - a.y * b.x
/** Exact integral of x dy - y dx for one cubic; its half is signed area. */
function cubicWinding(p0: Point, p1: Point, p2: Point, p3: Point): number {
  const a = { x: -p0.x + 3 * p1.x - 3 * p2.x + p3.x, y: -p0.y + 3 * p1.y - 3 * p2.y + p3.y }
  const b = { x: 3 * p0.x - 6 * p1.x + 3 * p2.x, y: 3 * p0.y - 6 * p1.y + 3 * p2.y }
  const c = { x: -3 * p0.x + 3 * p1.x, y: -3 * p0.y + 3 * p1.y }
  return cross(p0, c) + cross(p0, b) + cross(p0, a) + cross(c, b) / 3 + cross(c, a) / 2 + cross(b, a) / 5
}

/** Shared anchors and cubic sides for the filled membrane and its rim. */
function neckParts(parent: Shape, child: Shape, progress: number): { upper: string; lowerStart: string; lowerCurve: string } | null {
  if (!valid(parent) || !valid(child) || !Number.isFinite(progress) || progress <= 0) return null
  const dx = child.x - parent.x, dy = child.y - parent.y
  const distance = Math.hypot(dx, dy)
  if (distance < 1e-5) return null
  const axis = Math.atan2(dy, dx)
  const width = Math.min(76, parent.w * 0.38, parent.h * 0.38, child.w * 0.38, child.h * 0.38) * clamp(progress)
  const parentContour = contour(parent), childContour = contour(child)
  const parentFace = boundary(parentContour, axis)
  const childFace = boundary(childContour, axis + Math.PI)
  const parentSpread = Math.atan2(width, Math.hypot(parentFace.x - parent.x, parentFace.y - parent.y))
  const childSpread = Math.atan2(width, Math.hypot(childFace.x - child.x, childFace.y - child.y))
  const pTop = attachment(parentContour, childContour, axis, -1, parentSpread)
  const pBottom = attachment(parentContour, childContour, axis, 1, parentSpread)
  const cTop = attachment(childContour, parentContour, axis + Math.PI, 1, childSpread)
  const cBottom = attachment(childContour, parentContour, axis + Math.PI, -1, childSpread)
  if (!pTop || !pBottom || !cTop || !cBottom) return null

  // Deeply overlapping lenses of different aspect ratios can expose opposite
  // sides of each other. Their shells already form one union; a backwards
  // membrane would run through that union with reversed winding and subtract
  // a hole from a combined nonzero SVG path. Wait until both sides face forward.
  const vx = dx / distance, vy = dy / distance
  if ((cTop.x - pTop.x) * vx + (cTop.y - pTop.y) * vy < 0 ||
      (cBottom.x - pBottom.x) * vx + (cBottom.y - pBottom.y) * vy < 0) return null

  const upperGap = Math.hypot(cTop.x - pTop.x, cTop.y - pTop.y)
  const lowerGap = Math.hypot(cBottom.x - pBottom.x, cBottom.y - pBottom.y)
  const handle = Math.min(Math.min(upperGap, lowerGap) * 0.48, width * 0.58)
  const forward = (point: BoundaryPoint): Point => ({ x: point.x - point.ny * handle, y: point.y + point.nx * handle })
  const backward = (point: BoundaryPoint): Point => ({ x: point.x + point.ny * handle, y: point.y - point.nx * handle })
  const upperControl1 = forward(pTop), upperControl2 = backward(cTop)
  const lowerControl1 = forward(cBottom), lowerControl2 = backward(pBottom)
  const local = (point: Point): Point => ({ x: point.x - parent.x, y: point.y - parent.y })
  // Shells run clockwise in SVG coordinates. A nonzero combined path must
  // never receive an oppositely wound membrane, including degenerate overlap
  // configurations produced by a user dragging unrelated aspect ratios.
  const winding = cubicWinding(...[pTop, upperControl1, upperControl2, cTop].map(local) as [Point, Point, Point, Point]) +
    cross(local(cTop), local(cBottom)) +
    cubicWinding(...[cBottom, lowerControl1, lowerControl2, pBottom].map(local) as [Point, Point, Point, Point]) +
    cross(local(pBottom), local(pTop))
  if (winding <= 1e-7) return null
  return {
    upper: `M ${xy(pTop)} C ${xy(upperControl1)} ${xy(upperControl2)} ${xy(cTop)}`,
    lowerStart: xy(cBottom),
    lowerCurve: `C ${xy(lowerControl1)} ${xy(lowerControl2)} ${xy(pBottom)}`,
  }
}

/**
 * Smooth, narrow-waisted connector between the actual interpolated shells.
 * Draw behind both shells, with the same fill and pointer-events="none".
 * progress controls neck width; callers must also animate the supplied Shapes
 * with the same frame as their DOM content. No filter or DOM measurement is used.
 */
export function neckPath(parent: Shape, child: Shape, progress = 1): string {
  const parts = neckParts(parent, child, progress)
  return parts ? `${parts.upper} L ${parts.lowerStart} ${parts.lowerCurve} Z` : ''
}

/** Two open cubic sides only; stroke with fill="none" and pointer-events="none". */
export function neckRimPath(parent: Shape, child: Shape, progress = 1): string {
  const parts = neckParts(parent, child, progress)
  return parts ? `${parts.upper} M ${parts.lowerStart} ${parts.lowerCurve}` : ''
}

