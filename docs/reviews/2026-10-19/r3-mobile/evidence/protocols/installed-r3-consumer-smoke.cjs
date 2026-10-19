async page => {
  const assert = (value, name, detail) => { if (!value) throw new Error(name + ' ' + JSON.stringify(detail)); }, checks = [], errors = [];
  const context = await page.context().browser().newContext({ viewport: { width: 1180, height: 900 } }), p = await context.newPage();
  p.on('pageerror', error => errors.push(error.message));
  try {
    await p.goto('http://127.0.0.1:5184/');
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(250);
    const before = await p.locator('#outside').evaluate(element => { const s = getComputedStyle(element); return { fontFamily: s.fontFamily, fontSize: s.fontSize, color: s.color, insideKit: !!element.closest('.alvenx-design') }; });
    assert(before.fontFamily === 'serif' && before.fontSize === '20px' && before.color === 'rgb(80, 40, 100)' && !before.insideKit, 'outside host styling remains independent', before); checks.push('scoped CSS preserves outside host');
    const type = await p.locator('[lang="zh-CN"]').evaluate(element => ({ text: element.textContent, fontFamily: getComputedStyle(element).fontFamily, opticalAncestor: !!element.closest('.local-backdrop,[data-controlled-transmission]'), latinLoaded: document.fonts.check('16px "Instrument Sans"'), cjkLoaded: document.fonts.check('16px MiSans', element.textContent) }));
    assert(type.text === '清晰的中文排版。' && !type.opticalAncestor && type.latinLoaded && type.cjkLoaded, 'packaged fonts and native Chinese typography', type); checks.push('Instrument Sans / MiSans and native Chinese');
    const slider = p.getByRole('slider', { name: 'Interaction strength' });
    await slider.focus(); await slider.press('Home'); await p.waitForTimeout(80); assert(Number(await slider.inputValue()) === 0, 'installed slider Home');
    await slider.press('ArrowRight'); await p.waitForTimeout(80); assert(Math.abs(Number(await slider.inputValue()) - .1) < 1e-9, 'installed slider ArrowRight');
    await slider.press('End'); await p.waitForTimeout(80); assert(Number(await slider.inputValue()) === 4, 'installed slider End'); checks.push('original slider keyboard');
    const rail = await slider.boundingBox();
    await p.mouse.move(rail.x + rail.width * .3, rail.y + rail.height / 2); await p.mouse.down(); await p.mouse.move(rail.x + rail.width * .6, rail.y + rail.height / 2, { steps: 12 }); await p.mouse.up(); await p.waitForTimeout(200);
    const draggedValue = Number(await slider.inputValue()); assert(draggedValue > 1.8 && draggedValue < 3.2, 'installed original slider mouse drag', draggedValue); checks.push('original slider mouse drag');
    const firstSwitch = p.getByRole('switch', { name: 'Consumer switch' }), originalChecked = await firstSwitch.getAttribute('aria-checked');
    await firstSwitch.focus(); await firstSwitch.press('Space'); await p.waitForTimeout(100); assert(await firstSwitch.getAttribute('aria-checked') !== originalChecked, 'installed original switch keyboard'); checks.push('original switch keyboard');
    const controlledSwitch = p.getByRole('switch', { name: 'Registered track' });
    await controlledSwitch.scrollIntoViewIfNeeded(); await p.waitForTimeout(400);
    await p.waitForFunction(() => document.querySelector('[data-local-glass="consumer-scene-switch-thumb"]')?.dataset.opticalMode === 'scene');
    const registeredBefore = await controlledSwitch.getAttribute('aria-checked'); await controlledSwitch.click(); await p.waitForTimeout(400); assert(await controlledSwitch.getAttribute('aria-checked') !== registeredBefore, 'registered track switch mouse click');
    const sw = await controlledSwitch.boundingBox();
    await p.mouse.move(sw.x + sw.width - 20, sw.y + sw.height / 2); await p.mouse.down(); await p.mouse.move(sw.x + 18, sw.y + sw.height / 2, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(500);
    assert(await controlledSwitch.getAttribute('aria-checked') === 'false', 'registered track switch mouse drag'); checks.push('controlled switch scene / mouse click / drag');
    const sceneLens = p.locator('[data-local-glass="consumer-scene-lens"]'); await sceneLens.scrollIntoViewIfNeeded();
    await p.waitForFunction(() => document.querySelector('[data-local-glass="consumer-scene-lens"]')?.dataset.opticalMode === 'scene');
    const scene = await sceneLens.evaluate(element => ({ mode: element.dataset.opticalMode, ready: element.dataset.opticalReady, transmission: !!element.querySelector('[data-controlled-transmission]'), hasMap: !!element.querySelector('feImage')?.getAttribute('href'), path: element.querySelector('.local-edge path')?.getAttribute('d') }));
    assert(scene.mode === 'scene' && scene.ready === 'true' && scene.transmission && scene.hasMap && scene.path, 'installed ControlledScene exports live scene optics', scene); checks.push('ControlledScene installed dist and normal map');
    await p.getByRole('button', { name: 'Reset defaults' }).click(); await p.waitForTimeout(450);
    assert(Number(await slider.inputValue()) === 2.5, 'installed reset restores default interaction strength'); checks.push('original reset action');
    const after = await p.locator('#outside').evaluate(element => { const s = getComputedStyle(element); return { fontFamily: s.fontFamily, fontSize: s.fontSize, color: s.color, insideKit: !!element.closest('.alvenx-design') }; });
    assert(JSON.stringify(after) === JSON.stringify(before), 'outside host styling unchanged after state updates', after);
    const resources = await p.evaluate(() => performance.getEntriesByType('resource').map(entry => new URL(entry.name, location.href)).filter(url => url.origin === location.origin).map(url => url.pathname));
    assert(resources.some(path => path.includes('@alvenx_liquid-glass')) && resources.some(path => /\.(woff2|woff)$/.test(path)), 'actual installed package and font resources loaded', resources); checks.push('installed package/font resource requests');
    await p.locator('.stage-scroll').evaluate(element => element.scrollIntoView({ block: 'center' })); await p.waitForTimeout(200);
    const volume = await p.locator('.stage').evaluate(element => ({ error: element.querySelector('canvas').dataset.error || null, visible: element.dataset.visible, growth: element.dataset.growth, hit: !!element.querySelector('[data-volume-hit="contour"]') }));
    assert(!volume.error && volume.visible === 'true' && volume.growth === '1.0000' && volume.hit, 'installed VolumeStage renders with contour hit surface', volume); checks.push('original VolumeStage and new contour hit helper bundled');
    await p.mouse.move(0,0); await p.waitForTimeout(500); await p.evaluate(() => scrollTo(0,0)); await p.screenshot({ path: 'output/playwright/r3-protocol-replay/installed-r3-consumer.png', fullPage: true });
    assert(errors.length === 0, 'installed consumer no JavaScript errors', errors);
    return { status: 'passed', scope: 'Fresh unrelated installed npm tarball consumer; Chromium mouse/keyboard and native DOM typography, not physical device certification', checks, fonts: type, hostBefore: before, hostAfter: after, draggedValue, scene: { ...scene, path: '[current nonempty C2 path]' }, volume, packageResources: resources.filter(path => path.includes('@alvenx') || /\.(woff2|woff)$/.test(path)), errors };
  } finally { await context.close(); }
}
