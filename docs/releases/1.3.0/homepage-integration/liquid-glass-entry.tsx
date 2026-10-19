"use client";

import { BuddingLink, useGlassSettings } from "@alvenx/liquid-glass";
import "@alvenx/liquid-glass/styles.css";
import "./liquid-glass-entry.css";

/** The library owns one continuous contour, actual backdrop optics and growth. */
export function LiquidGlassEntry() {
  const { clock } = useGlassSettings({ storageKey: "alvenx-website-ui-entry-v1" });
  return <span className="alvenx-design ui-entry">
    <BuddingLink id="website-ui-entrance" clock={clock} href="/ui/"
      className="ui-entry__bud" label="explore me!" revealLabel="Explore Liquid Glass" />
  </span>;
}
