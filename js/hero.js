function startRotor(rotorEl) {
  const words = PORTFOLIO.rotor;
  let w = 0, j = 0, deleting = false;
  let heroVisible = true;
  let pending = null;

  const heroEl = document.getElementById("hero");
  if (heroEl && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(entries => {
      heroVisible = entries.some(e => e.isIntersecting);
      if (heroVisible && pending) {
        const resume = pending;
        pending = null;
        resume();
      }
    });
    io.observe(heroEl);
  }

  const schedule = (ms) => setTimeout(() => {
    if (!heroVisible) { pending = loop; return; }
    loop();
  }, ms);

  const loop = () => {
    const word = words[w];
    if (!deleting) {
      j++;
      rotorEl.textContent = word.slice(0, j);
      if (j === word.length) {
        deleting = true;
        schedule(1500);
        return;
      }
    } else {
      j--;
      rotorEl.textContent = word.slice(0, j);
      if (j === 0) {
        deleting = false;
        w = (w + 1) % words.length;
        schedule(320);
        return;
      }
    }
    schedule(deleting ? 38 : 78);
  };

  loop();
}

function animateHeroCount(el, target, durationMs) {
  const duration = Math.max(400, durationMs || 1800);
  const start    = performance.now();
  let lastWrite  = 0;

  const step = (now) => {
    const elapsed = now - start;
    const t       = Math.min(elapsed / duration, 1);

    if (t < 1 && now - lastWrite < 50) { requestAnimationFrame(step); return; }
    lastWrite = now;

    const eased = 1 - Math.pow(1 - t, 3);
    const val   = Math.round(eased * target);
    const text  = val.toLocaleString() + 'M+ player visits';
    if (text !== el.textContent) el.textContent = text;

    if (t < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

const LIQUID_REST_WARP  = { scale: 3, blur: 3.5 };
const LIQUID_MOLTEN_WARP = { scale: 84, blur: 13 };

const LIQUID_REST_LIGHT = {
  diffuse: [194, 198, 220],
  sheen:   [185, 179, 242],
  glint:   [255, 255, 255]
};

function accentRgb() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--purple-rgb");
  const parts = raw.split(",").map((part) => parseInt(part.trim(), 10));

  const isValidTriple = parts.length === 3 && parts.every((channel) => isFinite(channel));
  return isValidTriple ? parts : [126, 136, 255];
}

function lightenRgb(rgb, amt) {
  return rgb.map((channel) => Math.round(channel + (255 - channel) * amt));
}

function mixRgb(from, to, t) {
  return from.map((channel, i) => Math.round(channel + (to[i] - channel) * t));
}

function rgbCss(rgb) {
  return "rgb(" + rgb.join(",") + ")";
}

let liquidBootGen = 0;

function bootLiquidTitle(revealMs) {
  const svg = document.getElementById("hero-name-svg");
  if (!svg) return;

  const line1Els = svg.querySelectorAll(".t-line1");
  const line2Els = svg.querySelectorAll(".t-line2");
  if (!line1Els.length || !line2Els.length) return;

  const ink      = svg.querySelector(".t-ink");
  // Boot mutates only the inflate chain; shadow + glint layers are hidden during
  // the scramble so each tick rasters one filter chain instead of three (F16).
  const warpEls  = svg.querySelectorAll("#liquid-inflate feDisplacementMap");
  const blurEls  = svg.querySelectorAll("#liquid-inflate feGaussianBlur");
  const glintWarpEls = svg.querySelectorAll("#liquid-glint feDisplacementMap");
  const glintBlurEls = svg.querySelectorAll("#liquid-glint feGaussianBlur");
  const shadowLayer  = svg.querySelector('g[filter="url(#liquid-shadow)"]');
  const glintLayer   = svg.querySelector('g[filter="url(#liquid-glint)"]');
  const lightEls = svg.querySelectorAll(".mv-light");

  const diffuseEls = svg.querySelectorAll("feDiffuseLighting");
  const sheenEls   = svg.querySelectorAll("feSpecularLighting[result='spec2']");
  const glintEls   = svg.querySelectorAll("feSpecularLighting[result='spec']");

  const gen = ++liquidBootGen;

  const glyphs = "!<>-_\\/[]{}=+*^?#$%01ABCDEFGHKXZ";
  const F1 = "Mahfuj", F2 = "Mustafa";
  const total = F1.length + F2.length;

  const setLines = (a, b) => {
    line1Els.forEach((el) => { el.textContent = a; });
    line2Els.forEach((el) => { el.textContent = b; });
  };

  const setWarp = (scale, blur) => {
    warpEls.forEach((el) => el.setAttribute("scale", scale));
    blurEls.forEach((el) => el.setAttribute("stdDeviation", blur));
  };

  const accent = accentRgb();
  const hotLight = {
    diffuse: lightenRgb(accent, 0.12),
    sheen:   lightenRgb(accent, 0.35),
    glint:   lightenRgb(accent, 0.55)
  };

  const setLighting = (diffuse, sheen, glint) => {
    diffuseEls.forEach((el) => el.setAttribute("lighting-color", rgbCss(diffuse)));
    sheenEls.forEach((el) => el.setAttribute("lighting-color", rgbCss(sheen)));
    glintEls.forEach((el) => el.setAttribute("lighting-color", rgbCss(glint)));
  };

  const settle = () => {
    setLines(F1, F2);
    setWarp(LIQUID_REST_WARP.scale, LIQUID_REST_WARP.blur);
    glintWarpEls.forEach((el) => el.setAttribute("scale", LIQUID_REST_WARP.scale));
    glintBlurEls.forEach((el) => el.setAttribute("stdDeviation", LIQUID_REST_WARP.blur));
    setLighting(LIQUID_REST_LIGHT.diffuse, LIQUID_REST_LIGHT.sheen, LIQUID_REST_LIGHT.glint);
    if (shadowLayer) shadowLayer.style.display = "";
    if (glintLayer)  glintLayer.style.display = "";
    if (ink) ink.style.opacity = "";
  };

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lowPower = (navigator.hardwareConcurrency || 8) <= 4;
  const isSafari = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent);
  if (prefersReducedMotion || lowPower || isSafari) {
    settle();
    return;
  }

  const startDelay = 140;
  const totalDur = Math.max(400, (revealMs || 650) - startDelay);
  const sweepDur = Math.min(760, Math.round(totalDur * 0.45));
  const settleDur = Math.max(200, totalDur - sweepDur);
  const tickMs = 50; // 20Hz — the liquid wobble reads the same, at 2/3 the raster load
  const t0 = performance.now();
  let lastTick = 0;
  let sweepStart = 0;

  setLines("", "");
  setWarp(LIQUID_MOLTEN_WARP.scale, LIQUID_MOLTEN_WARP.blur);
  setLighting(hotLight.diffuse, hotLight.sheen, hotLight.glint);
  if (ink) ink.style.opacity = "0";

  // Park the glint chain at rest values and skip rastering shadow + glint
  // entirely while the scramble runs; settle() reveals them for the sweep.
  glintWarpEls.forEach((el) => el.setAttribute("scale", LIQUID_REST_WARP.scale));
  glintBlurEls.forEach((el) => el.setAttribute("stdDeviation", LIQUID_REST_WARP.blur));
  if (shadowLayer) shadowLayer.style.display = "none";
  if (glintLayer)  glintLayer.style.display = "none";

  const sweepStartY = Math.round((svg.viewBox.baseVal.height || 370) * 0.35);
  lightEls.forEach((light) => { light.setAttribute("x", -140); light.setAttribute("y", sweepStartY); });

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function paintSettle(t, scramble) {
    const eased = 1 - Math.pow(1 - t, 3);
    const scale = LIQUID_MOLTEN_WARP.scale + (LIQUID_REST_WARP.scale - LIQUID_MOLTEN_WARP.scale) * eased;
    const blur  = LIQUID_MOLTEN_WARP.blur  + (LIQUID_REST_WARP.blur  - LIQUID_MOLTEN_WARP.blur)  * eased;
    setWarp(scale.toFixed(2), blur.toFixed(2));

    setLighting(
      mixRgb(hotLight.diffuse, LIQUID_REST_LIGHT.diffuse, eased),
      mixRgb(hotLight.sheen, LIQUID_REST_LIGHT.sheen, eased),
      mixRgb(hotLight.glint, LIQUID_REST_LIGHT.glint, eased)
    );

    if (ink) ink.style.opacity = clamp(t / 0.3, 0, 1).toFixed(3);

    if (!scramble) return;

    const locked = Math.floor(t * total);
    const glitch = () => glyphs[(Math.random() * glyphs.length) | 0];

    let out1, out2;
    if (locked < F1.length) {
      out1 = F1.slice(0, locked) + glitch();
      out2 = "";
    } else {
      out1 = F1;
      out2 = F2.slice(0, locked - F1.length);
      if (locked < total) out2 += glitch();
    }

    setLines(out1, out2);
  }

  function paintSweep(t) {
    const vb = svg.viewBox.baseVal;
    const width  = vb.width  || 1480;
    const height = vb.height || 370;

    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const x = Math.round(-140 + (width + 280) * eased);
    const y = Math.round(height * 0.35);
    const heat = Math.sin(Math.PI * t);
    const z = Math.round(170 + 70 * heat);

    lightEls.forEach((light) => {
      light.setAttribute("x", x);
      light.setAttribute("y", y);
      light.setAttribute("z", z);
    });

    glintEls.forEach((el) => {
      el.setAttribute("lighting-color", rgbCss(mixRgb(LIQUID_REST_LIGHT.glint, hotLight.glint, heat)));
    });
  }

  function frame(now) {
    if (gen !== liquidBootGen) return;

    const shouldPaint = now - lastTick >= tickMs;

    if (!sweepStart) {
      const t = clamp((now - t0 - startDelay) / settleDur, 0, 1);

      if (t >= 1) {
        settle();
        sweepStart = now;
      } else if (shouldPaint && t > 0) {
        lastTick = now;
        paintSettle(t, true);
      }

      requestAnimationFrame(frame);
      return;
    }

    const t = clamp((now - sweepStart) / sweepDur, 0, 1);

    if (t >= 1) {
      paintSweep(1);
      lightEls.forEach((light) => light.setAttribute("z", 170));
      return;
    }

    if (shouldPaint) {
      lastTick = now;
      paintSweep(t);
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

function initLiquidTitle() {
  const svg = document.getElementById('hero-name-svg');
  if (!svg) return;

  const hint = document.querySelector('.scroll-hint');

  function circuitMaxRight() {
    const vw = document.documentElement.clientWidth;
    const skills = document.getElementById('skills');
    if (!skills || vw <= 560) return Infinity;

    const padR = Math.min(skills.getBoundingClientRect().right, vw - 30);
    const rightBusX = Math.min(vw - 16, padR + 46);
    const chipHardMax = rightBusX - 74;
    const chipClearance = 120;

    return chipHardMax - chipClearance;
  }

  function layoutTitle() {
    const stacked = document.documentElement.clientWidth <= 640;
    const line1 = svg.querySelector('.t-line1');
    const line2 = svg.querySelector('.t-line2');
    if (!line1 || !line2) return;

    const keep1 = line1.textContent;
    const keep2 = line2.textContent;
    line1.textContent = 'Mahfuj';
    line2.textContent = 'Mustafa';
    const len1 = line1.getComputedTextLength();
    const len2 = line2.getComputedTextLength();
    line1.textContent = keep1;
    line2.textContent = keep2;

    if (stacked) {
      svg.querySelectorAll('.t-line2').forEach((el) => {
        el.setAttribute('x', 10);
        el.setAttribute('y', 515);
      });
      svg.setAttribute('viewBox', '0 -40 ' + Math.ceil(Math.max(len1, len2) + 20) + ' 660');
    } else {
      const x2 = Math.round(10 + len1 + 55);
      svg.querySelectorAll('.t-line2').forEach((el) => {
        el.setAttribute('x', x2);
        el.setAttribute('y', 225);
      });
      svg.setAttribute('viewBox', '0 -40 ' + Math.ceil(x2 + len2 + 10) + ' 370');
    }
  }

  function fitTitleToViewport() {
    if (!hint) return;

    layoutTitle();

    const vb = svg.viewBox.baseVal;
    const aspect = vb.width / vb.height;
    const bottomMargin = 28;
    const minWidth = 300;

    svg.parentElement.style.paddingTop = '0px';

    for (let pass = 0; pass < 3; pass++) {
      const svgRect = svg.getBoundingClientRect();
      const viewportMaxW = document.documentElement.clientWidth - svgRect.left - 40;
      const circuitMaxW = circuitMaxRight() - svgRect.left;
      const maxW = Math.min(viewportMaxW, circuitMaxW);
      const hintBottom = hint.getBoundingClientRect().bottom + window.scrollY;

      const room = (window.innerHeight - bottomMargin) - hintBottom;
      const targetH = svgRect.height + room;
      const targetW = Math.min(maxW, Math.max(minWidth, targetH * aspect));

      svg.style.width = Math.round(targetW) + 'px';
      svg.style.maxWidth = 'none';
    }
  }

  fitTitleToViewport();
  window.addEventListener('load', fitTitleToViewport);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTitleToViewport);

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitTitleToViewport, 100);
  });

  const lights = svg.querySelectorAll('.mv-light');
  if (!lights.length) return;

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  if (coarsePointer) return;

  let heroVisible = true;
  const hero = document.getElementById('hero');
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      heroVisible = entries[0].isIntersecting;
    }).observe(hero);
  }

  let pendingEvent = null;
  let rafId = 0;
  let lastX = -1, lastY = -1;

  function applyLight() {
    rafId = 0;
    const e = pendingEvent;
    pendingEvent = null;

    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const reach = rect.height * 0.6;
    const nearTitle = e.clientX > rect.left - reach && e.clientX < rect.right + reach
                   && e.clientY > rect.top - reach && e.clientY < rect.bottom + reach;
    if (!nearTitle) return;

    const vb = svg.viewBox.baseVal;
    const x = Math.round(((e.clientX - rect.left) / rect.width) * vb.width);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * vb.height);

    const moved = Math.abs(x - lastX) + Math.abs(y - lastY);
    if (moved < 14) return;

    lastX = x;
    lastY = y;

    lights.forEach((light) => {
      light.setAttribute('x', x);
      light.setAttribute('y', y);
    });
  }

  window.addEventListener('pointermove', (e) => {
    if (!heroVisible) return;

    pendingEvent = e;
    if (!rafId) rafId = requestAnimationFrame(applyLight);
  }, { passive: true });
}
