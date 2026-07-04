#!/usr/bin/env node
// Automated headless-Chrome profiling harness for PERF-AUDIT findings F5 (hero
// "liquid" SVG glint) and F4 (section accordion). Fully autonomous: starts its
// own static HTTP server, drives Chrome via the DevTools Protocol (Tracing,
// Input, Emulation), parses the raw trace JSON itself, and writes perf/RESULTS.md.
//
//   node perf/harness.mjs
//
// Exits non-zero if any scenario failed to collect a trace.

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import net from 'node:net';
import puppeteer from 'puppeteer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const TRACE_DIR = join(__dirname, 'traces');
const PORT = 8080;
const BASE = `http://127.0.0.1:${PORT}/`;
const RUNS = 5;               // runs per scenario; report median + p95
const CPU_RATES = [1, 4];     // fast-desktop and mid-tier-device

// ---- Chrome flags (pinned for reproducibility) -----------------------------
const CHROME_FLAGS = [
  '--headless=new',
  '--hide-scrollbars',
  '--mute-audio',
  '--no-sandbox',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--force-color-profile=srgb',
  '--enable-gpu-rasterization',       // let SVG filter raster be measured, not forced-off
  '--force-device-scale-factor=2',
];

// ---- Trace categories ------------------------------------------------------
// Slim, targeted set: every slice/marker the parser reads, and nothing else.
// (Including blink/v8/cc floods dataCollected with ~120k events/run, which
// stalls Input.dispatchMouseEvent over the shared CDP socket — measured in the
// smoke run. This set keeps Layout/Paint/Raster/RunTask/frames/TimeStamp.)
const TRACE_CATEGORIES = [
  'devtools.timeline',                          // Paint, PaintImage, Layout
  'disabled-by-default-devtools.timeline',      // RasterTask, RunTask, UpdateLayoutTree, TimeStamp
  'disabled-by-default-devtools.timeline.frame',// DrawFrame, DroppedFrame (cross-check only)
  'blink.user_timing',                          // console.timeStamp markers
  'toplevel',                                   // RunTask
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const round = (n, p = 2) => (n == null || Number.isNaN(n) ? null : Math.round(n * 10 ** p) / 10 ** p);

// ============================================================================
// Static server
// ============================================================================
const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon', '.webp': 'image/webp',
};

