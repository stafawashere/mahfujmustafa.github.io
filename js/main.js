(function () {

  function iconImg(url, size) {
    if (!url) return null;
    const img = document.createElement('img');
    img.loading  = 'lazy';
    img.decoding = 'async';
    img.src      = url;
    img.alt      = '';
    img.width    = size;
    img.height   = size;
    return img;
  }

  function buildNav() {
    const container = document.getElementById('nav-links');
    if (!container) return;

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
      a.addEventListener('click', () => scrollToSection(item.id));
      container.appendChild(a);
    });
  }

  function buildSkills() {
    const domainsEl = document.getElementById('skills-domains');
    const toolsEl   = document.getElementById('skills-tools');
    const langsEl   = document.getElementById('skills-langs');
    if (!domainsEl || !toolsEl || !langsEl) return;

    PORTFOLIO.domains.forEach(d => {
      const span = document.createElement('span');
      span.className   = 'tag';
      span.textContent = d;
      domainsEl.appendChild(span);
    });

    PORTFOLIO.tools.forEach(t => {
      const span = document.createElement('span');
      span.className = 'tag';
      const img = iconImg(t.icon, 14);
      if (img) {
        const slug = /simpleicons\.org\/([^/]+)\//.exec(t.icon || '');
        if (slug) {
          const baseSrc = img.src;
          span.addEventListener('mouseenter', () => {
            img.src = 'https://cdn.simpleicons.org/' + slug[1] + '/' + currentLilacHex();
          });
          span.addEventListener('mouseleave', () => { img.src = baseSrc; });
        }
        span.appendChild(img);
      }
      span.append(t.label);
      toolsEl.appendChild(span);
    });

    PORTFOLIO.languages.forEach(l => {
      const span = document.createElement('span');
      span.className = 'tag lang';
      const img = iconImg(l.icon, 14);
      if (img) {

        const slug = /simpleicons\.org\/([^/]+)\//.exec(l.icon || '');
        if (slug) img.dataset.iconSlug = slug[1];
        span.appendChild(img);
      }
      span.append(l.label);
      langsEl.appendChild(span);
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

    PORTFOLIO.projects.forEach(p => {
      const card = document.createElement('a');
      card.className = p.featured ? 'project-card is-featured' : 'project-card';
      card.href      = p.url;
      card.target    = '_blank';
      card.rel       = 'noopener';

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
      const techIcons = [];
      p.tech.forEach(label => {
        const badge = document.createElement('span');
        badge.className = 'tech-badge';
        const slug = PORTFOLIO.techIcons[label];
        if (slug) {
          const img = iconImg('https://cdn.simpleicons.org/' + slug + '/8b8d98', 12);
          if (img) {
            badge.appendChild(img);
            techIcons.push({ img: img, slug: slug });
          }
        }
        badge.append(label);
        tech.appendChild(badge);
      });

      card.addEventListener('mouseenter', () => {
        const lilac = currentLilacHex();
        techIcons.forEach(t => { t.img.src = 'https://cdn.simpleicons.org/' + t.slug + '/' + lilac; });
      });
      card.addEventListener('mouseleave', () => {
        techIcons.forEach(t => { t.img.src = 'https://cdn.simpleicons.org/' + t.slug + '/8b8d98'; });
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
    const fillToFullMs = (1 - Math.pow(1 - fullFrac, 1 / 3)) * fillMs;

    return arriveMs + ingressMs + fillToFullMs;
  }

  function initHero() {
    const h1El = document.getElementById('hero-name');
    if (h1El) bootHeroName(h1El, coreLitMs());

    const countEl = document.getElementById('hero-count');
    if (countEl) {
      animateHeroCount(countEl, PORTFOLIO.playerVisits, coreLitMs());
    }

    const cmdEl   = document.getElementById('hero-cmd-text');
    const rotorEl = document.getElementById('hero-rotor');
    if (cmdEl && rotorEl) {
      setTimeout(() => typeHero(cmdEl, () => {
        startRotor(rotorEl);
        const tip = document.getElementById('hero-prompt-tip');
        if (tip) tip.classList.add('is-armed');
      }), 1180);
    }

    const workBtn    = document.getElementById('hero-work-btn');
    const contactBtn = document.getElementById('hero-contact-btn');
    if (workBtn)    workBtn.addEventListener('click',    () => scrollToSection('work'));
    if (contactBtn) contactBtn.addEventListener('click', () => scrollToSection('contact'));

    const promptEl = document.getElementById('hero-prompt');
    const promptTipEl = document.getElementById('hero-prompt-tip');
    if (promptEl) {
      const dismissTip = () => { if (promptTipEl) promptTipEl.classList.add('is-dismissed'); };

      promptEl.addEventListener('click', () => { termWin.open(); dismissTip(); });
      promptEl.addEventListener('keydown', e => { if (e.key === 'Enter') { termWin.open(); dismissTip(); } });
    }
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

  function currentLilacHex() {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--purple-rgb');
    const parts = raw.split(',').map(n => parseInt(n, 10));
    if (parts.length !== 3 || parts.some(isNaN)) return '9d86ff';
    const lilac = lighten({ r: parts[0], g: parts[1], b: parts[2] }, 0.34);
    return rgbToHex(lilac.r, lilac.g, lilac.b).slice(1);
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

  function prefetchIconTints() {
    const lilac = currentLilacHex();
    const slugs = new Set();

    (PORTFOLIO.tools || []).forEach(t => {
      const m = /simpleicons\.org\/([^/]+)\//.exec(t.icon || '');
      if (m) slugs.add(m[1]);
    });
    Object.values(PORTFOLIO.techIcons || {}).forEach(slug => { if (slug) slugs.add(slug); });

    slugs.forEach(slug => {
      new Image().src = 'https://cdn.simpleicons.org/' + slug + '/' + lilac;
    });
  }

  let tintWarmTimer = null;
  function queueIconTintPrefetch() {
    clearTimeout(tintWarmTimer);
    tintWarmTimer = setTimeout(prefetchIconTints, 400);
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

    const lilacHex = rgbToHex(lilac.r, lilac.g, lilac.b).slice(1);
    document.querySelectorAll('img[data-icon-slug]').forEach(img => {
      const url = 'https://cdn.simpleicons.org/' + img.dataset.iconSlug + '/' + lilacHex;
      img.dataset.pendingTint = url;
      const loader = new Image();
      loader.onload = () => {
        if (img.dataset.pendingTint === url) img.src = url;
      };
      loader.src = url;
    });

    queueIconTintPrefetch();

    if (circuitSyncColors) circuitSyncColors();
  }

  function injectTweakStyles() {
    if (document.getElementById('curie-tweak-style')) return;
    const s = document.createElement('style');
    s.id = 'curie-tweak-style';
    s.textContent = `
      .cp-range { -webkit-appearance:none; appearance:none; flex:1; height:4px; border-radius:3px;
        background:#23242b; outline:none; cursor:pointer; }
      .cp-range::-webkit-slider-runnable-track { height:4px; border-radius:3px;
        background:linear-gradient(to right, var(--purple) var(--fill,0%), #23242b var(--fill,0%)); }
      .cp-range::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; width:13px; height:13px;
        margin-top:-4.5px; border-radius:50%; background:#fff; border:2px solid var(--purple);
        box-shadow:0 1px 4px rgba(0,0,0,.55); cursor:grab; transition:transform .1s; }
      .cp-range::-webkit-slider-thumb:active { transform:scale(1.25); cursor:grabbing; }
      .cp-range::-moz-range-track { height:4px; border-radius:3px; background:#23242b; }
      .cp-range::-moz-range-progress { height:4px; border-radius:3px; background:var(--purple); }
      .cp-range::-moz-range-thumb { width:13px; height:13px; border-radius:50%; background:#fff;
        border:2px solid var(--purple); box-shadow:0 1px 4px rgba(0,0,0,.55); cursor:grab; }
      .cp-check { -webkit-appearance:none; appearance:none; width:34px; height:18px; border-radius:10px;
        background:#23242b; border:1px solid #2a2b34; position:relative; cursor:pointer; transition:background .15s; flex:none; }
      .cp-check:checked { background:var(--purple); border-color:var(--purple); }
      .cp-check::after { content:''; position:absolute; top:1px; left:1px; width:14px; height:14px;
        border-radius:50%; background:#fff; transition:transform .15s; }
      .cp-check:checked::after { transform:translateX(16px); }
      .cp { margin:4px 0 2px; padding:10px; background:#15161c; border:1px solid #2a2b34;
        border-radius:8px; display:flex; flex-direction:column; gap:9px; }
      .cp-sl { position:relative; width:100%; height:92px; border-radius:6px; cursor:crosshair; touch-action:none; }
      .cp-sl-h { position:absolute; width:12px; height:12px; border-radius:50%; border:2px solid #fff;
        transform:translate(-50%,-50%); box-shadow:0 0 0 1.5px rgba(0,0,0,.45); pointer-events:none; }
      .cp-hue { position:relative; width:100%; height:12px; border-radius:6px; cursor:pointer; touch-action:none;
        background:linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00); }
      .cp-hue-h { position:absolute; top:50%; width:14px; height:14px; border-radius:50%; background:#fff;
        border:2px solid #fff; transform:translate(-50%,-50%); box-shadow:0 0 0 1.5px rgba(0,0,0,.5); pointer-events:none; }
      .cp-bottom { display:flex; align-items:center; gap:8px; }
      .cp-sw { width:30px; height:26px; border-radius:6px; border:1px solid #2a2b34; flex:none; }
      .cp-hex { flex:1; min-width:0; background:#0e0f13; border:1px solid #2a2b34; border-radius:6px;
        color:#c3c5cd; font-family:var(--font); font-size:12px; padding:6px 8px; outline:none; text-transform:lowercase; }
      .cp-hex:focus { border-color:var(--purple); }
      .cp-presets { display:flex; gap:6px; flex-wrap:wrap; }
      .cp-preset { width:22px; height:22px; border-radius:5px; border:1px solid rgba(255,255,255,.14);
        cursor:pointer; padding:0; transition:transform .1s; }
      .cp-preset:hover { transform:scale(1.12); }
    `;
    document.head.appendChild(s);
  }

  function createColorPicker(initialHex, onChange) {
    const clmp = (n, a, b) => (n < a ? a : n > b ? b : n);
    let hsv = hexToHsv(initialHex);

    const root = document.createElement('div');
    root.className = 'cp';

    const sl       = document.createElement('div'); sl.className = 'cp-sl';
    const slHandle = document.createElement('div'); slHandle.className = 'cp-sl-h'; sl.appendChild(slHandle);
    const hue      = document.createElement('div'); hue.className = 'cp-hue';
    const hueHandle= document.createElement('div'); hueHandle.className = 'cp-hue-h'; hue.appendChild(hueHandle);

    const bottom = document.createElement('div'); bottom.className = 'cp-bottom';
    const sw     = document.createElement('div'); sw.className = 'cp-sw';
    const hex    = document.createElement('input');
    hex.className = 'cp-hex'; hex.type = 'text'; hex.spellcheck = false; hex.maxLength = 7;
    bottom.appendChild(sw); bottom.appendChild(hex);

    const presets = document.createElement('div'); presets.className = 'cp-presets';
    ['#6847de','#7c5cff','#5b8cff','#3fb6c9','#3ecf8e','#e0b341','#f0726b','#e0568f','#b15cf0','#9aa0ad']
      .forEach(c => {
        const p = document.createElement('button');
        p.type = 'button'; p.className = 'cp-preset'; p.style.background = c; p.title = c;
        p.addEventListener('click', () => { hsv = hexToHsv(c); render(); emit(); });
        presets.appendChild(p);
      });

    root.appendChild(sl); root.appendChild(hue); root.appendChild(bottom); root.appendChild(presets);

    function render() {
      const hueHex = hsvToHex(hsv.h, 1, 1);
      sl.style.background = 'linear-gradient(to top, #000, rgba(0,0,0,0)), '
                          + 'linear-gradient(to right, #fff, ' + hueHex + ')';
      slHandle.style.left = (hsv.s * 100) + '%';
      slHandle.style.top  = ((1 - hsv.v) * 100) + '%';
      hueHandle.style.left = (hsv.h / 360 * 100) + '%';
      const hx = hsvToHex(hsv.h, hsv.s, hsv.v);
      sw.style.background = hx;
      slHandle.style.background = hx;
      if (document.activeElement !== hex) hex.value = hx;
    }
    function emit() { onChange(hsvToHex(hsv.h, hsv.s, hsv.v)); }

    function bindDrag(el, fn) {
      const move = e => {
        const r  = el.getBoundingClientRect();
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
    bindDrag(sl,  (x, y) => { hsv.s = x; hsv.v = 1 - y; render(); emit(); });
    bindDrag(hue, (x)    => { hsv.h = x * 360;          render(); emit(); });

    hex.addEventListener('input', () => {
      if (hexToRgb(hex.value)) { hsv = hexToHsv(hex.value); render(); emit(); }
    });

    render();
    return { el: root, set(hx) { hsv = hexToHsv(hx); render(); } };
  }

  function buildTweakPanel(cfg, replayBoot) {
    if (document.getElementById('curie-tweaks')) return;
    injectTweakStyles();

    function persist() {
      try { localStorage.setItem('curieAnimCfg', JSON.stringify(cfg)); } catch (e) {}
    }

    const SCHEMA = window.CURIE_ANIM_SCHEMA || {};
    const FIELDS = [
      { group: 'BOOT · TIMELINE', desc: 'The load-in sequence, in play order' },
      { k: 'bootDurationMs',  label: 'Spark climb time',     step: 50,    unit: 'ms', help: 'How long the comet takes to rise up the rail toward the core.' },
      { k: 'bootArriveFrac',  label: 'Hand-off point',       step: 0.01,              help: 'Fraction of the climb where the comet reaches the connector and hands off. Kept below 1 so it always arrives.' },
      { k: 'bootIngressMs',   label: 'Rail → core sweep',    step: 20,    unit: 'ms', help: 'Time the energy takes to travel along the connector INTO the core before it ignites.' },
      { k: 'bootFillMs',      label: 'Core fill-in time',    step: 20,    unit: 'ms', help: 'How long the glow takes to sweep into the core, easing to a clean stop. Shared by hover. Lower = snappier.' },
      { k: 'coreFullFrac',    label: 'Arm point',            step: 0.02,              help: 'Fraction of the fill at which the core counts as “full” and the hold begins. Lower trims the slow tail; 1 = wait for the whole fill.' },
      { k: 'bootHoldMs',      label: 'Core lit hold',        step: 50,    unit: 'ms', help: 'How long the core stays fully lit before it starts to un-light.' },

      { group: 'BOOT · UN-LIGHT', desc: 'Staged outro: rail recedes, then branches, then the core fades' },
      { k: 'bootRailOutMs',   label: 'Rail recede',          step: 20,    unit: 'ms', help: 'Stage 1: how long the vertical rail glow takes to recede. Scales with how lit it was.' },
      { k: 'bootEgressMs',    label: 'Branches drain',       step: 20,    unit: 'ms', help: 'Stage 2: how fast the branches off the core drain back in. Starts only once the rail has receded.' },
      { k: 'bootConnOutMs',   label: 'Core link drain',      step: 20,    unit: 'ms', help: 'Stage 2: how fast the core↔rail connector drains. The core is released to fade only once this lands.' },
      { k: 'bootRetractEase', label: 'Core fade speed',      step: 0.005,             help: 'Stage 3: how fast the core itself fades once the drain reaches it. Governs both boot and hover outros. Higher = snappier.' },

      { group: 'BOOT · SPARK', desc: 'The comet that climbs the rail' },
      { k: 'bootCometTail',   label: 'Trail length',         step: 5,     unit: 'px', help: 'Length of the comet’s glowing tail.' },
      { k: 'bootCometWidth',  label: 'Trail width',          step: 0.5,   unit: 'px', help: 'Thickness of the comet’s trail.' },
      { k: 'bootCometHead',   label: 'Head size',            step: 0.2,   unit: 'px', help: 'Radius of the bright comet head.' },

      { group: 'PULSE', desc: 'Vertical burst fired along the rail (boot + hover)' },
      { k: 'bootBurstMs',     label: 'Pulse travel time',    step: 20,    unit: 'ms', help: 'How long the pulse fronts take to run from the core to the rail edges.' },
      { k: 'bootBurstFadeIn', label: 'Pulse fade-in',        step: 0.02,              help: 'Fraction of the pulse over which the sparks well up out of the core. Kept above 0 so they never pop in broken.' },
      { k: 'bootBurstReach',  label: 'Pulse trail length',   step: 5,     unit: 'px', help: 'Length of each pulse spark’s trail.' },
      { k: 'bootBurstHead',   label: 'Pulse head size',      step: 0.2,   unit: 'px', help: 'Radius of the pulse spark heads.' },
      { k: 'railSparkTrail',  label: 'Glow follows spark',   step: 0.05,              help: 'How the rail glow trails the pulse: <1 hugs the spark, >1 a longer after-image. Must stay above 0.' },

      { group: 'RAIL GLOW', desc: 'Vertical glow on the main rail' },
      { k: 'railGlow',        label: 'Rail glow',            toggle: true,            help: 'Master switch for the vertical rail glow.' },
      { k: 'railGlowReach',   label: 'Glow length',          step: 4,     unit: 'px', help: 'How far the rail glow reaches above and below the core.' },
      { k: 'railFillMs',      label: 'Glow grow time',       step: 20,    unit: 'ms', help: 'How long the rail glow takes to expand, easing to a clean stop. Shared by boot + hover.' },

      { group: 'HOVER · CORE', desc: 'Live response when the cursor nears the chip' },
      { k: 'hoverRadius',     label: 'Wake distance',        step: 4,     unit: 'px', help: 'How close the cursor must get to wake and light the core.' },
      { k: 'highlightReach',  label: 'Glow radius',          step: 4,     unit: 'px', help: 'How far the core glow and branches reach out. Anchors the geometry, so it is never allowed to hit 0.' },
      { k: 'branchDone',      label: 'Branch finish point',  step: 0.01,              help: 'How early into the glow the branch traces finish drawing. Kept strictly between 0 and 1 (it drives two divisions).' },
      { k: 'coreSize',        label: 'Chip size',            step: 1,     unit: 'px', help: 'Half-size of the CPU chip body.' },
      { k: 'retractEase',     label: 'Rail fade speed',      step: 0.005,             help: 'Eases the rail glow’s growth fallback and residual settle. Kept 1:1 with the core fade by default. Higher = snappier.' },

      { group: 'SECTION NODES', desc: 'Pads that light on scroll / hover' },
      { k: 'nodeRailEase',    label: 'Rail-tick speed',      step: 0.01,              help: 'How fast the little rail mark snaps in (leads the colour).' },
      { k: 'nodeColEase',     label: 'Pad fill speed',       step: 0.01,              help: 'How fast colour fills the node pad behind it (follows the rail).' },
      { k: 'nodeRailLen',     label: 'Rail-tick length',     step: 1,     unit: 'px', help: 'Half-length of the vertical tick that straddles the active node.' },

      { group: 'MOTION & FEEL', desc: 'Cursor follow and parallax drift' },
      { k: 'mouseEase',       label: 'Cursor smoothing',     step: 0.01,              help: 'Lower = the glow lags further behind the cursor.' },
      { k: 'parallaxAmt',     label: 'Parallax strength',    step: 0.001,             help: 'How much the board drifts with the cursor (0 = locked).' },
      { k: 'parallaxEase',    label: 'Parallax smoothing',   step: 0.005,             help: 'How smoothly the board eases toward its parallax target.' },

      { group: 'LAYOUT', desc: 'Horizontal placement of core and rail' },
      { k: 'coreOffsetX',     label: 'Core X offset',        step: 4,     unit: 'px', help: 'Shifts the CPU chip left / right.' },
      { k: 'railOffsetX',     label: 'Rail X offset',        step: 4,     unit: 'px', help: 'Shifts the main vertical rail left / right.' },

      { group: 'APPEARANCE', desc: 'Brand accent colour' },
      { k: 'accent',          label: 'Accent color',         color: true, def: '#6847de', apply: 'accent', help: 'Recolours the whole site and the canvas live.' },
    ];

    (function checkPanelSync() {
      const panelKeys = FIELDS.filter(f => f.k).map(f => f.k);
      Object.keys(SCHEMA).forEach(k => {
        if (panelKeys.indexOf(k) < 0) console.warn('[tweaks] schema key has no panel control:', k);
      });
      panelKeys.forEach(k => {
        if (k !== 'accent' && !SCHEMA[k]) console.warn('[tweaks] panel key missing from schema:', k);
      });
    })();

    const drawer = document.createElement('div');
    drawer.id = 'curie-drawer';
    drawer.style.cssText = [
      'position: fixed; top: calc(var(--nav-height, 60px) + 10px); right: 14px; z-index: 1000;',
      'display: none; background: #101116; border: 1px solid #2a2b34; border-radius: 12px;',
      'padding: 18px 18px 20px; width: 612px; max-width: calc(100vw - 28px); max-height: 82vh; overflow-y: auto;',
      'box-shadow: 0 20px 60px -20px rgba(0,0,0,0.8);',
      'color: #c3c5cd; font-family: var(--font); font-size: 12px;',
    ].join('');

    const GROUP_TABS = {
      'BOOT · TIMELINE': 'Boot', 'BOOT · UN-LIGHT': 'Boot', 'BOOT · SPARK': 'Boot',
      'PULSE': 'Pulse', 'RAIL GLOW': 'Pulse',
      'HOVER · CORE': 'Hover',
      'SECTION NODES': 'Nodes',
      'MOTION & FEEL': 'Motion',
      'LAYOUT': 'Layout', 'APPEARANCE': 'Layout',
    };

    const title = document.createElement('div');
    title.style.cssText = 'display:flex; align-items:baseline; justify-content:space-between; gap:10px; margin:0 0 4px;';
    const titleT = document.createElement('div');
    titleT.style.cssText = 'font-size:13px; font-weight:600; color:#e6e7ec; letter-spacing:0.01em;';
    titleT.textContent = 'Settings';
    const titleS = document.createElement('div');
    titleS.style.cssText = 'font-size:10px; color:#5b5d68;';
    titleS.textContent = 'live · saved locally';
    title.appendChild(titleT); title.appendChild(titleS);
    drawer.appendChild(title);

    const clampNum = (v, sc) => {
      v = +v;
      if (!isFinite(v)) v = sc.def;
      return v < sc.min ? sc.min : v > sc.max ? sc.max : v;
    };

    const rangeHint = (sc, unit) => 'safe ' + sc.min + '–' + sc.max + (unit || '');

    const tabBar = document.createElement('div');
    tabBar.style.cssText = 'display:flex; flex-wrap:wrap; gap:6px; margin:12px 0 14px;';
    drawer.appendChild(tabBar);

    const panesWrap = document.createElement('div');
    drawer.appendChild(panesWrap);

    const tabOrder = [];
    const paneOf   = {};
    const tabCount = {};
    function paneFor(tab) {
      if (!paneOf[tab]) {
        const pane = document.createElement('div');
        pane.style.display = 'none';
        paneOf[tab] = pane;
        tabCount[tab] = 0;
        tabOrder.push(tab);
        panesWrap.appendChild(pane);
      }
      return paneOf[tab];
    }

    const REPLAY_DELAY_MS = 5000;
    let replayTimer = null;
    function scheduleBootReplay() {
      if (!replayBoot) return;
      if (replayTimer) clearTimeout(replayTimer);
      if (titleS) { titleS.textContent = '↻ boot replay queued…'; titleS.style.color = 'var(--lilac, #9d86ff)'; }
      replayTimer = setTimeout(() => {
        replayTimer = null;
        replayBoot();
        if (titleS) { titleS.textContent = '↻ boot replayed'; titleS.style.color = 'var(--lilac, #9d86ff)'; }
        setTimeout(() => { if (!replayTimer && titleS) { titleS.textContent = 'live · saved locally'; titleS.style.color = '#5b5d68'; } }, 1400);
      }, REPLAY_DELAY_MS);
    }

    let currentPane = null;
    let currentTab  = null;

    FIELDS.forEach(f => {
      if (f.group) {
        const tab = GROUP_TABS[f.group] || 'Misc';
        currentTab  = tab;
        currentPane = paneFor(tab);
        const wrap = document.createElement('div');

        wrap.style.cssText = tabCount[tab]++ === 0
          ? 'margin: 2px 0 12px;'
          : 'margin: 24px 0 12px; padding-top: 16px; border-top: 1px solid #1b1c22;';
        const g = document.createElement('div');
        g.style.cssText = 'color: var(--lilac, #9d86ff); font-size: 10px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase;';
        g.textContent = f.group;
        wrap.appendChild(g);
        if (f.desc) {
          const d = document.createElement('div');
          d.style.cssText = 'color: #6f7180; font-size: 10.5px; margin-top: 3px; line-height: 1.4;';
          d.textContent = f.desc;
          wrap.appendChild(d);
        }
        currentPane.appendChild(wrap);
        return;
      }

      const sc = SCHEMA[f.k];
      const def = sc && sc.def !== undefined ? sc.def : f.def;
      const isBoot = currentTab === 'Boot';

      const block = document.createElement('div');
      block.style.cssText = 'margin: 0 0 16px;';

      const head = document.createElement('div');
      head.style.cssText = 'display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 6px;';
      const lbl = document.createElement('label');
      lbl.style.cssText = 'font-size: 12px; color: #c9cbd3; font-weight: 500;';
      lbl.textContent = f.label;
      head.appendChild(lbl);
      block.appendChild(head);

      let after = null;

      function runApply(v) {
        if (f.apply === 'accent') applyAccent(v);
      }

      if (f.color) {
        const cur = cfg[f.k] !== undefined ? cfg[f.k] : def;
        const swatch = document.createElement('button');
        swatch.type = 'button';
        swatch.style.cssText = 'width: 46px; height: 24px; padding: 0; border: 1px solid #2a2b34; '
          + 'border-radius: 6px; cursor: pointer; background: ' + String(cur) + ';';
        const picker = createColorPicker(String(cur), (hex) => {
          cfg[f.k] = hex; persist(); runApply(hex); swatch.style.background = hex;
        });
        picker.el.style.display = 'none';
        swatch.addEventListener('click', () => {
          picker.el.style.display = picker.el.style.display === 'none' ? 'flex' : 'none';
        });
        head.appendChild(swatch);
        after = picker.el;
      } else if (f.toggle) {
        const cur = cfg[f.k] !== undefined ? !!cfg[f.k] : !!def;
        const chk = document.createElement('input');
        chk.type    = 'checkbox';
        chk.className = 'cp-check';
        chk.checked = cur;
        chk.addEventListener('change', () => {
          cfg[f.k] = chk.checked;
          persist();
          runApply(chk.checked);
          if (isBoot) scheduleBootReplay();
        });
        head.appendChild(chk);
      } else {
        const cur = clampNum(cfg[f.k] !== undefined ? cfg[f.k] : def, sc);

        const val = document.createElement('span');
        val.style.cssText = 'color: var(--lilac, #9d86ff); font-size: 12px; font-variant-numeric: tabular-nums; font-weight: 600;';
        val.textContent   = cur + (f.unit || '');
        head.appendChild(val);

        const inp = document.createElement('input');
        inp.type  = 'range';
        inp.className = 'cp-range';
        inp.style.width = '100%';
        inp.min   = String(sc.min);
        inp.max   = String(sc.max);
        inp.step  = String(f.step);
        inp.value = String(cur);

        const setFill = () => {
          const pct = ((parseFloat(inp.value) - sc.min) / (sc.max - sc.min)) * 100;
          inp.style.setProperty('--fill', pct + '%');
        };
        setFill();

        inp.addEventListener('input', () => {
          const v = f.step < 1 ? parseFloat(inp.value) : parseInt(inp.value);
          cfg[f.k] = v;
          val.textContent = v + (f.unit || '');
          setFill();
          persist();
          runApply(v);
          if (isBoot) scheduleBootReplay();
        });
        block.appendChild(inp);
      }

      if (f.help || sc) {
        const cap = document.createElement('div');
        cap.style.cssText = 'font-size: 10.5px; color: #6f7180; margin-top: 6px; line-height: 1.45; display: flex; justify-content: space-between; gap: 12px;';
        const txt = document.createElement('span');
        txt.textContent = f.help || '';
        cap.appendChild(txt);
        if (sc && typeof sc.min === 'number') {
          const hint = document.createElement('span');
          hint.style.cssText = 'color: #4f515b; white-space: nowrap; flex: none;';
          hint.textContent = rangeHint(sc, f.unit);
          cap.appendChild(hint);
        }
        block.appendChild(cap);
      }

      if (after) block.appendChild(after);
      (currentPane || drawer).appendChild(block);
    });

    const tabBtns = {};
    function selectTab(tab) {
      tabOrder.forEach(t => {
        const active = t === tab;
        if (paneOf[t]) paneOf[t].style.display = active ? 'block' : 'none';
        const b = tabBtns[t];
        if (b) {
          b.style.background  = active ? 'rgba(var(--purple-rgb), 0.18)' : 'transparent';
          b.style.borderColor = active ? 'rgba(var(--purple-rgb), 0.55)' : '#2a2b34';
          b.style.color       = active ? 'var(--lilac, #9d86ff)' : '#8b8d98';
        }
      });
      try { localStorage.setItem('curieSettingsTab', tab); } catch (e) {}
    }
    tabOrder.forEach(tab => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = tab;
      b.style.cssText = 'flex:none; padding:6px 12px; border:1px solid #2a2b34; border-radius:7px; '
        + 'background:transparent; color:#8b8d98; font-family:inherit; font-size:11px; font-weight:600; '
        + 'cursor:pointer; transition:color .12s, border-color .12s, background .12s;';
      b.addEventListener('click', () => selectTab(tab));
      tabBtns[tab] = b;
      tabBar.appendChild(b);
    });

    let startTab = tabOrder[0];
    try { const saved = localStorage.getItem('curieSettingsTab'); if (saved && paneOf[saved]) startTab = saved; } catch (e) {}
    if (startTab) selectTab(startTab);

    const btns = document.createElement('div');
    btns.style.cssText = 'display: flex; gap: 8px; margin-top: 12px;';
    const reset = document.createElement('button');
    reset.textContent = 'reset';
    reset.style.cssText = 'flex: 1; background: #1b1c22; border: 1px solid #2a2b34; color: #c3c5cd; border-radius: 6px; padding: 6px; cursor: pointer; font-family: inherit; font-size: 11px;';
    reset.addEventListener('click', () => {

      Object.keys(cfg).forEach(k => delete cfg[k]);
      try { localStorage.removeItem('curieAnimCfg'); } catch (e) {}
      applyAccent('#6847de');

      const oldGear = document.getElementById('curie-gear');
      const oldDrawer = document.getElementById('curie-drawer');
      if (oldGear) oldGear.remove();
      if (oldDrawer) oldDrawer.remove();
      buildTweakPanel(cfg, replayBoot);

      const d = document.getElementById('curie-drawer');
      if (d) d.style.display = 'block';
    });
    const replay = document.createElement('button');
    replay.textContent = 'replay boot';
    replay.style.cssText = 'flex: 1; background: rgba(var(--purple-rgb), 0.18); border: 1px solid rgba(var(--purple-rgb), 0.55); color: var(--lilac, #9d86ff); border-radius: 6px; padding: 6px; cursor: pointer; font-family: inherit; font-size: 11px;';
    replay.addEventListener('click', () => replayBoot && replayBoot());
    btns.appendChild(reset);
    btns.appendChild(replay);
    drawer.appendChild(btns);

    const gear = document.createElement('button');
    gear.id = 'curie-gear';
    gear.title = 'animation settings';
    gear.setAttribute('aria-label', 'Animation settings');
    gear.style.cssText = [
      'background: #131419; border: 1px solid var(--border-nav, #2a2b34); border-radius: 8px;',
      'color: #6f7180; font-size: 16px; width: 34px; height: 34px; flex: none;',
      'cursor: pointer; display: none; align-items: center; justify-content: center;',
      'transition: color .15s, border-color .15s;',
    ].join('');
    gear.innerHTML = '⚙';

    function setOpen(open) {
      drawer.style.display = open ? 'block' : 'none';
      gear.style.color       = open ? 'var(--lilac, #9d86ff)' : '#6f7180';
      gear.style.borderColor = open ? 'rgba(var(--purple-rgb), 0.55)' : 'var(--border-nav, #2a2b34)';
      gear.setAttribute('aria-expanded', String(open));
    }
    gear.setAttribute('aria-expanded', 'false');

    gear.addEventListener('click', e => {
      e.stopPropagation();
      setOpen(drawer.style.display !== 'block');
    });
    gear.addEventListener('mouseenter', () => {
      if (drawer.style.display !== 'block') { gear.style.color = 'var(--lilac, #9d86ff)'; gear.style.borderColor = 'rgba(var(--purple-rgb), 0.55)'; }
    });
    gear.addEventListener('mouseleave', () => {
      if (drawer.style.display !== 'block') { gear.style.color = '#6f7180'; gear.style.borderColor = 'var(--border-nav, #2a2b34)'; }
    });

    drawer.addEventListener('click', e => e.stopPropagation());

    document.addEventListener('click', () => {
      if (drawer.style.display === 'block') setOpen(false);
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && drawer.style.display === 'block') setOpen(false);
    });

    const navBar = document.getElementById('nav');
    const navSearch = document.getElementById('nav-search');
    if (navBar && navSearch && navSearch.parentNode === navBar) {
      navBar.insertBefore(gear, navSearch.nextSibling);
    } else if (navBar) {
      navBar.appendChild(gear);
    } else {
      gear.style.position = 'fixed'; gear.style.top = '14px'; gear.style.right = '14px'; gear.style.zIndex = '1000';
      document.body.appendChild(gear);
    }
    document.body.appendChild(drawer);

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

  if (animCfg.accent) applyAccent(animCfg.accent);

  const canvas = document.getElementById('circuit-canvas');
  let replayBoot;

  if (canvas) {
    const circuit = initCircuit(canvas, () => animCfg, () => true);
    circuitSyncColors = circuit.syncColors;
    circuitSyncColors();

    replayBoot = () => {
      circuit.replayBoot();
      const h1El = document.getElementById('hero-name');
      if (h1El) bootHeroName(h1El, coreLitMs());
    };
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
  buildEducation();
  buildContact();

  if (animCfg.accent) applyAccent(animCfg.accent);
  buildChips(term);
  initSections();
  initSectionReveals();
  initBackgroundSizing();
  initHero();
  initLogo();

  let tweaksBuilt = false;
  function ensureTweakPanel() {
    if (tweaksBuilt) return;
    tweaksBuilt = true;
    buildTweakPanel(animCfg, replayBoot);
  }

  if (settingsButtonShown()) ensureTweakPanel();

  if ('requestIdleCallback' in window) requestIdleCallback(prefetchIconTints);
  else setTimeout(prefetchIconTints, 1200);

})();
