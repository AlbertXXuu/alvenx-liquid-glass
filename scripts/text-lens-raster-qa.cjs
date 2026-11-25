// Playwright CLI callback for the isolated raster candidate.
// Run from a directory directly inside .workspace/tmp.
async page => {
  const base = page.url().split(/[?#]/)[0];
  const loopback = /^http:\/\/(?:127\.0\.0\.1|localhost):(\d+)(?:\/|$)/.exec(base);
  if (!loopback || ['4418', '4421', '5286'].includes(loopback[1])) throw Error('Open the isolated raster candidate first.');
  const browser = page.context().browser();
  const stageSel = '.text-lens-stage';
  const poseSel = '[data-text-lens-body]';
  const hitSel = '[data-text-lens-hit]';
  const rimSel = '[data-text-lens-rim]';
  const sourceSel = '[data-text-lens-source]';
  const rasterSel = '[data-text-lens-linear]';
  const transmissionSel = '[data-text-lens-transmission]';
  const output = '../../audits/text-lens-raster-20261125';
  const cases = [
    { name: 'desktop-1x', viewport: { width: 1366, height: 900 }, dpr: 1 },
    { name: 'desktop-2x', viewport: { width: 1366, height: 900 }, dpr: 2 },
    { name: 'narrow-1x', viewport: { width: 390, height: 844 }, dpr: 1 },
    { name: 'narrow-2x', viewport: { width: 390, height: 844 }, dpr: 2 },
  ];
  const report = { url: base, browser: browser.version(), assetRefs: [], cases: [], fallback: [], checks: [] };
  const check = (name, pass, detail) => {
    report.checks.push({ name, pass: !!pass, detail });
    if (!pass) throw Error(name + ' ' + JSON.stringify(detail));
  };
  const nextFrame = p => p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const screenshot = { scale: 'device', timeout: 40000 };

  async function instrument(p, { sampler = 'linear', noWebgl = false } = {}) {
    await p.addInitScript(({ raster, sampler, noWebgl }) => {
      localStorage.setItem('alvenx-design-showcase-v1', JSON.stringify({ ambient: false }));
      const evidence = { calls: [], blocked: [], uploads: [] };
      window.__textRasterQa = evidence;
      const paintedText = new WeakMap();
      const fillText = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
        paintedText.set(this.canvas, String(text));
        return fillText.call(this, text, ...args);
      };
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
        if (noWebgl && this.matches(raster) && /^webgl/i.test(kind)) {
          evidence.blocked.push(kind);
          return null;
        }
        const context = getContext.call(this, kind, ...args);
        if (this.matches(raster) && /^webgl/i.test(kind) && context) window.__textRasterQaContext = context;
        return context;
      };
      for (const proto of [window.WebGLRenderingContext?.prototype, window.WebGL2RenderingContext?.prototype]) {
        if (!proto || !Object.hasOwn(proto, 'texParameteri')) continue;
        const parameter = proto.texParameteri;
        proto.texParameteri = function (target, pname, arg) {
          const lens = this.canvas instanceof Element && this.canvas.matches(raster);
          const filtering = pname === this.TEXTURE_MIN_FILTER || pname === this.TEXTURE_MAG_FILTER;
          const next = lens && filtering && sampler === 'nearest' && arg === this.LINEAR ? this.NEAREST : arg;
          const value = parameter.call(this, target, pname, next);
          if (lens && filtering) {
            evidence.calls.push({ pname, requested: arg, effective: this.getTexParameter(target, pname) });
          }
          return value;
        };
        if (!Object.hasOwn(proto, 'texImage2D')) continue;
        const upload = proto.texImage2D;
        proto.texImage2D = function (...values) {
          if (this.canvas instanceof Element && this.canvas.matches(raster)) {
            const pixelSource = values.at(-1);
            evidence.uploads.push({ format: values[2], source: pixelSource?.constructor?.name,
              width: pixelSource?.width, height: pixelSource?.height, text: paintedText.get(pixelSource) });
          }
          return upload.apply(this, values);
        };
      }
    }, { raster: rasterSel, sampler, noWebgl });
  }

  async function read(p) {
    return await p.locator(poseSel).evaluate((body, selectors) => {
      const stage = body.closest(selectors.stage);
      const raster = body.querySelector(selectors.raster);
      const native = stage.querySelector(selectors.source);
      const rim = body.querySelector(selectors.rim);
      const transmission = body.querySelector(selectors.transmission);
      const box = stage.getBoundingClientRect(), text = native.getBoundingClientRect();
      const transform = rim.getScreenCTM();
      return {
        x: +body.dataset.x, y: +body.dataset.y, width: +body.dataset.width, height: +body.dataset.height,
        angle: +body.dataset.textLensAngle, phase: body.dataset.motion, transition: Boolean(body.dataset.transition),
        path: rim.getAttribute('d'), scale: devicePixelRatio,
        screen: { width: box.width, height: box.height },
        transform: [transform.a, transform.b, transform.c, transform.d, transform.e - box.x, transform.f - box.y],
        inputBox: { left: text.left - box.left, right: text.right - box.left, top: text.top - box.top, bottom: text.bottom - box.top },
        native: { value: native.value, focus: document.activeElement === native,
          selection: [native.selectionStart, native.selectionEnd], count: stage.querySelectorAll(selectors.source).length },
        raster: raster ? { visible: getComputedStyle(raster).visibility === 'visible' && getComputedStyle(raster).display !== 'none' &&
          Number(getComputedStyle(raster).opacity) > 0, width: raster.width, height: raster.height,
          count: body.querySelectorAll(selectors.raster).length } : null,
        renderer: { mode: transmission.dataset.transmission, revision: transmission.dataset.sourceRevision,
          backdrop: getComputedStyle(transmission).backdropFilter },
      };
    }, { stage: stageSel, raster: rasterSel, rim: rimSel, source: sourceSel, transmission: transmissionSel });
  }

  async function open(p, options = {}) {
    await instrument(p, options);
    const url = base + (options.optics ? '?optics=' + options.optics : '');
    const response = await p.goto(url);
    if (!response?.ok()) throw Error('Could not open candidate ' + url);
    const stage = p.locator(stageSel);
    await stage.scrollIntoViewIfNeeded();
    await p.locator(poseSel).waitFor();
    await p.evaluate(() => document.fonts.ready);
    return stage;
  }

  const waitMode = async (p, ...modes) => {
    try {
      await p.waitForFunction(({ selector, modes }) =>
        modes.includes(document.querySelector(selector)?.dataset.transmission), { selector: transmissionSel, modes }, { timeout: 8000 });
    } catch (error) {
      throw Error('Expected renderer ' + modes.join('/') + ': ' + error.message + ' ' + JSON.stringify(await read(p)));
    }
  };

  async function edit(p, stage) {
    const input = stage.locator(sourceSel);
    const original = await input.inputValue();
    const before = await read(p);
    await input.focus();
    await waitMode(p, 'editing');
    await input.press('Home');
    await input.press('Shift+End');
    const native = await read(p);
    check('native editor retains one editable selection above optical preview', native.native.count === 1 &&
      native.native.focus && native.native.selection[0] === 0 && native.native.selection[1] === original.length, native.native);
    check('editing hides both optical copies while the original native field owns focus',
      native.renderer.backdrop === 'none' && !native.raster?.visible, { renderer: native.renderer, raster: native.raster });
    const applyDraft = async (text, event) => await input.evaluate((field, { text, event }) => {
      if (event === 'start') field.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }));
      const value = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      value.call(field, text);
      if (event === 'end') field.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: text }));
      field.dispatchEvent(new InputEvent('input', { bubbles: true, data: text,
        inputType: event === 'end' ? 'insertText' : 'insertCompositionText', isComposing: event !== 'end' }));
    }, { text, event });
    await applyDraft('guang', 'start');
    await nextFrame(p);
    const composition = await read(p);
    check('synthetic composition retains the live native draft without a second text layer',
      await input.inputValue() === 'guang' && composition.renderer.mode === 'editing' &&
      !composition.raster?.visible && composition.renderer.backdrop === 'none', composition.renderer);
    await applyDraft('光影', 'update');
    await nextFrame(p);
    check('synthetic composition candidate remains native', await input.inputValue() === '光影');
    await applyDraft('光影', 'end');
    await p.waitForFunction(sel => document.querySelector(sel)?.getAttribute('aria-busy') !== 'true', sourceSel, { timeout: 8000 })
      .catch(error => { throw Error('Synthetic composition font readiness: ' + error.message); });
    check('composition commit retains the final text', await input.inputValue() === '光影');
    await p.evaluate(() => {
      const load = FontFaceSet.prototype.load;
      window.__textRasterLateFonts = [];
      window.__textRasterFontCalls = [];
      FontFaceSet.prototype.load = function (font, text) {
        window.__textRasterFontCalls.push({ font, text });
        const result = load.call(this, font, text);
        if (text !== '迟到') return result;
        const held = new Promise(resolve => window.__textRasterLateFonts.push(resolve));
        return result.then(async faces => { await held; return faces; });
      };
    });
    await input.fill('迟到');
    try {
      await p.waitForFunction(() => window.__textRasterLateFonts.length > 0, undefined, { timeout: 8000 });
    } catch (error) {
      const calls = await p.evaluate(() => window.__textRasterFontCalls);
      throw Error('Late font gate did not receive a request: ' + error.message +
        ' ' + JSON.stringify({ calls, input: await input.inputValue(), status: await stage.locator('.text-lens-status').textContent() }));
    }
    await input.fill('Latest 光');
    await input.press('End');
    await input.press('Shift+ArrowLeft');
    await p.waitForFunction(sel => document.querySelector(sel)?.getAttribute('aria-busy') !== 'true', sourceSel, { timeout: 8000 })
      .catch(error => { throw Error('Newest draft font readiness: ' + error.message); });
    const selection = await input.evaluate(field => field.value.slice(field.selectionStart, field.selectionEnd));
    check('subsequent bilingual native selection survives font readiness', selection === '光', selection);
    await input.blur();
    await waitMode(p, 'linear');
    const latest = await read(p);
    const currentUploads = await p.evaluate(() => window.__textRasterQa.uploads.slice());
    check('leaving the editor builds exactly one raster of the latest draft', latest.native.value === 'Latest 光' &&
      latest.raster?.visible && latest.raster.count === 1 && latest.renderer.revision &&
      latest.renderer.revision !== before.renderer.revision && currentUploads.at(-1)?.text === latest.native.value,
      { before: before.renderer, latest: latest.renderer, lastUploaded: currentUploads.at(-1)?.text });
    await p.evaluate(() => window.__textRasterLateFonts.splice(0).forEach(resolve => resolve()));
    await p.waitForTimeout(180);
    const afterLate = await read(p);
    const newUploads = await p.evaluate(count => window.__textRasterQa.uploads.slice(count), currentUploads.length);
    check('a late font completion cannot restore a stale raster or draft',
      afterLate.native.value === latest.native.value && afterLate.raster?.visible && afterLate.raster.count === 1 &&
      newUploads.every(sample => sample.text === latest.native.value),
      { before: latest.renderer, after: afterLate.renderer, newUploads });
    return { before: original, latest: afterLate.native.value, selection, composition: ['guang', '光影'],
      sourceRevisions: [before.renderer.revision, latest.renderer.revision, afterLate.renderer.revision] };
  }

  const waitPose = (p, required) => p.waitForFunction(({ selector, required }) => {
    const { motion, transition } = document.querySelector(selector)?.dataset ?? {};
    return (required === 'released' ? ['idle', 'hover'].includes(motion) : motion === required) && !transition;
  }, { selector: poseSel, required }, { timeout: 5000 });

  async function holdDrag(p, stage) {
    const hit = await stage.locator(hitSel).evaluate(button => {
      const bounds = button.getBoundingClientRect();
      return { x: bounds.x + bounds.width * .5, y: bounds.y + bounds.height * .38 };
    });
    await p.mouse.move(hit.x, hit.y);
    await waitPose(p, 'hover');
    await p.mouse.down();
    await waitPose(p, 'press');
    const press = await read(p);
    const dx = 18, dy = 4;
    await p.mouse.move(hit.x + dx, hit.y + dy, { steps: 7 });
    await waitPose(p, 'drag');
    await nextFrame(p);
    return { press, held: await read(p), dx, dy };
  }

  async function decodeMetrics(p, images, pose) {
    return p.evaluate(async ({ images, pose }) => {
      const decode = async encoded => {
        const bitmap = await createImageBitmap(await (await fetch('data:image/png;base64,' + encoded)).blob());
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close();
        return { width: canvas.width, height: canvas.height, ctx,
          pixels: ctx.getImageData(0, 0, canvas.width, canvas.height).data };
      };
      const [linear, nearest, neutral] = await Promise.all(images.map(decode));
      const { width, height, ctx } = linear;
      if ([nearest, neutral].some(image => image.width !== width || image.height !== height)) throw Error('Viewport capture sizes differ');
      const dpr = pose.scale, d = pose.transform;
      const clip = new Path2D();
      clip.addPath(new Path2D(pose.path), new DOMMatrix(d.map(value => value * dpr)));
      ctx.lineWidth = 7 * dpr;
      const delta = (a, b, offset) => Math.max(...[0, 1, 2].map(i => Math.abs(a.pixels[offset + i] - b.pixels[offset + i])));
      const luminance = (image, i) => {
        const p = image.pixels;
        return .2126 * p[i] + .7152 * p[i + 1] + .0722 * p[i + 2];
      };
      const edge = { linear: { pixels: 0, mixed: 0 }, nearest: { pixels: 0, mixed: 0 } };
      const metrics = { width, height, changingInside: 0, warpInside: 0, opticalOutside: 0, samplerOutside: 0,
        darkInkAppears: 0, darkInkLeaves: 0, outsidePixels: 0, edge };
      const arm = [0, -4, 4, -4 * width, 4 * width];
      for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
        const i = (y * width + x) * 4;
        if (!ctx.isPointInPath(clip, x + .5, y + .5)) {
          if (!ctx.isPointInStroke(clip, x + .5, y + .5)) {
            metrics.outsidePixels++;
            if (delta(linear, neutral, i) > 4) metrics.opticalOutside++;
            if (delta(linear, nearest, i) > 4) metrics.samplerOutside++;
          }
          continue;
        }
        if (ctx.isPointInStroke(clip, x + .5, y + .5)) continue;
        if (delta(linear, nearest, i) > 4) metrics.changingInside++;
        if (delta(linear, neutral, i) > 12) metrics.warpInside++;
        const now = luminance(linear, i), before = luminance(neutral, i);
        if (now < 136 && before - now > 35) metrics.darkInkAppears++;
        if (before < 136 && now - before > 35) metrics.darkInkLeaves++;
        for (const [name, image] of [['linear', linear], ['nearest', nearest]]) {
          const tones = arm.map(offset => luminance(image, i + offset));
          const lo = Math.min(...tones), hi = Math.max(...tones);
          if (lo > 118 || hi < 172) continue;
          const mix = (tones[0] - lo) / (hi - lo);
          edge[name].pixels++;
          if (mix > .13 && mix < .87) edge[name].mixed++;
        }
      }
      for (const value of Object.values(edge)) value.mixedShare = value.mixed / Math.max(1, value.pixels);
      return metrics;
    }, { images: images.map(buffer => buffer.toString('base64')), pose });
  }

  // Each replay runs in a fresh context so NEAREST is a harness-only control
  // and does not leak into runtime settings or the user's browser.
  async function snapshot(config, sampler) {
    const context = await browser.newContext({ viewport: config.viewport, deviceScaleFactor: config.dpr });
    const errors = [];
    try {
      const p = await context.newPage();
      p.on('pageerror', error => errors.push(error.message));
      const stage = await open(p, { sampler });
      await waitMode(p, 'linear');
      await stage.locator(rasterSel).waitFor({ state: 'visible' });
      if (report.assetRefs.length === 0) {
        report.assetRefs = await p.evaluate(() => [...document.querySelectorAll('script[type=module][src],link[rel=stylesheet]')]
          .map(asset => asset.getAttribute('src') ?? asset.getAttribute('href')));
      }
      const start = await read(p);
      const clip = await stage.boundingBox();
      if (!clip) throw Error('The stage could not be measured before the drag');
      const { press, held, dx, dy } = await holdDrag(p, stage);
      check(config.name + ' ' + sampler + ' actual drag reaches requested scene position',
        Math.abs(held.x - press.x - dx) < 1.5 && Math.abs(held.y - press.y - dy) < 1.5 && held.path !== start.path);
      check(config.name + ' ' + sampler + ' held drag reuses one text texture and one visible optical layer',
        !!start.renderer.revision && held.renderer.revision === start.renderer.revision && held.raster?.visible &&
        held.raster.count === 1 && held.renderer.backdrop === 'none' && held.native.count === 1,
        { start: start.renderer, held: held.renderer, raster: held.raster });
      const active = await p.screenshot({ ...screenshot, clip, path: output + '/' + config.name + '-' + sampler + '.png' });
      const neutral = sampler === 'linear' ? await p.screenshot({
        ...screenshot, clip, style: rasterSel + '{visibility:hidden!important}',
      }) : null;
      const gpu = await p.evaluate(() => window.__textRasterQa);
      await p.mouse.up();
      await waitPose(p, 'released');
      const released = await read(p);
      check(config.name + ' ' + sampler + ' release settles with the same ready glyph source',
        released.renderer.mode === 'linear' && released.renderer.revision === held.renderer.revision &&
        !released.transition && Math.abs(released.x - held.x) < 10, { held: held.renderer, released: released.renderer });
      const nativeEdit = sampler === 'linear' && config.name === 'desktop-1x' ? await edit(p, stage) : null;
      return { active, neutral, start, held, released, gpu, nativeEdit, errors };
    } finally {
      await context.close();
    }
  }

  async function renderFallback(config) {
    const context = await browser.newContext({ viewport: cases[2].viewport, deviceScaleFactor: 1 });
    const errors = [];
    try {
      const p = await context.newPage();
      p.on('pageerror', error => errors.push(error.message));
      const stage = await open(p, config);
      if (config.lose) {
        await waitMode(p, 'linear');
        const lose = await p.evaluate(() => {
          const extension = window.__textRasterQaContext?.getExtension('WEBGL_lose_context');
          if (!extension) return false;
          extension.loseContext();
          return true;
        });
        check('browser provided simulated WebGL context loss', lose);
      }
      await waitMode(p, ...config.modes);
      const baseState = await read(p);
      const lens = stage.locator(hitSel), input = stage.locator(sourceSel);
      await lens.focus();
      await lens.press('ArrowRight');
      await waitPose(p, 'released');
      check(config.name + ' moves the fallback lens by keyboard', (await read(p)).x > baseState.x);
      await input.fill('Fallback 光');
      await waitMode(p, 'editing');
      check(config.name + ' preserves one editable native source', (await read(p)).native.count === 1 &&
        await input.inputValue() === 'Fallback 光' && !(await read(p)).raster?.visible);
      await input.blur();
      await waitMode(p, ...config.modes);
      const active = await read(p);
      const blocked = await p.evaluate(() => window.__textRasterQa.blocked);
      const expectedFilter = active.renderer.mode === 'svg' ? /^url\(/ : active.renderer.mode === 'native' ? /^blur\(/ : /^none$/;
      check(config.name + ' resumes its real renderer fallback without a visible WebGL duplicate',
        config.modes.includes(active.renderer.mode) && expectedFilter.test(active.renderer.backdrop) &&
        !active.raster?.visible && !errors.length && (!config.noWebgl || blocked.length > 0),
        { active: active.renderer, blocked, errors });
      report.fallback.push({ name: config.name, active: active.renderer, blocked, errors });
    } finally {
      await context.close();
    }
  }

  for (const config of cases) {
    const linear = await snapshot(config, 'linear');
    const nearest = await snapshot(config, 'nearest');
    check(config.name + ' verified same transform at 1:1 LINEAR and NEAREST sampling',
      linear.held.path === nearest.held.path && linear.held.transform.every((value, i) =>
        Math.abs(value - nearest.held.transform[i]) < .001));
    check(config.name + ' the actual lens sampler follows the test control',
      linear.gpu.calls.some(call => call.requested === 9729 && call.effective === 9729) &&
      nearest.gpu.calls.some(call => call.requested === 9729 && call.effective === 9728),
      { linear: linear.gpu.calls, nearest: nearest.gpu.calls });
    const context = await browser.newContext({ viewport: config.viewport, deviceScaleFactor: config.dpr });
    try {
      const p = await context.newPage();
      const pixels = await decodeMetrics(p, [linear.active, nearest.active, linear.neutral], linear.held);
      check(config.name + ' warped ink changes visibly inside while outside stays stable', pixels.warpInside > 40 &&
        pixels.darkInkAppears >= 5 && pixels.darkInkLeaves >= 5 && pixels.opticalOutside === 0 && pixels.samplerOutside === 0, pixels);
      check(config.name + ' linear filtering changes actual interior stroke samples', pixels.changingInside > 30, pixels);
      report.cases.push({ name: config.name, viewport: config.viewport, dpr: config.dpr, pixels,
        live: { held: [linear.held.x, linear.held.y], released: [linear.released.x, linear.released.y] },
        uploads: linear.gpu.uploads, nativeEdit: linear.nativeEdit, errors: [...linear.errors, ...nearest.errors] });
    } finally {
      await context.close();
    }
  }
  for (const config of [
    { name: 'explicit SVG', optics: 'svg', modes: ['svg'] },
    { name: 'explicit native', optics: 'native', modes: ['native'] },
    { name: 'explicit flat', optics: 'flat', modes: ['flat'] },
    { name: 'WebGL unavailable', noWebgl: true, modes: ['native', 'flat'] },
    { name: 'WebGL lost', lose: true, modes: ['native', 'flat'] },
  ]) await renderFallback(config);
  check('no candidate page errors', report.cases.every(test => test.errors.length === 0), report.cases.map(test => test.errors));
  return { status: 'passed', ...report };
}
