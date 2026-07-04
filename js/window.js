class TermWindow {
  constructor(winEl, cardEl, contentEl, bodyEl, titlebarEl, gripEl) {
    this.win      = winEl;
    this.card     = cardEl;
    this.content  = contentEl;
    this.body     = bodyEl;
    this.titlebar = titlebarEl;
    this.grip     = gripEl;

    this.state = this._loadState();
    this.dragging = false;

    this._applyState();
    this._bindResize();
  }

  _defaultState() {
    const w = Math.min(740, window.innerWidth - 24);
    const x = Math.round((window.innerWidth - w) / 2);
    const y = 90;
    return { open: false, st: 'normal', w, x, y, h: 408 };
  }

  _loadState() {
    try {
      const s = JSON.parse(localStorage.getItem('mm_win') || '{}');
      const def = this._defaultState();
      return {
        open: typeof s.open === 'boolean' ? s.open : def.open,
        st:   ['min','max','normal'].includes(s.st) ? s.st : def.st,
        w:    (typeof s.w === 'number' && s.w >= 320 && s.w <= 1400) ? s.w : def.w,
        x:    typeof s.x === 'number' ? s.x : def.x,
        y:    typeof s.y === 'number' ? s.y : def.y,
        h:    (typeof s.h === 'number' && s.h >= 220 && s.h <= 860) ? s.h : def.h,
      };
    } catch (e) {
      return this._defaultState();
    }
  }

  _save() {
    try { localStorage.setItem('mm_win', JSON.stringify(this.state)); } catch (e) {}
  }

  _applyState() {
    const { open, st, w, x, y, h } = this.state;
    const max = st === 'max', min = st === 'min';

    this.win.classList.toggle('is-open', open);
    this.win.classList.toggle('is-max', max);
    this.win.classList.toggle('is-min', min);

    if (max) {
      this.win.style.left   = '12px';
      this.win.style.right  = '12px';
      this.win.style.top    = '66px';
      this.win.style.bottom = '14px';
      this.win.style.width  = '';
    } else {
      this.win.style.left   = x + 'px';
      this.win.style.top    = y + 'px';
      this.win.style.right  = '';
      this.win.style.bottom = '';
      this.win.style.width  = w + 'px';
    }

    if (!max && this.body) {
      this.body.style.height = h + 'px';
    } else if (this.body) {
      this.body.style.height = '';
    }

    this._updateDims();
  }

  _updateDims() {
    const dimsEl = this.win.querySelector('#term-dims');
    if (!dimsEl || !this.body) return;
    const w = this.body.clientWidth - 40;
    const charW = 13.5 * 0.6015;
    const cols  = Math.max(20, Math.floor(w / charW));
    const rows  = Math.max(1,  Math.floor((this.body.clientHeight - 34) / 21.87));
    dimsEl.textContent = cols + '×' + rows;
  }

  open() {
    this.state.open = true;
    if (this.state.st === 'min') this.state.st = 'normal';
    this._applyState();
    this._save();
    setTimeout(() => {
      const inp = this.win.querySelector('#term-input');
      if (inp) inp.focus();
    }, 90);
  }

  close() {
    this.state.open = false;
    this._applyState();
    this._save();
  }

  toggle() {
    if (this.state.open && this.state.st !== 'min') this.close();
    else this.open();
  }

  minimize() {
    this.state.st = this.state.st === 'min' ? 'normal' : 'min';
    this._applyState();
    this._save();
    setTimeout(() => this._updateDims(), 60);
  }

  maximize() {
    this.state.st = this.state.st === 'max' ? 'normal' : 'max';
    this._applyState();
    this._save();
    setTimeout(() => this._updateDims(), 60);
  }

  isOpen() { return this.state.open; }

  startDrag(e) {
    if (this.state.st === 'max') return;
    e.preventDefault();

    const startX = e.clientX, startY = e.clientY;
    const ox = this.state.x, oy = this.state.y;
    this.dragging = true;
    document.body.style.userSelect = 'none';

    this.win.style.transition = 'none';

    const move = (ev) => {
      const nx = ox + (ev.clientX - startX);
      const ny = oy + (ev.clientY - startY);
      const maxX = window.innerWidth  - 90;
      const maxY = window.innerHeight - 56;
      this.state.x = Math.max(-(this.state.w - 130), Math.min(maxX, nx));
      this.state.y = Math.max(56, Math.min(maxY, ny));
      this.win.style.left = this.state.x + 'px';
      this.win.style.top  = this.state.y + 'px';
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.style.userSelect = '';
      this.dragging = false;
      this.win.style.transition = '';
      this._save();
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  startResize(e) {
    e.preventDefault();
    const startY = e.clientY, startH = this.state.h;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ns-resize';

    const move = (ev) => {
      const h = Math.max(220, Math.min(860, startH + (ev.clientY - startY)));
      this.state.h = h;
      if (this.body) this.body.style.height = h + 'px';
      this._updateDims();
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      this._save();
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  _bindResize() {
    let settleTimer = null;
    window.addEventListener('resize', () => {
      const w  = Math.min(940, window.innerWidth - 24);
      const maxX = Math.max(12, window.innerWidth  - 90);
      const maxY = Math.max(56, window.innerHeight - 56);
      this.state.w = w;
      this.state.x = Math.min(this.state.x, maxX);
      this.state.y = Math.min(this.state.y, maxY);
      this._applyState();
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => this._save(), 150);
    });
  }
}
