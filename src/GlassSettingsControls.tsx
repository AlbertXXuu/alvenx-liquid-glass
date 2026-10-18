import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LiquidControl, type ThumbGeometry } from './LiquidControl';
import type { PreviewClock } from './GlassClock';
import { endpointGeometry } from './endpointGeometry';
import { PARAMETER_ROWS } from './reviewSettings';

const clamp = (value:number) => Math.max(0,Math.min(1,value));
const resistance = (excess:number,reduced:boolean) => reduced?0:Math.sign(excess)*12*(1-Math.exp(-Math.abs(excess)/32));
// Re-grabbing during release preserves the visible elastic displacement.
const excessForOffset = (offset:number) => Math.sign(offset)*-32*Math.log1p(-Math.min(Math.abs(offset),11.999999)/12);
type RailGeometry = {left:number;right:number;cy:number;radius:number};
const restShape = (width:number,height:number):ThumbGeometry => ({hostWidth:width,hostHeight:height,width:width-12,height:height-8,centerX:width/2,centerY:height/2});
function placement(rail:RailGeometry,shape:ThumbGeometry,progress:number,offset=0) {
  const geometry=endpointGeometry(shape.width,shape.height,rail.radius);
  const start=rail.left+rail.radius+geometry.leftCenterFromCap;
  const end=rail.right-rail.radius+geometry.rightCenterFromCap;
  return {left:start+(end-start)*progress-shape.centerX+offset,top:rail.cy-shape.centerY,start,end,span:Math.max(1,end-start),...geometry};
}
/** The fixed rail and displayed C2 shell determine the host placement together.
 * Pointer proximity uses a resting reference, never the compensated hover box. */
