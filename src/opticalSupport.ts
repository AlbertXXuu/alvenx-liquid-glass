export type GlassOpticsMode = 'auto' | 'svg' | 'native' | 'flat';
export type ResolvedGlassOptics = Exclude<GlassOpticsMode, 'auto'>;

/** CSS.supports only checks syntax, not successful SVG backdrop rendering.
 * Auto conservatively enables the tested SVG path on desktop Chromium and
 * Android Chromium. All iOS browsers use WebKit, regardless of their name.
 * A host may force SVG only after validating its actual target renderer. */
export function resolveGlassOptics(mode: GlassOpticsMode = 'auto'): ResolvedGlassOptics {
  if (typeof CSS === 'undefined' || typeof navigator === 'undefined') return 'flat';
  const native = CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)');
  if (mode === 'flat') return 'flat';
  if (mode === 'native') return native ? 'native' : 'flat';
  const svg = CSS.supports('backdrop-filter', 'url(#alvenx-capability)');
  if (mode === 'svg') return svg ? 'svg' : native ? 'native' : 'flat';
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return !iOS && /(?:Chrome|Chromium)\//.test(ua) && svg ? 'svg' : native ? 'native' : 'flat';
}
