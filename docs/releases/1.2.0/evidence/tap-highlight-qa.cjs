async page => {
  const browser = page.context().browser();
  const out = { engine: browser.browserType().name(), browserVersion: browser.version(), physicalIOS: false, cases: [], errors: [] };
  const path = 'output/playwright/ui-production-2026-10-19/';
  for (const width of [393, 1180]) {
    const context = await browser.newContext({ viewport: { width, height: 1024 }, hasTouch: true });
    const p = await context.newPage();
    p.on('pageerror', e => out.errors.push({ width, error: e.message }));
    try {
      await p.goto('http://127.0.0.1:5174/mobile-review.html');
      await p.evaluate(() => document.fonts.ready);
      await p.waitForTimeout(250);
      const style = await p.evaluate(() => {
        const outside = document.createElement('button');
        outside.textContent = 'scope sentinel';
        document.body.append(outside);
        const result = {
          supported: CSS.supports('-webkit-tap-highlight-color', 'transparent'),
          rootInlineTouchAction: document.querySelector('.alvenx-design').style.touchAction,
          outsideTap: getComputedStyle(outside).getPropertyValue('-webkit-tap-highlight-color'),
          controls: [...document.querySelectorAll('.alvenx-design button, .alvenx-design input, .alvenx-design a, .alvenx-design textarea, .alvenx-design select, .alvenx-design [role="button"]')].map(e => ({
            tag: e.tagName, className: typeof e.className === 'string' ? e.className : '',
            tap: getComputedStyle(e).getPropertyValue('-webkit-tap-highlight-color'),
            touchAction: getComputedStyle(e).touchAction,
            userSelect: getComputedStyle(e).userSelect,
          }))
        };
        outside.remove();
        return result;
      });
      if (style.supported && style.controls.some(e => e.tap !== 'rgba(0, 0, 0, 0)')) throw Error('A scoped interactive control still has an opaque tap highlight');
      if (style.supported && style.outsideTap === 'rgba(0, 0, 0, 0)') throw Error('Tap suppression leaked outside the kit');

      const sw = p.locator('.switch-native').first();
      await sw.scrollIntoViewIfNeeded();
      const beforeSwitch = await sw.getAttribute('aria-checked');
      const switchBox = await sw.boundingBox();
      await p.touchscreen.tap(switchBox.x + switchBox.width / 2, switchBox.y + switchBox.height / 2);
      await p.waitForTimeout(350);
      const afterSwitch = await sw.getAttribute('aria-checked');
      if (beforeSwitch === afterSwitch) throw Error('Tap no longer changes the switch');

      // A held pointer must still drive the contour's authored press feedback.
      await p.mouse.move(switchBox.x + switchBox.width / 2, switchBox.y + switchBox.height / 2);
      await p.mouse.down();
      await p.waitForTimeout(170);
      const heldPressure = await sw.evaluate(e => Number(e.parentElement.querySelector('[data-pressure]').getAttribute('data-pressure')));
      if (heldPressure < .05) throw Error('Authored glass press feedback is missing');
      await sw.locator('..').screenshot({ path: `${path}tap-${out.engine}-${width}-switch-held.png` });
      await p.mouse.up();

      const range = p.locator('.glass-range').first();
      await range.scrollIntoViewIfNeeded();
      const rangeBox = await range.boundingBox();
      await p.touchscreen.tap(rangeBox.x + rangeBox.width * .74, rangeBox.y + rangeBox.height / 2);
      await p.waitForTimeout(180);
      const afterRangeTap = Number(await range.inputValue());
      if (afterRangeTap < .6) throw Error('Native range tap did not update');
      await p.mouse.move(rangeBox.x + rangeBox.width * .74, rangeBox.y + rangeBox.height / 2);
      await p.mouse.down();
      await p.mouse.move(rangeBox.x + rangeBox.width * .3, rangeBox.y + rangeBox.height / 2, { steps: 8 });
      await p.mouse.up();
      await p.waitForTimeout(180);
      const afterRangeDrag = Number(await range.inputValue());
      if (afterRangeDrag >= afterRangeTap - .1) throw Error('Native range drag did not update');

      // Reach the real native range through Tab so keyboard focus is genuine.
      await p.evaluate(() => { document.body.tabIndex = -1; document.body.focus(); });
      let tabs = 0;
      while (!await range.evaluate(e => e === document.activeElement) && tabs++ < 40) await p.keyboard.press('Tab');
      if (tabs >= 40) throw Error('Range is missing from the keyboard sequence');
      const beforeKey = Number(await range.inputValue());
      await p.keyboard.press('ArrowRight');
      await p.waitForTimeout(220);
      const keyboard = await range.evaluate(e => ({ focusVisible: e.matches(':focus-visible'), value: e.valueAsNumber, contourFocus: !!e.closest('.range-rail').querySelector('[data-focus-outline="true"]') }));
      if (!keyboard.focusVisible || !keyboard.contourFocus || keyboard.value <= beforeKey) throw Error(`Range keyboard/focus regression: ${JSON.stringify(keyboard)}`);
      await range.locator('..').screenshot({ path: `${path}tap-${out.engine}-${width}-range-keyboard-focus.png` });

      const field = p.getByRole('textbox', { name: 'Preview message', exact: true });
      await field.fill('Clear text 文字');
      const selection = await field.evaluate(e => { e.setSelectionRange(6, 10); return { value: e.value, start: e.selectionStart, end: e.selectionEnd, userSelect: getComputedStyle(e).userSelect }; });
      if (selection.start !== 6 || selection.end !== 10 || selection.value !== 'Clear text 文字') throw Error('Native text editing or selection changed');
      out.cases.push({ width, style, switchTap: { beforeSwitch, afterSwitch }, heldPressure, afterRangeTap, afterRangeDrag, keyboard, selection });
    } finally { await context.close(); }
  }
  if (out.errors.length) throw Error(JSON.stringify(out.errors));
  return out;
}
