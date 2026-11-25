import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { LiquidControl, type ThumbGeometry } from './LiquidControl';
import { ControlledSource } from './ControlledScene';
import type { PreviewClock } from './GlassClock';
import { endpointGeometry } from './endpointGeometry';
import { interactionCurve } from './interactionCurve';
import { PARAMETER_ROWS } from './reviewSettings';

const clamp = (value:number) => Math.max(0,Math.min(1,value));
const resistance = (excess:number,reduced:boolean) => reduced?0:Math.sign(excess)*12*(1-Math.exp(-Math.abs(excess)/32));
// Re-grabbing during release preserves the visible elastic displacement.
const excessForOffset = (offset:number) => Math.sign(offset)*-32*Math.log1p(-Math.min(Math.abs(offset),11.999999)/12);
type PointerIntent = 'pending'|'horizontal'|'vertical';
type ControlDrag = {id:number;startX:number;startY:number;lastX:number;rawProgress:number;span:number;intent:PointerIntent};
// Direct touch keeps a short undecided phase so scrolling cannot also edit a
// control. Mouse/trackpad and pen drag immediately; CSS permits vertical pan.
function resolveIntent(drag:ControlDrag,x:number,y:number):PointerIntent {
  if(drag.intent!=='pending')return drag.intent;
  const dx=Math.abs(x-drag.startX),dy=Math.abs(y-drag.startY);
  if(Math.max(dx,dy)>=6)drag.intent=dy>dx?'vertical':'horizontal';
  return drag.intent;
}
type RailGeometry = {width:number;height:number;left:number;right:number;cy:number;radius:number};
type RailCutout = {id:string;path?:string;left:number;top:number};
const thumbFullness = 2.65;
const endTangent = (Math.sqrt(7) - 1) / 3;
function railPath(left:number,width:number,cy:number,radius:number) {
  if(width<=0||radius<=0)return '';
  const right=left+width,top=cy-radius,bottom=cy+radius;
  const halfCap=Math.min(radius,width/2),start=left+halfCap,end=right-halfCap;
  const ax=halfCap*endTangent,ay=radius*endTangent,span=(end-start)/3;
  // This quarter-cubic factor gives a circular cap its exact endpoint
  // curvature. Endpoint placement still uses the track's measured radius.
  return [
    `M ${start} ${top}`,
    `C ${start+span} ${top} ${end-span} ${top} ${end} ${top}`,
    `C ${end+ax} ${top} ${right} ${cy-ay} ${right} ${cy}`,
    `C ${right} ${cy+ay} ${end+ax} ${bottom} ${end} ${bottom}`,
    `C ${end-span} ${bottom} ${start+span} ${bottom} ${start} ${bottom}`,
    `C ${start-ax} ${bottom} ${left} ${cy+ay} ${left} ${cy}`,
    `C ${left} ${cy-ay} ${start-ax} ${top} ${start} ${top} Z`,
  ].join(' ');
}

