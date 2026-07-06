/* circuit.js — SVG circuit/board engine.
   Public contract: window.CURIE_ANIM_SCHEMA + initCircuit(host, getAnimCfg, isAlive, hooks).
   The optional `hooks` object receives boot sync callbacks — onCoreProgress(0..1)
   each boot frame and onCoreLit() once — so the hero title reveal can be gated
   on the core chip actually lighting up rather than a loose duration guess.

   The circuit is drawn into an <svg> that is
   absolutely positioned at DOCUMENT coordinates and spans the full page height,
   so it scrolls natively with the body content (same compositor pass) instead
   of being a fixed overlay repainted to chase the scroll. This eliminates the
   slip/jitter visible during rapid scrolling.

   All geometry is computed in document space (rect + scrollY), which is
   scroll-invariant; only genuinely viewport-relative logic (active-node pick,
   visibility culling, boot comet start, cursor) reads scrollY per frame. */

const CURIE_ANIM_SCHEMA = {
  bootDurationMs:  { def: 1300,  min: 400,  max: 3000 },
  bootArriveFrac:  { def: 0.5,   min: 0.2,  max: 0.95 },
  bootIngressMs:   { def: 320,   min: 80,   max: 1200 },
  bootFillMs:      { def: 1150,  min: 300,  max: 2400 },
  coreFullFrac:    { def: 0.88,  min: 0.5,  max: 1.0  },
  bootHoldMs:      { def: 100,   min: 0,    max: 4000 },
  settleMs:        { def: 600,   min: 200,  max: 3000 },
  hoverRadius:     { def: 84,    min: 40,   max: 300  },
  hoverEase:       { def: 0.14,  min: 0.03, max: 0.4  },
  retractEase:     { def: 0.07,  min: 0.02, max: 0.25 },
  coreSize:        { def: 45,    min: 16,   max: 48   },
  coreOffsetX:     { def: 0,     min: -280, max: 160  },
  railOffsetX:     { def: 120,   min: -220, max: 200  },
  idlePulseMs:     { def: 4200,  min: 1500, max: 9000 },
  idlePacketMs:    { def: 3600,  min: 1200, max: 9000 },
  rippleMs:        { def: 1500,  min: 500,  max: 3000 },
  scannerRps:      { def: 0.22,  min: 0.05, max: 1    },
};
if (typeof window !== 'undefined') window.CURIE_ANIM_SCHEMA = CURIE_ANIM_SCHEMA;

