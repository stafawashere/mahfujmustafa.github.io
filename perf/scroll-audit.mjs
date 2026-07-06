// Scroll-jank audit: traces a synthetic wheel scroll top->bottom and back,
// measures frame times via requestAnimationFrame deltas in-page, and runs
// toggle experiments to attribute the lag. Run: node perf/scroll-audit.mjs
import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PORT = 8091;
const RUNS = 3;
const THROTTLE = Number(process.env.THROTTLE || 4); // 4x = mid-tier device

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
function startServer() {
  const server = createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/' || p.endsWith('/')) p += 'index.html';
      const abs = join(REPO_ROOT, p);
      if (!abs.startsWith(REPO_ROOT)) return res.writeHead(403).end();
      const body = await readFile(abs);
      res.writeHead(200, { 'Content-Type': MIME[extname(abs)] || 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404).end(); }
  });
  return new Promise((r) => server.listen(PORT, '127.0.0.1', () => r(server)));
}

// Experiments: each injects CSS/JS before load to disable ONE suspect.
const EXPERIMENTS = {
  baseline: {},
  'no-nav-blur': { css: '#nav{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}' },
  'no-css-anim': { css: '*,*::before,*::after{animation-play-state:paused!important}' },
  'no-circuit': { css: '#circuit-canvas,#meta-canvas,canvas{display:none!important}' },
  'no-autofocus': { js: 'window.__killAutofocus = true;' }, // see patch below
  'no-blur-fx': { css: '.card-fx::before,#contact-glow,.hero-glow,[class*=glow]{filter:none!important}' },
  'everything-off': { css: '#nav{backdrop-filter:none!important}*,*::before,*::after{animation-play-state:paused!important}canvas{display:none!important}.card-fx::before{filter:none!important}' },
};

async function measureScroll(page) {
  // rAF-based frame monitor: records every frame delta during the scroll.
  await page.evaluate(() => {
    window.__frames = [];
    window.__mon = true;
    let last = performance.now();
    function tick(ts) {
      window.__frames.push(ts - last);
      last = ts;
      if (window.__mon) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });

  // Synthetic wheel scroll: 60 wheel ticks down, pause, 30 up.
  const cdp = await page.createCDPSession();
  for (let i = 0; i < 60; i++) {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 720, y: 450, deltaX: 0, deltaY: 140 });
    await new Promise((r) => setTimeout(r, 32));
  }
  await new Promise((r) => setTimeout(r, 200));
  for (let i = 0; i < 30; i++) {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 720, y: 450, deltaX: 0, deltaY: -200 });
    await new Promise((r) => setTimeout(r, 32));
  }
  await cdp.detach();

  return page.evaluate(() => {
    window.__mon = false;
    const f = window.__frames.slice(2); // drop warmup
    f.sort((a, b) => a - b);
    const q = (p) => f[Math.min(f.length - 1, Math.floor(f.length * p))];
    const dropped = f.filter((d) => d > 26).length; // >~1.5 frames @60Hz
    const bad = f.filter((d) => d > 50).length;     // visible hitch
    return {
      frames: f.length,
      median: +q(0.5).toFixed(1),
      p95: +q(0.95).toFixed(1),
      worst: +f[f.length - 1].toFixed(1),
      'dropped>26ms': dropped,
      'hitch>50ms': bad,
    };
  });
}

function agg(runs) {
  const out = {};
  for (const k of Object.keys(runs[0])) {
    const v = runs.map((r) => r[k]).sort((a, b) => a - b);
    out[k] = v[Math.floor(v.length / 2)];
  }
  return out;
}

const server = await startServer();
const browser = await puppeteer.launch({
  headless: true,
  args: ['--headless=new', '--no-sandbox', '--force-device-scale-factor=2', '--mute-audio',
    '--disable-background-timer-throttling', '--force-color-profile=srgb', '--enable-gpu-rasterization'],
});

const results = {};
for (const [name, exp] of Object.entries(EXPERIMENTS)) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    if (exp.js) await page.evaluateOnNewDocument(exp.js);
    if (exp.css) {
      const css = exp.css;
      await page.evaluateOnNewDocument((c) => {
        addEventListener('DOMContentLoaded', () => {
          const s = document.createElement('style');
          s.textContent = c;
          document.head.appendChild(s);
        });
      }, css);
    }
    const cdp = await page.createCDPSession();
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 2500)); // let boot animation settle
    runs.push(await measureScroll(page));
    await page.close();
  }
  results[name] = agg(runs);
  console.log(name.padEnd(16), JSON.stringify(results[name]));
}

await browser.close();
server.close();
