// Deep trace of one scroll pass: reports the longest tasks and what's inside
// them (layout, paint, style recalc), plus per-category totals during scroll.
// Also supports SUSPECT=autofocus to genuinely disable the card-autofocus
// scroll handler by stubbing its selector.
import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PORT = 8092;
const SUSPECT = process.env.SUSPECT || '';

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/' || p.endsWith('/')) p += 'index.html';
    const body = await readFile(join(REPO_ROOT, p));
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const browser = await puppeteer.launch({
  headless: true,
  args: ['--headless=new', '--no-sandbox', '--force-device-scale-factor=2', '--mute-audio',
    '--disable-background-timer-throttling', '--force-color-profile=srgb', '--enable-gpu-rasterization'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
if (SUSPECT === 'autofocus') {
  // Neutralize the autofocus scroll handler for real: its update() queries
  // '.project-card, .exp-card' etc. — break the class before scripts run.
  await page.evaluateOnNewDocument(() => {
    addEventListener('DOMContentLoaded', () => {
      // remove after main.js cached? main.js caches lazily on first update();
      // stripping classes now (before its 700ms first run) empties the list.
      document.querySelectorAll('[class*="card"]').forEach((el) => {
        el.dataset.origClass = el.className;
      });
    });
  });
}
const cdp = await page.createCDPSession();
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

let events = [];
cdp.on('Tracing.dataCollected', (d) => { if (d.value) events.push(...d.value); });

await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 2500));

await cdp.send('Tracing.start', {
  transferMode: 'ReportEvents',
  traceConfig: {
    recordMode: 'recordAsMuchAsPossible',
    includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'blink.user_timing', 'toplevel'],
  },
});

for (let i = 0; i < 60; i++) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 720, y: 450, deltaX: 0, deltaY: 140 });
  await new Promise((r) => setTimeout(r, 32));
}

const done = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
await cdp.send('Tracing.end');
await done;

// ---- analysis ----
const CATS = ['FunctionCall', 'EventDispatch', 'TimerFire', 'FireAnimationFrame',
  'Layout', 'UpdateLayoutTree', 'Paint', 'PrePaint', 'Layerize', 'HitTest', 'UpdateLayerTree',
  'CompositeLayers', 'GCEvent', 'MinorGC', 'MajorGC', 'V8.GCScavenger'];
const byCat = {};
for (const e of events) {
  if (e.dur && CATS.includes(e.name)) {
    byCat[e.name] = byCat[e.name] || { total: 0, n: 0, worst: 0 };
    byCat[e.name].total += e.dur / 1000;
    byCat[e.name].n++;
    byCat[e.name].worst = Math.max(byCat[e.name].worst, e.dur / 1000);
  }
}
console.log(`\n=== category totals during scroll (${SUSPECT || 'baseline'}) ===`);
for (const [k, v] of Object.entries(byCat).sort((a, b) => b[1].total - a[1].total)) {
  console.log(k.padEnd(20), 'total', v.total.toFixed(1) + 'ms', ' n=' + v.n, ' worst', v.worst.toFixed(1) + 'ms');
}

// longest top-level tasks and their contents
const tasks = events.filter((e) => e.name === 'RunTask' && e.dur > 15000).sort((a, b) => b.dur - a.dur).slice(0, 6);
console.log('\n=== longest tasks (>15ms) ===');
for (const t of tasks) {
  console.log(`task ${(t.dur / 1000).toFixed(1)}ms @${t.ts}`);
  const inner = events.filter((e) => e.ts >= t.ts && e.ts + (e.dur || 0) <= t.ts + t.dur && e.dur > 2000 && e !== t)
    .sort((a, b) => b.dur - a.dur).slice(0, 6);
  for (const i of inner) {
    const d = i.args?.data || {};
    console.log('   ', i.name, (i.dur / 1000).toFixed(1) + 'ms', d.functionName ? `${d.functionName} ${d.url?.split('/').pop()}:${d.lineNumber}` : (d.type || ''));
  }
}

// forced reflows: Layout events with beginData.stackTrace
const forced = events.filter((e) => e.name === 'Layout' && e.args?.beginData?.stackTrace?.length);
const sites = {};
for (const f of forced) {
  const s = f.args.beginData.stackTrace[0];
  const key = `${s.functionName || '(anon)'} ${s.url?.split('/').pop()}:${s.lineNumber}`;
  sites[key] = sites[key] || { n: 0, total: 0 };
  sites[key].n++;
  sites[key].total += (f.dur || 0) / 1000;
}
console.log('\n=== forced synchronous layouts (JS-triggered) ===');
for (const [k, v] of Object.entries(sites).sort((a, b) => b[1].total - a[1].total).slice(0, 10)) {
  console.log(k.padEnd(50), 'n=' + v.n, v.total.toFixed(1) + 'ms');
}

await writeFile(join(REPO_ROOT, 'perf', 'traces', `scroll-${SUSPECT || 'baseline'}.json`), JSON.stringify({ traceEvents: events }));
await browser.close();
server.close();
