/** Canvas raster policy only: the shader keeps its 1000×560 logical geometry.
 * Device hints are coarse limits, not a GPU benchmark. Callers can supply a
 * pixel budget after profiling their actual scene; DOM text is unaffected.
 * @param {number} cssWidth
 * @param {number} cssHeight
 * @param {{dpr?: number, maxDpr?: number, maxPixels?: number, deviceMemory?: number, hardwareConcurrency?: number, saveData?: boolean, maxDimension?: number}} [hints]
 */
export function volumeRasterSize(cssWidth, cssHeight, hints = {}) {
  const positive = (value, fallback) => Number.isFinite(value) && value > 0 ? value : fallback;
  const width = positive(cssWidth, 1000), height = positive(cssHeight, 560);
  const constrained = hints.saveData === true
    || (positive(hints.deviceMemory, Infinity) <= 4)
    || (positive(hints.hardwareConcurrency, Infinity) <= 4);
  const maxPixels = Math.max(1, Math.floor(positive(hints.maxPixels, constrained ? 1_000_000 : 2_000_000)));
  const maxDpr = Math.min(2, positive(hints.maxDpr, 2));
  const maxDimension = Math.max(1, Math.floor(positive(hints.maxDimension, 16_384)));
  const requestedScale = Math.min(positive(hints.dpr, 1), maxDpr);
  const scale = Math.min(requestedScale, Math.sqrt(maxPixels / width / height), maxDimension / width, maxDimension / height);
  const renderWidth = Math.max(1, Math.min(maxPixels, Math.floor(width * scale)));
  const renderHeight = Math.max(1, Math.min(Math.floor(height * scale), Math.floor(maxPixels / renderWidth)));
  return { width: renderWidth, height: renderHeight,
    scale: Math.min(renderWidth / width, renderHeight / height), maxPixels,
    constrained, limited: scale < requestedScale };
}
