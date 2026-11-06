import { useId, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { GlassSwitch } from '../GlassSettingsControls';
import { LiquidControl } from '../LiquidControl';
import type { GlassClock } from '../GlassClock';
import type { ReviewSettings } from '../reviewSettings';
import { springStep } from '../budding-volume/motion';
import { createWorkspaceVolumeRenderer } from './renderer.js';
import { clamp, ease, hitContours, isDetached, mix, type VolumeBox, type VolumeDeformation, type VolumeGeometry } from './geometry';

export type WorkspaceVolumeProps = {
  clock: GlassClock; settings: ReviewSettings; systemReduced: boolean; opened: boolean;
  language: 'zh' | 'en'; children: ReactNode; onEnter: () => void; onReveal: () => void;
  onSettings: (next: Partial<ReviewSettings>) => void;
};
type Camera = { scale: number; left: number; top: number; width: number; height: number; zoom: number };
const duration = 2500;
type Side = 'mother' | 'panel';
type Channel = { value: number; speed: number; target: number };
type Motion = { anchor: [number, number]; x: Channel; y: Channel; squash: Channel };
const channel = (): Channel => ({ value: 0, speed: 0, target: 0 });
const motion = (): Motion => ({ anchor: [500, 280], x: channel(), y: channel(), squash: channel() });
const volumeMotion = { hoverShift: 7, hoverSquash: .027, pressSquash: .085, tapSquash: .11, dragLimit: 40 };
const idleChannel = (state: Channel) => state.value === state.target && state.speed === 0;

function step(state: Channel, delta: number, tolerance: number, reduced: boolean) {
  if (reduced || Math.abs(state.value - state.target) < tolerance && Math.abs(state.speed) < tolerance * 8) {
    state.value = state.target;
    state.speed = 0;
  } else {
    [state.value, state.speed] = springStep(state.value, state.speed, state.target, delta);
  }
  return !idleChannel(state);
}

function relax(state: Motion) {
  state.x.target = state.y.target = state.squash.target = 0;
}

function deformation(state: Motion, squashGain = 1): VolumeDeformation {
  return [...state.anchor, state.x.value, state.y.value, clamp(state.squash.value * squashGain, -.07, .18)];
}

export function WorkspaceVolume({ clock, settings, systemReduced, opened, language, children, onEnter, onReveal, onSettings }: WorkspaceVolumeProps) {
  const tx = (en: string, zh: string) => language === 'zh' ? zh : en;
  const stage = useRef<HTMLElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const motherSlot = useRef<HTMLDivElement>(null), panelSlot = useRef<HTMLDivElement>(null);
  const motherButton = useRef<HTMLButtonElement>(null), hit = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null), fallbackPath = useRef<SVGPathElement>(null), focusPath = useRef<SVGPathElement>(null);
  const press = useRef<(event: PointerEvent<HTMLElement>) => void>(() => {});
  const suppressClick = useRef(false), didOpen = useRef(opened);
  const latest = useRef({ settings, opened, onEnter, onReveal }); latest.current = { settings, opened, onEnter, onReveal };
  const start = useRef<() => void>(() => {}), stop = useRef<() => void>(() => {}), invalidate = useRef<() => void>(() => {});
  const [ready, setReady] = useState(opened), [playing, setPlaying] = useState(false);
  const id = useId();

  useLayoutEffect(() => {
    const host = stage.current, surface = canvas.current;
    if (!host || !surface) return;
    const renderer = createWorkspaceVolumeRenderer(surface);
    let growth = latest.current.opened ? 1 : 0, last: number | null = null, time = 0;
    let visible = true, dirty = true, animation = false, geometryKey = '';
    let camera: Camera | undefined, panel: VolumeBox | undefined, mother: VolumeBox, vertical = false;
    let field = { mother: motion(), panel: motion() }, connected = motion();
    let separated = false, squeezeProgress = 1, hovered: Side | undefined, lead: Side = 'mother';
    let activeDrag: { id: number; owner: HTMLElement; side: Side; x: number; y: number; moved: boolean } | undefined;
    const current = (side: Side) => separated ? field[side] : connected;
    const wake = () => { dirty = true; clock.wake(); };
    const measure = () => {
      const bounds = surface.getBoundingClientRect();
      const width = surface.clientWidth, height = surface.clientHeight;
      const scale = Math.min(width / 1000, height / 560);
      if (!scale || !motherSlot.current) return;
      const zoom = bounds.width / width;
      const left = width / 2 - 500 * scale, top = height / 2 - 280 * scale;
      function box(node: HTMLElement): VolumeBox {
        const b = node.getBoundingClientRect(), w = b.width / zoom, h = b.height / zoom;
        return [((b.left - bounds.left) / zoom + w / 2 - left) / scale,
          ((b.top - bounds.top) / zoom + h / 2 - top) / scale, w / (2 * scale), h / (2 * scale)];
      }
      camera = { scale, left, top, width, height, zoom };
      mother = box(motherSlot.current);
      panel = panelSlot.current ? box(panelSlot.current) : undefined;
      vertical = getComputedStyle(host).flexDirection === 'column';
      svg.current?.setAttribute('viewBox', `0 0 ${width} ${height}`);
      geometryKey = ''; wake();
    };
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    if (motherSlot.current) observer.observe(motherSlot.current);
    let observed: HTMLDivElement | null = null;
    invalidate.current = () => {
      if (observed !== panelSlot.current) {
        if (observed) observer.unobserve(observed);
        observed = panelSlot.current;
        if (observed) observer.observe(observed);
      }
      if (clock.reduced && animation) finish();
      measure();
    };
    const intersection = new IntersectionObserver(entries => {
      visible = !!entries.at(-1)?.isIntersecting; last = null; wake();
    });
    intersection.observe(host);
    function finish() {
      growth = latest.current.opened ? 1 : 0; animation = false; last = null;
      setReady(latest.current.opened); setPlaying(false); wake();
    }
    stop.current = () => { cancel(); finish(); };
    start.current = () => {
      if (clock.reduced) { finish(); return; }
      growth = 0; animation = true; last = null;
      setReady(false); setPlaying(true); wake();
    };
    function logical(clientX: number, clientY: number): [number, number] {
      const bounds = surface!.getBoundingClientRect();
      const { scale, zoom, left, top } = camera!;
      return [clamp(((clientX - bounds.left) / zoom - left) / scale, -100, 1100),
        clamp(((clientY - bounds.top) / zoom - top) / scale, -100, 660)];
    }
    function sideAt(target: EventTarget | null): Side | undefined {
      if (target === motherButton.current) return 'mother';
      if (target === hit.current || target instanceof Node && panelSlot.current?.contains(target)) return 'panel';
    }
    function clearHover() {
      if (hovered) relax(current(hovered));
      hovered = undefined;
    }
    function hover(event: globalThis.PointerEvent) {
      if (!camera || event.pointerType !== 'mouse' || !event.isPrimary || clock.reduced) return;
      const side = sideAt(event.target);
      if (side !== hovered) clearHover();
      if (!side) { wake(); return; }
      hovered = lead = side;
      const state = current(side);
      const point = logical(event.clientX, event.clientY);
      const box = (side === 'panel' ? panel : mother) ?? mother;
      const strength = Math.min(1.25, clock.strength / 2.5);
      state.anchor = point;
      state.x.target = clamp((point[0] - box[0]) / box[2], -1, 1) * volumeMotion.hoverShift * strength;
      state.y.target = clamp((point[1] - box[1]) / box[3], -1, 1) * volumeMotion.hoverShift * strength;
      state.squash.target = volumeMotion.hoverSquash * strength;
      wake();
    }
    function cancel(event?: globalThis.PointerEvent) {
      const drag = activeDrag;
      if (event && drag?.id !== event.pointerId) return;
      activeDrag = undefined;
      clearHover();
      if (!drag) { wake(); return; }
      const state = current(drag.side);
      relax(state);
      const released = event?.type === 'pointerup';
      if (released && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 6) {
        drag.moved = suppressClick.current = true;
      }
      if (released && !drag.moved && !clock.reduced && clock.strength > 0) {
        const strength = Math.min(1.25, clock.strength / 2.5);
        state.squash.value = Math.max(state.squash.value, volumeMotion.tapSquash * strength);
        state.squash.speed = -2.8 * strength;
      }
      if (drag.owner.hasPointerCapture(drag.id)) drag.owner.releasePointerCapture(drag.id);
      // A short touch after a drag may have no synthesized click. Activate on
      // confirmed release and consume any compatibility click that does arrive.
      if (released && event.pointerType === 'touch' && !drag.moved && drag.owner === motherButton.current) {
        suppressClick.current = true;
        latest.current.onEnter();
      }
      wake();
    }
    function hidden() { last = null; if (document.hidden) cancel(); wake(); }
    function blur() { cancel(); }
    function leave() { if (!activeDrag) { clearHover(); wake(); } }
    function move(event: globalThis.PointerEvent) {
      const drag = activeDrag;
      if (!drag) { hover(event); return; }
      if (drag.id !== event.pointerId || !camera) return;
      const rx = event.clientX - drag.x, ry = event.clientY - drag.y;
      if (Math.hypot(rx, ry) > 6) drag.moved = suppressClick.current = true;
      if (!drag.moved || clock.reduced) return;
      const state = current(drag.side);
      const amount = .34 * clock.strength / (camera.scale * camera.zoom);
      const limit = volumeMotion.dragLimit;
      state.x.target = limit * Math.tanh(rx * amount / limit);
      state.y.target = limit * Math.tanh(ry * amount / limit);
      state.squash.target = volumeMotion.pressSquash * Math.min(1.25, clock.strength / 2.5);
      wake();
    }
    press.current = event => {
      const owner = event.target;
      if (owner !== motherButton.current && owner !== hit.current || !(owner instanceof HTMLElement)) return;
      if (!event.isPrimary || event.button !== 0) return;
      suppressClick.current = false;
      if ((clock.reduced && event.pointerType !== 'touch') || activeDrag || !camera) return;
      const side = owner === motherButton.current ? 'mother' : 'panel';
      clearHover();
      lead = side;
      const state = current(side);
      state.anchor = logical(event.clientX, event.clientY);
      if (!clock.reduced) state.squash.target = volumeMotion.pressSquash * Math.min(1.25, clock.strength / 2.5);
      activeDrag = { id: event.pointerId, owner, side, x: event.clientX, y: event.clientY, moved: false };
      owner.setPointerCapture(event.pointerId);
      if (owner === hit.current) event.preventDefault();
      wake();
    };
    host.addEventListener('pointermove', move);
    host.addEventListener('pointerup', cancel);
    host.addEventListener('pointercancel', cancel);
    host.addEventListener('lostpointercapture', cancel);
    host.addEventListener('pointerleave', leave);
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('blur', blur);
    surface.addEventListener('webglcontextlost', wake);
    surface.addEventListener('webglcontextrestored', wake);
    measure();

    const unsubscribe = clock.subscribe((delta, elapsed) => {
      if (!camera || !visible || document.hidden) return false;
      if (animation) {
        const now = performance.now();
        if (last !== null) growth = Math.min(1, growth + (now - last) / duration);
        last = now;
        if (growth === 1 || clock.reduced) finish();
      }
      const ambient = latest.current.settings.ambient && !clock.reduced;
      if (ambient) time += elapsed / 1000;
      const active = latest.current.opened && panel;
      const g = active ? growth : 0, t = ease(g);
      const base: VolumeBox = active ? [
        mix(500, mother[0], ease(g / .67)), mix(280, mother[1], ease(g / .67)), mother[2], mother[3],
      ] : [500, 280, mother[2], mother[3]];
      const size = Math.max(.001, g ** .85);
      const settle = ease((g - .75) / .25);
      const budHeight = active && !vertical ? mix(Math.max(active[3], base[3] * 1.34), active[3], settle) : active && active[3];
      const child: VolumeBox = active ? [
        mix(base[0], active[0], t), mix(base[1], active[1], t),
        Math.max(.1, active[2] * size), Math.max(.1, (budHeight || active[3]) * size),
      ] : [base[0], base[1], .1, .1];
      const axis = vertical ? 1 : 0, half = axis + 2;
      const gap = child[axis] - child[half] - base[axis] - base[half];
      const neck = Math.max(24 + 136 * Math.sqrt(g), 2 * gap + 70) * (1 - ease((g - .75) / .19));
      const geometry: VolumeGeometry = { mother: base, panel: child, growth: g, neck,
        curvature: mix(3.2, 4.2, settle), detached: false,
        motherDeformation: deformation(connected), panelDeformation: deformation(field.panel) };
      const detached = isDetached(geometry, vertical);
      // Finish fading the shared-axis squeeze before the pinch opens. At
      // detachment the selected lobe can change its squeeze origin without
      // jumping; build up the independent squeeze over the following frames.
      if (!detached) squeezeProgress = 1 - ease((g - .60) / .14);
      else if (separated) squeezeProgress = Math.min(1, squeezeProgress + delta / 105);
      if (detached !== separated) {
        if (detached) {
          field = { mother: motion(), panel: motion() };
          field[lead] = connected;
        } else {
          connected = field[lead];
        }
        separated = detached;
      }
      if (clock.reduced) { relax(connected); relax(field.mother); relax(field.panel); }
      let moving = false;
      for (const state of separated ? [field.mother, field.panel] : [connected]) {
        const elapsedSeconds = delta / 1000;
        moving = step(state.x, elapsedSeconds, .015, clock.reduced) || moving;
        moving = step(state.y, elapsedSeconds, .015, clock.reduced) || moving;
        moving = step(state.squash, elapsedSeconds, .0002, clock.reduced) || moving;
      }
      geometry.detached = separated;
      const squashGain = separated ? ease(squeezeProgress) : squeezeProgress;
      geometry.motherDeformation = deformation(separated ? field.mother : connected, squashGain);
      geometry.panelDeformation = deformation(field.panel, squashGain);
      const key = JSON.stringify(geometry);
      const changed = key !== geometryKey;
      if (changed) {
        const { scale, left, top } = camera;
        const shape = hitContours(geometry, vertical, scale, left, top);
        const orb = shape.motherPath;
        if (hit.current) hit.current.style.clipPath = `path('${shape.path}')`;
        if (motherButton.current) motherButton.current.style.clipPath = `path('${orb}')`;
        fallbackPath.current?.setAttribute('d', shape.path);
        focusPath.current?.setAttribute('d', orb);
        host.dataset.parts = String(shape.parts); host.dataset.joined = String(g > .05 && shape.parts === 1);
        host.dataset.neck = neck.toFixed(3); host.dataset.growth = g.toFixed(4);
        const [,,x,y] = deformation(current(lead));
        host.dataset.pull = JSON.stringify({x,y});
        host.dataset.lobeMotion = JSON.stringify({mother: geometry.motherDeformation, panel: geometry.panelDeformation});
        host.dataset.detached = String(separated);
        geometryKey = key;
      }
      if (changed || ambient || dirty) {
        // The same light orbit and settings as the site's Interactive preview.
        const angle = clock.reduced ? 0 : time * Math.PI * 2 / 48;
        renderer.render({ edge: 'pearl', flat: false, showGrid: false, studioMotion: true,
          lightX: clamp(.5 - .28 * Math.cos(angle) + .25 * Math.sin(angle), 0, 1),
          lightY: clamp(.5 - .28 * Math.sin(angle) - .42 * Math.cos(angle), 0, 1),
          time, growth: g, curvature: geometry.curvature, motherBox: base, panelBox: child, neck,
          detached: separated, motherDeformation: geometry.motherDeformation,
          panelDeformation: geometry.panelDeformation, ...clock.material });
        host.dataset.renderer = surface.dataset.error ? 'svg' : 'webgl';
        host.dataset.ambientTime = time.toFixed(4); host.dataset.ambientActive = String(ambient);
        dirty = false;
      }
      return ambient || animation || moving || separated && squeezeProgress < 1;
    });
    return () => {
      cancel(); unsubscribe(); observer.disconnect(); intersection.disconnect(); renderer.destroy();
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerup', cancel);
      host.removeEventListener('pointercancel', cancel);
      host.removeEventListener('lostpointercapture', cancel);
      host.removeEventListener('pointerleave', leave);
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('blur', blur);
      surface.removeEventListener('webglcontextlost', wake);
      surface.removeEventListener('webglcontextrestored', wake);
    };
  }, [clock]);

  useLayoutEffect(() => {
    invalidate.current();
    if (opened !== didOpen.current) (opened ? start : stop).current();
    didOpen.current = opened;
  }, [opened, settings, clock.reduced]);
  useLayoutEffect(() => { if (ready) latest.current.onReveal(); }, [ready]);

  return <>
    <section className="glass-stage-shell ax-workspace-volume" ref={stage} data-opened={opened} aria-label={tx('AlvenX glass', 'AlvenX 玻璃')} onPointerDown={event => press.current(event)}>
      <canvas className="volume-canvas glass-volume-canvas" ref={canvas} aria-hidden="true" />
      <svg className="glass-fallback" ref={svg} aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-environment`} x2="1" y2="1"><stop stopColor="#D7E6FC"/><stop offset=".52" stopColor="#EBEDFD"/><stop offset="1" stopColor="#D8CEF0"/></linearGradient>
          <radialGradient id={`${id}-pearl`} cx=".25" cy=".12" r=".9"><stop stopColor="#FBFCFF"/><stop offset=".42" stopColor="#D9E5FC"/><stop offset=".76" stopColor="#E4DBF6"/><stop offset="1" stopColor="#BAC4E6"/></radialGradient>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id}-environment)`} />
        <path ref={fallbackPath} fill={`url(#${id}-pearl)`} />
        <path ref={focusPath} className="glass-focus" />
      </svg>
      <div ref={motherSlot} className="glass-mother-space" aria-hidden="true">
        {!opened && <span className="glass-entry-hint">{tx('Start a conversation', '开始对话')}</span>}
      </div>
      {opened && <div className="glass-foreground" ref={panelSlot} data-revealed={ready} inert={!ready}>{children}</div>}
      <div ref={hit} className="glass-volume-hit" aria-hidden="true" data-interactive={!clock.reduced} />
      <button ref={motherButton} className="orb-trigger glass-enter" type="button"
        aria-label={opened ? tx('Return to conversation', '返回对话') : tx('Open conversation', '打开对话')}
        onClick={event => {
          const fromPointer = event.detail > 0 || 'pointerType' in event.nativeEvent && Boolean(event.nativeEvent.pointerType);
          if (!fromPointer || !suppressClick.current) onEnter();
          suppressClick.current = false;
        }} />
    </section>
    {opened && <div className="glass-motion-controls" id="glass-motion-controls">
      <LiquidControl id="agent-replay-budding" className="glass-replay" clock={clock} disabled={playing || clock.reduced} onClick={() => start.current()}>{tx('Replay budding', '重播出芽')}</LiquidControl>
      <details className="glass-motion-options">
        <summary>{tx('Motion settings', '动效设置')}</summary>
        <div className="glass-motion-popover">
          <GlassSwitch id="agent-background-motion" label={tx('Background motion', '背景动效')} checked={settings.ambient} clock={clock} controlledRefraction onChange={ambient => onSettings({ ambient })}/>
          <GlassSwitch id="agent-reduced-motion" label={tx('Reduced motion', '减少动态效果')} checked={clock.reduced} disabled={systemReduced} clock={clock} controlledRefraction onChange={reducedMotion => onSettings({ reducedMotion })}/>
        </div>
      </details>
    </div>}
  </>;
}