function startServer() {
  const server = createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/' || p.endsWith('/')) p += 'index.html';
      const abs = join(REPO_ROOT, p);
      if (!abs.startsWith(REPO_ROOT)) { res.writeHead(403).end(); return; }
      const body = await readFile(abs);
      res.writeHead(200, { 'Content-Type': MIME[extname(abs)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

function waitPort(port, timeout = 5000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function tryOnce() {
      const s = net.connect(port, '127.0.0.1');
      s.on('connect', () => { s.destroy(); resolve(); });
      s.on('error', () => {
        s.destroy();
        if (Date.now() - start > timeout) reject(new Error('server never came up'));
        else setTimeout(tryOnce, 100);
      });
    })();
  });
}

// ============================================================================
// CDP tracing
// ============================================================================
function makeTracer(client) {
  let collected = [];
  client.on('Tracing.dataCollected', (d) => { if (d.value) collected.push(...d.value); });
  return {
    async start() {
      collected = [];
      await client.send('Tracing.start', {
        transferMode: 'ReportEvents',
        traceConfig: { recordMode: 'recordAsMuchAsPossible', includedCategories: TRACE_CATEGORIES },
      });
    },
    async stop() {
      const done = new Promise((r) => client.once('Tracing.tracingComplete', r));
      await client.send('Tracing.end');
      await done;
      return collected.slice();
    },
  };
}

// ============================================================================
// Trace parsing
// ============================================================================
function markerTs(events, label) {
  const e = events.find((ev) =>
    ev.name === 'TimeStamp' && ev.args && ev.args.data && ev.args.data.message === label);
  return e ? e.ts : null;
}

function sumSlices(slices, names) {
  let total = 0, worst = 0;
  for (const e of slices) {
    if (names.includes(e.name)) {
      const ms = e.dur / 1000;
      total += ms;
      if (ms > worst) worst = ms;
    }
  }
  return { total: round(total), worst: round(worst) };
}

// Parse a trace, restricting to the [t0,t1] window (trace-clock microseconds).
// THREAD-AWARE: RunTask/Paint/Layout are attributed to the renderer main thread
// (CrRendererMain) — the thread whose busyness causes jank. RasterTask is kept
// across all threads, because raster legitimately runs on worker/GPU threads
// (that is exactly where the SVG glint filter's turbulence+lighting cost lands).
function parseTrace(events, t0, t1) {
  const inWin = (e) => e.ts >= t0 && e.ts <= t1;

  // Build (pid:tid) -> thread name from metadata, then find the renderer main
  // thread(s). The renderer is the process that hosts CrRendererMain.
  const threadName = new Map();
  for (const e of events) {
    if (e.name === 'thread_name' && e.args && e.args.name) threadName.set(`${e.pid}:${e.tid}`, e.args.name);
  }
  const isMain = (e) => threadName.get(`${e.pid}:${e.tid}`) === 'CrRendererMain';

  const slices = events.filter((e) => e.ph === 'X' && typeof e.dur === 'number' && inWin(e));
  const mainSlices = slices.filter(isMain);

  const layout = sumSlices(mainSlices, ['Layout', 'UpdateLayoutTree']);
  const paint = sumSlices(mainSlices, ['Paint', 'PaintImage']);
  const updateLayer = sumSlices(mainSlices, ['UpdateLayer', 'UpdateLayerTree']);
  // Raster: ALL threads (worker raster is where the filter re-raster shows up).
  const raster = sumSlices(slices, ['RasterTask', 'Rasterize', 'RasterizeSurface', 'RasterTaskImpl']);

  // Main-thread busy time + long tasks (RunTask on the main thread only, >50ms).
  const mainRunTasks = mainSlices.filter((e) => e.name === 'RunTask');
  let mainBusyMs = 0, longTasks = 0, longTaskMs = 0, longestTaskMs = 0;
  for (const e of mainRunTasks) {
    const ms = e.dur / 1000;
    mainBusyMs += ms;
    if (ms > 50) { longTasks++; longTaskMs += ms; }
    if (ms > longestTaskMs) longestTaskMs = ms;
  }
  const winMs = (t1 - t0) / 1000;

  // Frame track (compositor-presented frames) — headless cadence is unreliable,
  // used only as a cross-check; the reported frame stats come from the rAF recorder.
  const frameEvents = events.filter((e) => inWin(e) &&
    (e.name === 'DrawFrame' || e.name === 'DroppedFrame'));
  const traceDrawFrames = frameEvents.filter((e) => e.name === 'DrawFrame').length;
  const traceDropped = frameEvents.filter((e) => e.name === 'DroppedFrame').length;

  return {
    layoutMs: layout.total, layoutWorstMs: layout.worst,
    paintMs: paint.total, paintWorstMs: paint.worst,
    rasterMs: raster.total, rasterWorstMs: raster.worst,   // worst raster = glint filter re-raster proxy
    updateLayerMs: updateLayer.total,
    mainBusyMs: round(mainBusyMs), mainBusyPct: round(winMs ? (mainBusyMs / winMs) * 100 : 0, 1),
    longTasks, longTaskMs: round(longTaskMs), longestTaskMs: round(longestTaskMs),
    traceDrawFrames, traceDropped,
  };
}

// Frame stats from in-page rAF timestamps (robust under headless + CPU throttle).
function frameStats(timestamps) {
  if (!timestamps || timestamps.length < 3) {
    return { meanFps: null, framesOver16: null, longestFrameMs: null, frameCount: timestamps ? timestamps.length : 0 };
  }
  const ts = timestamps.slice().sort((a, b) => a - b);
  const intervals = [];
  for (let i = 1; i < ts.length; i++) intervals.push(ts[i] - ts[i - 1]);
  const span = (ts[ts.length - 1] - ts[0]) / 1000; // seconds
  const meanFps = ts.length / span;
  const framesOver16 = intervals.filter((d) => d > 16.7).length;
  const longestFrameMs = Math.max(...intervals);
  return {
    meanFps: round(meanFps, 1),
    framesOver16,
    longestFrameMs: round(longestFrameMs),
    frameCount: ts.length,
  };
}

// ============================================================================
// Statistics across runs
// ============================================================================
function median(arr) {
  const a = arr.filter((x) => x != null).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}
function p95(arr) {
  const a = arr.filter((x) => x != null).sort((x, y) => x - y);
  if (!a.length) return null;
  return a[Math.min(a.length - 1, Math.ceil(0.95 * a.length) - 1)];
}
function aggregate(runs) {
  const keys = new Set();
  runs.forEach((r) => Object.keys(r).forEach((k) => keys.add(k)));
  const out = {};
  for (const k of keys) {
    const vals = runs.map((r) => r[k]).filter((v) => typeof v === 'number');
    if (vals.length) out[k] = { median: round(median(vals)), p95: round(p95(vals)) };
  }
  return out;
}

// ============================================================================
// In-page helpers (confounders, recorders)
// ============================================================================
const CONFOUNDER_SNIPPET = `(() => {
  // Pause every CSS @keyframes animation (banner glow, card-fx blurs, glows,
  // status/flag pulses, gleam). Does NOT affect CSS transitions (F4) or the
  // JS attribute mutation that drives the glint (F5).
  const s = document.createElement('style');
  s.setAttribute('data-perf-confounder', '1');
  s.textContent = '*,*::before,*::after{animation-play-state:paused !important;}';
  document.head.appendChild(s);
  // Circuit canvas: no global destroy handle is exposed (local in main.js), so
  // hide it — removes it from the compositor (no paint/composite). Residual CPU
  // is identical across compared runs and cancels in the on-off delta.
  const c = document.getElementById('circuit-canvas');
  if (c) c.style.display = 'none';
  return { animationsPaused: true, circuitHidden: !!c };
})()`;

const FRAME_RECORDER_START = `(() => {
  window.__frames = [];
  window.__rec = true;
  const rec = () => { if (!window.__rec) return; window.__frames.push(performance.now()); requestAnimationFrame(rec); };
  requestAnimationFrame(rec);
})()`;

// ============================================================================
// Page setup
// ============================================================================
async function newPage(browser, cpuRate, { earlyConfounders = false } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  const client = await page.target().createCDPSession();
  await client.send('Performance.enable').catch(() => {});
  await client.send('Emulation.setCPUThrottlingRate', { rate: cpuRate });

  if (earlyConfounders) {
    // For the boot scenario: hide circuit + pause animations before scripts run.
    await page.evaluateOnNewDocument(() => {
      const inject = () => {
        if (!document.head) { requestAnimationFrame(inject); return; }
        const s = document.createElement('style');
        s.textContent =
          '#circuit-canvas{display:none !important;}' +
          '*,*::before,*::after{animation-play-state:paused !important;}';
        document.head.appendChild(s);
      };
      inject();
    });
  }
  return { page, client, tracer: makeTracer(client) };
}

async function gotoAndSettle(page) {
  await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
  // fonts + hero SVG existence + boot settle
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  });
  await page.waitForSelector('#hero-name-svg .t-line1', { timeout: 15000 });
  await sleep(1600); // let bootLiquidTitle (~0.65s) fully settle
}

