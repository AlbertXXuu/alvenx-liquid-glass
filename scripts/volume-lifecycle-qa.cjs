async (page) => {
  await page.setViewportSize({ width: 1364, height: 1100 });
  await page.goto('http://127.0.0.1:5174/');
  const read = () => page.locator('.stage').evaluate(element => ({ growth: Number(element.dataset.growth), time: element.dataset.ambientTime, visible: element.dataset.visible }));
  await page.getByRole('button', { name: 'Replay slow budding' }).click();
  await page.waitForTimeout(250);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(150);
  const paused = await read();
  await page.waitForTimeout(400);
  const stillPaused = await read();
  await page.locator('.stage').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const resumed = await read();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(100);
  const reduced = await read();
  await page.waitForTimeout(200);
  const stillReduced = await read();
  if (paused.visible !== 'false' || paused.growth !== stillPaused.growth || paused.time !== stillPaused.time || resumed.growth <= paused.growth || reduced.growth !== 1 || reduced.time !== stillReduced.time) throw new Error(JSON.stringify({ paused, stillPaused, resumed, reduced, stillReduced }));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) { return type === 'webgl' ? null : getContext.call(this, type, ...args); };
  });
  await page.reload();
  await page.locator('[data-renderer="static-pearl-fallback"]').waitFor();
  await page.locator('.stage').scrollIntoViewIfNeeded();
  await page.locator('.stage').screenshot({ path: 'docs/validation/volume-no-webgl-1.1.0.png' });
  const usable = await page.getByRole('textbox', { name: 'Preview message' }).isVisible();
  await page.getByRole('textbox', { name: 'Preview message' }).fill('Fallback remains usable.');
  await page.getByRole('button', { name: 'Send preview message' }).click();
  const sent = await page.locator('#preview-feedback').textContent();
  if (!usable || sent !== 'Saved in this preview.') throw new Error(JSON.stringify({ usable, sent }));
  return { status: 'passed', paused, stillPaused, resumed, reduced, stillReduced, noWebGL: { usable, sent } };
}
