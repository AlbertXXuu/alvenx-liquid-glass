import { useCallback, useEffect, useLayoutEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { GlassClock, boundedFrameRate } from './GlassClock';
import { DEFAULT_SETTINGS, SETTINGS_KEY, readSettings, type ReviewSettings } from './reviewSettings';
import type { GlassOpticsMode } from './opticalSupport';

export type UseGlassSettingsOptions = { storageKey?: string; optics?: GlassOpticsMode; maxFps?: number };
export type GlassSettingsController = {
  clock: GlassClock;
  settings: ReviewSettings;
  setSettings: Dispatch<SetStateAction<ReviewSettings>>;
  updateSettings: (next: Partial<ReviewSettings>) => void;
  reset: () => void;
  reduced: boolean;
  systemReduced: boolean;
};

/** Own one shared clock and optional per-instance storage namespace.
 * The system's motion preference always wins over the saved user toggle. */
export function useGlassSettings({ storageKey = SETTINGS_KEY, optics = 'auto', maxFps = 60 }: UseGlassSettingsOptions = {}): GlassSettingsController {
  const [clock] = useState(() => new GlassClock());
  const [stored, setStored] = useState(() => ({ key: storageKey, value: readSettings(storageKey) }));
  const [systemReduced, setSystemReduced] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const settings = stored.value;
  const reduced = systemReduced || settings.reducedMotion;
  clock.strength = settings.interactionStrength; clock.material = settings; clock.reduced = reduced; clock.optics = optics;
  clock.maxFps = boundedFrameRate(maxFps);

  useLayoutEffect(() => {
    if (stored.key !== storageKey) setStored({ key: storageKey, value: readSettings(storageKey) });
  }, [storageKey, stored.key]);
  useLayoutEffect(() => { clock.wake(); }, [clock, settings, reduced, optics, maxFps]);
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setSystemReduced(preference.matches);
    update(); preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (stored.key !== storageKey) return;
    try { localStorage.setItem(storageKey, JSON.stringify(stored.value)); } catch { /* Storage is optional. */ }
  }, [stored, storageKey]);
  useEffect(() => () => clock.destroy(), [clock]);

  const setSettings: Dispatch<SetStateAction<ReviewSettings>> = useCallback(next => {
    setStored(old => {
      const previous = old.key === storageKey ? old.value : readSettings(storageKey);
      return { key: storageKey, value: typeof next === 'function' ? next(previous) : next };
    });
  }, [storageKey]);
  const updateSettings = useCallback((next: Partial<ReviewSettings>) => setSettings(old => ({ ...old, ...next })), [setSettings]);
  const reset = useCallback(() => setSettings({ ...DEFAULT_SETTINGS }), [setSettings]);
  return { clock, settings, setSettings, updateSettings, reset, reduced, systemReduced };
}
