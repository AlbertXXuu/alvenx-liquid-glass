// Accepted kit derivative: repaired C2 height field and pearl volume.
import { volumeRasterSize } from './volume-budget.js';
/**
 * Isolated material study. This is a 2.5D height-field approximation, not an
 * implementation of Apple's renderer or a physically accurate glass volume.
 * No images, network calls, dependencies, or animation loop are used.
 * All geometry is in a 1000 x 560 logical viewport, with y pointing down.
 */
const DEFAULTS = Object.freeze({
  edge: 'balanced', flat: false, curvature: 3.2,
  lightX: 0.22, lightY: 0.08, growth: 1, showGrid: false, time: 0,
  studioMotion: false, portrait: false,
  parentX: 1, parentY: 1, childX: 1, childY: 1,
  deformX: 500, deformY: 280, deformDX: 0, deformDY: 0,
  specularOpacity: .65, specularSaturation: 1, refractionLevel: 1,
  blurLevel: 0, progressiveBlur: 0, glassOpacity: .3,
});

const VERTEX = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

const FRAGMENT = `
precision highp float;
uniform vec2 u_resolution;
uniform vec2 u_light;
uniform float u_curvature;
uniform float u_growth;
uniform float u_edge;
uniform float u_flat;
uniform float u_grid;
uniform float u_time;
uniform float u_studio_motion;
uniform vec2 u_studio_rotation;
uniform float u_portrait;
uniform float u_specular_opacity;
uniform float u_specular_saturation;
uniform float u_refraction_level;
uniform float u_blur_level;
uniform float u_progressive_blur;
uniform float u_glass_opacity;
uniform vec2 u_parent_stretch;
uniform vec2 u_child_stretch;
uniform vec2 u_deform_point;
uniform vec2 u_deform_amount;

const vec2 VIEW = vec2(1000.0, 560.0);
const vec2 PARENT = vec2(230.0, 280.0);

// One smooth coordinate deformation feeds coverage AND the interior potential.
// Finite differences of heightAt therefore include its chain rule in normals.
vec2 deformPoint(vec2 p) {
  vec2 q = (p - u_deform_point) / 105.0;
  return p - u_deform_amount * exp(-dot(q, q));
}

float ease(float t) { return t * t * (3.0 - 2.0 * t); }
float smoothC2(float t) {
  t = clamp(t, 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

// First-order distance used ONLY for coverage, the union silhouette and a
// narrow edge band. Deep inside, dividing by the angle-dependent gradient
// creates a false saddle; its interior values must not define the dome.
float chamberDistance(vec2 point, vec2 halfSize, float exponent) {
  vec2 q = abs(point) / halfSize;
  vec2 qp = pow(max(q, vec2(0.00001)), vec2(exponent));
  float sum = max(qp.x + qp.y, 0.00000001);
  float norm = pow(sum, 1.0 / exponent);
  vec2 gradient = pow(max(q, vec2(0.00001)), vec2(exponent - 1.0))
    * pow(sum, 1.0 / exponent - 1.0) / halfSize;
  return max((norm - 1.0) / max(length(gradient), 0.0001),
    -min(halfSize.x, halfSize.y));
}

vec2 childCentre() {
  return mix(vec2(373.0, 280.0), vec2(690.0, 280.0), ease(u_growth));
}

vec2 childSize() {
  return max(vec2(0.1), vec2(255.0, 210.0) * u_child_stretch * pow(u_growth, 0.85));
}

float parentDistance(vec2 p) {
  return chamberDistance(p - PARENT, 150.0 * u_parent_stretch, 2.0);
}

float childDistance(vec2 p) {
  return chamberDistance(p - childCentre(), childSize(),
    mix(2.0, u_curvature, ease(u_growth)));
}

float smoothUnion(float a, float b, float radius) {
  float h = clamp(0.5 + 0.5 * (b - a) / radius, 0.0, 1.0);
  return mix(b, a, h) - radius * h * (1.0 - h);
}

float sceneDistance(vec2 p) {
  p = deformPoint(p);
  float parent = parentDistance(p);
  if (u_growth < 0.0001) return parent;
  return smoothUnion(parent, childDistance(p),
    24.0 + 136.0 * sqrt(u_growth));
}

// Smooth, monotone dome potentials. Unlike (f - 1) / length(gradient(f)),
// these have zero centre slope and never turn uphill while moving away from
// a primitive's centre. They join into ONE potential before shading.
float interiorPotential(vec2 p) {
  p = deformPoint(p);
  vec2 rootOffset = (p - PARENT) / (150.0 * u_parent_stretch);
  float parent = 75.0 * (1.0 - dot(rootOffset, rootOffset));
  if (u_growth < 0.0001) return parent;
  vec2 halfSize = childSize();
  vec2 q = abs(p - childCentre()) / halfSize;
  float exponent = mix(2.0, u_curvature, ease(u_growth));
  vec2 powers = pow(q, vec2(exponent));
  float child = min(halfSize.x, halfSize.y) / exponent
    * (1.0 - powers.x - powers.y);
  return -smoothUnion(-parent, -child, 24.0 + 136.0 * sqrt(u_growth));
}

// A C2 blend uses the old distance only within 38 logical pixels of the
// boundary. This preserves the exact joined outline and its edge response;
// no gradient-normalization/cap/flat plateau reaches the interior normal.
// Blend squared heights so the positive height field stays continuous.
float heightAt(vec2 p) {
  float depth = clamp(-sceneDistance(p), 0.0, 165.0);
  float t = depth / 165.0;
  float edgeSquared = 106.0 * 106.0 * (2.0 * t - t * t);
  float potential = interiorPotential(p);
  float interiorSquared = 106.0 * 106.0 * max(potential, 0.0) / 75.0;
  // The two fields need not have identical zero sets around a narrow neck.
  // Fade the core out before its zero; never expose that clamp as an inside rim.
  float weight = smoothC2((depth - 8.0) / 30.0) * smoothC2(potential / 8.0);
  return sqrt(max(0.0, mix(edgeSquared, interiorSquared, weight)));
}

float softLine(float distance, float width) {
  return 1.0 - smoothstep(width, width + 0.9, abs(distance));
}

vec3 environmentAt(vec2 p, float time) {
  // An opt-in rotating colour field, shared by background, transmission and
  // reflection. Rotate only its sampling coordinates: the shape, grid and DOM
  // stay still. The pearl softbox keeps its world-space u_light position.
  // The old field is exact when disabled or sampled at time zero.
  vec2 fieldPoint = p;
  float separation = 1.0;
  if (u_studio_motion > 0.5 && time > 0.0) {
    mat2 rotation = mat2(u_studio_rotation.x, -u_studio_rotation.y,
      u_studio_rotation.y, u_studio_rotation.x);
    fieldPoint = rotation * (p - VIEW * 0.5) + VIEW * 0.5;
    separation += 0.06 * (1.0 - u_studio_rotation.x);
  }
  // Independent, gentle tides move colour centres, extent and density. Every
  // wave is zero at time 0, preserving the accepted static volume. The same
  // field feeds the backdrop, transmission and reflected colour change; the
  // studio light is controlled separately by u_light. Wide travel makes a few
  // seconds readable without pulsing the scene's overall brightness.
  float phase = time * 6.28318530718;
  float tide42 = sin(phase / 42.0);
  float tide45 = sin(phase / 45.0);
  float tide56 = sin(phase / 56.0);
  float tide63 = sin(phase / 63.0);
  float tide70 = sin(phase / 70.0);
  vec2 blueCentre = vec2(120.0, 310.0) + vec2(130.0 * tide56, -60.0 * tide70);
  vec2 lilacCentre = vec2(865.0, 440.0) + vec2(-145.0 * tide63, -80.0 * tide45);
  vec2 indigoCentre = vec2(480.0, 570.0) + vec2(90.0 * tide42, -95.0 * tide70);
  vec2 blueExtent = vec2(310.0, 230.0) * (1.0 + vec2(0.160 * tide63, 0.120 * tide45));
  vec2 lilacExtent = vec2(280.0, 210.0) * (1.0 + vec2(0.180 * tide70, -0.140 * tide56));
  vec2 indigoExtent = vec2(230.0, 170.0) * (1.0 + vec2(0.150 * tide45, 0.140 * tide63));
  vec2 blueDelta = (fieldPoint - blueCentre) / blueExtent;
  vec2 lilacDelta = (fieldPoint - lilacCentre) / lilacExtent;
  vec2 indigoDelta = (fieldPoint - indigoCentre) / indigoExtent;
  vec2 pearlDelta = (p - u_light * VIEW) / vec2(420.0, 320.0);
  float blue = exp(-dot(blueDelta, blueDelta));
  float lilac = exp(-dot(lilacDelta, lilacDelta));
  float pearl = exp(-dot(pearlDelta, pearlDelta));
  vec3 colour = vec3(0.932, 0.947, 0.991);
  colour = mix(colour, vec3(0.580, 0.730, 0.960), blue * 0.70 * (1.0 + 0.150 * tide42) * separation);
  colour = mix(colour, vec3(0.760, 0.660, 0.940), lilac * 0.62 * (1.0 + 0.130 * tide70) * separation);
  colour = mix(colour, vec3(0.620, 0.650, 0.900),
    exp(-dot(indigoDelta, indigoDelta)) * 0.24 * (1.0 + 0.220 * tide56) * separation);
  colour = mix(colour, vec3(0.992, 0.990, 1.0), pearl * 0.27);

  // Review direction: no default guide curves or background line overlays.
  if (u_grid > 0.5) {
    vec2 grid = abs(mod(p + 40.0, 80.0) - 40.0);
    float line = max(softLine(grid.x, 0.35), softLine(grid.y, 0.35));
    colour = mix(colour, vec3(0.620, 0.658, 0.814), line * 0.22);
  }
  return colour;
}

vec3 environment(vec2 p) { return environmentAt(p, u_time); }

// A small Gaussian stencil samples the same analytic scene, only through the
// material. Radius arrives in logical units converted from the CSS-pixel UI.
// Foreground DOM text never enters this renderer or these samples.
vec3 blurredEnvironment(vec2 p, float radius) {
  if (radius <= 0.0001) return environment(p);
  vec2 offset = vec2(radius * 1.41421356237, 0.0);
  vec3 colour = environment(p) * 0.25;
  colour += (environment(p + offset.xy) + environment(p - offset.xy)
    + environment(p + offset.yx) + environment(p - offset.yx)) * 0.125;
  colour += (environment(p + vec2(offset.x, offset.x))
    + environment(p + vec2(-offset.x, offset.x))
    + environment(p + vec2(offset.x, -offset.x))
    + environment(p - vec2(offset.x, offset.x))) * 0.0625;
  return colour;
}

// A distant studio surrounds the whole joined surface. These broad coloured
// walls and the softbox are sampled by the reflected view vector, not painted
// at local sphere/panel coordinates. Moving the light or changing the normal
// therefore changes the reflected structure across every part consistently.
vec3 reflectedEnvironment(vec3 direction) {
  vec3 colour = mix(vec3(0.746, 0.720, 0.914), vec3(0.726, 0.824, 0.974),
    clamp(0.5 - direction.y * 0.5, 0.0, 1.0));
  colour = mix(colour, vec3(0.938, 0.954, 0.994),
    pow(max(direction.z, 0.0), 3.0) * 0.82);

  vec3 blueWall = normalize(vec3(-0.86, 0.20, 0.48));
  vec3 lilacWall = normalize(vec3(0.78, 0.43, 0.45));
  float blue = exp(-max(0.0, 1.0 - dot(direction, blueWall)) * 5.5);
  float lilac = exp(-max(0.0, 1.0 - dot(direction, lilacWall)) * 6.0);
  colour = mix(colour, vec3(0.546, 0.682, 0.913), blue * 0.72);
  colour = mix(colour, vec3(0.742, 0.660, 0.916), lilac * 0.63);
  // Retain the accepted studio at time 0, while its coloured reflection
  // follows the SAME analytic field sampled by the visible background and
  // transmission. Only its colour drift is added; the softbox follows u_light.
  vec2 scenePoint = VIEW * 0.5 + direction.xy * VIEW * 0.5;
  vec3 sceneChange = environment(scenePoint) - environmentAt(scenePoint, 0.0);
  colour = clamp(colour + sceneChange * 0.65, 0.0, 1.0);

  vec3 softboxDirection = normalize(vec3(u_light * VIEW - VIEW * 0.5, 620.0));
  vec3 across = normalize(cross(vec3(0.0, 1.0, 0.0), softboxDirection));
  vec3 up = cross(softboxDirection, across);
  vec2 box = vec2(dot(direction, across), dot(direction, up));
  float softbox = exp(-2.0 * (pow(abs(box.x) / 0.52, 4.0)
    + pow(abs(box.y) / 0.30, 4.0)));
  float sourceCore = exp(-3.0 * (pow(box.x / 0.28, 2.0)
    + pow(box.y / 0.15, 2.0)));
  float visibleSource = smoothstep(0.15, 0.55, dot(direction, softboxDirection));
  // The source has a small bright core and a softer surround. Most of the
  // clear surface transmits the scene instead of carrying a white veil.
  return mix(colour, vec3(1.0, 0.998, 1.0),
    (softbox * 0.27 + sourceCore * 0.69) * visibleSource);
}

void main() {
  float scale = min(u_resolution.x / VIEW.x, u_resolution.y / VIEW.y);
  vec2 screen = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y);
  vec2 p = (screen - u_resolution * 0.5) / scale + VIEW * 0.5;
  if (u_portrait > 0.5) {
    scale = min(u_resolution.x / VIEW.y, u_resolution.y / VIEW.x);
    p = vec2(screen.y / u_resolution.y * VIEW.x,
      (1.0 - screen.x / u_resolution.x) * VIEW.y);
  }
  float aa = max(0.45, 0.8 / scale);
  float distance = sceneDistance(p);
  float coverage = 1.0 - smoothstep(-aa, aa, distance);
  vec3 background = environment(p);

  vec2 castDirection = normalize(VIEW * 0.5 - u_light * VIEW + vec2(0.01));
  float shadowDistance = sceneDistance(p - castDirection * 12.0);
  float shadow = exp(-max(shadowDistance, 0.0) / 13.0) * (1.0 - coverage);
  background = mix(background, vec3(0.658, 0.684, 0.827),
    shadow * (u_edge > 0.5 && u_edge < 1.5 ? 0.07 : 0.045));

  if (distance > aa) {
    gl_FragColor = vec4(background, 1.0);
    return;
  }

  float stepSize = 1.1;
  vec2 slope = vec2(
    heightAt(p + vec2(stepSize, 0.0)) - heightAt(p - vec2(stepSize, 0.0)),
    heightAt(p + vec2(0.0, stepSize)) - heightAt(p - vec2(0.0, stepSize))
  ) / (2.0 * stepSize);
  vec3 normal = normalize(vec3(-slope, 1.0));
  vec3 light = normalize(vec3(u_light * VIEW - p, 620.0));
  vec3 halfway = normalize(light + vec3(0.0, 0.0, 1.0));
  float diffuse = max(dot(normal, light), 0.0);
  float broadHighlight = pow(max(dot(normal, halfway), 0.0), 24.0);
  float focusedHighlight = pow(max(dot(normal, halfway), 0.0), 150.0);
  float fresnel = pow(1.0 - normal.z, 1.45);
  float shoulder = pow(1.0 - normal.z, 0.72);
  float thickness = clamp(-distance / 145.0, 0.0, 1.0);

  float refraction = 1.25;
  float edgeStrength = 0.94;
  float pearlStrength = 0.025;
  float bodyVeil = 0.018;
  float reflectionWeight = 0.065 + fresnel * 0.49;
  float sourceStrength = 0.48;
  if (u_edge > 0.5 && u_edge < 1.5) {
    refraction = 0.92; edgeStrength = 0.79; pearlStrength = 0.12;
    bodyVeil = 0.055; reflectionWeight = 0.20 + shoulder * 0.38;
    sourceStrength = 0.70;
  } else if (u_edge > 1.5) {
    refraction = 1.65; edgeStrength = 0.98; pearlStrength = 0.04;
    reflectionWeight = 0.075 + fresnel * 0.52; sourceStrength = 0.56;
  }
  // Each shared numeric control addresses a separate optical term.
  float specularGain = u_specular_opacity / 0.65;
  reflectionWeight *= specularGain;
  sourceStrength *= specularGain;
  refraction *= u_refraction_level;
  bodyVeil = u_glass_opacity <= 0.012
    ? bodyVeil * (u_glass_opacity / 0.012)
    : mix(bodyVeil, 1.0, (u_glass_opacity - 0.012) / 0.988);

  // One air-to-glass bend (IOR 1.46), then intersection with an approximate
  // background plane. It samples ONLY this analytic environment, never DOM.
  // The continuous height and normal remain unchanged by the optical presets.
  vec3 transmittedRay = refract(vec3(0.0, 0.0, -1.0), normal, 1.0 / 1.46);
  float opticalTravel = 18.0 + heightAt(p) * 0.8;
  vec2 displacement = transmittedRay.xy / max(0.25, -transmittedRay.z)
    * opticalTravel * refraction;
  vec2 refractedPoint = p + displacement;
  float transmissionBlur = u_blur_level + u_progressive_blur * smoothC2(thickness);
  vec3 surface = blurredEnvironment(refractedPoint, transmissionBlur);
  // Keep the transmitted scene visible instead of whitening the whole body.
  surface = mix(surface, vec3(0.966, 0.975, 1.0), clamp(bodyVeil * (1.0 + thickness * 0.35), 0.0, 1.0));
  vec3 reflectedView = reflect(vec3(0.0, 0.0, -1.0), normal);
  vec3 reflected = reflectedEnvironment(reflectedView);
  if (u_specular_saturation != 1.0) {
    float luminance = dot(reflected, vec3(0.2126, 0.7152, 0.0722));
    reflected = clamp(mix(vec3(luminance), reflected, u_specular_saturation), 0.0, 1.0);
  }
  surface = mix(surface, reflected, reflectionWeight);
  surface += vec3(0.080, 0.076, 0.100) * (diffuse - 0.76);
  surface = mix(surface, vec3(0.997, 0.995, 1.0),
    clamp(broadHighlight * 0.12 * specularGain + focusedHighlight * sourceStrength, 0.0, 0.98));

  surface = mix(surface, vec3(0.866, 0.822, 0.990), pearlStrength * shoulder);

  // Intentional control: the geometry is unchanged, but independent flat
  // panel/neck paint demonstrates the seam that a unified material avoids.
  if (u_flat > 0.5 && u_growth > 0.0001) {
    float parentMask = 1.0 - smoothstep(-aa, aa, parentDistance(p));
    float childMask = 1.0 - smoothstep(-aa, aa, childDistance(p));
    vec3 flatPaint = mix(vec3(0.946, 0.953, 0.992), surface, parentMask);
    surface = mix(flatPaint, vec3(0.895, 0.917, 0.978), childMask);
  }

  // Only the joined silhouette receives an edge. Lighting selects the bright
  // and dark side; there is no always-white full circular ring.
  vec2 outward = normalize(normal.xy + vec2(0.00001));
  vec2 towardLight = normalize(light.xy + vec2(0.00001));
  float facing = dot(outward, towardLight);
  float thinEdge = exp(-pow((distance + 0.65) / 0.9, 2.0));
  float innerEdge = exp(-pow((distance + 1.9) / 0.8, 2.0));
  float litEdge = (0.14 + 0.86 * pow(max(facing, 0.0), 1.7)) * thinEdge;
  float sourceShoulder = exp(-pow((distance + 3.4) / 2.2, 2.0))
    * pow(max(facing, 0.0), 5.0);
  // The narrow dark inner band is paired with the outer light, while the
  // much broader shoulder is produced by reflection above, not a thick ring.
  surface = mix(surface, vec3(0.708, 0.752, 0.890),
    innerEdge * (0.25 + 0.75 * max(-facing, 0.0)) * edgeStrength * 0.09);
  surface = mix(surface, vec3(0.999, 0.998, 1.0),
    clamp((litEdge * edgeStrength + sourceShoulder * 0.24) * specularGain, 0.0, 0.98));
  gl_FragColor = vec4(clamp(mix(background, surface, coverage), 0.0, 1.0), 1.0);
}
`;

