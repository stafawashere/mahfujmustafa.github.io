function typeHero(cmdEl, onDone) {
  const cmd = 'whoami --verbose';
  let i = 0;
  const tick = () => {
    if (i <= cmd.length) {
      cmdEl.textContent = cmd.slice(0, i);
      i++;
      setTimeout(tick, 65);
    } else {
      onDone && onDone();
    }
  };
  tick();
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

  const step = (now) => {
    const elapsed = now - start;
    const t       = Math.min(elapsed / duration, 1);
    const eased   = 1 - Math.pow(1 - t, 3);
    const val     = Math.round(eased * target);
    el.textContent = val.toLocaleString() + 'M+ player visits';
    if (t < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

function bootHeroName(h1El, revealMs) {
  const glyphs = '!<>-_\\/[]{}=+*^?#$%01ABCDEFGHKXZ';
  const startDelay = 140;
  const dur = Math.max(200, (revealMs || 650) - startDelay);
  const t0 = performance.now();

  const l1El = document.getElementById('hero-l1');
  const l2El = document.getElementById('hero-l2');
  if (!l1El || !l2El) return;

  const F1 = 'MAHFUJ', F2 = 'MUSTAFA';

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function buildCells(el, word) {
    el.textContent = '';
    return word.split('').map(() => {
      const cell = document.createElement('span');
      cell.className = 'name-glyph';
      el.appendChild(cell);
      return cell;
    });
  }

  const cells1 = buildCells(l1El, F1);
  const cells2 = buildCells(l2El, F2);

  function paint(word, cells, t) {
    for (let index = 0; index < word.length; index++) {
      const cell = cells[index];
      const lock = 0.32 + (index / word.length) * 0.68;

      if (t >= lock) {
        if (!cell.classList.contains('is-set')) {
          cell.textContent = word[index];
          cell.classList.add('is-set');
        }
      } else if (t < lock - 0.42) {
        cell.textContent = ' ';
      } else {
        cell.textContent = glyphs[(Math.random() * glyphs.length) | 0];
      }
    }
  }

  const tick = () => {
    const t = clamp((performance.now() - t0 - startDelay) / dur, 0, 1);
    paint(F1, cells1, t);
    paint(F2, cells2, t);
    if (t < 1) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}
