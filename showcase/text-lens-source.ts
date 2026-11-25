import { paintNativeInput } from '../src/controlInk';

const pixelBudget = 6_000_000;

function paintViewport(context: CanvasRenderingContext2D, viewport: HTMLElement, stage: DOMRect) {
  const width = viewport.clientWidth;
  const height = viewport.clientHeight;
  if (width <= 0 || height <= 0) throw Error('Text lens viewport is unavailable.');
  // Match the fixed backdrop and layer order in showcase/mobile-review/review.css.
  const angle = 145 * Math.PI / 180;
  const x = Math.sin(angle), y = -Math.cos(angle);
  const reach = (Math.abs(x) * width + Math.abs(y) * height) / 2;
  const centerX = width / 2 - stage.left, centerY = height / 2 - stage.top;
  const base = context.createLinearGradient(centerX - x * reach, centerY - y * reach, centerX + x * reach, centerY + y * reach);
  base.addColorStop(0, '#FBFDFF');
  base.addColorStop(.49, '#F1F7FF');
  base.addColorStop(1, '#E7F1FF');
  context.fillStyle = base;
  context.fillRect(0, 0, stage.width, stage.height);

  const fields = [
    {x: .68, y: .88, end: .38, color: '79 70 229', opacity: .14},
    {x: .84, y: .07, end: .36, color: '167 139 250', opacity: .28},
    {x: .12, y: .05, end: .34, color: '147 197 253', opacity: .42},
  ];
  for (const field of fields) {
    const cx = width * field.x, cy = height * field.y;
    const radius = Math.hypot(Math.max(cx, width - cx), Math.max(cy, height - cy)) * field.end;
    const fill = context.createRadialGradient(cx - stage.left, cy - stage.top, 0, cx - stage.left, cy - stage.top, radius);
    fill.addColorStop(0, `rgb(${field.color} / ${field.opacity})`);
    fill.addColorStop(1, `rgb(${field.color} / 0)`);
    context.fillStyle = fill;
    context.fillRect(0, 0, stage.width, stage.height);
  }
}

function paintRoom(context: CanvasRenderingContext2D, environment: HTMLCanvasElement, stage: DOMRect) {
  const masked = environment.ownerDocument.createElement('canvas');
  masked.width = environment.width;
  masked.height = environment.height;
  const room = masked.getContext('2d');
  if (!room) throw Error('Text lens room canvas is unavailable.');
  room.drawImage(environment, 0, 0);

  // Apply the stage's farthest-corner elliptical mask at the room raster size.
  const x = .47, y = .5;
  const rx = Math.SQRT2 * Math.max(x, 1 - x), ry = Math.SQRT2 * Math.max(y, 1 - y);
  room.setTransform(rx * masked.width, 0, 0, ry * masked.height, x * masked.width, y * masked.height);
  const mask = room.createRadialGradient(0, 0, 0, 0, 0, 1);
  mask.addColorStop(.24, '#000');
  mask.addColorStop(.47, 'rgb(0 0 0 / .88)');
  mask.addColorStop(.78, 'transparent');
  room.globalCompositeOperation = 'destination-in';
  room.fillStyle = mask;
  room.fillRect(-x / rx, -y / ry, 1 / rx, 1 / ry);

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'low';
  context.drawImage(masked, 0, 0, stage.width, stage.height);
}

/** Paint the registered scene within a bounded bitmap and return its CSS dimensions. */
export function paintTextLensSource(
  target: HTMLCanvasElement,
  stage: HTMLElement,
  input: HTMLInputElement,
  environment: HTMLCanvasElement,
  dpr: number,
  maxTextureSize: number,
): {width: number; height: number} {
  const box = stage.getBoundingClientRect();
  const {width, height} = box;
  if (![width, height, dpr, maxTextureSize].every(value => Number.isFinite(value) && value > 0)) {
    throw Error('Text lens source dimensions are invalid.');
  }
  const density = Math.min(2 * dpr, maxTextureSize / width, maxTextureSize / height, Math.sqrt(pixelBudget / (width * height)));
  const bitmapWidth = Math.floor(width * density), bitmapHeight = Math.floor(height * density);
  if (!bitmapWidth || !bitmapHeight) throw Error('Text lens source is too small to rasterize.');
  target.width = bitmapWidth;
  target.height = bitmapHeight;
  target.lang = input.lang || input.ownerDocument.documentElement.lang;
  const context = target.getContext('2d');
  if (!context) throw Error('Text lens source canvas is unavailable.');
  context.setTransform(bitmapWidth / width, 0, 0, bitmapHeight / height, 0, 0);
  paintViewport(context, stage.ownerDocument.documentElement, box);
  paintRoom(context, environment, box);
  paintNativeInput(context, input, box);
  return {width, height};
}
