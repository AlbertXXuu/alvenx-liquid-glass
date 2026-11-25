import {useEffect, useId, useRef, type RefObject} from 'react';
import {acquireBalancedOptics, type BalancedSource} from '../../src/balancedOptics';
import {paintControlInk} from '../../src/controlInk';
import {cubicFramePath} from '../../src/geometry';
import type {GlassClock} from '../../src/GlassClock';
import {interactionCurve} from '../../src/interactionCurve';

const targetSelector = 'nav > a, nav > button, nav .lab-language button';
const hoverDuration = 150;

function labelFrame(item: HTMLElement, style: CSSStyleDeclaration) {
  const label = style.getPropertyValue('--lab-nav-compact-paint').trim() === 'block'
    ? item.querySelector<HTMLElement>(':scope > .lab-nav-label') : null;
  if (!label) {
    const box = item.getBoundingClientRect();
    return {box, corner:box.height / 2};
  }
  const text = label.getBoundingClientRect();
  const labelStyle = getComputedStyle(label);
  const inline = Number.parseFloat(labelStyle.getPropertyValue('--lab-nav-pill-inline')) || 0;
  const block = Number.parseFloat(labelStyle.getPropertyValue('--lab-nav-pill-block')) || 0;
  const corner = Number.parseFloat(labelStyle.getPropertyValue('--ax-corner-size')) || 0;
  return {box:new DOMRect(text.left - inline, text.top - block, text.width + inline * 2, text.height + block * 2), corner};
}

/** Flattens the hovered navigation label into one transparent optical source. */
export function HeaderNavTransmission({header, clock}:{header:RefObject<HTMLElement|null>; clock:GlassClock}) {
  const output = useRef<HTMLCanvasElement>(null);
  const id = useId();
  useEffect(() => {
    const shell = header.current, canvas = output.current;
    if (!shell || !canvas) return;
    const renderer = acquireBalancedOptics();
    const bitmap = document.createElement('canvas');
    const forcedColors = matchMedia('(forced-colors: active)');
    let target: HTMLElement | null = null, shown: HTMLElement | null = null;
    let source: BalancedSource | undefined, stamp = '', revision = 0;
    let lastMaterial = clock.material, lastStrength = -1, lastAmount = -1, lastLayout = -1;
    let started = 0, from = 0, amount = 0, failed = false;

    const conceal = () => {
      if (shown) delete shown.dataset.axHeaderInk;
      shown = null;
      delete canvas.dataset.active;
      delete canvas.dataset.displacement;
    };
    const select = (next: HTMLElement | null) => {
      if (target === next) return;
      if (next && shown !== next) {
        conceal();
        amount = 0;
        source = undefined;
        stamp = '';
      }
      from = amount;
      started = performance.now();
      target = next;
      clock.wake();
    };
    const readTarget = (node: EventTarget | null) => {
      const item = node instanceof Element ? node.closest(targetSelector) : null;
      return item instanceof HTMLElement && shell.contains(item) && !item.matches(':disabled') ? item : null;
    };
    const over = (event: PointerEvent) => {
      if (event.isPrimary && event.pointerType !== 'touch') select(readTarget(event.target));
    };
    const out = (event: PointerEvent) => {
      if (event.isPrimary && event.pointerType !== 'touch') select(readTarget(event.relatedTarget));
    };
    const reset = () => {select(null); conceal();};
    const refreshSource = () => { stamp = ''; clock.wake(); };
    const draw = () => {
      if (failed || forcedColors.matches || clock.optics !== 'auto' || clock.reduced) {
        conceal();
        return false;
      }
      const item = target ?? shown;
      if (!item?.isConnected) { conceal(); return false; }
      const elapsed = performance.now() - started;
      const time = Math.min(1, elapsed / hoverDuration);
      amount = interactionCurve(from, from, target ? 1 : 0, time);
      const style = getComputedStyle(item);
      const {box,corner} = labelFrame(item,style);
      const activity = amount * Math.min(1.6, clock.strength / 2.5);
      const strength = activity * clock.material.refractionLevel * box.height * .056;
      const blur = Math.min(1, activity);
      const material = {...clock.material,blurLevel:clock.material.blurLevel*blur,progressiveBlur:clock.material.progressiveBlur*blur};
      if ((strength < .025 && Math.max(material.blurLevel,material.progressiveBlur) < .025) ||
          box.width <= 0 || box.height <= 0) {
        conceal();
        return !!target && time < 1;
      }
      const background = shell.getBoundingClientRect();
      canvas.style.left = `${box.left - background.left - shell.clientLeft}px`;
      canvas.style.top = `${box.top - background.top - shell.clientTop}px`;
      canvas.style.width = `${box.width}px`;
      canvas.style.height = `${box.height}px`;
      const nextStamp = [item.textContent, box.width, box.height, corner, devicePixelRatio, style.color].join('|');
      try {
        if (stamp !== nextStamp || !source) {
          if (!paintControlInk(bitmap, item, box)) { conceal(); return false; }
          source = {id: id + '-nav-ink',version:++revision,canvas:bitmap,width:box.width,height:box.height};
          stamp = nextStamp;
          lastStrength = -1;
        }
        if (lastStrength !== strength || lastAmount !== blur || lastMaterial !== clock.material || lastLayout !== clock.layoutRevision) {
          renderer.render(canvas, source, {
            width:box.width,height:box.height,origin:{x:0,y:0},
            center:{x:box.width/2,y:box.height/2},half:{x:box.width/2,y:box.height/2},
            exponent:2.65,path:cubicFramePath(box.width,box.height,corner),
            material,transmission:{strength,preserveAlpha:true,protectInk:true},
          });
          lastStrength = strength;
          lastAmount = blur;
          lastMaterial = clock.material;
          lastLayout = clock.layoutRevision;
        }
        shown = item;
        item.dataset.axHeaderInk = 'linear';
        canvas.dataset.active = 'true';
        canvas.dataset.displacement = strength.toFixed(3);
      } catch {
        conceal();
        failed = true;
      }
      return !failed && (time < 1 || !!target && elapsed < 255);
    };

    shell.addEventListener('pointerover', over);
    shell.addEventListener('pointerout', out);
    window.addEventListener('blur', reset);
    document.fonts?.addEventListener('loadingdone', refreshSource);
    forcedColors.addEventListener('change', refreshSource);
    const menuChanges = new MutationObserver(refreshSource);
    menuChanges.observe(shell, {subtree:true,childList:true,attributes:true,attributeFilter:['data-menu-open','aria-expanded']});
    const unsubscribe = clock.subscribe(draw);
    return () => {
      conceal();
      menuChanges.disconnect();
      unsubscribe();
      renderer.release();
      shell.removeEventListener('pointerover', over);
      shell.removeEventListener('pointerout', out);
      window.removeEventListener('blur', reset);
      document.fonts?.removeEventListener('loadingdone', refreshSource);
      forcedColors.removeEventListener('change', refreshSource);
    };
  }, [clock, header, id]);
  return <canvas ref={output} className="lab-header-ink" data-header-ink-canvas aria-hidden="true"/>;
}
