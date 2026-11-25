import {useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent} from 'react';
import {ControlledScene, type ControlledSceneSize, type GlassClock} from '../../src';
import {resolveGlassOptics} from '../../src/opticalSupport';
import type {ReviewSettings} from '../../src/reviewSettings';
import {createTextLensTransition, sampleTextLensTransition, type TextLensPose} from '../text-lens-motion';
import {textLensOutline} from '../text-lens-shape';
import {createTextLensEnvironment, type TextLensEnvironment} from '../text-lens-environment';
import {useSampleText} from './useSampleText';
import {TextLensTransmission} from './TextLensTransmission';

type Motion = 'idle' | 'hover' | 'press' | 'drag' | 'settle';
type Frame = {pose: TextLensPose; motion: Motion; time: number};
type Transition = ReturnType<typeof createTextLensTransition>;
type ActiveMotion = {curve: Transition; motion: Motion; end: Motion};
type Drag = {
  id: number;
  pointerX: number;
  pointerY: number;
  start: TextLensPose;
  sample: Frame;
  velocity: Partial<TextLensPose>;
  deformationBase?: TextLensPose;
};
type Props = {
  clock: GlassClock;
  settings: ReviewSettings;
  reduced: boolean;
  language: 'en' | 'zh-CN';
  refractionEnabled: boolean;
  label: string;
  moveLabel: string;
  statusText: (status: 'loading' | 'composing' | 'error') => string;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const home = {x: .36, y: .49};
const primaryInk = '#223D96';
const heightPerWidth = .62;
let cachedMap: string | undefined;

/** One normalized displacement field, scaled to the same CSS-pixel box as the contour. */
function transmissionMap() {
  if (cachedMap) return cachedMap;
  const size = 96;
  const map = document.createElement('canvas');
  map.width = map.height = size;
  const ctx = map.getContext('2d');
  if (!ctx) return;
  const pixels = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x + .5) / size * 2 - 1, ny = (y + .5) / size * 2 - 1;
      const core = Math.max(0, 1 - nx * nx - ny * ny);
      const gain = core * core * (3 - 2 * core);
      const offset = (y * size + x) * 4;
      pixels.data[offset] = 128 - 216 * nx * gain;
      pixels.data[offset + 1] = 128 - 137 * ny * gain;
      pixels.data[offset + 3] = 255;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  cachedMap = map.toDataURL('image/png');
  return cachedMap;
}

function bodyWidth(size: ControlledSceneSize) {
  return Math.min(238, size.width * .52, size.height * .86 / heightPerWidth);
}

function limits(size: ControlledSceneSize) {
  const width = bodyWidth(size);
  const height = width * heightPerWidth;
  const verticalPadding = Math.min(size.height * .48, height * .57 + 4);
  return {
    x: [width * .61, size.width - width * .61] as const,
    y: [verticalPadding, size.height - verticalPadding] as const,
    width: [width * .9, width * 1.2] as const,
    height: [height * .83, height * 1.12] as const,
    strength: [0, 86] as const
  };
}

function homePosition(size: ControlledSceneSize) {
  const [left, right] = limits(size).x;
  return left + (right - left) * home.x;
}

function poseAt(size: ControlledSceneSize, center: {x: number; y: number}, motion: Motion, strength: number, reduced: boolean): TextLensPose {
  const bounds = limits(size);
  const width = bodyWidth(size);
  const amount = reduced ? 0 : clamp(strength / 2.5, 0, 1.6);
  const hover = motion === 'hover', press = motion === 'press';
  return {
    x: clamp(center.x, ...bounds.x),
    y: clamp(center.y, ...bounds.y),
    width: width * (1 + amount * (press ? .058 : hover ? .039 : 0)),
    height: width * heightPerWidth * (1 + amount * (press ? -.037 : hover ? .033 : 0)),
    strength: 32 + amount * (press ? 15 : hover ? 8 : 0)
  };
}

