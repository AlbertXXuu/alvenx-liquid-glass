# Navigation disclosure

The default AlvenX mobile navigation trigger is **two horizontal lines**, with no visible label. Opening the navigation transforms the same lines into a close icon. New AlvenX websites that need this pattern should start with the exported `MenuToggle`, rather than introducing a `+ Menu` label or a different hamburger icon.

Language selection is a separate control. Default authored navigation copy is English; a host may offer an explicit Chinese choice and localize the button's accessible `aria-label`. The icon, geometry and minimum 44 px target do not change with language. Collapse the full navigation at the width where its actual labels and language selector would crowd the wordmark, including in the longer localized state; do not squeeze the trigger or shrink its bars to make the row fit.

All navigation labels at the same level, including a nested Language trigger, inherit one shared navigation typography rule: Instrument Sans with MiSans fallback, weight 500 and line height 1.3. The showcase uses 12 px in the desktop row and 14 px in the expanded navigation at widths up to 900 px. A nested control must follow the same responsive font size as adjacent links, rather than retaining a separate fixed size. Language options inherit this typography; status messages may use their explicit smaller size.

The reference is the actual AlvenX website implementation: `app/header-navigation.tsx` and `.mobile-nav-toggle` / `.mobile-nav-icon` in `app/globals.css`, verified against website source `242be6814526ec4586df37e2ba78add1200a3fc2` on 2026-10-21. The reusable button preserves its visible geometry and transition; a controlled native button replaces the website's native `details` / `summary` host so consumers can own their navigation layout.

## Geometry and visual states

| Property | Canonical value |
| --- | --- |
| Native button and minimum touch target | 44 × 44 CSS px |
| Body | Circular, 1 px transparent border, transparent resting background |
| Icon box | 20 × 20 CSS px |
| Each of the two bars | 20 × 2 CSS px, 2 px corner radius, `currentColor` |
| Closed positions | First bar at `translateY(-4px)`, second at `translateY(4px)` |
| Open positions | First bar at `rotate(45deg)`, second at `rotate(-45deg)` |
| Bar transition | 240 ms, `cubic-bezier(.22,1,.36,1)` |
| Body transition | Background and border, 320 ms, same easing |
| Hover, keyboard focus or open body | White at 35% opacity, border white at 82% opacity |
| Keyboard focus | 3 px blue outline at 48% opacity, 5 px offset |

The navigation sits in the header's translucent layer. This trigger intentionally does not wrap `LiquidControl`: the official site's two-line disclosure uses a native button-like navigation surface, not a refracting material shell. Giving it the heavier liquid contour would change the accepted navigation pattern and add work to a basic disclosure. It requires no `GlassClock`, normal map, image encoding or per-frame JavaScript loop. The host supplies its text color; the bars do not paint a separate brand color.

## React contract

```tsx
import { useRef, useState } from 'react';
import { MenuToggle } from '@alvenx/liquid-glass';
import '@alvenx/liquid-glass/styles.css';

export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  return <header className="alvenx-design">
    <MenuToggle
      ref={trigger}
      expanded={open}
      controls="mobile-primary-navigation"
      onClick={() => setOpen(value => !value)}
      onKeyDown={event => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          close();
        }
      }}
    />
    <nav
      id="mobile-primary-navigation"
      aria-label="Primary navigation"
      hidden={!open}
      onKeyDown={event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          close();
        }
      }}
    >
      <a href="#experience" onClick={close}>Experience</a>
    </nav>
  </header>;
}
```

`expanded` and `controls` are required. They set `aria-expanded` and `aria-controls` on a native `type="button"`; `controls` must match a unique id on the controlled navigation. The icon is hidden from assistive technology. The accessible name defaults to `Navigation menu` and can be overridden with `aria-label`. The component forwards its button ref, `className`, disabled state and other native button attributes and events. It has no children or visible `Menu` text slot. Keep the accessible name stable as the state changes; `aria-expanded` communicates open versus closed.

Styles are scoped under `.alvenx-design`. Place the component in an existing scoped root rather than applying a new background to the header just to style this trigger. The host determines desktop/mobile breakpoints, the navigation panel position, visibility and focus behavior. It must close on link activation, outside press and Escape, and return focus to the trigger when dismissing by Escape. When focus leaves the navigation, close only when `relatedTarget` proves focus moved outside; a null target on touch does not prove this. Never put focusable closed-panel links offscreen or hide them only with opacity. Use `hidden`, conditional rendering or an equivalent inert state.

This is a navigation disclosure, not an ARIA application menu: use native `nav` and links, without `role="menu"` or `aria-haspopup="menu"`. A simple inline disclosure does not trap focus. If a future design uses a modal overlay, implement that separate dialog contract rather than changing the trigger's semantics.

System `prefers-reduced-motion: reduce` removes the transitions while preserving both states. A host-level preference can also pass `reducedMotion`; it cannot override the system request to reduce motion. Forced-color mode retains the native icon color and a visible focus outline. Do not suppress the authored keyboard outline or replace the native button with a pointer-only container.

## Acceptance in a new host

Check closed and open geometry, normal/hover/pressed/focus states, touch target, Enter/Space activation, Escape focus restoration, link and outside dismissal, reduced motion, panel scrolling and narrow layouts. Check that the icon's inherited color remains readable over the actual header background. Product navigation copy defaults to English; optional Chinese specimen text belongs only to an explicit typography test.
