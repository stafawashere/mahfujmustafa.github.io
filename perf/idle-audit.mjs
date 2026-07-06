// Idle-CPU audit: measures renderer main-thread TaskDuration + rAF frame count
// over a 10s idle window (no input), with toggle experiments to attribute
// continuous cost. Run: THROTTLE=4 node perf/idle-audit.mjs
import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PORT = 8093;
const RUNS = 5;
const WINDOW_MS = 10000;
const THROTTLE = Number(process.env.THROTTLE || 1);

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

const EXPERIMENTS = {
  baseline: {},
  'no-circuit': { css: '#circuit-canvas{display:none!important}' },
  'no-meta-circuit': { css: '#meta-canvas,.meta-circuit,[id*=meta][id*=canvas]{display:none!important}' },
  'no-all-canvas': { css: 'canvas{display:none!important}' },
  'no-css-anim': { css: '*,*::before,*::after{animation-play-state:paused!important}' },
  'all-off': { css: 'canvas{display:none!important}*,*::before,*::after{animation-play-state:paused!important}' },
};

const server = await startServer();
const browser = await puppeteer.launch({
  headless: true,
  args: ['--headless=new', '--no-sandbox', '--force-device-scale-factor=2', '--mute-audio',
    '--disable-background-timer-throttling', '--force-color-profile=srgb', '--enable-gpu-rasterization'],
});

console.log(`idle-audit @ ${THROTTLE}x CPU, window ${WINDOW_MS}ms, ${RUNS} runs (median)`);
for (const [name, exp] of Object.entries(EXPERIMENTS)) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    if (exp.css) {
      await page.evaluateOnNewDocument((c) => {
        addEventListener('DOMContentLoaded', () => {
          const s = document.createElement('style');
          s.textContent = c;
          document.head.appendChild(s);
        });
      }, exp.css);
    }
    const cdp = await page.createCDPSession();
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
    await cdp.send('Performance.enable');
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 3000)); // boot settle

    await page.evaluate(() => {
      window.__raf = 0; window.__rec = true;
      const tick = () => { window.__raf++; if (window.__rec) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
    const m0 = await cdp.send('Performance.getMetrics');
    const t0 = Date.now();
    await new Promise((r) => setTimeout(r, WINDOW_MS));
    const m1 = await cdp.send('Performance.getMetrics');
    const elapsed = (Date.now() - t0) / 1000;
    const rafCount = await page.evaluate(() => { window.__rec = false; return window.__raf; });
    const get = (m, n) => (m.metrics.find((x) => x.name === n) || {}).value || 0;
    runs.push({
      taskMsPerSec: +(((get(m1, 'TaskDuration') - get(m0, 'TaskDuration')) * 1000) / elapsed).toFixed(1),
      scriptMsPerSec: +(((get(m1, 'ScriptDuration') - get(m0, 'ScriptDuration')) * 1000) / elapsed).toFixed(1),
      layoutMsPerSec: +(((get(m1, 'LayoutDuration') - get(m0, 'LayoutDuration')) * 1000) / elapsed).toFixed(1),
      styleMsPerSec: +(((get(m1, 'RecalcStyleDuration') - get(m0, 'RecalcStyleDuration')) * 1000) / elapsed).toFixed(1),
      rafFps: +(rafCount / elapsed).toFixed(1),
    });
    await page.close();
  }
  const med = {};
  for (const k of Object.keys(runs[0])) {
    const v = runs.map((r) => r[k]).sort((a, b) => a - b);
    med[k] = v[Math.floor(v.length / 2)];
  }
  console.log(name.padEnd(16), JSON.stringify(med));
}
await browser.close();
server.close();
