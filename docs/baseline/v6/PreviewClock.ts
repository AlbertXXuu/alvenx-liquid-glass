import { DEFAULT_SETTINGS, type MaterialParameters } from './reviewSettings';
/** One clock for this review: background, large bodies and local controls. */
export class PreviewClock {
  pointer = { x: -10000, y: -10000 };
  reduced = false;
  strength = 1.5;
  material: MaterialParameters = DEFAULT_SETTINGS;
  private frame = 0;
  private last = 0;
  private listeners = new Set<(delta: number, elapsed: number) => boolean>();
  private move = (event: PointerEvent) => { this.pointer = { x: event.clientX, y: event.clientY }; this.wake(); };
  private visibility = () => {
    if (document.hidden) { cancelAnimationFrame(this.frame); this.frame = 0; this.last = 0; }
    else this.wake();
  };
  constructor() {
    document.addEventListener('pointermove', this.move, { passive: true });
    document.addEventListener('visibilitychange', this.visibility);
  }
  subscribe(listener: (delta: number, elapsed: number) => boolean) { this.listeners.add(listener); this.wake(); return () => { this.listeners.delete(listener); }; }
  wake = () => { if (!this.frame && !document.hidden) { this.last = performance.now(); this.frame = requestAnimationFrame(this.tick); } };
  private tick = (now: number) => {
    this.frame = 0;
    if (document.hidden) { this.last = 0; return; }
    const elapsed = now - this.last;
    // Limit scheduling frequency; actual delivery depends on rendering cost.
    if (elapsed < 15) { this.frame = requestAnimationFrame(this.tick); return; }
    const delta = Math.min(34, elapsed); this.last = now;
    let active = false;
    for (const listener of this.listeners) active = listener(delta, elapsed) || active;
    if (active) this.frame = requestAnimationFrame(this.tick);
  };
  destroy() {
    cancelAnimationFrame(this.frame); this.listeners.clear();
    document.removeEventListener('pointermove', this.move); document.removeEventListener('visibilitychange', this.visibility);
  }
}
