// One-shot "hero title fully loaded" signal. The rotor and the meta-circuit
// animation both wait on this so they only start once the liquid title has
// finished crystallising (core lit → glint sweep complete). Idempotent, so a
// title replay re-firing it is harmless — consumers listen `once`.
function signalTitleReady() {
  if (window.__curieTitleReady) return;
  window.__curieTitleReady = true;
  try { document.dispatchEvent(new Event('curie:title-ready')); } catch (e) {}
}

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

// Load animation removed. The title renders in its final settled state — the
// full name in rest liquid filters, all layers visible — straight from the
// markup, so there's nothing to animate. This just normalises that state (in
// case a prior boot left it mid-flight) and fires the ready signal that the
// rotor and meta-circuit wait on. The returned controller is inert: the
// circuit's setProgress()/finish() calls are accepted and ignored.
function bootLiquidTitle() {
  const NOOP = { setProgress() {}, finish() {}, cancel() {} };
  const svg = document.getElementById("hero-name-svg");
  if (!svg) { signalTitleReady(); return NOOP; }

  svg.querySelectorAll(".t-line1").forEach((el) => { el.textContent = "Mahfuj"; });
  svg.querySelectorAll(".t-line2").forEach((el) => { el.textContent = "Mustafa"; });

  const ink = svg.querySelector(".t-ink");
  if (ink) ink.style.opacity = "";
  svg.querySelectorAll('g[filter="url(#liquid-shadow)"], g[filter="url(#liquid-glint)"]')
     .forEach((g) => { g.style.display = ""; });

  signalTitleReady();
  return NOOP;
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
