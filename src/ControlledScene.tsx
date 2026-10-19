import { createContext, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';

export type ControlledSceneSize = { width: number; height: number };
export type ControlledSceneValue = {
  /** One live SVG source definition, shared by the base and optical consumers. */
  id: string;
  /** Current viewport coordinates; stable function identity, fresh scroll position. */
  bounds: () => DOMRectReadOnly;
  revision: number;
  /** Source has positive measured dimensions and has reached a painted frame. */
  ready: boolean;
};

export const ControlledSceneContext = createContext<ControlledSceneValue | null>(null);

export type ControlledSourceProps = {
  /** Existing positioned container; the source SVG occupies this element's box. */
  container: RefObject<HTMLElement | null>;
  /** Explicit shared scene, expressed in CSS pixels; include its required base fill. */
  paint: (size: ControlledSceneSize) => ReactNode;
  children?: ReactNode;
};

const emptyBounds: DOMRectReadOnly = {
  x: 0, y: 0, width: 0, height: 0, left: 0, top: 0, right: 0, bottom: 0,
  toJSON: () => ({ x: 0, y: 0, width: 0, height: 0, left: 0, top: 0, right: 0, bottom: 0 }),
};

/**
 * Registers an explicit source inside an existing positioned container. This is
 * ordinary SVG source filtering, not arbitrary DOM backdrop capture. Keep native
 * semantic labels/editors in children; paint supplies only registered scene items.
 * Paint may opt individual SVG text nodes into native selection with pointerEvents.
 */
export function ControlledSource({ container, paint, children }: ControlledSourceProps) {
  const id = `alvenx-controlled-source-${useId().replace(/[^a-z0-9]/gi, '')}`;
  const [size, setSize] = useState<ControlledSceneSize>({ width: 0, height: 0 });
  const [state, setState] = useState({ ready: false, revision: 0 });
  const currentContainer = useRef(container); currentContainer.current = container;
  const bounds = useCallback(() => currentContainer.current.current?.getBoundingClientRect() ?? emptyBounds, []);

  // A child's layout effects may run before the containing parent's ref is
  // attached. Passive attachment sees both external and wrapper refs reliably.
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      const next = { width: rect.width, height: rect.height };
      setSize(previous => previous.width === next.width && previous.height === next.height ? previous : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [container]);

  const content = useMemo(() => size.width > 0 && size.height > 0 ? paint(size) : null, [paint, size]);
  useLayoutEffect(() => {
    // Source data changes are live edits, not a new loading cycle.
    setState(previous => ({ ...previous, revision: previous.revision + 1 }));
  }, [content, size]);

  const valid = size.width > 0 && size.height > 0;
  useLayoutEffect(() => {
    if (!valid) { setState(previous => previous.ready ? { ...previous, ready: false } : previous); return; }
    // Gate only the initial positive-size transition. Including content in
    // this effect would postpone readiness forever for continuously changing
    // scenes and would briefly blank the lens on every slider value edit.
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setState(previous => ({ ...previous, ready: true })));
    });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, [valid]);

  const value = useMemo<ControlledSceneValue>(() => ({ id, bounds, ...state }), [id, bounds, state]);
  return <ControlledSceneContext.Provider value={value}>
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"
      width="100%" height="100%" viewBox={`0 0 ${Math.max(1, size.width)} ${Math.max(1, size.height)}`}
      data-controlled-source={id} data-source-ready={state.ready} data-source-revision={state.revision}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'hidden', pointerEvents: 'none' }}>
      <defs><g id={id}>{content}</g></defs>
      <use href={`#${id}`} />
    </svg>
    {children}
  </ControlledSceneContext.Provider>;
}

export type ControlledSceneProps = Omit<ControlledSourceProps, 'container'> & {
  className?: string;
  style?: CSSProperties;
};

/** A positioned scene wrapper for a standalone specimen or freely movable lens. */
export function ControlledScene({ children, paint, className, style }: ControlledSceneProps) {
  const container = useRef<HTMLDivElement>(null);
  return <div ref={container} className={className} style={{ ...style, position: 'relative' }}>
    <ControlledSource container={container} paint={paint}>{children}</ControlledSource>
  </div>;
}
