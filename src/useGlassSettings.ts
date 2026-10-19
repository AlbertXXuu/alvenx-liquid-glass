import { useCallback, useEffect, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
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
  const pendingSave = useRef<{ key:string; value:ReviewSettings }|null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const flushSave = useCallback(() => {
    if (saveTimer.current !== null) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    const pending = pendingSave.current; pendingSave.current = null;
    if (pending) try { localStorage.setItem(pending.key, JSON.stringify(pending.value)); } catch { /* Storage is optional. */ }
  }, []);
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
  useLayoutEffect(() => {
    if (stored.key !== storageKey) return;
    // Pointer values still reach the renderer every frame. Serialization and
    // synchronous storage wait for a quiet interval instead of blocking each
    // move; lifecycle events flush the latest value before leaving the page.
    if (pendingSave.current && pendingSave.current.key !== stored.key) flushSave();
    pendingSave.current = { key:stored.key, value:stored.value };
    if (saveTimer.current !== null) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushSave, 250);
  }, [stored, storageKey, flushSave]);
  useEffect(() => {
    const hidden = () => { if (document.hidden) flushSave(); };
    window.addEventListener('pagehide', flushSave);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('pagehide', flushSave);
      document.removeEventListener('visibilitychange', hidden);
      flushSave();
    };
  }, [flushSave]);
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
