#!/usr/bin/env node

/**
 * run.js — Visual Regression CLI Runner (100% edition)
 *
 * Zero-token screenshot comparison for QA Agent.
 * Runs entirely outside AI context, outputs structured JSON report.
 *
 * USAGE:
 *   node run.js                              # auto-detect config + run all
 *   node run.js init                         # scaffold config file
 *   node run.js list                         # list all baselines
 *   node run.js --url https://... --pages x  # CLI mode (legacy)
 *   node run.js --config my-config.json      # explicit config
 *
 * OUTPUT: JSON report to stdout. HTML report on failure.
 * TOKEN COST: 0 tokens for all comparison math.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { resolve, dirname, basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { compareScreenshots } from "./compare.js";
import { generateReport } from "./report.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SCRIPTS_DIR = __dirname;
const SKILL_DIR = resolve(SCRIPTS_DIR, "..");
const DEFAULT_BASE_DIR = resolve(SKILL_DIR, "baselines");
const DEFAULT_DIFF_DIR = join(tmpdir(), "qa-visual-diff");
const CONFIG_FILE = resolve(process.cwd(), "visual-test.config.json");

// ─── CLI / Config ───────────────────────────────────────────────────────────

function parseArgs() {
  const args = {};
  const raw = process.argv.slice(2);

  // Detect subcommand
  const subcmd = raw[0];
  if (["init", "list", "update"].includes(subcmd)) {
    args._command = subcmd;
    raw.shift(); // consume subcommand
  }

  for (let i = 0; i < raw.length; i++) {
    const key = raw[i].replace(/^--/, "");
    if (key === "update-baselines") {
      args.updateBaselines = true;
    } else if (key === "git-diff") {
      args.gitDiff = true;
    } else if (key === "verbose") {
      args.verbose = true;
    } else if (key === "report") {
      args.report = true;
    } else if (key === "help") {
      args._help = true;
    } else if (i + 1 < raw.length && !raw[i + 1].startsWith("--")) {
      args[key] = raw[++i];
    } else {
      args[key] = true;
    }
  }
  return args;
}

function loadConfig(args) {
  const configPath = args.config ? resolve(process.cwd(), args.config) :
    existsSync(CONFIG_FILE) ? CONFIG_FILE : null;
  const fileConfig = configPath ? JSON.parse(readFileSync(configPath, "utf-8")) : {};
  const baseDir = resolve(args.baseDir || fileConfig.baseDir || DEFAULT_BASE_DIR);
  const diffDir = args.diffDir || fileConfig.diffDir || DEFAULT_DIFF_DIR;

  // Merge: CLI args override file config
  return {
    url: args.url || fileConfig.baseUrl || "",
    pages: args.pages
      ? args.pages.split(",").map((s) => s.trim()).filter(Boolean)
      : (fileConfig.pages || []).map((p) => typeof p === "string" ? p : p.name),
    paths: args.paths
      ? args.paths.split(",").map((s) => s.trim()).filter(Boolean)
      : (fileConfig.pages || []).map((p) =>
          typeof p === "string" ? `/${p}` :
          p.path || `/${p.name.replace(/^\/+/, "")}`
        ),
    viewport: args.viewport || fileConfig.viewport || "1280x720",
    threshold: parseFloat(args.threshold ?? fileConfig.threshold ?? "0.001"),
    baseDir,
    diffDir,
    updateBaselines: args.updateBaselines || fileConfig.updateBaselines || false,
    gitDiff: args.gitDiff || false,
    output: args.output || null,
    verbose: args.verbose || false,
    wait: parseInt(args.wait ?? fileConfig.wait ?? "2000", 10),
    masks: fileConfig.masks || [],
    beforeScreenshot: fileConfig.beforeScreenshot || null,
    authCookies: fileConfig.auth?.cookies || null,
    notifyConsoleErrors: fileConfig.notifyConsoleErrors !== false,
    pageConfig: {},
    _command: args._command || null,
    _help: args._help || false,
    _report: args.report || false,
    configFile: configPath,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function pageNameToFilename(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase() + ".png";
}

function getChangedPagesFromGit() {
  try {
    const diff = execSync("git diff --name-only HEAD~1", {
      encoding: "utf-8",
      cwd: process.cwd(),
    }).trim();
    if (!diff) return [];
    return [...new Set(diff.split("\n").map((f) => f.split("/")[0]))];
  } catch {
    return [];
  }
}

function printUsage() {
  console.log(`Visual Regression Test — 100% Edition

USAGE:
  node run.js                        Run all pages from visual-test.config.json
  node run.js init                   Scaffold visual-test.config.json
  node run.js list                   List all baselines
  node run.js --config my-config     Run using custom config file

CLI MODE (no config file):
  node run.js --url <URL> --pages <names>
  node run.js --url <URL> --paths </a,/b>
  node run.js --url <URL> --update-baselines --pages <names>

OPTIONS:
  --url <url>          Base URL
  --pages <names>      Comma-separated page names
  --paths <paths>      Comma-separated URL paths
  --viewport <WxH>     Viewport size (default: 1280x720)
  --threshold <float>  Mismatch threshold 0-1 (default: 0.001)
  --update-baselines   Save as new baselines
  --git-diff           Only test changed pages
  --wait <ms>          Wait after page load (default: 2000)
  --output <path>      Write JSON report to file
  --config <path>      Use config file
  --report             Force HTML report generation
  --verbose            Show page load logs

CONFIG FILE (visual-test.config.json):
  See visual-test.example.json for all options`);
}

// ─── Subcommands ────────────────────────────────────────────────────────────

function cmdInit() {
  if (existsSync(CONFIG_FILE)) {
    console.log(`Config already exists: ${CONFIG_FILE}`);
    console.log("Edit it directly or delete it first to regenerate.");
    return;
  }
  if (existsSync(resolve(SKILL_DIR, "scripts", "visual-test.example.json"))) {
    const example = readFileSync(
      resolve(SKILL_DIR, "scripts", "visual-test.example.json"), "utf-8"
    );
    writeFileSync(CONFIG_FILE, example);
    console.log(`✅ Created ${CONFIG_FILE} from example template.`);
    console.log("Edit it with your URLs and pages, then run: node run.js");
  } else {
    // Fallback: write minimal config inline
    const minimal = JSON.stringify({
      baseUrl: "https://your-app.com",
      viewport: "1280x720",
      threshold: 0.001,
      pages: [
        { name: "home", path: "/" },
        { name: "login", path: "/login" },
      ],
      wait: 2000,
      notifyConsoleErrors: true,
    }, null, 2);
    writeFileSync(CONFIG_FILE, minimal);
    console.log(`✅ Created ${CONFIG_FILE}`);
  }
}

function cmdList(config) {
  const dir = config.baseDir;
  if (!existsSync(dir)) {
    console.log("No baselines directory found.");
    return;
  }
  const files = readdirSync(dir).filter((f) => f.endsWith(".png"));
  if (files.length === 0) {
    console.log("No baselines found. Run with --update-baselines to create them.");
    return;
  }
  console.log(`Baselines (${dir}):`);
  for (const f of files.sort()) {
    const stats = existsSync(resolve(dir, f)) ? readFileSync(resolve(dir, f)).length : 0;
    const name = f.replace(/\.png$/, "");
    console.log(`  ${name}  (${(stats / 1024).toFixed(1)} KB)`);
  }
}

// ─── Main Runner ────────────────────────────────────────────────────────────

async function runTests(config) {
  // Resolve pages
  if (config.pages.length === 0) {
    console.error("No pages configured. Use --pages <names> or create visual-test.config.json");
    process.exit(1);
  }

  // Derive paths if only names given (no paths from config)
  if (config.paths.length === 0) {
    config.paths = config.pages.map((p) =>
      p === "home" || p === "index" ? "/" : `/${p}`
    );
  }

  // If git-diff mode, filter pages
  if (config.gitDiff) {
    const changed = getChangedPagesFromGit();
    if (changed.length > 0) {
      const filtered = config.pages.filter(
        (p, i) => changed.includes(p) || changed.includes(config.paths[i]?.replace(/^\//, ""))
      );
      config.pages = filtered;
      config.paths = config.pages.map((p) =>
        p === "home" || p === "index" ? "/" : `/${p}`
      );
    }
    if (config.pages.length === 0) {
      const report = {
        verdict: "PASS",
        summary: { passed: 0, failed: 0, new: 0, updated: 0, error: 0, total: 0, skipped: true },
        results: [],
        timestamp: new Date().toISOString(),
        config: { url: config.url, threshold: config.threshold, viewport: config.viewport },
      };
      const out = JSON.stringify(report, null, 2);
      if (config.output) writeFileSync(config.output, out);
      else console.log(out);
      return report;
    }
  }

  // Ensure directories
  if (!existsSync(config.baseDir)) mkdirSync(config.baseDir, { recursive: true });
  const screenshotDir = resolve(config.diffDir, "captures");
  if (!existsSync(screenshotDir)) mkdirSync(screenshotDir, { recursive: true });

  const [vw, vh] = config.viewport.split("x").map(Number);

  // Launch browser
  const browser = await chromium.launch({ headless: true });
  const ctxOptions = {
    viewport: { width: vw || 1280, height: vh || 720 },
    deviceScaleFactor: 1,
  };

  // Auth cookies
  if (config.authCookies && existsSync(resolve(process.cwd(), config.authCookies))) {
    const cookies = JSON.parse(readFileSync(resolve(process.cwd(), config.authCookies), "utf-8"));
    ctxOptions.storageState = { cookies, origins: [] };
  }

  const context = await browser.newContext(ctxOptions);
  const page = await context.newPage();
  const results = [];

  // Attach console listener
  const allConsoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") allConsoleErrors.push(msg.text());
  });

  try {
    for (let i = 0; i < config.pages.length; i++) {
      const name = config.pages[i];
      const path = config.paths[i] || `/${name}`;
      const fullUrl = config.url ? `${config.url.replace(/\/+$/, "")}${path}` : path;
      const screenshotPath = resolve(`${screenshotDir}/${pageNameToFilename(name)}`);
      const baselinePath = resolve(`${config.baseDir}/${pageNameToFilename(name)}`);

      // Page-level overrides from config
      const pageConfig = config.pageConfig[name] || {};
      const pageThreshold = pageConfig.threshold ?? config.threshold;
      const pageWait = pageConfig.wait ?? config.wait;
      const pageMasks = pageConfig.masks ?? config.masks;

      const pageConsoleErrors = [];

      try {
        if (config.verbose) {
          console.error(`[snap] ${name} → ${fullUrl}`);
        }

        // Navigate
        await page.goto(fullUrl, { waitUntil: "networkidle", timeout: 30000 });
        await page.waitForTimeout(pageWait);

        // ——— Before-screenshot hook ———
        if (config.beforeScreenshot) {
          try {
            await page.evaluate(new Function(config.beforeScreenshot));
          } catch (hookErr) {
            console.error(`[warn] beforeScreenshot hook failed for ${name}: ${hookErr.message}`);
          }
        }

        // ——— Masking ———
        if (pageMasks && pageMasks.length > 0) {
          for (const mask of pageMasks) {
            const selector = mask.selector || mask;
            const fillColor = mask.fill || mask.color || "#ffffff";
            try {
              await page.evaluate(({ sel, color }) => {
                document.querySelectorAll(sel).forEach((el) => {
                  const rect = el.getBoundingClientRect();
                  const overlay = document.createElement("div");
                  overlay.style.cssText = `
                    position: fixed; z-index: 999999;
                    top: ${rect.top}px; left: ${rect.left}px;
                    width: ${rect.width}px; height: ${rect.height}px;
                    background: ${color}; pointer-events: none;
                  `;
                  document.body.appendChild(overlay);
                });
              }, { sel: selector, color: fillColor });
            } catch (maskErr) {
              console.error(`[warn] mask failed for ${name} (${selector}): ${maskErr.message}`);
            }
          }
        }

        // Collect console errors for this page
        pageConsoleErrors.push(...allConsoleErrors.splice(0));

        // Screenshot
        await page.screenshot({ path: screenshotPath, fullPage: true });
        const existingBaseline = existsSync(baselinePath);

        if (config.updateBaselines || !existingBaseline) {
          writeFileSync(baselinePath, readFileSync(screenshotPath));
          results.push({
            name,
            url: fullUrl,
            status: existingBaseline ? "updated" : "new",
            note: existingBaseline
              ? "Baseline updated"
              : "No prior baseline — created",
            consoleErrors: pageConsoleErrors.length > 0 ? pageConsoleErrors : undefined,
          });
          continue;
        }

        // Compare
        const result = compareScreenshots(screenshotPath, baselinePath, {
          threshold: pageThreshold,
          diffDir: config.diffDir,
        });

        // ——— Retry on failure (flakiness guard) ———
        if (result.error || (!result.match && result.diffPercent > 0.001)) {
          if (config.verbose) console.error(`[retry] ${name} — re-testing...`);
          await page.goto(fullUrl, { waitUntil: "networkidle", timeout: 30000 });
          await page.waitForTimeout(pageWait);
          await page.screenshot({ path: screenshotPath, fullPage: true });

          const retryResult = compareScreenshots(screenshotPath, baselinePath, {
            threshold: pageThreshold,
            diffDir: config.diffDir,
          });

          // Use retry result (prefer match)
          const finalResult = retryResult.match ? retryResult : result;
          pushResult(results, name, fullUrl, finalResult, pageConsoleErrors);
          continue;
        }

        pushResult(results, name, fullUrl, result, pageConsoleErrors);
      } catch (err) {
        results.push({
          name,
          url: fullUrl,
          status: "error",
          error: err.message,
        });
      }
    }
  } finally {
    await browser.close();
  }

  return buildReport(results, config);
}

function pushResult(results, name, url, result, consoleErrors) {
  if (result.error) {
    results.push({ name, url, status: "error", error: result.error });
  } else if (result.match) {
    results.push({ name, url, status: "pass", diffPercent: 0, diffPixels: 0 });
  } else {
    results.push({
      name,
      url,
      status: "fail",
      diffPercent: parseFloat((result.diffPercent * 100).toFixed(4)),
      diffPixels: result.diffPixels,
      totalPixels: result.totalPixels,
      diffPath: result.diffPath,
      consoleErrors: consoleErrors.length > 0 ? consoleErrors : undefined,
    });
  }
}

function buildReport(results, config) {
  const counts = { passed: 0, failed: 0, new: 0, updated: 0, error: 0, total: results.length };
  for (const r of results) {
    if (r.status === "pass") counts.passed++;
    else if (r.status === "fail") counts.failed++;
    else if (r.status === "new") counts.new++;
    else if (r.status === "updated") counts.updated++;
    else if (r.status === "error") counts.error++;
  }

  return {
    verdict: counts.failed > 0 || counts.error > 0 ? "FAIL" : "PASS",
    summary: counts,
    timestamp: new Date().toISOString(),
    config: {
      url: config.url,
      threshold: config.threshold,
      viewport: config.viewport,
      updateBaselines: config.updateBaselines,
    },
    results,
  };
}

// ─── Entry Point ────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();

  // Help
  if (args._help) {
    printUsage();
    return;
  }

  // Subcommands
  if (args._command === "init") {
    cmdInit();
    return;
  }

  if (args._command === "list") {
    const config = loadConfig(args);
    cmdList(config);
    return;
  }

  // Run
  const config = loadConfig(args);

  if (!config.url && config.pages.length === 0) {
    console.error("No URL or pages configured.");
    console.error("  Create visual-test.config.json (node run.js init)");
    console.error("  Or pass --url <url> --pages <names>");
    process.exit(1);
  }

  const report = await runTests(config);

  // Output JSON report
  const json = JSON.stringify(report, null, 2);
  if (config.output) {
    writeFileSync(config.output, json);
    console.log(`JSON report → ${config.output}`);
  } else {
    console.log(json);
  }

  // Generate HTML report on failure or when --report flag
  if (report.verdict === "FAIL" || config._report) {
    const screenshotDir = resolve(config.diffDir, "captures");
    const htmlReport = generateReport(report, {
      baseDir: config.baseDir,
      screenshotDir,
    });
    if (htmlReport) {
      console.error(`\n📄 HTML report: ${htmlReport.path} (${htmlReport.size})`);
    }
  }

  // Exit code
  if (report.verdict === "FAIL") {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ fatal: err.message, stack: err.stack }));
  process.exit(1);
});
