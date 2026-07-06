// Hero-title boot smoothness audit.
// Per cold load records: scramble tick timestamps (MutationObserver on the
// title <text> nodes), viewBox refits, fonts.ready timing, rAF frame deltas
// during the boot, and (run 0 of each config) a CDP trace of the boot window
// with paint/raster/layout category totals + longest tasks.
//
// Env:
//   SUSPECT  = baseline | nofilter | simplefilter | nocircuit | nocssanim | nofont
//   THROTTLE = 1 | 4   (CPU throttle rate)
//   RUNS     = number of cold loads (default 5)
import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PORT = 8094;
const SUSPECT = process.env.SUSPECT || 'baseline';
const THROTTLE = Number(process.env.THROTTLE || 1);
const RUNS = Number(process.env.RUNS || 5);

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

// page-side instrumentation, installed before any page script runs
const INSTRUMENT = (suspect) => `(() => {
  const S = ${JSON.stringify(suspect)};
  const L = window.__audit = { ticks: [], refits: [], sweep: [], raf: [], marks: {}, nav: performance.timeOrigin };
  const mark = (k) => { if (!(k in L.marks)) L.marks[k] = performance.now(); };

  document.addEventListener('curie:title-ready', () => mark('titleReady'));
  addEventListener('DOMContentLoaded', () => mark('dcl'));
  addEventListener('load', () => mark('load'));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => mark('fontsReady'));

  // rAF delta sampler for the first 8s
  let last = 0;
  const rafLoop = (now) => {
    if (last) L.raf.push(now - last);
    last = now;
    if (now < 8000) requestAnimationFrame(rafLoop);
  };
  requestAnimationFrame(rafLoop);

  // Suspect toggles + observers attach as soon as the relevant nodes exist.
  const mo = new MutationObserver((recs) => {
    const now = performance.now();
    let tick = false;
    for (const r of recs) {
      const t = r.target;
      const el = t.nodeType === 3 ? t.parentElement : t;
      if (!el || !el.closest) continue;
      if (S === 'nocircuit' && el.id === 'circuit-canvas') { el.remove(); continue; }
      if (!el.closest('#hero-name-svg')) continue;
      if (r.type === 'attributes') {
        if (r.attributeName === 'viewBox') L.refits.push(now);
        else if (el.tagName === 'fePointLight') { if (!L.sweep.length || now - L.sweep[L.sweep.length-1] > 1) L.sweep.push(now); }
      } else if (el.matches && (el.matches('.t-line1,.t-line2') || (el.parentElement && el.parentElement.matches && el.parentElement.matches('.t-line1,.t-line2')))) {
        tick = true;
      }
    }
    if (tick && (!L.ticks.length || now - L.ticks[L.ticks.length-1] > 1)) L.ticks.push(now);
  });
  mo.observe(document.documentElement || document, { subtree: true, childList: true, characterData: true, attributes: true });

  addEventListener('DOMContentLoaded', () => {
    const svg = document.getElementById('hero-name-svg');
    if (S === 'nocircuit') { const c = document.getElementById('circuit-canvas'); if (c) c.remove(); }
    if (S === 'nocssanim') {
      const st = document.createElement('style');
      st.textContent = '*,*::before,*::after{animation:none !important;transition:none !important}';
      document.head.appendChild(st);
    }
    if (svg && S === 'nofilter') svg.querySelectorAll('g[filter]').forEach((g) => g.removeAttribute('filter'));
    if (svg && S === 'simplefilter') {
      // keep warp+blur, drop the lighting passes (the expensive primitives)
      const f = svg.querySelector('#liquid-inflate');
      if (f) f.innerHTML = '<feTurbulence type="fractalNoise" baseFrequency="0.006 0.010" numOctaves="2" seed="6" result="noise"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" result="warp"/>' +
        '<feGaussianBlur in="warp" stdDeviation="3.5"/>';
    }
  });
})();`;

const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[(s.length / 2) | 0] : NaN; };
const p95 = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * 0.95))] : NaN; };

const runs = [];
for (let run = 0; run < RUNS; run++) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.setCacheEnabled(false);
  const cdp = await page.createCDPSession();
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
  await page.evaluateOnNewDocument(INSTRUMENT(SUSPECT));
  if (SUSPECT === 'nofont') {
    await page.setRequestInterception(true);
    page.on('request', (req) => (/fonts|pacifico/i.test(req.url()) && !req.url().includes('127.0.0.1')) ? req.abort() : req.continue());
  }

  let events = [];
  const tracing = run === 0;
  if (tracing) {
    cdp.on('Tracing.dataCollected', (d) => { if (d.value) events.push(...d.value); });
    await cdp.send('Tracing.start', {
      transferMode: 'ReportEvents',
      traceConfig: {
        recordMode: 'recordAsMuchAsPossible',
        includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline',
          'disabled-by-default-devtools.timeline.frame', 'blink.user_timing', 'toplevel'],
      },
    });
  }

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  // wait for title-ready (or bail at 15s)
  await page.waitForFunction('window.__audit && window.__audit.marks.titleReady !== undefined', { timeout: 15000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 400));

  const data = await page.evaluate('window.__audit');
  let trace = null;
  if (tracing) {
    const done = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
    await cdp.send('Tracing.end');
    await done;
    trace = events;
    await writeFile(join(REPO_ROOT, 'perf', 'traces', `title-${SUSPECT}-${THROTTLE}x.json`), JSON.stringify({ traceEvents: events }));
  }
  await page.close();
  runs.push({ data, trace });

  const d = data.ticks.slice(1).map((t, i) => t - data.ticks[i]);
  console.log(`run ${run}: ticks=${data.ticks.length} tickΔ med=${med(d)?.toFixed(1)} p95=${p95(d)?.toFixed(1)} max=${Math.max(...d, 0).toFixed(1)} ` +
    `dropped(Δ>85ms)=${d.filter((x) => x > 85).length} refits@=${data.refits.map((x) => x.toFixed(0)).join(',')} ` +
    `fontsReady=${data.marks.fontsReady?.toFixed(0)} firstTick=${data.ticks[0]?.toFixed(0)} titleReady=${data.marks.titleReady?.toFixed(0)} ` +
    `sweepWrites=${data.sweep.length} rafΔ med=${med(data.raf)?.toFixed(1)} p95=${p95(data.raf)?.toFixed(1)}`);
}

