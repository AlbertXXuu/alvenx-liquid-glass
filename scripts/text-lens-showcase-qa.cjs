// Playwright CLI callback. Run from a task directory under .workspace/tmp
// after opening the isolated built /ui/ route.
// Recordings and pixel samples are from Windows Chromium and viewport emulation.
async page => {
  const browser = page.context().browser();
  const base = page.url().split('#')[0];
  const loopback = /^http:\/\/(?:localhost|127\.0\.0\.1):(\d+)(?:\/|$)/.exec(base);
  if (!loopback || ['4418', '4421', '5286'].includes(loopback[1])) {
    throw new Error('Open an isolated local text-lens candidate before running this check.');
  }
  const output = '../../audits/text-lens-20261125';
  const stageSel = '.text-lens-stage';
  const bodySel = '[data-text-lens-body]';
  const hitSel = '[data-text-lens-hit]';
  const sourceSel = '[data-text-lens-source]';
  const rimSel = '[data-text-lens-rim]';
  const clipSel = '[data-text-lens-clip]';
  const faceSel = '[data-text-lens-face]';
  const edgeSel = '[data-text-lens-edge]';
  const contactLightSel = '[data-text-lens-contact-light]';
  const contactGradientSel = '[data-text-lens-contact-gradient]';
  const normalProfileSel = '[data-text-lens-normal-profile]';
  const environmentSel = '[data-text-lens-environment]';
  const transmissionSel = '[data-text-lens-transmission]';
  const mapSel = '[data-text-lens-displacement]';
  const cases = [
    { name: 'desktop', viewport: { width: 1366, height: 900 } },
    { name: 'narrow', viewport: { width: 390, height: 844 } },
  ];
  const result = { url: base, browser: browser.version(), assetRefs: [], checks: [], cases: [], images: [], videos: [], errors: [] };
  const check = (name, pass, detail) => {
    result.checks.push({ name, pass: !!pass, detail });
    if (!pass) throw Error(name + ' ' + JSON.stringify(detail));
  };
  const frame = p => p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const fields = ['x', 'y', 'width', 'height', 'strength'];
  const screenshots = { scale: 'css', timeout: 25000 };
  const nativeInset = 2;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const sameLayout = (a, b) => ['x', 'y', 'width', 'height'].every(key => Math.abs(a[key] - b[key]) < .25) &&
    ['font', 'align', 'color', 'padding', 'value'].every(key => a[key] === b[key]);
  const near = (a, b, epsilon = .04) => fields.every(key => Math.abs(a[key] - b[key]) <= epsilon);
  const pathTokens = path => path?.match(/[A-Za-z]|[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi) ?? [];
  const isSamePath = (a, b) => {
    const left = pathTokens(a), right = pathTokens(b);
    return left.length > 0 && left.length === right.length && left.every((token, index) =>
      token === right[index] || Math.abs(Number(token) - Number(right[index])) < .0015);
  };

  function commonEdge(sample) {
    const edge = pathTokens(sample.edge);
    if (edge[0] !== 'M' || edge[3] !== 'C' || edge.length !== 10 || sample.gapWidth !== 0) return false;
    const values = edge.filter(token => Number.isFinite(Number(token))).map(Number);
    const coordinatePairs = Array.from({ length: 4 }, (_, i) => values.slice(i * 2, i * 2 + 2));
    const reverse = coordinatePairs.slice().reverse().flat();
    const endpoints = [values[0], values[6]].sort((a, b) => a - b);
    if (Math.abs(endpoints[0] - nativeInset) > .002 || Math.abs(endpoints[1] - sample.width + nativeInset) > .002 ||
        Math.abs(values[1] - sample.height / 2) > .002 ||
        coordinatePairs.some(([, y]) => Math.abs(y - values[1]) > .0002)) return false;
    const match = (state, target) => state.every((value, i) => Math.abs(value - target[i]) < .0002);
    return ['upper', 'lower'].every(face => {
      const tokens = pathTokens(sample.faces[face]);
      let start;
      for (let i = 0; i < tokens.length;) {
        if (tokens[i] === 'M') {
          start = tokens.slice(i + 1, i + 3).map(Number);
          i += 3;
        } else if (tokens[i] === 'C') {
          const tail = tokens.slice(i + 1, i + 7).map(Number);
          const segment = [...start, ...tail];
          if (match(segment, values) || match(segment, reverse)) return true;
          start = tail.slice(-2);
          i += 7;
        } else {
          i++;
        }
      }
      return false;
    });
  }

  function cubicPath(path) {
    const tokens = pathTokens(path);
    const pair = index => ({ x: Number(tokens[index]), y: Number(tokens[index + 1]) });
    const contours = [];
    for (let i = 0; i < tokens.length;) {
      if (tokens[i] !== 'M') return undefined;
      let start = pair(i + 1);
      i += 3;
      const segments = [];
      while (tokens[i] === 'C') {
        const p1 = pair(i + 1), p2 = pair(i + 3), p3 = pair(i + 5);
        segments.push([start, p1, p2, p3]);
        start = p3;
        i += 7;
      }
      if (tokens[i++] !== 'Z' || segments.length < 4 || distance(segments[0][0], start) > .04) return undefined;
      contours.push(segments);
    }
    const joins = contours.flatMap(segments => segments.map(([, b, c, d], i) => {
      const [, e, f] = segments[(i + 1) % segments.length];
      const inX = d.x - c.x, inY = d.y - c.y, outX = e.x - d.x, outY = e.y - d.y;
      return {
        cosine: (inX * outX + inY * outY) / (Math.hypot(inX, inY) * Math.hypot(outX, outY)),
        firstError: 3 * Math.max(Math.abs(inX - outX), Math.abs(inY - outY)),
        secondError: 6 * Math.max(
          Math.abs(d.x - 2 * c.x + b.x - (f.x - 2 * e.x + d.x)),
          Math.abs(d.y - 2 * c.y + b.y - (f.y - 2 * e.y + d.y)),
        ),
      };
    }));
    return {
      contours: contours.length, segments: joins.length,
      minimumJoinCosine: Math.min(...joins.map(join => join.cosine)),
      firstError: Math.max(...joins.map(join => join.firstError)),
      secondError: Math.max(...joins.map(join => join.secondError)),
      outer: contours.length === 1 ? contours[0] : [],
    };
  }

  // Dimensionless reference for the kit's 32-step, fullness-2.4 lens
  // contour. This checks served browser control points independently.
  const referenceRing = (() => {
    const diagonal = 2 ** (-2 / 2.4);
    const squareness = (2 * diagonal - 1) / diagonal ** 2;
    const raw = Array.from({ length: 32 }, (_, index) => {
      const theta = -Math.PI / 2 + index * Math.PI / 16;
      const scale = Math.sqrt(2 / (1 + Math.sqrt(1 - squareness * Math.sin(2 * theta) ** 2)));
      return [scale * Math.cos(theta), scale * Math.sin(theta)];
    });
    const point = (index, weights) => {
      const [a, b, c] = [-1, 0, 1].map(offset => raw[(32 + index + offset) % 32]);
      const sum = weights.reduce((total, weight) => total + weight, 0);
      return [0, 1].map(axis => (weights[0] * a[axis] + weights[1] * b[axis] + weights[2] * c[axis]) / sum);
    };
    const radius = point(8, [1, 4, 1])[0];
    const normalized = (index, weights) => point(index, weights).map(value => .5 + value / (2 * radius));
    return raw.map((_, index) => [
      normalized(index, [1, 4, 1]), normalized(index, [0, 2, 1]),
      normalized(index, [0, 1, 2]), normalized(index + 1, [1, 4, 1]),
    ]);
  })();

  function referenceError(contour, width, height) {
    if (contour?.outer.length !== referenceRing.length) return Infinity;
    const expected = ([x, y]) => [nativeInset + x * (width - 2 * nativeInset), nativeInset + y * (height - 2 * nativeInset)];
    const start = contour.outer[0][0];
    const ringStart = referenceRing.findIndex(([knot]) => {
      const [x, y] = expected(knot);
      return Math.hypot(start.x - x, start.y - y) < .005;
    });
    if (ringStart < 0) return Infinity;
    return Math.max(...contour.outer.map((segment, index) => Math.max(...segment.map(({ x, y }, control) => {
      const [a, b] = expected(referenceRing[(index + ringStart) % referenceRing.length][control]);
      return Math.max(Math.abs(x - a), Math.abs(y - b));
    }))));
  }

  function cubicValue(points, t, key) {
    const q = 1 - t;
    return q ** 3 * points[0][key] + 3 * q ** 2 * t * points[1][key] +
      3 * q * t ** 2 * points[2][key] + t ** 3 * points[3][key];
  }

  async function open(p) {
    p.on('pageerror', error => result.errors.push(error.message));
    await p.addInitScript(() => {
      localStorage.setItem('alvenx-design-showcase-v1', JSON.stringify({ ambient: false }));
      localStorage.setItem('alvenx-showcase-language-v1', 'en');
    });
    const target = base;
    const response = await p.goto(target);
    if (!response?.ok()) throw Error('Could not load the candidate ' + target);
    const stage = p.locator(stageSel);
    await stage.waitFor();
    await p.waitForFunction(sel => {
      const body = document.querySelector(sel);
      return body?.dataset.optics === 'svg' && body.dataset.opticalReady === 'true';
    }, bodySel);
    await stage.locator(contactLightSel).waitFor({ state: 'attached' });
    await p.evaluate(() => document.fonts.ready);
    return stage;
  }

  async function observe(stage) {
    await stage.evaluate((board, selectors) => {
      const body = board.querySelector(selectors.body);
      const rim = body.querySelector(selectors.rim);
      const clip = body.querySelector(selectors.clip);
      const hit = body.querySelector(selectors.hit);
      const map = body.querySelector(selectors.map);
      const transmission = body.querySelector(selectors.transmission);
      const edge = body.querySelector(selectors.edge);
      const faces = [...body.querySelectorAll(selectors.face)];
      const read = (withBounds = false) => ({
        phase: body.dataset.motion, optics: body.dataset.optics, ready: body.dataset.opticalReady,
        x: +body.dataset.x, y: +body.dataset.y, width: +body.dataset.width, height: +body.dataset.height,
        strength: +body.dataset.strength, angle: +body.dataset.textLensAngle, t: performance.now(),
        gapWidth: +body.dataset.textLensGapPx,
        frameTime: body.dataset.frameTime ? +body.dataset.frameTime : null,
        path: rim?.getAttribute('d'), clip: clip?.getAttribute('d'),
        bounds: withBounds ? (() => {
          const { x, y, width, height } = rim.getBBox();
          return { x, y, width, height };
        })() : undefined,
        edge: edge?.getAttribute('d'),
        faces: Object.fromEntries(faces.map(face => [face.dataset.textLensFace, face.getAttribute('d')])),
        hit: getComputedStyle(hit).clipPath, hitPath: hit.style.clipPath,
        scale: +(map?.getAttribute('scale') ?? 0), backdrop: getComputedStyle(transmission).backdropFilter,
        transition: body.dataset.transition ? JSON.parse(body.dataset.transition) : null,
      });
      const frames = [];
      const state = { read, frames, release: null, raf: 0 };
      const tick = () => {
        const sample = read();
        const last = frames.at(-1);
        if (!last || last.path !== sample.path || last.phase !== sample.phase || last.strength !== sample.strength ||
            last.x !== sample.x || last.y !== sample.y) frames.push(sample);
        state.raf = requestAnimationFrame(tick);
      };
      document.addEventListener('pointerup', () => { state.release = read(); }, { capture: true, once: true });
      window.__alvenxLensEvidence = state;
      state.raf = requestAnimationFrame(tick);
    }, { body: bodySel, rim: rimSel, clip: clipSel, edge: edgeSel, face: faceSel, hit: hitSel,
      transmission: transmissionSel, map: mapSel });
  }

  const read = p => p.evaluate(() => window.__alvenxLensEvidence.read(true));
  const sourceLayout = stage => stage.evaluate((board, selector) => {
    const input = board.querySelector(selector);
    const r = input.getBoundingClientRect(), b = board.getBoundingClientRect();
    const style = getComputedStyle(input);
    return { x: r.left - b.left, y: r.top - b.top, width: r.width, height: r.height, font: style.fontFamily,
      align: style.textAlign, color: style.color, padding: style.padding, value: input.value };
  }, sourceSel);

  const environmentSamples = stage => stage.evaluate(async (board, { texture, gradient, rim, edge }) => {
    const image = board.querySelector(texture);
    const href = image.getAttribute('href') || image.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
    const bitmap = await createImageBitmap(await (await fetch(href)).blob());
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const { width, height } = canvas;
    const pixels = ctx.getImageData(0, 0, width, height).data;
    const edgeNumbers = board.querySelector(edge).getAttribute('d').match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi).map(Number);
    const transform = board.querySelector(rim).getScreenCTM();
    const bounds = board.getBoundingClientRect();
    const sample = (u, v) => {
      const x = Math.max(0, Math.min(width - 1, u * width - .5));
      const y = Math.max(0, Math.min(height - 1, v * height - .5));
      const x0 = Math.floor(x), y0 = Math.floor(y), a = x - x0, b = y - y0;
      const x1 = Math.min(x0 + 1, width - 1), y1 = Math.min(y0 + 1, height - 1);
      const at = (px, py, channel) => pixels[(py * width + px) * 4 + channel];
      return [0, 1, 2].map(channel => Math.round(
        at(x0, y0, channel) * (1 - a) * (1 - b) + at(x1, y0, channel) * a * (1 - b) +
        at(x0, y1, channel) * (1 - a) * b + at(x1, y1, channel) * a * b,
      ));
    };
    const stops = [...board.querySelector(gradient).querySelectorAll('stop')].map(stop => {
      const u = +stop.dataset.environmentX, v = +stop.dataset.environmentY;
      const recorded = stop.dataset.environmentRgb.match(/\d+/g).slice(0, 3).map(Number);
      const x = edgeNumbers[0] + (edgeNumbers[6] - edgeNumbers[0]) * stop.offset.baseVal;
      const point = new DOMPoint(x, edgeNumbers[1]).matrixTransform(transform);
      const mapped = [(point.x - bounds.x) / board.clientWidth, (point.y - bounds.y) / board.clientHeight];
      return { u, v, mapped, recorded, decoded: sample(u, v),
        paint: getComputedStyle(stop).stopColor.match(/\d+/g).slice(0, 3).map(Number),
        opacity: +getComputedStyle(stop).stopOpacity };
    });
    const error = Math.max(...stops.flatMap(stop => stop.recorded.map((rgb, i) => Math.abs(rgb - stop.decoded[i]))));
    const coordinateError = Math.max(...stops.map(stop => Math.max(Math.abs(stop.u - stop.mapped[0]), Math.abs(stop.v - stop.mapped[1]))));
    return { width, height, error, coordinateError, stops };
  }, { texture: environmentSel, gradient: contactGradientSel, rim: rimSel, edge: edgeSel });

  async function comparePixels(stage, sample, active, inactive, withoutLight) {
    const input = await sourceLayout(stage);
    return await stage.evaluate(async (board, data) => {
      const readPixels = async bytes => {
        const bitmap = await createImageBitmap(await (await fetch('data:image/png;base64,' + bytes)).blob());
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close();
        return { ctx, width: canvas.width, height: canvas.height, data: ctx.getImageData(0, 0, canvas.width, canvas.height).data };
      };
      const [on, off, unlit] = await Promise.all([readPixels(data.active), readPixels(data.inactive), readPixels(data.withoutLight)]);
      if (on.width !== off.width || on.height !== off.height) throw Error('Screenshot bounds differ.');
      const boardRect = board.getBoundingClientRect();
      const rim = board.querySelector(data.rim);
      const ctm = rim.getScreenCTM();
      const transform = new DOMMatrix([ctm.a, ctm.b, ctm.c, ctm.d, ctm.e - boardRect.x, ctm.f - boardRect.y]);
      const inverse = transform.inverse();
      const path = new Path2D();
      path.addPath(new Path2D(data.path), transform);
      const coordinates = data.edge.match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi).map(Number);
      const xs = coordinates.filter((_, i) => i % 2 === 0);
      const ys = coordinates.filter((_, i) => i % 2 !== 0);
      const bounds = { x: Math.min(...xs), y: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
      const upper = new Path2D(data.faces.upper), lower = new Path2D(data.faces.lower);
      on.ctx.lineWidth = 5;
      const input = data.input;
      const evidence = {
        width: on.width, height: on.height, inside: 0, insideChanged: 0, outside: 0, outsideChanged: 0,
        darkInkLeaves: 0, darkInkAppears: 0, insideInput: 0, maxOutsideChannelChange: 0,
        contact: {
          rotation: Math.atan2(ctm.b, ctm.a) * 180 / Math.PI,
          declaredGap: data.gapWidth, edgeHeight: bounds.height, edgeY: bounds.y, samples: [],
          light: { changed: 0, left: 0, right: 0, maxChannelDelta: 0, rawMaxChannelDelta: 0,
            centroidDistance: 0, meanLeftDelta: [0, 0, 0], meanRightDelta: [0, 0, 0] },
        },
      };
      const luminance = (pixels, i) => .2126 * pixels[i] + .7152 * pixels[i + 1] + .0722 * pixels[i + 2];
      let weightedDistance = 0, totalChange = 0;
      for (let y = 0; y < on.height; y++) {
        for (let x = 0; x < on.width; x++) {
          const i = (y * on.width + x) * 4;
          const amount = Math.max(Math.abs(on.data[i] - off.data[i]), Math.abs(on.data[i + 1] - off.data[i + 1]),
            Math.abs(on.data[i + 2] - off.data[i + 2]));
          const inside = on.ctx.isPointInPath(path, x + .5, y + .5);
          if (inside) {
            evidence.inside++;
            if (amount > 4) evidence.insideChanged++;
            if (x >= input.x && x <= input.x + input.width && y >= input.y && y <= input.y + input.height) {
              evidence.insideInput++;
              const before = luminance(off.data, i), after = luminance(on.data, i);
              if (before < 148 && after - before > 24) evidence.darkInkLeaves++;
              if (after < 148 && before - after > 24) evidence.darkInkAppears++;
            }
          } else if (!on.ctx.isPointInStroke(path, x + .5, y + .5)) {
            evidence.outside++;
            if (amount > 4) evidence.outsideChanged++;
            evidence.maxOutsideChannelChange = Math.max(amount, evidence.maxOutsideChannelChange);
          }
          const red = on.data[i] - unlit.data[i], green = on.data[i + 1] - unlit.data[i + 1];
          const blue = on.data[i + 2] - unlit.data[i + 2];
          const change = Math.max(Math.abs(red), Math.abs(green), Math.abs(blue));
          const light = evidence.contact.light;
          light.rawMaxChannelDelta = Math.max(change, light.rawMaxChannelDelta);
          if (change <= 4) continue;
          light.changed++;
          light.maxChannelDelta = Math.max(change, light.maxChannelDelta);
          const localX = inverse.a * (x + .5) + inverse.c * (y + .5) + inverse.e;
          const localY = inverse.b * (x + .5) + inverse.d * (y + .5) + inverse.f;
          const fraction = (localX - bounds.x) / bounds.width;
          if (fraction < .45) {
            light.left++;
            [red, green, blue].forEach((value, index) => { light.meanLeftDelta[index] += value; });
          } else if (fraction > .55) {
            light.right++;
            [red, green, blue].forEach((value, index) => { light.meanRightDelta[index] += value; });
          }
          weightedDistance += Math.abs(localY - bounds.y) * change;
          totalChange += change;
        }
      }

      evidence.contact.samples = Array.from({ length: 31 }, (_, i) => {
        const fraction = .06 + i * .88 / 30;
        const localX = bounds.x + bounds.width * fraction;
        const above = bounds.y - .2, below = bounds.y + .2;
        return {
          fraction,
          above: on.ctx.isPointInPath(upper, localX, above) && !on.ctx.isPointInPath(lower, localX, above),
          below: on.ctx.isPointInPath(lower, localX, below) && !on.ctx.isPointInPath(upper, localX, below),
        };
      });
      const light = evidence.contact.light;
      light.centroidDistance = totalChange ? weightedDistance / totalChange : null;
      light.meanLeftDelta = light.meanLeftDelta.map(channel => light.left ? channel / light.left : 0);
      light.meanRightDelta = light.meanRightDelta.map(channel => light.right ? channel / light.right : 0);
      return evidence;
    }, { active: active.toString('base64'), inactive: inactive.toString('base64'), withoutLight: withoutLight.toString('base64'),
      path: sample.path, faces: sample.faces, edge: sample.edge, gapWidth: sample.gapWidth, rim: rimSel, input });
  }

  async function startDrag(p, stage) {
    const hit = await stage.locator(hitSel).boundingBox();
    const board = await stage.boundingBox();
    if (!hit || !board) throw Error('Lens and board must be visible.');
    const { x, y } = await stage.locator(hitSel).evaluate(button => {
      const rect = button.getBoundingClientRect();
      for (const ratio of [.32, .68, .5]) {
        const x = rect.x + rect.width / 2, y = rect.y + rect.height * ratio;
        if (document.elementFromPoint(x, y) === button) return { x, y };
      }
      throw Error('No reachable glass point at the current pose.');
    });
    const dx = Math.max(0, Math.min(23, board.x + board.width - hit.x - hit.width - 12));
    // Keep the narrow input strokes intersecting the thin contact during the
    // optical A/B capture. Both layouts still move and rotate under a real drag.
    const dy = Math.max(0, Math.min(board.width < 490 ? 4 : 13, board.y + board.height - hit.y - hit.height - 12));
    await p.mouse.move(x, y);
    return { x, y, dx, dy };
  }

  async function capture(p, stage, sample, name) {
    const path = output + '/' + name + '.png';
    const active = await stage.screenshot({ ...screenshots, path });
    const map = stage.locator(mapSel);
    let inactive;
    // Neutralize only the displacement. The tint, blur and lens footprint
    // stay in place, so color changes and edge effects cannot stand in for ink motion.
    await map.evaluate(node => node.setAttribute('scale', '0'));
    try {
      await frame(p);
      inactive = await stage.screenshot(screenshots);
    } finally {
      await map.evaluate((node, scale) => node.setAttribute('scale', String(scale)), sample.scale);
      await frame(p);
    }
    const withoutLight = await stage.screenshot({ ...screenshots, style: contactLightSel + '{visibility:hidden!important}' });
    result.images.push(path);
    return await comparePixels(stage, sample, active, inactive, withoutLight);
  }

  async function verify(config) {
    const { name, viewport } = config;
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    try {
      const p = await context.newPage();
      const stage = await open(p);
      if (result.assetRefs.length === 0) {
        result.assetRefs = await p.evaluate(() => [...document.querySelectorAll('script[type=module][src],link[rel=stylesheet]')]
          .map(asset => asset.getAttribute('src') ?? asset.getAttribute('href')));
      }
      const stageRect = await stage.boundingBox();
      check(name + ': split lens is visible at the normal entry before scrolling',
        await p.evaluate(() => scrollY === 0) && stageRect.y >= 0 && stageRect.y + stageRect.height <= viewport.height + 1,
        { stage: stageRect, viewport });
      await observe(stage);
      const stageInput = stage.locator(sourceSel);
      const layout = await sourceLayout(stage);
      const rest = await read(p);
      const stageDimensions = await stage.evaluate(el => ({ width: el.clientWidth, height: el.clientHeight }));
      const restWidth = Math.min(318, stageDimensions.width * (stageDimensions.width < 490 ? .5 : .46));
      const shapeBounds = sample => Math.abs(sample.bounds.x - nativeInset) < .003 &&
        Math.abs(sample.bounds.y - nativeInset) < .003 &&
        Math.abs(sample.bounds.width - sample.width + 2 * nativeInset) < .003 &&
        Math.abs(sample.bounds.height - sample.height + 2 * nativeInset) < .003;
      check(name + ': rest sizing uses the product lens ratio and actual native bounds',
        shapeBounds(rest) && Math.abs(rest.width - restWidth) < .001 &&
        Math.abs(rest.height - restWidth * .34) < .001 && Math.abs(rest.x - stageDimensions.width * .4) < .001 &&
        Math.abs(rest.y - stageDimensions.height * .49) < .001 && layout.value === 'Release checklist',
        { stageDimensions, pose: { width: rest.width, height: rest.height, x: rest.x, y: rest.y }, bounds: rest.bounds, text: layout.value });
      check(name + ': live SVG filter samples native input pixels', rest.optics === 'svg' && rest.ready === 'true' &&
        rest.backdrop.includes('url(') && rest.scale > 0 && layout.font.includes('Instrument Sans'), { rest, layout });
      const hits = await stage.locator(hitSel).evaluate(button => {
        const rect = button.getBoundingClientRect();
        return {
          upper: document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height * .27) === button,
          lower: document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height * .73) === button,
          transparentCorner: document.elementFromPoint(rect.x + 2, rect.y + 2) !== button,
        };
      });
      check(name + ': both glass pieces accept pointer hits and the empty corner stays clear',
        hits.upper && hits.lower && hits.transparentCorner, hits);
      const restPixels = await capture(p, stage, rest, name + '-rest');
      const glyphShift = pixels => pixels.insideChanged > 40 && pixels.darkInkLeaves >= 5 &&
        pixels.darkInkAppears >= 5 && pixels.outsideChanged === 0;
      check(name + ': rest glyph pixels relocate inside and outside pixels stay fixed', glyphShift(restPixels), restPixels);
      const meetingFaces = ({ contact }) => contact.declaredGap === 0 && contact.edgeHeight === 0 &&
        contact.samples.every(sample => sample.above && sample.below);
      const paintedLight = ({ contact: { light } }) =>
        light.left > 10 && light.right > 10 && light.maxChannelDelta > 4 && light.centroidDistance < 12;
      check(name + ': upper and lower faces meet on one exact straight cubic', commonEdge(rest) && meetingFaces(restPixels), restPixels.contact);
      check(name + ': normal compositing paints local contact light on both sides of the axis',
        paintedLight(restPixels), restPixels.contact.light);
      const normalProfile = await stage.locator(normalProfileSel).evaluate(gradient => [...gradient.querySelectorAll('stop')]
        .map(stop => ({ offset: stop.offset.baseVal, opacity: +getComputedStyle(stop).stopOpacity })));
      const maxNormalProfileError = Math.max(...normalProfile.map((stop, index) => {
        const offset = index / 40;
        const cos = 1 / Math.hypot(1, 3.5 * (offset - .5));
        const value = index > 0 && index < 40 ? .8 * cos ** 50 + .2 * cos ** 11 : 0;
        return Math.max(Math.abs(offset - stop.offset), Math.abs(value - stop.opacity));
      }));
      check(name + ': the rendered contact normal stops follow the declared specular lobe',
        normalProfile.length === 41 && maxNormalProfileError < .00002,
        { samples: normalProfile.length, maxNormalProfileError, peak: normalProfile[20]?.opacity });
      const texture = await environmentSamples(stage);
      const validTexture = ({ width, height, error, coordinateError, stops }) => width === 161 && height === 81 &&
        error <= 1 && coordinateError < .001 && stops.length >= 3 &&
        stops.every(stop => stop.u >= 0 && stop.u <= 1 && stop.v >= 0 && stop.v <= 1) &&
        new Set(stops.map(stop => stop.recorded.join(','))).size > 2 && new Set(stops.map(stop => stop.paint.join(','))).size > 2 &&
        Math.max(...stops[0].paint.map((channel, i) => Math.abs(channel - stops.at(-1).paint[i]))) > 2;
      check(name + ': the contact gradient samples the actual background PNG with independently decoded RGB', validTexture(texture), texture);
      const start = await startDrag(p, stage);
      await p.waitForFunction(sel => {
        const { motion, transition } = document.querySelector(sel).dataset;
        return motion === 'hover' && !transition;
      }, bodySel, { timeout: 5000 });
      const hover = await read(p);
      check(name + ': hover changes contour and displacement together', hover.path !== rest.path &&
        hover.scale !== rest.scale && hover.strength !== rest.strength, { before: rest.scale, current: hover.scale });
      await p.mouse.down();
      await p.waitForFunction(sel => {
        const { motion, transition } = document.querySelector(sel).dataset;
        return motion === 'press' && !transition;
      }, bodySel, { timeout: 5000 });
      const press = await read(p);
      check(name + ': press changes contour and displacement together', press.path !== hover.path &&
        press.scale !== hover.scale && press.strength !== hover.strength, { before: hover.scale, current: press.scale });
      await p.mouse.move(start.x + start.dx, start.y + start.dy, { steps: 10 });
      await frame(p);
      const dragged = await read(p);
      check(name + ': direct drag moves exactly by the pointer delta', dragged.phase === 'drag' && start.dx >= 20 &&
        Math.abs(dragged.x - press.x - start.dx) < 2 && Math.abs(dragged.y - press.y - start.dy) < 2 && shapeBounds(dragged),
        { expected: [start.dx, start.dy], actual: [dragged.x - press.x, dragged.y - press.y] });
      const dragPixels = await capture(p, stage, dragged, name + '-drag');
      check(name + ': drag glyph pixels relocate inside and outside pixels stay fixed', glyphShift(dragPixels), dragPixels);
      check(name + ': the straight contact stays gapless while the silhouette rotates',
        commonEdge(dragged) && meetingFaces(dragPixels) && Math.abs(dragPixels.contact.rotation - dragged.angle) < .12 &&
        Math.abs(dragged.angle - rest.angle) > .05, { angle: dragged.angle, restAngle: rest.angle, contact: dragPixels.contact });
      check(name + ': measured contact light moves with its local axis', paintedLight(dragPixels), dragPixels.contact.light);
      const movedTexture = await environmentSamples(stage);
      const centerStop = Math.floor(texture.stops.length / 2);
      check(name + ': the moving contact resamples the translated and rotated background locations',
        validTexture(movedTexture) && Math.abs(movedTexture.stops[centerStop].u - texture.stops[centerStop].u) > .005 &&
        Math.abs(movedTexture.stops[centerStop].v - texture.stops[centerStop].v) > .005 &&
        Math.abs(movedTexture.stops.at(-1).v - movedTexture.stops[0].v) > .005, movedTexture);
      const terminalPull = 5;
      await p.mouse.move(start.x + start.dx + terminalPull, start.y + start.dy);
      await p.mouse.up();
      await p.waitForTimeout(780);
      const motion = await p.evaluate(() => {
        const state = window.__alvenxLensEvidence;
        cancelAnimationFrame(state.raf);
        return { frames: state.frames, release: state.release, final: state.read() };
      });
      const release = motion.frames.filter(sample => sample.phase === 'settle' && sample.transition);
      const first = release[0], settled = motion.final;
      const segment = first?.transition;
      const points = segment?.controlPoints;
      const firstFrameGap = first ? distance(motion.release, first) : null;
      check(name + ': moving release starts at the actual drag pose and keeps its direction', motion.release?.phase === 'drag' &&
        Math.abs(motion.release.x - dragged.x - terminalPull) < 2 && points?.length === 4 &&
        near(points[0], motion.release) && points[1].x > points[0].x && firstFrameGap < 9,
        { release: motion.release, firstFrameGap, transition: segment });
      check(name + ': release arrives at its cubic endpoint with zero final tangent', release.length >= 3 &&
        near(points[2], points[3]) && near(settled, points[3]) && ['idle', 'hover'].includes(settled.phase),
        { samples: release.length, endpoint: points[3], final: settled });
      const timed = motion.frames.filter(sample => sample.transition && Number.isFinite(sample.frameTime));
      const width = await stage.evaluate(el => el.clientWidth);
      const curveErrors = timed.map(sample => {
        const { startedAt, duration, controlPoints } = sample.transition;
        const t = Math.max(0, Math.min(1, (sample.frameTime - startedAt) / duration));
        return Math.max(...fields.map(key => Math.abs(sample[key] - cubicValue(controlPoints, t, key))));
      });
      const timedPhases = [...new Set(timed.map(sample => sample.phase))];
      check(name + ': browser-sampled hover, press, and release poses lie on the declared cubics',
        ['hover', 'press', 'settle'].every(phase => timedPhases.includes(phase)) && Math.max(...curveErrors) < .15,
        { observedFrames: curveErrors.length, phases: timedPhases, maxPoseError: Math.max(...curveErrors) });
      const angleErrors = timed.map(sample => {
        const { startedAt, duration, controlPoints } = sample.transition;
        const u = Math.max(0, Math.min(1, (sample.frameTime - startedAt) / duration));
        const angle = .036 * (cubicValue(controlPoints, u, 'x') - width * .4) +
          .032 * (cubicValue(controlPoints, u, 'strength') - 44);
        return Math.abs(sample.angle - angle);
      });
      check(name + ': the rotating contact follows the same cubic time segments',
        angleErrors.length >= 3 && Math.max(...angleErrors) < .005, { maxAngleError: Math.max(...angleErrors) });
      const spatial = motion.frames.map(sample => {
        const contour = cubicPath(sample.path);
        const hitPath = (sample.hitPath || sample.hit).match(/path\(["'](.*)["']\)/)?.[1];
        const nativeError = referenceError(contour, sample.width, sample.height);
        return { phase: sample.phase, nativeError, contour: contour && { ...contour, outer: undefined },
          shared: sample.path === sample.clip && isSamePath(sample.path, hitPath) &&
            commonEdge(sample) && cubicPath(sample.faces.upper)?.contours === 1 && cubicPath(sample.faces.lower)?.contours === 1 };
      });
      const invalid = spatial.find(sample => !sample.shared || sample.contour?.contours !== 1 ||
        sample.contour.segments !== 32 || !(sample.nativeError < .003) ||
        !(sample.contour.firstError < .0061 && sample.contour.secondError < .0241));
      check(name + ': each browser pose shares the native 32-cubic fullness-2.4 contour and C2 joins',
        spatial.length > 9 && !invalid, { observedFrames: spatial.length, firstInvalid: invalid,
          maxNativeError: Math.max(...spatial.map(s => s.nativeError)),
          maxFirstJoinError: Math.max(...spatial.map(s => s.contour?.firstError ?? Infinity)),
          maxSecondJoinError: Math.max(...spatial.map(s => s.contour?.secondError ?? Infinity)) });
      check(name + ': native typography retains the same box and layout during and after drag',
        sameLayout(layout, await sourceLayout(stage)) && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        { original: layout, after: await sourceLayout(stage) });

      const editBounds = await stageInput.boundingBox();
      await p.mouse.click(editBounds.x + 12, editBounds.y + editBounds.height / 2);
      check(name + ': uncovered source can be focused with the real pointer', await stageInput.evaluate(el => el.matches(':focus')));
      const text = 'Light bends 光与形';
      await stageInput.fill(text);
      await stageInput.press('Home');
      await stageInput.press('Shift+End');
      const edit = await stageInput.evaluate(element => ({
        kind: element.localName, editable: !element.readOnly && !element.disabled, focused: element.matches(':focus'),
        value: element.value, selected: element.value.slice(element.selectionStart, element.selectionEnd),
        font: getComputedStyle(element).fontFamily,
      }));
      check(name + ': resilient native keyboard editing and selection in optical source',
        edit.kind === 'input' && edit.editable && edit.focused && edit.value === text &&
        edit.selected === edit.value && edit.font.includes('Instrument Sans') && edit.font.includes('MiSans'), edit);
      const lens = stage.locator(hitSel);
      const prior = await read(p);
      await lens.focus();
      await lens.press('ArrowLeft');
      await p.waitForTimeout(360);
      const keyboard = await read(p);
      check(name + ': lens moves under keyboard control without changing draft',
        keyboard.x < prior.x && await stageInput.inputValue() === edit.value && await lens.evaluate(el => el.matches(':focus-visible')),
        { before: prior.x, after: keyboard.x, draft: await stageInput.inputValue() });

      result.cases.push({ name, viewport, restPixels, dragPixels, texture, movedTexture,
        phases: [...new Set(motion.frames.map(sample => sample.phase))],
        temporal: { transition: segment, firstFrameGap, release: release.map(({ frameTime, t, x, y, width, height, strength, angle }) =>
          ({ frameTime, t, x, y, width, height, strength, angle })), maxPoseError: Math.max(...curveErrors),
        maxAngleError: Math.max(...angleErrors) } });
    } finally {
      await context.close();
    }
  }

  async function reducedMotion() {
    const viewport = cases[1].viewport;
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    try {
      const p = await context.newPage();
      const stage = await open(p);
      await observe(stage);
      const start = await startDrag(p, stage);
      await p.mouse.down();
      await p.mouse.move(start.x + start.dx, start.y + start.dy, { steps: 5 });
      await frame(p);
      const held = await read(p);
      await p.mouse.up();
      await frame(p);
      const released = await read(p);
      await p.waitForTimeout(500);
      const motion = await p.evaluate(() => {
        const state = window.__alvenxLensEvidence;
        cancelAnimationFrame(state.raf);
        return { frames: state.frames.map(sample => ({ phase: sample.phase, transition: sample.transition })), last: state.read() };
      });
      check('reduced motion: direct drag and immediate stable release preserve an operable lens',
        held.phase === 'drag' && ['idle', 'hover'].includes(released.phase) && near(held, released) &&
        held.angle === 0 && released.angle === 0 && near(released, motion.last) && !released.transition &&
        motion.frames.every(sample => !sample.transition && sample.phase !== 'settle'),
        { held, released, last: motion.last, phases: [...new Set(motion.frames.map(sample => sample.phase))] });
      const lens = stage.locator(hitSel);
      await lens.focus();
      await lens.press('Home');
      const home = await read(p);
      check('reduced motion: Home moves directly to the same resting position', home.x < held.x && !home.transition &&
        home.optics === 'svg' && await lens.evaluate(el => document.activeElement === el), { held, home });
    } finally {
      await context.close();
    }
  }

  async function record(config) {
    const { name, viewport } = config;
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1,
      recordVideo: { dir: output, size: viewport } });
    let video;
    try {
      const p = await context.newPage();
      video = p.video();
      const stage = await open(p);
      const input = stage.locator(sourceSel);
      await input.fill('Light follows form');
      await input.blur();
      await p.waitForTimeout(420);
      const start = await startDrag(p, stage);
      await p.waitForTimeout(310);
      await p.mouse.down();
      await p.waitForTimeout(240);
      for (let i = 1; i <= 12; i++) {
        await p.mouse.move(start.x + start.dx * i / 12, start.y + start.dy * i / 12);
        await p.waitForTimeout(34);
      }
      await p.mouse.up();
      await p.waitForTimeout(900);
      await stage.locator(hitSel).focus();
      await stage.locator(hitSel).press('Home');
      await p.waitForTimeout(750);
    } finally {
      await context.close();
    }
    const path = output + '/' + name + '-motion.webm';
    const original = (await video.path()).replace(/\\/g, '/');
    const absolute = original.slice(0, original.lastIndexOf('/') + 1) + name + '-motion.webm';
    await video.saveAs(path);
    await video.delete();
    const reader = await browser.newContext();
    try {
      const p = await reader.newPage();
      const fileUrl = await p.evaluate(pathname => new URL('file:///' + pathname).href, absolute);
      await p.goto(fileUrl);
      await p.waitForFunction(() => {
        const video = document.querySelector('video');
        return video?.videoWidth > 0 && Number.isFinite(video.duration);
      });
      const media = await p.locator('video').evaluate(element => ({
        duration: element.duration, width: element.videoWidth, height: element.videoHeight,
      }));
      check(name + ': recorded gesture is a playable Chromium video', media.duration > 1 &&
        media.width === viewport.width && media.height === viewport.height, media);
      result.videos.push({ path, ...media });
    } finally {
      await reader.close();
    }
  }

  for (const config of cases) await verify(config);
  await reducedMotion();
  for (const config of cases) await record(config);
  check('candidate browser logged no page errors', result.errors.length === 0, result.errors);
  return { status: 'passed', ...result };
}
