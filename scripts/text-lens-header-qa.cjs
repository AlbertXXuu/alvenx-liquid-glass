// Playwright CLI callback for the existing /ui/ header on an opened candidate.
async page => {
  const browser = page.context().browser();
  const candidate = page;
  const storageKey = 'alvenx-design-showcase-v1';
  const result = {
    url: page.url(), engine: browser.browserType().name(), version: browser.version(),
    checks: [], failures: [], errors: [], activations: [],
  };
  const check = (name, passed, detail) => (passed ? result.checks : result.failures).push({ name, detail });
  const close = (a, b, tolerance = .04) => Math.abs(a - b) <= tolerance;
  const targetState = locator => locator.evaluate(element => {
    const { x, y, width, height } = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      box: { x, y, width, height },
      background: style.backgroundColor,
      border: style.borderTopColor,
      borderWidth: style.borderTopWidth,
      radius: style.borderRadius,
      outline: { style: style.outlineStyle, width: style.outlineWidth, color: style.outlineColor },
      hover: element.matches(':hover'),
      focusVisible: element.matches(':focus-visible'),
    };
  });
  const focusRing = state => state.focusVisible && state.outline.style === 'solid' &&
    parseFloat(state.outline.width) >= 2 && state.outline.color !== 'rgba(0, 0, 0, 0)';
  const sameBox = (a, b) => Object.keys(a).every(key => a[key] === b[key]);
  const nextFrames = () => candidate.evaluate(() => new Promise(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))));

  candidate.setDefaultTimeout(15000);
  candidate.on('pageerror', error => result.errors.push(error.message));
  try {
    await candidate.setViewportSize({ width: 1440, height: 900 });
    await candidate.emulateMedia({ reducedMotion: 'no-preference' });
    await candidate.bringToFront();
    await candidate.addInitScript(key => {
      localStorage.setItem(key, JSON.stringify({ ambient: false, reducedMotion: false }));
    }, storageKey);
    const response = await candidate.goto(result.url, { waitUntil: 'domcontentloaded' });
    check('Candidate returns HTTP 200', response?.status() === 200, response?.status());
    const header = candidate.locator('.ax-product-header');
    const home = header.locator('[data-alvenx-home]');
    const ordinary = [
      { name: 'Experience button', selector: '#showcase-navigation > button:first-child' },
      { name: 'GitHub link', selector: '#showcase-navigation > a' },
    ];
    await header.waitFor();
    await candidate.evaluate(() => document.fonts.ready);
    const geometry = await header.evaluate(element => {
      const control = element.querySelector('[data-alvenx-home]');
      const wordmark = control.querySelector('.ax-product-header__wordmark');
      const rect = element.getBoundingClientRect();
      const mark = wordmark.getBoundingClientRect();
      const style = getComputedStyle(element);
      const fill = getComputedStyle(element, '::before');
      const rim = getComputedStyle(element, '::after');
      const markStyle = getComputedStyle(wordmark);
      return {
        viewport: document.documentElement.clientWidth,
        rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
        style: {
          position: style.position, minHeight: style.minHeight, padding: style.padding,
          radius: style.borderRadius, gap: style.gap, zIndex: style.zIndex, boxSizing: style.boxSizing,
          background: style.backgroundColor, backgroundImage: style.backgroundImage,
          border: style.borderTopColor, borderWidth: style.borderTopWidth, backdrop: fill.backdropFilter,
          fill: fill.backgroundColor, fillPath: fill.clipPath, rimPath: rim.clipPath,
          shoulder: fill.boxShadow, rimColor: rim.backgroundImage,
        },
        wordmark: {
          width: mark.width, height: mark.height, inset: mark.left - rect.left, display: markStyle.display,
          loaded: wordmark.complete && wordmark.naturalWidth > 0, alt: wordmark.alt,
        },
        home: {
          tag: control.localName, type: control.type, label: control.getAttribute('aria-label'),
          height: control.getBoundingClientRect().height,
        },
        viewTabs: element.querySelectorAll('[role="tab"], [role="tablist"]').length,
      };
    });
    const expectedWidth = Math.min(geometry.viewport, 1480) -
      2 * Math.min(74, Math.max(18, geometry.viewport * .05));
    const { rect, style, wordmark } = geometry;
    check('Desktop shell matches the brand geometry', close(rect.top, 14) && close(rect.width, expectedWidth) &&
      close(rect.left, (geometry.viewport - expectedWidth) / 2) && rect.height >= 70 && style.position === 'fixed' &&
      style.minHeight === '70px' && style.padding === '12px 18px 12px 22px' &&
      style.radius === '26px' && style.gap === '28px' && style.zIndex === '100' && style.boxSizing === 'border-box', geometry);
    check('Desktop fill and rim follow the eight-segment cubic outline', style.background === 'rgba(0, 0, 0, 0)' &&
      style.fill === 'rgba(255, 255, 255, 0.26)' && style.backgroundImage === 'none' &&
      style.border === 'rgba(0, 0, 0, 0)' && style.borderWidth === '1px' &&
      style.backdrop === 'blur(18px) saturate(1.48)' &&
      style.fillPath.startsWith('shape(from 30.4px 0px') && (style.fillPath.match(/curve by /g) ?? []).length === 8 &&
      style.rimPath.startsWith('shape(evenodd from 30.4px 0px') && (style.rimPath.match(/curve by /g) ?? []).length === 16 &&
      style.shoulder.includes('inset') && /0\.62[45]/.test(style.rimColor) && style.rimColor.includes('0.18'), style);
    check('Canonical wordmark and named native Home control', close(wordmark.width, 160) &&
      close(wordmark.height, 160 * 100 / 330) && close(wordmark.inset, 23) && wordmark.display === 'block' &&
      wordmark.loaded && wordmark.alt === 'AlvenX' && geometry.home.tag === 'button' && geometry.home.type === 'button' &&
      geometry.home.height >= 44 && geometry.home.label === 'AlvenX — Back to top', { wordmark, home: geometry.home });

    const focusByTab = async locator => {
      for (let count = 0; count < 9; count++) {
        if (await locator.evaluate(element => element === document.activeElement)) return;
        await candidate.keyboard.press('Tab');
      }
    };
    await focusByTab(home);
    const homeFocus = await targetState(home);
    check('Native Tab reaches the wordmark with a visible focus ring', focusRing(homeFocus), homeFocus);
    for (const { name, selector } of ordinary) {
      const target = candidate.locator(selector);
      await candidate.mouse.move(3, 890);
      await home.evaluate(element => element.focus({ preventScroll: true }));
      await candidate.waitForFunction(query => getComputedStyle(document.querySelector(query)).backgroundColor === 'rgba(0, 0, 0, 0)', selector);
      const idle = await targetState(target);
      await target.hover();
      await candidate.waitForFunction(query => {
        const style = getComputedStyle(document.querySelector(query));
        return style.backgroundColor === 'rgba(255, 255, 255, 0.35)' && style.borderTopColor === 'rgba(255, 255, 255, 0.82)';
      }, selector);
      const hover = await targetState(target);
      await candidate.mouse.move(3, 890);
      await focusByTab(target);
      const focus = await targetState(target);
      check(name + ' uses a transparent reserved target and a stationary glass hover pill',
        idle.background === 'rgba(0, 0, 0, 0)' && idle.border === 'rgba(0, 0, 0, 0)' &&
        idle.borderWidth === '1px' && idle.box.height >= 44 && hover.border === 'rgba(255, 255, 255, 0.82)' &&
        hover.radius === '999px' && hover.hover && sameBox(idle.box, hover.box), { idle, hover });
      check(name + ' has stationary keyboard focus independent of hover',
        !focus.hover && focusRing(focus) && sameBox(idle.box, focus.box), focus);
    }

    const materialInput = candidate.locator('#number-interactionStrength');
    await candidate.getByRole('button', { name: /Surface parameters/ }).click();
    await materialInput.fill('3.15');
    await materialInput.press('Enter');
    await candidate.waitForFunction(key => JSON.parse(localStorage.getItem(key)).interactionStrength === 3.15, storageKey);
    const sample = candidate.getByRole('textbox', { name: 'Sample text', exact: true });
    const message = candidate.getByRole('textbox', { name: 'Preview message', exact: true });
    await sample.fill('Optical sample');
    await message.fill('Keep this message draft');
    await candidate.evaluate(() => {
      const identity = new URL(location.href);
      identity.searchParams.set('header-review', 'yes');
      identity.hash = 'refraction';
      history.replaceState({ headerReview: true }, '', identity);
      const calls = [];
      const clicks = [];
      const samples = [];
      const scroll = window.scrollTo.bind(window);
      window.headerReview = { calls, clicks, samples };
      window.scrollTo = (...args) => {
        const before = scrollY;
        scroll(...args);
        calls.push({ before, immediate: scrollY, behavior: args[0]?.behavior });
      };
      document.querySelector('[data-alvenx-home]').addEventListener('click', event => {
        clicks.push({ trusted: event.isTrusted, detail: event.detail, before: scrollY });
      });
      window.addEventListener('scroll', () => samples.push(scrollY), { passive: true });
    });
    const readState = async () => ({
      browser: await candidate.evaluate(key => ({
        url: location.href, historyLength: history.length, historyState: history.state, storage: localStorage.getItem(key),
      }), storageKey),
      sample: await sample.inputValue(),
      message: await message.inputValue(),
      interactionStrength: await materialInput.inputValue(),
    });
    const original = await readState();
    check('Nondefault persisted settings and native drafts prepared', original.sample === 'Optical sample' &&
      original.message === 'Keep this message draft' && original.interactionStrength === '3.15' &&
      JSON.parse(original.browser.storage).interactionStrength === 3.15, original);

    for (const reduced of [false, true]) {
      if (reduced) {
        await candidate.emulateMedia({ reducedMotion: 'reduce' });
        await candidate.waitForFunction(() => document.querySelector('[aria-label="Reduced motion"]')?.disabled);
        const transition = await candidate.locator(ordinary[0].selector).evaluate(e => getComputedStyle(e).transitionDuration);
        check('System reduced motion disables nav transitions', transition === '0s', transition);
      }
      for (const scrolled of [true, false]) {
        for (const action of ['click', 'Enter', 'Space']) {
          await candidate.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), scrolled ? 950 : 0);
          await nextFrames();
          await home.evaluate(element => element.focus({ preventScroll: true }));
          const before = await candidate.evaluate(() => {
            const trace = window.headerReview;
            trace.calls.length = 0;
            trace.clicks.length = 0;
            trace.samples.length = 0;
            return scrollY;
          });
          if (action === 'click') await home.click();
          else await candidate.keyboard.press(action);
          await candidate.waitForFunction(() => scrollY === 0);
          await nextFrames();
          const trace = await candidate.evaluate(() => ({ ...window.headerReview, after: scrollY }));
          const current = await readState();
          const actualClick = trace.clicks.length === 1 && trace.clicks[0].trusted &&
            (action === 'click' ? trace.clicks[0].detail === 1 : trace.clicks[0].detail === 0);
          const motion = scrolled
            ? before > 0 && trace.calls.length === 1 && trace.calls[0].before === before &&
              trace.calls[0].behavior === (reduced ? 'instant' : 'smooth') &&
              (reduced ? trace.calls[0].immediate === 0 : trace.calls[0].immediate === before &&
                trace.samples.some(y => y > 0 && y < before))
            : before === 0 && trace.calls.length === 0 && trace.samples.every(y => y === 0);
          const name = action + (scrolled ? ' from scroll' : ' at top') + (reduced ? ' with reduced motion' : '');
          result.activations.push({ name, before, ...trace });
          check(name + ' preserves URL, history and state', actualClick && motion && trace.after === 0 &&
            JSON.stringify(original) === JSON.stringify(current), current);
        }
      }
    }
    check('No browser page errors', result.errors.length === 0, result.errors);
  } catch (error) {
    result.failures.push({ name: 'Header suite completion', detail: String(error) });
  }
  result.status = result.failures.length ? 'failed' : 'passed';
  return result;
}