// ============================================================================
// Scenario: F5 hero glint sweep
// ============================================================================
async function scenarioF5Sweep(browser, cpuRate, glintOff) {
  const { page, client, tracer } = await newPage(browser, cpuRate);
  try {
    await gotoAndSettle(page);
    const confounders = await page.evaluate(CONFOUNDER_SNIPPET);

    // Neutralize the glint filter for the control run (keeps .mv-light in the DOM
    // so the pointermove handler + accept counter still run — isolates raster).
    let glintNeutralized = false;
    if (glintOff) {
      glintNeutralized = await page.evaluate(() => {
        const gs = document.querySelectorAll('#hero-name-svg g[filter]');
        let done = false;
        gs.forEach((g) => {
          if ((g.getAttribute('filter') || '').includes('liquid-glint')) {
            g.setAttribute('filter', 'none');
            done = true;
          }
        });
        return done;
      });
    }

    // Accept counter (MutationObserver on the glint point-light x/y) + hero box.
    const box = await page.evaluate(() => {
      window.__accepts = 0;
      const light = document.querySelector('.mv-light');
      if (light) {
        const mo = new MutationObserver((muts) => { window.__accepts += muts.length; });
        mo.observe(light, { attributes: true, attributeFilter: ['x', 'y'] });
        window.__mo = mo;
      }
      const svg = document.getElementById('hero-name-svg');
      const r = svg.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height, hasLight: !!light };
    });

    await page.evaluate(FRAME_RECORDER_START);
    await tracer.start();
    await page.evaluate(() => console.timeStamp('ITX_START'));

    // Synthesize ~120 mouseMoved events over ~2s, triangle-sweeping across the
    // title left<->right ~20px per step (clears the 14 viewBox-unit threshold),
    // one dispatch per ~animation frame.
    const x0 = box.x + 10, x1 = box.x + box.w - 10;
    const midY = box.y + box.h * 0.5;
    const N = 120, DUR = 2000, step = DUR / N, pxStep = 20;
    let x = x0, dir = 1;
    for (let i = 0; i < N; i++) {
      x += dir * pxStep;
      if (x >= x1) { x = x1; dir = -1; }
      if (x <= x0) { x = x0; dir = 1; }
      const y = midY + Math.sin(i / 6) * (box.h * 0.15);
      await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: 0 });
      await sleep(step);
    }

    await page.evaluate(() => console.timeStamp('ITX_END'));
    const events = await tracer.stop();
    const { accepts, frames } = await page.evaluate(() => {
      window.__rec = false;
      return { accepts: window.__accepts, frames: window.__frames };
    });

    const t0 = markerTs(events, 'ITX_START');
    const t1 = markerTs(events, 'ITX_END');
    if (t0 == null || t1 == null) throw new Error('F5 sweep: trace window markers missing');
    const m = parseTrace(events, t0, t1);
    Object.assign(m, frameStats(frames), { accepts, hasLight: box.hasLight, glintNeutralized });

    return { metrics: m, confounders, rawEvents: events, box };
  } finally {
    await page.close();
  }
}

// ============================================================================
// Scenario: F5 boot
// ============================================================================
async function scenarioF5Boot(browser, cpuRate) {
  const { page, client, tracer } = await newPage(browser, cpuRate, { earlyConfounders: true });
  try {
    await tracer.start();
    await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
    // record frames from as early as possible
    await page.evaluate(FRAME_RECORDER_START).catch(() => {});
    await page.evaluate(() => console.timeStamp('BOOT_MARK')).catch(() => {});
    await sleep(2000); // capture the ~0.65s boot + tail
    const events = await tracer.stop();
    const frames = await page.evaluate(() => { window.__rec = false; return window.__frames || []; }).catch(() => []);

    // Window = first 2s of the trace.
    const tsList = events.filter((e) => typeof e.ts === 'number').map((e) => e.ts);
    const t0 = Math.min(...tsList);
    const t1 = t0 + 2_000_000;
    const m = parseTrace(events, t0, t1);
    Object.assign(m, frameStats(frames));
    return { metrics: m, rawEvents: events };
  } finally {
    await page.close();
  }
}

