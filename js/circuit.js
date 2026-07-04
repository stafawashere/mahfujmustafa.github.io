const CURIE_ANIM_SCHEMA = {
  bootDurationMs:  { def: 1350,  min: 400,   max: 3000 },
  bootArriveFrac:  { def: 0.62,  min: 0.2,   max: 0.95 },
  bootIngressMs:   { def: 360,   min: 80,    max: 1200 },
  bootFillMs:      { def: 980,   min: 120,   max: 1600 },
  coreFullFrac:    { def: 0.9,   min: 0.5,   max: 1.0  },
  bootHoldMs:      { def: 0,     min: 0,     max: 2500 },
  bootRailOutMs:   { def: 400,   min: 60,    max: 1000 },
  bootEgressMs:    { def: 360,   min: 80,    max: 1200 },
  bootConnOutMs:   { def: 360,   min: 80,    max: 1200 },
  bootRetractEase: { def: 0.088, min: 0.02,  max: 0.25 },
  bootCometTail:   { def: 235,   min: 40,    max: 300  },
  bootCometWidth:  { def: 3,     min: 1,     max: 8    },
  bootCometHead:   { def: 4.4,   min: 1,     max: 10   },
  bootBurstMs:     { def: 1240,  min: 200,   max: 1600 },
  bootBurstFadeIn: { def: 0.16,  min: 0.02,  max: 0.5  },
  bootBurstReach:  { def: 320,   min: 60,    max: 420  },
  bootBurstHead:   { def: 2.2,   min: 1,     max: 8    },
  railSparkTrail:  { def: 0.4,   min: 0.4,   max: 2    },
  railGlow:        { def: true,  type: 'bool' },
  railGlowReach:   { def: 172,   min: 40,    max: 400  },
  railFillMs:      { def: 720,   min: 120,   max: 1600 },
  hoverRadius:     { def: 60,    min: 40,    max: 240  },
  highlightReach:  { def: 232,   min: 80,    max: 400  },
  branchDone:      { def: 0.62,  min: 0.1,   max: 0.9  },
  coreSize:        { def: 32,    min: 16,    max: 48   },
  retractEase:     { def: 0.088, min: 0.02,  max: 0.25 },
  nodeRailEase:    { def: 0.2,   min: 0.02,  max: 0.5  },
  nodeColEase:     { def: 0.09,  min: 0.02,  max: 0.4  },
  nodeRailLen:     { def: 35,    min: 10,    max: 80   },
  mouseEase:       { def: 0.36,  min: 0.02,  max: 0.4  },
  parallaxAmt:     { def: 0.008, min: 0,     max: 0.05 },
  parallaxEase:    { def: 0.08,  min: 0.02,  max: 0.3  },
  coreOffsetX:     { def: -100,  min: -280,  max: 160  },
  railOffsetX:     { def: 120,   min: -220,  max: 200  },
  idlePulseMs:     { def: 4800,  min: 2000,  max: 9000 },
  idlePulseAmp:    { def: 1,     min: 0,     max: 2    },
  idleCarriers:    { def: true,  type: 'bool' },
  idleEvents:      { def: true,  type: 'bool' },
  idleEventGapS:   { def: 26,    min: 8,     max: 60   },
};
if (typeof window !== 'undefined') window.CURIE_ANIM_SCHEMA = CURIE_ANIM_SCHEMA;