function bounded(value, fallback, min, max) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {{render(options?: Partial<typeof DEFAULTS>, budget?: {maxPixels?: number, maxDpr?: number}): void, destroy(): void}}
 * render() is synchronous and draws one frame. The caller owns animation.
 * time is elapsed seconds (initially 0); pause it outside to freeze the field.
 * studioMotion opts into a 40-second colour-field rotation; it owns no clock.
 * portrait rotates the logical scene clockwise; the host keeps DOM text upright.
 * blurLevel/progressiveBlur are CSS-pixel sigmas of the analytic transmission.
 * Material ranges: specularOpacity/glassOpacity 0..1,
 * specularSaturation/refractionLevel 0..3, blurLevel/progressiveBlur 0..6.
 * A WebGL/compilation/context failure is exposed as canvas.dataset.error.
 */
export function createGlassPreview(canvas) {
  let options = { ...DEFAULTS };
  let gl = null;
  let program = null;
  let buffer = null;
  let shaders = [];
  let locations = {};
  let destroyed = false;
  let lost = false;
  let maxDimension = 16_384;

  function release() {
    if (!gl) return;
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    shaders.forEach(shader => gl.deleteShader(shader));
    buffer = null;
    program = null;
    shaders = [];
  }

  function compile(type, source) {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Unable to allocate a WebGL shader.');
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) || 'Glass preview shader compilation failed.');
    }
    return shader;
  }

  function initialize() {
    try {
      gl = canvas.getContext('webgl', {
        alpha: false, antialias: false, depth: false,
        stencil: false, premultipliedAlpha: false,
        preserveDrawingBuffer: false,
      });
      if (!gl) throw new Error('WebGL is unavailable. This material preview needs WebGL.');
      const viewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
      maxDimension = Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE), viewport[0], viewport[1]);
      program = gl.createProgram();
      if (!program) throw new Error('Unable to allocate the WebGL program.');
      gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || 'Glass preview shader linking failed.');
      }
      buffer = gl.createBuffer();
      if (!buffer) throw new Error('Unable to allocate the WebGL drawing buffer.');
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      locations = Object.fromEntries([
        'resolution', 'light', 'curvature', 'growth', 'edge', 'flat', 'grid', 'time',
        'studio_motion', 'studio_rotation', 'portrait',
        'parent_stretch', 'child_stretch', 'deform_point', 'deform_amount',
        'specular_opacity', 'specular_saturation', 'refraction_level',
        'blur_level', 'progressive_blur', 'glass_opacity',
      ].map(name => [name, gl.getUniformLocation(program, `u_${name}`)]));
      locations.position = gl.getAttribLocation(program, 'a_position');
      delete canvas.dataset.error;
      canvas.dataset.renderer = 'webgl-2.5d';
    } catch (error) {
      canvas.dataset.error = error instanceof Error ? error.message : String(error);
      release();
    }
  }

  function render(next = {}, budget = {}) {
    if (destroyed) return;
    const merged = { ...options, ...next };
    options = {
      edge: ['balanced', 'pearl', 'strong'].includes(merged.edge) ? merged.edge : 'balanced',
      flat: Boolean(merged.flat),
      curvature: bounded(merged.curvature, DEFAULTS.curvature, 2, 5.2),
      lightX: bounded(merged.lightX, DEFAULTS.lightX, 0, 1),
      lightY: bounded(merged.lightY, DEFAULTS.lightY, 0, 1),
      growth: bounded(merged.growth, DEFAULTS.growth, 0, 1),
      showGrid: Boolean(merged.showGrid),
      studioMotion: Boolean(merged.studioMotion),
      portrait: Boolean(merged.portrait),
      // All wave periods, including the studio rotation, divide 2520. Wrapping
      // stays continuous and preserves float precision in long-running previews.
      time: Number.isFinite(merged.time) ? Math.max(0, merged.time) % 2520 : 0,
      parentX: bounded(merged.parentX, 1, .85, 1.15),
      parentY: bounded(merged.parentY, 1, .85, 1.15),
      childX: bounded(merged.childX, 1, .85, 1.15),
      childY: bounded(merged.childY, 1, .85, 1.15),
      deformX: bounded(merged.deformX, 500, -100, 1100),
      deformY: bounded(merged.deformY, 280, -100, 660),
      deformDX: bounded(merged.deformDX, 0, -32, 32),
      deformDY: bounded(merged.deformDY, 0, -32, 32),
      specularOpacity: bounded(merged.specularOpacity, DEFAULTS.specularOpacity, 0, 1),
      specularSaturation: bounded(merged.specularSaturation, DEFAULTS.specularSaturation, 0, 3),
      refractionLevel: bounded(merged.refractionLevel, DEFAULTS.refractionLevel, 0, 3),
      blurLevel: bounded(merged.blurLevel, DEFAULTS.blurLevel, 0, 6),
      progressiveBlur: bounded(merged.progressiveBlur, DEFAULTS.progressiveBlur, 0, 6),
      glassOpacity: bounded(merged.glassOpacity, DEFAULTS.glassOpacity, 0, 1),
    };
    if (!program || lost) return;
    const rect = canvas.getBoundingClientRect();
    const raster = volumeRasterSize(rect.width, rect.height, {
      ...budget, dpr: globalThis.devicePixelRatio || 1,
      deviceMemory: globalThis.navigator?.deviceMemory,
      hardwareConcurrency: globalThis.navigator?.hardwareConcurrency,
      saveData: globalThis.navigator?.connection?.saveData,
      maxDimension,
    });
    const { width, height } = raster;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    gl.viewport(0, 0, width, height);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(locations.position);
    gl.vertexAttribPointer(locations.position, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(locations.resolution, width, height);
    gl.uniform2f(locations.light, options.lightX, options.lightY);
    gl.uniform2f(locations.parent_stretch, options.parentX, options.parentY);
    gl.uniform2f(locations.child_stretch, options.childX, options.childY);
    gl.uniform2f(locations.deform_point, options.deformX, options.deformY);
    gl.uniform2f(locations.deform_amount, options.deformDX, options.deformDY);
    gl.uniform1f(locations.curvature, options.curvature);
    gl.uniform1f(locations.growth, options.growth);
    gl.uniform1f(locations.edge, { balanced: 0, pearl: 1, strong: 2 }[options.edge]);
    gl.uniform1f(locations.flat, options.flat ? 1 : 0);
    gl.uniform1f(locations.grid, options.showGrid ? 1 : 0);
    gl.uniform1f(locations.time, options.time);
    gl.uniform1f(locations.studio_motion, options.studioMotion ? 1 : 0);
    const studioAngle = options.time * (Math.PI * 2 / 40);
    gl.uniform2f(locations.studio_rotation, Math.cos(studioAngle), Math.sin(studioAngle));
    gl.uniform1f(locations.portrait, options.portrait ? 1 : 0);
    gl.uniform1f(locations.specular_opacity, options.specularOpacity);
    gl.uniform1f(locations.specular_saturation, options.specularSaturation);
    gl.uniform1f(locations.refraction_level, options.refractionLevel);
    const logicalPerCssPixel = raster.scale / (options.portrait
      ? Math.min(width / 560, height / 1000)
      : Math.min(width / 1000, height / 560));
    gl.uniform1f(locations.blur_level, options.blurLevel * logicalPerCssPixel);
    gl.uniform1f(locations.progressive_blur, options.progressiveBlur * logicalPerCssPixel);
    gl.uniform1f(locations.glass_opacity, options.glassOpacity);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    canvas.dataset.renderPixels = String(width * height);
    canvas.dataset.pixelBudget = String(raster.maxPixels);
    canvas.dataset.renderScale = raster.scale.toFixed(4);
    canvas.dataset.budgetLimited = String(raster.limited);
    canvas.dataset.volumeUniforms = JSON.stringify({parentX:options.parentX,parentY:options.parentY,childX:options.childX,childY:options.childY,deformX:options.deformX,deformY:options.deformY,deformDX:options.deformDX,deformDY:options.deformDY,curvature:options.curvature});
  }

  function contextLost(event) {
    event.preventDefault();
    lost = true;
    canvas.dataset.error = 'WebGL context lost. The preview will redraw if the browser restores it.';
  }

  function contextRestored() {
    if (destroyed) return;
    lost = false;
    // Context restoration invalidates every old GPU handle. Do not delete
    // those stale handles through the restored context; rebuild from source.
    buffer = null;
    program = null;
    shaders = [];
    locations = {};
    initialize();
    // The owner schedules a visible frame after this event. Restoring an
    // offscreen context must not restart its rendering or animation.
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    canvas.removeEventListener('webglcontextlost', contextLost);
    canvas.removeEventListener('webglcontextrestored', contextRestored);
    release();
    delete canvas.dataset.renderer;
  }

  canvas.addEventListener('webglcontextlost', contextLost);
  canvas.addEventListener('webglcontextrestored', contextRestored);
  initialize();
  return { render, destroy };
}
