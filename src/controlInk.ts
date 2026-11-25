export function paintNativeInput(context: CanvasRenderingContext2D, input: HTMLInputElement, stage: DOMRect) {
  const text = input.value || input.placeholder;
  if (!text) return false;
  const view = input.ownerDocument.defaultView;
  if (!view) throw Error('Text lens input view is unavailable.');
  const type = view.getComputedStyle(input);
  const placeholder = input.value ? null : view.getComputedStyle(input, '::placeholder');
  const ink = placeholder ?? type;
  const rect = input.getBoundingClientRect();
  const pixels = (value: string) => Number.parseFloat(value) || 0;
  const leftInset = pixels(type.paddingLeft) + pixels(type.borderLeftWidth);
  const rightInset = pixels(type.paddingRight) + pixels(type.borderRightWidth);
  const topInset = pixels(type.paddingTop) + pixels(type.borderTopWidth);
  const bottomInset = pixels(type.paddingBottom) + pixels(type.borderBottomWidth);
  const width = rect.width - leftInset - rightInset, height = rect.height - topInset - bottomInset;
  if (width <= 0 || height <= 0 || (type.direction !== 'ltr' && type.direction !== 'rtl')) {
    throw Error('Text lens input box or direction is unavailable.');
  }
  const left = rect.left - stage.left + leftInset, top = rect.top - stage.top + topInset;
  const align = type.textAlign;
  if (!['left', 'right', 'center', 'start', 'end'].includes(align)) throw Error('Text lens input alignment is unsupported.');
  const rtl = type.direction === 'rtl';
  const right = align === 'right' || (align === 'end' && !rtl) || (align === 'start' && rtl);
  const anchor = align === 'center' ? width / 2 : right ? width : 0;

  context.direction = type.direction;
  context.textAlign = align === 'center' ? 'center' : right ? 'right' : 'left';
  context.textBaseline = 'alphabetic';
  context.font = `${ink.fontStyle} ${ink.fontWeight} ${ink.fontSize} ${ink.fontFamily}`;
  const spacing = ink.letterSpacing === 'normal' ? '0px' : ink.letterSpacing;
  if ('letterSpacing' in context) {
    context.letterSpacing = spacing;
    if (pixels(context.letterSpacing) !== pixels(spacing)) throw Error('Text lens letter spacing is unsupported.');
  } else if (pixels(spacing)) {
    throw Error('Text lens letter spacing is unsupported.');
  }
  const {fontBoundingBoxAscent: ascent, fontBoundingBoxDescent: descent} = context.measureText(text);
  if (!Number.isFinite(ascent) || !Number.isFinite(descent) || ascent + descent <= 0) throw Error('Text lens font metrics are unavailable.');

  context.save();
  context.beginPath();
  context.rect(left, top, width, height);
  context.clip();
  context.fillStyle = ink.color;
  context.globalAlpha = Number(placeholder?.opacity || 1);
  const scroll = input.value ? input.scrollLeft : 0;
  context.fillText(text, left + anchor - scroll, top + (height + ascent - descent) / 2);
  context.restore();
  return true;
}

function paintLabel(
  context: CanvasRenderingContext2D, label: HTMLElement, bounds: DOMRect,
) {
  const document = label.ownerDocument;
  const view = document.defaultView;
  if (!view) return false;
  const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let painted = false;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const owner = node.parentElement;
    const raw = node.nodeValue ?? '';
    const text = raw.trim();
    if (!owner || !text || owner.closest('svg')) continue;
    const style = view.getComputedStyle(owner);
    if (style.visibility !== 'visible' || style.display === 'none') continue;
    const start = raw.indexOf(text);
    range.setStart(node, start);
    range.setEnd(node, start + text.length);
    const areas = range.getClientRects();
    if (!areas.length) continue;
    // Native multiline or transformed text keeps its browser painter.
    if (areas.length > 1 || style.transform !== 'none' ||
        !['none', 'uppercase', 'lowercase'].includes(style.textTransform)) return false;
    const area = areas[0];
    if (!area.width || !area.height) continue;
    const displayed = style.textTransform === 'uppercase' ? text.toUpperCase() :
      style.textTransform === 'lowercase' ? text.toLowerCase() : text;
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    context.textBaseline = 'alphabetic';
    context.textAlign = 'left';
    context.direction = style.direction === 'rtl' ? 'rtl' : 'ltr';
    const spacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing;
    if ('letterSpacing' in context) context.letterSpacing = spacing;
    else if (Number.parseFloat(spacing)) return false;
    const metrics = context.measureText(displayed);
    const ascent = metrics.fontBoundingBoxAscent, descent = metrics.fontBoundingBoxDescent;
    if (!Number.isFinite(ascent + descent) || ascent + descent <= 0) return false;
    context.fillStyle = style.color;
    context.fillText(displayed, area.left - bounds.left, area.top - bounds.top + (area.height + ascent - descent) / 2);
    painted = true;
  }
  return painted;
}

export function paintControlInk(target: HTMLCanvasElement, hit: HTMLElement, bounds: DOMRect) {
  const width = bounds.width, height = bounds.height;
  const dpr = hit.ownerDocument.defaultView?.devicePixelRatio || 1;
  const density = Math.min(2 * dpr, 4096 / width, 4096 / height, Math.sqrt(650_000 / (width * height)));
  target.width = Math.max(1, Math.round(width * density));
  target.height = Math.max(1, Math.round(height * density));
  target.lang = hit.closest('[lang]')?.getAttribute('lang') ?? hit.ownerDocument.documentElement.lang;
  const context = target.getContext('2d');
  if (!context) return false;
  context.setTransform(target.width / width, 0, 0, target.height / height, 0, 0);
  const input = hit.querySelector('input:is([type=text], [type=number], [type=search], :not([type]))');
  if (input instanceof HTMLInputElement) return paintNativeInput(context, input, bounds);
  return (hit instanceof HTMLButtonElement || hit instanceof HTMLAnchorElement) && paintLabel(context, hit, bounds);
}
