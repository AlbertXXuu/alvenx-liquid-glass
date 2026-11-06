import { createContext, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import type {BalancedSource} from './balancedOptics';

export type ControlledSceneSize = { width: number; height: number };
export type ControlledSceneValue = {
  /** One live SVG source definition, shared by the base and optical consumers. */
  id: string;
  /** Current viewport coordinates; stable function identity, fresh scroll position. */
  bounds: () => DOMRectReadOnly;
  revision: number;
  /** Source has positive measured dimensions and has reached a painted frame. */
  ready: boolean;
  /** Optional explicit Canvas source for the selected B renderer. */
  raster?: BalancedSource;
  rasterExpected?:boolean;
};

export const ControlledSceneContext = createContext<ControlledSceneValue | null>(null);

export type ControlledSourceProps = {
  /** Existing positioned container; the source SVG occupies this element's box. */
  container: RefObject<HTMLElement | null>;
  /** Explicit shared scene, expressed in CSS pixels; include its required base fill. */
  paint: (size: ControlledSceneSize) => ReactNode;
  paintCanvas?: (context:CanvasRenderingContext2D,size:ControlledSceneSize)=>void|Promise<void>;
  /** Native transparent text above the raster; never passed through optics. */
  paintSelection?: (size:ControlledSceneSize)=>ReactNode;
  children?: ReactNode;
};

const emptyBounds: DOMRectReadOnly = {
  x: 0, y: 0, width: 0, height: 0, left: 0, top: 0, right: 0, bottom: 0,
  toJSON: () => ({ x: 0, y: 0, width: 0, height: 0, left: 0, top: 0, right: 0, bottom: 0 }),
};

/**
 * Registers an explicit source inside an existing positioned container. This is
 * ordinary SVG source filtering, not arbitrary DOM backdrop capture. Keep native
 * semantic labels/editors in children; paint supplies only registered scene items.
 * Paint may opt individual SVG text nodes into native selection with pointerEvents.
 */
export function ControlledSource({ container, paint, paintCanvas, paintSelection, children }: ControlledSourceProps) {
  const id = `alvenx-controlled-source-${useId().replace(/[^a-z0-9]/gi, '')}`;
  const [size, setSize] = useState<ControlledSceneSize>({ width: 0, height: 0 });
  const [state, setState] = useState({ ready: false, revision: 0 });
  const raster=useRef<HTMLCanvasElement>(null),ticket=useRef(0),[rasterState,setRasterState]=useState<BalancedSource|undefined>(),[shown,setShown]=useState(false),[density,setDensity]=useState(1);
  const visible=useRef(false);
  const currentContainer = useRef(container); currentContainer.current = container;
  const bounds = useCallback(() => currentContainer.current.current?.getBoundingClientRect() ?? emptyBounds, []);

  // A child's layout effects may run before the containing parent's ref is
  // attached. Passive attachment sees both external and wrapper refs reliably.
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      const next = { width: rect.width, height: rect.height };
      setSize(previous => previous.width === next.width && previous.height === next.height ? previous : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [container]);

  useEffect(()=>{
    const element=container.current;if(!element)return;
    const update=()=>{setDensity(devicePixelRatio||1);setShown(visible.current&&!document.hidden)};
    const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{visible.current=entries.some(e=>e.isIntersecting);update()});observer?.observe(element);
    if(!observer){visible.current=true;update()}
    window.addEventListener('resize',update);document.addEventListener('visibilitychange',update);
    return()=>{observer?.disconnect();window.removeEventListener('resize',update);document.removeEventListener('visibilitychange',update)};
  },[container]);
  useEffect(()=>{
    const current=++ticket.current;if(!shown||!paintCanvas||!raster.current||!(size.width>0&&size.height>0))return;
    const output=raster.current;
    let retryTimer=0,failures=0,inFlight=false;
    const attempt=()=>{
    if(current!==ticket.current||inFlight)return;
    inFlight=true;
    const work=document.createElement('canvas');
    const d=Math.min(Math.max(2,density*1.5),3,Math.sqrt(3_000_000/(size.width*size.height)),4096/size.width,4096/size.height);
    work.width=Math.max(1,Math.floor(size.width*d));work.height=Math.max(1,Math.floor(size.height*d));const ctx=work.getContext('2d');if(!ctx){inFlight=false;return;}
    ctx.scale(work.width/size.width,work.height/size.height);
    void Promise.resolve().then(()=>paintCanvas(ctx,size)).then(()=>{
      if(current!==ticket.current)return;output.width=work.width;output.height=work.height;const target=output.getContext('2d');if(!target)return;target.drawImage(work,0,0);
      setRasterState(previous=>({id,canvas:output,width:size.width,height:size.height,version:(previous?.version??0)+1}));delete output.dataset.sourceError;
    }).catch(error=>{
      if(current!==ticket.current)return;output.dataset.sourceError=String(error);setRasterState(undefined);
      // Only transient network failures retry. Visibility changes cancel this
      // effect, so hidden/offscreen sources never run a background retry loop.
      if(error?.name==='NetworkError')retryTimer=window.setTimeout(attempt,Math.min(5000,1000*2**Math.min(failures++,3)));
    }).finally(()=>{inFlight=false});
    };
    const reconnect=()=>{if(!output.dataset.sourceError||inFlight)return;clearTimeout(retryTimer);attempt();};
    window.addEventListener('online',reconnect);window.addEventListener('focus',reconnect);
    attempt();
    return()=>{ticket.current++;clearTimeout(retryTimer);window.removeEventListener('online',reconnect);window.removeEventListener('focus',reconnect);};
  },[paintCanvas,size,shown,density,id]);

  const content = useMemo(() => size.width > 0 && size.height > 0 ? paint(size) : null, [paint, size]);
  useLayoutEffect(() => {
    // Source data changes are live edits, not a new loading cycle.
    setState(previous => ({ ...previous, revision: previous.revision + 1 }));
  }, [content, size]);

  const valid = size.width > 0 && size.height > 0;
  useLayoutEffect(() => {
    if (!valid) { setState(previous => previous.ready ? { ...previous, ready: false } : previous); return; }
    // Gate only the initial positive-size transition. Including content in
    // this effect would postpone readiness forever for continuously changing
    // scenes and would briefly blank the lens on every slider value edit.
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setState(previous => ({ ...previous, ready: true })));
    });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, [valid]);

  const activeRaster=paintCanvas&&rasterState?.width===size.width&&rasterState.height===size.height?rasterState:undefined;
  const value = useMemo<ControlledSceneValue>(() => ({ id, bounds, ...state,raster:activeRaster,rasterExpected:!!paintCanvas }), [id, bounds, state,activeRaster,paintCanvas]);
  return <ControlledSceneContext.Provider value={value}>
    {paintCanvas&&<canvas ref={raster} data-controlled-raster={id} aria-hidden="true" style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',visibility:activeRaster?'visible':'hidden'}}/>}
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"
      width="100%" height="100%" viewBox={`0 0 ${Math.max(1, size.width)} ${Math.max(1, size.height)}`}
      data-controlled-source={id} data-source-ready={state.ready} data-source-revision={state.revision}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'hidden', pointerEvents: 'none' }}>
      <defs><g id={id}>{content}</g></defs>
      <use href={`#${id}`} style={{visibility:activeRaster?'hidden':undefined}} />
      {activeRaster&&paintSelection?.(size)}
    </svg>
    {children}
  </ControlledSceneContext.Provider>;
}

export type ControlledSceneProps = Omit<ControlledSourceProps, 'container'> & {
  className?: string;
  style?: CSSProperties;
};

/** A positioned scene wrapper for a standalone specimen or freely movable lens. */
export function ControlledScene({ children, paint, paintCanvas,paintSelection,className, style }: ControlledSceneProps) {
  const container = useRef<HTMLDivElement>(null);
  return <div ref={container} className={className} style={{ ...style, position: 'relative' }}>
    <ControlledSource container={container} paint={paint} paintCanvas={paintCanvas} paintSelection={paintSelection}>{children}</ControlledSource>
  </div>;
}