/** The registered lighting and active native text supply the transmission scene. */
export function TextLensStudy({clock, settings, reduced, language, refractionEnabled, label, moveLabel, statusText}: Props) {
  const identifier = `text-lens-${useId().replace(/[^a-z0-9]/gi, '')}`;
  const anchor = useRef<HTMLSpanElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const hit = useRef<HTMLButtonElement>(null);
  const sceneSize = useRef<ControlledSceneSize>({width: 0, height: 0});
  const [frame, setFrame] = useState<Frame | null>(null);
  const [map, setMap] = useState<string>();
  const [environment, setEnvironment] = useState<TextLensEnvironment>();
  const [inputFocused, setInputFocused] = useState(false);
  const current = useRef<Frame | null>(null);
  const transition = useRef<ActiveMotion | null>(null);
  const drag = useRef<Drag | null>(null);
  const hovering = useRef(false);
  const latest = useRef({settings, reduced});
  latest.current = {settings, reduced};
  const sampleText = useSampleText(language === 'zh-CN' ? '发布检查单' : 'Release checklist');

  const commit = useCallback((pose: TextLensPose, motion: Motion, time: number) => {
    const next = {pose, motion, time};
    current.current = next;
    setFrame(next);
  }, []);

  const targetAt = useCallback((center: {x: number; y: number}, motion: Motion) => (
    poseAt(sceneSize.current, center, motion, latest.current.settings.interactionStrength, latest.current.reduced)
  ), []);

  const animate = useCallback((target: TextLensPose, motion: Motion, end: Motion, duration: number, velocity?: Partial<TextLensPose>) => {
    const previous = current.current;
    if (!previous) return;
    const now = performance.now();
    if (latest.current.reduced) {
      transition.current = null;
      commit(target, end, now);
      return;
    }
    const active = transition.current;
    const initialVelocity = velocity ?? (active ? sampleTextLensTransition(active.curve, previous.time).velocity : undefined);
    const curve = createTextLensTransition(previous.pose, target, now, duration, initialVelocity, limits(sceneSize.current));
    transition.current = {curve, motion, end};
    commit(previous.pose, motion, now);
    clock.wake();
  }, [clock, commit]);

  useEffect(() => {
    const el = anchor.current?.parentElement;
    if (!el) return;
    const measure = () => {
      const size = {width: el.clientWidth, height: el.clientHeight};
      if (!(size.width > 0 && size.height > 0)) return;
      const oldSize = sceneSize.current;
      if (size.width === oldSize.width && size.height === oldSize.height) return;
      const old = current.current?.pose;
      const x = old && oldSize.width ? old.x / oldSize.width * size.width : homePosition(size);
      const y = old && oldSize.height ? old.y / oldSize.height : home.y;
      sceneSize.current = size;
      transition.current = null;
      const held = drag.current;
      drag.current = null;
      if (held && hit.current?.hasPointerCapture(held.id)) hit.current.releasePointerCapture(held.id);
      commit(targetAt({x, y: y * size.height}, 'idle'), 'idle', performance.now());
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    if (clock.optics === 'svg') setMap(transmissionMap());
    return () => observer.disconnect();
  }, [clock, commit, targetAt]);

  useEffect(() => clock.subscribe(() => {
    const active = transition.current;
    if (!active) return false;
    const time = performance.now();
    const {pose, done} = sampleTextLensTransition(active.curve, time);
    if (done) transition.current = null;
    commit(pose, done ? active.end : active.motion, time);
    return !done;
  }, 'prepare'), [clock, commit]);

  useEffect(() => {
    setEnvironment(createTextLensEnvironment());
  }, []);

  useEffect(() => {
    const shown = current.current;
    if (!shown || !reduced) return;
    transition.current = null;
    commit(targetAt(shown.pose, 'idle'), drag.current ? 'drag' : 'idle', performance.now());
  }, [commit, reduced, targetAt]);

  const updateHover = (over: boolean, event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'touch' || drag.current || !current.current) return;
    hovering.current = over;
    if (reduced) return;
    const state = over ? 'hover' : 'idle';
    animate(targetAt(current.current.pose, state), state, state, 170);
  };

  const press = (event: PointerEvent<HTMLButtonElement>) => {
    const shown = current.current;
    if (!shown || event.button !== 0 || !event.isPrimary || drag.current) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {id: event.pointerId, pointerX: event.clientX, pointerY: event.clientY, start: shown.pose, sample: shown, velocity: {}};
    animate(targetAt(shown.pose, 'press'), 'press', 'press', 135);
  };

  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const held = drag.current, shown = current.current;
    if (!held || !shown || held.id !== event.pointerId) return;
    const dx = event.clientX - held.pointerX, dy = event.clientY - held.pointerY;
    if (!held.deformationBase && Math.hypot(dx, dy) < 2) return;
    held.deformationBase ??= shown.pose;
    transition.current = null;
    const {width, height, strength} = held.deformationBase;
    const bounds = limits(sceneSize.current);
    const pull = reduced ? 0 : Math.min(1, Math.hypot(dx, dy) / 110) * clamp(settings.interactionStrength / 2.5, 0, 1.6);
    const pose = {
      x: clamp(held.start.x + dx, ...bounds.x),
      y: clamp(held.start.y + dy, ...bounds.y),
      width: clamp(width + width * .035 * pull, ...bounds.width),
      height: clamp(height - height * .026 * pull, ...bounds.height),
      strength: clamp(strength + 8 * pull, ...bounds.strength)
    };
    const time = performance.now();
    const previous = held.sample.motion === 'drag' ? held.sample : shown;
    const elapsed = Math.max(8, time - previous.time);
    held.velocity = {
      x: clamp((pose.x - previous.pose.x) / elapsed, -.24, .24),
      y: clamp((pose.y - previous.pose.y) / elapsed, -.24, .24),
      width: clamp((pose.width - previous.pose.width) / elapsed, -.08, .08),
      height: clamp((pose.height - previous.pose.height) / elapsed, -.08, .08),
      strength: clamp((pose.strength - previous.pose.strength) / elapsed, -.1, .1)
    };
    held.sample = {pose, motion: 'drag', time};
    commit(pose, 'drag', time);
  };

  const release = useCallback((id: number, over: boolean, cancelled: boolean) => {
    const held = drag.current, shown = current.current;
    if (!held || !shown || held.id !== id) return;
    drag.current = null;
    if (hit.current?.hasPointerCapture(id)) hit.current.releasePointerCapture(id);
    hovering.current = over;
    const elapsed = performance.now() - held.sample.time;
    const velocity = cancelled || latest.current.reduced || (held.deformationBase && elapsed > 90) ? {} : held.deformationBase ? held.velocity : undefined;
    const endpoint = over && !latest.current.reduced ? 'hover' : 'idle';
    const target = targetAt({
      x: shown.pose.x + (velocity?.x ?? 0) * 27,
      y: shown.pose.y + (velocity?.y ?? 0) * 27,
    }, endpoint);
    animate(target, 'settle', endpoint, 325, velocity);
  }, [animate, targetAt]);

  useEffect(() => {
    const cancel = () => { if (drag.current) release(drag.current.id, false, true); };
    const onVisibility = () => { if (document.hidden) cancel(); };
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [release]);

  const keyboardTarget = (key: string, shift = false) => {
    const shown = current.current;
    if (!shown || drag.current) return;
    const step = shift ? 38 : 16;
    const {x, y} = shown.pose;
    const {height} = sceneSize.current;
    const center = key === 'Home' ? {x: homePosition(sceneSize.current), y: height * home.y} : {
      x: x + (key === 'ArrowLeft' ? -step : key === 'ArrowRight' ? step : 0),
      y: y + (key === 'ArrowUp' ? -step : key === 'ArrowDown' ? step : 0),
    };
    const state = hovering.current && !reduced ? 'hover' : 'idle';
    const target = targetAt(center, state);
    animate(target, 'settle', state, 175);
  };
  const onKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
    event.preventDefault();
    keyboardTarget(event.key, event.shiftKey);
  };

  const light = useCallback(({width, height}: ControlledSceneSize) => environment
    ? <image data-text-lens-environment href={environment.href} width={width} height={height} preserveAspectRatio="none"/>
    : <rect width={width} height={height} fill="#FBFDFF"/>, [environment]);

  const mode = resolveGlassOptics(clock.optics);
  const {pose} = frame ?? {};
  const outline = pose ? textLensOutline(pose) : '';
  const tint = settings.specularSaturation / 3;
  const reflection = `rgb(${Math.round(255 - 44 * tint)} ${Math.round(255 - 23 * tint)} 255)`;
  const filter = `url(#${identifier}-transmission)`;
  const legacy = clock.optics === 'svg' && mode === 'svg';
  const fallback = legacy && map ? 'svg' : mode === 'flat' ? 'flat' : resolveGlassOptics('native');
  const backdrop = fallback === 'svg' ? filter : fallback === 'native' ? `blur(${settings.blurLevel * .42 + settings.progressiveBlur * .18}px)` : 'none';
  const scale = refractionEnabled ? (pose?.strength ?? 0) * settings.refractionLevel / 2 : 0;
  const blurSigma = settings.blurLevel * .095 + settings.progressiveBlur * .032;
  const studio = clock.studioLight?.gradients;
  const sampleStatus = sampleText.status === 'ready' ? '' : statusText(sampleText.status);

  return <ControlledScene className="lab-optical-scene text-lens-stage" paint={light}>
    <span data-text-lens-stage-anchor ref={anchor} aria-hidden="true"/>
    <input ref={input} className="text-lens-source" data-text-lens-source aria-label={label} aria-describedby={`${identifier}-status`}
      dir="auto" lang={language} placeholder={label} spellCheck={false} {...sampleText.inputProps}
      onFocus={() => setInputFocused(true)} onBlur={() => setInputFocused(false)}/>
    <span className="text-lens-status" id={`${identifier}-status`} role="status">{sampleStatus}</span>
    {frame && pose && outline && <div className="lab-moving-lens text-lens-body" data-local-glass="r3-free-lens" data-text-lens-body
      data-motion={frame.motion} data-frame-time={frame.time} data-transition={transition.current ? JSON.stringify(transition.current.curve) : undefined}
      data-x={pose.x} data-y={pose.y} data-width={pose.width} data-height={pose.height} data-strength={pose.strength}
      data-text-lens-angle={0} data-refraction-strength={scale}
      data-blur-level={settings.blurLevel} data-progressive-blur={settings.progressiveBlur}
      data-optics={mode} data-optical-ready={!legacy || !!map}
      style={{left: pose.x, top: pose.y, width: pose.width, height: pose.height, transform: 'translate(-50%, -50%)'}}>
      <svg className="text-lens-definitions" width={pose.width} height={pose.height} aria-hidden="true">
        <defs>
          <clipPath id={`${identifier}-clip`}><path data-text-lens-clip d={outline}/></clipPath>
          {legacy && <filter id={`${identifier}-transmission`} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse"
            x="0" y="0" width={pose.width} height={pose.height} colorInterpolationFilters="sRGB">
            <feImage href={map} width={pose.width} height={pose.height} preserveAspectRatio="none" result="field"/>
            <feGaussianBlur in="SourceGraphic" stdDeviation={blurSigma} result="surface"/>
            <feDisplacementMap data-text-lens-displacement in="surface" in2="field" scale={scale} xChannelSelector="R" yChannelSelector="G"/>
          </filter>}
          <linearGradient id={`${identifier}-rim`} href={studio ? `#${studio.rim}` : undefined}
            gradientUnits={studio ? undefined : 'userSpaceOnUse'} x1={studio ? undefined : 0} x2={studio ? undefined : 0}
            y1={studio ? undefined : 0} y2={studio ? undefined : pose.height}>
            <stop stopColor="#FFFFFF" stopOpacity=".96"/>
            <stop offset=".39" stopColor="#FFFFFF" stopOpacity=".6"/>
            <stop offset=".72" stopColor={reflection} stopOpacity=".60"/>
            <stop offset="1" stopColor="#809FE6" stopOpacity=".62"/>
          </linearGradient>
          <radialGradient id={`${identifier}-reflection`} href={studio ? `#${studio.spot}` : undefined}
            cx={studio ? undefined : '32%'} cy={studio ? undefined : '12%'} r="66%"
            gradientTransform={studio ? undefined : 'translate(0 .05) scale(1 .67)'}>
            <stop stopColor={reflection} stopOpacity=".65"/>
            <stop offset="1" stopColor={reflection} stopOpacity="0"/>
          </radialGradient>
          <radialGradient id={`${identifier}-lower-reflection`} href={studio ? `#${studio.bounce}` : undefined}
            cx={studio ? undefined : '58%'} cy={studio ? undefined : '96%'} r="51%">
            <stop stopColor={reflection} stopOpacity=".58"/>
            <stop offset="1" stopColor={reflection} stopOpacity="0"/>
          </radialGradient>
        </defs>
      </svg>
      <TextLensTransmission anchor={anchor} input={input} environment={environment?.bitmap}
        text={sampleText.draft || label} fontReady={sampleText.status === 'ready'}
        editing={inputFocused || sampleText.status === 'composing'}
        preferLinear={refractionEnabled && clock.optics === 'auto' && mode === 'svg'}
        fallback={refractionEnabled ? fallback : 'flat'} backdrop={refractionEnabled ? backdrop : 'none'}
        clip={`url(#${identifier}-clip)`} frame={{...pose, angle: 0, strength: scale,
          blurLevel: settings.blurLevel, progressiveBlur: settings.progressiveBlur}}/>
      <button ref={hit} type="button" aria-label={moveLabel} className="glass-hit text-lens-hit" data-text-lens-hit
        style={{clipPath: `path('${outline}')`}} onPointerEnter={event => updateHover(true, event)} onPointerLeave={event => updateHover(false, event)}
        onPointerDown={press} onPointerMove={move}
        onPointerUp={event => release(event.pointerId, event.pointerType !== 'touch' && document.elementFromPoint(event.clientX, event.clientY) === event.currentTarget, false)}
        onPointerCancel={event => release(event.pointerId, false, true)} onLostPointerCapture={event => release(event.pointerId, false, true)}
        onKeyDown={onKey} onClick={event => { if (event.detail === 0) keyboardTarget('Home'); }}/>
      <svg className="text-lens-surface" width={pose.width} height={pose.height} aria-hidden="true">
        <path data-text-lens-face d={outline} fill="#F0F2FF" fillOpacity={settings.glassOpacity * .52}/>
        <path d={outline} fill={`url(#${identifier}-reflection)`} opacity={settings.specularOpacity * .63}/>
        <path d={outline} fill={`url(#${identifier}-lower-reflection)`} opacity={settings.specularOpacity * .43}/>
        <path data-text-lens-rim d={outline} clipPath={`url(#${identifier}-clip)`} fill="none"
          stroke={`url(#${identifier}-rim)`} strokeWidth="2.5" strokeOpacity={settings.specularOpacity}/>
        <path className="text-lens-focus" d={outline} fill="none" stroke={primaryInk} strokeWidth="2.4"/>
      </svg>
    </div>}
  </ControlledScene>;
}
