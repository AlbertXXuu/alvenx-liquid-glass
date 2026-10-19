import { useLayoutEffect, useRef, type RefObject } from 'react';

/** One existing preview stays above its controls. No second canvas or clock.
 * Re-measure on layout/viewport changes, never on glass animation frames. */
export function useMaterialPreview(header: RefObject<HTMLElement | null>) {
  const group = useRef<HTMLDivElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const host = group.current, surface = preview.current, navigation = header.current;
    if (!host || !surface || !navigation) return;
    const update = () => {
      const height = window.visualViewport?.height ?? window.innerHeight;
      const top = navigation.getBoundingClientRect().bottom + 12;
      host.style.setProperty('--lab-preview-top', `${top}px`);
      host.style.setProperty('--lab-preview-height', `${surface.getBoundingClientRect().height}px`);
      host.dataset.previewDock = String(height >= 700);
      // Keep the last useful size when a software keyboard opens. Undocking
      // must not expand the canvas above the field being edited.
      if (height >= 700) host.style.setProperty('--lab-preview-width', `${Math.max(280, (height - top - 240) * 1.875)}px`);
    };
    const observer = new ResizeObserver(update);
    observer.observe(navigation); observer.observe(surface);
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    update();
    return () => {
      observer.disconnect(); window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, [header]);
  return { group, preview };
}
