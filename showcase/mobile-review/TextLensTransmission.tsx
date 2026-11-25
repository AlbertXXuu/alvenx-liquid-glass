import {useEffect, useLayoutEffect, useRef, useState, type RefObject} from 'react';
import {createTextLensSampler} from '../text-lens-sampler';
import {paintTextLensSource} from '../text-lens-source';
import {prepareSampleText} from './useSampleText';

type Sampler = ReturnType<typeof createTextLensSampler>;
type Props = {
  anchor: RefObject<HTMLSpanElement | null>;
  input: RefObject<HTMLInputElement | null>;
  environment?: HTMLCanvasElement;
  text: string;
  fontReady: boolean;
  editing: boolean;
  preferLinear: boolean;
  fallback: 'svg' | 'native' | 'flat';
  backdrop: string;
  clip: string;
  frame: Omit<Parameters<Sampler['draw']>[2], 'sceneWidth' | 'sceneHeight'>;
};
type RegisteredSource = {
  bitmap: HTMLCanvasElement;
  environment: HTMLCanvasElement;
  text: string;
  generation: number;
  revision: number;
  dpr: number;
  width: number;
  height: number;
};

/** Keep the live input as the text owner; compose its sampled raster only while it is at rest. */
export function TextLensTransmission({anchor, input, environment, text, fontReady, editing, preferLinear, fallback, backdrop, clip, frame}: Props) {
  const output = useRef<HTMLCanvasElement>(null);
  const bitmap = useRef<HTMLCanvasElement | null>(null);
  const renderer = useRef<Sampler | null>(null);
  const generations = useRef(0);
  const revisions = useRef(0);
  const [generation, setGeneration] = useState(0);
  const [visible, setVisible] = useState(false);
  const [source, setSource] = useState<RegisteredSource>();
  const [drawnRevision, setDrawnRevision] = useState(0);

  useEffect(() => {
    const stage = anchor.current?.parentElement;
    if (!preferLinear || !stage) return;
    let inView = typeof IntersectionObserver === 'undefined';
    const update = () => setVisible(inView && !document.hidden);
    const observer = typeof IntersectionObserver === 'undefined' ? undefined : new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      update();
    });
    observer?.observe(stage);
    document.addEventListener('visibilitychange', update);
    update();
    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, [anchor, preferLinear]);

  useEffect(() => {
    const canvas = output.current;
    if (!preferLinear || !canvas) return;
    const initialize = () => {
      try {
        renderer.current = createTextLensSampler(canvas);
        setGeneration(++generations.current);
      } catch {
        setGeneration(0);
      }
    };
    const lost = (event: Event) => {
      event.preventDefault();
      renderer.current?.dispose();
      renderer.current = null;
      setGeneration(0);
    };
    canvas.addEventListener('webglcontextlost', lost);
    canvas.addEventListener('webglcontextrestored', initialize);
    initialize();
    return () => {
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', initialize);
      renderer.current?.dispose();
      renderer.current = null;
      bitmap.current = null;
    };
  }, [preferLinear]);

  const eligible = preferLinear && visible && !!generation && fontReady && !editing;
  useLayoutEffect(() => {
    if (!eligible) setSource(undefined);
  }, [eligible]);
  useEffect(() => {
    const stage = anchor.current?.parentElement, field = input.current;
    const sampler = renderer.current;
    if (!eligible || !stage || !field || !sampler || !environment) return;
    let cancelled = false, fontsReady = false, request = 0;
    const prepare = () => {
      request = 0;
      if (cancelled || document.hidden || (field.value || field.placeholder) !== text) return;
      const canvas = bitmap.current ??= document.createElement('canvas');
      try {
        const dpr = window.devicePixelRatio || 1;
        const size = paintTextLensSource(canvas, stage, field, environment, dpr, sampler.maxTextureSize);
        setSource({bitmap: canvas, environment, text, generation, revision: ++revisions.current, dpr, ...size});
      } catch {
        setSource(undefined);
      }
    };
    const schedule = () => {
      if (fontsReady && !request && !cancelled && !document.hidden) request = requestAnimationFrame(prepare);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(stage);
    observer.observe(field);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, {passive: true});
    field.addEventListener('scroll', schedule, {passive: true});
    document.fonts?.addEventListener('loadingdone', schedule);
    void prepareSampleText(text).then(() => {
      if (cancelled) return;
      fontsReady = true;
      schedule();
    }, () => {
      if (!cancelled) setSource(undefined);
    });
    return () => {
      cancelled = true;
      if (request) cancelAnimationFrame(request);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule);
      field.removeEventListener('scroll', schedule);
      document.fonts?.removeEventListener('loadingdone', schedule);
    };
  }, [anchor, eligible, environment, generation, input, text]);

  const current = eligible && source?.generation === generation &&
    source.environment === environment && source.text === text ? source : undefined;
  useLayoutEffect(() => {
    if (!current || !renderer.current) return;
    try {
      renderer.current.draw(current.bitmap, current.revision, {
        ...frame, sceneWidth: current.width, sceneHeight: current.height
      }, current.dpr);
      setDrawnRevision(current.revision);
    } catch {
      renderer.current.dispose();
      renderer.current = null;
      setGeneration(0);
    }
  }, [current, frame]);

  const linear = !!current && drawnRevision === current.revision;
  const mode = editing ? 'editing' : linear ? 'linear' : fallback;
  const filter = editing || linear ? 'none' : backdrop;
  return <div className="text-lens-transmission" data-text-lens-transmission
    data-transmission={mode} data-source-revision={linear ? current.revision : undefined}
    aria-hidden="true" style={{clipPath: clip, backdropFilter: filter, WebkitBackdropFilter: filter}}>
    {preferLinear && <canvas ref={output} data-text-lens-linear hidden={!linear}/>}
  </div>;
}
