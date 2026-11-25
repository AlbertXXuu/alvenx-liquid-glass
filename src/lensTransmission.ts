/** Shared transmission for an optical surface with an elliptical coordinate field. */
export const lensTransmissionGLSL = `
float lensDepth(vec2 normal) {
  return max(0.0, 1.0 - dot(normal, normal));
}

vec2 lensDisplacement(vec2 normal, float strength) {
  float depth = lensDepth(normal);
  float influence = depth * depth * (3.0 - 2.0 * depth);
  return normal * vec2(.84375, .53515625) * influence * strength;
}

vec4 lensFastBlur(sampler2D image, vec2 uv, vec2 stepSize) {
  vec4 center = texture2D(image, uv);
  if (stepSize.x <= 0.0) return center;
  vec2 horizontal = vec2(stepSize.x, 0.0);
  vec2 vertical = vec2(0.0, stepSize.y);
  return center / 3.0 + (
    texture2D(image, uv + horizontal) + texture2D(image, uv - horizontal) +
    texture2D(image, uv + vertical) + texture2D(image, uv - vertical)
  ) / 6.0;
}

vec4 lensSamplePair(sampler2D image, vec2 uv, vec2 delta) {
  return texture2D(image, uv + delta) + texture2D(image, uv - delta);
}

vec4 lensGaussianRow(sampler2D image, vec2 uv, vec2 stepX, vec3 weights) {
  return texture2D(image, uv) +
    weights.x * lensSamplePair(image, uv, stepX) +
    weights.y * lensSamplePair(image, uv, stepX * 2.0) +
    weights.z * lensSamplePair(image, uv, stepX * 3.0);
}

vec4 lensWideBlur(sampler2D image, vec2 uv, vec2 pixelUV, float sigma) {
  // Dense, symmetrical samples avoid discrete copies of thin lettering at
  // the largest radii. Limit the spacing in CSS pixels independent of DPR.
  float spacing = min(1.2, .75 * sigma);
  float ratio = spacing / sigma;
  vec3 weights = exp(-.5 * ratio * ratio * vec3(1.0, 4.0, 9.0));
  vec2 stepX = vec2(pixelUV.x * spacing, 0.0);
  vec2 stepY = vec2(0.0, pixelUV.y * spacing);
  vec4 result = lensGaussianRow(image, uv, stepX, weights) +
    weights.x * (lensGaussianRow(image, uv + stepY, stepX, weights) +
                 lensGaussianRow(image, uv - stepY, stepX, weights)) +
    weights.y * (lensGaussianRow(image, uv + 2.0 * stepY, stepX, weights) +
                 lensGaussianRow(image, uv - 2.0 * stepY, stepX, weights)) +
    weights.z * (lensGaussianRow(image, uv + 3.0 * stepY, stepX, weights) +
                 lensGaussianRow(image, uv - 3.0 * stepY, stepX, weights));
  float normalizer = 1.0 + 2.0 * (weights.x + weights.y + weights.z);
  return result / (normalizer * normalizer);
}

vec4 lensLocalBlur(sampler2D image, vec2 uv, vec2 pixelUV, float sigma) {
  if (sigma <= .001) return texture2D(image, uv);
  vec2 sampleStep = pixelUV * sigma;
  if (sigma >= .72) return lensWideBlur(image, uv, pixelUV, sigma);
  vec4 fast = lensFastBlur(image, uv, sampleStep * sqrt(3.0));
  if (sigma <= .4) return fast;
  return mix(fast, lensWideBlur(image, uv, pixelUV, sigma), smoothstep(.4, .72, sigma));
}

vec4 lensTransmission(sampler2D image, sampler2D base, sampler2D deep,
    vec2 uv, vec2 pixelUV, vec2 normal, vec2 sigmas, vec2 filtered) {
  // The progressive term starts at the inner shoulder. Blend to a cached
  // Gaussian as the support grows beyond the small, per-fragment kernel.
  float shoulder = smoothstep(.12, .68, dot(normal, normal));
  float sigma = length(vec2(sigmas.x, sigmas.y * shoulder));
  if ((filtered.x == 0.0 && filtered.y == 0.0) || sigma <= 1.0) {
    return lensLocalBlur(image, uv, pixelUV, sigma);
  }
  vec4 center = filtered.x > .5 ? texture2D(base, uv) : lensLocalBlur(image, uv, pixelUV, sigmas.x);
  vec4 outer = filtered.y > .5 ? texture2D(deep, uv) : center;
  vec4 wide = mix(center, outer, shoulder);
  if (sigma >= 1.7) return wide;
  return mix(lensLocalBlur(image, uv, pixelUV, sigma), wide, smoothstep(1.0, 1.7, sigma));
}`;

/** The default dials preserve legibility while the upper half reaches visibly wider optical radii. */
export function lensBlurRadii(base: number, progressive: number): readonly [number, number] {
  const ramp = (level: number) => Math.max(0, Math.min(level, 6) - 1.6) ** 1.75;
  return [.12 * Math.min(base, 6) + .37 * ramp(base), .04 * Math.min(progressive, 6) + .48 * ramp(progressive)];
}

/** Preserve the stroke shape of optically sampled action and navigation labels. */
export function lensInkBlurRadii(base: number, progressive: number): readonly [number, number] {
  return [.07 * Math.min(base, 6), .052 * Math.min(progressive, 6)];
}

export function lensPrefilterRadii(base: number, progressive: number): readonly [number, number] {
  const outer = Math.hypot(base, progressive);
  return [base > 1 ? base : 0, progressive > .001 && outer > 1 ? outer : 0];
}

/** Bounded one-pass Gaussian shader. LINEAR fetches pair adjacent texels. */
export const lensGaussianPrefilterGLSL = `
precision highp float;
uniform sampler2D image;
uniform vec2 stepSize;
uniform float sigma;
varying vec2 uv;
void main() {
  vec4 total = texture2D(image, uv);
  float count = 1.0;
  for (int j = 0; j < 32; j++) {
    float x = 1.0 + 2.0 * float(j);
    if (x > ceil(sigma * 3.0)) break;
    float y = x + 1.0;
    float wx = exp(-.5 * x * x / (sigma * sigma));
    float wy = y <= ceil(sigma * 3.0) ? exp(-.5 * y * y / (sigma * sigma)) : 0.0;
    float weight = wx + wy;
    float offset = (x * wx + y * wy) / max(weight, .000001);
    total += (texture2D(image, uv + stepSize * offset) + texture2D(image, uv - stepSize * offset)) * weight;
    count += 2.0 * weight;
  }
  gl_FragColor = total / count;
}`;