function initCircuit(canvas, getAnimCfg, isAlive) {
  const ctx = canvas.getContext('2d');

  const SECTIONS = ['#skills', '#experience', '#work', '#education', '#contact'];

  const IDLE_CARRIERS = [
    { branch: 0, periodMs: 3400, phase: 0,    inward: false },
    { branch: 1, periodMs: 5100, phase: 0.42, inward: true  },
    { branch: 2, periodMs: 4300, phase: 0.21, inward: false },
    { branch: 3, periodMs: 6200, phase: 0.68, inward: false },
    { branch: 4, periodMs: 7700, phase: 0.55, inward: true  },
  ];

  const EVENT_MS = 2200;

  function hash01(n) {
    const s = Math.sin(n * 12.9898) * 43758.5453;
    return s - Math.floor(s);
  }

  function eventState(idleT) {
    const slotMs = cfg('idleEventGapS') * 1000;
    const slot   = Math.floor(idleT / slotMs);
    if (hash01(slot * 1.7 + 3.3) < 0.18) return null;
    const off   = (0.12 + hash01(slot * 2.9 + 1.1) * 0.5) * slotMs;
    const local = idleT - slot * slotMs - off;
    if (local < 0 || local > EVENT_MS) return null;
    const branch = Math.floor(hash01(slot * 5.3 + 2.2) * IDLE_CARRIERS.length);
    return { et: local / EVENT_MS, branch, slot };
  }

  function chatterPins(idleT) {
    const slotMs = 700;
    const slot   = Math.floor(idleT / slotMs);
    if (hash01(slot * 3.1 + 0.5) <= 0.72) return null;
    const local = idleT - slot * slotMs;
    const a     = clamp(local / 120, 0, 1) * clamp((450 - local) / 200, 0, 1);
    if (a <= 0.01) return null;
    return { i: Math.floor(hash01(slot * 7.7 + 2.3) * 20), a: a * 0.32 };
  }

  function twinkleVia(idleT, viaCount) {
    const slotMs = 1200;
    const slot   = Math.floor(idleT / slotMs);
    if (hash01(slot * 4.2 + 9.1) < 0.55) return null;
    const local = idleT - slot * slotMs;
    const a     = clamp(local / 200, 0, 1) * clamp((900 - local) / 300, 0, 1);
    if (a <= 0.01) return null;
    return { i: Math.floor(hash01(slot * 8.8 + 1.3) * viaCount), a };
  }

  function pinSeg(i, cx, cy, s) {
    const k    = (i % 5) - 2;
    const side = Math.floor(i / 5);
    if (side === 0) return [[cx - s - 7, cy + k * 7.5], [cx - s, cy + k * 7.5]];
    if (side === 1) return [[cx + s, cy + k * 7.5], [cx + s + 7, cy + k * 7.5]];
    if (side === 2) return [[cx + k * 7.5, cy - s - 7], [cx + k * 7.5, cy - s]];
    return [[cx + k * 7.5, cy + s], [cx + k * 7.5, cy + s + 7]];
  }

  const COARSE_POINTER = typeof window.matchMedia === 'function'
    && window.matchMedia('(pointer: coarse)').matches;

  const REDUCED_MOTION = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const FPS_CAP      = COARSE_POINTER ? 30 : 60;
  const FRAME_MIN_MS = 1000 / FPS_CAP - 2;

  const AMBIENT_FPS    = 30;
  const AMBIENT_MIN_MS = 1000 / AMBIENT_FPS - 2;

  let PURPLE = '104, 71, 222';
  let LILAC  = '157, 134, 255';
  let PRGB   = [104, 71, 222];
  let LRGB   = [157, 134, 255];

  let TINT_SOFT = '216, 206, 255';
  let TINT_TAIL = '234, 226, 255';
  let TINT_CORE = '240, 235, 255';
  function towardWhite(rgb, amt) {
    return rgb.map(c => Math.round(c + (255 - c) * amt)).join(', ');
  }
  function syncColors() {
    const cs = getComputedStyle(document.documentElement);
    const p  = cs.getPropertyValue('--purple-rgb').trim();
    const l  = cs.getPropertyValue('--lilac-rgb').trim();
    if (p) PURPLE = p;
    if (l) LILAC  = l;
    PRGB = PURPLE.split(',').map(s => +s);
    LRGB = LILAC.split(',').map(s => +s);
    TINT_SOFT = towardWhite(LRGB, 0.60);
    TINT_TAIL = towardWhite(LRGB, 0.77);
    TINT_CORE = towardWhite(LRGB, 0.85);
  }
  syncColors();

  function lerpCol(p) {
    p = p < 0 ? 0 : p > 1 ? 1 : p;
    return Math.round(PRGB[0] + (LRGB[0] - PRGB[0]) * p) + ',' +
           Math.round(PRGB[1] + (LRGB[1] - PRGB[1]) * p) + ',' +
           Math.round(PRGB[2] + (LRGB[2] - PRGB[2]) * p);
  }

  const st = {
    mx: -9999, my: -9999, tmx: -9999, tmy: -9999,
    lastY: window.scrollY, energy: 0, alpha: 0, last: 0, lastPaint: 0, par: 0, ambient: false,
    scrollTs: -9999, interactive: false,
    heroR: 0, railProg: 0, _dt: 1,
    boot: 0, bootStart: -1, _bootIgnited: false,
    _bootArrived: false, bootIngress: 0, ingressStart: -1,
    _bootExited: false, _exiting: false, egress: 0, connEgress: 0,
    exitStart: -1, exitRail0: 0, exitCore0: 0, stageB: -1,
    coreX: 0, coreY: 0, coreHoldUntil: -1, _coreFilling: false, fillStart: -1,
    dotsStart: -1, bootDone: false,
    burstStart: null, _coreLit: false, _railLit: false,
    nodeRail: {}, nodeCol: {}, _idleBusy: false,
  };

  const dataPackets = [];
  const tapPulses  = [];
  const spark      = {};
  let   lastActive = -1;
  let   rafId      = 0;
  let   gen        = 0;
  let   heroIO     = null;
  let   geomCache  = null;
  let   geomDirty  = true;
  let   frameTick  = 0;

  let DPR = Math.min(window.devicePixelRatio || 1, 2);
  const BS = 0.5;
  const bloomC   = document.createElement('canvas');
  const bctx     = bloomC.getContext('2d');
  const bloomOps = [];

  function bloomDot(x, y, r, rgb, a) {
    if (a > 0.012) bloomOps.push({ k: 0, x, y, r, rgb, a: a * ctx.globalAlpha });
  }
  function bloomLine(pts, rgb, a, w) {
    if (a > 0.012) bloomOps.push({ k: 2, pts, rgb, a: a * ctx.globalAlpha, w });
  }
  function bloomRect(x, y, w, h, rgb, a) {
    if (a > 0.012) bloomOps.push({ k: 1, x, y, w, h, rgb, a: a * ctx.globalAlpha });
  }
  function bloomRRect(x, y, w, h, r, rgb, a, lw) {
    if (a > 0.012) bloomOps.push({ k: 3, x, y, w, h, r, rgb, a: a * ctx.globalAlpha, lw });
  }

  function bRRPath(x, y, w, h, r) {
    bctx.beginPath();
    bctx.moveTo(x + r, y);
    bctx.arcTo(x + w, y, x + w, y + h, r);
    bctx.arcTo(x + w, y + h, x, y + h, r);
    bctx.arcTo(x, y + h, x, y, r);
    bctx.arcTo(x, y, x + w, y, r);
    bctx.closePath();
  }

  function flushBloom(vw, vh) {
    if (!bloomOps.length) return;
    const bw = Math.max(1, Math.round(vw * BS));
    const bh = Math.max(1, Math.round(vh * BS));
    if (bloomC.width !== bw || bloomC.height !== bh) { bloomC.width = bw; bloomC.height = bh; }
    bctx.setTransform(BS, 0, 0, BS, 0, 0);
    bctx.clearRect(0, 0, vw, vh);
    bctx.globalCompositeOperation = 'lighter';
    bctx.lineJoin = 'round';
    bctx.lineCap  = 'round';
    for (const o of bloomOps) {
      if (o.k === 0) {
        bctx.fillStyle = 'rgba(' + o.rgb + ',' + o.a + ')';
        bctx.beginPath(); bctx.arc(o.x, o.y, o.r, 0, 7); bctx.fill();
      } else if (o.k === 1) {
        bctx.fillStyle = 'rgba(' + o.rgb + ',' + o.a + ')';
        bctx.fillRect(o.x, o.y, o.w, o.h);
      } else if (o.k === 2) {
        bctx.strokeStyle = 'rgba(' + o.rgb + ',' + o.a + ')';
        bctx.lineWidth = o.w;
        bctx.beginPath();
        bctx.moveTo(o.pts[0][0], o.pts[0][1]);
        for (let j = 1; j < o.pts.length; j++) bctx.lineTo(o.pts[j][0], o.pts[j][1]);
        bctx.stroke();
      } else {
        bctx.strokeStyle = 'rgba(' + o.rgb + ',' + o.a + ')';
        bctx.lineWidth = o.lw;
        bRRPath(o.x, o.y, o.w, o.h, o.r);
        bctx.stroke();
      }
    }
    bloomOps.length = 0;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = 0.85;
    ctx.filter = 'blur(' + (2.4 * DPR) + 'px)';
    ctx.drawImage(bloomC, 0, 0, bw, bh, 0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 0.55;
    ctx.filter = 'blur(' + (7 * DPR) + 'px)';
    ctx.drawImage(bloomC, 0, 0, bw, bh, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';
    ctx.restore();
  }

  function cfg(k, d) {
    const s = CURIE_ANIM_SCHEMA[k];
    const animCfg = getAnimCfg();
    let v = animCfg ? animCfg[k] : undefined;
    if (!s) return (v == null || v === '') ? d : v;
    if (v == null || v === '') v = s.def;
    if (s.type === 'bool') return !!v;
    v = +v;
    if (!isFinite(v)) v = s.def;
    return clamp(v, s.min, s.max);
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function dist(x, y) {
    if (!st.interactive || st.mx < -9000) return 99999;
    return Math.hypot(x - st.mx, y - st.my);
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = Math.floor(window.innerWidth  * DPR);
    canvas.height = Math.floor(window.innerHeight * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function polyLen(pts) {
    let L = 0;
    for (let i = 0; i < pts.length - 1; i++)
      L += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    return L;
  }

  function polyAt(pts, t) {
    const L = polyLen(pts);
    let target = t * L;
    for (let i = 0; i < pts.length - 1; i++) {
      const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
      if (target <= d || i === pts.length - 2) {
        const f = d ? clamp(target / d, 0, 1) : 0;
        return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f,
                pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f];
      }
      target -= d;
    }
    return pts[pts.length - 1];
  }

  function partialPoly(pts, frac) {
    if (frac >= 1) return pts;
    if (frac <= 0) return [pts[0]];
    const total = polyLen(pts);
    let target = frac * total;
    const out = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
      if (target <= d) {
        const f = d ? target / d : 0;
        out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f,
                  pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]);
        return out;
      }
      out.push(pts[i + 1]);
      target -= d;
    }
    return out;
  }

  function strokePoly(pts, color, a, w, glow) {
    ctx.strokeStyle = 'rgba(' + color + ',' + a + ')';
    ctx.lineWidth   = w;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
    if (glow) bloomLine(pts, color, Math.min(1, a + 0.2), w);
  }

  function via(x, y, lit) {
    ctx.fillStyle = 'rgba(' + (lit ? LILAC : PURPLE) + ',' + (lit ? 0.9 : 0.45) + ')';
    ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(' + (lit ? LILAC : PURPLE) + ',' + (lit ? 0.6 : 0.28) + ')';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 7); ctx.stroke();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function geom() {
    if (!geomDirty && geomCache) return geomCache;
    const g = computeGeom();
    if (g) { geomCache = g; geomDirty = false; }
    return g;
  }

  function computeGeom() {
    const colEl = document.querySelector('#skills');
    if (!colEl) return null;
    const cr  = colEl.getBoundingClientRect();
    const vw  = window.innerWidth;
    const vh  = window.innerHeight;
    const padL = Math.max(cr.left, 30);
    const padR = Math.min(cr.right, vw - 30);
    const leftBusX  = Math.max(16, padL - 46);
    const rightBusX = Math.min(vw - 16, padR + 46);

    const nodes = SECTIONS.map((sel, i) => {
      const head = document.querySelector(sel + ' [data-chead]');
      const el   = head || document.querySelector(sel);
      const r    = el.getBoundingClientRect();
      const y    = head ? r.top + r.height / 2 : r.top + 80;
      return { i, label: String(i + 1).padStart(2, '0'), y, visible: y > -30 && y < vh + 30 };
    });

    let active = 0, best = 1e9;
    nodes.forEach(n => { const d = Math.abs(n.y - vh * 0.4); if (d < best) { best = d; active = n.i; } });

    const heroEl = document.querySelector('[data-cnode="core"]');
    let hero = null;
    if (heroEl) {
      const hr = heroEl.getBoundingClientRect();
      hero = { left: hr.left, right: hr.right, y: hr.top + hr.height / 2, visible: hr.bottom > -20 && hr.top < vh };
    }

    return { vw, vh, colLeft: cr.left, colRight: cr.right, padL, padR, leftBusX, rightBusX, nodes, active, hero, enabled: vw > 560 };
  }

  function drawRail(x, vh, energy) {
    const g = ctx.createLinearGradient(0, 0, 0, vh);
    g.addColorStop(0,    'rgba(' + PURPLE + ',0.06)');
    g.addColorStop(0.34, 'rgba(' + PURPLE + ',' + (0.34 + energy * 0.16) + ')');
    g.addColorStop(0.5,  'rgba(' + LILAC  + ',' + (0.3  + energy * 0.2)  + ')');
    g.addColorStop(0.66, 'rgba(' + PURPLE + ',' + (0.34 + energy * 0.16) + ')');
    g.addColorStop(1,    'rgba(' + PURPLE + ',0.06)');
    ctx.strokeStyle = g; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, vh); ctx.stroke();
    ctx.fillStyle = 'rgba(' + PURPLE + ',0.3)';
    for (let y = 30; y < vh; y += 120) { ctx.beginPath(); ctx.arc(x, y, 2, 0, 7); ctx.fill(); }
    ctx.strokeStyle = 'rgba(' + PURPLE + ',0.16)'; ctx.lineWidth = 1;
    for (let y = 90; y < vh; y += 120) { ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y); ctx.stroke(); }
  }

  function drawDataPacket(p, x, coreY) {
    const e   = 1 - Math.pow(1 - p.t, 2.4);
    const y   = p.y0 + (coreY - p.y0) * e;
    const env = clamp(p.t / 0.07, 0, 1) * clamp((1 - p.t) / 0.14, 0, 1);
    if (env <= 0.01) return;
    const tail = 30;
    const grad = ctx.createLinearGradient(x, y, x, y + tail);
    grad.addColorStop(0, 'rgba(' + TINT_TAIL + ',' + (0.85 * env) + ')');
    grad.addColorStop(1, 'rgba(' + LILAC + ',0)');
    ctx.strokeStyle = grad; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + tail); ctx.stroke();
    ctx.fillStyle = 'rgba(' + TINT_CORE + ',' + (0.96 * env) + ')';
    ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fill();
    bloomDot(x, y, 2.6, TINT_CORE, 0.96 * env);
  }

  function drawTap(busX, padX, y, prog) {
    const col = lerpCol(prog);
    const a   = 0.3 + prog * 0.55;
    ctx.strokeStyle = 'rgba(' + col + ',' + a + ')';
    ctx.lineWidth   = 1.4 + prog * 0.4;
    ctx.beginPath(); ctx.moveTo(busX, y); ctx.lineTo(padX, y); ctx.stroke();
    if (prog > 0.04) bloomLine([[busX, y], [padX, y]], col, 0.9 * prog, 1.8);
  }

  function drawPad(x, y, prog) {
    const col = lerpCol(prog);
    const a   = 0.5 + prog * 0.45;
    ctx.strokeStyle = 'rgba(' + col + ',' + (a * 0.7) + ')'; ctx.lineWidth = 1.2;
    ctx.strokeRect(x - 6, y - 6, 12, 12);
    ctx.strokeStyle = 'rgba(' + col + ',' + (a * 0.3) + ')'; ctx.lineWidth = 1;
    ctx.strokeRect(x - 9.5, y - 9.5, 19, 19);
    ctx.fillStyle = 'rgba(' + col + ',' + a + ')'; ctx.fillRect(x - 3, y - 3, 6, 6);
    if (prog > 0.05) bloomRect(x - 3, y - 3, 6, 6, col, clamp(0.4 + prog * 0.6, 0, 1));
  }

  function drawNodeRail(x, y, prog) {
    if (prog <= 0.01) return;
    const half = cfg('nodeRailLen') * prog;
    const a    = prog;
    const top  = y - half, bot = y + half;
    const gUp = ctx.createLinearGradient(x, y, x, top);
    gUp.addColorStop(0, 'rgba(' + LILAC + ',' + (0.78 * a) + ')');
    gUp.addColorStop(1, 'rgba(' + LILAC + ',0)');
    ctx.strokeStyle = gUp; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, top); ctx.stroke();
    const gDn = ctx.createLinearGradient(x, y, x, bot);
    gDn.addColorStop(0, 'rgba(' + LILAC + ',' + (0.78 * a) + ')');
    gDn.addColorStop(1, 'rgba(' + LILAC + ',0)');
    ctx.strokeStyle = gDn; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, bot); ctx.stroke();
    bloomLine([[x, top], [x, bot]], LILAC, 0.5 * a, 2);
  }

  function drawHero(g, par) {
    const railOff = cfg('railOffsetX');
    const hardMax = g.rightBusX + railOff - 74;
    const softMin = Math.min(g.hero.right + 70, hardMax);
    const cx = clamp(g.padR - 132, softMin, hardMax) + par + cfg('coreOffsetX');
    const cy = g.hero.y;
    const s  = cfg('coreSize');
    st.coreX = cx; st.coreY = cy;

    const maxR    = cfg('highlightReach');

    const liveHover = st.bootDone && dist(cx, cy) < cfg('hoverRadius');
    const hovered = liveHover || st._coreFilling || performance.now() < st.coreHoldUntil;
    if (!hovered) { st._coreLit = false; st._railLit = false; }

    const exitHoldCore  = st._exiting && st.connEgress < 1;
    const target        = hovered ? maxR : (exitHoldCore ? st.exitCore0 : 0);
    const expanding     = target > st.heroR;

    const bootRetract   = !expanding && st._exiting;
    const fillEaseOut   = (frac) => maxR * (1 - Math.pow(1 - frac, 3));
    if (st._coreFilling) {

      const fillMs = cfg('bootFillMs');
      st.heroR = fillEaseOut(clamp((performance.now() - st.fillStart) / fillMs, 0, 1));
    } else if (expanding) {

      const fillMs = cfg('bootFillMs');
      const dtMs   = st._dt * (1000 / 60);
      const frac   = 1 - Math.pow(1 - clamp(st.heroR / maxR, 0, 1), 1 / 3);
      st.heroR = fillEaseOut(clamp(frac + dtMs / fillMs, 0, 1));
    } else {
      const heroEase    = bootRetract ? cfg('bootRetractEase')
                        :               cfg('retractEase');
      st.heroR += (target - st.heroR) * heroEase * st._dt;
      if (st.heroR < 0.3 && target === 0) st.heroR = 0;
    }

    const branches = [
      [[cx + s, cy], [g.rightBusX + par + railOff, cy]],
      [[cx - s, cy], [g.hero.right + 26, cy]],
      [[cx, cy - s], [cx, cy - 80], [cx - 104, cy - 80]],
      [[cx, cy + s], [cx, cy + 74], [cx + 86, cy + 74]],
      [[cx + s, cy - 15], [cx + s + 26, cy - 41], [cx + s + 74, cy - 41]],
    ];

    const drawBranches = (lit, frac, connFrac) => {
      if (frac == null) frac = 1;
      branches.forEach((b, bi) => {
        const isConn = (bi === 0 && connFrac != null);
        const f      = isConn ? connFrac : frac;
        const end = b[b.length - 1];
        if (!lit) { strokePoly(b, PURPLE, 0.28, 1.5, false); via(end[0], end[1], false); return; }
        if (f <= 0.002) return;
        const seg = f < 1 ? partialPoly(b, f) : b;
        strokePoly(seg, LILAC, 0.6, 1.7, true);
        const eu   = clamp((f - 0.8) / 0.2, 0, 1);
        const endA = f >= 1 ? 1 : eu * eu * (3 - 2 * eu);
        if (endA > 0.01) { ctx.save(); ctx.globalAlpha *= endA; via(end[0], end[1], true); ctx.restore(); }

        if (f < 1 && f > 0.002 && !isConn && !st._exiting) {
          const tip  = seg[seg.length - 1];
          const tipA = clamp(f / 0.12, 0, 1) * (1 - endA);
          if (tipA > 0.01) {
            ctx.save(); ctx.globalAlpha *= tipA;
            ctx.fillStyle = 'rgba(' + TINT_TAIL + ',0.95)'; ctx.beginPath(); ctx.arc(tip[0], tip[1], 2.5, 0, 7); ctx.fill();
            bloomDot(tip[0], tip[1], 2.5, '236,229,255', 0.95);
            ctx.restore();
          }
        }
      });
    };

    const drawChip = (lit) => {
      ctx.strokeStyle = 'rgba(' + (lit ? LILAC : PURPLE) + ',' + (lit ? 0.72 : 0.4) + ')'; ctx.lineWidth = 1.2;
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath(); ctx.moveTo(cx - s - 7, cy + k * 7.5); ctx.lineTo(cx - s, cy + k * 7.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + s, cy + k * 7.5); ctx.lineTo(cx + s + 7, cy + k * 7.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + k * 7.5, cy - s - 7); ctx.lineTo(cx + k * 7.5, cy - s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + k * 7.5, cy + s); ctx.lineTo(cx + k * 7.5, cy + s + 7); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(' + (lit ? LILAC : PURPLE) + ',' + (lit ? 0.9 : 0.5) + ')'; ctx.lineWidth = 1.6;
      roundRect(cx - s, cy - s, s * 2, s * 2, 6); ctx.stroke();
      bloomRRect(cx - s, cy - s, s * 2, s * 2, 6, lit ? LILAC : PURPLE, lit ? 0.9 : 0.42, 1.6);
      ctx.strokeStyle = 'rgba(' + (lit ? LILAC : PURPLE) + ',' + (lit ? 0.55 : 0.35) + ')'; ctx.lineWidth = 1;
      roundRect(cx - s + 7, cy - s + 7, (s - 7) * 2, (s - 7) * 2, 4); ctx.stroke();
    };

    drawBranches(false); drawChip(false);

    const bootSweep = st._bootArrived && !st.bootDone;
    if (bootSweep && !st._bootIgnited) {
      const conn = branches[0];
      const rev  = [conn[1], conn[0]];
      const gi   = st.bootIngress || 0;
      const seg  = partialPoly(rev, gi);
      strokePoly(seg, LILAC, 0.6, 1.7, true);
      const tip  = seg[seg.length - 1];
      const tipA = clamp(gi / 0.1, 0, 1) * clamp((1 - gi) / 0.12, 0, 1);
      if (tipA > 0.01) {
        ctx.save(); ctx.globalAlpha *= tipA;
        ctx.fillStyle = 'rgba(' + TINT_TAIL + ',0.95)';
        ctx.beginPath(); ctx.arc(tip[0], tip[1], 2.6, 0, 7); ctx.fill();
        bloomDot(tip[0], tip[1], 2.6, '236,229,255', 0.95);
        ctx.restore();
      }
    }

    const hp          = clamp(st.heroR / maxR, 0, 1);
    const BRANCH_DONE = cfg('branchDone');
    if (st.bootDone && hovered && hp >= BRANCH_DONE && !st._railLit) {
      st._railLit = true;
      st.burstStart = performance.now();
    }
    if (hp > 0.004) {

      const bootReveal = bootSweep && !st._bootExited;
      const fade  = bootReveal ? 1 : clamp(hp / 0.16, 0, 1);
      ctx.save(); ctx.globalAlpha *= fade;
      const bFrac = clamp(hp / BRANCH_DONE, 0, 1);

      const exitFrac   = bFrac * clamp(1 - st.egress, 0, 1);
      const exitConn   = bFrac * clamp(1 - st.connEgress, 0, 1);
      const branchFrac = st._exiting ? exitFrac : bFrac;

      const connFrac   = st._exiting ? exitConn : (bootSweep ? 1 : null);
      drawBranches(true, branchFrac, connFrac);

      const clipCx = bootSweep ? cx + s : cx;
      const chipR  = hp * (bootSweep ? s * 2 + 22 : s + 16);
      if (chipR > 1.5) {
        ctx.save();
        ctx.beginPath(); ctx.arc(clipCx, cy, chipR, 0, 7); ctx.clip();
        drawChip(true);
        ctx.restore();
      }
      ctx.restore();
    }

    const now    = performance.now();
    const idleT  = st.dotsStart >= 0 ? now - st.dotsStart : -1;
    const idleOn = st.bootDone && !st._exiting && hp < 0.004 && idleT >= 0 && !REDUCED_MOTION;

    st._idleBusy = false;
    ctx.textBaseline = 'middle';

    let arrivalBump = 0;
    if (idleOn && cfg('idleCarriers')) {
      const fadeIn = clamp(idleT / 600, 0, 1);
      for (const c of IDLE_CARRIERS) {
        const t   = ((idleT / c.periodMs) + c.phase) % 1;
        const env = Math.max(0, Math.min(1, t / 0.12, (1 - t) / 0.12)) * fadeIn;
        if (c.inward) {
          const d = 1 - t;
          arrivalBump = Math.max(arrivalBump, Math.exp(-(d * d) / 0.006) * fadeIn);
        }
        if (env <= 0.01) continue;
        const headT = c.inward ? 1 - t : t;
        const pt    = polyAt(branches[c.branch], headT);
        if (c.inward) {
          const bpt  = polyAt(branches[c.branch], clamp(headT + 0.05, 0, 1));
          const grad = ctx.createLinearGradient(pt[0], pt[1], bpt[0], bpt[1]);
          grad.addColorStop(0, 'rgba(' + TINT_TAIL + ',' + (0.7 * env) + ')');
          grad.addColorStop(1, 'rgba(' + LILAC + ',0)');
          ctx.strokeStyle = grad; ctx.lineWidth = 2; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(pt[0], pt[1]); ctx.lineTo(bpt[0], bpt[1]); ctx.stroke();
        }
        ctx.fillStyle = 'rgba(' + TINT_TAIL + ',' + (0.95 * env) + ')';
        ctx.beginPath(); ctx.arc(pt[0], pt[1], 1.9, 0, 7); ctx.fill();
        bloomDot(pt[0], pt[1], 1.9, '232,224,255', 0.95 * env);
      }
    }

    let eventSwell = 0;
    const chatter  = [];
    if (idleOn && cfg('idleEvents')) {
      const ev = eventState(idleT);
      if (ev) {
        const b     = branches[ev.branch];
        const endpt = b[b.length - 1];

        const blink = clamp(ev.et / 0.1, 0, 1) * clamp((0.4 - ev.et) / 0.25, 0, 1);
        if (blink > 0.01) bloomDot(endpt[0], endpt[1], 5, TINT_CORE, 0.85 * blink);

        const pkt = (ev.et - 0.08) / 0.42;
        if (pkt >= 0 && pkt <= 1) {
          st._idleBusy = true;
          const e   = 1 - Math.pow(1 - pkt, 2.4);
          const env = clamp(pkt / 0.08, 0, 1) * clamp((1 - pkt) / 0.12, 0, 1);
          const hpt = polyAt(b, 1 - e);
          const tpt = polyAt(b, clamp((1 - e) + 0.06, 0, 1));
          const grad = ctx.createLinearGradient(hpt[0], hpt[1], tpt[0], tpt[1]);
          grad.addColorStop(0, 'rgba(' + TINT_CORE + ',' + (0.95 * env) + ')');
          grad.addColorStop(1, 'rgba(' + LILAC + ',0)');
          ctx.strokeStyle = grad; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(hpt[0], hpt[1]); ctx.lineTo(tpt[0], tpt[1]); ctx.stroke();
          ctx.fillStyle = 'rgba(' + TINT_CORE + ',' + (0.98 * env) + ')';
          ctx.beginPath(); ctx.arc(hpt[0], hpt[1], 2.6, 0, 7); ctx.fill();
          bloomDot(hpt[0], hpt[1], 3, '245,240,255', 0.9 * env);
        }

        eventSwell = clamp((ev.et - 0.4) / 0.1, 0, 1) * clamp((0.85 - ev.et) / 0.35, 0, 1);

        const burst = clamp((ev.et - 0.48) / 0.06, 0, 1) * clamp((0.78 - ev.et) / 0.18, 0, 1);
        if (burst > 0.01) {
          for (let j = 0; j < 3; j++) {
            chatter.push({ i: Math.floor(hash01(ev.slot * 13.1 + j * 4.7) * 20), a: 0.5 * burst });
          }
        }
      }
    }

    if (idleOn) {
      const amb = chatterPins(idleT);
      if (amb) chatter.push(amb);
      const tw = twinkleVia(idleT, branches.length);
      if (tw) {
        const b     = branches[tw.i];
        const endpt = b[b.length - 1];
        bloomDot(endpt[0], endpt[1], 4, TINT_TAIL, 0.5 * tw.a);
      }
    }

    if (chatter.length) {
      ctx.lineCap = 'butt';
      for (const c of chatter) {
        const seg = pinSeg(c.i, cx, cy, s);
        const a   = clamp(c.a, 0, 0.7);
        ctx.strokeStyle = 'rgba(' + LILAC + ',' + a + ')'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(seg[0][0], seg[0][1]); ctx.lineTo(seg[1][0], seg[1][1]); ctx.stroke();
        bloomLine([seg[0], seg[1]], LILAC, a, 1.4);
      }
    }

    let coreSwell = null;
    if (st.bootDone) {
      if (REDUCED_MOTION) {
        coreSwell = 0.4;
      } else {
        const pMs   = cfg('idlePulseMs');
        const beat  = (idleT >= 0 ? idleT : now) % pMs / pMs;
        const pulse = Math.pow(0.5 - 0.5 * Math.cos(beat * Math.PI * 2), 1.6);
        coreSwell   = clamp(pulse + 0.5 * arrivalBump + 0.7 * eventSwell, 0, 1.6) * cfg('idlePulseAmp');
      }
    }
    const coreR = coreSwell == null ? 4 : 4 + 0.5 * clamp(coreSwell, 0, 1.6);
    const coreA = coreSwell == null ? 1 : 0.85 + 0.13 * clamp(coreSwell, 0, 1.15);
    ctx.fillStyle = 'rgba(' + TINT_TAIL + ',0.97)'; ctx.beginPath(); ctx.arc(cx, cy, coreR - 0.4, 0, 7); ctx.fill();
    bloomDot(cx, cy, coreR, '232,224,255', coreA);
  }

  function drawBootComet(x, y) {
    const tail = cfg('bootCometTail');
    const head = cfg('bootCometHead');
    const grad = ctx.createLinearGradient(x, y, x, y + tail);
    grad.addColorStop(0, 'rgba(' + TINT_TAIL + ',0.92)');
    grad.addColorStop(1, 'rgba(' + LILAC + ',0)');
    ctx.strokeStyle = grad; ctx.lineWidth = cfg('bootCometWidth');
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + tail); ctx.stroke();
    ctx.fillStyle = 'rgba(' + TINT_CORE + ',1)';
    ctx.beginPath(); ctx.arc(x, y, head, 0, 7); ctx.fill();
    bloomDot(x, y, head + 1, '245,240,255', 1);
  }

  function drawRailGlow(x, coreY, vh, hp) {
    if (hp <= 0.004) return;
    const reach = cfg('railGlowReach') * hp;
    const a     = clamp(hp, 0, 1);
    const top   = Math.max(0, coreY - reach);
    const bot   = Math.min(vh, coreY + reach);
    ctx.save();
    const gUp = ctx.createLinearGradient(x, coreY, x, top);
    gUp.addColorStop(0, 'rgba(' + LILAC + ',' + (0.85 * a) + ')');
    gUp.addColorStop(1, 'rgba(' + LILAC + ',0)');
    ctx.strokeStyle = gUp; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, coreY); ctx.lineTo(x, top); ctx.stroke();
    const gDn = ctx.createLinearGradient(x, coreY, x, bot);
    gDn.addColorStop(0, 'rgba(' + LILAC + ',' + (0.85 * a) + ')');
    gDn.addColorStop(1, 'rgba(' + LILAC + ',0)');
    ctx.strokeStyle = gDn; ctx.beginPath(); ctx.moveTo(x, coreY); ctx.lineTo(x, bot); ctx.stroke();
    ctx.shadowColor = 'rgba(' + LILAC + ',' + (0.6 * a) + ')'; ctx.shadowBlur = 16;
    ctx.strokeStyle = 'rgba(' + LILAC + ',' + (0.5 * a) + ')'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x, top + 1); ctx.lineTo(x, bot - 1); ctx.stroke();
    ctx.restore();
  }

  function drawRailBurst(x, coreY, vh, bt) {
    const ease      = 1 - Math.pow(1 - bt, 2.2);
    const upFront   = coreY * (1 - ease);
    const downFront = coreY + (vh - coreY) * ease;

    const fin       = clamp(bt / cfg('bootBurstFadeIn'), 0, 1);
    const fadeIn    = fin * fin * (3 - 2 * fin);
    const fadeOut   = Math.pow(1 - bt, 0.7);
    const fade      = fadeIn * fadeOut;
    const tail      = cfg('bootBurstReach');
    ctx.save(); ctx.lineWidth = 2.6;
    const gUp = ctx.createLinearGradient(x, upFront, x, upFront + tail);
    gUp.addColorStop(0, 'rgba(' + TINT_TAIL + ',' + (0.92 * fade) + ')');
    gUp.addColorStop(1, 'rgba(' + LILAC + ',0)');
    ctx.strokeStyle = gUp; ctx.beginPath(); ctx.moveTo(x, upFront); ctx.lineTo(x, upFront + tail); ctx.stroke();
    const gDn = ctx.createLinearGradient(x, downFront, x, downFront - tail);
    gDn.addColorStop(0, 'rgba(' + TINT_TAIL + ',' + (0.92 * fade) + ')');
    gDn.addColorStop(1, 'rgba(' + LILAC + ',0)');
    ctx.strokeStyle = gDn; ctx.beginPath(); ctx.moveTo(x, downFront); ctx.lineTo(x, downFront - tail); ctx.stroke();
    const head = cfg('bootBurstHead');
    ctx.fillStyle = 'rgba(' + TINT_CORE + ',' + fade + ')';
    ctx.beginPath(); ctx.arc(x, upFront,   head, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(x, downFront, head, 0, 7); ctx.fill();
    bloomDot(x, upFront,   head + 0.4, '245,240,255', fade);
    bloomDot(x, downFront, head + 0.4, '245,240,255', fade);
    ctx.restore();
  }

  function beginExit(ts) {
    st._exiting  = true;
    st.exitStart = ts;
    st.exitRail0 = st.railProg;
    st.exitCore0 = st.heroR;
    st.egress    = 0;
    st.connEgress = 0;
    st.stageB    = -1;
  }

  function schedule() {
    if (rafId) cancelAnimationFrame(rafId);
    const myGen = ++gen;
    rafId = requestAnimationFrame((ts) => frame(ts, myGen));
  }

  function kick() {
    if (rafId || !isAlive() || document.hidden) return;
    st.last = 0; st.lastPaint = 0;
    schedule();
  }

  function frame(ts, myGen) {
    if (myGen !== gen) return;
    rafId = 0;
    if (!isAlive() || document.hidden) return;

    const frameMinMs = st.ambient ? AMBIENT_MIN_MS : FRAME_MIN_MS;
    if (st.lastPaint && ts - st.lastPaint < frameMinMs) { schedule(); return; }
    st.lastPaint = ts;
    if ((frameTick++ % 20) === 0) geomDirty = true;

    const dt = clamp((ts - (st.last || ts)) / 16.67, 0.3, 6);
    st.last = ts; st._dt = dt;

    if (st.tmx < -9000) { st.mx = -9999; st.my = -9999; }
    else {
      if (st.mx < -9000) { st.mx = st.tmx; st.my = st.tmy; }
      const mEase = cfg('mouseEase');
      st.mx += (st.tmx - st.mx) * mEase * dt;
      st.my += (st.tmy - st.my) * mEase * dt;
    }

    const sy = window.scrollY;
    const dv = Math.abs(sy - st.lastY);
    st.lastY = sy;
    st.energy += (clamp(dv / 26, 0, 1) - st.energy) * 0.12 * dt;
    if (dv > 0.5) st.scrollTs = ts;

    st.interactive   = st.mx > -9000;

    const g = geom();
    if (!g) { schedule(); return; }

    st.alpha += ((g.enabled ? 1 : 0) - st.alpha) * 0.1 * dt;
    ctx.clearRect(0, 0, g.vw, g.vh);
    if (st.alpha < 0.02) {

      if (g.enabled) schedule();
      return;
    }
    ctx.globalAlpha = st.alpha;
    let nodesEasing = false;

    if (st.bootStart < 0) st.bootStart = ts;
    const bootT  = clamp((ts - st.bootStart) / cfg('bootDurationMs'), 0, 1);
    st.boot = bootT;
    if (bootT < 1) st.energy = Math.max(st.energy, bootT * 0.9);

    const arriveFrac = cfg('bootArriveFrac');
    let cometY = null;
    if (bootT < arriveFrac && g.hero) {
      cometY = g.vh - (bootT / arriveFrac) * (g.vh - g.hero.y);
    }

    if (bootT >= arriveFrac && !st._bootArrived) {
      st._bootArrived = true;
      st.ingressStart = ts;
      st.burstStart   = ts;
    }

    if (st._bootArrived && !st._bootIgnited) {
      st.bootIngress = clamp((ts - st.ingressStart) / cfg('bootIngressMs'), 0, 1);
      if (st.bootIngress >= 1) {
        st._bootIgnited  = true;
        st._coreFilling  = true;
        st.fillStart     = ts;
      }
    }

    if (st._coreFilling) {
      const fillMs   = cfg('bootFillMs');
      const fullFrac = cfg('coreFullFrac');
      const fullT    = (1 - Math.pow(1 - fullFrac, 1 / 3)) * fillMs;
      if (ts - st.fillStart >= fullT) {
        st._coreFilling  = false;
        st.coreHoldUntil = ts + cfg('bootHoldMs');
      }
    }

    if (st._bootIgnited && !st._bootExited && st.coreHoldUntil > 0 && ts >= st.coreHoldUntil) {
      st._bootExited = true;
      beginExit(ts);
    }

    if (st.bootDone && g.hero && g.hero.visible) {
      const coreHover = dist(st.coreX, st.coreY) < cfg('hoverRadius');
      if (coreHover) {
        st._exiting = false; st.egress = 0;
      } else if (!st._exiting && st.heroR > 1) {
        beginExit(ts);
      }
    }
    if (st._exiting) {

      const egMs   = cfg('bootEgressMs');
      const connMs = cfg('bootConnOutMs');
      if (st.stageB < 0 && st.railProg <= 0.03) st.stageB = ts;
      st.egress     = st.stageB < 0 ? 0 : clamp((ts - st.stageB) / egMs, 0, 1);
      st.connEgress = st.stageB < 0 ? 0 : clamp((ts - st.stageB) / connMs, 0, 1);

      if (st.egress >= 1 && st.connEgress >= 1 && st.heroR < 1) {
        st._exiting = false;
        st.egress = 0; st.connEgress = 0; st.heroR = 0; st.railProg = 0; st.stageB = -1;
        if (!st.bootDone) {
          st.bootDone  = true;
          st.dotsStart = performance.now();
        }
      }
    }

    if (st.interactive) {
      const parTarget = clamp((st.mx - g.vw / 2) * -cfg('parallaxAmt'), -9, 9);
      st.par += (parTarget - st.par) * cfg('parallaxEase') * dt;
    }
    const par     = st.par;
    const railOff = cfg('railOffsetX');
    const lbx = g.leftBusX + par;
    const rbx = g.rightBusX + par + railOff;
    const rpx = g.padR + par + railOff;

    let burstT = null;
    if (st.burstStart != null) {
      burstT = clamp((ts - st.burstStart) / cfg('bootBurstMs'), 0, 1);
      if (burstT < 1) st.energy = Math.max(st.energy, 1 - burstT);
    }

    drawRail(rbx, g.vh, st.energy);

    const _coreHp    = clamp(st.heroR / cfg('highlightReach'), 0, 1);
    const railBoot   = st._bootArrived && !st.bootDone;
    if (st._exiting && st.stageB < 0) {

      const railMs = cfg('bootRailOutMs') * clamp(st.exitRail0, 0.0001, 1);
      const k = clamp((ts - st.exitStart) / railMs, 0, 1);
      st.railProg = st.exitRail0 * (1 - k * k);
    } else if (st._exiting) {
      st.railProg = 0;
    } else {

      const bd = cfg('branchDone');
      let railTarget = clamp((_coreHp - bd) / (1 - bd), 0, 1);
      if (railBoot) railTarget = Math.max(railTarget, st.bootIngress || 0);
      if (railTarget > st.railProg && railTarget > 0.0001) {

        const railFillMs = cfg('railFillMs');
        const dtMs = st._dt * (1000 / 60);
        const frac = 1 - Math.pow(1 - clamp(st.railProg / railTarget, 0, 1), 1 / 3);
        st.railProg = railTarget * (1 - Math.pow(1 - clamp(frac + dtMs / railFillMs, 0, 1), 3));
      } else {
        st.railProg += (railTarget - st.railProg) * cfg('retractEase') * st._dt;
      }

      if (burstT != null && burstT < 1) {
        const sEase  = 1 - Math.pow(1 - burstT, 2.2);
        const trail  = cfg('railSparkTrail');
        const glowFr = clamp(sEase / trail, 0, 1);
        st.railProg  = Math.max(st.railProg, glowFr);
      }
      if (st.railProg < 0.002 && railTarget === 0) st.railProg = 0;
    }
    const railHp = st.railProg;
    if (g.hero && cfg('railGlow')) drawRailGlow(rbx, g.hero.y, g.vh, railHp);
    if (cometY != null && cometY < g.vh + 20) drawBootComet(rbx, cometY);
    if (burstT != null && burstT < 1 && g.hero) drawRailBurst(rbx, g.hero.y, g.vh, burstT);

    if (st.bootDone) {
      const pktCoreY = -60;
      for (let i = dataPackets.length - 1; i >= 0; i--) {
        const p = dataPackets[i];
        p.t += p.speed * dt * (0.75 + st.energy * 0.6);
        if (p.t >= 1) { dataPackets.splice(i, 1); continue; }
        if (p.t < 0) continue;
        drawDataPacket(p, rbx, pktCoreY);
      }
      if (dataPackets.length) st.energy = Math.max(st.energy, 0.5);
    }

    if (st.bootDone && g.active !== lastActive) lastActive = g.active;

    for (const n of g.nodes) {
      if (!n.visible) continue;
      if (cometY != null && Math.abs(n.y - cometY) < 28) spark[n.i] = 1;
      const isA = n.i === g.active;

      const hovered = dist(rpx, n.y) < 70 || dist(rbx, n.y) < 70;
      const tgt = (isA || hovered) ? 1 : 0;

      const railE = st.nodeRail[n.i] || 0;
      st.nodeRail[n.i] = railE + (tgt - railE) * cfg('nodeRailEase') * dt;
      const colE = st.nodeCol[n.i] || 0;
      st.nodeCol[n.i] = colE + (tgt - colE) * cfg('nodeColEase') * dt;
      if (!isA && !hovered && st.nodeRail[n.i] < 0.004) st.nodeRail[n.i] = 0;
      if (!isA && !hovered && st.nodeCol[n.i]  < 0.004) st.nodeCol[n.i]  = 0;

      if (Math.abs(tgt - st.nodeRail[n.i]) > 0.004 || Math.abs(tgt - st.nodeCol[n.i]) > 0.004) nodesEasing = true;

      const prog = Math.max(st.nodeCol[n.i], spark[n.i] || 0);

      drawNodeRail(rbx, n.y, st.nodeRail[n.i]);
      drawTap(rbx, rpx, n.y, prog);
      drawPad(rpx, n.y, prog);
      if (dist(rpx, n.y) < 60) spark[n.i] = Math.max(spark[n.i] || 0, 0.8);
      if (st.nodeCol[n.i] > 0.04) {
        ctx.save();
        ctx.globalAlpha *= clamp(st.nodeCol[n.i], 0, 1);
        ctx.fillStyle = 'rgba(' + LILAC + ',0.8)';
        ctx.font = '600 9px "IBM Plex Mono", monospace';
        ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
        ctx.fillText('NODE_' + n.label, rpx - 9, n.y - 14);
        ctx.textBaseline = 'middle';
        ctx.restore();
      }
    }
    ctx.textAlign = 'left';

    for (let i = tapPulses.length - 1; i >= 0; i--) {
      const tp = tapPulses[i];
      tp.p += tp.sp * dt;
      const n = g.nodes[tp.i];
      if (n) {
        const x = rbx + (rpx - rbx) * tp.p;
        ctx.fillStyle = 'rgba(' + TINT_SOFT + ',0.95)'; ctx.beginPath(); ctx.arc(x, n.y, 1.8, 0, 7); ctx.fill();
        bloomDot(x, n.y, 1.8, '216,206,255', 0.95);
      }
      if (tp.p >= 1) { if (n) spark[tp.i] = 1; tapPulses.splice(i, 1); }
    }

    for (const k in spark) { spark[k] *= (1 - 0.06 * dt); if (spark[k] < 0.02) delete spark[k]; }

    if (g.hero && g.hero.visible) drawHero(g, par);

    if (st.interactive) {
      const r  = 200;
      const mg = ctx.createRadialGradient(st.mx, st.my, 0, st.mx, st.my, r);
      mg.addColorStop(0,   'rgba(' + PURPLE + ',0.15)');
      mg.addColorStop(0.6, 'rgba(' + PURPLE + ',0.04)');
      mg.addColorStop(1,   'rgba(' + PURPLE + ',0)');
      ctx.fillStyle = mg; ctx.fillRect(st.mx - r, st.my - r, r * 2, r * 2);
    }

    flushBloom(g.vw, g.vh);
    ctx.globalAlpha = 1;

    let sparkAlive = false;
    for (const k in spark) { sparkAlive = true; break; }

    let easing = false;
    if (st.interactive) {
      const parTarget = clamp((st.mx - g.vw / 2) * -cfg('parallaxAmt'), -9, 9);
      easing = Math.abs(st.tmx - st.mx) > 0.5 || Math.abs(st.tmy - st.my) > 0.5
            || Math.abs(parTarget - st.par) > 0.01;
    }

    const activity = !st.bootDone || st._exiting
                  || st.heroR > 0.001 || st.railProg > 0.001
                  || st.energy > 0.005
                  || dataPackets.length > 0 || tapPulses.length > 0
                  || nodesEasing || sparkAlive
                  || (burstT != null && burstT < 1)
                  || easing;

    const alive = activity || (g.hero && g.hero.visible);

    // ambient = nothing is easing, only the idle dots are drifting; tick at half rate.
    // a mid-flight synapse packet (st._idleBusy) needs the full frame rate to stay smooth.
    st.ambient = alive && !activity && !st._idleBusy;
    if (alive) schedule();
  }

  function replayBoot() {
    st.bootStart     = performance.now();
    st._bootIgnited  = false;
    st._bootArrived  = false;
    st.bootIngress   = 0;
    st.ingressStart  = -1;
    st._bootExited   = false;
    st._exiting      = false;
    st.egress        = 0;
    st.exitStart     = -1;
    st.exitRail0     = 0;
    st.exitCore0     = 0;
    st.bootDone      = false;
    st.dotsStart     = -1;
    st.coreHoldUntil = -1;
    st._coreFilling  = false;
    st.fillStart     = -1;
    st.heroR         = 0;
    st.railProg      = 0;
    st.burstStart    = null;
    st._coreLit      = false;

    st.connEgress    = 0;
    st.stageB        = -1;
    st._railLit      = false;
  }

  resize();
  st.bootStart = performance.now();
  schedule();

  const onResize = () => { geomDirty = true; resize(); kick(); };
  const onMove   = (e) => { st.tmx = e.clientX; st.tmy = e.clientY; kick(); };
  const onLeave  = () => { st.tmx = -9999; st.tmy = -9999; kick(); };
  const onScroll = () => { geomDirty = true; kick(); };
  const onVis    = () => kick();

  let tapClearTimer = 0;
  const onTap = (e) => {
    st.tmx = e.clientX;
    st.tmy = e.clientY;
    kick();

    clearTimeout(tapClearTimer);
    tapClearTimer = setTimeout(() => {
      st.tmx = -9999;
      st.tmy = -9999;
      kick();
    }, 900);
  };

  window.addEventListener('resize',     onResize);
  window.addEventListener('mousemove',  onMove, { passive: true });
  window.addEventListener('mouseout',   onLeave);
  window.addEventListener('scroll',     onScroll, { passive: true });
  document.addEventListener('visibilitychange', onVis);
  if (COARSE_POINTER) window.addEventListener('pointerdown', onTap, { passive: true });

  const heroEl = document.querySelector('[data-cnode="core"]');
  if (heroEl && 'IntersectionObserver' in window) {
    heroIO = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) kick();
    }, { rootMargin: '60px' });
    heroIO.observe(heroEl);
  }

  return {

    replayBoot() { replayBoot(); kick(); },
    syncColors() { syncColors(); kick(); },
    destroy() {
      window.removeEventListener('resize',     onResize);
      window.removeEventListener('mousemove',  onMove);
      window.removeEventListener('mouseout',   onLeave);
      window.removeEventListener('scroll',     onScroll);
      document.removeEventListener('visibilitychange', onVis);
      if (COARSE_POINTER) window.removeEventListener('pointerdown', onTap);
      clearTimeout(tapClearTimer);
      if (heroIO) { heroIO.disconnect(); heroIO = null; }
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    },
  };
}
