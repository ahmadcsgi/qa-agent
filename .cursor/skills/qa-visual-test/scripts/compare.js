/**
 * compare.js — Screenshot comparison engine
 *
 * Token-efficient design:
 * - Pure algorithmic comparison (zero AI tokens)
 * - Returns structured text report (no images in output)
 * - Diff image only generated on failure (lazy)
 * - Threshold-based to ignore anti-aliasing noise
 *
 * Dependencies: pixelmatch + pngjs (lightweight, no browser needed)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

/**
 * Compare a screenshot against its baseline.
 *
 * @param {string} screenshotPath  - Path to the current screenshot PNG
 * @param {string} baselinePath    - Path to the baseline PNG
 * @param {object} [options]
 * @param {number} [options.threshold=0.001] - Mismatch threshold per pixel (0-1)
 * @param {boolean} [options.generateDiff=true] - Write diff image on mismatch
 * @param {string} [options.diffDir] - Directory for diff images (default: /tmp/qa-visual-diff/)
 * @returns {{
 *   match: boolean,
 *   diffPixels: number,
 *   totalPixels: number,
 *   diffPercent: number,
 *   diffPath: string | null,
 *   error: string | null
 * }}
 */
export function compareScreenshots(screenshotPath, baselinePath, options = {}) {
  const {
    threshold = 0.001,
    generateDiff = true,
    diffDir = "/tmp/qa-visual-diff",
  } = options;

  // Validate both files exist
  if (!existsSync(screenshotPath)) {
    return {
      match: false,
      diffPixels: 0,
      totalPixels: 0,
      diffPercent: 0,
      diffPath: null,
      error: `Screenshot not found: ${screenshotPath}`,
    };
  }
  if (!existsSync(baselinePath)) {
    return {
      match: false,
      diffPixels: 0,
      totalPixels: 0,
      diffPercent: 0,
      diffPath: null,
      error: `Baseline not found: ${baselinePath}`,
    };
  }

  try {
    const baseline = PNG.sync.read(readFileSync(baselinePath));
    const screenshot = PNG.sync.read(readFileSync(screenshotPath));

    // Validate same dimensions
    if (baseline.width !== screenshot.width || baseline.height !== screenshot.height) {
      return {
        match: false,
        diffPixels: -1,
        totalPixels: baseline.width * baseline.height,
        diffPercent: -1,
        diffPath: null,
        error: `Dimension mismatch: baseline ${baseline.width}x${baseline.height}, screenshot ${screenshot.width}x${screenshot.height}`,
      };
    }

    const { width, height } = baseline;
    const totalPixels = width * height;
    const diff = new PNG({ width, height });

    const diffPixels = pixelmatch(
      baseline.data,
      screenshot.data,
      diff.data,
      width,
      height,
      { threshold, alpha: 0.3, diffColor: [255, 0, 0] }, // red for diff
    );

    const diffPercent = totalPixels > 0 ? diffPixels / totalPixels : 0;

    let diffPath = null;
    if (generateDiff && diffPixels > 0) {
      if (!existsSync(diffDir)) {
        mkdirSync(diffDir, { recursive: true });
      }

      // Derive diff filename from baseline name
      const baselineName = baselinePath.replace(/^.*[/\\]/, "").replace(/\.png$/i, "");
      diffPath = resolve(`${diffDir}/${baselineName}-diff-${Date.now()}.png`);
      writeFileSync(diffPath, PNG.sync.write(diff));
    }

    return {
      match: diffPixels === 0,
      diffPixels,
      totalPixels,
      diffPercent,
      diffPath,
      error: null,
    };
  } catch (err) {
    return {
      match: false,
      diffPixels: 0,
      totalPixels: 0,
      diffPercent: 0,
      diffPath: null,
      error: err.message,
    };
  }
}

/**
 * Compare multiple screenshots against their baselines.
 * Returns structured array — no images in output, only paths on failure.
 *
 * @param {Array<{name: string, screenshotPath: string, baselinePath: string}>} tests
 * @param {object} [options]
 * @returns {Array}
 */
export function compareBatch(tests, options = {}) {
  return tests.map((t) => ({
    name: t.name,
    ...compareScreenshots(t.screenshotPath, t.baselinePath, options),
  }));
}
