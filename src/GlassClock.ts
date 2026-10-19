import { DEFAULT_SETTINGS, type MaterialParameters } from './reviewSettings';
import type { GlassOpticsMode } from './opticalSupport';
export const boundedFrameRate = (value?: number) => Number.isFinite(value) && value! > 0 ? Math.max(1, Math.min(240, value!)) : 60;
/** One visible-frame clock for volume, local optics and control physics.
 * Construction is side-effect free; subscriptions own document listeners. */
export class GlassClock {
  pointer = { x: -10000, y: -10000 };
  pointerRevision = 0;
  layoutRevision = 0;
  optics: GlassOpticsMode;
  maxFps: number;
  reduced = false;
  strength = DEFAULT_SETTINGS.interactionStrength;
  material: MaterialParameters = DEFAULT_SETTINGS;
  private frame = 0;
  private last = 0;
  private phase = 0;
  private listening = false;
  private listeners = new Set<(delta: number, elapsed: number) => boolean>();
  constructor(options: { optics?: GlassOpticsMode; maxFps?: number } = {}) {
    this.optics = options.optics ?? 'auto';
    this.maxFps = boundedFrameRate(options.maxFps);
  }
  private move = (event: PointerEvent) => { if(event.isPrimary===false)return; this.pointer = { x: event.clientX, y: event.clientY }; this.pointerRevision++; this.wake(); };
  private leave = () => { this.pointer = { x: -10000, y: -10000 }; this.pointerRevision++; this.wake(); };
  private releaseTouch = (event:PointerEvent) => { if(event.pointerType==='touch'&&event.isPrimary!==false)this.leave(); };
  /** Call after host-driven positional layout changes without resize/scroll. */
  invalidateLayout = () => { this.layoutRevision++; this.wake(); };
  private visibility = () => {
    if (document.hidden) { cancelAnimationFrame(this.frame); this.frame = 0; this.last = 0; }
    else this.wake();
  };
  private connect() {
    if (this.listening || typeof document === 'undefined') return;
    document.addEventListener('pointermove', this.move, { passive: true });
    document.addEventListener('pointerdown', this.move, { passive: true });
    document.addEventListener('pointerup', this.releaseTouch, { passive: true });
    document.addEventListener('pointercancel', this.releaseTouch, { passive: true });
    document.addEventListener('pointerleave', this.leave);
    document.addEventListener('scroll', this.invalidateLayout, { passive: true, capture: true });
    window.addEventListener('resize', this.invalidateLayout, { passive: true });
    window.addEventListener('blur', this.leave);
    document.addEventListener('visibilitychange', this.visibility);
    this.listening = true;
  }
  private disconnect() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0; this.last = 0;
    if (!this.listening) return;
    document.removeEventListener('pointermove', this.move);
    document.removeEventListener('pointerdown', this.move);
    document.removeEventListener('pointerup', this.releaseTouch);
    document.removeEventListener('pointercancel', this.releaseTouch);
    document.removeEventListener('pointerleave', this.leave);
    document.removeEventListener('scroll', this.invalidateLayout, { capture: true });
    window.removeEventListener('resize', this.invalidateLayout);
    window.removeEventListener('blur', this.leave);
    document.removeEventListener('visibilitychange', this.visibility);
    this.listening = false;
  }
  subscribe(listener: (delta: number, elapsed: number) => boolean) {
    this.listeners.add(listener); this.connect(); this.wake();
    return () => { this.listeners.delete(listener); if (!this.listeners.size) this.disconnect(); };
  }
  wake = () => {
    if (!this.frame && this.listeners.size && typeof document !== 'undefined' && !document.hidden) {
      this.last = performance.now();
      // A sleeping scene should respond at the next browser frame, rather than
      // wait one full budget interval and often miss that first frame as well.
      this.phase = this.last - 1000 / boundedFrameRate(this.maxFps);
      this.frame = requestAnimationFrame(this.tick);
    }
  };
  private tick = (now: number) => {
    this.frame = 0;
    if (document.hidden) { this.last = 0; return; }
    const interval = 1000 / boundedFrameRate(this.maxFps);
    const due = now - this.phase;
    if (due + .2 < interval) { this.frame = requestAnimationFrame(this.tick); return; }
    // Keep cadence anchored to accumulated deadlines, not the previous delivered
    // frame. This avoids 75Hz -> 37.5Hz quantization while bounding 144Hz work.
    this.phase += Math.max(1, Math.floor((due + .2) / interval)) * interval;
    const elapsed = now - this.last;
    const delta = Math.max(0, Math.min(34, elapsed)); this.last = now;
    let active = false;
    for (const listener of this.listeners) active = listener(delta, elapsed) || active;
    if (active && !this.frame && this.listeners.size) this.frame = requestAnimationFrame(this.tick);
  };
  /** Idempotent; a later subscription can reactivate the same instance. */
  destroy() { this.listeners.clear(); this.disconnect(); }
}
export { GlassClock as PreviewClock };
