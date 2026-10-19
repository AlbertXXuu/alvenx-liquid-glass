import { useContext, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { contourShape, shellPath } from './geometry';
import { createBackdropOptics, type BackdropOpticsInput } from './backdropOptics';
import type { PreviewClock } from './GlassClock';
import type { MaterialParameters } from './reviewSettings';
import { resolveGlassOptics, type GlassOpticsMode, type ResolvedGlassOptics } from './opticalSupport';
import { ControlledSceneContext } from './ControlledScene';

export type ThumbGeometry = { hostWidth:number; hostHeight:number; width:number; height:number; centerX:number; centerY:number };
export type LiquidContourFrame = { width:number; height:number; near:number; press:number; intensity:number; shiftX:number; shiftY:number };
export type LiquidControlProps = {
  id: string; clock: PreviewClock; children: ReactNode; className?: string;
  kind?: 'button' | 'field' | 'circle' | 'thumb'; type?: 'button' | 'submit'; label?: string;
  disabled?: boolean; selected?: boolean; expanded?: boolean; onClick?: () => void;
  optics?: GlassOpticsMode;
  interaction?: { pressed: boolean; focused: boolean; position?: string | number; bounds?:()=>{left:number;top:number;width:number;height:number} };
  onGeometry?: (geometry:ThumbGeometry)=>void;
  /** Optional compound contour. The same CSS-pixel path owns optics, rim,
   * clipping, focus and pointer hits; the default control geometry is unchanged. */
  contour?: (frame:LiquidContourFrame)=>string;
};
type Motion = { near: number; press: number; x: number; y: number };
type Map = ReturnType<ReturnType<typeof createBackdropOptics>['render']>;
type Frame = { path: string; width: number; height: number; near: number; press: number; intensity: number; material:MaterialParameters; focus: boolean; version: number; mode: ResolvedGlassOptics | 'scene'; source?:{id:string;x:number;y:number}; map?: Map; light: { x: number; y: number; z: number } };

/** Review-only local optics. The exact same path clips pixels and pointer hits,
 * supplies the normal map, and owns every visible edge/focus/selection stroke. */
export function LiquidControl({ id, clock, children, className = '', kind = 'button', type = 'button', label, disabled = false, selected, expanded, onClick, interaction, onGeometry, optics, contour }: LiquidControlProps) {
  const scene = useContext(ControlledSceneContext), sceneRef = useRef(scene); sceneRef.current = scene;
  const key = `review-glass-${useId().replace(/[^a-z0-9]/gi, '')}`;
  const host = useRef<HTMLDivElement>(null);
  const transmitted = useRef<SVGUseElement>(null), committed = useRef<Frame|null>(null);
  const hit = useRef<HTMLElement | null>(null);
  const engine = useRef<ReturnType<typeof createBackdropOptics> | null>(null);
  const motion = useRef<Motion>({ near: 0, press: 0, x: 0, y: 0 });
  const pressed = useRef(false), focused = useRef(false), dirty = useRef(true), sequence = useRef(0);
  const lastStrength = useRef(clock.strength);
  const lastMaterial = useRef(clock.material);
  const lastPosition = useRef({x:NaN,y:NaN});
  const disabledRef = useRef(disabled); disabledRef.current = disabled;
  const geometryListener=useRef(onGeometry);geometryListener.current=onGeometry;
  const interactionRef=useRef(interaction);interactionRef.current=interaction;
  const opticsRef=useRef(optics);opticsRef.current=optics;
  const contourRef=useRef(contour);contourRef.current=contour;
  const visible=useRef(true);
  const [error, setError] = useState('');
  const [visual, setVisual] = useState<Frame>({ path: '', width: 1, height: 1, near: 0, press: 0, intensity: clock.strength, material:clock.material, focus: false, version: 0, mode:'flat', light: { x: 0, y: 0, z: 620 } });

  useLayoutEffect(() => {
    let animating = false, pointerRevision = -1, layoutRevision = -1, lastReduced = clock.reduced;
    let lastOptics: GlassOpticsMode | undefined, failedOptics = false;
    type SceneJob={frame:Frame;input:BackdropOpticsInput;scale:number;geometry?:ThumbGeometry;epoch:number};
    let alive=true, encoding=false, queued:SceneJob|null=null;
    let epoch=0,lastMode:Frame['mode']|undefined,lastImmediateScene=false;
    const commit=(frame:Frame,geometry?:ThumbGeometry)=>{
      if(geometry)geometryListener.current?.(geometry);
      committed.current=frame;setVisual(frame);
    };
    const renderScene=(job:SceneJob)=>{
      encoding=true;if(host.current)host.current.dataset.opticalPending='true';
      const activeEngine=engine.current;
      if(!activeEngine){encoding=false;return;}
      activeEngine.renderAsync(job.input).then(raw=>{
        if(!alive||job.epoch!==epoch||sceneRef.current?.id!==job.frame.source?.id)return;
        // Complete coherent geometry/clip/rim/map frames even when a newer job
        // is waiting. Pointer values and host translations never wait for PNG.
        commit({...job.frame,map:{...raw,mapCssWidth:raw.mapCssWidth/job.scale,mapCssHeight:raw.mapCssHeight/job.scale}},job.geometry);
      }).catch(reason=>{
        if(!alive||job.epoch!==epoch||reason?.name==='AbortError')return;
        failedOptics=true;dirty.current=true;setError(String(reason));clock.wake();
      }).finally(()=>{
        encoding=false;if(host.current)host.current.dataset.opticalPending='false';
        const next=queued;queued=null;if(alive&&next&&next.epoch===epoch)renderScene(next);
      });
    };
    const draw = (delta: number) => {
      if (!host.current || !visible.current) return false;
      const requestedOptics = opticsRef.current ?? clock.optics;
      // Background animation must not force every resting control to measure
      // layout. Pointer/layout revisions wake only the necessary next frame.
      if (!dirty.current && !animating && pointerRevision === clock.pointerRevision && layoutRevision === clock.layoutRevision &&
          lastStrength.current === clock.strength && lastMaterial.current === clock.material && lastReduced === clock.reduced && lastOptics === requestedOptics) return false;
      pointerRevision = clock.pointerRevision; layoutRevision = clock.layoutRevision; lastReduced = clock.reduced;
      const opticsChanged = lastOptics !== requestedOptics;
      lastOptics = requestedOptics;
      if (opticsChanged && failedOptics) { failedOptics = false; setError(''); }
      const rect = host.current.getBoundingClientRect();
      if (!(rect.width > 0 && rect.height > 0)) return false;
      const registered = sceneRef.current;
      const mode = !failedOptics && registered?.ready && requestedOptics !== 'flat' && requestedOptics !== 'native' ? 'scene' : resolveGlassOptics(failedOptics ? 'native' : requestedOptics);
      if(lastMode!==mode){lastMode=mode;epoch++;queued=null;}
      const x = clock.pointer.x, y = clock.pointer.y;
      // Anchored thumbs use a resting reference box. Their hover deformation
      // must not feed its own positional compensation back into proximity.
      const reference=interactionRef.current?.bounds?.()??rect;
      const distance = Math.hypot(Math.max(reference.left - x, 0, x - reference.left-reference.width), Math.max(reference.top - y, 0, y - reference.top-reference.height));
      const heldThumb = kind === 'thumb' && pressed.current;
      const near = disabledRef.current ? 0 : heldThumb ? 1 : Math.max(0, 1 - distance / 28);
      const target: Motion = clock.reduced ? { near: 0, press: 0, x: 0, y: 0 } : {
        near, press: pressed.current && !disabledRef.current ? 1 : 0,
        // A held lens follows the drag position outside this component. Do not
        // chase its previous DOM position and rebuild normals for a 1px lag.
        x: heldThumb ? 0 : near * Math.max(-1, Math.min(1, (x - reference.left) / reference.width * 2 - 1)),
        y: heldThumb ? 0 : near * Math.max(-1, Math.min(1, (y - reference.top) / reference.height * 2 - 1)),
      };
      let remaining = 0;
      const blend = clock.reduced ? 1 : 1 - Math.exp(-delta / 75);
      for (const name of Object.keys(target) as Array<keyof Motion>) {
        const difference = target[name] - motion.current[name]; remaining = Math.max(remaining, Math.abs(difference));
        motion.current[name] = Math.abs(difference) < .0008 ? target[name] : motion.current[name] + difference * blend;
      }
      // Commit the final snapped frame too, so the visible path/map returns exactly.
      const moved = Math.abs(rect.x-lastPosition.current.x)>.05 || Math.abs(rect.y-lastPosition.current.y)>.05;
      animating = remaining >= .0008;
      // Browser native PNG/FileReader tasks can be deferred >100ms while a
      // touch is pending. Keep direct-touch deformation on the exact existing
      // synchronous path, including release settling; mouse/idle use async IO.
      const immediateScene=mode==='scene'&&clock.pointerType==='touch'&&(pressed.current||animating);
      if(immediateScene!==lastImmediateScene){lastImmediateScene=immediateScene;epoch++;queued=null;engine.current?.cancelPending();}
      if (!dirty.current && remaining === 0 && !moved && !opticsChanged && lastStrength.current === clock.strength && lastMaterial.current === clock.material) return false;
      dirty.current = false;
      const m = motion.current, width = rect.width, height = rect.height;
      const intensity = clock.strength; lastStrength.current = intensity;
      lastMaterial.current = clock.material;
      lastPosition.current = {x:rect.x,y:rect.y};
      const shiftX = m.x * 1.05 * intensity, shiftY = m.y * .75 * intensity;
      const insetX = Math.max(6, width * .045), insetY = 4;
      // Keep the complete current contour and its thin optical edge inside the local map.
      const w = Math.min(width - 2 * (2.5 + Math.abs(shiftX)), (width - insetX * 2) * (1 + (m.near * .012 + m.press * .018) * intensity));
      const h = Math.min(height - 2 * (2.5 + Math.abs(shiftY)), (height - insetY * 2) * (1 + (m.near * .025 - m.press * .055) * intensity));
      const shape = { ...contourShape(w, h, kind === 'thumb' ? 2.4 : 3.4), x: width / 2 + shiftX, y: height / 2 + shiftY };
      if (kind === 'circle') shape.r = Math.min(w, h) / 2;
      const geometry=kind==='thumb'?{hostWidth:width,hostHeight:height,width:w,height:h,centerX:shape.x,centerY:shape.y}:undefined;
      const path = contourRef.current?.({width,height,near:m.near,press:m.press,intensity,shiftX,shiftY}) ?? shellPath(shape);
      const stage = (host.current.closest('.stage') ?? host.current.closest('.alvenx-design')?.querySelector('.stage'))?.getBoundingClientRect();
      const light = { x: (stage?.left ?? 0) + (stage?.width ?? 1000) * .22 - rect.left,
        y: (stage?.top ?? 0) + (stage?.height ?? 560) * .08 - rect.top, z: 620 * (stage?.width ?? 1000) / 1000 };
      const version = ++sequence.current;
      try {
        // Match the shared core thickness to each control height. RG normals do not
        // depend on light; keep the unused B-channel light constant to cache
        // pure translations/material edits. Visible edge lighting still uses light.
        const scale = Math.max(3, Math.min(6, 264 / height));
        const displaced = mode === 'svg' || mode === 'scene';
        if (displaced && !engine.current) engine.current = createBackdropOptics();
        if (!displaced && engine.current) { engine.current.destroy(); engine.current = null; }
        const input:BackdropOpticsInput={ path, width:width*scale, height:height*scale, camera: { x: width / 2, y: height / 2 + 8/scale, zoom: scale }, light: {x:0,y:0,z:620}, channels:'rg', version };
        const origin = mode === 'scene' ? registered?.bounds() : undefined;
        const source = origin && registered ? {id:registered.id,x:rect.left-origin.left,y:rect.top-origin.top}:undefined;
        const frame:Frame={ path, width, height, near: m.near, press: m.press, intensity, material:clock.material, focus: focused.current, version, mode, source, light };
        if(mode==='scene'&&!immediateScene){
          // Preparing optics must not delay native focus, editing or pointer
          // ownership. The initial fallback already has the exact hit contour.
          if(!committed.current||committed.current.mode!=='scene')commit({...frame,mode:'native',source:undefined},geometry);
          const job={frame,input,scale,geometry,epoch};if(encoding)queued=job;else renderScene(job);
        }else{
          const raw=displaced?engine.current?.render(input):undefined;
          const map=raw?{...raw,mapCssWidth:raw.mapCssWidth/scale,mapCssHeight:raw.mapCssHeight/scale}:undefined;
          commit({...frame,map},geometry);
        }
      } catch (reason) { failedOptics = true; dirty.current = true; setError(String(reason)); return true; }
      return animating;
    };
    const observer = new ResizeObserver(() => { dirty.current = true; clock.wake(); });
    if (host.current) observer.observe(host.current);
    const intersection = typeof IntersectionObserver === 'undefined' ? undefined : new IntersectionObserver(entries => {
      visible.current = entries.some(entry => entry.isIntersecting);
      if (host.current) host.current.dataset.visible = String(visible.current);
      if (!visible.current) {
        // Keep the last displayed frame/cache. Already dispatched native PNG
        // serialization can finish, but do not compute a queued offscreen map.
        epoch++;queued=null;engine.current?.cancelPending();
      }
      if (visible.current) { dirty.current = true; clock.wake(); }
    });
    if (host.current) intersection?.observe(host.current);
    const unsubscribe = clock.subscribe(draw);
    const release = (event:Event) => { if('isPrimary' in event && event.isPrimary===false)return; if (pressed.current) { pressed.current = false; dirty.current = true; clock.wake(); } };
    window.addEventListener('pointerup', release); window.addEventListener('pointercancel', release); window.addEventListener('blur', release);
    return () => { alive=false;queued=null;observer.disconnect(); intersection?.disconnect(); unsubscribe(); window.removeEventListener('pointerup', release); window.removeEventListener('pointercancel', release); window.removeEventListener('blur', release); engine.current?.destroy(); engine.current = null; };
  }, [clock, kind]);
  useLayoutEffect(() => { dirty.current = true; clock.wake(); }, [disabled, selected, optics, clock]);
  useLayoutEffect(() => { dirty.current = true; clock.wake(); }, [contour, clock]);
  useLayoutEffect(() => { dirty.current = true; clock.wake(); }, [scene?.revision, scene?.ready, scene?.id, clock]);
  useLayoutEffect(() => { if (interaction) { pressed.current = interaction.pressed; focused.current = interaction.focused; dirty.current = true; clock.wake(); } }, [interaction?.pressed, interaction?.focused, clock]);
  useLayoutEffect(() => { dirty.current = true; clock.wake(); }, [interaction?.position, clock]);
  useLayoutEffect(()=>{
    // Async normals may finish after the host has moved. Register the live
    // source before paint, also after B endpoint compensation or a free drag.
    if(visual.mode!=='scene'||!host.current||!transmitted.current||!scene||scene.id!==visual.source?.id)return;
    const rect=host.current.getBoundingClientRect(),origin=scene.bounds();
    transmitted.current.setAttribute('transform',`translate(${origin.left-rect.left} ${origin.top-rect.top})`);
  },[visual.version,interaction?.position,scene?.revision,scene?.id]);

  const own = (target: EventTarget) => (target as HTMLElement).closest('[data-local-glass]') === host.current;
  const eventProps = {
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
      if (!own(event.target) || disabled || event.button !== 0 || event.isPrimary === false) return;
      pressed.current = true; dirty.current = true; clock.wake();
    },
    onFocus: (event: React.FocusEvent<HTMLElement>) => {
      if (!own(event.target)) return;
      const target=event.target as HTMLElement;
      focused.current = (kind === 'field' && (!contourRef.current || target.matches('input,textarea,select,[contenteditable="true"]'))) || target.matches(':focus-visible');
      dirty.current = true; clock.wake();
    },
    onBlur: () => { focused.current = false; pressed.current = false; dirty.current = true; clock.wake(); },
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
      if (own(event.target) && kind !== 'field' && (event.key === ' ' || event.key === 'Enter')) { pressed.current = true; dirty.current = true; clock.wake(); }
    },
    onKeyUp: () => { pressed.current = false; dirty.current = true; clock.wake(); },
  };
  const hitStyle = { clipPath: visual.path ? `path('${visual.path}')` : undefined };
  const near = visual.near * visual.intensity, press = visual.press * visual.intensity;
  const material = visual.material;
  // A 36px lens cannot use the wide card's base displacement: it would magnify
  // a switch track across its entire face and falsely read as an opaque fill.
  // Bound only the interactive gain. The user level remains effective across
  // its complete 0..3 range, including when hover/press reaches its safe gain.
  const opticalGain = Math.min(kind==='thumb'?11:18, (kind==='thumb'?6:13) + (near + press) * (kind==='thumb'?3:5));
  const strength = opticalGain * material.refractionLevel;
  const mirrorGain = material.specularOpacity / .65;
  const channel=(value:number)=>Math.round(Math.max(0,Math.min(255,value)));
  const mirrorTint = `rgb(${channel(255 - 20 * material.specularSaturation)},${channel(255 - 11 * material.specularSaturation)},255)`;
  // An eroded and smoothed current silhouette supplies a spatial thickness mask.
  // Progressive blur mixes a second blurred backdrop by this mask, not one uniform blur.
  const depthMask = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${visual.width}" height="${visual.height}"><defs><filter id="d"><feMorphology in="SourceAlpha" operator="erode" radius="3"/><feGaussianBlur stdDeviation="${Math.max(2,visual.height*.08)}"/></filter></defs><path d="${visual.path}" fill="white" filter="url(#d)"/></svg>`)}`;
  const ready = !!visual.path && (!(visual.mode === 'svg' || visual.mode === 'scene') || !!visual.map);
  const backdrop = visual.mode === 'svg' ? `url(#${key}-refraction)` : visual.mode === 'native' ? `blur(${material.blurLevel + material.progressiveBlur * .35}px) saturate(${1 + material.specularSaturation * .08})` : 'none';
  return <div ref={host} className={`liquid-unit ${className}`} data-local-glass={id} data-optical-ready={ready} data-optical-error={error || undefined}
    data-optical-mode={visual.mode} data-optical-compute-ms={visual.map?.computeMs.toFixed(3)} data-geometry-version={visual.version} data-proximity={visual.near.toFixed(4)} data-pressure={visual.press.toFixed(4)} data-refraction-strength={strength.toFixed(3)} data-strength={visual.intensity}>
    <svg className="local-optical-defs" width={visual.width} height={visual.height} aria-hidden="true">
      <defs>
        <linearGradient id={`${key}-flat`} x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stopColor="#FFFFFF" stopOpacity=".38"/><stop offset=".52" stopColor="var(--ax-glass-fill, #F0F2FF)" stopOpacity=".16"/><stop offset="1" stopColor="var(--ax-progress-end, #A092D8)" stopOpacity=".14"/></linearGradient>
        <filter id={`${key}-refraction`} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x="0" y="0" width={visual.width} height={visual.height} colorInterpolationFilters="sRGB">
          <feImage href={visual.map?.href} width={visual.map?.mapCssWidth ?? visual.width} height={visual.map?.mapCssHeight ?? visual.height} preserveAspectRatio="none" result="normal"/>
          <feGaussianBlur in="SourceGraphic" stdDeviation={material.blurLevel} result="baseBlur"/>
          <feDisplacementMap in="baseBlur" in2="normal" scale={strength} xChannelSelector="R" yChannelSelector="G" result="transmission"/>
          {material.progressiveBlur > 0 && <>
            <feImage href={depthMask} width={visual.width} height={visual.height} result="thickness"/>
            <feGaussianBlur in="transmission" stdDeviation={material.progressiveBlur} result="deepBlur"/>
            <feComposite in="deepBlur" in2="thickness" operator="in" result="deep"/>
            <feComposite in="transmission" in2="thickness" operator="out" result="shallow"/>
            <feComposite in="deep" in2="shallow" operator="arithmetic" k1="0" k2="1" k3="1" k4="0"/>
          </>}
        </filter>
        <filter id={`${key}-edge`} filterUnits="userSpaceOnUse" x="-4" y="-4" width={visual.width + 8} height={visual.height + 8} colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation={Math.max(1.1,Math.min(1.7,visual.height*.026))} result="height"/>
          <feSpecularLighting in="height" surfaceScale={Math.max(2.2,Math.min(3.5,visual.height*.055))} specularConstant={(kind === 'thumb' ? 1.4 : 1.2) * (.65 + near * .16 + press * .12) / .65} specularExponent="28" lightingColor={mirrorTint} result="light"><fePointLight x={visual.light.x} y={visual.light.y} z={visual.light.z}/></feSpecularLighting>
          <feComponentTransfer in="light" result="weightedLight"><feFuncA type="linear" slope={material.specularOpacity}/></feComponentTransfer>
          <feMorphology in="SourceAlpha" operator="erode" radius={Math.max(1.6,Math.min(2.2,visual.height*.043))} result="core"/>
          <feComposite in="SourceAlpha" in2="core" operator="out" result="bezel"/>
          <feComposite in="weightedLight" in2="bezel" operator="in" result="reflected"/>
          <>
            <feDiffuseLighting in="height" surfaceScale={Math.max(2.2,Math.min(3.5,visual.height*.055))} diffuseConstant="1" lightingColor="#FFFFFF" result="diffuse"><fePointLight x={visual.light.x} y={visual.light.y} z={visual.light.z}/></feDiffuseLighting>
            <feColorMatrix in="diffuse" type="luminanceToAlpha" result="illumination"/>
            <feComposite in="bezel" in2="illumination" operator="out" result="unlitEdge"/>
            <feFlood floodColor="var(--ax-edge-dark, #7184B0)" floodOpacity={.38*Math.min(1,material.refractionLevel)} result="edgeTint"/>
            <feComposite in="edgeTint" in2="unlitEdge" operator="in" result="darkEdge"/>
            <feMerge><feMergeNode in="darkEdge"/><feMergeNode in="reflected"/></feMerge>
          </>
        </filter>
        <filter id={`${key}-shadow`} filterUnits="userSpaceOnUse" x="-10" y="-10" width={visual.width + 20} height={visual.height + 20}>
          <feGaussianBlur in="SourceAlpha" stdDeviation={1.25 + near * .4 + press * .25} result="blur"/>
          <feOffset in="blur" dy={.8 + near * .5 - press * .2} result="offset"/>
          <feFlood floodColor="var(--ax-shadow, #59699C)" floodOpacity={.13 + near * .03 + press * .02} result="color"/>
          <feComposite in="color" in2="offset" operator="in" result="shadow"/>
          <feComposite in="shadow" in2="SourceAlpha" operator="out"/>
        </filter>
      </defs>
    </svg>
    <svg className="local-shadow" width={visual.width} height={visual.height} aria-hidden="true"><path d={visual.path} fill="#FFFFFF" filter={`url(#${key}-shadow)`}/></svg>
    {ready && visual.mode !== 'flat' && visual.mode !== 'scene' && <div className="local-backdrop" style={{ clipPath: `path('${visual.path}')`, backdropFilter: backdrop, WebkitBackdropFilter: backdrop }}/>}
    {ready && visual.mode === 'scene' && visual.source && <svg data-controlled-transmission={visual.source.id} width={visual.width} height={visual.height} aria-hidden="true" style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden',clipPath:`path('${visual.path}')`}}>
      <g filter={`url(#${key}-refraction)`}><use ref={transmitted} href={`#${visual.source.id}`} transform={`translate(${-visual.source.x} ${-visual.source.y})`}/></g>
    </svg>}
    <svg className="local-edge" width={visual.width} height={visual.height} aria-hidden="true">
      {visual.mode !== 'svg' && visual.mode !== 'scene' && <path d={visual.path} fill={`url(#${key}-flat)`}/>}
      <path d={visual.path} fill="var(--ax-glass-fill, #F0F2FF)" fillOpacity={Math.min(1,material.glassOpacity+(selected?.04:0))} stroke={mirrorTint} strokeOpacity={Math.min(1,mirrorGain*((kind==='thumb'?.65:.40) + near * .10))} strokeWidth={kind==='thumb'?1:'.7'}/>
      <path d={visual.path} fill="#FFFFFF" filter={`url(#${key}-edge)`}/>
      {(selected || visual.focus) && <path data-focus-outline={visual.focus} d={visual.path} fill="none" stroke={visual.focus ? 'var(--ax-focus, #6F82BB)' : 'var(--ax-selection, #929BCD)'} strokeWidth={visual.focus ? 1.6 : 1} strokeOpacity={visual.focus ? .8 : .48}/>}
    </svg>
    {kind === 'thumb' ? null : kind === 'field'
      ? <div {...eventProps} ref={element => { hit.current = element; }} className="glass-hit field-hit" style={hitStyle}>{children}</div>
      : <button {...eventProps} ref={element => { hit.current = element; }} type={type} className="glass-hit" style={hitStyle} disabled={disabled} aria-label={label} aria-pressed={selected} aria-expanded={expanded}
          onClick={onClick}>{children}</button>}
  </div>;
}