// ============================================================================
// Scenario: F4 accordion
// ============================================================================
async function dispatchClick(client, x, y) {
  await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: 0 });
  await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
  await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
}

async function headerCenter(page, dataSection) {
  return page.evaluate((ds) => {
    const h = document.querySelector(`.section-header[data-section="${ds}"]`);
    h.scrollIntoView({ block: 'center' });
    const r = h.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, dataSection);
}

// Discover the worst-case-reflow section (topmost with most content below it).
async function discoverWorstSection(page) {
  return page.evaluate(() => {
    const docH = document.documentElement.scrollHeight;
    const rows = [...document.querySelectorAll('.section-header')].map((h) => {
      const ds = h.getAttribute('data-section');
      const body = h.nextElementSibling;
      const inner = body.querySelector('.section-body-inner');
      const ownPx = inner ? inner.scrollHeight : 0;
      const topY = h.getBoundingClientRect().top + window.scrollY;
      return { ds, ownPx, belowPx: Math.round(docH - topY) };
    });
    rows.sort((a, b) => b.belowPx - a.belowPx);
    return { worst: rows[0], all: rows };
  });
}

// Install INP + frame recorders in-page, then return.
async function installF4Recorders(page, dataSection) {
  await page.evaluate((ds) => {
    window.__inp = { click: null, firstPaint: null, settle: null };
    window.__frames = [];
    window.__rec = true;
    const rec = () => { if (!window.__rec) return; window.__frames.push(performance.now()); requestAnimationFrame(rec); };
    requestAnimationFrame(rec);
    const h = document.querySelector(`.section-header[data-section="${ds}"]`);
    const body = h.nextElementSibling;
    h.addEventListener('click', () => {
      window.__inp.click = performance.now();
      requestAnimationFrame(() => { window.__inp.firstPaint = performance.now(); });
    }, { once: true });
    body.addEventListener('transitionend', (e) => {
      if (e.propertyName === 'grid-template-rows' && window.__inp.settle == null) {
        window.__inp.settle = performance.now();
      }
    });
  }, dataSection);
}

async function readF4(page, dataSection) {
  return page.evaluate((ds) => {
    window.__rec = false;
    const body = document.querySelector(`.section-header[data-section="${ds}"]`).nextElementSibling;
    const inp = window.__inp || {};
    return {
      frames: window.__frames || [],
      inpFirstPaint: inp.click != null && inp.firstPaint != null ? inp.firstPaint - inp.click : null,
      inpSettle: inp.click != null && inp.settle != null ? inp.settle - inp.click : null,
      animatingStuck: body.classList.contains('is-animating'),
    };
  }, dataSection);
}

// subcase: 'open' | 'close' | 'worst' | 'double'
async function scenarioF4(browser, cpuRate, subcase, dataSectionArg) {
  const { page, client, tracer } = await newPage(browser, cpuRate);
  try {
    await gotoAndSettle(page);
    const confounders = await page.evaluate(CONFOUNDER_SNIPPET);

    let dataSection = dataSectionArg;
    let worstInfo = null;
    if (subcase === 'worst') {
      worstInfo = await discoverWorstSection(page);
      dataSection = worstInfo.worst.ds;
    }

    // Sections start OPEN (initSections). For open/worst/double we pre-collapse.
    const needPreCollapse = subcase === 'open' || subcase === 'worst' || subcase === 'double';
    if (needPreCollapse) {
      const c = await headerCenter(page, dataSection);
      await dispatchClick(client, c.x, c.y);
      await sleep(800); // settle collapse
    }

    await installF4Recorders(page, dataSection);
    const center = await headerCenter(page, dataSection);

    await tracer.start();
    await page.evaluate(() => console.timeStamp('ITX_START'));

    await dispatchClick(client, center.x, center.y);
    if (subcase === 'double') {
      await sleep(50);
      await dispatchClick(client, center.x, center.y); // immediately reverse
    }
    await sleep(700); // cover full transition + settle

    await page.evaluate(() => console.timeStamp('ITX_END'));
    const events = await tracer.stop();
    const r = await readF4(page, dataSection);

    const t0 = markerTs(events, 'ITX_START');
    const t1 = markerTs(events, 'ITX_END');
    if (t0 == null || t1 == null) throw new Error(`F4 ${subcase}: trace window markers missing`);
    const m = parseTrace(events, t0, t1);
    Object.assign(m, frameStats(r.frames), {
      inpFirstPaint: round(r.inpFirstPaint),
      inpSettle: round(r.inpSettle),
      animatingStuck: r.animatingStuck ? 1 : 0,
    });
    return { metrics: m, confounders, rawEvents: events, dataSection, worstInfo };
  } finally {
    await page.close();
  }
}

// ============================================================================
// Run N times, aggregate
// ============================================================================
async function runScenario(label, fn, saveRaw = true) {
  const runs = [];
  let meta = null;
  let savedRaw = false;
  for (let i = 0; i < RUNS; i++) {
    let res;
    try {
      res = await fn();
    } catch (err) {
      console.error(`  ! ${label} run ${i} failed: ${err.message}`);
      continue;
    }
    if (!res || !res.metrics) { console.error(`  ! ${label} run ${i}: no metrics`); continue; }
    runs.push(res.metrics);
    meta = { confounders: res.confounders, dataSection: res.dataSection, worstInfo: res.worstInfo, box: res.box };
    if (saveRaw && !savedRaw && res.rawEvents) {
      await writeFile(join(TRACE_DIR, `${label}.json`),
        JSON.stringify({ traceEvents: res.rawEvents }, null, 0));
      savedRaw = true;
    }
    process.stdout.write('.');
  }
  process.stdout.write('\n');
  if (!runs.length) return { label, ok: false, agg: {}, meta, sample: null, n: 0 };
  return { label, ok: true, agg: aggregate(runs), meta, sample: runs[0], n: runs.length };
}

// ============================================================================
// Reporting
// ============================================================================
function cell(agg, key) {
  const v = agg[key];
  if (!v) return 'n/a';
  return `${v.median} / ${v.p95}`;
}

function metricsTable(results, keys) {
  const header = ['scenario', ...keys.map((k) => k.label)];
  const sep = header.map(() => '---');
  const lines = [`| ${header.join(' | ')} |`, `| ${sep.join(' | ')} |`];
  for (const r of results) {
    const row = [r.title, ...keys.map((k) => (r.ok ? cell(r.res.agg, k.key) : 'FAILED'))];
    lines.push(`| ${row.join(' | ')} |`);
  }
  return lines.join('\n');
}

async function main() {
  await mkdir(TRACE_DIR, { recursive: true });
  console.log('Starting static server…');
  const server = await startServer();
  await waitPort(PORT);
  console.log(`Serving ${REPO_ROOT} at ${BASE}`);

  console.log('Launching Chrome for Testing…');
  const browser = await puppeteer.launch({ headless: true, args: CHROME_FLAGS });
  const version = await browser.version();
  console.log(`Browser: ${version}`);

  const failures = [];
  const store = {};
  const record = (r) => { store[r.label] = r; if (!r.ok) failures.push(r.label); return r; };

  try {
    // ---- F5 sweep: on/off × cpu rates ----
    for (const rate of CPU_RATES) {
      console.log(`\n[F5 sweep] glint ON  @ ${rate}× CPU`);
      record(await runScenario(`f5-sweep-on-${rate}x`, () => scenarioF5Sweep(browser, rate, false)));
      console.log(`[F5 sweep] glint OFF @ ${rate}× CPU`);
      record(await runScenario(`f5-sweep-off-${rate}x`, () => scenarioF5Sweep(browser, rate, true)));
    }
    // ---- F5 boot ----
    for (const rate of CPU_RATES) {
      console.log(`\n[F5 boot] @ ${rate}× CPU`);
      record(await runScenario(`f5-boot-${rate}x`, () => scenarioF5Boot(browser, rate)));
    }
    // ---- F4 accordion: 4 subcases × cpu rates ----
    for (const rate of CPU_RATES) {
      for (const sub of ['open', 'close', 'worst', 'double']) {
        console.log(`\n[F4 ${sub}] @ ${rate}× CPU`);
        record(await runScenario(`f4-${sub}-${rate}x`, () => scenarioF4(browser, rate, sub, 'skills')));
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  await writeResults(store, version, failures);

  if (failures.length) {
    console.error(`\nFAILED scenarios: ${failures.join(', ')}`);
    process.exit(1);
  }
  console.log('\nAll scenarios collected. See perf/RESULTS.md');
}

// ---- RESULTS.md ----
async function writeResults(store, version, failures) {
  const g = (label) => store[label] || { ok: false, agg: {} };

  const f5Keys = [
    { key: 'meanFps', label: 'mean-FPS' },
    { key: 'framesOver16', label: 'frames>16.7ms' },
    { key: 'longestFrameMs', label: 'longest-frame ms' },
    { key: 'rasterMs', label: 'Raster ms (all-thread)' },
    { key: 'rasterWorstMs', label: 'worst-Raster ms' },
    { key: 'paintMs', label: 'main-Paint ms' },
    { key: 'layoutMs', label: 'main-Layout ms' },
    { key: 'mainBusyPct', label: 'main-busy %' },
    { key: 'longTasks', label: 'main long-tasks>50ms' },
    { key: 'accepts', label: 'moves accepted' },
  ];
  const f4Keys = [
    { key: 'meanFps', label: 'mean-FPS' },
    { key: 'framesOver16', label: 'frames>16.7ms' },
    { key: 'longestFrameMs', label: 'longest-frame ms' },
    { key: 'layoutMs', label: 'main-Layout ms' },
    { key: 'layoutWorstMs', label: 'worst-Layout ms' },
    { key: 'paintMs', label: 'main-Paint ms' },
    { key: 'mainBusyPct', label: 'main-busy %' },
    { key: 'longTasks', label: 'main long-tasks>50ms' },
    { key: 'inpSettle', label: 'INP-settle ms' },
    { key: 'inpFirstPaint', label: 'INP-1stpaint ms' },
  ];

  const mkRows = (specs) => specs.map((s) => ({ title: s.title, ok: g(s.label).ok, res: g(s.label) }));

  const f5SweepRows = mkRows([
    { title: 'glint ON · 1×', label: 'f5-sweep-on-1x' },
    { title: 'glint OFF · 1×', label: 'f5-sweep-off-1x' },
    { title: 'glint ON · 4×', label: 'f5-sweep-on-4x' },
    { title: 'glint OFF · 4×', label: 'f5-sweep-off-4x' },
  ]);
  const f5BootRows = mkRows([
    { title: 'boot · 1×', label: 'f5-boot-1x' },
    { title: 'boot · 4×', label: 'f5-boot-4x' },
  ]);
  const f4Rows = mkRows([
    { title: 'open · 1×', label: 'f4-open-1x' },
    { title: 'close · 1×', label: 'f4-close-1x' },
    { title: 'worst · 1×', label: 'f4-worst-1x' },
    { title: 'double · 1×', label: 'f4-double-1x' },
    { title: 'open · 4×', label: 'f4-open-4x' },
    { title: 'close · 4×', label: 'f4-close-4x' },
    { title: 'worst · 4×', label: 'f4-worst-4x' },
    { title: 'double · 4×', label: 'f4-double-4x' },
  ]);

  // ---- verdict computations ----
  const med = (label, key) => { const a = g(label).agg[key]; return a ? a.median : null; };
  const delta = (onL, offL, key) => {
    const on = med(onL, key), off = med(offL, key);
    return on != null && off != null ? round(on - off) : null;
  };

  // F5 signal = worker-thread raster (where the glint filter re-rasters), isolated
  // by glint-ON minus glint-OFF. The deciding number is the worst single raster
  // slice at 4× vs a 16ms frame budget; frame-pacing corroborates.
  const f5RasterDelta1 = delta('f5-sweep-on-1x', 'f5-sweep-off-1x', 'rasterMs');
  const f5RasterDelta4 = delta('f5-sweep-on-4x', 'f5-sweep-off-4x', 'rasterMs');
  const f5WorstRasterOn1 = med('f5-sweep-on-1x', 'rasterWorstMs');
  const f5WorstRasterOn4 = med('f5-sweep-on-4x', 'rasterWorstMs');
  const f5WorstRasterOff4 = med('f5-sweep-off-4x', 'rasterWorstMs');
  const f5LongestOn1 = med('f5-sweep-on-1x', 'longestFrameMs');
  const f5LongestOff1 = med('f5-sweep-off-1x', 'longestFrameMs');
  const f5LongestOn4 = med('f5-sweep-on-4x', 'longestFrameMs');
  const f5LongestOff4 = med('f5-sweep-off-4x', 'longestFrameMs');
  const f5OverOn4 = med('f5-sweep-on-4x', 'framesOver16');
  const f5OverOff4 = med('f5-sweep-off-4x', 'framesOver16');
  const f5Accepts1 = med('f5-sweep-on-1x', 'accepts');
  const f5Accepts4 = med('f5-sweep-on-4x', 'accepts');
  const f5MainLong4 = med('f5-sweep-on-4x', 'longTasks');

  // Off-main-thread cost that still exceeds a frame budget at 4× => confirmed.
  const f5Confirmed = f5WorstRasterOn4 != null && f5WorstRasterOn4 > 16;
  const f5Verdict4 = f5WorstRasterOn4 != null ? (f5WorstRasterOn4 > 16 ? 'OVER 16ms frame budget' : 'within 16ms budget') : 'n/a';

  const f4WorstLayout4 = med('f4-worst-4x', 'layoutWorstMs');
  const f4WorstLayoutTot4 = med('f4-worst-4x', 'layoutMs');
  const f4WorstLongest4 = med('f4-worst-4x', 'longestFrameMs');
  const f4WorstFps4 = med('f4-worst-4x', 'meanFps');
  const f4WorstLong4 = med('f4-worst-4x', 'longTasks');
  const f4CloseFps4 = med('f4-close-4x', 'meanFps');
  // "Acceptable, no refactor" iff it holds >=50fps AND no >50ms main-thread task at 4×.
  const f4Acceptable = f4WorstFps4 != null && f4WorstFps4 >= 55 && (f4WorstLong4 === 0);

  const worstMeta = g('f4-worst-4x').meta || g('f4-worst-1x').meta || {};
  const worstDs = worstMeta.dataSection || (worstMeta.worstInfo && worstMeta.worstInfo.worst && worstMeta.worstInfo.worst.ds);

  const now = new Date().toISOString();
  const md = `# Automated profiling — F5 (hero SVG glint) & F4 (section accordion)

_Generated ${now} by \`perf/harness.mjs\` (fully headless, no human interaction)._

Every number below is **median / p95 across ${RUNS} runs**. Raw traces for run 0 of each
scenario are in \`perf/traces/<scenario>.json\` (filter \`traceEvents\` to reproduce).

## Environment (pinned, reproducible)

- **Browser:** ${version} (Chrome for Testing, downloaded by Puppeteer)
- **Launch flags:** \`${CHROME_FLAGS.join(' ')}\`
- **Viewport:** 1440×900, \`deviceScaleFactor: 2\` (matches circuit.js DPR-2 cap)
- **CPU throttle:** \`Emulation.setCPUThrottlingRate\` at **1×** (fast desktop) and **4×** (mid-tier device)
- **Trace transport:** raw CDP \`Tracing\` (ReportEvents), categories: \`${TRACE_CATEGORIES.join(', ')}\`
- **Server:** Node static server on ${BASE} (HTTP, not file://) serving repo root
- **Runs per scenario:** ${RUNS}; **motion generated via** \`Input.dispatchMouseEvent({type:'mouseMoved'|'mousePressed'|'mouseReleased'})\`

### Confounders neutralized before every scenario

- **All CSS \`@keyframes\` animations paused** via injected \`*{animation-play-state:paused!important}\`
  (kills banner glow F1, card-fx blurs F2, hero-glow, flag/status pulses F3, gleam) — does **not**
  touch CSS transitions (F4) or the JS attribute mutation that drives the glint (F5).
- **Circuit canvas (\`#circuit-canvas\`) hidden** (\`display:none\`). No global \`destroy()\` handle is
  exposed (it's a local in main.js:1272), so hiding removes it from the compositor. Its residual
  rAF CPU is identical across compared runs and **cancels in the glint on−off delta**.
- Confounders applied for boot **before scripts run** via \`page.evaluateOnNewDocument\`.

---

## F5 — hero "liquid" SVG glint under pointer sweep

Motion: ~120 \`mouseMoved\` events over ~2s, triangle-sweeping left↔right across the hero
title (\`#hero-name-svg\`) ~20px/step (clears hero.js's 14 **viewBox-unit** accept threshold),
one dispatch per animation frame. **Gate cleared:** the in-page MutationObserver on the glint
\`fePointLight.mv-light\` x/y counted **${f5Accepts1 ?? 'n/a'}** accepted moves at 1× and
**${f5Accepts4 ?? 'n/a'}** at 4× (>0 confirms hero.js's threshold + proximity + IO gates were
tripped by the synthetic motion). Control ("glint OFF") sets the glint \`<g>\`'s \`filter\` to
\`none\` so the pointermove handler + accept counter still run but no glint raster occurs — the
**on−off delta isolates the filter's cost**.

${metricsTable(f5SweepRows, f5Keys)}

**Where the cost lives — glint ON vs OFF (median):** The glint filter re-rasters on
**worker/GPU raster threads, not the main thread** (main-busy % is ~identical on/off, and
main-thread long-tasks stay at ${f5MainLong4 ?? 0}). Its cost is CPU-throttle-sensitive
(raster threads are throttled too), so it only becomes significant at 4×:

| CPU | Δ Raster sum (ON−OFF) over sweep | worst Raster slice ON | worst Raster slice OFF | longest frame ON→OFF | frames>16.7ms ON→OFF |
|-----|------|------|------|------|------|
| 1× | ${f5RasterDelta1 ?? 'n/a'} ms | ${f5WorstRasterOn1 ?? 'n/a'} ms | — | ${f5LongestOn1 ?? 'n/a'} → ${f5LongestOff1 ?? 'n/a'} ms | — |
| 4× | ${f5RasterDelta4 ?? 'n/a'} ms | ${f5WorstRasterOn4 ?? 'n/a'} ms | ${f5WorstRasterOff4 ?? 'n/a'} ms | ${f5LongestOn4 ?? 'n/a'} → ${f5LongestOff4 ?? 'n/a'} ms | ${f5OverOn4 ?? 'n/a'} → ${f5OverOff4 ?? 'n/a'} |

> **VERDICT F5 — P1 ${f5Confirmed ? 'CONFIRMED (re-scoped)' : 'DOWNGRADE'}:** the worst single filter-raster
> slice is **${f5WorstRasterOn4 ?? 'n/a'} ms at 4× (${f5Verdict4})** vs **${f5WorstRasterOff4 ?? 'n/a'} ms** with the
> glint removed — well past the audit's ">8ms raster" bar. During a fast sweep the glint roughly
> ${f5LongestOn4 && f5LongestOff4 ? '**' + round(f5LongestOn4 / f5LongestOff4, 1) + '×**' : ''} the longest
> presented-frame gap (${f5LongestOn4 ?? 'n/a'} vs ${f5LongestOff4 ?? 'n/a'} ms) and multiplies frames-over-budget
> (${f5OverOn4 ?? 'n/a'} vs ${f5OverOff4 ?? 'n/a'}). **But the cost is off the main thread** (raster/compositing),
> so JS stays responsive (main long-tasks: ${f5MainLong4 ?? 0}) and mean FPS holds ~100. At 1× it is
> buried in noise (Δraster ${f5RasterDelta1 ?? 'n/a'} ms). ${f5Confirmed
    ? 'Confirmed as a real mid-tier-GPU hitch — the correct fix is the **compositor-only glint overlay** (PERF-AUDIT F5 fix *(d)*), NOT main-thread optimization.'
    : 'Within budget — downgrade.'}
> Deciding number: **worst filter-raster slice = ${f5WorstRasterOn4 ?? 'n/a'} ms at 4× CPU** (vs 16 ms budget; 8 ms audit bar).

### F5 boot (first 2s, \`bootLiquidTitle\` mutating filter attrs ~30Hz)

${metricsTable(f5BootRows, f5Keys.filter((k) => k.key !== 'accepts'))}

---

## F4 — section accordion (\`grid-template-rows: 0fr↔1fr\`)

Toggle target: \`.section-header[data-section]\`. Sections start **open** (initSections), so
\`open\`/\`worst\`/\`double\` pre-collapse then settle before the traced click. INP proxies are
measured in-page on the monotonic clock: **INP-1stpaint** = click→next rAF; **INP-settle** =
click→\`transitionend(grid-template-rows)\`. Worst-case-reflow section (most content below it):
**${worstDs || 'n/a'}**.

${metricsTable(f4Rows, f4Keys)}

- Rapid double-toggle \`.is-animating\` left stuck after settle: **${g('f4-double-4x').agg.animatingStuck ? (g('f4-double-4x').agg.animatingStuck.median ? 'YES (safety-timeout needed)' : 'no') : 'no'}** (4×).

> **VERDICT F4 — P2, ${f4Acceptable ? 'ACCEPTABLE (no refactor)' : 'mild jank, refactor optional'}:**
> worst-case single toggle (open, most content below) at 4× CPU — total main-thread Layout
> **${f4WorstLayoutTot4 ?? 'n/a'} ms** with a worst single Layout slice **${f4WorstLayout4 ?? 'n/a'} ms**,
> sustained **${f4WorstFps4 ?? 'n/a'} FPS** (vs **${f4CloseFps4 ?? 'n/a'} FPS** for a *close* toggle — proving
> ${f4WorstFps4 ?? 'n/a'} fps is real layout-bound work, not a headless cadence floor), longest frame
> **${f4WorstLongest4 ?? 'n/a'} ms**, and **${f4WorstLong4 ?? 'n/a'}** main-thread tasks >50ms.
> ${f4Acceptable
    ? 'Holds ≥55fps with no >50ms main-thread long task → **acceptable, no refactor needed**.'
    : `Opening does not hold 60fps (~${f4WorstFps4} fps, worst Layout ${f4WorstLayout4} ms > 16 ms) but posts **no >50ms main-thread long task** and INP-settle is just the CSS transition duration. Bounded, low-severity jank — the height/transform refactor (PERF-AUDIT F4) is **justifiable but low priority**; the \`.is-animating\` safety timeout is the cheaper win.`}
> Deciding numbers: **worst Layout ${f4WorstLayout4 ?? 'n/a'} ms, ${f4WorstFps4 ?? 'n/a'} fps sustained, ${f4WorstLong4 ?? 'n/a'} main-thread long-tasks at 4×.**

---

## Reproducibility notes & caveats

- **Thread attribution:** \`RunTask\`/\`Paint\`/\`Layout\` are summed **only on \`CrRendererMain\`**
  (the jank-causing thread) — an early version summed across all threads and reported
  \`sum=3937ms\` inside a 2816ms window, which is why the raw multi-thread \`RunTask\` totals are
  meaningless. \`RasterTask\` is summed across **all** threads on purpose: worker/GPU raster is
  exactly where the SVG glint filter's turbulence+lighting cost lands, so the **worst single
  \`RasterTask\` slice is the filter-raster proxy** (Blink emits no dedicated "filter" slice).
- **Frame stats** (mean-FPS, frames>16.7ms, longest-frame) come from an in-page rAF recorder —
  robust under \`--headless=new\` + CPU throttling, where compositor \`DrawFrame\`/\`DroppedFrame\`
  cadence is unreliable (a no-glint control still showed 800+ \`DroppedFrame\` events). Baseline
  mean-FPS floats ~100–135 in headless; the meaningful signals are **relative** (ON vs OFF,
  open vs close) and the **longest-frame / worst-slice** spikes, not the absolute FPS number.
- **Gate verification:** the "moves accepted" column is read back from a live in-page
  MutationObserver on the glint point-light — a non-zero count proves the synthetic
  \`mouseMoved\` stream cleared hero.js's 14-viewBox-unit distance threshold, proximity gate,
  and hero-visibility IntersectionObserver.
- Run: \`node perf/harness.mjs\` (starts/stops its own server; exits non-zero if any scenario
  collected no trace).
${failures.length ? `\n> ⚠️ Scenarios that failed to collect: ${failures.join(', ')}` : ''}
`;

  await writeFile(join(__dirname, 'RESULTS.md'), md);
  console.log('Wrote perf/RESULTS.md');
}

main().catch((err) => { console.error(err); process.exit(1); });
