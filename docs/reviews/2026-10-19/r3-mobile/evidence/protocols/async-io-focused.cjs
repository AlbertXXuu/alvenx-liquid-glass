async page => {
  const assert = (value, name, detail) => { if (!value) throw new Error(name + ' ' + JSON.stringify(detail)); };
  const context = await page.context().browser().newContext({ viewport: { width: 900, height: 700 } }), p = await context.newPage();
  try {
    await p.route('**/__r3_async_fixture', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><link rel="stylesheet" href="/styles/glass.css"><style>body{margin:0}.test-unit{width:100%;height:100%}</style></head><body class="alvenx-design"><div id="fixture"></div></body></html>' }));
    await p.goto('http://127.0.0.1:5174/__r3_async_fixture');
    await p.evaluate(async () => {
      const ReactModule = await import('/node_modules/.vite/deps/react.js'), React = ReactModule.default || ReactModule, Client = await import('/node_modules/.vite/deps/react-dom_client.js');
      const { ControlledScene, LiquidControl, GlassClock } = await import('/src/index.ts');
      const opticsURL = performance.getEntriesByType('resource').map(entry => entry.name).filter(url => new URL(url).pathname === '/src/backdropOptics.ts').at(-1);
      if (!opticsURL) throw new Error('Actual optics module resource was not loaded');
      const optics = await import(opticsURL);
      const h = (React.default || React).createElement, root = (Client.createRoot || Client.default.createRoot)(document.getElementById('fixture')), clock = new GlassClock();
      const paint = ({ width, height }) => h('rect', { width, height, fill: '#B5C7EF' });
      const render = modes => root.render(h(React.Fragment, null,
        h(ControlledScene, { paint, style: { width: 850, height: 320, margin: 20, display: 'flex', flexWrap: 'wrap', alignContent: 'start', gap: 12 } },
          modes.map((mode, i) => h('div', { key: i, style: { width: 140 + i * 3, height: 48 + i * 2 } }, h(LiquidControl, { id: 'fixture-' + i, clock, optics: mode, className: 'test-unit' }, 'Case ' + i)))),
        h('div', { style: { height: 2000 } })));
      window.fixture = { root, clock, render, optics };
      render(Array(8).fill('native'));
    });
    await p.waitForFunction(() => document.querySelector('[data-controlled-source]')?.dataset.sourceReady === 'true' && document.querySelectorAll('[data-optical-mode=native]').length === 8);
    const nativeInitial = await p.locator('[data-local-glass]').evaluateAll(elements => elements.map(element => ({ mode: element.dataset.opticalMode, transmission: !!element.querySelector('[data-controlled-transmission]') })));
    assert(nativeInitial.every(x => x.mode === 'native' && !x.transmission), 'explicit native stays native even inside ready controlled scene', nativeInitial);
    await p.evaluate(() => {
      const native = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob = function (callback, ...args) { return native.call(this, blob => setTimeout(() => callback(blob), 450), ...args); };
      window.fixture.render(Array(8).fill('auto'));
    });
    await p.waitForFunction(() => { const d = window.fixture.optics.getBackdropOpticsDiagnostics(); return d.owners > 0 && d.activeAsyncJobs === 2 && d.queuedAsyncJobs >= 1; }, undefined, { timeout: 5000 });
    const queued = await p.evaluate(() => window.fixture.optics.getBackdropOpticsDiagnostics());
    await p.evaluate(() => window.scrollTo(0, 900));
    await p.waitForFunction(() => [...document.querySelectorAll('[data-local-glass]')].every(element => element.dataset.visible === 'false') && window.fixture.optics.getBackdropOpticsDiagnostics().queuedAsyncJobs === 0);
    const hidden = await p.evaluate(() => ({ diagnostics: window.fixture.optics.getBackdropOpticsDiagnostics(), versions: [...document.querySelectorAll('[data-local-glass]')].map(element => element.dataset.geometryVersion) }));
    await p.waitForFunction(() => window.fixture.optics.getBackdropOpticsDiagnostics().activeAsyncJobs === 0);
    const hiddenSettled = await p.evaluate(() => ({ diagnostics: window.fixture.optics.getBackdropOpticsDiagnostics(), versions: [...document.querySelectorAll('[data-local-glass]')].map(element => element.dataset.geometryVersion) }));
    assert(hiddenSettled.diagnostics.computations === hidden.diagnostics.computations && JSON.stringify(hidden.versions) === JSON.stringify(hiddenSettled.versions), 'offscreen queued work stops and stale active frames do not commit', { queued, hidden, hiddenSettled });
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForFunction(() => document.querySelectorAll('[data-optical-mode=scene]').length === 8 && window.fixture.optics.getBackdropOpticsDiagnostics().activeAsyncJobs === 0 && window.fixture.optics.getBackdropOpticsDiagnostics().queuedAsyncJobs === 0, { timeout: 15000 });
    const reentered = await p.locator('[data-local-glass]').evaluateAll(elements => elements.map(element => ({ mode: element.dataset.opticalMode, ready: element.dataset.opticalReady, error: element.dataset.opticalError || null })));
    assert(reentered.every(x => x.mode === 'scene' && x.ready === 'true' && !x.error), 're-entry resumes coherent scene optics', reentered);
    await p.evaluate(() => window.fixture.render(['native', 'flat', ...Array(6).fill('auto')]));
    await p.waitForFunction(() => document.querySelector('[data-local-glass=fixture-0]')?.dataset.opticalMode === 'native' && document.querySelector('[data-local-glass=fixture-1]')?.dataset.opticalMode === 'flat');
    const overrides = await p.locator('[data-local-glass]').evaluateAll(elements => elements.slice(0,2).map(element => ({ mode: element.dataset.opticalMode, transmission: !!element.querySelector('[data-controlled-transmission]'), backdrop: !!element.querySelector('.local-backdrop') })));
    assert(overrides[0].mode === 'native' && overrides[0].backdrop && !overrides[0].transmission && overrides[1].mode === 'flat' && !overrides[1].transmission, 'explicit native/flat opt-outs honored after scene mode', overrides);
    await p.evaluate(() => { window.fixture.root.unmount(); window.fixture.clock.destroy(); });
    const destroyed = await p.evaluate(() => window.fixture.optics.getBackdropOpticsDiagnostics());
    assert(destroyed.owners === 0 && destroyed.workspaceBytes === 0 && destroyed.cacheEntries === 0 && destroyed.queuedAsyncJobs === 0, 'unmount releases owner/workspace/cache/queued jobs', destroyed);
    return { status: 'passed', scope: 'Focused Chromium actual LiquidControl/ControlledScene fixture; native encoder callback intentionally delayed450ms to force queue/cancellation', nativeInitial, queued, hidden, hiddenSettled, reentered, overrides, destroyed };
  } finally { await context.close(); }
}
