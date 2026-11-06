import { createGlassPreview, FRAGMENT } from '../volume-renderer.js';

/** @typedef {readonly [x: number, y: number, halfWidth: number, halfHeight: number]} WorkspaceVolumeBox */
/** @typedef {readonly [anchorX: number, anchorY: number, dx: number, dy: number, squash: number]} WorkspaceVolumeDeformation */
/** @typedef {ReturnType<typeof createGlassPreview>['render']} BaseRender */
/**
 * @typedef {Partial<import('../reviewSettings').MaterialParameters> & {
 *   edge?: 'balanced' | 'pearl' | 'strong',
 *   flat?: boolean,
 *   showGrid?: boolean,
 *   studioMotion?: boolean,
 *   lightX?: number,
 *   lightY?: number,
 *   time?: number,
 *   growth?: number,
 *   curvature?: number,
 *   motherBox: WorkspaceVolumeBox,
 *   panelBox: WorkspaceVolumeBox,
 *   neck: number,
 *   detached: boolean,
 *   motherDeformation: WorkspaceVolumeDeformation,
 *   panelDeformation: WorkspaceVolumeDeformation,
 * }} WorkspaceVolumeRenderOptions
 */

const geometry = `
uniform vec4 u_workspace_mother;
uniform vec4 u_workspace_panel;
uniform float u_workspace_neck;
uniform bool u_workspace_detached;
uniform vec4 u_workspace_mother_pull;
uniform vec4 u_workspace_panel_pull;
uniform vec2 u_workspace_squash;

vec2 warpWorkspace(vec2 p, vec2 center, vec4 pull, float squash) {
  vec2 q = center + (p - center) / vec2(1.0 + 0.45 * squash, 1.0 - squash);
  vec2 delta = (p - pull.xy) / 105.0;
  return q - pull.zw * exp(-dot(delta, delta));
}

vec2 warpMother(vec2 p) {
  return warpWorkspace(p, u_workspace_mother.xy, u_workspace_mother_pull, u_workspace_squash.x);
}

vec2 warpPanel(vec2 p) {
  if (!u_workspace_detached) return warpMother(p);
  return warpWorkspace(p, u_workspace_panel.xy, u_workspace_panel_pull, u_workspace_squash.y);
}

float panelExponent() {
  return mix(2.0, u_curvature, ease(u_growth));
}

float parentAt(vec2 p) {
  return chamberDistance(p - u_workspace_mother.xy, u_workspace_mother.zw, 2.0);
}

float childAt(vec2 p) {
  return chamberDistance(p - u_workspace_panel.xy, u_workspace_panel.zw, panelExponent());
}

float joinWorkspace(float a, float b) {
  if (u_workspace_neck < 0.001) return min(a, b);
  float blend = clamp(0.5 + 0.5 * (b - a) / u_workspace_neck, 0.0, 1.0);
  return mix(b, a, blend) - u_workspace_neck * blend * (1.0 - blend);
}

// Pinch-off can occur before the neck radius reaches zero. Keep each lobe's
// residual shoulder in its own coordinates, with the old equidistant divide.
float detachedShoulder(float own, float other) {
  return max(joinWorkspace(own, other), 0.5 * (own - other));
}

float parentDistance(vec2 p) {
  vec2 q = warpMother(p);
  float parent = parentAt(q);
  if (!u_workspace_detached || u_workspace_neck < 0.001) return parent;
  return detachedShoulder(parent, childAt(q));
}

float childDistance(vec2 p) {
  vec2 q = warpPanel(p);
  float child = childAt(q);
  if (!u_workspace_detached || u_workspace_neck < 0.001) return child;
  return detachedShoulder(child, parentAt(q));
}

float sceneDistance(vec2 p) {
  float parent = parentDistance(p);
  if (u_growth < 0.0001) return parent;
  float child = childDistance(p);
  return u_workspace_detached ? min(parent, child) : joinWorkspace(parent, child);
}

float matchRimSlope(float base, float gain) {
  float shoulder = 1.0 - clamp(base, 0.0, 1.0);
  return base * (1.0 + gain * shoulder * shoulder);
}

float parentPotential(vec2 p) {
  vec2 fraction = (p - u_workspace_mother.xy) / u_workspace_mother.zw;
  float base = 1.0 - dot(fraction, fraction);
  // A wide pearl's unscaled dome is shallower than the rim field. Match
  // its near-edge slope without changing the height or curvature at center.
  float gain = clamp(min(u_workspace_mother.z, u_workspace_mother.w) / 165.0 - 1.0, 0.0, 1.75);
  return 75.0 * matchRimSlope(base, gain);
}

float childPotential(vec2 p) {
  vec2 halfSize = u_workspace_panel.zw;
  float exponent = panelExponent();
  vec2 power = pow(abs(p - u_workspace_panel.xy) / halfSize, vec2(exponent));
  float sum = power.x + power.y;
  float shortSide = min(halfSize.x, halfSize.y);
  float aspect = max(halfSize.x, halfSize.y) / shortSide;
  float majorPower = halfSize.x > halfSize.y ? power.x : power.y;
  // Flattened chambers need the correction near the long axis ends. At
  // the short axis rims the original slope is already high enough.
  float gain = clamp((150.0 / 165.0) * aspect - 1.0, 0.0, 2.25)
    * smoothC2(majorPower / max(sum, 0.00001));
  return shortSide / exponent * matchRimSlope(1.0 - sum, gain);
}

float shallowPanel() {
  vec2 halfSize = u_workspace_panel.zw;
  float shortSide = min(halfSize.x, halfSize.y);
  float aspect = max(halfSize.x, halfSize.y) / shortSide;
  return max(1.0 - smoothstep(125.0, 180.0, shortSide), smoothstep(1.95, 2.55, aspect));
}

float volumeHeight(float distance, float potential, float shallow) {
  float depth = clamp(-distance, 0.0, 165.0);
  float t = depth / 165.0;
  float edgeSquared = 106.0 * 106.0 * (2.0 * t - t * t);
  float interiorSquared = 106.0 * 106.0 * max(potential, 0.0) / 75.0;
  float weight = smoothC2((depth - 8.0) / 30.0) * smoothC2(potential / 8.0);
  return sqrt(max(0.0, mix(edgeSquared, interiorSquared, mix(weight, smoothC2(depth / 4.0), shallow))));
}

float joinedHeight(vec2 p, float parent, float child, float distance) {
  float potential = -joinWorkspace(-parentPotential(p), -childPotential(p));
  // The silhouette can contain points where the dome potential is zero.
  // The shallow transition may accelerate only once the panel owns coverage.
  float shoulder = max(0.001, min(16.0, u_workspace_neck));
  float panelOnly = smoothC2((parent - child - u_workspace_neck) / shoulder);
  // While the residual shoulder is wide, a fast inner transition creates a
  // second highlight inside the rim. Fade it in as the neck tapers away.
  float shallowReady = 1.0 - smoothC2(u_workspace_neck / 50.0);
  return volumeHeight(distance, potential, panelOnly * shallowReady * shallowPanel());
}

float heightAt(vec2 p) {
  vec2 root = warpMother(p);
  float parent = parentAt(root);
  if (u_growth < 0.0001) return volumeHeight(parent, parentPotential(root), 0.0);

  if (!u_workspace_detached) {
    float child = childAt(root);
    return joinedHeight(root, parent, child, joinWorkspace(parent, child));
  }

  vec2 tip = warpPanel(p);
  float child = childAt(tip);
  if (u_workspace_neck < 0.001) {
    if (parent <= child) return volumeHeight(parent, parentPotential(root), 0.0);
    return volumeHeight(child, childPotential(tip), shallowPanel());
  }

  float rootChild = childAt(root);
  float tipParent = parentAt(tip);
  float rootDistance = detachedShoulder(parent, rootChild);
  float tipDistance = detachedShoulder(child, tipParent);
  if (rootDistance <= tipDistance) return joinedHeight(root, parent, rootChild, rootDistance);
  return joinedHeight(tip, tipParent, child, tipDistance);
}

`;

