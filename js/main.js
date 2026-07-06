(function () {

  const touchOnly = window.matchMedia('(hover: none)');

  function iconImg(url, size) {
    if (!url) return null;
    // Render the icon as a CSS mask tinted with currentColor instead of a raw
    // <img>. This keeps every icon locked to the active theme accent and makes
    // it immune to the simpleicons CDN occasionally serving brand-colored
    // fallbacks (which showed up as mismatched icon colors).
    const span = document.createElement('span');
    span.className = 'tech-ico';
    span.setAttribute('aria-hidden', 'true');
    span.style.setProperty('--ico', 'url("' + url + '")');
    if (size) {
      span.style.width  = size + 'px';
      span.style.height = size + 'px';
    }
    return span;
  }

  function buildNav() {
    const container = document.getElementById('nav-links');
    if (!container) return;

    const nav     = document.getElementById('nav');
    const menuBtn = document.getElementById('nav-menu-btn');

    function closeMenu() {
      if (!nav) return;
      nav.classList.remove('is-menu-open');
      if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
    }

    if (menuBtn && nav) {
      menuBtn.addEventListener('click', () => {
        const open = nav.classList.toggle('is-menu-open');
        menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });

      document.addEventListener('click', (e) => {
        if (!nav.contains(e.target)) closeMenu();
      });
    }

    const navItems = [
      { label: 'skills',     id: 'skills' },
      { label: 'projects',   id: 'work' },
      { label: 'experience', id: 'experience' },
      { label: 'education',  id: 'education' },
      { label: 'contact',    id: 'contact' },
    ];

    navItems.forEach(item => {
      const a = document.createElement('a');
      a.className   = 'nav-link';
      a.textContent = item.label;
      a.addEventListener('click', () => {
        closeMenu();
        scrollToSection(item.id);
      });
      container.appendChild(a);
    });

    const shellLink = document.createElement('a');
    shellLink.className   = 'nav-link nav-link-shell';
    shellLink.textContent = 'shell';
    shellLink.setAttribute('aria-pressed', 'false');
    shellLink.addEventListener('click', () => {
      closeMenu();
      termWin.toggle();
    });
    container.appendChild(shellLink);

    const syncShellState = () => {
      const isOpen = termWin.isOpen();
      shellLink.classList.toggle('is-active', isOpen);
      shellLink.setAttribute('aria-pressed', isOpen ? 'true' : 'false');
    };

    termWin.onOpen  = syncShellState;
    termWin.onClose = syncShellState;
    syncShellState();
  }

  function buildSkills() {
    const specialtiesEl = document.getElementById('skills-specialties');
    const coreEl        = document.getElementById('skills-core');
    const supportingEl  = document.getElementById('skills-supporting');
    if (!specialtiesEl || !coreEl || !supportingEl) return;

    PORTFOLIO.specialties.forEach(s => {
      const span = document.createElement('span');
      span.className   = 'tag is-highlight';
      span.textContent = s;
      specialtiesEl.appendChild(span);
    });

    PORTFOLIO.coreStack.forEach(c => {
      const span = document.createElement('span');
      span.className = 'tag lang';
      const img = iconImg(c.icon, 14);
      if (img) span.appendChild(img);
      span.append(c.label);
      coreEl.appendChild(span);
    });

    PORTFOLIO.supporting.forEach(t => {
      const span = document.createElement('span');
      span.className = 'tag';
      const img = iconImg(t.icon, 14);
      if (img) span.appendChild(img);
      span.append(t.label);
      supportingEl.appendChild(span);
    });
  }

  function buildExperience() {
    const list = document.getElementById('experience-content');
    if (!list) return;

    PORTFOLIO.experiences.forEach(x => {
      const card = document.createElement('div');
      card.className = 'exp-card';

      const meta = document.createElement('div');
      const org  = document.createElement('a');
      org.className  = 'exp-org';
      org.href       = x.url;
      org.target     = '_blank';
      org.rel        = 'noopener';
      const orgWords = x.org.split(' ');
      const orgTail  = orgWords.pop();
      const orgHead  = orgWords.length ? orgWords.join(' ') + ' ' : '';
      org.innerHTML  = orgHead + '<span class="arrow-wrap">' + orgTail + '&nbsp;<span class="arrow">↗</span></span>';

      const role  = document.createElement('div');
      role.className   = 'exp-role';
      role.textContent = x.role;

      const dates  = document.createElement('div');
      dates.className   = 'exp-dates';
      dates.textContent = x.dates;

      meta.appendChild(org);
      meta.appendChild(role);
      meta.appendChild(dates);

      const ul = document.createElement('ul');
      ul.className = 'exp-points';
      x.points.forEach(pt => {
        const li = document.createElement('li');
        li.textContent = pt;
        ul.appendChild(li);
      });

      card.appendChild(meta);
      card.appendChild(ul);
      list.appendChild(card);
    });
  }

  function buildProjects() {
    const grid = document.getElementById('work-content');
    if (!grid) return;

    PORTFOLIO.projects.forEach((p, index) => {
      const card = document.createElement('a');
      card.className = p.featured ? 'project-card is-featured' : 'project-card';
      card.href      = p.url;
      card.target    = '_blank';
      card.rel       = 'noopener';
      card.style.setProperty('--i', index);

      const fx = document.createElement('span');
      fx.className = 'card-fx';
      card.appendChild(fx);

      const date = document.createElement('span');
      date.className   = 'project-date';
      date.textContent = p.date;

      const nameWords = p.name.split(' ');
      const nameTail  = nameWords.pop();
      const nameHead  = nameWords.length ? nameWords.join(' ') + ' ' : '';
      const name = document.createElement('span');
      name.className = 'project-name';
      name.innerHTML = nameHead + '<span class="arrow-wrap">' + nameTail + '&nbsp;<span class="arrow">↗</span></span>';

      const type = document.createElement('div');
      type.className   = 'project-type';
      type.textContent = p.type;

      const desc = document.createElement('p');
      desc.className   = 'project-desc';
      desc.textContent = p.desc;

      const tech = document.createElement('div');
      tech.className = 'project-tech';
      p.tech.forEach(label => {
        const badge = document.createElement('span');
        badge.className = 'tech-badge';
        const slug = PORTFOLIO.techIcons[label];
        if (slug) {
          const img = iconImg('https://cdn.simpleicons.org/' + slug, 15);
          if (img) badge.appendChild(img);
        }
        badge.append(label);
        tech.appendChild(badge);
      });

      if (p.featured) {
        const flag = document.createElement('span');
        flag.className = 'project-flag';
        flag.textContent = 'FEATURED';
        card.appendChild(flag);
      }

      card.appendChild(date);
      card.appendChild(name);
      card.appendChild(type);
      card.appendChild(desc);
      card.appendChild(tech);
      grid.appendChild(card);
    });
  }

  function initCardGleam() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduceMotion.matches) return;

    const cards = Array.from(document.querySelectorAll('.project-card.is-featured'));
    if (!cards.length) return;

    const visible = new Set();

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      });
    }, { threshold: 0.5 });
    cards.forEach(card => observer.observe(card));

    let rotation = 0;

    function tick() {
      const idle = card =>
        visible.has(card) && !card.matches(':hover') && !card.contains(document.activeElement);
      const candidates = cards.filter(idle);

      if (candidates.length && !document.hidden) {
        rotation += 1;

        candidates.forEach(card => {
          card.classList.add('is-gleam');
          card.addEventListener('animationend', () => card.classList.remove('is-gleam'), { once: true });
        });
      }

      const jitterMs = (rotation % 3) * 6000;
      setTimeout(tick, 16000 + jitterMs);
    }

    setTimeout(tick, 5000);
  }

  // F2: pause off-screen blurred glows so they don't composite a large blurred
  // texture every frame while out of view.
  function initFxGating() {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => e.target.classList.toggle('fx-paused', !e.isIntersecting));
    }, { rootMargin: '120px' });
    ['hero', 'work', 'contact'].forEach(id => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }

  function initAutoFocus() {
    if (!touchOnly.matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const SELECTOR = '.project-card, .exp-card, .edu-card, .tag';
    const FOCAL_FRAC = 0.42;
    const MIN_VISIBLE = 0.65;
    const STICKINESS = 0.72;

    let current = null;
    let throttled = false;
    let trailing = false;
    // F8: DOM is static after build — query the scorable nodes once instead of
    // re-running querySelectorAll on every (throttled) scroll/resize pass.
    let cards = null;

    function visibleRatio(rect) {
      if (!rect.height || rect.bottom <= 0 || rect.top >= window.innerHeight) return 0;
      return (Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0)) / rect.height;
    }

    function focalDistance(rect, focalY) {
      return Math.abs((rect.top + rect.bottom) / 2 - focalY);
    }

    function setFocus(el) {
      if (el === current) return;

      if (current) {
        current.classList.remove('is-autofocus');
        current.dispatchEvent(new Event('mouseleave'));
      }

      current = el;

      if (current) {
        current.classList.add('is-autofocus');
        current.dispatchEvent(new Event('mouseenter'));
      }
    }

    function update() {
      const focalY = window.innerHeight * FOCAL_FRAC;
      let best = null;
      let bestScore = Infinity;

      if (!cards) cards = document.querySelectorAll(SELECTOR);
      cards.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (visibleRatio(rect) < MIN_VISIBLE) return;

        const score = focalDistance(rect, focalY);
        if (score < bestScore) {
          bestScore = score;
          best = el;
        }
      });

      if (current && best && best !== current) {
        const rect = current.getBoundingClientRect();
        const currentStillValid = visibleRatio(rect) >= MIN_VISIBLE;
        const newcomerClearlyCloser = bestScore < focalDistance(rect, focalY) * STICKINESS;
        if (currentStillValid && !newcomerClearlyCloser) best = current;
      }

      setFocus(best);
    }

    function onScroll() {
      if (throttled) {
        trailing = true;
        return;
      }

      throttled = true;
      update();

      setTimeout(() => {
        throttled = false;
        if (trailing) {
          trailing = false;
          onScroll();
        }
      }, 90);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    setTimeout(update, 700);
  }

  function buildEducation() {
    const grid = document.getElementById('education-content');
    if (!grid) return;

    PORTFOLIO.education.forEach(e => {
      const card = document.createElement('div');
      card.className = 'edu-card';

      const dates = document.createElement('span');
      dates.className   = 'edu-dates';
      dates.textContent = e.dates;

      const name = document.createElement('a');
      name.className   = 'edu-name';
      name.href        = e.url;
      name.target      = '_blank';
      name.rel         = 'noopener';
      name.textContent = e.name;

      const kind = document.createElement('div');
      kind.className   = 'edu-kind';
      kind.textContent = e.kind;

      const note = document.createElement('p');
      note.className   = 'edu-note';
      note.textContent = e.note;

      card.appendChild(dates);
      card.appendChild(name);
      card.appendChild(kind);
      card.appendChild(note);
      grid.appendChild(card);
    });
  }

  function syncBackgroundHeight() {
    if (!("ResizeObserver" in window)) return;

    const root = document.getElementById("root");
    if (!root) return;

    document.body.style.setProperty("--bg-h", root.offsetHeight + "px");
  }

  function initBackgroundSizing() {
    if (!("ResizeObserver" in window)) return;

    const root = document.getElementById("root");
    if (!root) return;

    let syncTimer = null;
    const rootObserver = new ResizeObserver(() => {
      const sectionIsAnimating = document.querySelector(".section-body.is-animating") !== null;

      if (sectionIsAnimating) return;

      clearTimeout(syncTimer);
      syncTimer = setTimeout(syncBackgroundHeight, 100);
    });

    rootObserver.observe(root);
    syncBackgroundHeight();
  }

  function initSections() {
    document.querySelectorAll('.section-header').forEach(header => {
      const body = header.nextElementSibling;
      if (!body) return;

      header.classList.add('is-open');
      body.classList.add('is-open');

      body.addEventListener('transitionend', (e) => {
        const rowsFinished = e.target === body && e.propertyName === 'grid-template-rows';

        if (!rowsFinished) return;

        body.classList.remove('is-animating');
        syncBackgroundHeight();
      });

      header.addEventListener('click', () => {
        body.classList.add('is-animating');

        const open = header.classList.toggle('is-open');
        body.classList.toggle('is-open', open);
      });
    });
  }

  function initContactEmailCopy() {
    const link = document.querySelector(".contact-email");

    if (!link || !navigator.clipboard) return;

    const address = link.textContent;
    let restoreTimer = null;

    link.addEventListener("click", (e) => {
      e.preventDefault();

      navigator.clipboard.writeText(address).then(() => {
        link.textContent = "copied to clipboard";
        link.classList.add("is-copied");

        clearTimeout(restoreTimer);
        restoreTimer = setTimeout(() => {
          link.textContent = address;
          link.classList.remove("is-copied");
        }, 1400);
      }).catch(() => {
        window.location.href = link.href;
      });
    });
  }

  function initSectionReveals() {
    const revealEls = document.querySelectorAll('.section-reveal');

    if (!('IntersectionObserver' in window)) {
      revealEls.forEach(el => el.classList.add('is-revealed'));
      return;
    }

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add('is-revealed');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px' });

    revealEls.forEach(el => revealObserver.observe(el));
  }

  function coreLitMs() {
    const schema = window.CURIE_ANIM_SCHEMA || {};
    const read = (k) => {
      const s = schema[k];
      if (!s) return 0;
      let v = animCfg[k];
      if (v == null || v === '') v = s.def;
      v = +v;
      if (!isFinite(v)) v = s.def;
      return v < s.min ? s.min : v > s.max ? s.max : v;
    };

    const arriveMs  = read('bootDurationMs') * read('bootArriveFrac');
    const ingressMs = read('bootIngressMs');
    const fillMs    = read('bootFillMs');
    const fullFrac  = read('coreFullFrac');

    // core "fully lit" = the fill phase has swept in to coreFullFrac. Kept in
    // lock-step with the circuit's own coreLitMs() so the title reveal, the
    // count-up, and the boot animation all resolve on the same beat.
    return arriveMs + ingressMs + fillMs * fullFrac;
  }

  function terminalOpenedBefore() {
    try { return localStorage.getItem('mm_term_opened') === '1'; } catch (e) { return false; }
  }

  function initHero() {
    initLiquidTitle();

    let titleStarted = false;
    const startTitle = () => {
      if (titleStarted) return;
      titleStarted = true;
      titleBoot = bootLiquidTitle();
      // catch up to whatever the circuit boot has already reached, so a late
      // start (slow fonts) picks up mid-boot instead of restarting the clock
      titleBoot.setProgress(coreProgress);
      if (coreLit) { titleBoot.finish(); return; }

      // Safety net: if the circuit never drives the reveal at all (unexpected —
      // e.g. hooks not wired), self-drive on a local clock after a grace window
      // so the title can't sit scrambling forever. A live circuit — even a slow one
      // — will have emitted progress by then, so we defer to it and skip this.
      const grace = coreLitMs() + 2000;
      setTimeout(() => {
        if (!coreLit && coreProgress <= 0) startLocalBootFeed();
      }, grace);
    };
    if (document.fonts && document.fonts.load) {
      document.fonts.load('200px Pacifico').then(startTitle, startTitle);
      setTimeout(startTitle, 300);
    } else {
      startTitle();
    }

    const countEl = document.getElementById('hero-count');
    if (countEl) {
      animateHeroCount(countEl, PORTFOLIO.playerVisits, coreLitMs());
    }

    const rotorEl = document.getElementById('hero-rotor');
    if (rotorEl) {
      // hold the roles rotor until the liquid title has fully loaded
      if (window.__curieTitleReady) startRotor(rotorEl);
      else document.addEventListener('curie:title-ready',
        () => startRotor(rotorEl), { once: true });
    }

    const workBtn    = document.getElementById('hero-work-btn');
    const contactBtn = document.getElementById('hero-contact-btn');
    if (workBtn)    workBtn.addEventListener('click',    () => scrollToSection('work'));
    if (contactBtn) contactBtn.addEventListener('click', () => scrollToSection('contact'));
  }

  function buildChips(term) {
    const chipsEl = document.getElementById('term-chips');
    if (!chipsEl) return;

    PORTFOLIO.termChips.forEach(cmd => {
      const btn = document.createElement('button');
      btn.className = 'chip-btn';
      btn.innerHTML = '<span class="dollar">$</span> ' + cmd;
      btn.addEventListener('click', () => {
        term.run(cmd);
        const inp = document.getElementById('term-input');
        if (inp) inp.focus();
      });
      chipsEl.appendChild(btn);
    });
  }

  function showRootFlash() {
    const flash = document.getElementById('root-flash');
    if (!flash) return;
    flash.hidden = false;
    setTimeout(() => { flash.hidden = true; }, 1450);
  }

  function initKonami(onUnlock) {
    const seq  = ['arrowup','arrowup','arrowdown','arrowdown','arrowleft','arrowright','arrowleft','arrowright','b','a'];
    const buf  = [];
    window.addEventListener('keydown', e => {
      buf.push(e.key.toLowerCase());
      if (buf.length > seq.length) buf.shift();
      if (buf.length === seq.length && seq.every((k, i) => buf[i] === k)) {
        buf.length = 0;
        e.preventDefault();
        onUnlock();
      }
    });
  }

  function scrollToSection(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 76;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  function initLogo() {
    const logo = document.getElementById('nav-logo');
    if (logo) logo.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // Scroll-focus brightening for section headers, independent of the circuit.
  // On desktop the board's draw loop owns `.is-focused` (it lights the node
  // nearest the 40% viewport line); below 561px the board never runs, so this
  // mirrors that same rule off a lightweight scroll listener. Guarded to the
  // no-chip viewport so the two never fight over the class.
  function initSectionFocusFallback() {
    if (document.documentElement.clientWidth > 560) return;
    const SECTIONS = ['#skills', '#experience', '#work', '#education', '#contact'];
    const heads = SECTIONS
      .map(sel => document.querySelector(sel + ' .section-header'))
      .filter(Boolean);
    if (!heads.length) return;

    let current = null, ticking = false;
    function update() {
      ticking = false;
      const vh = window.innerHeight;
      const line = vh * 0.4;      // same focus line the circuit uses
      const band = vh * 0.5;      // outside the band nothing is focused
      let best = 1e9, active = null;
      for (const h of heads) {
        const r = h.getBoundingClientRect();
        const d = Math.abs((r.top + r.height / 2) - line);
        if (d < best) { best = d; active = h; }
      }
      if (best > band) active = null;
      if (active !== current) {
        if (current) current.classList.remove('is-focused');
        if (active) active.classList.add('is-focused');
        current = active;
      }
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  function buildContact() {
    const footerEl = document.getElementById('contact-footer');
    if (footerEl) footerEl.textContent = '© 2026 ' + PORTFOLIO.name + ' — ' + PORTFOLIO.location;
  }

  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function lighten(rgb, amt) {
    return {
      r: Math.round(rgb.r + (255 - rgb.r) * amt),
      g: Math.round(rgb.g + (255 - rgb.g) * amt),
      b: Math.round(rgb.b + (255 - rgb.b) * amt),
    };
  }

  function rgbToHex(r, g, b) {
    const c = n => ('0' + Math.max(0, Math.min(255, Math.round(n))).toString(16)).slice(-2);
    return '#' + c(r) + c(g) + c(b);
  }

  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    if (d) {
      if (max === r)      h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else                h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return { h, s: max ? d / max : 0, v: max };
  }
  function hsvToRgb(h, s, v) {
    h = ((h % 360) + 360) % 360;
    const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
    let r = 0, g = 0, b = 0;
    if      (h < 60)  { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else              { r = c; b = x; }
    return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
  }
  function hsvToHex(h, s, v) { const c = hsvToRgb(h, s, v); return rgbToHex(c.r, c.g, c.b); }
  function hexToHsv(hex) { const c = hexToRgb(hex) || { r: 104, g: 71, b: 222 }; return rgbToHsv(c.r, c.g, c.b); }

  function syncLiquidTitleAccent(rgb) {
    const svg = document.getElementById('hero-name-svg');
    if (!svg) return;

    const accent = rgbToHsv(rgb.r, rgb.g, rgb.b);
    const referenceSat = 0.64;
    // accent 30% weaker than the original 1.5 boost → the liquid title reads
    // more white, with only a soft hint of the accent hue.
    const chromaLift = 1.05;
    const satPull = accent.s / referenceSat;

    const retint = (hex) => {
      const c = hexToRgb(hex);
      if (!c) return hex;
      const hsv = rgbToHsv(c.r, c.g, c.b);
      const sat = Math.min(1, hsv.s * chromaLift * satPull);
      return hsvToHex(accent.h, sat, hsv.v);
    };

    svg.querySelectorAll('#liquid-skin stop').forEach(stop => {
      if (!stop.dataset.baseColor) stop.dataset.baseColor = stop.getAttribute('stop-color');
      stop.setAttribute('stop-color', retint(stop.dataset.baseColor));
    });

    svg.querySelectorAll('feDiffuseLighting, feSpecularLighting').forEach(el => {
      if (!el.dataset.baseColor) el.dataset.baseColor = el.getAttribute('lighting-color');
      el.setAttribute('lighting-color', retint(el.dataset.baseColor));
    });
  }

  function applyAccent(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return;
    const lilac = lighten(rgb, 0.34);
    const root = document.documentElement.style;
    root.setProperty('--purple',     hex);
    root.setProperty('--purple-rgb', rgb.r + ', ' + rgb.g + ', ' + rgb.b);
    root.setProperty('--lilac',      'rgb(' + lilac.r + ', ' + lilac.g + ', ' + lilac.b + ')');
    root.setProperty('--lilac-rgb',  lilac.r + ', ' + lilac.g + ', ' + lilac.b);

    // Tag/tech icons are CSS masks tinted with currentColor, so they track
    // --lilac automatically — no per-image recolor needed here.

    syncLiquidTitleAccent(rgb);

    if (circuitSyncColors) circuitSyncColors();
    // Meta-circuit reads --lilac-rgb into its own palette + bakes it into an
    // offscreen skeleton, so it needs an explicit nudge to pick up the new
    // accent (otherwise the static traces stay stale until the next resize).
    if (window.MetaCircuit && window.MetaCircuit.syncColors) window.MetaCircuit.syncColors();
  }

  /* ── settings: "board.cfg" — a draggable tuner window ──────────────────
     Rebuilt from scratch in the terminal-window family (traffic dot, mono
     type, quiet chrome). Sections sit in a left rail with circuit-pad
     indicators; panes show only label + value + slider, and every
     control's help text is read in ONE status bar at the bottom by
     hovering it. The window drags by its titlebar, remembers position,
     and stays open while you interact with the board behind it. */

  function injectTweakStyles() {
    if (document.getElementById('curie-tweak-style')) return;
    const s = document.createElement('style');
    s.id = 'curie-tweak-style';
    s.textContent = `
      #curie-drawer { position:fixed; z-index:1000; display:none; flex-direction:column;
        width:462px; max-width:calc(100vw - 20px); max-height:min(82vh, 620px);
        min-width:360px; min-height:250px; overflow:hidden;
        background:var(--bg-term); border:1px solid #23242b; border-radius:14px;
        box-shadow:0 40px 90px -40px rgba(0,0,0,.9), 0 0 0 1px rgba(var(--purple-rgb),.06);
        color:var(--text-code); font-family:var(--font); font-size:12px;
        opacity:0; transform:translateY(8px) scale(.985); }
      #curie-drawer.st-anim { transition:opacity .2s ease, transform .22s cubic-bezier(.2,.85,.3,1.15); }
      #curie-drawer.st-open { opacity:1; transform:none; }
      .st-titlebar { display:flex; align-items:center; gap:12px; padding:11px 14px; flex:none;
        background:linear-gradient(180deg,#14151b,#0e0f13); border-bottom:1px solid var(--border);
        cursor:move; user-select:none; touch-action:none; }
      .st-close { width:12px; height:12px; border-radius:50%; border:none; padding:0; flex:none;
        background:#f0726b; color:#5b0f0c; cursor:pointer; font-size:9px; line-height:1;
        display:flex; align-items:center; justify-content:center; font-family:inherit; }
      .st-close span { opacity:0; transition:opacity .12s; }
      .st-titlebar:hover .st-close span { opacity:1; }
      .st-title { font-size:12px; color:var(--text-dim); white-space:nowrap; }
      .st-title b { color:var(--text-bright); font-weight:600; }
      .st-status { margin-left:auto; font-size:10px; color:var(--lilac); white-space:nowrap;
        opacity:0; transition:opacity .18s; }
      .st-status.show { opacity:1; }
      .st-body { display:flex; flex:1 1 auto; min-height:0; }
      .st-nav { flex:none; width:116px; display:flex; flex-direction:column; gap:2px; padding:10px 8px;
        background:#0a0b0e; border-right:1px solid var(--border); }
      .st-nav-btn { display:flex; align-items:center; gap:9px; padding:8px 9px; border:none; border-radius:7px;
        background:transparent; color:var(--text-muted); font-family:inherit; font-size:11.5px; text-align:left;
        cursor:pointer; transition:color .15s, background .15s; }
      .st-nav-btn:hover { color:var(--text-bright); background:rgba(255,255,255,.035); }
      .st-nav-btn.on { color:var(--lilac); background:rgba(var(--purple-rgb),.13); }
      .st-pad { width:7px; height:7px; border-radius:50%; border:1.5px solid #33343d; flex:none;
        transition:border-color .15s, background .15s, box-shadow .15s; }
      .st-nav-btn.on .st-pad { border-color:rgba(var(--lilac-rgb),.9); background:var(--purple); box-shadow:0 0 7px rgba(var(--purple-rgb),.8); }
      .st-nav-foot { margin-top:auto; padding-top:6px; border-top:1px solid #16171c; display:flex; flex-direction:column; gap:2px; }
      .st-nav-act { color:var(--text-dim); font-size:10.5px; }
      .st-main { flex:1; min-width:0; min-height:0; display:flex; flex-direction:column; }
      .st-pane { flex:1 1 auto; min-height:0; padding:15px 16px 3px; overflow-y:auto;
        scrollbar-width:thin; scrollbar-color:#2b2c34 transparent; }
      .st-pane::-webkit-scrollbar { width:10px; }
      .st-pane::-webkit-scrollbar-track { background:transparent; }
      .st-pane::-webkit-scrollbar-thumb { background:#2b2c34; border-radius:8px;
        border:3px solid var(--bg-term); background-clip:padding-box; }
      .st-pane::-webkit-scrollbar-thumb:hover { background:#3a3b45; }
      .st-pane.fx { animation:stPaneIn .22s ease; }
      @keyframes stPaneIn { from { opacity:0; transform:translateX(7px); } }
      .st-sec { font-size:11px; color:var(--text-faint); margin:0 0 14px; }
      .st-row { margin:0 0 15px; }
      .st-row-head { display:flex; align-items:baseline; justify-content:space-between; gap:10px; margin-bottom:5px; }
      .st-lbl { color:var(--text-body); font-size:12px; }
      .st-val { color:var(--lilac); font-weight:600; font-variant-numeric:tabular-nums; font-size:12px; }
      .st-range { -webkit-appearance:none; appearance:none; display:block; width:100%; height:20px; margin:0; background:transparent; cursor:pointer; }
      .st-range::-webkit-slider-runnable-track { height:3px; border-radius:2px;
        background:linear-gradient(to right, var(--purple) var(--fill,0%), #1e1f26 var(--fill,0%)); }
      .st-range::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; width:13px; height:13px; margin-top:-5px; border-radius:50%;
        background:#e9eaf2; border:2px solid var(--purple); box-shadow:0 1px 5px rgba(0,0,0,.6); transition:transform .12s, box-shadow .12s; }
      .st-range:hover::-webkit-slider-thumb { box-shadow:0 0 0 4px rgba(var(--purple-rgb),.16), 0 1px 5px rgba(0,0,0,.6); }
      .st-range:active::-webkit-slider-thumb { transform:scale(1.22); }
      .st-range::-moz-range-track { height:3px; border-radius:2px; background:#1e1f26; }
      .st-range::-moz-range-progress { height:3px; border-radius:2px; background:var(--purple); }
      .st-range::-moz-range-thumb { width:11px; height:11px; border-radius:50%; background:#e9eaf2; border:2px solid var(--purple); }
      .st-info { flex:none; display:flex; align-items:center; justify-content:space-between; gap:12px; min-height:44px;
        padding:8px 14px; border-top:1px solid var(--border); background:#0a0b0e;
        font-size:10.5px; line-height:1.5; color:var(--text-dim); }
      .st-info-range { color:var(--text-faint); white-space:nowrap; flex:none; }
      .st-swatches { display:grid; grid-template-columns:repeat(5,1fr); gap:7px; margin-bottom:13px; }
      .st-swatch { height:26px; border-radius:6px; border:1px solid rgba(255,255,255,.12); cursor:pointer; padding:0;
        transition:transform .12s, border-color .12s, box-shadow .12s; }
      .st-swatch:hover { transform:translateY(-1px); }
      .st-swatch.on { border-color:#fff; box-shadow:0 0 0 2px rgba(var(--purple-rgb),.45); }
      .st-sv { position:relative; height:108px; border-radius:8px; cursor:crosshair; touch-action:none; border:1px solid #23242b; }
      .st-sv-h { position:absolute; width:13px; height:13px; border-radius:50%; border:2px solid #fff;
        transform:translate(-50%,-50%); box-shadow:0 0 0 1.5px rgba(0,0,0,.5); pointer-events:none; }
      .st-hue { position:relative; height:11px; border-radius:6px; margin:11px 0; cursor:pointer; touch-action:none;
        background:linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00); }
      .st-hue-h { position:absolute; top:50%; width:13px; height:13px; border-radius:50%; background:#fff;
        transform:translate(-50%,-50%); box-shadow:0 0 0 1.5px rgba(0,0,0,.55); pointer-events:none; }
      .st-hexrow { display:flex; gap:8px; align-items:center; }
      .st-resize { position:absolute; right:0; bottom:0; width:18px; height:18px; z-index:3;
        cursor:nwse-resize; touch-action:none;
        background:linear-gradient(135deg, transparent 0 45%, #3a3b45 45% 53%, transparent 53% 66%, #3a3b45 66% 74%, transparent 74%);
        opacity:.55; transition:opacity .12s; }
      .st-resize:hover { opacity:1; }
      .st-cur { width:34px; height:28px; border-radius:6px; border:1px solid #23242b; flex:none; }
      .st-hex { flex:1; min-width:0; background:#0a0b0e; border:1px solid #23242b; border-radius:6px; color:var(--text-code);
        font-family:inherit; font-size:12px; padding:7px 9px; outline:none; text-transform:lowercase; }
      .st-hex:focus { border-color:var(--purple); }
      @media (max-width:560px) { #curie-drawer { width:calc(100vw - 20px); } .st-nav { width:94px; } }
    `;
    document.head.appendChild(s);
  }

  function buildTweakPanel(cfg, replayBoot) {
    if (document.getElementById('curie-drawer')) return;
    injectTweakStyles();

    const persist = () => { try { localStorage.setItem('curieAnimCfg', JSON.stringify(cfg)); } catch (e) {} };
    const SCHEMA = window.CURIE_ANIM_SCHEMA || {};

    /* one control per LIVE schema key (circuit.js CURIE_ANIM_SCHEMA) + accent */
    const SECTIONS = [
      { id: 'boot', label: 'boot', title: 'boot sequence', boot: true,
        desc: 'The one-time load-in, in play order. Edits here replay the boot so you can watch them land.',
        fields: [
          { k: 'bootDurationMs', label: 'spark climb',       step: 50,   unit: 'ms', help: 'Time for the comet to rise up the rail toward the core.' },
          { k: 'bootArriveFrac', label: 'hand-off point',    step: 0.01,             help: 'Fraction of the climb where the comet reaches the core and hands off.' },
          { k: 'bootIngressMs',  label: 'rail to core sweep', step: 20,  unit: 'ms', help: 'Time the energy travels into the core before it ignites.' },
          { k: 'bootFillMs',     label: 'core fill',         step: 20,   unit: 'ms', help: 'How long the glow takes to sweep into the core.' },
          { k: 'coreFullFrac',   label: 'arm point',         step: 0.02,             help: 'Fraction of the fill at which the core counts as fully lit and the hold begins.' },
          { k: 'bootHoldMs',     label: 'lit hold',          step: 50,   unit: 'ms', help: 'How long the core stays fully lit before it settles back down.' },
          { k: 'settleMs',       label: 'settle',            step: 20,   unit: 'ms', help: 'How long the core eases back to rest after the hold, ending the boot.' },
        ] },
      { id: 'hover', label: 'hover', title: 'hover',
        desc: 'How the board reacts to your cursor. Tune it live with the chip behind this window.',
        fields: [
          { k: 'hoverRadius', label: 'wake distance',  step: 4,     unit: 'px', help: 'How close the cursor must get to wake and light the core.' },
          { k: 'hoverEase',   label: 'wake speed',     step: 0.01,              help: 'How fast the core lights up as the cursor nears. Higher is snappier.' },
          { k: 'retractEase', label: 'fade-out speed', step: 0.005,             help: 'How fast the glow fades once the cursor leaves. Higher is snappier.' },
          { k: 'rippleMs',    label: 'ripple period',  step: 50,    unit: 'ms', help: 'Interval between the ripple rings that pulse out of the core while hovered.' },
        ] },
      { id: 'idle', label: 'idle', title: 'idle motion',
        desc: 'The ambient life of the board when nothing is happening.',
        fields: [
          { k: 'idlePulseMs',  label: 'breathing period', step: 100, unit: 'ms', help: 'Cycle time of the slow rail breathing pulse.' },
          { k: 'idlePacketMs', label: 'packet interval',  step: 100, unit: 'ms', help: 'Average gap between data packets that travel the branches.' },
          { k: 'scannerRps',   label: 'scanner speed',    step: 0.01, unit: '/s', help: 'Rotations per second of the sweeping scanner arc.' },
        ] },
      { id: 'layout', label: 'layout', title: 'chip & layout',
        desc: 'Size and placement of the chip and rail.',
        fields: [
          { k: 'coreSize',    label: 'chip size',     step: 1, unit: 'px', help: 'Half-size of the CPU chip body.' },
          { k: 'coreOffsetX', label: 'chip x offset', step: 4, unit: 'px', help: 'Shifts the chip left / right.' },
          { k: 'railOffsetX', label: 'rail x offset', step: 4, unit: 'px', help: 'Shifts the vertical rail left / right.' },
        ] },
      { id: 'theme', label: 'theme', title: 'theme',
        desc: 'Brand accent, applied live across the whole site.',
        fields: [
          { k: 'accent', color: true, def: '#5b8cff', help: 'Recolours the site, chip and rail instantly. Pick a preset or dial in your own.' },
        ] },
    ];

    (function checkPanelSync() {
      const keys = [];
      SECTIONS.forEach(s2 => s2.fields.forEach(f => keys.push(f.k)));
      Object.keys(SCHEMA).forEach(k => { if (keys.indexOf(k) < 0) console.warn('[tweaks] schema key has no control:', k); });
      keys.forEach(k => { if (k !== 'accent' && !SCHEMA[k]) console.warn('[tweaks] control key missing from schema:', k); });
    })();

    const clampNum = (v, sc) => {
      v = +v;
      if (!isFinite(v)) v = sc.def;
      return v < sc.min ? sc.min : v > sc.max ? sc.max : v;
    };

    /* ── window shell ── */
    const drawer = document.createElement('div');
    drawer.id = 'curie-drawer';

    const bar = document.createElement('div'); bar.className = 'st-titlebar';
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button'; closeBtn.className = 'st-close';
    closeBtn.setAttribute('aria-label', 'Close settings');
    const closeGlyph = document.createElement('span'); closeGlyph.textContent = '×';
    closeBtn.appendChild(closeGlyph);
    const winTitle = document.createElement('div'); winTitle.className = 'st-title';
    const tDim = document.createElement('span'); tDim.textContent = '~/';
    const tB = document.createElement('b'); tB.textContent = 'board.cfg';
    winTitle.appendChild(tDim); winTitle.appendChild(tB);
    const statusBox = document.createElement('div'); statusBox.className = 'st-status';
    bar.appendChild(closeBtn); bar.appendChild(winTitle); bar.appendChild(statusBox);
    drawer.appendChild(bar);

    let statusTimer = null;
    function setStatus(msg, hold) {
      statusBox.textContent = msg;
      statusBox.classList.add('show');
      if (statusTimer) clearTimeout(statusTimer);
      statusTimer = null;
      if (!hold) statusTimer = setTimeout(() => { statusBox.classList.remove('show'); statusTimer = null; }, 1500);
    }

    /* ── body: rail nav + pane + status bar ── */
    const body = document.createElement('div'); body.className = 'st-body';
    const navCol = document.createElement('div'); navCol.className = 'st-nav';
    const main = document.createElement('div'); main.className = 'st-main';

    const info = document.createElement('div'); info.className = 'st-info';
    const infoTxt = document.createElement('span');
    const infoRange = document.createElement('span'); infoRange.className = 'st-info-range';
    info.appendChild(infoTxt); info.appendChild(infoRange);

    let activeSection = SECTIONS[0];
    function setInfo(txt, range) { infoTxt.textContent = txt; infoRange.textContent = range || ''; }
    function resetInfo() { setInfo(activeSection.desc, ''); }

    let replayTimer = null;
    function scheduleBootReplay() {
      if (!replayBoot) return;
      if (replayTimer) clearTimeout(replayTimer);
      setStatus('replay queued…', true);
      replayTimer = setTimeout(() => { replayTimer = null; replayBoot(); setStatus('boot replayed'); }, 900);
    }

    function buildNumRow(sec, f) {
      const sc = SCHEMA[f.k];
      const row = document.createElement('div'); row.className = 'st-row';
      if (!sc) return row;
      const head = document.createElement('div'); head.className = 'st-row-head';
      const lbl = document.createElement('span'); lbl.className = 'st-lbl'; lbl.textContent = f.label;
      const val = document.createElement('span'); val.className = 'st-val';
      head.appendChild(lbl); head.appendChild(val);
      row.appendChild(head);

      const cur = clampNum(cfg[f.k] !== undefined ? cfg[f.k] : sc.def, sc);
      val.textContent = cur + (f.unit || '');

      const inp = document.createElement('input');
      inp.type = 'range'; inp.className = 'st-range';
      inp.min = String(sc.min); inp.max = String(sc.max);
      inp.step = String(f.step); inp.value = String(cur);
      const setFill = () => {
        const pct = ((parseFloat(inp.value) - sc.min) / (sc.max - sc.min)) * 100;
        inp.style.setProperty('--fill', pct + '%');
      };
      setFill();
      inp.addEventListener('input', () => {
        const v = f.step < 1 ? parseFloat(inp.value) : parseInt(inp.value, 10);
        cfg[f.k] = v;
        val.textContent = v + (f.unit || '');
        setFill();
        persist();
      });
      if (sec.boot) inp.addEventListener('change', scheduleBootReplay);
      row.appendChild(inp);

      const hint = 'safe ' + sc.min + '–' + sc.max + (f.unit || '');
      row.addEventListener('mouseenter', () => setInfo(f.help, hint));
      row.addEventListener('mouseleave', resetInfo);
      inp.addEventListener('focus', () => setInfo(f.help, hint));
      inp.addEventListener('blur', resetInfo);
      return row;
    }

    function buildAccentRow(f) {
      const row = document.createElement('div'); row.className = 'st-row';
      row.addEventListener('mouseenter', () => setInfo(f.help, ''));
      row.addEventListener('mouseleave', resetInfo);

      let hsv = hexToHsv(String(cfg.accent !== undefined ? cfg.accent : f.def));
      const clmp = (n, lo, hi) => (n < lo ? lo : n > hi ? hi : n);

      const swWrap = document.createElement('div'); swWrap.className = 'st-swatches';
      const PRESETS = ['#5b8cff', '#7e88ff', '#7c5cff', '#b15cf0', '#e0568f',
                       '#f0726b', '#e0b341', '#3ecf8e', '#3fb6c9', '#9aa0ad'];
      const swBtns = [];
      PRESETS.forEach(c => {
        const p = document.createElement('button');
        p.type = 'button'; p.className = 'st-swatch'; p.style.background = c; p.title = c;
        p.addEventListener('click', () => { hsv = hexToHsv(c); paint(); apply(); });
        swBtns.push(p); swWrap.appendChild(p);
      });

      const sv = document.createElement('div'); sv.className = 'st-sv';
      const svH = document.createElement('div'); svH.className = 'st-sv-h'; sv.appendChild(svH);
      const hue = document.createElement('div'); hue.className = 'st-hue';
      const hueH = document.createElement('div'); hueH.className = 'st-hue-h'; hue.appendChild(hueH);
      const hexRow = document.createElement('div'); hexRow.className = 'st-hexrow';
      const curSw = document.createElement('div'); curSw.className = 'st-cur';
      const hexIn = document.createElement('input');
      hexIn.className = 'st-hex'; hexIn.type = 'text'; hexIn.spellcheck = false; hexIn.maxLength = 7;
      hexRow.appendChild(curSw); hexRow.appendChild(hexIn);

      const currentHex = () => hsvToHex(hsv.h, hsv.s, hsv.v);
      function paint() {
        const hx = currentHex();
        sv.style.background = 'linear-gradient(to top, #000, rgba(0,0,0,0)), '
          + 'linear-gradient(to right, #fff, ' + hsvToHex(hsv.h, 1, 1) + ')';
        svH.style.left = (hsv.s * 100) + '%';
        svH.style.top = ((1 - hsv.v) * 100) + '%';
        svH.style.background = hx;
        hueH.style.left = (hsv.h / 360 * 100) + '%';
        curSw.style.background = hx;
        if (document.activeElement !== hexIn) hexIn.value = hx;
        swBtns.forEach((b2, i) => b2.classList.toggle('on', PRESETS[i].toLowerCase() === hx.toLowerCase()));
      }
      function apply() {
        const hx = currentHex();
        cfg.accent = hx; persist(); applyAccent(hx);
      }
      function bindDrag(el, fn) {
        const move = e => {
          const r = el.getBoundingClientRect();
          const cx = e.touches ? e.touches[0].clientX : e.clientX;
          const cy = e.touches ? e.touches[0].clientY : e.clientY;
          fn(clmp((cx - r.left) / r.width, 0, 1), clmp((cy - r.top) / r.height, 0, 1));
        };
        el.addEventListener('pointerdown', e => {
          move(e); e.preventDefault();
          const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', up);
        });
      }
      bindDrag(sv, (x, y) => { hsv.s = x; hsv.v = 1 - y; paint(); apply(); });
      bindDrag(hue, x => { hsv.h = x * 360; paint(); apply(); });
      hexIn.addEventListener('input', () => {
        if (hexToRgb(hexIn.value)) { hsv = hexToHsv(hexIn.value); paint(); apply(); }
      });

      paint();
      row.appendChild(swWrap); row.appendChild(sv); row.appendChild(hue); row.appendChild(hexRow);
      return row;
    }

    /* ── sections → nav buttons + panes ── */
    const navBtns = {}; const panes = {};
    SECTIONS.forEach(sec => {
      const pane = document.createElement('div'); pane.className = 'st-pane';
      pane.style.display = 'none';
      const h = document.createElement('div'); h.className = 'st-sec'; h.textContent = '// ' + sec.title;
      pane.appendChild(h);
      sec.fields.forEach(f => pane.appendChild(f.color ? buildAccentRow(f) : buildNumRow(sec, f)));
      panes[sec.id] = pane;
      main.appendChild(pane);

      const nb = document.createElement('button');
      nb.type = 'button'; nb.className = 'st-nav-btn';
      const pad = document.createElement('span'); pad.className = 'st-pad';
      const nl = document.createElement('span'); nl.textContent = sec.label;
      nb.appendChild(pad); nb.appendChild(nl);
      nb.addEventListener('click', () => selectSection(sec.id));
      navBtns[sec.id] = nb;
      navCol.appendChild(nb);
    });
    main.appendChild(info);

    function selectSection(id) {
      SECTIONS.forEach(sec => {
        const on = sec.id === id;
        panes[sec.id].style.display = on ? 'block' : 'none';
        navBtns[sec.id].classList.toggle('on', on);
        if (on) {
          activeSection = sec;
          const p = panes[sec.id];
          p.classList.remove('fx'); void p.offsetWidth; p.classList.add('fx');
        }
      });
      resetInfo();
      try { localStorage.setItem('curieSettingsTab', id); } catch (e) {}
    }

    /* rail footer: replay + reset */
    const navFoot = document.createElement('div'); navFoot.className = 'st-nav-foot';
    function navAct(label, help, fn) {
      const b2 = document.createElement('button');
      b2.type = 'button'; b2.className = 'st-nav-btn st-nav-act';
      const sp = document.createElement('span'); sp.textContent = label;
      b2.appendChild(sp);
      b2.addEventListener('mouseenter', () => setInfo(help, ''));
      b2.addEventListener('mouseleave', resetInfo);
      b2.addEventListener('click', fn);
      navFoot.appendChild(b2);
    }
    navAct('↻ replay', 'Replay the boot sequence from the top.', () => { if (replayBoot) { replayBoot(); setStatus('boot replayed'); } });
    navAct('⧉ copy', 'Copy your current settings to the clipboard as JSON.', doCopy);
    navAct('⟲ reset', 'Restore every setting to its default and forget saved changes.', doReset);
    navCol.appendChild(navFoot);

    body.appendChild(navCol); body.appendChild(main);
    drawer.appendChild(body);

    /* ── copy the effective config (saved values + schema/accent defaults) as JSON ── */
    function doCopy() {
      const out = {};
      Object.keys(SCHEMA).forEach(k => {
        out[k] = clampNum(cfg[k] !== undefined ? cfg[k] : SCHEMA[k].def, SCHEMA[k]);
      });
      out.accent = cfg.accent !== undefined ? cfg.accent : '#5b8cff';
      const json = JSON.stringify(out, null, 2);
      const done = () => setStatus('copied to clipboard');
      const fallback = () => {
        try {
          const ta = document.createElement('textarea');
          ta.value = json;
          ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
          document.body.appendChild(ta); ta.select();
          document.execCommand('copy'); ta.remove(); done();
        } catch (e) { setStatus('copy failed'); }
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(json).then(done, fallback);
      } else fallback();
    }

    /* ── resize grip (bottom-right); size clamped and remembered ── */
    const grip = document.createElement('div');
    grip.className = 'st-resize';
    grip.setAttribute('aria-label', 'Resize');
    drawer.appendChild(grip);

    function sizeLimits() {
      return {
        wMin: 360, wMax: Math.min(760, window.innerWidth - 12),
        hMin: 250, hMax: Math.min(window.innerHeight - 12, 760),
      };
    }
    function saveSize() {
      try {
        localStorage.setItem('curieSettingsSize', JSON.stringify({
          w: drawer.offsetWidth, h: drawer.offsetHeight,
        }));
      } catch (e) {}
    }
    (function makeResizable() {
      let rz = false, sx = 0, sy = 0, ow = 0, oh = 0;
      grip.addEventListener('pointerdown', e => {
        rz = true; e.preventDefault(); e.stopPropagation();
        try { grip.setPointerCapture(e.pointerId); } catch (err) {}
        sx = e.clientX; sy = e.clientY;
        ow = drawer.offsetWidth; oh = drawer.offsetHeight;
        drawer.classList.remove('st-anim');
        drawer.style.maxHeight = 'none';
      });
      grip.addEventListener('pointermove', e => {
        if (!rz) return;
        const L = sizeLimits();
        const w = Math.max(L.wMin, Math.min(ow + e.clientX - sx, L.wMax));
        const h = Math.max(L.hMin, Math.min(oh + e.clientY - sy, L.hMax));
        drawer.style.width = w + 'px';
        drawer.style.height = h + 'px';
      });
      const end = () => {
        if (!rz) return;
        rz = false; saveSize();
        if (drawer.style.left) placeAt(parseInt(drawer.style.left, 10) || 0, parseInt(drawer.style.top, 10) || 0);
      };
      grip.addEventListener('pointerup', end);
      grip.addEventListener('pointercancel', end);
    })();
    (function restoreSize() {
      let sz = null;
      try { sz = JSON.parse(localStorage.getItem('curieSettingsSize') || 'null'); } catch (e) {}
      if (sz && sz.w && sz.h) {
        const L = sizeLimits();
        drawer.style.maxHeight = 'none';
        drawer.style.width = Math.max(L.wMin, Math.min(sz.w, L.wMax)) + 'px';
        drawer.style.height = Math.max(L.hMin, Math.min(sz.h, L.hMax)) + 'px';
      }
    })();

    /* ── drag by titlebar, clamped to viewport, position remembered ── */
    function placeAt(x, y) {
      const w = drawer.offsetWidth;
      x = Math.max(6, Math.min(x, window.innerWidth - w - 6));
      y = Math.max(6, Math.min(y, window.innerHeight - 46));
      drawer.style.left = x + 'px'; drawer.style.top = y + 'px';
      drawer.style.right = 'auto'; drawer.style.bottom = 'auto';
    }
    function savePos() {
      try {
        localStorage.setItem('curieSettingsPos', JSON.stringify({
          x: parseInt(drawer.style.left, 10) || 0, y: parseInt(drawer.style.top, 10) || 0,
        }));
      } catch (e) {}
    }
    (function makeDraggable() {
      let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
      bar.addEventListener('pointerdown', e => {
        if (e.target.closest('button')) return;
        dragging = true;
        try { bar.setPointerCapture(e.pointerId); } catch (err) {}
        const r = drawer.getBoundingClientRect();
        ox = r.left; oy = r.top; sx = e.clientX; sy = e.clientY;
        drawer.classList.remove('st-anim');
      });
      bar.addEventListener('pointermove', e => {
        if (!dragging) return;
        placeAt(ox + e.clientX - sx, oy + e.clientY - sy);
      });
      const end = () => { if (!dragging) return; dragging = false; savePos(); };
      bar.addEventListener('pointerup', end);
      bar.addEventListener('pointercancel', end);
    })();
    window.addEventListener('resize', () => {
      if (drawer.style.display !== 'none' && drawer.style.left) {
        placeAt(parseInt(drawer.style.left, 10) || 0, parseInt(drawer.style.top, 10) || 0);
      }
    });

    let positioned = false;
    function ensurePosition() {
      if (positioned) return;
      positioned = true;
      let p = null;
      try { p = JSON.parse(localStorage.getItem('curieSettingsPos') || 'null'); } catch (e) {}
      const navEl = document.getElementById('nav');
      const navH = navEl ? navEl.offsetHeight : 56;
      if (p && typeof p.x === 'number' && typeof p.y === 'number') placeAt(p.x, p.y);
      else placeAt(window.innerWidth - drawer.offsetWidth - 14, navH + 10);
    }

    /* ── open / close (gear in the nav toggles; Esc or traffic dot closes;
       clicking the page does NOT close it, so you can tune the board live) ── */
    let openState = false, hideTimer = null;
    function setOpen(open, instant) {
      openState = open;
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      if (open) {
        drawer.style.display = 'flex';
        ensurePosition();
        if (instant) {
          drawer.classList.remove('st-anim');
          drawer.classList.add('st-open');
        } else {
          drawer.classList.remove('st-open', 'st-anim');
          void drawer.offsetWidth;
          drawer.classList.add('st-anim');
          requestAnimationFrame(() => { if (openState) drawer.classList.add('st-open'); });
        }
      } else {
        drawer.classList.add('st-anim');
        drawer.classList.remove('st-open');
        hideTimer = setTimeout(() => { if (!openState) drawer.style.display = 'none'; }, 230);
      }
      gear.style.color = open ? 'var(--lilac, #9d86ff)' : 'var(--text-muted)';
      gear.setAttribute('aria-expanded', String(open));
    }
    drawer.__stOpen = setOpen;

    function doReset() {
      Object.keys(cfg).forEach(k => delete cfg[k]);
      try { localStorage.removeItem('curieAnimCfg'); } catch (e) {}
      applyAccent('#5b8cff');
      const left = drawer.style.left, top = drawer.style.top;
      const oldGear = document.getElementById('curie-gear');
      if (oldGear) oldGear.remove();
      drawer.remove();
      buildTweakPanel(cfg, replayBoot);
      const d = document.getElementById('curie-drawer');
      if (d) {
        if (left) { d.style.left = left; d.style.top = top; d.style.right = 'auto'; }
        if (typeof d.__stOpen === 'function') d.__stOpen(true, true);
      }
    }

    closeBtn.addEventListener('click', e => { e.stopPropagation(); setOpen(false); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && openState && drawer.isConnected) setOpen(false);
    });

    /* gear entry point in the nav (visibility gated by the terminal command) */
    const gear = document.createElement('button');
    gear.id = 'curie-gear';
    gear.title = 'board settings';
    gear.setAttribute('aria-label', 'Board settings');
    gear.style.cssText = [
      'background: none; border: none; border-radius: 7px;',
      'color: var(--text-muted); font-size: 13px; padding: 7px 12px; flex: none;',
      'cursor: pointer; display: none; align-items: center; justify-content: center;',
      'font-family: var(--font); transition: color .15s, background .15s;',
    ].join('');
    gear.textContent = 'settings';
    gear.setAttribute('aria-expanded', 'false');
    gear.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = drawer.style.display !== 'none' && drawer.classList.contains('st-open');
      setOpen(!isOpen);
    });
    gear.addEventListener('mouseenter', () => {
      if (!openState) { gear.style.color = 'var(--text-bright)'; gear.style.background = 'rgba(255, 255, 255, 0.04)'; }
    });
    gear.addEventListener('mouseleave', () => {
      if (!openState) { gear.style.color = 'var(--text-muted)'; gear.style.background = 'none'; }
    });

    const navBarEl = document.getElementById('nav');
    const navLinks = document.getElementById('nav-links');
    if (navLinks) {
      navLinks.appendChild(gear);
    } else if (navBarEl) {
      navBarEl.appendChild(gear);
    } else {
      gear.style.position = 'fixed'; gear.style.top = '14px'; gear.style.right = '14px'; gear.style.zIndex = '1000';
      document.body.appendChild(gear);
    }
    document.body.appendChild(drawer);

    let startId = SECTIONS[0].id;
    try {
      const saved = localStorage.getItem('curieSettingsTab');
      if (saved && panes[saved]) startId = saved;
    } catch (e) {}
    selectSection(startId);

    applySettingsButtonVisibility();
  }
  function settingsButtonShown() {
    try { return localStorage.getItem('curieSettingsButton') === '1'; } catch (e) { return false; }
  }
  function applySettingsButtonVisibility() {
    const g = document.getElementById('curie-gear');
    if (g) g.style.display = settingsButtonShown() ? 'flex' : 'none';
  }

  function toggleSettingsButton() {
    const next = !settingsButtonShown();
    try { localStorage.setItem('curieSettingsButton', next ? '1' : '0'); } catch (e) {}
    if (next) ensureTweakPanel();
    applySettingsButtonVisibility();
    if (!next) {
      const d = document.getElementById('curie-drawer');
      if (d) d.style.display = 'none';
    }
    return next;
  }
  window.curieToggleSettingsButton = toggleSettingsButton;
  window.curieSettingsButtonShown  = settingsButtonShown;

  let animCfg = {};
  try { animCfg = JSON.parse(localStorage.getItem('curieAnimCfg') || '{}') || {}; } catch (e) {}

  function sanitizeAnimCfg(c) {
    const S = window.CURIE_ANIM_SCHEMA;
    if (!S || !c || typeof c !== 'object') return c || {};
    let changed = false;
    Object.keys(S).forEach(k => {
      if (!(k in c)) return;
      const s = S[k];
      if (s.type === 'bool') {
        const b = !!c[k];
        if (c[k] !== b) { c[k] = b; changed = true; }
        return;
      }
      let v = +c[k];
      if (!isFinite(v)) v = s.def;
      v = v < s.min ? s.min : v > s.max ? s.max : v;
      if (c[k] !== v) { c[k] = v; changed = true; }
    });
    if (changed) { try { localStorage.setItem('curieAnimCfg', JSON.stringify(c)); } catch (e) {} }
    return c;
  }
  animCfg = sanitizeAnimCfg(animCfg);

  let circuitSyncColors = null;

  // ── hero title ↔ circuit boot sync ───────────────────────────────────
  // The circuit owns the boot clock and feeds core-fill progress in here; the
  // hero title mirrors it and only crystallises once the core is fully lit.
  let titleBoot = null;   // controller returned by bootLiquidTitle()
  let coreProgress = 0;   // latest 0→1 core-fill sample
  let coreLit = false;    // has the core fully lit yet?
  const bootHooks = {
    onCoreProgress(p) {
      coreProgress = p;
      if (titleBoot) titleBoot.setProgress(p);
    },
    onCoreLit() {
      coreLit = true;
      if (titleBoot) titleBoot.finish();
    },
  };

  // Fallback for circuits that don't emit boot hooks (the v1 canvas circuit, or
  // no circuit at all): drive the same callbacks off a local clock so the title
  // still reveals progressively and finishes on the core-lit beat.
  let bootFeedRAF = 0;
  function startLocalBootFeed(durationMs) {
    if (bootFeedRAF) cancelAnimationFrame(bootFeedRAF);
    coreProgress = 0; coreLit = false;
    const litAt = Math.max(1, durationMs || coreLitMs());
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min((now - t0) / litAt, 1);
      bootHooks.onCoreProgress(p);
      if (p >= 1) { bootHooks.onCoreLit(); bootFeedRAF = 0; return; }
      bootFeedRAF = requestAnimationFrame(step);
    };
    bootFeedRAF = requestAnimationFrame(step);
  }

  // Mobile (≤560px) never loads the chip — the circuit board is disabled and
  // invisible there (a static CSS trace stands in). So there's nothing to sync
  // to: drive the title on a short local clock so it reveals quickly, and let
  // the rotor + meta-circuit start off the same `curie:title-ready` beat.
  const MOBILE_NO_CHIP = document.documentElement.clientWidth <= 560;
  const MOBILE_TITLE_MS = 700;

  applyAccent(animCfg.accent || '#5b8cff');

  const canvas = document.getElementById('circuit-canvas');
  let replayBoot;

  if (canvas && MOBILE_NO_CHIP) {
    // chip not loaded on mobile — fast local title reveal, no circuit engine
    if (canvas) canvas.style.display = 'none';
    startLocalBootFeed(MOBILE_TITLE_MS);
    replayBoot = () => {
      titleBoot = bootLiquidTitle();
      startLocalBootFeed(MOBILE_TITLE_MS);
    };
  } else if (canvas) {
    const circuit = initCircuit(canvas, () => animCfg, () => true, bootHooks);
    circuitSyncColors = circuit.syncColors;
    circuitSyncColors();

    // v2 circuit emits boot hooks (advertised via coreLitMs); the v1 canvas
    // circuit doesn't, so fall back to the local time-based feed there.
    const eventDriven = typeof circuit.coreLitMs === 'function';
    if (!eventDriven) startLocalBootFeed();

    replayBoot = () => {
      coreProgress = 0;
      coreLit = false;
      circuit.replayBoot();            // resets the boot clock; hooks re-fire
      titleBoot = bootLiquidTitle();   // fresh title scramble, gated on the boot
      if (!eventDriven) startLocalBootFeed();
    };
  } else {
    // no circuit on the page — still let the title reveal on a local clock
    startLocalBootFeed();
  }

  const termBody  = document.getElementById('term-body');
  const termInput = document.getElementById('term-input');
  const term      = new Terminal(termBody, termInput, () => {
    showRootFlash();
    setTimeout(() => { termWin.open(); termInput && termInput.focus(); }, 360);
  });
  term.boot();

  const termWin = new TermWindow(
    document.getElementById('terminal-window'),
    document.getElementById('terminal-card'),
    document.getElementById('term-content'),
    document.getElementById('term-body'),
    document.getElementById('term-titlebar'),
    document.getElementById('term-grip'),
  );

  const palette = new Palette(
    document.getElementById('palette-overlay'),
    document.getElementById('palette-input'),
    document.getElementById('palette-list'),
    document.getElementById('palette-empty'),
  );
  palette.onOpenWin = () => termWin.open();

  const btnClose = document.getElementById('win-close');
  const btnMin   = document.getElementById('win-min');
  const btnMax   = document.getElementById('win-max');
  if (btnClose) btnClose.addEventListener('click', e => { e.stopPropagation(); termWin.close(); });
  if (btnMin)   btnMin.addEventListener('click',   e => { e.stopPropagation(); termWin.minimize(); });
  if (btnMax)   btnMax.addEventListener('click',   e => { e.stopPropagation(); termWin.maximize(); });

  const titlebar = document.getElementById('term-titlebar');
  if (titlebar) {
    titlebar.addEventListener('pointerdown', e => termWin.startDrag(e));
    titlebar.addEventListener('dblclick',    ()  => termWin.maximize());
  }

  const grip = document.getElementById('term-grip');
  if (grip) grip.addEventListener('pointerdown', e => termWin.startResize(e));

  if (termBody) termBody.addEventListener('click', () => termInput && termInput.focus());

  if (termInput) {
    termInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); term.run(termInput.value); }
      else if (e.key === 'Tab') { e.preventDefault(); term.tabComplete(termInput); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); term.historyUp(termInput); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); term.historyDown(termInput); }
      else if (e.key === 'l' && e.ctrlKey) {
        e.preventDefault();
        term.clearScreen();
      }
    });
  }

  window.addEventListener('keydown', e => {
    const k = (e.key || '').toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === 'k') { e.preventDefault(); palette.toggle(); return; }
    palette.onKey(e);
  });

  const overlay = document.getElementById('palette-overlay');
  if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) palette.close(); });

  initKonami(() => term.unlockRoot());

  buildNav();
  buildSkills();
  buildExperience();
  buildProjects();
  initCardGleam();
  buildEducation();
  buildContact();

  applyAccent(animCfg.accent || '#5b8cff');
  buildChips(term);
  initSections();
  initSectionReveals();
  initContactEmailCopy();
  initBackgroundSizing();
  initHero();
  initLogo();
  initAutoFocus();
  initSectionFocusFallback();
  initFxGating();

  let tweaksBuilt = false;
  function ensureTweakPanel() {
    if (tweaksBuilt) return;
    tweaksBuilt = true;
    buildTweakPanel(animCfg, replayBoot);
  }

  if (settingsButtonShown()) ensureTweakPanel();

})();
