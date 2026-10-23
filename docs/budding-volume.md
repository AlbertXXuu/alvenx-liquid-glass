# Homepage volume entrance

`VolumeBuddingLink` promotes the owner-accepted R7 entrance (source
`82de4e4cae458dd716ef3462c9c94192d1114265`) without changing the original
`BuddingLink` or the `/ui/` showcase. Import both `styles.css` and
`budding-volume.css`, and render inside `.alvenx-design` with a shared clock.

```tsx
import { VolumeBuddingLink, useGlassSettings } from '@alvenx/liquid-glass';
import '@alvenx/liquid-glass/styles.css';
import '@alvenx/liquid-glass/budding-volume.css';

export function Entrance() {
  const { clock } = useGlassSettings({ storageKey: 'my-entrance' });
  return <span className="alvenx-design">
    <VolumeBuddingLink id="home-entrance" clock={clock} href="/ui/" />
  </span>;
}
```

The mother is 54 CSS pixels, or 44 at viewport widths at most 360 pixels.
The accepted `explore me!` label and its measured optical margins are fixed.
Actual occupied width pushes the following item. Keep the discovery pair on
its own row on narrow screens; do not absolutely position the adjacent link.
The mother toggles, including during animation. Detached hover and press are
independent. Outside activation, Escape and leaving the viewport close it.
Reduced motion settles immediately, and native keyboard focus remains visible.

The SSR image is the accepted closed shader frame, with the same continuous
soft contact shadow used by the live body. The reference material combines
native backdrop optics with the large form's analytic 2.5D blue/violet
environment. It is not a physically unified 3D renderer. Geometry, shader,
first-frame pixels and the final mobile shadow fix retain R7 behavior.

For a server-rendered entrance above the fold, optionally copy the package's
`budding-early.js` export to a versioned, same-origin static URL and load it as
an external classic deferred script. Set `earlyActivation` on **one** entrance
per document. This preserves an early or held activation across hydration;
without the script, the initial native anchor still navigates to `href`.
No JavaScript also leaves a visible, usable native destination. Network and
unsupported-driver shader compilation are not promised to take zero time.
The host should verify its CSP, production SSR and client routing behavior.

Rights remain reserved / UNLICENSED. No registry publication is authorized.
