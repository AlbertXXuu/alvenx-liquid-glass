"use client";

import { useState } from "react";
import { LiquidControl, useGlassSettings } from "@alvenx/liquid-glass";
import "@alvenx/liquid-glass/styles.css";
import "./liquid-glass-entry.css";

/** A small material discovery: reveal the invitation, then follow its native link. */
export function LiquidGlassEntry() {
  const { clock } = useGlassSettings({ storageKey: "alvenx-website-ui-entry-v1" });
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="alvenx-design ui-entry" data-revealed={revealed}>
      <LiquidControl id="website-ui-entrance" clock={clock} kind="circle"
        className="ui-entry__sphere" label="Explore Liquid Glass"
        expanded={revealed} onClick={() => setRevealed(true)}>
        {null}
      </LiquidControl>
      {revealed && <div className="ui-entry__invitation">
        <LiquidControl id="website-ui-invitation" clock={clock} kind="field" className="ui-entry__glass">
          <a className="ui-entry__link" href="/ui/">explore me!</a>
        </LiquidControl>
      </div>}
    </div>
  );
}
