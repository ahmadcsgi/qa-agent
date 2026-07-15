/**
 * report.js — HTML Report Generator
 *
 * Generates a self-contained HTML report from visual test results.
 * Zero AI tokens — pure Node.js string generation.
 * Showcases baseline vs actual vs diff side-by-side.
 *
 * Output: standalone .html file (no external dependencies)
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DEFAULT_REPORT_DIR = join(tmpdir(), "qa-visual-report");

/**
 * Generate a self-contained HTML report.
 *
 * @param {object} report - The full JSON report from run.js
 * @param {object} options
 * @param {string} options.reportDir - Output directory (default: os.tmpdir()/qa-visual-report)
 * @param {string} options.baseDir - Baseline images directory
 * @param {string} options.screenshotDir - Captured screenshots directory
 * @returns {string} Path to generated HTML file
 */
export function generateHtmlReport(report, options = {}) {
  const {
    reportDir = DEFAULT_REPORT_DIR,
    baseDir = "",
    screenshotDir = "",
  } = options;

  if (!existsSync(reportDir)) {
    mkdirSync(reportDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = resolve(`${reportDir}/visual-report-${timestamp}.html`);

  // Helper: embed image as base64 data URI
  function imgSrc(filePath) {
    if (!filePath || !existsSync(filePath)) return "";
    const ext = filePath.toLowerCase().endsWith(".png") ? "png" : "png";
    const data = readFileSync(filePath).toString("base64");
    return `data:image/${ext};base64,${data}`;
  }

  // Helper: lookup screenshot by page name
  function findScreenshot(name) {
    if (!screenshotDir) return "";
    const fname = name.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase() + ".png";
    const path = resolve(`${screenshotDir}/${fname}`);
    return path;
  }

  function findBaseline(name) {
    if (!baseDir) return "";
    const fname = name.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase() + ".png";
    const path = resolve(`${baseDir}/${fname}`);
    return existsSync(path) ? path : "";
  }

  // Build rows
  const rows = report.results.map((r) => {
    const statusIcon =
      r.status === "pass" ? "✅" :
      r.status === "fail" ? "❌" :
      r.status === "new" ? "🆕" :
      r.status === "updated" ? "🔄" : "⚠️";

    const baselineImg = r.status === "fail" || r.status === "pass"
      ? imgSrc(findBaseline(r.name))
      : "";

    const screenshotImg = r.status !== "error"
      ? imgSrc(findScreenshot(r.name))
      : "";

    const diffImg = r.diffPath ? imgSrc(r.diffPath) : "";

    const detail =
      r.status === "pass" ? `0% diff` :
      r.status === "fail" ? `${r.diffPercent}% diff (${r.diffPixels} px)` :
      r.status === "new" ? "Baseline created" :
      r.status === "updated" ? "Baseline updated" :
      r.error || r.status;

    const hasComparison = r.status === "pass" || r.status === "fail";

    return { r, statusIcon, baselineImg, screenshotImg, diffImg, detail, hasComparison };
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Visual Regression Report — ${report.verdict}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f7; color: #1d1d1f; padding: 24px; }
  .container { max-width: 1200px; margin: 0 auto; }
  .header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
  .verdict { font-size: 28px; font-weight: 700; padding: 8px 20px; border-radius: 12px; }
  .verdict.PASS { background: #e3f7e8; color: #1a8c3e; }
  .verdict.FAIL { background: #fde8e8; color: #c41e1e; }
  .summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 12px; margin-bottom: 24px; }
  .card { background: #fff; border-radius: 12px; padding: 16px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .card .num { font-size: 32px; font-weight: 700; }
  .card .label { font-size: 12px; color: #6e6e73; margin-top: 4px; }
  .card.pass .num { color: #1a8c3e; }
  .card.fail .num { color: #c41e1e; }
  .card.new .num { color: #0071e3; }
  .card.err .num { color: #d97706; }
  .meta { font-size: 13px; color: #6e6e73; margin-bottom: 24px; display: flex; gap: 24px; flex-wrap: wrap; }
  .result { background: #fff; border-radius: 12px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); overflow: hidden; }
  .result-header { display: flex; align-items: center; gap: 12px; padding: 16px 20px; cursor: pointer; border: none; background: none; width: 100%; text-align: left; font-size: 16px; font-weight: 600; }
  .result-header:hover { background: #fafafa; }
  .result-header .status { font-size: 20px; }
  .result-header .name { flex: 1; }
  .result-header .detail { font-size: 13px; font-weight: 400; color: #6e6e73; }
  .result-body { padding: 0 20px 20px; display: none; }
  .result-body.open { display: block; }
  .comparison { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
  .comparison h4 { font-size: 12px; color: #6e6e73; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
  .comparison img { width: 100%; border: 1px solid #e8e8ed; border-radius: 8px; }
  .errors { margin-top: 12px; padding: 12px; background: #fef2f2; border-radius: 8px; font-size: 13px; }
  .errors h4 { color: #c41e1e; margin-bottom: 4px; }
  .errors pre { font-family: 'SF Mono', Monaco, monospace; font-size: 12px; white-space: pre-wrap; }
  .empty-state { text-align: center; padding: 60px 20px; color: #6e6e73; }
  .config-info { font-size: 12px; color: #6e6e73; background: #fff; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .config-info code { background: #f0f0f5; padding: 2px 6px; border-radius: 4px; }
  @media (max-width: 768px) { .comparison { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="verdict ${report.verdict}">${report.verdict}</div>
    <div style="font-size:14px;color:#6e6e73;">${report.timestamp}</div>
  </div>

  <div class="summary-cards">
    <div class="card pass"><div class="num">${report.summary.passed}</div><div class="label">Passed</div></div>
    <div class="card fail"><div class="num">${report.summary.failed}</div><div class="label">Failed</div></div>
    <div class="card new"><div class="num">${report.summary.new}</div><div class="label">New</div></div>
    <div class="card" style="flex:1"><div class="num">${report.summary.updated}</div><div class="label">Updated</div></div>
    <div class="card err"><div class="num">${report.summary.error}</div><div class="label">Errors</div></div>
    <div class="card" style="flex:1"><div class="num">${report.summary.total}</div><div class="label">Total</div></div>
  </div>

  <div class="meta">
    <span>🔗 <a href="${report.config.url}" target="_blank">${report.config.url}</a></span>
    <span>📐 ${report.config.viewport}</span>
    <span>🎯 threshold: ${report.config.threshold}</span>
  </div>

  ${report.results.length === 0 ? `
  <div class="empty-state">
    <div style="font-size:48px;margin-bottom:12px;">📭</div>
    <div>No tests were run.</div>
  </div>` : rows.map((row, idx) => `
  <div class="result">
    <button class="result-header" onclick="this.nextElementSibling.classList.toggle('open')">
      <span class="status">${row.statusIcon}</span>
      <span class="name">${row.r.name}</span>
      <span class="detail">${row.detail}</span>
      <span style="margin-left:auto;font-size:12px;color:#6e6e73;">${row.r.url || ''}</span>
    </button>
    <div class="result-body ${row.r.status === 'fail' ? 'open' : ''}">
      ${row.hasComparison ? `
      <div class="comparison">
        <div>
          <h4>Baseline</h4>
          ${row.baselineImg ? `<img src="${row.baselineImg}" alt="Baseline for ${row.r.name}">` : '<div style="color:#6e6e73;font-size:13px;">No baseline</div>'}
        </div>
        <div>
          <h4>Actual</h4>
          ${row.screenshotImg ? `<img src="${row.screenshotImg}" alt="Actual screenshot for ${row.r.name}">` : '<div style="color:#6e6e73;font-size:13px;">No screenshot</div>'}
        </div>
        <div>
          <h4>Diff (${row.r.diffPercent || 0}%)</h4>
          ${row.diffImg ? `<img src="${row.diffImg}" alt="Diff for ${row.r.name}">` : '<div style="color:#6e6e73;font-size:13px;">Identical</div>'}
        </div>
      </div>` : `
      <div style="font-size:14px;color:#6e6e73;padding:8px 0;">
        ${row.r.note || row.r.error || 'No comparison data'}
      </div>`}
      ${row.r.consoleErrors && row.r.consoleErrors.length > 0 ? `
      <div class="errors">
        <h4>⚠ Console Errors</h4>
        ${row.r.consoleErrors.map(e => `<pre>${e}</pre>`).join('')}
      </div>` : ''}
    </div>
  </div>`).join('')}

  <div class="config-info">
    Report generated at ${report.timestamp} &middot;
    URL: <code>${report.config.url}</code> &middot;
    Viewport: <code>${report.config.viewport}</code> &middot;
    Threshold: <code>${report.config.threshold}</code>
    ${report.config.updateBaselines ? '&middot; <strong>Baseline update mode</strong>' : ''}
  </div>
</div>
</body>
</html>`;

  writeFileSync(reportPath, html);
  return reportPath;
}

/**
 * Generate report and return path + file size info.
 * Designed for AI consumption: returns only path, not the HTML content.
 */
export function generateReport(report, options = {}) {
  const path = generateHtmlReport(report, options);
  const stats = existsSync(path) ? {
    path,
    size: `${(readFileSync(path).length / 1024).toFixed(1)} KB`,
  } : null;
  return stats;
}
