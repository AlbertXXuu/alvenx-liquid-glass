import { useId, useLayoutEffect, useRef, type RefObject } from 'react';
import { studioLightDirection, studioLightPeriod, type GlassClock, type StudioLight } from '../../src/GlassClock';

/** All showcase reflectors follow the same studio light, including off-stage controls. */
export function useStudioLight(clock: GlassClock, root: RefObject<HTMLDivElement | null>, ambient: boolean, reduced: boolean) {
  const id = `studio-light-${useId().replace(/[^a-z0-9-]/gi, '')}`;
  const light = useRef<StudioLight>({
    direction: studioLightDirection(0),
    gradients: { rim: `${id}-rim`, spot: `${id}-spot`, bounce: `${id}-bounce` },
  }).current;
  // The same clock provides the resource IDs to controls during their first render.
  clock.studioLight = light;
  const rim = useRef<SVGLinearGradientElement>(null);
  const spot = useRef<SVGRadialGradientElement>(null);
  const bounce = useRef<SVGRadialGradientElement>(null);
  const time = useRef(0);

  useLayoutEffect(() => {
    const host = root.current, rimGradient = rim.current, spotGradient = spot.current, bounceGradient = bounce.current;
    if (!host || !rimGradient || !spotGradient || !bounceGradient) return;
    const active = ambient && !reduced;
    host.dataset.studioLightActive = String(active);
    const paint = () => {
      const direction = studioLightDirection(time.current);
      light.direction = direction;
      const dx = direction.x - .5, dy = direction.y - .5;
      const length = Math.hypot(dx, dy);
      const x = dx / length * .5, y = dy / length * .5;
      rimGradient.setAttribute('x1', (.5 + x).toFixed(4));
      rimGradient.setAttribute('y1', (.5 + y).toFixed(4));
      rimGradient.setAttribute('x2', (.5 - x).toFixed(4));
      rimGradient.setAttribute('y2', (.5 - y).toFixed(4));
      spotGradient.setAttribute('cx', direction.x.toFixed(4));
      spotGradient.setAttribute('cy', direction.y.toFixed(4));
      bounceGradient.setAttribute('cx', (.5 - x).toFixed(4));
      bounceGradient.setAttribute('cy', (.5 - y).toFixed(4));
      const style = host.style;
      style.setProperty('--ax-glass-light-angle', `${(Math.atan2(-dx, dy) * 180 / Math.PI).toFixed(3)}deg`);
      style.setProperty('--ax-glass-light-x', `${(direction.x * 100).toFixed(3)}%`);
      style.setProperty('--ax-glass-light-y', `${(direction.y * 100).toFixed(3)}%`);
      host.dataset.studioLightTime = time.current.toFixed(3);
    };
    paint();
    if (!active) return;
    let frameBudget = 0;
    return clock.subscribe((_delta, elapsed) => {
      if (clock.reduced) return false;
      // Delayed frames should not jump the direction after a main-thread stall.
      const step = Math.max(0, Math.min(100, elapsed));
      frameBudget += step;
      if (frameBudget >= 1000 / 30 - .3) {
        time.current = (time.current + frameBudget / 1000) % studioLightPeriod;
        frameBudget = 0;
        paint();
      }
      return true;
    }, 'prepare');
  }, [clock, root, light, ambient, reduced]);

  return <svg aria-hidden="true" width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
    <defs>
      <linearGradient id={light.gradients.rim} ref={rim}/>
      <radialGradient id={light.gradients.spot} ref={spot}/>
      <radialGradient id={light.gradients.bounce} ref={bounce}/>
    </defs>
  </svg>;
}
