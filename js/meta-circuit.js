/* meta-circuit.js — hero metadata separator
   One continuous PCB net on a small canvas: a chip footprint (left)
   drives a bus across the row into a terminal ring pad (right).
   Idle: the chip die breathes; every few seconds a comet packet rides
   the bus (tail bends through the 45° jog), lands on the terminal with
   a flash + expanding ring, and every other packet is answered by a
   return packet that bumps the chip core.
   Speaks the same rendering language as circuit-v2 (glow dots, tints). */
(function () {
  'use strict';

  var el = document.querySelector('.meta-circuit');
  var canvas = el ? el.querySelector('canvas') : null;
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  var REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- palette (mirrors circuit-v2) ---------- */
  var PURPLE = '91,140,255', LILAC = '147,179,255', TAIL = '234,226,255', CORE = '245,241,255';
  function toward(rgb, amt) {
    return rgb.map(function (c) { return Math.round(c + (255 - c) * amt); }).join(',');
  }
  function syncColors() {
    var cs = getComputedStyle(document.documentElement);
    var p = cs.getPropertyValue('--purple-rgb').trim();
    var l = cs.getPropertyValue('--lilac-rgb').trim();
    if (p) PURPLE = p;
    if (l) LILAC = l;
    var L = LILAC.split(',').map(Number);
    TAIL = toward(L, 0.75);
    CORE = toward(L, 0.88);
  }
  syncColors();
  function rgba(c, a) { return 'rgba(' + c + ',' + a + ')'; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(t) { return t * t * (3 - 2 * t); }

  /* ---------- geometry ---------- */
  var H = 24, Y0 = 8, Y1 = 14;
  var W = 0, dpr = 1, geo = null, skel = null;

  function buildGeo() {
    var chip = { x: 2.5, y: 1.5, s: 13 };
    var ccx = chip.x + chip.s / 2, ccy = chip.y + chip.s / 2;
    var pinX1 = chip.x + chip.s + 6;                       // bus start

    var term = { x: W - 9.5, y: Y1, rO: 6.5, rI: 4 };
    var termEdge = term.x - term.rO;

    var jogX = Math.round(W * 0.55) + 0.5;
    var path = [
      [pinX1, Y0],
      [jogX, Y0],
      [jogX + (Y1 - Y0), Y1],
      [termEdge, Y1]
    ];

    var cum = [0], L = 0;
    for (var i = 1; i < path.length; i++) {
      L += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
      cum.push(L);
    }

    var g = {
      chip: chip, ccx: ccx, ccy: ccy, pinX1: pinX1,
      term: term, termEdge: termEdge, jogX: jogX,
      path: path, cum: cum, len: L,
      via1: null, via2: null, ticks: 0, label: 0
    };
    if (W >= 340) g.via1 = { x: Math.round(W * 0.20) + 0.5, y: Y0 + 6.2, d: 0 };
    if (W >= 520) {
      g.ticks = Math.round(W * 0.36) + 0.5;
      g.via2 = { x: Math.round(jogX + 6 + (termEdge - jogX - 6) * 0.35) + 0.5, y: 5.2, d: 0 };
      g.label = Math.round(W * 0.84);
    }
    if (g.via1) g.via1.d = g.via1.x - pinX1;
    if (g.via2) g.via2.d = cum[2] + (g.via2.x - path[2][0]);
    return g;
  }

  function pointAt(d) {
    var p = geo.path, cum = geo.cum;
    if (d <= 0) return p[0];
    if (d >= geo.len) return p[p.length - 1];
    for (var i = 1; i < p.length; i++) {
      if (d <= cum[i]) {
        var t = (d - cum[i - 1]) / (cum[i] - cum[i - 1]);
        return [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * t,
                p[i - 1][1] + (p[i][1] - p[i - 1][1]) * t];
      }
    }
    return p[p.length - 1];
  }

  /* ---------- static skeleton (offscreen, redrawn on resize/palette) ---------- */
  function via(c, x, y) {
    c.fillStyle = rgba(LILAC, 0.5);
    c.beginPath(); c.arc(x, y, 1.4, 0, 7); c.fill();
    c.save();
    c.globalCompositeOperation = 'destination-out';
    c.beginPath(); c.arc(x, y, 0.55, 0, 7); c.fill();  // drill hole
    c.restore();
  }

  function buildSkeleton() {
    if (!geo) return;
    skel = document.createElement('canvas');
    skel.width = canvas.width; skel.height = canvas.height;
    var c = skel.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.lineCap = 'butt';
    c.lineWidth = 1;

    var g = geo, ch = g.chip;

    // chip outline, chamfered pin-1 corner
    c.strokeStyle = rgba(PURPLE, 0.5);
    c.beginPath();
    c.moveTo(ch.x + 4, ch.y);
    c.lineTo(ch.x + ch.s, ch.y);
    c.lineTo(ch.x + ch.s, ch.y + ch.s);
    c.lineTo(ch.x, ch.y + ch.s);
    c.lineTo(ch.x, ch.y + 4);
    c.closePath();
    c.stroke();

    // right-side pins (the middle one becomes the bus)
    c.strokeStyle = rgba(PURPLE, 0.45);
    [Y0 - 3.5, Y0, Y0 + 3.5].forEach(function (y) {
      c.beginPath(); c.moveTo(ch.x + ch.s, y); c.lineTo(g.pinX1, y); c.stroke();
    });
    // top/bottom pins end in test-point dots
    c.fillStyle = rgba(PURPLE, 0.5);
    [Y0 - 3.5, Y0 + 3.5].forEach(function (y) {
      c.beginPath(); c.arc(g.pinX1 + 1.2, y, 1.2, 0, 7); c.fill();
    });
    // stub pins off the chip bottom
    c.strokeStyle = rgba(PURPLE, 0.35);
    [ch.x + 3.5, ch.x + 9.5].forEach(function (x) {
      c.beginPath(); c.moveTo(x, ch.y + ch.s); c.lineTo(x, ch.y + ch.s + 3.5); c.stroke();
    });

    // bus trace
    c.strokeStyle = rgba(PURPLE, 0.3);
    c.beginPath();
    c.moveTo(g.path[0][0], g.path[0][1]);
    for (var i = 1; i < g.path.length; i++) c.lineTo(g.path[i][0], g.path[i][1]);
    c.stroke();

    // solder dots on the jog corners
    c.fillStyle = rgba(PURPLE, 0.55);
    c.beginPath(); c.arc(g.jogX, Y0, 1.4, 0, 7); c.fill();
    c.beginPath(); c.arc(g.jogX + (Y1 - Y0), Y1, 1.4, 0, 7); c.fill();

    // via 1: stub dropping off the bus
    if (g.via1) {
      c.strokeStyle = rgba(PURPLE, 0.35);
      c.beginPath(); c.moveTo(g.via1.x, Y0); c.lineTo(g.via1.x, Y0 + 5); c.stroke();
      via(c, g.via1.x, g.via1.y);
    }
    // bus-width ticks
    if (g.ticks) {
      c.strokeStyle = rgba(PURPLE, 0.4);
      [g.ticks - 2.5, g.ticks + 2.5].forEach(function (x) {
        c.beginPath(); c.moveTo(x, Y0 - 3.5); c.lineTo(x, Y0 + 3.5); c.stroke();
      });
    }
    // via 2: escape up off the low segment
    if (g.via2) {
      c.strokeStyle = rgba(PURPLE, 0.35);
      c.beginPath(); c.moveTo(g.via2.x, Y1); c.lineTo(g.via2.x, 6.5); c.stroke();
      via(c, g.via2.x, g.via2.y);
    }
    // terminal ring pad
    c.strokeStyle = rgba(PURPLE, 0.22);
    c.lineWidth = 1;
    c.beginPath(); c.arc(g.term.x, g.term.y, g.term.rO, 0, 7); c.stroke();
    c.strokeStyle = rgba(PURPLE, 0.6);
    c.lineWidth = 1.2;
    c.beginPath(); c.arc(g.term.x, g.term.y, g.term.rI, 0, 7); c.stroke();
  }

  /* ---------- dynamic layer ---------- */
  function glowDot(x, y, r, col, a) {
    if (a <= 0.01) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
    g.addColorStop(0, rgba(col, Math.min(1, a)));
    g.addColorStop(0.45, rgba(col, a * 0.32));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r * 3, 0, 7); ctx.fill();
    ctx.restore();
    ctx.fillStyle = rgba(col, Math.min(1, a));
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }

  var packets = [];                                  // {t0, dur, out}
  var nextAt = performance.now() + 1600;
  var cycle = 0;
  var flashT0 = -1, bumpT0 = -1, ringT0 = -1;
  var raf = 0, inView = true, lastDraw = 0;
  // synced to the hero chip's hover state: holds a steady lit glow while the
  // chip is focused, with a one-shot sweep down the bus when focus begins.
  var hoverTarget = 0, hoverP = 0, hoverSweepT0 = -1;

  function drawHover(hp, now) {
    if (hp <= 0.004 || !geo) return;
    var g = geo, ch = g.chip;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // chip outline, lit
    ctx.strokeStyle = rgba(LILAC, 0.55 * hp);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(ch.x + 4, ch.y);
    ctx.lineTo(ch.x + ch.s, ch.y);
    ctx.lineTo(ch.x + ch.s, ch.y + ch.s);
    ctx.lineTo(ch.x, ch.y + ch.s);
    ctx.lineTo(ch.x, ch.y + 4);
    ctx.closePath();
    ctx.stroke();
    // pins
    ctx.strokeStyle = rgba(LILAC, 0.5 * hp);
    ctx.lineWidth = 1;
    [Y0 - 3.5, Y0, Y0 + 3.5].forEach(function (y) {
      ctx.beginPath(); ctx.moveTo(ch.x + ch.s, y); ctx.lineTo(g.pinX1, y); ctx.stroke();
    });
    // bus, lit
    ctx.strokeStyle = rgba(LILAC, 0.65 * hp);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(g.path[0][0], g.path[0][1]);
    for (var i = 1; i < g.path.length; i++) ctx.lineTo(g.path[i][0], g.path[i][1]);
    ctx.stroke();
    // terminal rings, lit
    ctx.strokeStyle = rgba(LILAC, 0.55 * hp);
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(g.term.x, g.term.y, g.term.rI, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(g.term.x, g.term.y, g.term.rO, 0, 7); ctx.stroke();
    ctx.restore();
    // steady core + terminal glow held for the duration of the hover
    glowDot(g.ccx, g.ccy, 1.8 + 1.4 * hp, TAIL, 0.5 + 0.4 * hp);
    glowDot(g.term.x, g.term.y, 1.6 + 1.2 * hp, TAIL, 0.4 + 0.4 * hp);
    // one-shot sweep down the bus when the chip first lights
    if (hoverSweepT0 > 0) {
      var sw = (now - hoverSweepT0) / 700;
      if (sw < 1) {
        var d = smooth(sw) * geo.len, prev = pointAt(d);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        for (var k = 1; k <= 7; k++) {
          var dd = d - k * 8; if (dd < 0) break;
          var pt = pointAt(dd);
          ctx.strokeStyle = rgba(k < 3 ? TAIL : LILAC, 0.6 * Math.pow(1 - k / 8, 1.6) * hp);
          ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(pt[0], pt[1]); ctx.stroke();
          prev = pt;
        }
        ctx.restore();
        var hd = pointAt(d);
        glowDot(hd[0], hd[1], 1.8, CORE, 0.9 * hp);
      } else hoverSweepT0 = -1;
    }
  }

  function drawPacket(p, t) {
    var tt = smooth(t);
    var d = p.out ? tt * geo.len : (1 - tt) * geo.len;
    var dir = p.out ? 1 : -1;
    var env = Math.min(1, t * 10);

    // tail — sampled along the polyline so it bends through the jog
    var prev = pointAt(d);
    ctx.lineCap = 'round';
    for (var i = 1; i <= 7; i++) {
      var dd = d - dir * i * 8;
      if (dd < 0 || dd > geo.len) break;
      var pt = pointAt(dd);
      ctx.strokeStyle = rgba(i < 3 ? TAIL : LILAC, 0.6 * Math.pow(1 - i / 8, 1.6) * env);
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(pt[0], pt[1]); ctx.stroke();
      prev = pt;
    }

    var hd = pointAt(d);
    glowDot(hd[0], hd[1], 1.8, CORE, 0.95 * env);

    // vias blink as the packet passes
    [geo.via1, geo.via2].forEach(function (v) {
      if (!v) return;
      var prox = 1 - Math.abs(d - v.d) / 16;
      if (prox > 0) glowDot(v.x, v.y, 1.4, TAIL, 0.5 * prox * env);
    });
  }

  function frame(now) {
    raf = 0;
    if (!running()) return;

    // ambient 30fps between packets — only the die breathes then
    var busy = packets.length > 0 || ringT0 > 0 ||
      Math.abs(hoverTarget - hoverP) > 0.01 ||
      (hoverSweepT0 > 0 && now - hoverSweepT0 < 720) ||
      (flashT0 > 0 && now - flashT0 < 900) ||
      (bumpT0 > 0 && now - bumpT0 < 900);
    if (!busy && now - lastDraw < 30) { raf = requestAnimationFrame(frame); return; }
    lastDraw = now;

    // ease the held hover glow toward the chip's focus state
    hoverP += (hoverTarget - hoverP) * (hoverTarget > hoverP ? 0.14 : 0.08);
    if (hoverP < 0.004 && hoverTarget === 0) hoverP = 0;

    if (now >= nextAt) {
      syncColors();
      packets.push({ t0: now, dur: clamp(geo.len / 0.55, 700, 1800), out: true });
      cycle++;
      nextAt = now + 4400 + Math.random() * 1600;
    }

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(skel, 0, 0, W, H);

    var breathe = Math.pow(0.5 - 0.5 * Math.cos(((now % 4200) / 4200) * Math.PI * 2), 1.8);
    var bump = bumpT0 > 0 ? Math.exp(-(now - bumpT0) / 260) : 0;
    var flash = flashT0 > 0 ? Math.exp(-(now - flashT0) / 300) : 0;

    // chip die — breathing + return-packet bump
    var lvl = clamp(breathe * 0.8 + bump, 0, 1.3);
    glowDot(geo.ccx, geo.ccy, 1.6 + 1.3 * lvl, TAIL, 0.55 + 0.45 * Math.min(1, lvl));

    // terminal core — steady, flares on arrival
    glowDot(geo.term.x, geo.term.y, 1.6 + 1.6 * flash, TAIL, 0.5 + 0.5 * flash);

    // held glow synced to the hero chip hover
    drawHover(hoverP, now);

    // arrival ring pulse
    if (ringT0 > 0) {
      var rt = (now - ringT0) / 620;
      if (rt < 1) {
        var e = 1 - Math.pow(1 - rt, 3);
        ctx.strokeStyle = rgba(CORE, 0.45 * (1 - rt));
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(geo.term.x, geo.term.y, geo.term.rI + e * 9, 0, 7);
        ctx.stroke();
      } else ringT0 = -1;
    }

    for (var i = packets.length - 1; i >= 0; i--) {
      var p = packets[i];
      var t = (now - p.t0) / p.dur;
      if (t < 0) continue;
      if (t >= 1) {
        packets.splice(i, 1);
        if (p.out) {
          flashT0 = now; ringT0 = now;
          if (cycle % 2 === 0) packets.push({ t0: now + 750, dur: p.dur, out: false });
        } else {
          bumpT0 = now;
        }
        continue;
      }
      drawPacket(p, t);
    }

    raf = requestAnimationFrame(frame);
  }

  function running() {
    return !REDUCED && inView && !document.hidden && W > 0;
  }

  // sync the held glow to the hero chip's hover/focus state
  document.addEventListener('curie:chip-hover', function (e) {
    if (REDUCED) return;
    hoverTarget = (e.detail && e.detail.hovered) ? 1 : 0;
    if (hoverTarget) { hoverSweepT0 = performance.now(); syncColors(); }
    kick();
  });
  function kick() {
    if (raf || !running()) return;
    var now = performance.now();
    if (nextAt < now) { nextAt = now + 900; packets.length = 0; }
    raf = requestAnimationFrame(frame);
  }

  function drawStatic() {
    if (!skel || !geo || !(W > 0)) return;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(skel, 0, 0, W, H);
    glowDot(geo.ccx, geo.ccy, 1.9, TAIL, 0.7);
    glowDot(geo.term.x, geo.term.y, 1.6, TAIL, 0.55);
  }

  /* ---------- sizing / lifecycle ---------- */
  function resize() {
    var r = el.getBoundingClientRect();
    if (r.width < 60) return;
    W = r.width;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    geo = buildGeo();
    buildSkeleton();
    // Show the resting board once geometry exists; the live animation only
    // takes over the canvas once the hero title has loaded (kick()).
    if (!REDUCED && window.__curieTitleReady) kick();
    else drawStatic();
  }

  resize();

  if (window.ResizeObserver) {
    new ResizeObserver(function () {
      var w = el.getBoundingClientRect().width;
      if (Math.abs(w - W) > 1) resize();
    }).observe(el);
  } else {
    window.addEventListener('resize', resize);
  }

  if (window.IntersectionObserver) {
    new IntersectionObserver(function (en) {
      inView = en[0].isIntersecting;
      if (inView) kick();
    }).observe(el);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });

  // crisper label once the webfont lands
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      buildSkeleton();
      // redraw the resting board with the crisper label while idle; the live
      // loop repaints on its own once running.
      if (!raf) drawStatic();
    });
  }

  if (REDUCED) {
    drawStatic();
  } else if (window.__curieTitleReady) {
    kick();
  } else {
    // Hold the packet/breathe animation until the hero title has fully loaded;
    // resize() has already drawn the resting board. When a valid size only
    // arrives later (element starts <60px), resize() re-checks this flag.
    document.addEventListener('curie:title-ready', function () {
      nextAt = performance.now() + 600;  // first packet shortly after the title lands
      kick();
    }, { once: true });
  }

  // palette switcher hook
  window.MetaCircuit = {
    syncColors: function () {
      syncColors();
      if (geo) { buildSkeleton(); if (!raf) drawStatic(); }
    }
  };
})();
