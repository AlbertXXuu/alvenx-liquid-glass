type RGB = [number, number, number];

const width = 161;
const height = 81;
const paper: RGB = [251, 253, 255];
const lowerPaper: RGB = [231, 241, 255];
const fields = [
  {x: .12, y: .05, spanX: .6, spanY: .96, opacity: .42, color: [147, 197, 253] as RGB},
  {x: .84, y: .07, spanX: .57, spanY: .98, opacity: .28, color: [167, 139, 250] as RGB},
  {x: .68, y: .88, spanX: .49, spanY: .76, opacity: .14, color: [79, 70, 229] as RGB},
];

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const mix = (a: number, b: number, amount: number) => a + (b - a) * amount;
const blend = (a: RGB, b: RGB, amount: number): RGB => [
  mix(a[0], b[0], amount), mix(a[1], b[1], amount), mix(a[2], b[2], amount),
];

function environmentAt(x: number, y: number) {
  let color = blend(paper, lowerPaper, .65 * (x * .3 + y * .7));
  for (const field of fields) {
    const distance = Math.hypot((x - field.x) / field.spanX, (y - field.y) / field.spanY);
    const edge = clamp(1 - distance);
    color = blend(color, field.color, field.opacity * edge * edge * (3 - 2 * edge));
  }
  const spread = Math.max(0, 1 - Math.hypot((x - .49) / .64, (y - .38) / .9));
  return blend(color, paper, spread * .12);
}

export type TextLensEnvironment = {
  href: string;
  bitmap: HTMLCanvasElement;
};

/** The displayed room light and its optical sample use one RGBA texture. */
export function createTextLensEnvironment(): TextLensEnvironment | undefined {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return;
  const pixels = context.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const color = environmentAt((x + .5) / width, (y + .5) / height);
      pixels.data.set([...color, 255], offset);
    }
  }
  context.putImageData(pixels, 0, 0);
  return {href: canvas.toDataURL('image/png'), bitmap: canvas};
}
