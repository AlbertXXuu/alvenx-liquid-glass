async page => {
  const assert = (value, name, detail) => { if (!value) throw new Error(name + ' ' + JSON.stringify(detail)); };
  const context = await page.context().browser().newContext({ viewport: { width: 1180, height: 900 }, hasTouch: true }), p = await context.newPage(), errors = [], checks = [];
  p.on('pageerror', error => errors.push(error.message));
  try {
    await p.addInitScript(() => localStorage.setItem('alvenx-mobile-review-r3-20261019', JSON.stringify({ ambient: false, reducedMotion: false })));
    await p.goto('http://127.0.0.1:5174/mobile-review.html');
    const lens = p.getByRole('button', { name: 'Drag the refractive lens, or use arrow keys' });
    await lens.scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
    const before = await p.locator('.lab-moving-lens').boundingBox(), q = await lens.boundingBox();
    await p.mouse.move(q.x + q.width / 2, q.y + q.height / 2); await p.mouse.down(); await p.mouse.move(q.x + q.width / 2 + 65, q.y + q.height / 2 + 35, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(200);
    const after = await p.locator('.lab-moving-lens').boundingBox();
    assert(after.x > before.x + 40 && after.y > before.y + 20, 'mouse lens moves continuously', { before, after }); checks.push('mouse lens drag');
    await p.getByRole('button', { name: 'Show input report' }).click();
    const report = JSON.parse(await p.getByLabel('Local input report').textContent());
    const trace = report.records.find(record => record.event === 'pointerdown' && record.target.includes('refractive lens') && record.moves >= 5);
    assert(trace && Number.isFinite(trace.firstMoveMs) && Number.isFinite(trace.lastX) && Number.isFinite(trace.lastY), 'input report contains native pointer movement counts/timings', { report });
    assert(report.records.some(record => record.event === 'gotpointercapture' && record.capture === true) && report.records.some(record => record.event === 'lostpointercapture' && record.capture === false), 'input report records capture acquisition/release', report); checks.push('local input report move/capture');
    const message = p.getByRole('textbox', { name: 'Preview message' }), text = '清晰的文字 AlvenX 你好';
    await message.fill(text); await message.press('Enter');
    assert(await message.inputValue() === text && (await p.locator('.lab-message-feedback').textContent()).includes('Saved'), 'native bilingual field + Enter submit', { value: await message.inputValue() }); checks.push('native CJK/Latin editing + Enter');
    const number = p.getByRole('spinbutton', { name: 'Source line value' });
    await number.fill('999'); await number.press('Tab'); await p.waitForTimeout(100);
    assert(await number.inputValue() === '1', 'numeric upper clamp', await number.inputValue()); checks.push('numeric upper clamp');
    await number.fill('Infinity'); await number.press('Enter');
    assert(await number.inputValue() === '1', 'numeric nonfinite reverts', await number.inputValue()); checks.push('nonfinite reverts');
    await number.fill('0.34567'); await number.press('Enter');
    assert(await number.inputValue() === '0.35', 'numeric configured precision', await number.inputValue()); checks.push('numeric decimal precision');
    await number.fill('0.8'); await number.press('Escape');
    assert(await number.inputValue() === '0.35', 'numeric Escape preserves committed value', await number.inputValue()); checks.push('numeric Escape');
    const slider = p.getByRole('slider', { name: 'Source line' });
    await slider.focus(); await slider.press('Home'); await p.waitForTimeout(70); assert(Number(await slider.inputValue()) === 0, 'slider keyboard Home');
    await slider.press('ArrowRight'); await p.waitForTimeout(70); assert(Math.abs(Number(await slider.inputValue()) - .01) < 1e-9, 'slider keyboard step');
    await slider.press('End'); await p.waitForTimeout(70); assert(Number(await slider.inputValue()) === 1, 'slider keyboard End'); checks.push('slider Home/ArrowRight/End');
    const toggle = p.getByRole('switch', { name: 'Continuous switch' }), checked = await toggle.getAttribute('aria-checked');
    await toggle.focus(); await toggle.press('Space'); await p.waitForTimeout(100);
    assert(await toggle.getAttribute('aria-checked') !== checked, 'switch keyboard activation'); checks.push('switch Space');
    const source = p.getByRole('textbox', { name: 'Source word' });
    await source.fill('光与形 AlvenX'); await p.waitForTimeout(120);
    assert((await p.locator('.lab-optical-scene [data-controlled-source]').textContent()).includes('光与形 AlvenX'), 'editable canonical SVG source updates', await source.inputValue()); checks.push('live canonical source edit');
    assert(errors.length === 0, 'no JavaScript errors', errors);
    return { status: 'passed', scope: 'Actual R3 Chromium hybrid mouse/keyboard DOM editing; not physical Combo Touch or OS IME certification', checks, drag: { before, after }, inputReport: { movement: trace, capture: report.records.filter(record => ['gotpointercapture', 'lostpointercapture'].includes(record.event)) }, finalValues: { message: await message.inputValue(), number: await number.inputValue(), switch: await toggle.getAttribute('aria-checked'), source: await source.inputValue() }, errors };
  } finally { await context.close(); }
}
