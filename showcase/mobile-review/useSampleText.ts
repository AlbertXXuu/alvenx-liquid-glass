import {useCallback, useEffect, useRef, useState, type ChangeEvent, type CompositionEvent} from 'react';

export const SAMPLE_TEXT_LIMIT = 18;
export const SAMPLE_TEXT_FAMILY = '"Instrument Sans", MiSans, sans-serif';
export type SampleTextStatus = 'ready' | 'composing' | 'loading' | 'error';

// FontFaceSet.load(text) selects the declared Unicode shards for that text.
// Keep a bounded promise cache; the browser owns the decoded font/HTTP cache.
const fontRequests = new Map<string, Promise<void>>();
const FONT_REQUEST_LIMIT = 64;
const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, {granularity:'grapheme'}) : null;

function limitText(text:string) {
 let result='', count=0;
 if(segmenter) {
  for(const {segment} of segmenter.segment(text)) {
   if(count++===SAMPLE_TEXT_LIMIT) break;
   result+=segment;
  }
 } else {
  for(const point of text) {
   if(count++===SAMPLE_TEXT_LIMIT) break;
   result+=point;
  }
 }
 return result;
}

function loadFace(font:string, text:string):Promise<void> {
 const key = `${font}:${Array.from(new Set(text)).sort().join('')}`;
 const existing = fontRequests.get(key);
 if(existing) {
  fontRequests.delete(key);
  fontRequests.set(key, existing);
  return existing;
 }
 // Do not use fonts.check() as a substitute: a cold SVG text run can still
 // be using fallback while the matching face is being fetched.
 const request = document.fonts.load(font, text).then(()=>undefined);
 fontRequests.set(key, request);
 while(fontRequests.size > FONT_REQUEST_LIMIT) fontRequests.delete(fontRequests.keys().next().value!);
 void request.catch(()=>{if(fontRequests.get(key)===request) fontRequests.delete(key);});
 return request;
}

async function prepareText(text:string) {
 if(!document.fonts?.load) throw new Error('Font loading is unavailable.');
 const nonAscii = text.replace(/[\u0000-\u007f]/g, '');
 await Promise.all([
  loadFace('600 40px "Instrument Sans"', text),
  ...(nonAscii ? [loadFace('600 40px "MiSans"', nonAscii)] : []),
 ]);
}

/** Keep native editing immediate; publish one font-ready, committed SVG value. */
export function useSampleText(initial='Clarity') {
 const [draft, setDraft] = useState(()=>limitText(initial));
 const [value, setValue] = useState(()=>limitText(initial));
 const [status, setStatus] = useState<SampleTextStatus>('ready');
 const committed = useRef(value), composing = useRef(false), sequence = useRef(0), mounted = useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;sequence.current++;};},[]);

 const publish = useCallback((text:string)=>{
  const request = ++sequence.current;
  if(!text || text===committed.current) {
   committed.current=text;
   setValue(text);
   setStatus('ready');
   return;
  }
  setStatus('loading');
  void prepareText(text).then(()=>{
   if(!mounted.current || request!==sequence.current || composing.current) return;
   committed.current=text;
   setValue(text);
   setStatus('ready');
  },()=>{
   // A failed font must not replace the previous sample with a transient
   // fallback. The editor remains usable; the next edit can retry.
   if(mounted.current && request===sequence.current && !composing.current) setStatus('error');
  });
 },[]);

 const onChange = useCallback((event:ChangeEvent<HTMLInputElement>)=>{
  const text = event.currentTarget.value;
  if(composing.current || (event.nativeEvent as InputEvent).isComposing) {
   sequence.current++;
   setDraft(text);
   setStatus('composing');
   return;
  }
  const next=limitText(text);
  setDraft(next);
  publish(next);
 },[publish]);
 const onCompositionStart = useCallback(()=>{
  composing.current=true;
  sequence.current++;
  setStatus('composing');
 },[]);
 const onCompositionEnd = useCallback((event:CompositionEvent<HTMLInputElement>)=>{
  composing.current=false;
  const next=limitText(event.currentTarget.value);
  setDraft(next);
  publish(next);
 },[publish]);

 return {draft, value, status, inputProps:{value:draft, onChange, onCompositionStart, onCompositionEnd, 'aria-busy':status==='loading'}};
}
