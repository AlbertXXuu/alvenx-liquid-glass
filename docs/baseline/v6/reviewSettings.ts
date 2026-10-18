export const PARAMETER_ROWS = [
  { key: 'interactionStrength', label: 'Interaction strength', min: 0, max: 4, step: .1, precision: 2, unit: '×' },
  { key: 'specularOpacity', label: 'Specular opacity', min: 0, max: 1, step: .05, precision: 3, unit: '' },
  { key: 'specularSaturation', label: 'Specular saturation', min: 0, max: 3, step: .1, precision: 2, unit: '' },
  { key: 'refractionLevel', label: 'Refraction level', min: 0, max: 3, step: .1, precision: 2, unit: '' },
  { key: 'blurLevel', label: 'Blur level', min: 0, max: 6, step: .1, precision: 1, unit: 'px' },
  { key: 'progressiveBlur', label: 'Progressive blur', min: 0, max: 6, step: .1, precision: 1, unit: 'px' },
  { key: 'glassOpacity', label: 'Glass background opacity', min: 0, max: 1, step: .001, precision: 3, unit: '' },
] as const;
export const DEFAULT_SETTINGS = { interactionStrength: 2.5, specularOpacity: 1, specularSaturation: 2, refractionLevel: 2, blurLevel: 2, progressiveBlur: 2, glassOpacity: .3, ambient: true, reducedMotion: false };
export type ReviewSettings = typeof DEFAULT_SETTINGS;
export type MaterialParameters = Pick<ReviewSettings, 'specularOpacity'|'specularSaturation'|'refractionLevel'|'blurLevel'|'progressiveBlur'|'glassOpacity'>;
export const SETTINGS_KEY = 'alvenx-material-direction-v2';
export function readSettings(): ReviewSettings {
  const next = { ...DEFAULT_SETTINGS };
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
    for (const row of PARAMETER_ROWS) if (typeof saved[row.key] === 'number' && Number.isFinite(saved[row.key])) next[row.key] = Math.max(row.min, Math.min(row.max, saved[row.key]));
    for (const key of ['ambient', 'reducedMotion'] as const) if (typeof saved[key] === 'boolean') next[key] = saved[key];
  } catch { /* A damaged review setting falls back to visible defaults. */ }
  return next;
}