function useLensAnchor(hostWidth:number,hostHeight:number,progress:number,offset:number) {
  const rail=useRef<HTMLDivElement>(null),track=useRef<HTMLDivElement>(null);
  const [layout,setLayout]=useState<RailGeometry>({left:14,right:286,cy:22,radius:4.5});
  const [shape,setShape]=useState(()=>restShape(hostWidth,hostHeight));
  const current=useRef({layout,shape,progress,offset});current.current={layout,shape,progress,offset};
  useLayoutEffect(()=>{
    const measure=()=>{
      if(!rail.current||!track.current)return;
      const r=rail.current.getBoundingClientRect(),t=track.current.getBoundingClientRect();
      const next={left:t.left-r.left,right:t.right-r.left,cy:t.top-r.top+t.height/2,radius:t.height/2};
      setLayout(old=>Object.keys(next).every(k=>Math.abs(old[k as keyof RailGeometry]-next[k as keyof RailGeometry])<.001)?old:next);
    };
    measure();const observer=new ResizeObserver(measure);if(rail.current)observer.observe(rail.current);if(track.current)observer.observe(track.current);
    return()=>observer.disconnect();
  },[]);
  const onGeometry=useCallback((next:ThumbGeometry)=>{
    current.current.shape=next;
    setShape(old=>Object.keys(next).every(k=>old[k as keyof ThumbGeometry]===next[k as keyof ThumbGeometry])?old:next);
  },[]);
  const bounds=useCallback(()=>{
    const s=current.current,r=rail.current!.getBoundingClientRect(),rest=restShape(s.shape.hostWidth,s.shape.hostHeight),p=placement(s.layout,rest,s.progress,s.offset);
    return {left:r.left+p.left,top:r.top+p.top,width:rest.hostWidth,height:rest.hostHeight};
  },[]);
  const getPlacement=()=>{const s=current.current;return placement(s.layout,s.shape,s.progress,s.offset);};
  // Reserve B's resting gap inside the original visible footprint. Rail bounds
  // depend only on resting host dimensions, never animated shell width/height.
  const rest=restShape(shape.hostWidth,shape.hostHeight);
  const trackInset=6+endpointGeometry(rest.width,rest.height,layout.radius).gap;
  return {rail,track,shape,onGeometry,bounds,getPlacement,trackInset,...placement(layout,shape,progress,offset)};
}
function spring(s:{offset:number;velocity:number},delta:number,reduced:boolean) {
  if(reduced||Math.abs(s.offset)<.01){s.offset=0;s.velocity=0;return;}
  const dt=delta/1000,omega=20,e=Math.exp(-omega*dt),c=s.velocity+omega*s.offset;
  s.offset=(s.offset+c*dt)*e;s.velocity=(s.velocity-omega*c*dt)*e;
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
export type GlassNumberProps = {id:string;label:string;value:number;min:number;max:number;precision:number;unit:string;clock:PreviewClock;onCommit:(value:number)=>void};
export function GlassNumber({id,label,value,min,max,precision,unit,clock,onCommit}:GlassNumberProps) {
  const format=(next:number)=>String(roundDecimal(String(next),precision));
  const [draft,setDraft]=useState(format(value)),[editing,setEditing]=useState(false),[notice,setNotice]=useState(''),[compositionActive,setCompositionActive]=useState(false);
  const skipBlur=useRef(false),dirty=useRef(false),composing=useRef(false),noticeValue=useRef(value);
  useEffect(()=>{if(!editing&&value!==noticeValue.current)setNotice('');},[value,editing]);
  const commit=()=>{
    if(composing.current)return;
    if(!dirty.current){setEditing(false);return;}
    const parsed=parseNumberText(draft);
    if(!parsed){setDraft(format(value));noticeValue.current=value;setNotice(`${min}–${max} · Restored ${format(value)}`);}
    else {
      const bounded=Math.max(min,Math.min(max,parsed.value));
      const rounded=bounded!==parsed.value?bounded:roundDecimal(parsed.text,precision);
      const next=Math.max(min,Math.min(max,rounded));
      noticeValue.current=next;onCommit(next);setDraft(format(next));
      setNotice(bounded!==parsed.value?`${min}–${max} · Set to ${format(next)}`:next!==parsed.value?`${min}–${max} · Rounded to ${format(next)}`:'');
    }
    dirty.current=false;setEditing(false);
  };
  const parsedDraft=parseNumberText(draft);
  const invalid=editing&&dirty.current&&!compositionActive&&(!parsedDraft||parsedDraft.value<min||parsedDraft.value>max);
  return <span className="parameter-value">
    <LiquidControl id={`${id}-number`} kind="field" clock={clock} className="parameter-number-glass">
      <input id={`number-${id}`} className="parameter-number" type="text" role="spinbutton" inputMode="decimal" maxLength={32} aria-valuemin={min} aria-valuemax={max} aria-valuenow={editing&&parsedDraft&& !invalid?parsedDraft.value:value} aria-invalid={invalid||undefined} aria-label={`${label} value`} aria-describedby={`number-hint-${id} number-notice-${id}`} value={editing?draft:format(value)}
        onFocus={()=>{setDraft(format(value));dirty.current=false;setEditing(true);setNotice('');}}
        onChange={event=>{dirty.current=true;setDraft(event.currentTarget.value);setNotice('');}}
        onCompositionStart={()=>{composing.current=true;setCompositionActive(true);}}
        onCompositionEnd={event=>{composing.current=false;setCompositionActive(false);if(document.activeElement===event.currentTarget){dirty.current=true;setDraft(event.currentTarget.value);}else{dirty.current=false;setDraft(format(value));}}}
        onPaste={event=>{
          const input=event.currentTarget,text=event.clipboardData.getData('text'),length=input.value.length-(input.selectionEnd!-input.selectionStart!)+text.length;
          if(length>32){event.preventDefault();noticeValue.current=value;setNotice('Max 32 characters · Paste ignored');}
        }}
        onBlur={()=>{if(skipBlur.current){skipBlur.current=false;return;}if(composing.current){dirty.current=false;setEditing(false);setDraft(format(value));return;}commit();}}
        onKeyDown={event=>{
          if(composing.current||event.nativeEvent.isComposing||event.nativeEvent.keyCode===229)return;
          if(event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
          if(event.key==='Escape'){event.preventDefault();skipBlur.current=true;dirty.current=false;setEditing(false);setDraft(format(value));noticeValue.current=value;setNotice('Edit cancelled');event.currentTarget.blur();}
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
    {unit&&<span className="parameter-unit" aria-hidden="true">{unit}</span>}
    <span className="visually-hidden" id={`number-hint-${id}`}>Range {min} to {max}{unit?' '+unit:''}. Up to {precision} decimal places. Enter or leave the field to apply. Escape cancels.</span>
    <span className="parameter-number-notice" id={`number-notice-${id}`} role="status" aria-live="polite">{notice}</span>
  </span>;
}

/** Pointer input is continuous; configured steps belong only to keyboard input.
 * Deltas preserve the grab point during shell morphs. Only release uses a spring. */
export type GlassSliderProps = {id:string;label:string;value:number;min:number;max:number;step:number;unit?:string;precision?:number;clock:PreviewClock;onChange:(value:number)=>void};
export function GlassSlider({ id,label,value,min,max,step,unit='',precision:customPrecision=2,clock,onChange }: GlassSliderProps) {
  if (![min,max,step,value].every(Number.isFinite) || min>=max || step<=0) {
    throw new RangeError('GlassSlider requires finite value/min/max, min < max, and a finite positive keyboard step.');
  }
  const [pressed,setPressed]=useState(false),[focused,setFocused]=useState(false);
  const [displayPosition,setDisplayPosition]=useState({progress:(value-min)/(max-min),offset:0});
  const anchor=useLensAnchor(64,44,displayPosition.progress,displayPosition.offset);
  const state=useRef({value,progress:(value-min)/(max-min),offset:0,velocity:0,drag:null as null|{id:number;lastX:number;rawProgress:number;span:number},pending:null as null|{value:number;progress:number;offset:number}});
  const bounds=useRef({min,max}),native=useRef<HTMLInputElement>(null);
  const change=useRef(onChange);change.current=onChange;
  const release=()=>{state.current.drag=null;setPressed(false);clock.wake();};
  useLayoutEffect(()=>clock.subscribe(delta=>{
    const s=state.current;let changed=false;
    if(s.pending){const p=s.pending;s.pending=null;s.progress=p.progress;s.offset=p.offset;s.velocity=0;changed=true;
      if(p.value!==s.value){s.value=p.value;change.current(p.value);}}
    if(clock.reduced&&s.offset!==0){s.offset=0;s.velocity=0;changed=true;}
    if(!s.drag&&s.offset!==0){spring(s,delta,clock.reduced);changed=true;}
    if(changed)setDisplayPosition({progress:s.progress,offset:s.offset});
    return s.offset!==0&&!s.drag;
  }),[clock]);
  useLayoutEffect(()=>{
    const s=state.current,rangeChanged=bounds.current.min!==min||bounds.current.max!==max;
    bounds.current={min,max};
    if(rangeChanged){
      const pointerId=s.drag?.id;s.drag=null;s.pending=null;setPressed(false);
      if(pointerId!==undefined&&native.current?.hasPointerCapture(pointerId))native.current.releasePointerCapture(pointerId);
      s.value=Math.max(min,Math.min(max,value));s.progress=(s.value-min)/(max-min);s.offset=0;s.velocity=0;
      setDisplayPosition({progress:s.progress,offset:0});
      if(s.value!==value)change.current(s.value);
      clock.wake();
    }else if(!s.drag&&!s.pending&&value!==s.value){s.value=value;s.progress=(value-min)/(max-min);s.offset=0;s.velocity=0;setDisplayPosition({progress:s.progress,offset:0});}
  },[value,min,max,clock]);
  useEffect(()=>{window.addEventListener('blur',release);window.addEventListener('pointercancel',release);return()=>{window.removeEventListener('blur',release);window.removeEventListener('pointercancel',release);};},[clock]);
  const queuePointer=(clientX:number)=>{
    const s=state.current,d=s.drag;if(!d)return;
    const {span}=anchor.getPlacement(),legal=clamp(d.rawProgress);d.rawProgress=legal+(d.rawProgress-legal)*d.span/span+(clientX-d.lastX)/span;d.span=span;d.lastX=clientX;
    const progress=clamp(d.rawProgress),offset=resistance((d.rawProgress-progress)*span,clock.reduced);
    s.pending={value:min+progress*(max-min),progress,offset};clock.wake();
  };
  const queueValue=(next:number)=>{next=Math.max(min,Math.min(max,next));state.current.pending={value:next,progress:(next-min)/(max-min),offset:0};clock.wake();};
  const commitNumber=(next:number)=>{const s=state.current;s.pending=null;s.drag=null;s.value=next;s.progress=(next-min)/(max-min);s.offset=0;s.velocity=0;setPressed(false);setDisplayPosition({progress:s.progress,offset:0});change.current(next);clock.wake();};
  // Approved parameter ids retain their exact precision contract. Other sliders
  // may choose a readable 0–6 digit decimal field without quantizing dragging.
  const precision=PARAMETER_ROWS.find(row=>row.key===id)?.precision??(Number.isFinite(customPrecision)?Math.max(0,Math.min(6,Math.trunc(customPrecision))):2);
  const progress=displayPosition.progress,display=unit==='×'?`${value.toFixed(1)}×`:`${Number(value.toFixed(3))}${unit?` ${unit}`:''}`;
  return <div className="parameter-row">
    <div className="parameter-label"><label htmlFor={`number-${id}`}>{label}</label><GlassNumber id={id} label={label} value={value} min={min} max={max} precision={precision} unit={unit} clock={clock} onCommit={commitNumber}/></div>
    <div ref={anchor.rail} className="range-rail" data-progress={progress.toFixed(6)} data-overshoot={displayPosition.offset.toFixed(3)} data-end-radius={anchor.radius} data-end-gap={anchor.gap}>
      <div ref={anchor.track} className="range-track" style={{left:anchor.trackInset,right:anchor.trackInset}} aria-hidden="true"><span style={{width:`${progress*100}%`}}/></div>
      <div className="range-thumb-position" style={{left:anchor.left,top:anchor.top}}>
        <LiquidControl id={`${id}-thumb`} kind="thumb" clock={clock} className="range-thumb" interaction={{pressed,focused,bounds:anchor.bounds,position:`${anchor.left}:${anchor.top}`}} onGeometry={anchor.onGeometry}>{null}</LiquidControl>
      </div>
      <input ref={native} id={`range-${id}`} aria-label={label} aria-valuetext={display} className="glass-range" type="range" min={min} max={max} step="any" value={value}
        onChange={event=>{if(!state.current.drag)queueValue(event.currentTarget.valueAsNumber);}}
        onPointerDown={event=>{
          if(event.button!==0)return;event.preventDefault();event.currentTarget.focus({preventScroll:true});event.currentTarget.setPointerCapture(event.pointerId);setPressed(true);
          const r=anchor.rail.current!.getBoundingClientRect(),s=state.current,p=anchor.getPlacement(),local=event.clientX-r.left;
          const centre=p.left+anchor.shape.centerX,within=Math.abs(local-centre)<=anchor.shape.width/2;
          // Seed from the committed visible frame: the clock's numerical spring
          // may already be one React commit ahead when pointerdown arrives.
          s.progress=displayPosition.progress;s.offset=displayPosition.offset;s.pending=null;
          const rawProgress=within?s.progress+excessForOffset(s.offset)/p.span:(local-p.start)/p.span;
          s.drag={id:event.pointerId,lastX:event.clientX,rawProgress,span:p.span};s.velocity=0;queuePointer(event.clientX);
        }}
        onPointerMove={event=>{if(state.current.drag?.id===event.pointerId)queuePointer(event.clientX);}}
        onPointerUp={event=>{if(state.current.drag?.id===event.pointerId){queuePointer(event.clientX);release();if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}}}
        onPointerCancel={release} onLostPointerCapture={()=>{if(state.current.drag)release();}}
        onFocus={event=>setFocused(event.currentTarget.matches(':focus-visible'))} onBlur={()=>{setFocused(false);release();}}
        onKeyDown={event=>{
          const key=event.key;if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(key))return;
          event.preventDefault();setPressed(true);setFocused(true);
          const current=state.current.pending?.value??state.current.value,up=['ArrowRight','ArrowUp','PageUp'].includes(key),count=key.startsWith('Page')?10:1;
          const index=up?Math.floor((current-min)/step+1e-8)+count:Math.ceil((current-min)/step-1e-8)-count;
          queueValue(key==='Home'?min:key==='End'?max:Number((min+index*step).toFixed(12)));
        }} onKeyUp={()=>setPressed(false)}/>
    </div>
  </div>;
}

/** The legal value is discrete; display position and elastic overscroll are not. */
export type GlassSwitchProps = {id:string;label:string;checked:boolean;clock:PreviewClock;onChange:(checked:boolean)=>void;disabled?:boolean};
export function GlassSwitch({id,label,checked,clock,onChange,disabled=false}:GlassSwitchProps) {
  const [pressed,setPressed]=useState(false),[focused,setFocused]=useState(false),[display,setDisplay]=useState({position:checked?1:0,offset:0});
  const anchor=useLensAnchor(63.36,42.24,display.position,display.offset);
  const state=useRef({position:checked?1:0,target:checked?1:0,reported:checked,offset:0,velocity:0,
    drag:null as null|{id:number;startX:number;lastX:number;rawProgress:number;span:number;initialChecked:boolean;maxDistance:number},pending:null as null|{position:number;offset:number}});
  const change=useRef(onChange);change.current=onChange;
  const report=(next:boolean)=>{if(next!==state.current.reported){state.current.reported=next;change.current(next);}};
  const settle=(next?:boolean)=>{
    const s=state.current;
    if(next!==undefined)report(next);else if(s.pending)report(s.pending.position>=.5);
    s.drag=null;s.target=s.reported?1:0;setPressed(false);clock.wake();
  };
  useLayoutEffect(()=>clock.subscribe(delta=>{
    const s=state.current;let changed=false;
    if(s.pending){s.position=s.pending.position;s.offset=s.pending.offset;s.velocity=0;s.pending=null;changed=true;if(s.drag)report(s.position>=.5);}
    if(clock.reduced&&s.offset!==0){s.offset=0;s.velocity=0;changed=true;}
    if(!s.drag){
      const difference=s.target-s.position;
      if(difference!==0){s.position=clock.reduced||Math.abs(difference)<.001?s.target:s.position+difference*(1-Math.exp(-delta/70));changed=true;}
      if(s.offset!==0){spring(s,delta,clock.reduced);changed=true;}
    }
    if(changed)setDisplay({position:s.position,offset:s.offset});
    return !s.drag&&(s.position!==s.target||s.offset!==0);
  }),[clock]);
  useLayoutEffect(()=>{
    const s=state.current;s.reported=checked;s.target=checked?1:0;
    if(disabled){s.drag=null;setPressed(false);}clock.wake();
  },[checked,disabled,clock]);
  useEffect(()=>{
    const stop=()=>settle();window.addEventListener('blur',stop);window.addEventListener('pointercancel',stop);
    return()=>{window.removeEventListener('blur',stop);window.removeEventListener('pointercancel',stop);};
  },[clock]);
  const queuePointer=(x:number)=>{
    const s=state.current,d=s.drag;if(!d)return;
    const {span}=anchor.getPlacement(),legal=clamp(d.rawProgress);d.rawProgress=legal+(d.rawProgress-legal)*d.span/span+(x-d.lastX)/span;d.span=span;d.lastX=x;d.maxDistance=Math.max(d.maxDistance,Math.abs(x-d.startX));
    const position=clamp(d.rawProgress);s.pending={position,offset:resistance((d.rawProgress-position)*span,clock.reduced)};clock.wake();
  };
  return <div className="switch-control"><span>{label}{disabled&&<small> · System</small>}</span><div className="switch-body" data-position={display.position.toFixed(6)} data-overshoot={display.offset.toFixed(3)} data-end-radius={anchor.radius} data-end-gap={anchor.gap}>
    <div ref={anchor.rail} className="switch-visual"><div ref={anchor.track} className="switch-track" style={{left:anchor.trackInset,right:anchor.trackInset}} data-checked={checked} aria-hidden="true"><span style={{width:`${display.position*100}%`}}/></div>
    <div className="switch-thumb-position" style={{left:anchor.left,top:anchor.top}}><LiquidControl id={`${id}-thumb`} kind="thumb" clock={clock} className="switch-thumb" disabled={disabled} interaction={{pressed,focused,bounds:anchor.bounds,position:`${anchor.left}:${anchor.top}`}} onGeometry={anchor.onGeometry}>{null}</LiquidControl></div></div>
    <button type="button" className="switch-native" role="switch" aria-label={label} aria-checked={checked} disabled={disabled}
      onPointerDown={e=>{if(e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);setPressed(true);const s=state.current,{span}=anchor.getPlacement();s.position=display.position;s.offset=display.offset;s.pending=null;s.drag={id:e.pointerId,startX:e.clientX,lastX:e.clientX,rawProgress:s.position+excessForOffset(s.offset)/span,span,initialChecked:s.reported,maxDistance:0};s.velocity=0;}}
      onPointerMove={e=>{if(state.current.drag?.id===e.pointerId)queuePointer(e.clientX);}}
      onPointerUp={e=>{
        const d=state.current.drag;if(d?.id!==e.pointerId)return;
        queuePointer(e.clientX);settle(d.maxDistance<4?!d.initialChecked:state.current.pending!.position>=.5);
        if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={()=>settle()} onLostPointerCapture={()=>{if(state.current.drag)settle();}}
      onClick={e=>{if(e.detail===0)settle(!state.current.reported);}}
      onKeyDown={e=>{if(e.key===' '||e.key==='Enter')setPressed(true);}} onKeyUp={()=>setPressed(false)}
      onFocus={e=>setFocused(e.currentTarget.matches(':focus-visible'))} onBlur={()=>{setFocused(false);settle();}}/>
  </div></div>;
}
