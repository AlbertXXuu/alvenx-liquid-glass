import { clamp } from '../src/geometry';

export type TextLensPose = {
  x: number;
  y: number;
  width: number;
  height: number;
  strength: number;
};

type PoseAxis = keyof TextLensPose;
export type TextLensBounds = Partial<Record<PoseAxis, readonly [number, number]>>;
export type TextLensTransition = {
  readonly startedAt: number;
  readonly duration: number;
  readonly controlPoints: readonly [TextLensPose, TextLensPose, TextLensPose, TextLensPose];
};

function poseOf(get: (axis: PoseAxis) => number): TextLensPose {
  return { x: get('x'), y: get('y'), width: get('width'), height: get('height'), strength: get('strength') };
}

/** Position pose is in CSS pixels, time in ms and velocity in pose units per ms.
 *  Endpoints belong within the supplied bounds. Clamping only the first handle
 *  keeps the motion inside those bounds and preserves the displayed endpoints. */
export function createTextLensTransition(
  from: TextLensPose,
  to: TextLensPose,
  startedAt: number,
  duration: number,
  velocity: Partial<TextLensPose> = {},
  bounds: TextLensBounds = {},
): TextLensTransition {
  const elapsed = Number.isFinite(duration) ? Math.max(0, duration) : 0;
  const start = { ...from };
  const end = { ...to };
  const startHandle = poseOf(axis => {
    const speed = velocity[axis] ?? 0;
    const handle = start[axis] + (Number.isFinite(speed) ? speed : 0) * elapsed / 3;
    const extent = bounds[axis];
    return extent ? clamp(handle, ...extent) : handle;
  });
  return { startedAt, duration: elapsed, controlPoints: [start, startHandle, end, end] };
}

/** Advance every visual property on the same cubic time interval. */
export function sampleTextLensTransition(transition: TextLensTransition, now: number) {
  const { startedAt, duration, controlPoints: [p0, p1, p2, p3] } = transition;
  if (duration === 0 || now - startedAt >= duration) {
    return { pose: p3, velocity: poseOf(() => 0), done: true };
  }

  const t = Math.max(0, (now - startedAt) / duration);
  const u = 1 - t;
  const pose = poseOf(axis =>
    u ** 3 * p0[axis] + 3 * u * u * t * p1[axis] + 3 * u * t * t * p2[axis] + t ** 3 * p3[axis]);
  const velocity = poseOf(axis => 3 / duration * (
    u * u * (p1[axis] - p0[axis]) + 2 * u * t * (p2[axis] - p1[axis]) + t * t * (p3[axis] - p2[axis])
  ));
  return { pose, velocity, done: false };
}