// aggregate tick stats
const allD = runs.flatMap((r) => r.data.ticks.slice(1).map((t, i) => t - r.data.ticks[i]));
const allSweepD = runs.flatMap((r) => r.data.sweep.slice(1).map((t, i) => t - r.data.sweep[i]));
console.log(`\n=== ${SUSPECT} @${THROTTLE}x (${RUNS} cold loads) ===`);
console.log(`tickΔ  med=${med(allD).toFixed(1)}ms p95=${p95(allD).toFixed(1)}ms  dropped=${allD.filter((x) => x > 85).length}/${allD.length}`);
console.log(`sweepΔ med=${med(allSweepD).toFixed(1)}ms p95=${p95(allSweepD).toFixed(1)}ms  worst=${Math.max(...allSweepD, 0).toFixed(1)}ms`);

// trace analysis over the boot window (nav → titleReady) of run 0
const t0 = runs[0];
if (t0.trace) {
  const marks = t0.data.marks;
  const nav = t0.trace.find((e) => e.name === 'navigationStart' || (e.name === 'markAsMainFrame'))?.ts;
  // fall back: use earliest RunTask ts
  const base = nav || Math.min(...t0.trace.filter((e) => e.ts).map((e) => e.ts));
  const winEnd = base + ((marks.titleReady || 6000) + 200) * 1000;
  const CATS = ['Paint', 'RasterTask', 'Rasterize', 'ImageDecodeTask', 'DecodeImage', 'Layout', 'UpdateLayoutTree',
    'PrePaint', 'Layerize', 'CompositeLayers', 'FunctionCall', 'FireAnimationFrame', 'TimerFire', 'GPUTask', 'HitTest'];
  const byCat = {};
  for (const e of t0.trace) {
    if (!e.dur || e.ts > winEnd) continue;
    if (CATS.includes(e.name)) {
      byCat[e.name] = byCat[e.name] || { total: 0, n: 0, worst: 0 };
      byCat[e.name].total += e.dur / 1000; byCat[e.name].n++;
      byCat[e.name].worst = Math.max(byCat[e.name].worst, e.dur / 1000);
    }
  }
  console.log('\n--- boot-window category totals (run 0) ---');
  for (const [k, v] of Object.entries(byCat).sort((a, b) => b[1].total - a[1].total))
    console.log(k.padEnd(20), 'total', v.total.toFixed(1) + 'ms', 'n=' + v.n, 'worst', v.worst.toFixed(1) + 'ms');

  const tasks = t0.trace.filter((e) => e.name === 'RunTask' && e.dur > 15000 && e.ts <= winEnd)
    .sort((a, b) => b.dur - a.dur).slice(0, 8);
  console.log('\n--- longest main-thread tasks in boot window ---');
  for (const t of tasks) {
    const inner = t0.trace.filter((e) => e.ts >= t.ts && e.ts + (e.dur || 0) <= t.ts + t.dur && e.dur > 2000 && e !== t)
      .sort((a, b) => b.dur - a.dur).slice(0, 4);
    console.log(`task ${(t.dur / 1000).toFixed(1)}ms @+${((t.ts - base) / 1000).toFixed(0)}ms:`,
      inner.map((i) => `${i.name} ${(i.dur / 1000).toFixed(1)}ms${i.args?.data?.functionName ? ' ' + i.args.data.functionName : ''}`).join(' | '));
  }

  const forced = t0.trace.filter((e) => e.name === 'Layout' && e.args?.beginData?.stackTrace?.length && e.ts <= winEnd);
  const sites = {};
  for (const f of forced) {
    const s = f.args.beginData.stackTrace[0];
    const key = `${s.functionName || '(anon)'} ${s.url?.split('/').pop()}:${s.lineNumber}`;
    sites[key] = sites[key] || { n: 0, total: 0 };
    sites[key].n++; sites[key].total += (f.dur || 0) / 1000;
  }
  console.log('\n--- forced synchronous layouts in boot window ---');
  for (const [k, v] of Object.entries(sites).sort((a, b) => b[1].total - a[1].total).slice(0, 8))
    console.log(k.padEnd(50), 'n=' + v.n, v.total.toFixed(1) + 'ms');
}

await browser.close();
server.close();