/** The same paths paint the SVG compatibility rail and the optical source. */
function GlassRail({container,geometry,track,progress,fillOpacity=1,controlledRefraction,cutout,children}:{container:RefObject<HTMLDivElement|null>;geometry:RailGeometry;track:string;progress:number;fillOpacity?:number;controlledRefraction:boolean;cutout:RailCutout;children:ReactNode}) {
  const key=`ax-controlled-rail-${useId().replace(/[^a-z0-9]/gi,'')}`;
  const {left,right,cy,radius}=geometry;
  const length=Math.max(0,right-left),fillLength=length*clamp(progress);
  const fill=railPath(left,fillLength,cy,radius);
  const paint=useCallback(()=><>
      <defs>
        <linearGradient id={`${key}-track`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="var(--ax-track-start,#CBD6ED)"/><stop offset="1" stopColor="var(--ax-track-end,#D3CFE8)"/></linearGradient>
        <linearGradient id={`${key}-progress`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="var(--ax-progress-start,#809FE6)"/><stop offset="1" stopColor="var(--ax-progress-end,#A092D8)"/></linearGradient>
        <clipPath id={`${key}-clip`}><path d={track}/></clipPath>
      </defs>
      <path data-glass-rail="track" d={track} fill={`url(#${key}-track)`}/>
      <path data-glass-rail="progress" d={fill} fill={`url(#${key}-progress)`} clipPath={`url(#${key}-clip)`} opacity={fillOpacity}/>
    </>,[key,track,fill,fillOpacity]);
  const paintCanvas=useCallback((ctx:CanvasRenderingContext2D)=>{
    const style=container.current?getComputedStyle(container.current):null;
    const color=(name:string,fallback:string)=>style?.getPropertyValue(name).trim()||fallback;
    if(!track)return;
    const paintPath=(path:Path2D,w:number,start:string,end:string)=>{
      const gradient=ctx.createLinearGradient(left,0,left+w,0);
      gradient.addColorStop(0,start);gradient.addColorStop(1,end);
      ctx.fillStyle=gradient;ctx.fill(path);
    };
    const outline=new Path2D(track);
    paintPath(outline,length,color('--ax-track-start','#CBD6ED'),color('--ax-track-end','#D3CFE8'));
    if(!fill)return;
    ctx.save();ctx.clip(outline);ctx.globalAlpha=fillOpacity;
    paintPath(new Path2D(fill),fillLength,color('--ax-progress-start','#809FE6'),color('--ax-progress-end','#A092D8'));
    ctx.restore();
  },[container,left,length,fillLength,track,fill,fillOpacity]);
  const railLight = track && <span className="glass-rail-light" data-glass-rail-light
    style={{clipPath:`path('${track}')`}} aria-hidden="true"/>;
  return controlledRefraction?<ControlledSource container={container} paint={paint} paintCanvas={paintCanvas}>
    <svg className="glass-rail-paint" aria-hidden="true" focusable="false">
      <defs><mask id={cutout.id} maskUnits="userSpaceOnUse" x="0" y="0" width={geometry.width} height={geometry.height} style={{maskType:'luminance'}}>
        <rect width={geometry.width} height={geometry.height} fill="white"/>
        {cutout.path&&<path d={cutout.path} fill="black" transform={`translate(${cutout.left} ${cutout.top})`}/>}
      </mask></defs>
    </svg>
    {railLight}
    {children}
  </ControlledSource>:<>
    <svg className="glass-rail-paint" aria-hidden="true" focusable="false">{paint()}</svg>
    {railLight}
    {children}
  </>;
}
const restShape = (width:number,height:number):ThumbGeometry => ({hostWidth:width,hostHeight:height,width:width-12,height:height-8,centerX:width/2,centerY:height/2});
function placement(rail:RailGeometry,shape:ThumbGeometry,progress:number,offset=0) {
  const geometry=endpointGeometry(shape.width,shape.height,rail.radius,thumbFullness);
  const start=rail.left+rail.radius+geometry.leftCenterFromCap;
  const end=rail.right-rail.radius+geometry.rightCenterFromCap;
  return {left:start+(end-start)*progress-shape.centerX+offset,top:rail.cy-shape.centerY,start,end,span:Math.max(1,end-start),...geometry};
}
/** The fixed rail and displayed C2 shell determine the host placement together.
 * Pointer proximity uses a resting reference, never the compensated hover box. */
function useLensAnchor(hostWidth:number,hostHeight:number,progress:number,offset:number) {
  const rail=useRef<HTMLDivElement>(null),track=useRef<HTMLDivElement>(null);
  const cutoutId=`ax-control-cutout-${useId().replace(/[^a-z0-9]/gi,'')}`;
  const [layout,setLayout]=useState<RailGeometry>({width:300,height:44,left:14,right:286,cy:22,radius:4.5});
  const [shape,setShape]=useState(()=>restShape(hostWidth,hostHeight));
  const [hovered,setHovered]=useState(false);
  const current=useRef({layout,shape,progress,offset});current.current={layout,shape,progress,offset};
  useLayoutEffect(()=>{
    const measure=()=>{
      if(!rail.current||!track.current)return;
      const r=rail.current.getBoundingClientRect(),t=track.current.getBoundingClientRect();
      const next={width:r.width,height:r.height,left:t.left-r.left,right:t.right-r.left,cy:t.top-r.top+t.height/2,radius:t.height/2};
      setLayout(old=>Object.keys(next).every(k=>Math.abs(old[k as keyof RailGeometry]-next[k as keyof RailGeometry])<.001)?old:next);
    };
    measure();const observer=new ResizeObserver(measure);if(rail.current)observer.observe(rail.current);if(track.current)observer.observe(track.current);
    return()=>observer.disconnect();
  },[]);
  const onGeometry=useCallback((next:ThumbGeometry)=>{
    current.current.shape=next;
    setShape(old=>Object.keys(next).every(k=>old[k as keyof ThumbGeometry]===next[k as keyof ThumbGeometry])?old:next);
  },[]);
  const inputPlacement=useCallback(()=>{
    const s=current.current;
    return placement(s.layout,restShape(s.shape.hostWidth,s.shape.hostHeight),s.progress,s.offset);
  },[]);
  const bounds=useCallback(()=>{
    const r=rail.current!.getBoundingClientRect(),rest=current.current.shape,p=inputPlacement();
    return {left:r.left+p.left,top:r.top+p.top,width:rest.hostWidth,height:rest.hostHeight};
  },[inputPlacement]);
  const updateHover=(event:React.PointerEvent)=>{
    if(event.isPrimary===false)return;
    if(event.pointerType==='touch'){setHovered(false);return;}
    const {left,top,width,height}=bounds(),{clientX:x,clientY:y}=event;
    // A small exit margin absorbs pointer rounding at the stable native edge.
    const margin=hovered?2:0;
    setHovered(x>=left-margin&&x<=left+width+margin&&y>=top-margin&&y<=top+height+margin);
  };
  const clearHover=()=>setHovered(false);
  // Reserve B's resting gap inside the original visible footprint. Rail bounds
  // depend only on resting host dimensions, never animated shell width/height.
  const rest=restShape(shape.hostWidth,shape.hostHeight);
  const trackInset=6+endpointGeometry(rest.width,rest.height,layout.radius,thumbFullness).gap;
  const outline=railPath(layout.left,layout.right-layout.left,layout.cy,layout.radius);
  const railStyle={'--ax-rail-cutout':`url(#${cutoutId})`} as React.CSSProperties;
  const positioned=placement(layout,shape,progress,offset);
  const cutout={id:cutoutId,path:shape.path,left:positioned.left,top:positioned.top};
  return {rail,track,shape,onGeometry,hovered,updateHover,clearHover,inputPlacement,trackInset,railGeometry:layout,outline,railStyle,cutout,...positioned};
}
type CubicTravel = {from:number;to:number;elapsed:number};
const returnDuration=325,switchDuration=250;
function advanceTravel(value:number,target:number,travel:CubicTravel|null,delta:number,duration:number,reduced:boolean) {
  if(reduced||value===target)return {value:target,travel:null};
  const segment=travel?.to===target?travel:{from:value,to:target,elapsed:0};
  segment.elapsed=Math.min(duration,segment.elapsed+delta);
  if(segment.elapsed===duration)return {value:target,travel:null};
  // [from, from, to, to] begins and ends with a horizontal time tangent.
  return {value:interactionCurve(segment.from,segment.from,target,segment.elapsed/duration),travel:segment};
}

const normalizeNumberText=(raw:string)=>raw.trim().replace(/[０-９．＋－Ｅｅ]/g,char=>String.fromCharCode(char.charCodeAt(0)-0xFEE0));
const completeNumber=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
function parseNumberText(raw:string) {
  if(raw.length>32)return null;
  const text=normalizeNumberText(raw),value=completeNumber.test(text)?Number(text):NaN;
  return Number.isFinite(value)?{text,value}:null;
}
/** Decimal half-up rounding from the complete input, including finite exponent
 * notation. Avoid binary .toFixed tie errors; values are range-clamped first. */
function roundDecimal(text:string,precision:number) {
  const negative=text.startsWith('-'),[mantissa,exponent='0']=text.replace(/^[+-]/,'').toLowerCase().split('e');
  const [whole,fraction='']=mantissa.split('.'),digits=(whole+fraction).replace(/^0+/,'')||'0';
  const shift=Number(exponent)+precision-fraction.length;
  if(digits==='0'||shift < -digits.length-1)return 0;
  let units=BigInt(digits);
  if(shift>=0)units*=10n**BigInt(shift);
  else {const divisor=10n**BigInt(-shift);units=(units+divisor/2n)/divisor;}
  const result=Number(units)*(negative?-1:1)/10**precision;
  return Object.is(result,-0)?0:result;
}

/** Text editing keeps IME/paste/selection native. A complete finite draft is
 * normalized only on commit; untouched focus/blur never quantizes pointer values. */
export type GlassNumberProps = {id:string;label:string;value:number;min:number;max:number;precision:number;unit:string;clock:PreviewClock;onCommit:(value:number)=>void;locale?:'en'|'zh-CN'};
export function GlassNumber({id,label,value,min,max,precision,unit,clock,onCommit,locale='en'}:GlassNumberProps) {
  const format=(next:number)=>String(roundDecimal(String(next),precision));
  const chinese=locale==='zh-CN';
  const [draft,setDraft]=useState(format(value)),[editing,setEditing]=useState(false),[notice,setNotice]=useState(''),[compositionActive,setCompositionActive]=useState(false);
  const skipBlur=useRef(false),dirty=useRef(false),composing=useRef(false),noticeValue=useRef(value);
  useEffect(()=>{if(!editing&&value!==noticeValue.current)setNotice('');},[value,editing]);
  useEffect(()=>setNotice(''),[locale]);
  const commit=()=>{
    if(composing.current)return;
    if(!dirty.current){setEditing(false);return;}
    const parsed=parseNumberText(draft);
    if(!parsed){setDraft(format(value));noticeValue.current=value;setNotice(`${min}–${max} · ${chinese?'已恢复为':'Restored'} ${format(value)}`);}
    else {
      const bounded=Math.max(min,Math.min(max,parsed.value));
      const rounded=bounded!==parsed.value?bounded:roundDecimal(parsed.text,precision);
      const next=Math.max(min,Math.min(max,rounded));
      noticeValue.current=next;onCommit(next);setDraft(format(next));
      setNotice(bounded!==parsed.value?`${min}–${max} · ${chinese?'已设为':'Set to'} ${format(next)}`:next!==parsed.value?`${min}–${max} · ${chinese?'已四舍五入为':'Rounded to'} ${format(next)}`:'');
    }
    dirty.current=false;setEditing(false);
  };
  const parsedDraft=parseNumberText(draft);
  const invalid=editing&&dirty.current&&!compositionActive&&(!parsedDraft||parsedDraft.value<min||parsedDraft.value>max);
  return <span className="parameter-value">
    <LiquidControl id={`${id}-number`} kind="field" clock={clock} className="parameter-number-glass">
      <input id={`number-${id}`} className="parameter-number" type="text" role="spinbutton" inputMode="decimal" maxLength={32} aria-valuemin={min} aria-valuemax={max} aria-valuenow={editing&&parsedDraft&& !invalid?parsedDraft.value:value} aria-invalid={invalid||undefined} aria-label={`${label}${chinese?'数值':' value'}`} aria-describedby={`number-hint-${id} number-notice-${id}`} value={editing?draft:format(value)}
        onFocus={()=>{setDraft(format(value));dirty.current=false;setEditing(true);setNotice('');}}
        onChange={event=>{dirty.current=true;setDraft(event.currentTarget.value);setNotice('');}}
        onCompositionStart={()=>{composing.current=true;setCompositionActive(true);}}
        onCompositionEnd={event=>{composing.current=false;setCompositionActive(false);if(document.activeElement===event.currentTarget){dirty.current=true;setDraft(event.currentTarget.value);}else{dirty.current=false;setDraft(format(value));}}}
        onPaste={event=>{
          const input=event.currentTarget,text=event.clipboardData.getData('text'),length=input.value.length-(input.selectionEnd!-input.selectionStart!)+text.length;
          if(length>32){event.preventDefault();noticeValue.current=value;setNotice(chinese?'最多 32 个字符 · 已忽略粘贴':'Max 32 characters · Paste ignored');}
        }}
        onBlur={()=>{if(skipBlur.current){skipBlur.current=false;return;}if(composing.current){dirty.current=false;setEditing(false);setDraft(format(value));return;}commit();}}
        onKeyDown={event=>{
          if(composing.current||event.nativeEvent.isComposing||event.nativeEvent.keyCode===229)return;
          if(event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
          if(event.key==='Escape'){event.preventDefault();skipBlur.current=true;dirty.current=false;setEditing(false);setDraft(format(value));noticeValue.current=value;setNotice(chinese?'已取消编辑':'Edit cancelled');event.currentTarget.blur();}
          else if(event.key==='Enter'){event.preventDefault();commit();skipBlur.current=true;event.currentTarget.blur();}
          else if(['ArrowUp','ArrowDown','Home','End'].includes(event.key)) {
            event.preventDefault();const parsed=parsedDraft??{value,text:String(value)},bounded=Math.max(min,Math.min(max,parsed.value));
            const current=bounded!==parsed.value?bounded:roundDecimal(parsed.text,precision),scale=10**precision;
            const stepped=(Math.round(current*scale)+(event.key==='ArrowUp'?1:-1))/scale;
            const next=event.key==='Home'?min:event.key==='End'?max:Math.max(min,Math.min(max,stepped));
            dirty.current=false;noticeValue.current=next;setDraft(format(next));setNotice('');onCommit(next);
          }
        }}/>
    </LiquidControl>
    <span className="parameter-unit" aria-hidden="true">{unit}</span>
    <span className="visually-hidden" id={`number-hint-${id}`}>{chinese?`范围 ${min} 至 ${max}${unit?' '+unit:''}。最多保留 ${precision} 位小数。按 Enter 或离开输入框应用，按 Escape 取消。`:`Range ${min} to ${max}${unit?' '+unit:''}. Up to ${precision} decimal places. Enter or leave the field to apply. Escape cancels.`}</span>
    <span className="parameter-number-notice" id={`number-notice-${id}`} role="status" aria-live="polite">{notice}</span>
  </span>;
}

/** Pointer input is continuous; configured steps belong only to keyboard input.
 * Deltas preserve the grab point during shell morphs. Release starts a cubic return. */
export type GlassSliderProps = {id:string;label:string;value:number;min:number;max:number;step:number;unit?:string;precision?:number;clock:PreviewClock;onChange:(value:number)=>void;controlledRefraction?:boolean;locale?:'en'|'zh-CN'};
export function GlassSlider({ id,label,value,min,max,step,unit='',precision:customPrecision=2,clock,onChange,controlledRefraction=true,locale='en' }: GlassSliderProps) {
  if (![min,max,step,value].every(Number.isFinite) || min>=max || step<=0) {
    throw new RangeError('GlassSlider requires finite value/min/max, min < max, and a finite positive keyboard step.');
  }
  const [pressed,setPressed]=useState(false),[focused,setFocused]=useState(false);
  const [displayPosition,setDisplayPosition]=useState({progress:(value-min)/(max-min),offset:0});
  const anchor=useLensAnchor(64,44,displayPosition.progress,displayPosition.offset);
  const state=useRef({value,progress:(value-min)/(max-min),offset:0,recovery:null as CubicTravel|null,drag:null as null|ControlDrag,pending:null as null|{value:number;progress:number;offset:number}});
  const bounds=useRef({min,max}),native=useRef<HTMLInputElement>(null);
  const change=useRef(onChange);change.current=onChange;
  const release=(cancel=false)=>{
    const s=state.current,id=s.drag?.id;
    if(cancel)s.pending=null;
    s.drag=null;setPressed(false);
    if(id!==undefined&&native.current?.hasPointerCapture(id))native.current.releasePointerCapture(id);
    clock.wake();
  };
  useLayoutEffect(()=>clock.subscribe(delta=>{
    const s=state.current;let changed=false;
    if(s.pending){const p=s.pending;s.pending=null;s.progress=p.progress;s.offset=p.offset;s.recovery=null;changed=true;
      if(p.value!==s.value){s.value=p.value;change.current(p.value);}}
    if(s.offset!==0&&(!s.drag||clock.reduced)){
      const next=advanceTravel(s.offset,0,s.recovery,delta,returnDuration,clock.reduced);
      s.offset=next.value;s.recovery=next.travel;changed=true;
    }
    if(changed)setDisplayPosition({progress:s.progress,offset:s.offset});
    return s.offset!==0&&!s.drag;
  }),[clock]);
  useLayoutEffect(()=>{
    const s=state.current,rangeChanged=bounds.current.min!==min||bounds.current.max!==max;
    bounds.current={min,max};
    if(rangeChanged){
      const pointerId=s.drag?.id;s.drag=null;s.pending=null;setPressed(false);
      if(pointerId!==undefined&&native.current?.hasPointerCapture(pointerId))native.current.releasePointerCapture(pointerId);
      s.value=Math.max(min,Math.min(max,value));s.progress=(s.value-min)/(max-min);s.offset=0;s.recovery=null;
      setDisplayPosition({progress:s.progress,offset:0});
      if(s.value!==value)change.current(s.value);
      clock.wake();
    }else if(!s.drag&&!s.pending&&value!==s.value){s.value=value;s.progress=(value-min)/(max-min);s.offset=0;s.recovery=null;setDisplayPosition({progress:s.progress,offset:0});}
  },[value,min,max,clock]);
  useEffect(()=>{
    // A queued keyboard edit is already an intentional value change. Blur only
    // cancels unpainted pointer input when this control owns an active drag.
    const blur=()=>release(Boolean(state.current.drag)),cancel=(event:PointerEvent)=>{if(state.current.drag?.id===event.pointerId)release(true);};
    window.addEventListener('blur',blur);window.addEventListener('pointercancel',cancel);
    return()=>{window.removeEventListener('blur',blur);window.removeEventListener('pointercancel',cancel);};
  },[clock]);
  const queuePointer=(clientX:number)=>{
    const s=state.current,d=s.drag;if(!d)return;
    const {span}=anchor.inputPlacement(),legal=clamp(d.rawProgress);d.rawProgress=legal+(d.rawProgress-legal)*d.span/span+(clientX-d.lastX)/span;d.span=span;d.lastX=clientX;
    const progress=clamp(d.rawProgress),offset=resistance((d.rawProgress-progress)*span,clock.reduced);
    s.pending={value:min+progress*(max-min),progress,offset};clock.wake();
  };
  const queueValue=(next:number)=>{next=Math.max(min,Math.min(max,next));state.current.pending={value:next,progress:(next-min)/(max-min),offset:0};clock.wake();};
  const commitNumber=(next:number)=>{release(true);const s=state.current;s.value=next;s.progress=(next-min)/(max-min);s.offset=0;s.recovery=null;setDisplayPosition({progress:s.progress,offset:0});change.current(next);clock.wake();};
  // Approved parameter ids retain their exact precision contract. Other sliders
  // may choose a readable 0–6 digit decimal field without quantizing dragging.
  const precision=PARAMETER_ROWS.find(row=>row.key===id)?.precision??(Number.isFinite(customPrecision)?Math.max(0,Math.min(6,Math.trunc(customPrecision))):2);
  const progress=displayPosition.progress,display=unit==='×'?`${value.toFixed(1)}×`:`${Number(value.toFixed(3))}${unit?` ${unit}`:''}`;
  const railChildren=<>
      <div ref={anchor.track} className="range-track" style={{left:anchor.trackInset,right:anchor.trackInset}} aria-hidden="true"/>
      <div className="range-thumb-position" style={{left:anchor.left,top:anchor.top}}>
        <LiquidControl id={`${id}-thumb`} kind="thumb" clock={clock} className="range-thumb" interaction={{pressed,focused,hovered:anchor.hovered,position:`${anchor.left}:${anchor.top}`}} onGeometry={anchor.onGeometry}>{null}</LiquidControl>
      </div>
      <input ref={native} id={`range-${id}`} aria-label={label} aria-valuetext={display} className="glass-range" type="range" min={min} max={max} step="any" value={value}
        onChange={event=>{if(!state.current.drag)queueValue(event.currentTarget.valueAsNumber);}}
        onPointerDown={event=>{
          if(event.button!==0)return;
          if(event.isPrimary===false||state.current.drag){event.preventDefault();return;}
          event.preventDefault();event.currentTarget.focus({preventScroll:true});event.currentTarget.setPointerCapture(event.pointerId);setPressed(true);
          const r=anchor.rail.current!.getBoundingClientRect(),s=state.current,p=anchor.inputPlacement(),local=event.clientX-r.left;
          const centre=anchor.left+anchor.shape.centerX,within=Math.abs(local-centre)<=anchor.shape.width/2;
          // Seed from the committed visible frame: the clock's cubic return
          // may already be one React commit ahead when pointerdown arrives.
          s.progress=displayPosition.progress;s.offset=displayPosition.offset;s.pending=null;
          const rawProgress=within?s.progress+excessForOffset(s.offset)/p.span:(local-p.start)/p.span;
          s.drag={id:event.pointerId,startX:event.clientX,startY:event.clientY,lastX:event.clientX,rawProgress,span:p.span,intent:event.pointerType==='touch'?'pending':'horizontal'};
          s.recovery=null;if(s.drag.intent==='horizontal')queuePointer(event.clientX);else clock.wake();
        }}
        onPointerEnter={anchor.updateHover} onPointerLeave={anchor.clearHover}
        onPointerMove={event=>{
          const d=state.current.drag;
          if(!d){anchor.updateHover(event);return;}
          if(d.id===event.pointerId&&resolveIntent(d,event.clientX,event.clientY)==='horizontal')queuePointer(event.clientX);
        }}
        onPointerUp={event=>{
          const d=state.current.drag;if(d?.id!==event.pointerId)return;
          const intent=resolveIntent(d,event.clientX,event.clientY);
          if(intent!=='vertical')queuePointer(event.clientX);
          release(intent==='vertical');anchor.updateHover(event);
        }}
        onPointerCancel={event=>{if(state.current.drag?.id===event.pointerId)release(true);}}
        onLostPointerCapture={event=>{if(state.current.drag?.id===event.pointerId)release(true);}}
        onFocus={event=>setFocused(event.currentTarget.matches(':focus-visible'))} onBlur={()=>{setFocused(false);release(Boolean(state.current.drag));}}
        onKeyDown={event=>{
          const key=event.key;if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(key))return;
          event.preventDefault();setPressed(true);setFocused(true);
          const current=state.current.pending?.value??state.current.value,up=['ArrowRight','ArrowUp','PageUp'].includes(key),count=key.startsWith('Page')?10:1;
          const index=up?Math.floor((current-min)/step+1e-8)+count:Math.ceil((current-min)/step-1e-8)-count;
          queueValue(key==='Home'?min:key==='End'?max:Number((min+index*step).toFixed(12)));
        }} onKeyUp={()=>setPressed(false)}/>
  </>;
  return <div className="parameter-row">
    <div className="parameter-label"><label htmlFor={`number-${id}`}>{label}</label><GlassNumber id={id} label={label} value={value} min={min} max={max} precision={precision} unit={unit} clock={clock} onCommit={commitNumber} locale={locale}/></div>
    <div ref={anchor.rail} className="range-rail" style={anchor.railStyle} data-progress={progress.toFixed(6)} data-overshoot={displayPosition.offset.toFixed(3)} data-end-radius={anchor.radius} data-end-gap={anchor.gap}>
      <GlassRail container={anchor.rail} geometry={anchor.railGeometry} track={anchor.outline} progress={progress} controlledRefraction={controlledRefraction} cutout={anchor.cutout}>{railChildren}</GlassRail>
    </div>
  </div>;
}

/** The legal value is discrete; display position and elastic overscroll are not. */
export type GlassSwitchProps = {id:string;label:string;checked:boolean;clock:PreviewClock;onChange:(checked:boolean)=>void;disabled?:boolean;controlledRefraction?:boolean};
export function GlassSwitch({id,label,checked,clock,onChange,disabled=false,controlledRefraction=true}:GlassSwitchProps) {
  const [pressed,setPressed]=useState(false),[focused,setFocused]=useState(false),[display,setDisplay]=useState({position:checked?1:0,offset:0});
  const anchor=useLensAnchor(63.36,42.24,display.position,display.offset);
  const native=useRef<HTMLButtonElement>(null);
  const state=useRef({position:checked?1:0,target:checked?1:0,reported:checked,offset:0,travel:null as CubicTravel|null,recovery:null as CubicTravel|null,
    drag:null as null|(ControlDrag&{initialChecked:boolean;maxDistance:number}),pending:null as null|{position:number;offset:number}});
  const change=useRef(onChange);change.current=onChange;
  const report=(next:boolean)=>{if(next!==state.current.reported){state.current.reported=next;change.current(next);}};
  const settle=(next?:boolean,cancel=false)=>{
    const s=state.current,id=s.drag?.id;
    if(cancel)s.pending=null;
    if(next!==undefined)report(next);else if(s.pending)report(s.pending.position>=.5);
    s.drag=null;s.target=s.reported?1:0;setPressed(false);
    if(id!==undefined&&native.current?.hasPointerCapture(id))native.current.releasePointerCapture(id);
    clock.wake();
  };
  useLayoutEffect(()=>clock.subscribe(delta=>{
    const s=state.current;let changed=false;
    if(s.pending){s.position=s.pending.position;s.offset=s.pending.offset;s.recovery=null;s.travel=null;s.pending=null;changed=true;if(s.drag)report(s.position>=.5);}
    if(!s.drag&&s.position!==s.target){
      const next=advanceTravel(s.position,s.target,s.travel,delta,switchDuration,clock.reduced);
      s.position=next.value;s.travel=next.travel;changed=true;
    }
    if(s.offset!==0&&(!s.drag||clock.reduced)){
      const next=advanceTravel(s.offset,0,s.recovery,delta,returnDuration,clock.reduced);
      s.offset=next.value;s.recovery=next.travel;changed=true;
    }
    if(changed)setDisplay({position:s.position,offset:s.offset});
    return !s.drag&&(s.position!==s.target||s.offset!==0);
  }),[clock]);
  useLayoutEffect(()=>{
    const s=state.current;s.reported=checked;s.target=checked?1:0;
    if(disabled)settle(undefined,true);clock.wake();
  },[checked,disabled,clock]);
  useEffect(()=>{
    const stop=()=>settle(undefined,true),cancel=(event:PointerEvent)=>{if(state.current.drag?.id===event.pointerId)settle(undefined,true);};
    window.addEventListener('blur',stop);window.addEventListener('pointercancel',cancel);
    return()=>{window.removeEventListener('blur',stop);window.removeEventListener('pointercancel',cancel);};
  },[clock]);
  const queuePointer=(x:number)=>{
    const s=state.current,d=s.drag;if(!d)return;
    const {span}=anchor.inputPlacement(),legal=clamp(d.rawProgress);d.rawProgress=legal+(d.rawProgress-legal)*d.span/span+(x-d.lastX)/span;d.span=span;d.lastX=x;d.maxDistance=Math.max(d.maxDistance,Math.abs(x-d.startX));
    const position=clamp(d.rawProgress);s.pending={position,offset:resistance((d.rawProgress-position)*span,clock.reduced)};clock.wake();
  };
  const railChildren=<>
    <div ref={anchor.track} className="switch-track" style={{left:anchor.trackInset,right:anchor.trackInset}} aria-hidden="true"/>
    <div className="switch-thumb-position" style={{left:anchor.left,top:anchor.top}}><LiquidControl id={`${id}-thumb`} kind="thumb" clock={clock} className="switch-thumb" disabled={disabled} interaction={{pressed,focused,hovered:!disabled&&anchor.hovered,position:`${anchor.left}:${anchor.top}`}} onGeometry={anchor.onGeometry}>{null}</LiquidControl></div>
  </>;
  return <div className="switch-control"><span>{label}{disabled&&<small> · System</small>}</span><div className="switch-body" data-position={display.position.toFixed(6)} data-overshoot={display.offset.toFixed(3)} data-end-radius={anchor.radius} data-end-gap={anchor.gap}>
    <div ref={anchor.rail} className="switch-visual" style={anchor.railStyle}><GlassRail container={anchor.rail} geometry={anchor.railGeometry} track={anchor.outline} progress={display.position} fillOpacity={checked?1:.78} controlledRefraction={controlledRefraction} cutout={anchor.cutout}>{railChildren}</GlassRail></div>
    <button ref={native} type="button" className="switch-native" role="switch" aria-label={label} aria-checked={checked} disabled={disabled}
      onPointerDown={e=>{
        if(e.button!==0||e.isPrimary===false||state.current.drag||disabled)return;
        e.preventDefault();e.currentTarget.focus({preventScroll:true});e.currentTarget.setPointerCapture(e.pointerId);setPressed(true);
        const s=state.current,{span}=anchor.inputPlacement();s.position=display.position;s.offset=display.offset;s.pending=null;
        s.drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,lastX:e.clientX,rawProgress:s.position+excessForOffset(s.offset)/span,span,initialChecked:s.reported,maxDistance:0,intent:e.pointerType==='touch'?'pending':'horizontal'};
        s.recovery=null;s.travel=null;clock.wake();
      }}
      onPointerEnter={anchor.updateHover} onPointerLeave={anchor.clearHover}
      onPointerMove={e=>{
        const d=state.current.drag;
        if(!d){anchor.updateHover(e);return;}
        if(d.id!==e.pointerId)return;
        d.maxDistance=Math.max(d.maxDistance,Math.abs(e.clientX-d.startX),Math.abs(e.clientY-d.startY));
        if(resolveIntent(d,e.clientX,e.clientY)==='horizontal')queuePointer(e.clientX);
      }}
      onPointerUp={e=>{
        const d=state.current.drag;if(d?.id!==e.pointerId)return;
        d.maxDistance=Math.max(d.maxDistance,Math.abs(e.clientX-d.startX),Math.abs(e.clientY-d.startY));
        const intent=resolveIntent(d,e.clientX,e.clientY);
        if(intent==='vertical'){settle(undefined,true);return;}
        if(intent==='horizontal')queuePointer(e.clientX);
        settle(d.maxDistance<6?!d.initialChecked:(state.current.pending?.position??state.current.position)>=.5);anchor.updateHover(e);
      }}
      onPointerCancel={e=>{if(state.current.drag?.id===e.pointerId)settle(undefined,true);}}
      onLostPointerCapture={e=>{if(state.current.drag?.id===e.pointerId)settle(undefined,true);}}
      onClick={e=>{if(e.detail===0&&!('pointerType' in e.nativeEvent&&e.nativeEvent.pointerType))settle(!state.current.reported);}}
      onKeyDown={e=>{if(e.key===' '||e.key==='Enter')setPressed(true);}} onKeyUp={()=>setPressed(false)}
      onFocus={e=>setFocused(e.currentTarget.matches(':focus-visible'))} onBlur={()=>{setFocused(false);settle(undefined,true);}}/>
  </div></div>;
}
