async (page) => {
  await page.addInitScript(() => {
    window.__volumeDraws = 0;
    const draw = WebGLRenderingContext.prototype.drawArrays;
    WebGLRenderingContext.prototype.drawArrays = function (...args) { window.__volumeDraws++; return draw.apply(this, args); };
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1364, height: 1100, deviceScaleFactor: 2, mobile: false });
  await page.reload();
  await page.locator('.volume-canvas').waitFor();
  await page.waitForTimeout(700);
  const read = () => page.evaluate(() => {
    const canvas = document.querySelector('.volume-canvas'), stage = document.querySelector('.stage');
    return { width: canvas.width, height: canvas.height, pixels: canvas.width * canvas.height, budget: canvas.dataset.pixelBudget, scale: canvas.dataset.renderScale, visible: stage.dataset.visible, ambientTime: stage.dataset.ambientTime, growth: stage.dataset.growth, draws: window.__volumeDraws, error: canvas.dataset.error ?? '' };
  });
  const visible = await read();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(300);
  const hiddenStart = await read();
  await page.waitForTimeout(500);
  const hiddenEnd = await read();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  const resumed = await read();
  await page.evaluate(() => {
    window.__loseVolumeContext = document.querySelector('.volume-canvas').getContext('webgl').getExtension('WEBGL_lose_context');
    window.__loseVolumeContext.loseContext();
  });
  await page.waitForTimeout(400);
  const lost = await read();
  const fallback = await page.locator('[data-renderer="static-pearl-fallback"]').count();
  const foregroundVisible = await page.locator('.foreground').isVisible();
  await page.screenshot({ path: 'docs/validation/volume-fallback-1.1.0.png' });
  await page.evaluate(() => window.__loseVolumeContext.restoreContext());
  await page.waitForTimeout(500);
  const restored = await read();
  if (visible.pixels > Number(visible.budget) || hiddenEnd.draws !== hiddenStart.draws || hiddenEnd.ambientTime !== hiddenStart.ambientTime || resumed.draws <= hiddenEnd.draws || fallback !== 1 || !foregroundVisible || restored.error || restored.draws <= lost.draws) throw new Error(JSON.stringify({ visible, hiddenStart, hiddenEnd, resumed, lost, restored, fallback, foregroundVisible }));
  return { status: 'passed', visible, hiddenStart, hiddenEnd, resumed, lost, restored, fallback, foregroundVisible };
}
