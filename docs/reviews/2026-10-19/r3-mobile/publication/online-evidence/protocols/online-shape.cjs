async page => {
  const assert = (condition, label, detail) => { if (!condition) throw new Error(label + ' ' + JSON.stringify(detail)); };
  const output = 'output/publication/r3-protocol-replay/', results = [];
  for (const [width, height] of [[393, 852], [768, 1024]]) {
    const context = await page.context().browser().newContext({ viewport: { width, height }, hasTouch: true, isMobile: true });
    const p = await context.newPage(), errors = [];
    p.on('pageerror', error => errors.push(error.message));
    try {
      await p.addInitScript(() => localStorage.setItem('alvenx-mobile-review-r3-20261019', JSON.stringify({ ambient: false, reducedMotion: false })));
      await p.goto('https://alvenx.com/ui/review-20261019-r3/');
      await p.locator('.stage').evaluate(element => element.scrollIntoView({ block: 'center' }));
      await p.waitForTimeout(550);
      const cdp = await context.newCDPSession(p);
      const read = () => p.locator('.stage').evaluate(element => ({ scrollY, surface: JSON.parse(element.dataset.surface), layout: element.dataset.layout, growth: element.dataset.growth, canvasError: element.querySelector('canvas').dataset.error || null }));
      const point = (x, y) => p.locator('.stage').evaluate((element, q) => { const r = element.getBoundingClientRect(), s = Math.min(r.width / 1000, r.height / 560); return { x: r.x + r.width / 2 + (q.x - 500) * s, y: r.y + r.height / 2 + (q.y - 280) * s }; }, { x, y });
      const hit = q => p.evaluate(q => { const element = document.elementFromPoint(q.x, q.y); return { tag: element?.tagName, shape: element?.dataset.volumeHit === 'contour', touchAction: getComputedStyle(element).touchAction }; }, q);
      const touch = (type, q) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: q ? [{ id: 1, x: q.x, y: q.y, radiusX: 2, radiusY: 2, force: .5 }] : [] });
      const move = async (q, dx, dy) => { for (let i = 1; i <= 12; i++) { await touch('touchMove', { x: q.x + dx * i / 12, y: q.y + dy * i / 12 }); await p.waitForTimeout(12); } await p.waitForTimeout(120); };
      const release = async () => { await touch('touchEnd'); await p.waitForTimeout(950); };
      const holds = [];
      for (const [name, x, y] of [['mother', 230, 280], ['neck', 415, 280], ['cavity', 735, 380]]) {
        const q = await point(x, y), initial = await read(), startHit = await hit(q);
        assert(startHit.shape, 'pre-contact native hit', { width, name, startHit });
        await touch('touchStart', q); await move(q, 0, -70); const held = await read();
        assert(Math.abs(held.scrollY - initial.scrollY) <= 1 && held.surface.deformDY < -8, 'shape vertical owns gesture', { width, name, initial, held });
        holds.push({ name, initial, held, startHit }); await release();
      }
      if (width >= 768) {
        const q = await p.locator('.foreground h3').evaluate(element => { const range = document.createRange(); range.setStart(element.firstChild, 0); range.setEnd(element.firstChild, 1); const r = range.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
        const initial = await read(), startHit = await hit(q);
        assert(startHit.shape, 'heading glyph forwards native hit to volume', { width, startHit, q });
        await touch('touchStart', q); await move(q, 0, -65); const held = await read();
        assert(Math.abs(held.scrollY - initial.scrollY) <= 1 && held.surface.deformDY < -8, 'heading glyph drag owns shape', { width, initial, held });
        await p.locator('.stage').screenshot({ path: output + `r3-integrated-${width}-heading-held.png` });
        holds.push({ name: 'heading-glyph', initial, held, startHit }); await release();
      }
      const inside = await point(230, 280), outsidePosition = await point(20, 280), insideInitial = await read();
      outsidePosition.y -= 60;
      await touch('touchStart', inside); await move(inside, outsidePosition.x - inside.x, -60); const movedOutside = await read(), endHit = await hit(outsidePosition);
      assert(!endHit.shape && Math.abs(movedOutside.scrollY - insideInitial.scrollY) <= 1 && movedOutside.surface.deformDX < -8 && movedOutside.surface.deformDY < -8, 'inside to outside retains capture and deformation', { width, insideInitial, movedOutside, endHit });
      await release();
      const outside = await point(20, 280), outsideInitial = await read(), outsideStartHit = await hit(outside);
      assert(!outsideStartHit.shape, 'outside gesture begins outside contour', { width, outsideStartHit });
      await touch('touchStart', outside); await move(outside, 75, -100); const outsideToShape = await read(), fingerHitAfterPan = await hit({ x: outside.x + 75, y: outside.y - 100 });
      assert(fingerHitAfterPan.shape && outsideToShape.scrollY > outsideInitial.scrollY + 45 && Math.abs(outsideToShape.surface.parentX - 1) < .001 && outsideToShape.surface.deformDY === 0, 'outside to shape remains native pan', { width, outsideInitial, outsideToShape, fingerHitAfterPan });
      await release();
      let belowShape = null;
      if (width < 600) {
        await p.locator('.foreground h3').evaluate(element => element.scrollIntoView({ block: 'center' })); await p.waitForTimeout(100);
        const q = await p.locator('.foreground h3').evaluate(element => { const r = element.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
        const initial = await read(), startHit = await hit(q);
        assert(!startHit.shape, 'phone overview text below shape remains native', { width, startHit });
        await touch('touchStart', q); await move(q, 0, -110); const after = await read();
        assert(after.scrollY > initial.scrollY + 55 && after.surface.deformDY === 0, 'phone overview text below shape pans page', { width, initial, after });
        belowShape = { initial, after, startHit }; await release();
      }
      assert(errors.length === 0, 'no page JavaScript errors', { width, errors });
      results.push({ viewport: { width, height }, holds, insideToOutside: { insideInitial, movedOutside, endHit }, outsideToShape: { outsideInitial, outsideToShape, fingerHitAfterPan }, belowShape, errors });
    } finally { await context.close(); }
  }
  return { status: 'passed', page: 'mobile-review.html', scope: 'Actual R3 page in Chromium native CDP touch; not physical Safari or Combo Touch certification', results };
}
