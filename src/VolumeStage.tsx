import { forwardRef, useId, useImperativeHandle, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import type { GlassClock } from './GlassClock';
import type { ReviewSettings } from './reviewSettings';
import { createGlassPreview } from './volume-renderer.js';
import { volumeFallbackPath } from './volume-fallback';
import { volumeHitContour } from './volume-hit-geometry';

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
  /** Play slow budding once on the first visible, foreground entry. The
   * automatic introduction pauses offscreen; manual replay is unchanged.
   * Reduced motion and an unavailable renderer show the complete form. */
  autoPlay?: boolean;
  /** Canvas raster limits only; foreground DOM and logical geometry stay sharp.
   * Default 2M pixels (1M on constrained device hints), DPR at most 2. */
  renderBudget?: { maxPixels?: number; maxDpr?: number };
  /** Optional studio lighting study. The default keeps the accepted light angle. */
  studioMotion?: boolean;
  /** Expose container-width layout modes for the host: overview below 600px,
   * compact-integrated below 900px, otherwise wide-integrated. The original
   * horizontal geometry and the same foreground DOM persist in every mode. */
  responsive?: boolean;
};

/** The approved 2.5D volume study, not refraction of arbitrary DOM content.
 * Local controls use their own actual CSS backdrop optics. The caller owns
 * the shared clock, settings, and foreground content. */