function initCircuit(host, getAnimCfg, isAlive, hooks) {
  hooks = hooks || {};
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (t) => document.createElementNS(NS, t);

  const SECTIONS = ['#skills', '#experience', '#work', '#education', '#contact'];

  const REDUCED_MOTION = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COARSE = typeof window.matchMedia === 'function'
    && window.matchMedia('(pointer: coarse)').matches;

  /* ---------- config ---------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function cfg(k) {
    const s = CURIE_ANIM_SCHEMA[k];
    const c = getAnimCfg();
    let v = c ? c[k] : undefined;
    if (v == null || v === '') v = s.def;
    v = +v;
    if (!isFinite(v)) v = s.def;
    return clamp(v, s.min, s.max);
  }

  // Moment (ms after bootStart) the core chip reads as fully lit — the fill
  // phase has swept in to coreFullFrac. The hero title reveal is gated on this
  // (via hooks) so the name only crystallises when the core lights.
  function coreLitAtMs() {
    return cfg('bootDurationMs') * cfg('bootArriveFrac')
         + cfg('bootIngressMs')
         + cfg('bootFillMs') * cfg('coreFullFrac');
  }

  /* ---------- colors ---------- */
  let PURPLE = '91,140,255', LILAC = '147,179,255';
  let PRGB = [91, 140, 255], LRGB = [147, 179, 255];
  let TINT_TAIL = '234,226,255', TINT_CORE = '245,241,255';
  const toward = (rgb, amt) => rgb.map(c => Math.round(c + (255 - c) * amt)).join(',');
  function syncColorsInner() {
    const cs = getComputedStyle(document.documentElement);
    const p = cs.getPropertyValue('--purple-rgb').trim();
    const l = cs.getPropertyValue('--lilac-rgb').trim();
    if (p) PURPLE = p.replace(/\s+/g, '');
    if (l) LILAC = l.replace(/\s+/g, '');
    PRGB = PURPLE.split(',').map(Number);
    LRGB = LILAC.split(',').map(Number);
    TINT_TAIL = toward(LRGB, 0.75);
    TINT_CORE = toward(LRGB, 0.88);
  }
  syncColorsInner();
  const rgba = (rgb, a) => 'rgba(' + rgb + ',' + a + ')';

  /* ---------- host svg (in-flow, document-sized) ---------- */
  host.setAttribute('aria-hidden', 'true');
  // Inline styles override the #circuit-canvas { position: fixed } rule.
  host.style.position = 'absolute';
  host.style.inset = 'auto';
  host.style.top = '0';
  host.style.left = '0';
  host.style.width = '100%';
  host.style.height = '0px';
  host.style.pointerEvents = 'none';
  host.style.zIndex = '0';
  host.style.isolation = 'isolate';  // keep plus-lighter blending inside this layer
  host.style.overflow = 'visible';

  const defs = mk('defs');
  host.appendChild(defs);

  // paint layers (back → front). Within a pool, DOM order == call order.
  const layers = {};
  ['rail', 'rect', 'line', 'poly', 'circle', 'ring', 'dot', 'aura'].forEach(n => {
    const g = mk('g');
    g.setAttribute('data-layer', n);
    host.appendChild(g);
    layers[n] = g;
  });

  let docW = 0, docH = 0;
  function measureDoc() {
    const de = document.documentElement;
    return {
      w: de.clientWidth,
      h: Math.max(de.scrollHeight, document.body ? document.body.scrollHeight : 0, window.innerHeight),
    };
  }
  function resize() {
    const d = measureDoc();
    docW = d.w; docH = d.h;
    host.setAttribute('width', docW);
    host.setAttribute('height', docH);
    host.style.width = docW + 'px';
    host.style.height = docH + 'px';
    railBuiltKey = '';           // force rail rebuild
  }

  /* ---------- gradient defs ---------- */
  let gradSeq = 0;
  let radialCache = {};
  function radialFor(rgb) {
    if (radialCache[rgb]) return radialCache[rgb];
    const id = 'cvsg-r' + (++gradSeq);
    const g = mk('radialGradient');
    g.setAttribute('id', id);
    const s0 = mk('stop');
    s0.setAttribute('offset', '0');
    s0.setAttribute('stop-color', 'rgb(' + rgb + ')');
    s0.setAttribute('stop-opacity', '1');
    const s1 = mk('stop');
    s1.setAttribute('offset', '1');
    s1.setAttribute('stop-color', 'rgb(' + rgb + ')');
    s1.setAttribute('stop-opacity', '0');
    g.appendChild(s0); g.appendChild(s1);
    defs.appendChild(g);
    radialCache[rgb] = id;
    return id;
  }

  /* ---------- pooled immediate-mode renderer ---------- */
  const pools = {};
  const cursors = {};
  function take(type, create) {
    const arr = pools[type] || (pools[type] = []);
    const i = cursors[type] || 0;
    cursors[type] = i + 1;
    if (i < arr.length) {
      const it = arr[i];
      if (it.off) { it.off = false; it.root.style.display = ''; }
      return it;
    }
    const it = create();
    arr.push(it);
    layers[it.layer].appendChild(it.root);
    return it;
  }
  function rBegin() { for (const k in cursors) cursors[k] = 0; }
  function rEnd() {
    for (const k in pools) {
      const arr = pools[k], used = cursors[k] || 0;
      for (let i = used; i < arr.length; i++) {
        if (!arr[i].off) { arr[i].off = true; arr[i].root.style.display = 'none'; }
      }
    }
  }
  function ptsStr(p) {
    let s = '';
    for (let i = 0; i < p.length; i++) s += p[i][0] + ',' + p[i][1] + ' ';
    return s;
  }

  /* diffing setAttribute — the scene is largely static frame-to-frame (the
     board is scroll-invariant), so skipping identical writes turns most of
     the per-frame work into no-ops instead of style invalidations. */
  function setA(el, n, v) {
    const c = el.__a || (el.__a = {});
    if (c[n] === v) return;
    c[n] = v;
    el.setAttribute(n, v);
  }

  /* stroke(p, style, a, w, glow) — polyline + optional additive glow twin */
  function stroke(p, style, a, w, glow, cap) {
    if (p.length < 2 || a <= 0.005) return;
    const it = take('poly', () => {
      const root = mk('g');
      const gl = mk('polyline');
      const main = mk('polyline');
      [gl, main].forEach(el => {
        el.setAttribute('fill', 'none');
        el.setAttribute('stroke-linejoin', 'round');
      });
      gl.style.mixBlendMode = 'plus-lighter';
      root.appendChild(gl); root.appendChild(main);
      return { root, gl, main, layer: 'poly' };
    });
    const str = ptsStr(p);
    setA(it.main, 'points', str);
    setA(it.main, 'stroke', rgba(style, a));
    setA(it.main, 'stroke-width', w);
    setA(it.main, 'stroke-linecap', cap || 'round');
    if (glow) {
      if (it.glOn !== true) { it.glOn = true; it.gl.style.display = ''; }
      setA(it.gl, 'points', str);
      setA(it.gl, 'stroke', rgba(style, a * 0.22));
      setA(it.gl, 'stroke-width', w * 4);
      setA(it.gl, 'stroke-linecap', 'round');
    } else if (it.glOn !== false) {
      it.glOn = false;
      it.gl.style.display = 'none';
    }
  }

  /* glowDot(x, y, r, rgb, a) — radial halo + solid core */
  function glowDot(x, y, r, rgb, a) {
    if (a <= 0.005) return;
    const it = take('dot', () => {
      const root = mk('g');
      const halo = mk('circle');
      const core = mk('circle');
      halo.style.mixBlendMode = 'plus-lighter';
      root.appendChild(halo); root.appendChild(core);
      return { root, halo, core, layer: 'dot' };
    });
    setA(it.halo, 'cx', x); setA(it.halo, 'cy', y);
    setA(it.halo, 'r', r * 4);
    setA(it.halo, 'fill', 'url(#' + radialFor(rgb) + ')');
    setA(it.halo, 'fill-opacity', a * 0.6);
    setA(it.core, 'cx', x); setA(it.core, 'cy', y);
    setA(it.core, 'r', r);
    setA(it.core, 'fill', rgba(rgb, Math.min(1, a)));
  }

  /* filled circle (solder dots, via centers) */
  function fillCircle(x, y, r, rgb, a) {
    if (a <= 0.005) return;
    const it = take('circle', () => {
      const root = mk('circle');
      return { root, layer: 'circle' };
    });
    setA(it.root, 'cx', x); setA(it.root, 'cy', y);
    setA(it.root, 'r', r);
    setA(it.root, 'fill', rgba(rgb, a));
  }

  /* stroked circle (via rings, terminals) */
  function ringCircle(x, y, r, rgb, a, w) {
    if (a <= 0.005) return;
    const it = take('ring', () => {
      const root = mk('circle');
      root.setAttribute('fill', 'none');
      return { root, layer: 'ring' };
    });
    setA(it.root, 'cx', x); setA(it.root, 'cy', y);
    setA(it.root, 'r', r);
    setA(it.root, 'stroke', rgba(rgb, a));
    setA(it.root, 'stroke-width', w);
  }

  /* line with a linear alpha fade (rail energize, packet trails, comet) */
  function fadeLine(x1, y1, x2, y2, rgb1, a1, rgb2, a2, w) {
    if (a1 <= 0.005 && a2 <= 0.005) return;
    const it = take('line', () => {
      const id = 'cvsg-l' + (++gradSeq);
      const grad = mk('linearGradient');
      grad.setAttribute('id', id);
      grad.setAttribute('gradientUnits', 'userSpaceOnUse');
      const s0 = mk('stop'); s0.setAttribute('offset', '0');
      const s1 = mk('stop'); s1.setAttribute('offset', '1');
      grad.appendChild(s0); grad.appendChild(s1);
      defs.appendChild(grad);
      const root = mk('line');
      root.setAttribute('fill', 'none');
      root.setAttribute('stroke', 'url(#' + id + ')');
      root.setAttribute('stroke-linecap', 'round');
      return { root, grad, s0, s1, layer: 'line' };
    });
    setA(it.grad, 'x1', x1); setA(it.grad, 'y1', y1);
    setA(it.grad, 'x2', x2); setA(it.grad, 'y2', y2);
    setA(it.s0, 'stop-color', 'rgb(' + rgb1 + ')');
    setA(it.s0, 'stop-opacity', a1);
    setA(it.s1, 'stop-color', 'rgb(' + rgb2 + ')');
    setA(it.s1, 'stop-opacity', a2);
    setA(it.root, 'x1', x1); setA(it.root, 'y1', y1);
    setA(it.root, 'x2', x2); setA(it.root, 'y2', y2);
    setA(it.root, 'stroke-width', w);
  }

  /* rotated square (rail junction diamonds) */
  function diamond(x, y, hs, rgb, a) {
    if (a <= 0.005) return;
    const it = take('rect', () => {
      const root = mk('rect');
      return { root, layer: 'rect' };
    });
    setA(it.root, 'x', -hs); setA(it.root, 'y', -hs);
    setA(it.root, 'width', hs * 2); setA(it.root, 'height', hs * 2);
    setA(it.root, 'rx', 0);
    setA(it.root, 'fill', rgba(rgb, a));
    setA(it.root, 'stroke', 'none');
    setA(it.root, 'transform', 'translate(' + x + ',' + y + ') rotate(45)');
  }

  /* stroked rounded rect (die, ring pulses) */
  function rrect(x, y, w, h, rx, rgb, a, lw) {
    if (a <= 0.005) return;
    const it = take('rrect', () => {
      const root = mk('rect');
      root.setAttribute('fill', 'none');
      return { root, layer: 'rect' };
    });
    setA(it.root, 'x', x); setA(it.root, 'y', y);
    setA(it.root, 'width', w); setA(it.root, 'height', h);
    setA(it.root, 'rx', rx);
    setA(it.root, 'stroke', rgba(rgb, a));
    setA(it.root, 'stroke-width', lw);
  }

  /* soft radial patch (cursor aura) */
  function aura(x, y, r, rgb, a) {
    if (a <= 0.005) return;
    const it = take('aura', () => {
      const root = mk('circle');
      return { root, layer: 'aura' };
    });
    setA(it.root, 'cx', x); setA(it.root, 'cy', y);
    setA(it.root, 'r', r);
    setA(it.root, 'fill', 'url(#' + radialFor(rgb) + ')');
    setA(it.root, 'fill-opacity', a);
  }

  /* ---------- static rail (built once per layout, scrolls natively) ---------- */
  let railBuiltKey = '';
  function buildRail(railX) {
    const key = railX + '|' + docH + '|' + PURPLE + '|' + LILAC;
    if (key === railBuiltKey) return;
    railBuiltKey = key;
    layers.rail.textContent = '';
    const id = 'cvsg-rail' + (++gradSeq);
    const grad = mk('linearGradient');
    grad.setAttribute('id', id);
    grad.setAttribute('gradientUnits', 'userSpaceOnUse');
    grad.setAttribute('x1', railX); grad.setAttribute('y1', 0);
    grad.setAttribute('x2', railX); grad.setAttribute('y2', docH);
    const stops = [
      [0,    'rgb(' + PURPLE + ')', 0.05],
      [0.06, 'rgb(' + PURPLE + ')', 0.32],
      [0.5,  'rgb(' + LILAC + ')',  0.32],
      [0.94, 'rgb(' + PURPLE + ')', 0.32],
      [1,    'rgb(' + PURPLE + ')', 0.05],
    ];
    stops.forEach(([off, col, op]) => {
      const s = mk('stop');
      s.setAttribute('offset', off);
      s.setAttribute('stop-color', col);
      s.setAttribute('stop-opacity', op);
      grad.appendChild(s);
    });
    defs.appendChild(grad);

    const railLine = mk('line');
    railLine.setAttribute('x1', railX); railLine.setAttribute('y1', 0);
    railLine.setAttribute('x2', railX); railLine.setAttribute('y2', docH);
    railLine.setAttribute('stroke', 'url(#' + id + ')');
    railLine.setAttribute('stroke-width', 2);
    layers.rail.appendChild(railLine);

    let d = '';
    for (let y = 30; y < docH; y += 120) {
      d += 'M' + (railX + 2) + ' ' + y + ' a2 2 0 1 0 -4 0 a2 2 0 1 0 4 0 ';
    }
    const railDotsPath = mk('path');
    railDotsPath.setAttribute('d', d);
    railDotsPath.setAttribute('fill', rgba(PURPLE, 0.3));
    layers.rail.appendChild(railDotsPath);
  }

  /* ---------- polyline helpers ---------- */
  function polyLen(p) {
    let L = 0;
    for (let i = 0; i < p.length - 1; i++) L += Math.hypot(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]);
    return L;
  }
  function polyAt(p, t) {
    let tgt = clamp(t, 0, 1) * polyLen(p);
    for (let i = 0; i < p.length - 1; i++) {
      const d = Math.hypot(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]);
      if (tgt <= d || i === p.length - 2) {
        const f = d ? clamp(tgt / d, 0, 1) : 0;
        return [p[i][0] + (p[i + 1][0] - p[i][0]) * f, p[i][1] + (p[i + 1][1] - p[i][1]) * f];
      }
      tgt -= d;
    }
    return p[p.length - 1];
  }
  function partialPoly(p, frac) {
    if (frac >= 1) return p;
    if (frac <= 0) return [p[0]];
    let tgt = frac * polyLen(p);
    const out = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const d = Math.hypot(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]);
      if (tgt <= d) {
        const f = d ? tgt / d : 0;
        out.push([p[i][0] + (p[i + 1][0] - p[i][0]) * f, p[i][1] + (p[i + 1][1] - p[i][1]) * f]);
        return out;
      }
      out.push(p[i + 1]); tgt -= d;
    }
    return out;
  }

  /* rounded-rect as a polyline, starting at right-edge midpoint, clockwise */
  function chipOutlinePts(cx, cy, s, r) {
    const pts = [];
    const seg = (x0, y0, x1, y1) => pts.push([x0, y0], [x1, y1]);
    const arc = (ax, ay, a0, a1) => {
      for (let i = 0; i <= 6; i++) {
        const t = a0 + (a1 - a0) * (i / 6);
        pts.push([ax + Math.cos(t) * r, ay + Math.sin(t) * r]);
      }
    };
    pts.push([cx + s, cy]);
    seg(cx + s, cy, cx + s, cy + s - r);
    arc(cx + s - r, cy + s - r, 0, Math.PI / 2);
    seg(cx + s - r, cy + s, cx - s + r, cy + s);
    arc(cx - s + r, cy + s - r, Math.PI / 2, Math.PI);
    seg(cx - s, cy + s - r, cx - s, cy - s + r);
    arc(cx - s + r, cy - s + r, Math.PI, Math.PI * 1.5);
    seg(cx - s + r, cy - s, cx + s - r, cy - s);
    arc(cx + s - r, cy - s + r, Math.PI * 1.5, Math.PI * 2);
    seg(cx + s, cy - s + r, cx + s, cy);
    return pts;
  }

  function hash01(n) { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); }
  const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
  const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

  /* ---------- geometry (document space — scroll-invariant) ---------- */
  let geomCache = null, geomDirty = true, frameTick = 0;
  let pendW = 0, pendH = 0;
  function computeGeom() {
    const colEl = document.querySelector('#skills');
    if (!colEl) return null;
    const sy = window.scrollY;
    const cr = colEl.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const padR = Math.min(cr.right, vw - 30);
    const railX = Math.min(vw - 16, padR + 46);
    const nodes = SECTIONS.map((sel, i) => {
      const head = document.querySelector(sel + ' .section-header');
      const el = head || document.querySelector(sel);
      const r = el.getBoundingClientRect();
      // anchor the trace to the optical center of the rendered liquid glyphs,
      // not the flex-row center (descenders + viewBox padding bias it low)
      let cy = head ? r.top + r.height / 2 : r.top + 34;
      if (head) {
        const gl = head.querySelector('.liquid-title g');
        if (gl) {
          try {
            const gb = gl.getBoundingClientRect();
            if (gb.height > 4) cy = gb.top + gb.height / 2;
          } catch (e) {}
        }
      }
      // Projects (#work) reads optically high against its lower-case title —
      // nudge only the circuit/node down 10px so it looks centered (the header
      // body itself is untouched).
      const yOffset = sel === '#work' ? 10 : (sel === '#experience' ? 10 : (sel === '#education' ? 10 : (sel === '#contact' ? 5 : 0)));
      const y = cy + sy + yOffset;   // doc coords
      let tx0 = null, tx1 = null;
      if (head) {
        const tr = head.querySelector('.node-trace');
        if (tr) {
          const tb = tr.getBoundingClientRect();
          if (tb.width > 70) { tx0 = tb.left; tx1 = tb.right; }
        }
      }
      return { i, label: String(i + 1).padStart(2, '0'), y, tx0, tx1, head };
    });
    const heroEl = document.querySelector('[data-cnode="core"]');
    let hero = null;
    if (heroEl) {
      const hr = heroEl.getBoundingClientRect();
      hero = { left: hr.left, right: hr.right, y: hr.top + hr.height / 2 + sy, top: hr.top + sy, bottom: hr.bottom + sy };
    }
    // x of the meta-circuit's right-end terminal ring (its center is at
    // term.x = W - 9.5 in canvas-local space, which spans the element width,
    // so page-x = element.right - 9.5). The hero chip locks its centre to this.
    const metaEl = document.querySelector('.meta-circuit');
    let metaTermX = null;
    if (metaEl) {
      const mr = metaEl.getBoundingClientRect();
      if (mr.width > 60) metaTermX = mr.right - 9.5;
    }
    return { vw, padR, railX, nodes, hero, metaTermX, enabled: vw > 560 };
  }
  function geom() {
    if (!geomDirty && geomCache) return geomCache;
    const g = computeGeom();
    if (g) { geomCache = g; geomDirty = false; }
    return g;
  }

  /* ---------- state ---------- */
  const st = {
    // tcx/tcy: raw client coords; mx/my: eased DOCUMENT coords
    tcx: -9999, tcy: -9999, mx: -9999, my: -9999,
    lastY: window.scrollY, energy: 0, alpha: 0, last: 0,
    bootStart: -1, bootDone: false, idleStart: -1,
    coreLit: false, coreProgress: 0,
    hoverP: 0, rippleStart: -1, wasHover: false,
    bumpT0: -1, rippleT0: -1, ripplePh: 0,
    packets: [],
    nextPacketAt: 0,
    nodeExt: {},
    activeNode: -1, nodeAnchor: {}, nodePhase: {}, nodeDHead: {},
    pulseBusy: false,
  };
  let rafId = 0, gen = 0, lastDrawTs = 0;

  function dist(x, y) {
    if (st.mx < -9000) return 99999;
    return Math.hypot(x - st.mx, y - st.my);
  }

  /* per-node jog geometry — the run from the rail to the connector pad */
  function nodePath(i, railX, y, padX) {
    const jog = [9, -12, 10, -11, -14][i % 5];
    if (padX == null) {
      const L = 104 + hash01(i * 7.13 + 1) * 48;
      if (!jog) return { pts: [[railX - 3, y], [railX - L, y]], endY: y };
      const e1 = 30 + hash01(i * 3.7 + 2) * 26;
      return {
        pts: [
          [railX - 3, y],
          [railX - e1, y],
          [railX - e1 - Math.abs(jog), y + jog],
          [railX - L, y + jog],
        ],
        endY: y + jog,
      };
    }
    // ── the rail→pad connector: a bespoke route per section ──
    // The signal leaves the vertical rail on the right and threads left into
    // the section's connector pad. Each of the five reads differently — a
    // different dogleg silhouette — while all share the 45° chamfer + solder
    // vocabulary of the rest of the board. Straight-line fallback if cramped.
    const R = railX - 3;
    const span = R - padX;
    if (span < 60) return { pts: [[R, y], [padX, y]], endY: y };
    const V = i % 5;
    // anchor x's: xA leaves the rail, xB arrives at the pad
    const xA = R - (26 + hash01(i * 3.7 + 2) * 10);
    const xB = padX + (20 + hash01(i * 5.1 + 3) * 8);
    if (xB >= xA - 14) return { pts: [[R, y], [padX, y]], endY: y };

    // All routes are straight or a single clean 45° dogleg — no wiggles.
    if (V === 0) {
      // skills — straight run into the keyed port
      return { pts: [[R, y], [padX, y]], endY: y };
    }
    if (V === 1) {
      // experience — shallow shelf lifted above the line
      const j = 6;
      return { pts: [
        [R, y], [xA, y], [xA - j, y - j], [xB + j, y - j], [xB, y], [padX, y],
      ], endY: y };
    }
    if (V === 2) {
      // projects — deep dogleg dropping below, a decisive bend
      const j = 12;
      return { pts: [
        [R, y], [xA, y], [xA - j, y + j], [xB + j, y + j], [xB, y], [padX, y],
      ], endY: y };
    }
    if (V === 3) {
      // education — shallow shelf beneath the line
      const j = 6;
      return { pts: [
        [R, y], [xA, y], [xA - j, y + j], [xB + j, y + j], [xB, y], [padX, y],
      ], endY: y };
    }
    // V === 4 — contact — deep shelf lifted above the line
    const j = 12;
    return { pts: [
      [R, y], [xA, y], [xA - j, y - j], [xB + j, y - j], [xB, y], [padX, y],
    ], endY: y };
  }

  /* ── section-header nets ──
     The whole net per header lives here: solder junction beside the title,
     the bus with width-ticks and a stub via, the connector pad, the jog to
     the rail, and the rail junction diamond. Skeleton is always drawn (no
     load animation); scroll/hover only modulate brightness, and one packet
     per cycle rides the FULL run rail → pad → solder on the shared clock,
     landing with a flash + expanding ring (meta-circuit vocabulary). */
  const PAD_RO = 6, PAD_RI = 3.4, SOLDER_R = 4.5;
  const NODE_CYCLE_MS = 3000, NODE_TRAVEL = 0.62;

  /* ── connector terminals: one bespoke pad silhouette per section ──
     Each sits at the pad point (px,py) where the bus and the rail jog meet.
     They stay inside a ~PAD_RO envelope and reuse the board's primitives so
     the family still reads as one board, but each has its own shape signature:
       0 skills      → four-way keyed port: double ring + N/S/E/W stubs
       1 experience  → hex land pad + center via
       2 projects    → chamfered square SMD land + die dot (echoes the chip)
       3 education    → land ring flanked by two satellite vias (a triad)
       4 contact      → bullseye: three concentric rings, a signal target */
  function drawTerminal(v, px, py, col, act, lineA, glow, now, isA) {
    const a1 = 0.5 + 0.45 * act, a2 = 0.22 + 0.3 * act, tA = lineA * 0.8;
    if (v === 0) {
      ringCircle(px, py, PAD_RO, col, a2, 1.2);
      ringCircle(px, py, PAD_RI, col, a1, 1.3);
      fillCircle(px, py, 1.2, col, 0.5 + 0.4 * act);
      [[0, -1], [0, 1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
        stroke([[px + dx * (PAD_RO + 1), py + dy * (PAD_RO + 1)],
                [px + dx * (PAD_RO + 4), py + dy * (PAD_RO + 4)]], col, tA, 1, false, 'butt');
      });
    } else if (v === 1) {
      // hexagon land pad
      const hp = [];
      for (let k = 0; k < 6; k++) {
        const ang = Math.PI / 6 + k * Math.PI / 3;
        hp.push([px + Math.cos(ang) * (PAD_RO + 0.5), py + Math.sin(ang) * (PAD_RO + 0.5)]);
      }
      hp.push(hp[0]);
      stroke(hp, col, 0.32 + 0.4 * act, 1.2, glow);
      ringCircle(px, py, PAD_RI - 0.4, col, a1, 1.3);
      fillCircle(px, py, 1.3, col, 0.5 + 0.4 * act);
    } else if (v === 2) {
      // chamfered square SMD land (pin-1 chamfer top-left), matching the title chip
      const h = PAD_RO - 0.4, c = 2.6;
      stroke([
        [px - h + c, py - h], [px + h, py - h], [px + h, py + h],
        [px - h, py + h], [px - h, py - h + c], [px - h + c, py - h],
      ], col, 0.34 + 0.42 * act, 1.3, glow);
      fillCircle(px, py, 1.6, col, 0.55 + 0.4 * act);
      // two keying ticks off the right edge
      stroke([[px + h, py - 2.4], [px + h + 3, py - 2.4]], col, tA, 1, false, 'butt');
      stroke([[px + h, py + 2.4], [px + h + 3, py + 2.4]], col, tA, 1, false, 'butt');
    } else if (v === 3) {
      // land ring with two satellite vias above and below (a triad)
      ringCircle(px, py, PAD_RI + 0.3, col, a1, 1.3);
      fillCircle(px, py, 1.3, col, 0.5 + 0.4 * act);
      [-1, 1].forEach(d => {
        const sy2 = py + d * (PAD_RO + 3);
        stroke([[px, py + d * (PAD_RI + 0.6)], [px, sy2 - d * 2]], col, tA, 1, false, 'butt');
        ringCircle(px, sy2, 2, col, 0.3 + 0.35 * act, 1);
        fillCircle(px, sy2, 0.9, col, 0.5 + 0.3 * act);
      });
    } else {
      // bullseye: three concentric rings, a signal target
      ringCircle(px, py, PAD_RO + 1.5, col, 0.18 + 0.26 * act, 1);
      ringCircle(px, py, PAD_RO - 1, col, a2 + 0.06, 1.2);
      ringCircle(px, py, PAD_RI - 0.8, col, a1, 1.3);
      fillCircle(px, py, 1.1, col, 0.55 + 0.4 * act);
    }
  }

  function drawNodes(g, railX, dt, now, sy, vh) {
    st.pulseBusy = false;   // raised below whenever a packet is mid-travel
    // focused node: nearest header to the 40% viewport line — but only if it's
    // genuinely in the focus band. Outside it, NOTHING is focused (active = -1),
    // so both the pulse and the title's lit state switch off in sync.
    let active = -1, best = 1e9;
    const FOCUS_BAND = vh * 0.5;
    g.nodes.forEach(n => {
      const d = Math.abs((n.y - sy) - vh * 0.4);
      if (d < best) { best = d; active = n.i; }
    });
    if (best > FOCUS_BAND) active = -1;

    // when focus changes, move the lit class and re-anchor the packet clock so
    // the pulse departs the instant a header lights (and stops when none is)
    if (active !== st.activeNode) {
      const prev = g.nodes[st.activeNode];
      if (prev && prev.head) prev.head.classList.remove('is-focused');
      st.activeNode = active;
      const cur = g.nodes[active];
      if (cur && cur.head) cur.head.classList.add('is-focused');
      if (st.bootDone && active >= 0) st.nodeAnchor[active] = now;
    }

    for (const n of g.nodes) {
      const vy = n.y - sy;
      if (vy < -40 || vy > vh + 40) continue;

      const y = n.y;
      const isA = n.i === active && st.bootDone;
      const isOpen = !n.head || n.head.classList.contains('is-open');

      // cursor inside the header band wakes the net (chip-hover behavior)
      const near = st.bootDone && st.mx > -9000 &&
        st.my > y - 46 && st.my < y + 46 &&
        (n.tx0 == null ? dist(railX, y) < 110
                       : (st.mx > n.tx0 - 240 && st.mx < railX + 60));

      const tgt = isA ? 1 : (near ? 0.8 : 0);
      const cur = st.nodeExt[n.i] || 0;
      const nx = cur + (tgt - cur) * (tgt > cur ? 0.1 : 0.05) * dt;
      st.nodeExt[n.i] = (tgt === 0 && nx < 0.004) ? 0 : nx;
      const act = smooth(st.nodeExt[n.i]);           // 0 dormant → 1 lit

      const col = act > 0.35 ? LILAC : PURPLE;
      const lineA = 0.3 + 0.38 * act;
      const glow = act > 0.55;

      const hasTrace = n.tx0 != null;
      const padX = hasTrace ? n.tx1 - 9 : null;
      const { pts, endY } = nodePath(n.i, railX, y, padX);

      // rail junction diamond
      const dsz = 2.6 + (isA ? 0.4 * (0.5 + 0.5 * Math.sin(now / 500 + n.i)) : 0) * act;
      diamond(railX, y, dsz, col, 0.34 + 0.55 * act);

      // rail energizes vertically around the junction
      if (act > 0.02) {
        const half = 18 * act;
        fadeLine(railX, y, railX, y - half, LILAC, 0.65 * act, LILAC, 0, 2);
        fadeLine(railX, y, railX, y + half, LILAC, 0.65 * act, LILAC, 0, 2);
      }

      // jog run rail → pad, trimmed at the pad ring so line and ring meet flush
      let jogDraw = pts;
      if (hasTrace) {
        jogDraw = pts.slice(0, -1);
        jogDraw.push([padX + PAD_RO, y]);
      }
      stroke(jogDraw, col, lineA, 1.5, glow);

      // solder dots on the jog elbows
      if (pts.length > 4) {
        fillCircle(pts[2][0], pts[2][1], 1.5, col, 0.5 + 0.3 * act);
        fillCircle(pts[3][0], pts[3][1], 1.5, col, 0.5 + 0.3 * act);
      }

      if (!hasTrace) {
        // no measurable header trace — terminate in a ring pad at the stub end
        const end = pts[pts.length - 1];
        ringCircle(end[0] - 4, endY, 4, col, 0.4 + 0.4 * act, 1.2);
        fillCircle(end[0] - 4, endY, 1.6, TINT_TAIL, 0.4 + 0.5 * act);
        continue;
      }

      const sx = n.tx0 + 6;                          // component footprint beside the title
      const CH_H = 5.5, CH_C = 3;                     // half-size, chamfer
      const bx0 = sx + CH_H, bx1 = padX - PAD_RO;     // bus endpoints, flush at pad ring
      const busL = bx1 - bx0;

      /* ── title-side terminal: chamfered SMD footprint (meta-chip family) ──
         chamfered pin-1 corner top-left, breathing die core, twin pins with
         test-point dots escaping left, one stub pin dropping off the bottom */
      stroke([
        [sx - CH_H + CH_C, y - CH_H],
        [sx + CH_H, y - CH_H],
        [sx + CH_H, y + CH_H],
        [sx - CH_H, y + CH_H],
        [sx - CH_H, y - CH_H + CH_C],
        [sx - CH_H + CH_C, y - CH_H],
      ], col, 0.4 + 0.45 * act, 1.3, glow);
      fillCircle(sx, y, 2, col, 0.6 + 0.35 * act);    // die core
      // left pins → test points
      stroke([[sx - CH_H, y - 3.2], [sx - CH_H - 3.6, y - 3.2]], col, lineA * 0.75, 1, false, 'butt');
      stroke([[sx - CH_H, y + 3.2], [sx - CH_H - 3.6, y + 3.2]], col, lineA * 0.75, 1, false, 'butt');
      fillCircle(sx - CH_H - 4.9, y - 3.2, 1.2, col, 0.5 + 0.3 * act);
      fillCircle(sx - CH_H - 4.9, y + 3.2, 1.2, col, 0.5 + 0.3 * act);
      // bottom stub pin
      stroke([[sx + 2.6, y + CH_H], [sx + 2.6, y + CH_H + 3.4]], col, lineA * 0.7, 1, false, 'butt');

      /* ── connector pad (rail side): a distinct terminal silhouette per section,
         all built from the board's ring / diamond / chamfer / tick vocabulary ── */
      drawTerminal(n.i % 5, padX, y, col, act, lineA, glow, now, isA);

      // active node: scanner arc orbits the pad (hero chip's hover scanner, miniaturized)
      if (isA && act > 0.3 && !REDUCED_MOTION) {
        const headA = ((now / 1000 * 0.22) % 1) * Math.PI * 2;
        const rr = PAD_RO + 2.5;
        for (let k = 1; k <= 8; k++) {
          const a0 = headA - k * 0.11, a1 = headA - (k - 1) * 0.11;
          stroke([[padX + Math.cos(a0) * rr, y + Math.sin(a0) * rr],
                  [padX + Math.cos(a1) * rr, y + Math.sin(a1) * rr]],
            TINT_TAIL, (1 - k / 9) * 0.7 * act, 1.4, false);
        }
      }

      /* ── the bus: every node routes differently ── */
      const HEXA = ['0x1A', '0x3E', '0x2C', '0x50', '0x62'];
      const wide = busL > 150;
      const variant = wide ? n.i % 5 : -1;
      let busPts = [[bx0, y], [bx1, y]];
      const sparks = [];                  // features that blink as the packet passes

      if (variant === 1) {
        // the bus itself jogs up through 45° chamfers, meta-separator style
        const xA = bx0 + busL * 0.34, xB = bx0 + busL * 0.6, j = 7;
        busPts = [[bx0, y], [xA, y], [xA + j, y - j], [xB - j, y - j], [xB, y], [bx1, y]];
        fillCircle(xA, y, 1.4, col, 0.5 + 0.3 * act);
        fillCircle(xB, y, 1.4, col, 0.5 + 0.3 * act);
      }

      if (variant === 2) {
        // inline component footprint breaks the bus (leads land flush on its body)
        const xC = bx0 + busL * 0.42;
        stroke([[bx0, y], [xC - 8, y]], col, lineA, 1.5, glow, 'butt');
        stroke([[xC + 8, y], [bx1, y]], col, lineA, 1.5, glow, 'butt');
        rrect(xC - 8, y - 4, 16, 8, 2, col, 0.45 + 0.4 * act, 1.1);
        stroke([[xC - 3, y - 4], [xC - 3, y + 4]], col, lineA * 0.7, 1, false, 'butt');
        sparks.push([xC, y]);
      } else {
        stroke(busPts, col, lineA, 1.5, glow, 'butt');
      }

      if (variant === 0) {
        // differential pair: companion trace splits off, runs parallel, rejoins
        const xA = bx0 + busL * 0.3, xB = bx0 + busL * 0.58, j = 5;
        stroke([[xA, y], [xA + j, y - j], [xB - j, y - j], [xB, y]], col, lineA * 0.8, 1.2, false);
        fillCircle(xA, y, 1.4, col, 0.5 + 0.3 * act);
        fillCircle(xB, y, 1.4, col, 0.5 + 0.3 * act);
      }

      if (variant === 3) {
        // twin test points hanging off the bus
        [0.36, 0.46].forEach(f => {
          const tx = bx0 + busL * f;
          stroke([[tx, y], [tx, y + 6]], col, lineA * 0.8, 1, false, 'butt');
          fillCircle(tx, y + 7.4, 1.3, col, 0.5 + 0.3 * act);
          sparks.push([tx, y + 7.4]);
        });
      }

      if (variant === 4) {
        // double via escape: annular-ring vias punch out both sides of the bus
        [[0.3, -1], [0.58, 1]].forEach(([f, d]) => {
          const vx = bx0 + busL * f, vy2 = y + d * 10;
          stroke([[vx, y], [vx, vy2]], col, lineA * 0.8, 1.2, false, 'butt');
          fillCircle(vx, vy2, 1.5, col, 0.5 + 0.3 * act);
          ringCircle(vx, vy2, 3.2, col, 0.3 + 0.3 * act, 1);
          sparks.push([vx, vy2]);
        });
      }

      if (wide) {
        // bus-width tick pair near the solder end
        const tX = bx0 + busL * (0.14 + hash01(n.i * 4.3) * 0.06);
        stroke([[tX - 2.5, y - 3.5], [tX - 2.5, y + 3.5]], col, lineA * 0.85, 1, false, 'butt');
        stroke([[tX + 2.5, y - 3.5], [tX + 2.5, y + 3.5]], col, lineA * 0.85, 1, false, 'butt');

        // stub via near the pad end (variants whose mid-bus is otherwise clear)
        if (variant <= 2) {
          const vx = bx0 + busL * (0.72 + hash01(n.i * 2.3 + 1.1) * 0.1);
          const vdir = hash01(n.i * 5.9 + 0.4) > 0.5 ? 1 : -1;
          const vyy = y + vdir * 10;
          stroke([[vx, y], [vx, vyy]], col, lineA * 0.8, 1.2, false, 'butt');
          fillCircle(vx, vyy, 1.5, col, 0.45 + 0.3 * act);
          sparks.push([vx, vyy]);
        }

        // net label removed — hex clutter dropped
      }

      // pad core breathes like the chip core when lit
      const blink = isA ? 0.8 + 0.2 * Math.sin(now / 600 + n.i * 2) : 1;
      glowDot(padX, y, 1.4, TINT_TAIL, (0.25 + 0.5 * act) * blink);

      // ── the packet: only while this node is focused (active) ──
      if (st.bootDone && isA && isOpen && !REDUCED_MOTION) {
        const full = pts.concat(busPts.slice().reverse());
        const D = polyLen(full);
        // hero-metadata packet clock: travel time scales with path length at the
        // hero's ~0.55px/ms cruise, clamped to the same 700–1800ms window, then a
        // quiet gap — so the pulse rides the run at the exact hero speed/cadence.
        const travelDur = clamp(D / 0.55, 700, 1800);
        const cycleDur = travelDur + 2600;
        if (st.nodeAnchor[n.i] == null) st.nodeAnchor[n.i] = now - n.i * 1370;
        const tcyc = (((now - st.nodeAnchor[n.i]) % cycleDur) + cycleDur) % cycleDur;

        // one-shot: the frame the packet lands on the footprint fires the
        // right→left shimmer sweep across the glass title
        const prevTc = st.nodePhase[n.i];
        st.nodePhase[n.i] = tcyc;
        if (n.head && prevTc != null && prevTc < travelDur && tcyc >= travelDur) {
          n.head.classList.remove('shimmer');
          void n.head.offsetWidth;              // restart the CSS animation
          n.head.classList.add('shimmer');
        }
        const amp = 0.45 + 0.55 * act;

        if (tcyc < travelDur) {
          st.pulseBusy = true;   // packet in flight → run this net at full rate
          const t = tcyc / travelDur;
          const dHead = smooth(t) * D;
          const env = Math.min(1, t * 10) * amp;   // hero packet ramp-in

          // departure spark on the rail junction
          const prox0 = 1 - dHead / 22;
          if (prox0 > 0) glowDot(railX, y, 1.6, TINT_TAIL, 0.6 * prox0 * env);

          // comet tail — identical to the hero meta packet: 7 fixed samples at
          // 8px spacing along the polyline, so it bends through the jog and keeps
          // the same tight motion-blur drag rather than stretching with speed
          let prev = polyAt(full, dHead / D);
          for (let k = 1; k <= 7; k++) {
            const dd = dHead - k * 8;
            if (dd < 0) break;
            const pt = polyAt(full, dd / D);
            stroke([prev, pt], k < 3 ? TINT_TAIL : LILAC,
              0.6 * Math.pow(1 - k / 8, 1.6) * env, 1.6, false);
            prev = pt;
          }
          const hd = polyAt(full, dHead / D);
          glowDot(hd[0], hd[1], 1.8, TINT_CORE, 0.95 * env);

          // pad flares as the packet lands on it mid-run
          const dPad = polyLen(pts);
          const proxP = 1 - Math.abs(dHead - dPad) / 18;
          if (proxP > 0) glowDot(padX, y, 1.8, TINT_TAIL, 0.7 * proxP * env);

          // every feature on the net blinks as the packet passes it
          for (const f of sparks) {
            const pr = 1 - Math.hypot(hd[0] - f[0], hd[1] - f[1]) / 15;
            if (pr > 0) glowDot(f[0], f[1], 1.3, TINT_TAIL, 0.55 * pr * env);
          }
        } else {
          // arrival: die-core flash + expanding ring off the footprint,
          // and the left test points answer with a twinkle
          const ft = tcyc - travelDur;   // ms since arrival
          const flash = Math.exp(-ft / 300);
          if (flash > 0.02) {
            glowDot(sx, y, 2.2, TINT_CORE, flash * amp);
            glowDot(sx - CH_H - 4.9, y - 3.2, 1.1, TINT_TAIL, flash * amp * 0.5);
            glowDot(sx - CH_H - 4.9, y + 3.2, 1.1, TINT_TAIL, flash * amp * 0.5);
          }
          const rt = ft / 620;
          if (rt < 1) ringCircle(sx, y, CH_H + 2 + easeOut3(rt) * 9, TINT_TAIL, 0.5 * (1 - rt) * amp, 1);
        }
      }
    }
    return active;
  }

  /* ---------- chip scene ---------- */
  function chipBranches(cx, cy, s, g, railX) {
    return [
      [[cx + s, cy], [railX, cy]],
      [[cx - s, cy], [g.hero ? g.hero.right + 26 : cx - s - 120, cy]],
      [[cx, cy - s], [cx, cy - 80], [cx - 104, cy - 80]],
      [[cx, cy + s], [cx, cy + 74], [cx + 86, cy + 74]],
      [[cx + s, cy - 15], [cx + s + 26, cy - 41], [cx + s + 74, cy - 41]],
    ];
  }
  function pinSeg(i, cx, cy, s) {
    const k = (i % 5) - 2, side = Math.floor(i / 5);
    if (side === 0) return [[cx - s - 7, cy + k * 7.5], [cx - s, cy + k * 7.5]];
    if (side === 1) return [[cx + s, cy + k * 7.5], [cx + s + 7, cy + k * 7.5]];
    if (side === 2) return [[cx + k * 7.5, cy - s - 7], [cx + k * 7.5, cy - s]];
    return [[cx + k * 7.5, cy + s], [cx + k * 7.5, cy + s + 7]];
  }
  function pinPhase(i, cx, cy, s) {
    const seg = pinSeg(i, cx, cy, s);
    const ang = Math.atan2(seg[0][1] - cy, seg[0][0] - cx);
    return ((ang + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2);
  }

  function via(x, y, a) {
    fillCircle(x, y, 2.2, LILAC, 0.9 * a + 0.15);
    ringCircle(x, y, 4.5, LILAC, 0.5 * a + 0.1, 1);
  }

  function drawPins(cx, cy, s, alphaFn, col, glow) {
    for (let i = 0; i < 20; i++) {
      const a = alphaFn(i);
      if (a <= 0.01) continue;
      stroke(pinSeg(i, cx, cy, s), col, a, 1.3, glow, 'butt');
    }
  }

  function drawDie(cx, cy, s, scale, a, col) {
    if (a <= 0.01 || scale <= 0.02) return;
    const d = (s - 7) * scale;
    rrect(cx - d, cy - d, d * 2, d * 2, 4, col, a, 1);
    fillCircle(cx - d + 6, cy - d + 6, 1.6 * scale, col, a * 0.9);
  }

  function ringPulse(cx, cy, s, t, maxA) {
    const grow = easeOut3(clamp(t, 0, 1));
    const pad = 10 + grow * 46;
    const a = maxA * (1 - t) * smooth(t / 0.12);
    if (a <= 0.01) return;
    rrect(cx - s - pad, cy - s - pad, (s + pad) * 2, (s + pad) * 2, 6 + pad * 0.5, LILAC, a, 1.3);
  }

  function drawComet(x, y) {
    fadeLine(x, y, x, y + 220, TINT_TAIL, 0.92, LILAC, 0, 3);
    glowDot(x, y, 4, TINT_CORE, 1);
  }

  function drawChipScene(g, now, sy, vh) {
    const s = cfg('coreSize');
    const railX = g.railX + cfg('railOffsetX');
    // Chip centre locks to the meta-circuit's right-end terminal ring so the two
    // read as one vertical net; coreOffsetX is a fine nudge around that anchor.
    // Fallback (no measurable meta-circuit) keeps the former padR-based spot.
    const fbMax = Math.min(railX - 74, g.vw - s - 40);
    const fbMin = Math.min(g.hero.right + 70, fbMax);
    const fallbackCx = clamp(g.padR - 132, fbMin, fbMax);
    const cx = (g.metaTermX != null ? g.metaTermX : fallbackCx) + cfg('coreOffsetX');
    const cy = g.hero.y;

    const outline = chipOutlinePts(cx, cy, s, 6);
    const branches = chipBranches(cx, cy, s, g, railX);

    /* --- boot timeline --- */
    const bootMs = cfg('bootDurationMs');
    const arriveMs = bootMs * cfg('bootArriveFrac');
    const ingressMs = cfg('bootIngressMs');
    const fillMs = cfg('bootFillMs');
    const settleMs = cfg('settleMs');
    const t = now - st.bootStart;

    const arriveT = clamp(t / arriveMs, 0, 1);
    const ingressT = clamp((t - arriveMs) / ingressMs, 0, 1);
    const fillT = clamp((t - arriveMs - ingressMs) / fillMs, 0, 1);
    const settleT = clamp((t - arriveMs - ingressMs - fillMs - cfg('bootHoldMs')) / settleMs, 0, 1);

    if (!st.bootDone && settleT >= 1) { st.bootDone = true; st.idleStart = now; }

    const outlineT = smooth(fillT / 0.42);
    const pinsT = clamp((fillT - 0.22) / 0.44, 0, 1);
    const dieT = smooth(clamp((fillT - 0.5) / 0.26, 0, 1));
    const dischargeT = clamp((fillT - 0.56) / 0.44, 0, 1);
    const bootLive = 1 - smooth(settleT);

    const maxReach = Math.max(railX - cx, 260) + 80;
    const frontR = easeOut3(settleT) * maxReach;
    const band = 55;
    const fadeAt = (r) => 1 - smooth(clamp((frontR - r) / band, 0, 1));

    /* --- hover --- */
    const hoverR = cfg('hoverRadius');
    const d = dist(cx, cy);
    const inChip = Math.abs(st.mx - cx) < s + 40 && Math.abs(st.my - cy) < s + 40;
    const hoverTarget = st.bootDone && (d < hoverR || inChip) ? 1 : 0;
    const ease = hoverTarget > st.hoverP ? cfg('hoverEase') : cfg('retractEase');
    st.hoverP += (hoverTarget - st.hoverP) * ease * st._dt;
    if (st.hoverP < 0.004 && hoverTarget === 0) st.hoverP = 0;
    const hp = smooth(st.hoverP);

    if (hoverTarget === 1 && !st.wasHover) {
      st.rippleStart = now;
      try { document.dispatchEvent(new CustomEvent('curie:chip-hover', { detail: { hovered: true } })); } catch (e) {}
    }
    if (hoverTarget === 0 && st.wasHover) {
      try { document.dispatchEvent(new CustomEvent('curie:chip-hover', { detail: { hovered: false } })); } catch (e) {}
    }
    st.wasHover = hoverTarget === 1;

    /* ---------- resting skeleton ---------- */
    if (st.bootDone) {
      branches.forEach(b => stroke(b, PURPLE, 0.26, 1.4, false));
      branches.forEach(b => { const e = b[b.length - 1]; via(e[0], e[1], 0.4); });
      stroke(outline, PURPLE, 0.45, 1.5, false);
      drawPins(cx, cy, s, () => 0.35, PURPLE);
      drawDie(cx, cy, s, 1, 0.3, PURPLE);
    }

    /* ---------- boot drawing ---------- */
    if (!st.bootDone) {
      // 1. comet up the rail — from the bottom of the current viewport
      if (arriveT < 1) {
        const from = sy + vh;
        const y = from - easeOut3(arriveT) * (from - cy);
        drawComet(railX, y);
        st.energy = Math.max(st.energy, 0.8);
      }
      // 2. ingress along connector
      if (t >= arriveMs && dischargeT <= 0) {
        const conn = [[railX, cy], [cx + s, cy]];
        const seg = partialPoly(conn, easeOut3(ingressT));
        stroke(seg, LILAC, 0.85, 1.8, true);
        const tip = seg[seg.length - 1];
        if (ingressT < 1) glowDot(tip[0], tip[1], 3, TINT_CORE, 0.95);
      }
      // 3. outline draws both ways from ingress point
      if (fillT > 0 && outlineT > 0) {
        const rev = outline.slice().reverse();
        const oFade = fadeAt(s * 0.9);
        const oA = 0.45 + 0.45 * oFade;
        stroke(partialPoly(outline, outlineT * 0.5), LILAC, oA, 1.7, oFade > 0.05);
        stroke(partialPoly(rev, outlineT * 0.5), LILAC, oA, 1.7, oFade > 0.05);
        if (outlineT < 1) {
          const a = polyAt(outline, outlineT * 0.5), b = polyAt(rev, outlineT * 0.5);
          glowDot(a[0], a[1], 2.2, TINT_TAIL, 0.9);
          glowDot(b[0], b[1], 2.2, TINT_TAIL, 0.9);
        }
      }
      // 4. pins ignite in symmetric sweep
      if (pinsT > 0) {
        drawPins(cx, cy, s, (i) => {
          const ph = pinPhase(i, cx, cy, s);
          const distFromStart = Math.min(ph, 1 - ph) * 2;
          const lp = clamp((pinsT - distFromStart * 0.75) / 0.25, 0, 1);
          return lp * (0.35 + 0.55 * fadeAt(s + 7));
        }, LILAC, fadeAt(s + 7) > 0.3);
      }
      // 5. die pops in with flash
      if (dieT > 0) {
        drawDie(cx, cy, s, dieT, (0.3 + 0.55 * fadeAt(s * 0.3)) * dieT, LILAC);
        const flash = clamp(dieT / 0.5, 0, 1) * clamp((1 - dieT) / 0.35, 0, 1);
        glowDot(cx, cy, 3.5, TINT_CORE, flash * 1.2);
      }
      // 6. discharge: branches fire outward; unglow pulse dims center-out
      if (dischargeT > 0) {
        branches.forEach(b => stroke(b, PURPLE, 0.26 * dischargeT, 1.4, false));
        branches.forEach(b => { const e = b[b.length - 1]; via(e[0], e[1], 0.4 * dischargeT); });
        branches.forEach((b, bi) => {
          const fOut = bi === 0 ? 1 : easeOut3(clamp(dischargeT * 1.15 - bi * 0.03, 0, 1));
          if (fOut <= 0.002) return;
          const outSeg = partialPoly(b, fOut);
          const L = polyLen(outSeg);
          const covered = clamp((frontR - s) / Math.max(L, 1), 0, 1);
          if (covered < 1) {
            const litSeg = covered <= 0 ? outSeg
              : partialPoly(outSeg.slice().reverse(), 1 - covered);
            stroke(litSeg, LILAC, 0.65, 1.6, true);
            if (covered > 0) {
              const bp = polyAt(outSeg, covered);
              glowDot(bp[0], bp[1], 2, TINT_TAIL, 0.8);
            }
            if (fOut < 1) {
              const tip = outSeg[outSeg.length - 1];
              glowDot(tip[0], tip[1], 2.4, TINT_TAIL, 0.95);
            }
          }
          if (fOut >= 1) {
            const e = b[b.length - 1];
            const viaA = fadeAt(s + L);
            if (viaA > 0.01) via(e[0], e[1], viaA);
          }
        });
        st.energy = Math.max(st.energy, dischargeT * bootLive);
      }
      // 7. burst ring when die pops
      if (dieT > 0 && dieT < 1) {
        ringPulse(cx, cy, s, dieT, 0.8);
      }
      if (dieT > 0.3) glowDot(cx, cy, 3.4 + 0.4 * fadeAt(0), TINT_TAIL, 0.8 + 0.15 * fadeAt(0));
      return;
    }

    /* ---------- idle ---------- */
    const idleT = now - st.idleStart;
    const pulseMs = cfg('idlePulseMs');
    const beat = (idleT % pulseMs) / pulseMs;
    const breathe = REDUCED_MOTION ? 0.4 : Math.pow(0.5 - 0.5 * Math.cos(beat * Math.PI * 2), 1.8);

    const bump = st.bumpT0 > 0 ? Math.exp(-(now - st.bumpT0) / 260) : 0;

    // pin ripple
    if (!REDUCED_MOTION && st.rippleT0 > 0) {
      const rp = (now - st.rippleT0) / 750;
      if (rp < 1) {
        drawPins(cx, cy, s, (i) => {
          const ph = pinPhase(i, cx, cy, s);
          let dph = Math.abs(ph - st.ripplePh); dph = Math.min(dph, 1 - dph) * 2;
          const w = rp * 1.2 - dph;
          const a = Math.max(0, 0.55 - Math.abs(w) * 3) * (1 - rp);
          return a * (1 - hp);
        }, LILAC, false);
      } else st.rippleT0 = -1;
    }

    // outline tracer
    if (!REDUCED_MOTION && hp < 0.5) {
      const slotMs = 5200, slot = Math.floor(idleT / slotMs);
      if (hash01(slot * 4.7 + 2.1) > 0.3) {
        const local = (idleT - slot * slotMs) / 1600;
        if (local >= 0 && local <= 1) {
          const start = hash01(slot * 9.3 + 0.7);
          const dir = hash01(slot * 3.9 + 5.2) > 0.5 ? 1 : -1;
          const span = 0.34;
          const head = start + dir * easeOut3(local) * span;
          const env = smooth(local / 0.15) * smooth((1 - local) / 0.2) * (1 - hp * 2);
          if (env > 0.01) {
            const TAIL = 0.09;
            for (let i = 1; i <= 10; i++) {
              const t0 = ((head - dir * TAIL * (i) / 10) % 1 + 1) % 1;
              const t1 = ((head - dir * TAIL * (i - 1) / 10) % 1 + 1) % 1;
              const a = (1 - i / 10) * 0.85 * env;
              stroke([polyAt(outline, t0), polyAt(outline, t1)], TINT_TAIL, a, 1.8, false);
            }
            const hd = polyAt(outline, ((head % 1) + 1) % 1);
            glowDot(hd[0], hd[1], 1.9, TINT_CORE, 0.9 * env);
          }
        }
      }
    }

    // via twinkles
    if (!REDUCED_MOTION && hp < 0.5) {
      const slotMs = 1700, slot = Math.floor(idleT / slotMs);
      if (hash01(slot * 8.8 + 1.3) > 0.5) {
        const local = (idleT - slot * slotMs) / 1100;
        const a = smooth(local / 0.25) * smooth((1 - local) / 0.35);
        if (a > 0.01) {
          const b = branches[Math.floor(hash01(slot * 5.1 + 3.3) * branches.length)];
          const e = b[b.length - 1];
          glowDot(e[0], e[1], 2, TINT_TAIL, 0.55 * a * (1 - hp * 2));
        }
      }
    }

    // wandering idle packets
    if (!REDUCED_MOTION) {
      if (now >= st.nextPacketAt) {
        const slot = Math.floor(now / 1000);
        const branch = 1 + Math.floor(hash01(slot * 7.3 + 1.7) * 4);
        st.packets.push({ branch, t0: now, dur: 1400 + hash01(slot * 3.1) * 900, out: hash01(slot * 5.7) > 0.4 });
        st.nextPacketAt = now + cfg('idlePacketMs') * (0.6 + hash01(slot * 2.3) * 0.9);
      }
      for (let i = st.packets.length - 1; i >= 0; i--) {
        const p = st.packets[i];
        const pt = (now - p.t0) / p.dur;
        if (pt >= 1) {
          if (!p.out) {
            st.bumpT0 = now;
            st.rippleT0 = now;
            const b0 = branches[p.branch][0];
            const ang = Math.atan2(b0[1] - cy, b0[0] - cx);
            st.ripplePh = ((ang + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2);
          }
          st.packets.splice(i, 1); continue;
        }
        const b = branches[p.branch];
        const e = easeOut3(pt);
        const headT = p.out ? e : 1 - e;
        const env = smooth(pt / 0.15) * smooth((1 - pt) / 0.2);
        const hpt = polyAt(b, headT);
        const tpt = polyAt(b, clamp(headT + (p.out ? -0.08 : 0.08), 0, 1));
        fadeLine(hpt[0], hpt[1], tpt[0], tpt[1], TINT_TAIL, 0.8 * env, LILAC, 0, 2);
        glowDot(hpt[0], hpt[1], 1.9, TINT_CORE, 0.9 * env);
      }
    }

    // slow shimmer wave across pins
    if (!REDUCED_MOTION && hp < 0.5) {
      const wave = (idleT / 6000) % 1;
      drawPins(cx, cy, s, (i) => {
        const ph = pinPhase(i, cx, cy, s);
        let dph = Math.abs(ph - wave); dph = Math.min(dph, 1 - dph);
        return Math.max(0, 0.28 - dph * 2.2) * (1 - hp * 2);
      }, LILAC, false);
    }

    /* ---------- hover ---------- */
    if (hp > 0.004) {
      branches.forEach((b, bi) => {
        const f = easeOut3(clamp(hp * 1.25 - bi * 0.04, 0, 1));
        if (f <= 0.002) return;
        const seg = partialPoly(b, f);
        stroke(seg, LILAC, 0.65 * hp, 1.7, true);
        const tip = seg[seg.length - 1];
        if (f < 1) glowDot(tip[0], tip[1], 2.3, TINT_TAIL, 0.9 * hp);
        else { const e = b[b.length - 1]; via(e[0], e[1], hp); }
      });
      stroke(outline, LILAC, 0.85 * hp, 1.7, true);
      drawPins(cx, cy, s, () => 0.7 * hp, LILAC, hp > 0.5);
      drawDie(cx, cy, s, 1, 0.6 * hp, LILAC);

      // rotating scanner segment
      if (!REDUCED_MOTION) {
        const rps = cfg('scannerRps');
        const head = (now / 1000 * rps) % 1;
        const L = 0.16;
        const segPts = [];
        for (let i = 0; i <= 14; i++) {
          const tt = (head - L + (L * i) / 14 + 1) % 1;
          segPts.push(polyAt(outline, tt));
        }
        for (let i = 1; i < segPts.length; i++) {
          const a = (i / segPts.length) * 0.9 * hp;
          stroke([segPts[i - 1], segPts[i]], TINT_TAIL, a, 2.2, false);
        }
        const hd = segPts[segPts.length - 1];
        glowDot(hd[0], hd[1], 2.4, TINT_CORE, 0.95 * hp);
      }

      // ripple rings from core while hovered
      if (st.rippleStart > 0) {
        const rMs = cfg('rippleMs');
        const rt = ((now - st.rippleStart) % rMs) / rMs;
        ringPulse(cx, cy, s, rt, 0.12 * hp);
      }

      // rail glow near chip
      const reach = 170 * hp;
      fadeLine(railX, cy, railX, cy - reach, LILAC, 0.8 * hp, LILAC, 0, 2.2);
      fadeLine(railX, cy, railX, cy + reach, LILAC, 0.8 * hp, LILAC, 0, 2.2);
    }

    /* core dot — breathing + arrival bump */
    const lvl = clamp(Math.max(breathe * 0.8, hp) + bump * 0.9, 0, 1.4);
    const coreA = 0.8 + 0.2 * Math.min(1, lvl);
    const coreR = 3.6 + 1.1 * lvl;
    glowDot(cx, cy, coreR, TINT_TAIL, coreA);
  }

  /* ---------- frame loop ---------- */
  function schedule() {
    if (rafId) cancelAnimationFrame(rafId);
    const myGen = ++gen;
    rafId = requestAnimationFrame((ts) => frame(ts, myGen));
  }
  function kick() {
    if (rafId || !isAlive() || document.hidden) return;
    st.last = 0;
    schedule();
  }

  function frame(ts, myGen) {
    if (myGen !== gen) return;
    rafId = 0;
    if (!isAlive() || document.hidden) return;

    // V1: ambient rate cap — 30fps when nothing is being interacted with
    // (always on coarse-pointer devices); full rate during boot/hover/scroll.
    // scroll never needs full rate for a decorative layer — only boot and
    // hover run at 60fps; scrolling (energy) stays at the 30fps ambient cap.
    // Exception: while a node packet is actively travelling, run full rate so
    // the section pulse is as smooth as the meta-circuit's (which never caps
    // mid-packet). One frame of latency on the flag is imperceptible.
    const ambient = st.bootDone && st.hoverP < 0.05 && !st.pulseBusy;
    if ((ambient || (COARSE && !st.pulseBusy)) && ts - lastDrawTs < 30) { schedule(); return; }
    lastDrawTs = ts;

    if ((frameTick++ % 20) === 0) {
      geomDirty = true;
      const d = measureDoc();
      if (d.h !== docH || d.w !== docW) {
        // V4: rebuild only once the document size stops changing (two stable
        // reads ~330ms apart), so accordion animations don't churn the rail.
        if (d.h === pendH && d.w === pendW) resize();
        else { pendH = d.h; pendW = d.w; }
      }
    }

    const dt = clamp((ts - (st.last || ts)) / 16.67, 0.3, 6);
    st.last = ts; st._dt = dt;

    const sy = window.scrollY;
    const vh = window.innerHeight;

    // eased mouse — target is the cursor's DOCUMENT position right now
    if (st.tcx < -9000) { st.mx = -9999; st.my = -9999; }
    else {
      const tx = st.tcx, ty = st.tcy + sy;
      if (st.mx < -9000) { st.mx = tx; st.my = ty; }
      st.mx += (tx - st.mx) * 0.3 * dt;
      st.my += (ty - st.my) * 0.3 * dt;
    }

    st.energy += (clamp(Math.abs(sy - st.lastY) / 26, 0, 1) - st.energy) * 0.12 * dt;
    st.lastY = sy;

    const g = geom();
    if (!g) { schedule(); return; }

    st.alpha += ((g.enabled ? 1 : 0) - st.alpha) * 0.1 * dt;
    if (g.enabled && st.alpha > 0.995) st.alpha = 1;   // snap so the style write below settles
    if (st.alpha < 0.02) {
      host.style.opacity = '0';
      if (g.enabled) schedule();
      return;
    }
    const hostOp = st.alpha.toFixed(3);
    if (host.__op !== hostOp) { host.__op = hostOp; host.style.opacity = hostOp; }

    if (st.bootStart < 0) st.bootStart = ts;

    // core-lit sync: feed the boot's core-fill progress to any listener (the
    // hero title reveal) so the title only finishes when the core is fully lit.
    // Emitted from the frame loop so it fires even while the hero is off-screen.
    if (!st.coreLit) {
      const p = clamp((ts - st.bootStart) / coreLitAtMs(), 0, 1);
      if (p > st.coreProgress) {
        st.coreProgress = p;
        if (hooks.onCoreProgress) hooks.onCoreProgress(p);
      }
      if (p >= 1) {
        st.coreLit = true;
        if (hooks.onCoreLit) hooks.onCoreLit();
      }
    }

    // boot completes on the clock even if the hero is off-screen
    if (!st.bootDone) {
      const total = cfg('bootDurationMs') * cfg('bootArriveFrac') + cfg('bootIngressMs')
                  + cfg('bootFillMs') + cfg('bootHoldMs') + cfg('settleMs');
      if (ts - st.bootStart >= total) { st.bootDone = true; st.idleStart = ts; }
    }

    const railX = g.railX + cfg('railOffsetX');

    rBegin();

    buildRail(railX);
    const railOp = clamp(0.85 + st.energy * 0.45, 0, 1).toFixed(2);
    if (layers.rail.__op !== railOp) { layers.rail.__op = railOp; layers.rail.style.opacity = railOp; }

    drawNodes(g, railX, dt, ts, sy, vh);

    const heroVisible = g.hero && g.hero.bottom - sy > -20 && g.hero.top - sy < vh;
    if (heroVisible) drawChipScene(g, ts, sy, vh);
    else st.packets.length = 0;   // mid-flight idle packets are invisible off-screen; don't let them block sleep

    // cursor aura
    if (st.mx > -9000) aura(st.mx, st.my, 200, PURPLE, 0.13);

    rEnd();

    // V1: idle self-suspend — stop scheduling once every easing has settled
    // and nothing on screen is animating; scroll/move/resize/visibilitychange
    // kick() the loop awake again.
    const easing =
      st.hoverP > 0.004 ||
      st.energy > 0.02 ||
      st.alpha < 0.98 ||
      (st.tcx > -9000 && (Math.abs(st.mx - st.tcx) > 0.5 || Math.abs(st.my - (st.tcy + sy)) > 0.5));
    let nodeEasing = false;
    for (const k in st.nodeExt) {
      const v = st.nodeExt[k];
      if (v > 0.004 && v < 0.995) { nodeEasing = true; break; }
    }
    const scenery = !REDUCED_MOTION &&
      (heroVisible || st.activeNode >= 0 || st.packets.length > 0);
    if (!st.bootDone || easing || nodeEasing || scenery) schedule();
  }

  function replayBoot() {
    st.bootStart = -1;
    st.bootDone = false;
    st.coreLit = false;
    st.coreProgress = 0;
    st.idleStart = -1;
    st.hoverP = 0;
    st.wasHover = false;
    st.rippleStart = -1;
    st.packets.length = 0;
    st.nextPacketAt = 0;
    st.energy = 0;
  }

  function syncColorsOuter() {
    syncColorsInner();
    radialCache = {};       // stale defs are harmless; new ids get created
    railBuiltKey = '';      // rebuild rail with new palette
  }

  resize();
  if (REDUCED_MOTION) {
    st.bootStart = performance.now() - 1e7;
    st.bootDone = true;
    st.idleStart = performance.now();
  }
  schedule();

  let resizeTimer = 0;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { geomDirty = true; resize(); kick(); }, 100);
  };
  const onMove = (e) => { st.tcx = e.clientX; st.tcy = e.clientY; kick(); };
  const onLeave = () => { st.tcx = -9999; st.tcy = -9999; kick(); };
  const onScroll = () => { kick(); };   // doc-space geometry is scroll-invariant
  const onVis = () => kick();

  window.addEventListener('resize', onResize);
  window.addEventListener('mousemove', onMove, { passive: true });
  window.addEventListener('mouseout', onLeave);
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onVis);

  return {
    replayBoot() { replayBoot(); kick(); },
    syncColors() { syncColorsOuter(); kick(); },
    coreLitMs: coreLitAtMs,
    destroy() {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseout', onLeave);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVis);
      clearTimeout(resizeTimer);
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    },
  };
}
