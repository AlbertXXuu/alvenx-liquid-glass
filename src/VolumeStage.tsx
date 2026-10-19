import { forwardRef, useId, useImperativeHandle, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import type { GlassClock } from './GlassClock';
import type { ReviewSettings } from './reviewSettings';
import { createGlassPreview } from './volume-renderer.js';
import { volumeFallbackPath } from './volume-fallback';

type Renderer = { render(options: Record<string, unknown>, budget?: { maxPixels?: number; maxDpr?: number }): void; destroy(): void };
const resting = () => ({ parentX: 1, parentY: 1, childX: 1, childY: 1, deformX: 500, deformY: 280, deformDX: 0, deformDY: 0, curvature: 3.2 });
export type VolumeStageHandle = { replay(): void };
export type VolumeStageProps = {
  clock: GlassClock;
  settings: ReviewSettings;
  /** Plain foreground DOM; it is never included in the volume shader. */
  children?: ReactNode;
  className?: string;
  ariaLabel?: string;
  onPlayingChange?: (playing: boolean) => void;
  /** Canvas raster limits only; foreground DOM and logical geometry stay sharp.
   * Default 2M pixels (1M on constrained device hints), DPR at most 2. */
  renderBudget?: { maxPixels?: number; maxDpr?: number };
  /** Optional studio lighting study. The default keeps the accepted light angle. */
  studioMotion?: boolean;
  /** Rotate the same continuous form into portrait below 720 CSS pixels.
   * The host positions upright foreground DOM using data-orientation. */
  responsive?: boolean;
};

/** The approved 2.5D volume study, not refraction of arbitrary DOM content.
 * Local controls use their own actual CSS backdrop optics. The caller owns
 * the shared clock, settings, and foreground content. */
export const VolumeStage = forwardRef<VolumeStageHandle, VolumeStageProps>(function VolumeStage(
  { clock, settings, children, className = '', ariaLabel = 'AlvenX volume stage', onPlayingChange, renderBudget, studioMotion = false, responsive = false }, ref,
) {
  const canvas = useRef<HTMLCanvasElement>(null), stage = useRef<HTMLElement>(null), foreground = useRef<HTMLDivElement>(null);
  const renderer = useRef<Renderer | null>(null);
  const simulation = useRef({ current: resting(), target: resting(), growth: 1, playing: false, ambient: true, time: 0, dirty: true, visible: false, failed: false });
  const drag = useRef<{ x: number; y: number; clientX: number; clientY: number; parent: boolean; pointerId: number; pendingTouch: boolean } | null>(null);
  const callback = useRef(onPlayingChange); callback.current = onPlayingChange;
  const budget = useRef(renderBudget); budget.current = renderBudget;
  const studio = useRef(studioMotion); studio.current = studioMotion;
  const responsiveEnabled = useRef(responsive); responsiveEnabled.current = responsive;
  const portraitRef = useRef(false);
  const [portrait, setPortrait] = useState(false);
  const fallbackId = useId().replace(/:/g, '');
  const [error, setError] = useState('');
  const reportedError = useRef('');

  function releaseDrag() {
    const active = drag.current;
    // Clear ownership before releasing capture: lostpointercapture can run
    // synchronously in a host and must not cancel a newly started gesture.
    drag.current = null;
    if (active && stage.current?.hasPointerCapture(active.pointerId)) stage.current.releasePointerCapture(active.pointerId);
  }
  function cancelDrag() { releaseDrag(); settleSurface(); }
  function measureOrientation(width: number) {
    const next = responsiveEnabled.current && width < 720;
    if (portraitRef.current !== next) { portraitRef.current = next; setPortrait(next); }
  }

  useLayoutEffect(() => {
    if (!canvas.current) return;
    renderer.current = createGlassPreview(canvas.current);
    simulation.current.visible = typeof IntersectionObserver === 'undefined';
    simulation.current.dirty = true;
    const syncError = () => {
      const nextError = canvas.current?.dataset.error ?? '', state = simulation.current;
      state.failed = Boolean(nextError);
      if (nextError) {
        if (stage.current) stage.current.dataset.ambientActive = 'false';
        releaseDrag(); state.growth = 1; state.current = resting(); state.target = resting();
        if (state.playing) callback.current?.(false);
        state.playing = false;
        if (foreground.current) { foreground.current.style.visibility = 'visible'; foreground.current.setAttribute('aria-hidden', 'false'); }
      }
      // Avoid scheduling a React state update on every ambient/drag frame.
      if (reportedError.current !== nextError) { reportedError.current = nextError; setError(nextError); }
    };
    syncError();
    const draw = (delta: number, elapsed: number) => {
      const state = simulation.current;
      if (!state.visible || state.failed) return false;
      let changed = state.dirty, remaining = 0;
      state.dirty = false;
      const ambientActive = state.ambient && !clock.reduced;
      if (ambientActive) { state.time += elapsed / 1000; changed = true; }
      if (state.playing) {
        state.growth = Math.min(1, state.growth + delta / 3000); changed = true;
        if (state.growth === 1) { state.playing = false; callback.current?.(false); }
      }
      const blend = clock.reduced ? 1 : 1 - Math.exp(-delta / 78);
      for (const key of Object.keys(state.current) as Array<keyof ReturnType<typeof resting>>) {
        const difference = state.target[key] - state.current[key]; remaining = Math.max(remaining, Math.abs(difference));
        if (difference !== 0) changed = true;
        state.current[key] = Math.abs(difference) < .0005 ? state.target[key] : state.current[key] + difference * blend;
      }
      if (changed) {
        const angle = clock.reduced ? 0 : state.time * Math.PI * 2 / 48;
        const lightX = studio.current ? Math.max(0, Math.min(1, .5 - .28 * Math.cos(angle) + .25 * Math.sin(angle))) : .22;
        const lightY = studio.current ? Math.max(0, Math.min(1, .5 - .28 * Math.sin(angle) - .42 * Math.cos(angle))) : .08;
        renderer.current?.render({ edge: 'pearl', flat: false, lightX, lightY, studioMotion: studio.current, portrait: portraitRef.current, showGrid: false, growth: state.growth, time: state.time, ...state.current, ...clock.material }, budget.current);
        if (stage.current) {
          stage.current.dataset.growth = state.growth.toFixed(4);
          stage.current.dataset.ambientTime = state.time.toFixed(4);
          stage.current.dataset.ambientActive = String(ambientActive);
          stage.current.dataset.surface = JSON.stringify(state.current);
        }
        if (foreground.current) {
          // Opacity would create a different backdrop root for local controls.
          foreground.current.style.visibility = state.growth > .92 ? 'visible' : 'hidden';
          foreground.current.setAttribute('aria-hidden', String(state.growth <= .92));
        }
        syncError();
      }
      return ambientActive || state.playing || remaining > .0005;
    };
    const unsubscribe = clock.subscribe(draw);
    const observer = new ResizeObserver(entries => {
      measureOrientation(entries[entries.length - 1].contentRect.width); cancelDrag();
    });
    if (stage.current) observer.observe(stage.current);
    const visibility = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(entries => {
      const entry = entries[entries.length - 1], state = simulation.current;
      const visible = entry.isIntersecting && entry.intersectionRect.width > 0 && entry.intersectionRect.height > 0;
      if (stage.current) {
        stage.current.dataset.visible = String(visible);
        if (!visible) stage.current.dataset.ambientActive = 'false';
      }
      if (state.visible === visible) return;
      state.visible = visible;
      if (visible) { state.dirty = true; clock.wake(); }
      else {
        releaseDrag(); state.target = resting();
      }
    }) : null;
    if (stage.current) visibility?.observe(stage.current);
    // The renderer updates its error dataset first. Wake even an idle stage so
    // context loss and successful recovery are reflected without pointer input.
    const element = canvas.current;
    const contextChanged = () => { syncError(); simulation.current.dirty = true; clock.wake(); };
    element.addEventListener('webglcontextlost', contextChanged);
    element.addEventListener('webglcontextrestored', contextChanged);
    const hidden = () => { if (document.hidden) cancelDrag(); };
    window.addEventListener('blur', cancelDrag);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      unsubscribe(); observer.disconnect(); visibility?.disconnect();
      releaseDrag();
      element.removeEventListener('webglcontextlost', contextChanged);
      element.removeEventListener('webglcontextrestored', contextChanged);
      window.removeEventListener('blur', cancelDrag);
      document.removeEventListener('visibilitychange', hidden);
      renderer.current?.destroy(); renderer.current = null;
    };
  }, [clock]);

  useLayoutEffect(() => {
    if (stage.current) measureOrientation(stage.current.getBoundingClientRect().width);
    simulation.current.dirty = true; clock.wake();
  }, [clock, renderBudget?.maxPixels, renderBudget?.maxDpr, studioMotion, responsive]);

  useLayoutEffect(() => {
    const state = simulation.current;
    state.ambient = settings.ambient;
    if (stage.current && (!state.ambient || clock.reduced || !state.visible || state.failed)) stage.current.dataset.ambientActive = 'false';
    if (clock.reduced) {
      releaseDrag(); state.current = resting(); state.target = resting(); state.growth = 1;
      if (state.playing) callback.current?.(false);
      state.playing = false;
    }
    state.dirty = true; clock.wake();
  }, [clock, settings, clock.reduced]);

  function settleSurface(target = resting()) {
    simulation.current.target = clock.reduced ? resting() : target;
    simulation.current.dirty = true; clock.wake();
  }
  function nativeTarget(target: EventTarget | null) {
    if (!(target instanceof Element)) return false;
    if (target.closest('button,a,input,textarea,select,label,summary,[contenteditable]:not([contenteditable="false"]),[role="button"],[role="slider"],[role="switch"],[data-volume-interaction="ignore"]')) return true;
    // Preserve native selection on foreground text, while allowing the empty
    // gaps of a foreground layout wrapper to meet a drag on the same shape.
    return Boolean(foreground.current?.contains(target) && target !== foreground.current &&
      (target.closest('h1,h2,h3,h4,h5,h6,p,li,dt,dd,pre,code') || Array.from(target.childNodes).some(node => node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim()))));
  }
  function respond(event: PointerEvent<HTMLElement>, pressed = false) {
    if (!stage.current || simulation.current.growth < 1 || clock.reduced || simulation.current.failed) return;
    const active = drag.current;
    if (active && active.pointerId !== event.pointerId) return;
    if (!active && (!event.isPrimary || (!pressed && event.pointerType === 'touch'))) return;
    if (!active && nativeTarget(event.target)) { settleSurface(); return; }
    if (active && !pressed) {
      if (event.pointerType !== 'touch' && !(event.buttons & 1)) { cancelDrag(); return; }
      if (active.pendingTouch) {
        const dx = event.clientX - active.clientX, dy = event.clientY - active.clientY;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 6) return;
        // CSS pan-y/pinch-zoom keeps browser scrolling available from contact.
        // Do not turn a vertical page swipe into a shape drag.
        if (Math.abs(dy) >= Math.abs(dx)) { cancelDrag(); return; }
        active.pendingTouch = false;
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    }
    const rect = stage.current.getBoundingClientRect();
    const screenX = (event.clientX - rect.left) / rect.width, screenY = (event.clientY - rect.top) / rect.height;
    const x = (portraitRef.current ? screenY : screenX) * 1000, y = (portraitRef.current ? 1 - screenX : screenY) * 560;
    const parent = drag.current?.parent ?? x < 450;
    const nx = (x - (parent ? 230 : 690)) / (parent ? 150 : 255), ny = (y - 280) / (parent ? 150 : 210);
    const proximity = Math.max(0, Math.min(1, (1.25 - Math.hypot(nx, ny)) * 2));
    if (!drag.current && proximity === 0) { settleSurface(); return; }
    if (pressed) {
      drag.current = { x, y, clientX: event.clientX, clientY: event.clientY, parent, pointerId: event.pointerId, pendingTouch: event.pointerType === 'touch' };
      if (event.pointerType !== 'touch') { event.currentTarget.setPointerCapture(event.pointerId); event.preventDefault(); }
    }
    const dx = (drag.current ? Math.max(-7.425, Math.min(7.425, (x - drag.current.x) * .2145)) : nx * 5.28 * proximity) * clock.strength;
    const dy = (drag.current ? Math.max(-7.425, Math.min(7.425, (y - drag.current.y) * .2145)) : ny * 5.28 * proximity) * clock.strength;
    const amount = (drag.current ? .0231 : .0099 * proximity) * clock.strength;
    const target = resting();
    target[parent ? 'parentX' : 'childX'] = 1 + amount + dx * .0012;
    target[parent ? 'parentY' : 'childY'] = 1 - amount * .7 + dy * .0012;
    target.deformX = x; target.deformY = y; target.deformDX = dx; target.deformDY = dy;
    target.curvature = 3.2 + (parent ? 0 : amount * 2); settleSurface(target);
  }
  useImperativeHandle(ref, () => ({ replay() {
    if (clock.reduced || simulation.current.failed) return;
    releaseDrag(); settleSurface();
    simulation.current.growth = 0; simulation.current.playing = true; callback.current?.(true); clock.wake();
  } }), [clock]);

  const orientation = portrait ? 'portrait' : 'landscape';
  return <div className={`stage-scroll${responsive ? ' is-responsive' : ''}`} data-orientation={orientation}><section className={`stage${responsive ? ' is-responsive' : ''} ${className}`.trim()} data-orientation={orientation} ref={stage} aria-label={ariaLabel} data-growth="1.0000"
    onPointerMove={event => respond(event)} onPointerDown={event => { if (event.button === 0 && event.isPrimary && !drag.current) respond(event, true); }}
    onPointerUp={event => { if (drag.current?.pointerId === event.pointerId) cancelDrag(); }}
    onPointerCancel={event => { if (drag.current?.pointerId === event.pointerId) cancelDrag(); }}
    onLostPointerCapture={event => { if (event.target === event.currentTarget && drag.current?.pointerId === event.pointerId) cancelDrag(); }}
    onPointerLeave={() => { if (!drag.current) settleSurface(); }}>
    <canvas ref={canvas} className="volume-canvas" aria-hidden="true"/>
    {error && <svg viewBox={portrait ? '0 0 560 1000' : '0 0 1000 560'} preserveAspectRatio="none" aria-hidden="true" data-renderer="static-pearl-fallback" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <defs>
        <linearGradient id={`${fallbackId}-environment`} x2="1" y2="1"><stop stopColor="#D7E6FC"/><stop offset=".52" stopColor="#EBEDFD"/><stop offset="1" stopColor="#D8CEF0"/></linearGradient>
        <radialGradient id={`${fallbackId}-pearl`} cx=".25" cy=".12" r=".9"><stop stopColor="#FBFCFF"/><stop offset=".42" stopColor="#D9E5FC"/><stop offset=".76" stopColor="#E4DBF6"/><stop offset="1" stopColor="#BAC4E6"/></radialGradient>
        <linearGradient id={`${fallbackId}-rim`} x2=".5" y2="1"><stop stopColor="#FFFFFF" stopOpacity=".95"/><stop offset=".48" stopColor="#C6D1ED" stopOpacity=".55"/><stop offset="1" stopColor="#A9A5CD" stopOpacity=".8"/></linearGradient>
      </defs>
      <g transform={portrait ? 'translate(560 0) rotate(90)' : undefined}>
        <path d="M0 0H1000V560H0Z" fill={`url(#${fallbackId}-environment)`}/>
        <path d={volumeFallbackPath()} fill={`url(#${fallbackId}-pearl)`} stroke={`url(#${fallbackId}-rim)`} strokeWidth="2" strokeLinejoin="round"/>
      </g>
    </svg>}
    <div ref={foreground} className="foreground">{children}</div>
    {error && <p role="status" title={error} style={{ position: 'absolute', left: 16, bottom: 4, margin: 0, fontSize: 11, color: 'var(--ax-label)' }}>Static pearl fallback · WebGL unavailable</p>}
  </section></div>;
});