const first = FRAGMENT.indexOf('vec2 childCentre()');
const last = FRAGMENT.indexOf('float softLine(', first);
if (first === -1 || last === -1) throw new Error('The volume shader geometry anchors changed.');

const workspaceVariant = {
  fragment: FRAGMENT.slice(0, first) + geometry + FRAGMENT.slice(last),
  uniforms: [
    'workspace_mother', 'workspace_panel', 'workspace_neck', 'workspace_detached',
    'workspace_mother_pull', 'workspace_panel_pull', 'workspace_squash',
  ],
  writeUniforms(gl, uniforms, options) {
    const { motherBox, panelBox, neck, detached, motherDeformation, panelDeformation } = options;
    gl.uniform4fv(uniforms.workspace_mother, motherBox);
    gl.uniform4fv(uniforms.workspace_panel, panelBox);
    gl.uniform1f(uniforms.workspace_neck, neck);
    gl.uniform1i(uniforms.workspace_detached, detached ? 1 : 0);
    gl.uniform4f(uniforms.workspace_mother_pull,
      motherDeformation[0], motherDeformation[1], motherDeformation[2], motherDeformation[3]);
    gl.uniform4f(uniforms.workspace_panel_pull,
      panelDeformation[0], panelDeformation[1], panelDeformation[2], panelDeformation[3]);
    gl.uniform2f(uniforms.workspace_squash, motherDeformation[4], panelDeformation[4]);
  },
};

/** Render one measured workspace frame. The caller owns scheduling and fallback.
 * @param {HTMLCanvasElement} canvas
 */
export function createWorkspaceVolumeRenderer(canvas) {
  const renderer = createGlassPreview(canvas, workspaceVariant);
  return {
    /**
     * @param {WorkspaceVolumeRenderOptions} options
     * @param {Parameters<BaseRender>[1]} [budget]
     */
    render(options, budget) { renderer.render(options, budget); },
    destroy: renderer.destroy,
  };
}