export const VolumeStage = forwardRef<VolumeStageHandle, VolumeStageProps>(function VolumeStage(
  { clock, settings, children, className = '', ariaLabel = 'AlvenX volume stage', onPlayingChange, autoPlay = false, renderBudget, studioMotion = false, responsive = false }, ref,
) {
  const canvas = useRef<HTMLCanvasElement>(null), stage = useRef<HTMLElement>(null), foreground = useRef<HTMLDivElement>(null);
  const hitSurface = useRef<HTMLDivElement>(null), hitKey = useRef('');
  const renderer = useRef<Renderer | null>(null);
  const simulation = useRef({ current: resting(), target: resting(), growth: autoPlay && !clock.reduced ? 0 : 1, playing: false, playbackAt: null as number | null, ambient: true, time: 0, dirty: true, visible: false, failed: false });
  const entryPlayback = useRef({ consumed: false, active: false });
  const autoPlayEnabled = useRef(autoPlay); autoPlayEnabled.current = autoPlay;
  const drag = useRef<{ x: number; y: number; parent: boolean; pointerId: number } | null>(null);
  const callback = useRef(onPlayingChange); callback.current = onPlayingChange;
  const budget = useRef(renderBudget); budget.current = renderBudget;
  const studio = useRef(studioMotion); studio.current = studioMotion;
  const responsiveEnabled = useRef(responsive); responsiveEnabled.current = responsive;
  const layoutRef = useRef<'overview' | 'compact-integrated' | 'wide-integrated'>('wide-integrated');
  const [layout, setLayout] = useState(layoutRef.current);
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
  function syncHitSurface() {
    const surface = hitSurface.current, state = simulation.current;
    if (!surface) return;
    const interactive = !state.failed && !clock.reduced;
    // touch-action is known by the browser from the hit path before contact.
    // The rectangle outside this CSS-clipped HTML box keeps native page panning.
    const pointerEvents = interactive ? 'auto' : 'none';
    if (surface.style.pointerEvents !== pointerEvents) surface.style.pointerEvents = pointerEvents;
    // The hit contour follows the same growth and deformation as the volume.
    if (!interactive) { hitKey.current = ''; return; }
    const key = JSON.stringify([state.growth, ...Object.values(state.current)]);
    if (hitKey.current === key) return;
    hitKey.current = key;
    surface.style.clipPath = `path('${volumeHitContour(state.current, state.growth).path}')`;
  }
  function syncHitCamera(width: number, height: number) {
    if (hitSurface.current && width > 0 && height > 0) hitSurface.current.style.transform = `translate(-50%, -50%) scale(${Math.min(width / 1000, height / 560)})`;
  }
  function syncForeground() {
    const element = foreground.current;
    if (!element) return;
    // The overview's independent content panel does not grow with the shape.
    const state = simulation.current;
    const visible = layoutRef.current === 'overview' || state.failed || state.growth > .92;
    // Expose reveal progress without changing the foreground backdrop root.
    // Only consumers that opt in through a child style use this value.
    const progress = state.failed || clock.reduced ? 1 : Math.max(0, Math.min(1, (state.growth - .92) / .08));
    const reveal = String(progress * progress * (3 - 2 * progress));
    if (element.style.getPropertyValue('--volume-text-reveal') !== reveal) element.style.setProperty('--volume-text-reveal', reveal);
    const visibility = visible ? 'visible' : 'hidden', hidden = String(!visible);
    if (element.style.visibility !== visibility) element.style.visibility = visibility;
    if (element.getAttribute('aria-hidden') !== hidden) element.setAttribute('aria-hidden', hidden);
  }
  function measureLayout(width: number) {
    if (!(width > 0)) return;
    const next = !responsiveEnabled.current || width >= 900 ? 'wide-integrated' : width < 600 ? 'overview' : 'compact-integrated';
    if (layoutRef.current !== next) { layoutRef.current = next; setLayout(next); syncForeground(); }
  }
  function startPlayback() {
    releaseDrag(); settleSurface();
    simulation.current.growth = 0; simulation.current.playing = true; simulation.current.playbackAt = null;
    syncForeground(); syncHitSurface(); callback.current?.(true); clock.wake();
  }
  function startEntryPlayback() {
    const entry = entryPlayback.current, state = simulation.current;
    if (!autoPlayEnabled.current || entry.consumed || !state.visible || document.hidden || state.failed || clock.reduced) return;
    // Ref state survives StrictMode effect replay and scrolling out/back.
    entry.consumed = true; entry.active = true;
    if (stage.current) stage.current.dataset.entryPlayback = 'playing';
    startPlayback();
  }
  function finishPlayback() {
    simulation.current.playing = false; simulation.current.playbackAt = null;
    if (entryPlayback.current.active && stage.current) stage.current.dataset.entryPlayback = 'completed';
    entryPlayback.current.active = false;
    callback.current?.(false);
  }
  function advancePlayback() {
    const state = simulation.current, now = performance.now();
    // The clock caps delta for stable physics. A finite presentation must use
    // real active time, otherwise a slow raster can turn 3 seconds into a minute.
    const elapsed = state.playbackAt === null ? 0 : Math.max(0, now - state.playbackAt);
    state.playbackAt = now;
    state.growth = Math.min(1, state.growth + elapsed / 3000);
    if (state.growth === 1) finishPlayback();
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
        if (autoPlayEnabled.current && (!entryPlayback.current.consumed || entryPlayback.current.active)) {
          entryPlayback.current.consumed = true;
          if (stage.current) stage.current.dataset.entryPlayback = 'unavailable';
        }
        entryPlayback.current.active = false;
        if (stage.current) stage.current.dataset.ambientActive = 'false';
        releaseDrag(); state.growth = 1; state.current = resting(); state.target = resting();
        if (state.playing) callback.current?.(false);
        state.playing = false; state.playbackAt = null;
        syncForeground();
      }
      // Avoid scheduling a React state update on every ambient/drag frame.
      if (reportedError.current !== nextError) { reportedError.current = nextError; setError(nextError); syncHitSurface(); }
    };
    syncError();
    const draw = (delta: number, elapsed: number) => {
      const state = simulation.current;
      if (state.failed) return false;
      startEntryPlayback();
      if (!state.visible) {
        // Initial discovery must remain available when the visitor returns;
        // do not consume the automatic introduction below the fold.
        if (entryPlayback.current.active) { state.playbackAt = null; return false; }
        // Keep the finite budding lifecycle coherent with the sibling content,
        // without advancing ambient/deformation or touching the GPU offscreen.
        if (state.playing) {
          advancePlayback(); state.dirty = true;
          if (stage.current) stage.current.dataset.growth = state.growth.toFixed(4);
        }
        syncForeground();
        return state.playing;
      }
      let changed = state.dirty, remaining = 0;
      state.dirty = false;
      const ambientActive = state.ambient && !clock.reduced;
      if (ambientActive) { state.time += elapsed / 1000; changed = true; }
      if (state.playing) {
        advancePlayback(); changed = true;
      }
      const blend = clock.reduced ? 1 : 1 - Math.exp(-delta / 78);
      for (const key of Object.keys(state.current) as Array<keyof ReturnType<typeof resting>>) {
        const difference = state.target[key] - state.current[key]; remaining = Math.max(remaining, Math.abs(difference));
        if (difference !== 0) changed = true;
        state.current[key] = Math.abs(difference) < .0005 ? state.target[key] : state.current[key] + difference * blend;
      }
      if (changed) {
        syncHitSurface();
        const angle = clock.reduced ? 0 : state.time * Math.PI * 2 / 48;
        const lightX = studio.current ? Math.max(0, Math.min(1, .5 - .28 * Math.cos(angle) + .25 * Math.sin(angle))) : .22;
        const lightY = studio.current ? Math.max(0, Math.min(1, .5 - .28 * Math.sin(angle) - .42 * Math.cos(angle))) : .08;
        renderer.current?.render({ edge: 'pearl', flat: false, lightX, lightY, studioMotion: studio.current, showGrid: false, growth: state.growth, time: state.time, ...state.current, ...clock.material }, budget.current);
        if (stage.current) {
          stage.current.dataset.growth = state.growth.toFixed(4);
          stage.current.dataset.ambientTime = state.time.toFixed(4);
          stage.current.dataset.ambientActive = String(ambientActive);
          stage.current.dataset.surface = JSON.stringify(state.current);
        }
        // Opacity would create a different backdrop root for local controls.
        syncForeground();
        syncError();
      }
      return ambientActive || state.playing || remaining > .0005;
    };
    const unsubscribe = clock.subscribe(draw);
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[entries.length - 1].contentRect;
      measureLayout(width); syncHitCamera(width, height); cancelDrag();
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
      state.visible = visible; state.playbackAt = null;
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
    const hidden = () => { simulation.current.playbackAt = null; if (document.hidden) cancelDrag(); else { startEntryPlayback(); clock.wake(); } };
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
    if (stage.current) {
      const { width, height } = stage.current.getBoundingClientRect();
      measureLayout(width); syncHitCamera(width, height);
    }
    simulation.current.dirty = true; clock.wake();
  }, [clock, renderBudget?.maxPixels, renderBudget?.maxDpr, studioMotion, responsive, autoPlay]);

  useLayoutEffect(syncForeground, [layout]);

  useLayoutEffect(() => {
    const state = simulation.current;
    state.ambient = settings.ambient;
    if (stage.current && (!state.ambient || clock.reduced || !state.visible || state.failed)) stage.current.dataset.ambientActive = 'false';
    if (clock.reduced) {
      if (autoPlayEnabled.current) {
        entryPlayback.current.consumed = true; entryPlayback.current.active = false;
        if (stage.current) stage.current.dataset.entryPlayback = 'reduced-motion';
      }
      releaseDrag(); state.current = resting(); state.target = resting(); state.growth = 1;
      if (state.playing) callback.current?.(false);
      state.playing = false; state.playbackAt = null;
    }
    syncForeground();
    syncHitSurface();
    state.dirty = true; clock.wake();
  }, [clock, settings, clock.reduced]);

  function settleSurface(target = resting()) {
    simulation.current.target = clock.reduced ? resting() : target;
    simulation.current.dirty = true; clock.wake();
  }
  function nativeTarget(target: EventTarget | null) {
    if (!(target instanceof Element)) return false;
    if (target.closest('button,a,input,textarea,select,label,summary,[contenteditable]:not([contenteditable="false"]),[role="button"],[role="slider"],[role="switch"],[data-volume-interaction="ignore"]')) return true;
    return false;
  }
  function respond(event: PointerEvent<HTMLElement>, pressed = false) {
    if (!stage.current || clock.reduced || simulation.current.failed) return;
    const active = drag.current;
    if (active && active.pointerId !== event.pointerId) return;
    if (!active && (!event.isPrimary || (!pressed && event.pointerType === 'touch'))) return;
    if (!active && nativeTarget(event.target)) { settleSurface(); return; }
    if (active && !pressed) {
      if (event.pointerType !== 'touch' && !(event.buttons & 1)) { cancelDrag(); return; }
    }
    const rect = stage.current.getBoundingClientRect();
    // Match the renderer's uniform camera scale, including any letterbox.
    const scale = Math.min(rect.width / 1000, rect.height / 560);
    const x = (event.clientX - rect.left - rect.width * .5) / scale + 500;
    const y = (event.clientY - rect.top - rect.height * .5) / scale + 280;
    const growth = simulation.current.growth, ease = growth * growth * (3 - 2 * growth);
    const childCenter = 373 + (690 - 373) * ease, childSize = Math.pow(growth, .85);
    const motherDistance = Math.hypot((x - 230) / 150, (y - 280) / 150);
    const childDistance = childSize > .001 ? Math.hypot((x - childCenter) / (255 * childSize), (y - 280) / (210 * childSize)) : Infinity;
    const parent = drag.current?.parent ?? motherDistance <= childDistance;
    const nx = (x - (parent ? 230 : childCenter)) / (parent ? 150 : 255 * childSize), ny = (y - 280) / (parent ? 150 : 210 * childSize);
    const proximity = Math.max(0, Math.min(1, (1.25 - Math.hypot(nx, ny)) * 2));
    if (!drag.current && !pressed && proximity === 0) { settleSurface(); return; }
    if (pressed) {
      // The contour supplies actual native hit testing, rather than the old
      // elliptical proximity heuristic around a rectangular stage.
      if (event.target !== hitSurface.current) return;
      drag.current = { x, y, parent, pointerId: event.pointerId };
      event.currentTarget.setPointerCapture(event.pointerId); event.preventDefault();
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
    entryPlayback.current.consumed = true; entryPlayback.current.active = false;
    startPlayback();
  } }), [clock]);

  return <div className={`stage-scroll${responsive ? ' is-responsive' : ''}`} data-layout={layout}><section className={`stage${responsive ? ' is-responsive' : ''} ${className}`.trim()} data-layout={layout} ref={stage} aria-label={ariaLabel} data-growth={simulation.current.growth.toFixed(4)}
    onPointerMove={event => respond(event)} onPointerDown={event => { if (event.button === 0 && event.isPrimary && !drag.current) respond(event, true); }}
    onPointerUp={event => { if (drag.current?.pointerId === event.pointerId) cancelDrag(); }}
    onPointerCancel={event => { if (drag.current?.pointerId === event.pointerId) cancelDrag(); }}
    onLostPointerCapture={event => { if (event.target === event.currentTarget && drag.current?.pointerId === event.pointerId) cancelDrag(); }}
    onPointerLeave={() => { if (!drag.current) settleSurface(); }}>
    <canvas ref={canvas} className="volume-canvas" aria-hidden="true"/>
    <div ref={hitSurface} className="volume-hit-surface" data-volume-hit="contour" aria-hidden="true" style={{ position: 'absolute', left: '50%', top: '50%', width: 1000, height: 560, transformOrigin: 'center', touchAction: 'pinch-zoom', pointerEvents: 'none' }}/>
    {error && <svg viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid meet" aria-hidden="true" data-renderer="static-pearl-fallback" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <defs>
        <linearGradient id={`${fallbackId}-environment`} x2="1" y2="1"><stop stopColor="#D7E6FC"/><stop offset=".52" stopColor="#EBEDFD"/><stop offset="1" stopColor="#D8CEF0"/></linearGradient>
        <radialGradient id={`${fallbackId}-pearl`} cx=".25" cy=".12" r=".9"><stop stopColor="#FBFCFF"/><stop offset=".42" stopColor="#D9E5FC"/><stop offset=".76" stopColor="#E4DBF6"/><stop offset="1" stopColor="#BAC4E6"/></radialGradient>
        <linearGradient id={`${fallbackId}-rim`} x2=".5" y2="1"><stop stopColor="#FFFFFF" stopOpacity=".95"/><stop offset=".48" stopColor="#C6D1ED" stopOpacity=".55"/><stop offset="1" stopColor="#A9A5CD" stopOpacity=".8"/></linearGradient>
      </defs>
      <path d="M0 0H1000V560H0Z" fill={`url(#${fallbackId}-environment)`}/>
      <path d={volumeFallbackPath()} fill={`url(#${fallbackId}-pearl)`} stroke={`url(#${fallbackId}-rim)`} strokeWidth="2" strokeLinejoin="round"/>
    </svg>}
    {error && <p role="status" title={error} style={{ position: 'absolute', left: 16, bottom: 4, margin: 0, fontSize: 11, color: 'var(--ax-label)' }}>Static pearl fallback · WebGL unavailable</p>}
  </section><div ref={foreground} className="foreground">{children}</div></div>;
});
