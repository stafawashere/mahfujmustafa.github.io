class Shell {
  constructor(bodyEl, inputEl, onRoot) {
    this.body   = bodyEl;
    this.input  = inputEl;
    this.onRoot = onRoot || (() => {});
    this.promptRow = document.getElementById('term-prompt-row');

    this.root    = false;
    this.inVim   = false;
    this.busy    = false;
    this.history = [];
    this.hindex  = 0;
    this.registry = CommandRegistry;

    this.C = {
      txt:  '#c3c5cd', dim:  '#6f7180', faint:'#4f5159', p:   'var(--lilac, #9d86ff)',
      acc:  'var(--purple, #6847de)', ok: '#65d6a6', err: '#f0726b', warn:'#e8c06e',
      w:    '#f1f2f6', host: '#7fd1b9',
    };

    this.projects = PORTFOLIO.projects.map(p => ({
      id: p.id, name: p.name, type: p.type, date: p.date,
      stack: p.tech.join(' · '), url: p.url, blurb: p.desc,
    }));
    this.experiences = PORTFOLIO.experiences.map(x => ({
      org: x.org, role: x.role, dates: x.dates, note: x.points[0] || '', points: x.points,
    }));
    this.education = PORTFOLIO.education.map(e => ({
      name: e.name, kind: e.kind, dates: e.dates, note: e.note,
    }));

    // F10: single delegated listener instead of one per linked segment.
    if (this.body) {
      this.body.addEventListener('click', (e) => {
        const el = e.target.closest('[data-cmd], [data-open]');
        if (!el || !this.body.contains(el)) return;
        if (el.dataset.cmd != null) this.run(el.dataset.cmd);
        else if (el.dataset.open != null) this.openUrl(el.dataset.open);
      });
    }
  }

  parseFlags(tokens) {
    const flags = {}, positional = [];
    tokens.forEach(tok => {
      if (tok.startsWith('--')) {
        const [k, v] = tok.slice(2).split('=');
        flags[k] = v === undefined ? true : v;
      } else if (tok.startsWith('-') && tok.length > 1) {
        tok.slice(1).split('').forEach(ch => { flags[ch] = true; });
      } else {
        positional.push(tok);
      }
    });
    return { flags, positional };
  }

  makeContext(name, argline) {
    const C = this.C;
    const tokens = argline ? argline.split(/\s+/) : [];
    const { flags, positional } = this.parseFlags(tokens);
    return {
      shell: this, C, colors: C,
      out: new Output(C),
      name, argline, arg: argline, argl: argline.toLowerCase(),
      tokens, args: positional, flags, root: this.root,
      data: {
        projects: this.projects, experiences: this.experiences,
        education: this.education, portfolio: PORTFOLIO,
      },
      print:      (...lines) => this.printLines(lines.flat()),
      type:       (text, opts) => this.typeLine(text, opts),
      sleep:      ms => this.sleep(ms),
      clear:      () => this.clearScreen(),
      run:        raw => this.run(raw),
      runCommand: (n, a) => this.dispatchLines(n, a || ''),
      openUrl:    url => this.openUrl(url),
      findProject: q => this.findProject(q),
      setVim:     v => { this.inVim = v; },
      registry:   this.registry,
      banners:    TerminalBanners,
      neofetch:   () => TerminalBanners.neofetch(C, this.root),
    };
  }

  dispatchLines(name, argline) {
    const def = this.registry.find(name);
    if (!def || (def.root && !this.root)) return this.notFoundLines(name);
    const ctx = this.makeContext(name, argline);
    return this.normalize(def.run(ctx), ctx);
  }

  normalize(ret, ctx) {
    if (ret == null) return ctx.out.lines;
    if (ret instanceof Output) return ret.lines;
    if (Array.isArray(ret)) return ret;
    if (typeof ret === 'string' || typeof ret === 'number') return [{ segs: [this.seg(String(ret))] }];
    return [];
  }

  run(raw) { this.exec(raw); }

  async exec(raw) {
    if (this.busy) return;
    const C = this.C;
    const input = String(raw == null ? '' : raw).replace(/\s+$/, '');
    const trimmed = input.trim();

    this.appendLine(this.promptLine(input));
    if (trimmed) { this.history.push(trimmed); this.hindex = this.history.length; }

    if (this.inVim) {
      if (/^:(q!?|wq|x)$/i.test(trimmed)) {
        this.inVim = false;
        this.printLines([this.line(this.seg('Escaped vim. Few return.', C.ok))]);
      } else {
        this.printLines([this.line(this.seg('E37: ', C.err, 700), this.seg('type ', C.txt), this.seg(':q', C.p, 700), this.seg(' to quit. You are trapped in vim.', C.txt))]);
      }
      return this.resetInput();
    }

    const parts   = trimmed.split(/\s+/);
    const name    = (parts[0] || '').toLowerCase();
    const argline = parts.slice(1).join(' ');

    if (name === '') { this.printLines([this.blank()]); return this.resetInput(); }

    const def = this.registry.find(name);
    if (!def || (def.root && !this.root)) {
      this.printLines([...this.notFoundLines(name), this.blank()]);
      return this.resetInput();
    }
    if (def.clears) { this.clearScreen(); return this.resetInput(); }

    const ctx = this.makeContext(name, argline);
    this.busy = true;
    let ret;
    try {
      ret = def.run(ctx);
      if (ret && typeof ret.then === 'function') ret = await ret;
    } catch (e) {
      ret = [this.line(this.seg('error: ', C.err, 700), this.seg(String((e && e.message) || e), C.txt))];
    }
    this.busy = false;

    const lines = this.normalize(ret, ctx);
    this.printLines(def.bare ? lines : [...lines, this.blank()]);
    this.resetInput();
  }

  resetInput() { if (this.input) { this.input.value = ''; this.input.focus(); } }

  boot() {
    const C = this.C;
    this.printLines([
      { node: TerminalBanners.name(C, true) },
      this.blank(),
      this.line(this.seg('mahfuj', C.p, 700), this.seg('OS', C.w, 700), this.seg('  v4.2.0  ', C.w), this.seg('— secure shell (tty1)', C.dim)),
      this.line(this.seg('Last login: ', C.dim), this.seg(new Date().toUTCString(), C.txt)),
      this.blank(),
      this.line(this.seg('Type ', C.dim), this.seg('help', C.p, 700), this.seg(' to begin, or ', C.dim), this.seg('whoami', C.p, 700), this.seg('.', C.dim)),
      this.blank(),
    ]);
  }

  notFoundLines(name) {
    const C = this.C;
    const names = this.registry.names();
    let best = null, bd = 99;
    names.forEach(n => { const d = this.lev(name, n); if (d < bd) { bd = d; best = n; } });
    const out = [this.line(this.seg('command not found: ', C.err), this.seg(name, C.warn, 700))];
    if (best && bd <= 3)
      out.push(this.line(this.seg('did you mean ', C.dim), Object.assign(this.seg(best, C.p, 700), { cmd: best }), this.seg('?  ', C.dim), this.seg('— or type ', C.faint), this.seg('help', C.p, 600)));
    else
      out.push(this.line(this.seg('type ', C.dim), this.seg('help', C.p, 700), this.seg(' for the list of commands.', C.dim)));
    return out;
  }

  unlockRoot() {
    if (this.root) return;
    const C = this.C;
    this.root = true;
    this.onRoot();
    this.printLines([
      this.blank(),
      { node: TerminalBanners.root(C) },
      this.blank(),
      this.line(this.seg('  [', C.dim), this.seg('✓', C.ok, 700), this.seg('] ', C.dim), this.seg('konami sequence accepted', C.txt)),
      this.line(this.seg('  [', C.dim), this.seg('✓', C.ok, 700), this.seg('] ', C.dim), this.seg('bypassing auth … ', C.txt), this.seg('uid=0(root) gid=0(root)', C.warn)),
      this.line(this.seg('  [', C.dim), this.seg('✓', C.ok, 700), this.seg('] ', C.dim), this.seg('you are now ', C.txt), this.seg('root', C.err, 700), this.seg('. with great power comes ', C.txt), this.seg('git blame', C.p, 600), this.seg('.', C.txt)),
      this.blank(),
      this.line(this.seg('  new commands unlocked: ', C.dim),
        Object.assign(this.seg('flag', C.err, 700), { cmd: 'flag' }), this.seg('   ', C.dim),
        Object.assign(this.seg('rootkit', C.err, 700), { cmd: 'rootkit' }), this.seg('   ', C.dim),
        Object.assign(this.seg('sudo hire', C.err, 700), { cmd: 'sudo hire' })),
      this.blank(),
    ]);
  }

  seg(text, color, weight) {
    return {
      text:  text == null ? '' : String(text),
      style: 'color:' + (color || this.C.txt) + ';' + (weight ? 'font-weight:' + weight + ';' : ''),
    };
  }
  line(...segs) { return { segs: segs.length ? segs : [this.seg(' ')] }; }
  blank() { return this.line(); }

  appendLine(line) {
    const row = document.createElement('div');
    row.className = 'term-line';
    if (line.node) {
      if (line.node instanceof HTMLElement) row.appendChild(line.node);
      else row.textContent = '[render error]';
      return this._mount(row);
    }
    (line.segs || []).forEach(seg => {
      const span = document.createElement('span');
      span.textContent = seg.text;
      if (seg.style) span.style.cssText = seg.style;
      if (seg.cmd) {
        span.style.cursor = 'pointer';
        span.style.textDecoration = 'underline';
        span.style.textDecorationColor = this.C.acc;
        span.dataset.cmd = seg.cmd;
      }
      if (seg.open) {
        span.style.cursor = 'pointer';
        span.dataset.open = seg.open;
      }
      row.appendChild(span);
    });
    this._mount(row);
  }

  _mount(row) {
    if (this.promptRow && this.promptRow.parentNode === this.body) {
      this.body.insertBefore(row, this.promptRow);
    } else {
      this.body.appendChild(row);
    }
  }

  printLines(lines) { lines.forEach(l => this.appendLine(l)); this.scrollToBottom(); }
  scrollToBottom() { requestAnimationFrame(() => { this.body.scrollTop = this.body.scrollHeight; }); }

  clearScreen() {
    Array.from(this.body.children).forEach(child => {
      if (child !== this.promptRow) this.body.removeChild(child);
    });
  }

  promptLine(input) {
    const C = this.C, r = this.root;
    return this.line(
      this.seg(r ? 'root' : 'visitor', r ? C.err : C.host, 700),
      this.seg('@', C.dim),
      this.seg('mahfujmustafa.dev', r ? C.err : C.host, 600),
      this.seg(':', C.dim),
      this.seg(r ? '/root' : '~', C.p, 600),
      this.seg(r ? '# ' : '$ ', r ? C.err : C.acc, 700),
      this.seg(input || '', C.w),
    );
  }

  sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

  async typeLine(text, opts) {
    opts = opts || {};
    const speed = opts.speed || 16;
    const row = document.createElement('div');
    row.className = 'term-line';
    const span = document.createElement('span');
    span.style.cssText = 'color:' + (opts.color || this.C.txt) + ';' + (opts.weight ? 'font-weight:' + opts.weight + ';' : '');
    row.appendChild(span);
    this._mount(row);
    for (let i = 0; i < text.length; i++) {
      span.textContent = text.slice(0, i + 1);
      this.scrollToBottom();
      await this.sleep(speed);
    }
  }

  tabComplete(inputEl) {
    const cur = inputEl.value;
    const parts = cur.split(/\s+/);

    if (parts.length > 1) {
      const head = parts[0].toLowerCase();
      if (head === 'cat' || head === 'open' || head === 'ls') {
        const frag = parts[parts.length - 1].toLowerCase();
        const m = this.projects.map(p => p.id).filter(id => id.startsWith(frag));
        if (m.length === 1) {
          parts[parts.length - 1] = m[0];
          inputEl.value = parts.join(' ');
          this.caretEnd(inputEl);
        }
      }
      return;
    }

    const frag = parts[0].toLowerCase();
    if (!frag) return;
    const matches = this.registry.names().filter(n => n.startsWith(frag));

    if (matches.length === 1) {
      inputEl.value = matches[0] + ' ';
      this.caretEnd(inputEl);
    } else if (matches.length > 1) {
      const C = this.C;
      const segs = [this.seg('  ', C.dim)];
      matches.forEach(m => segs.push(Object.assign(this.seg(this.pad(m, 12), C.p, 600), { cmd: m })));
      this.appendLine(this.promptLine(cur));
      this.appendLine({ segs });
      this.scrollToBottom();
    }
  }

  caretEnd(el) { requestAnimationFrame(() => { const v = el.value.length; el.setSelectionRange(v, v); }); }

  historyUp(inputEl) {
    if (!this.history.length) return;
    this.hindex = Math.max(0, this.hindex - 1);
    inputEl.value = this.history[this.hindex] || '';
    this.caretEnd(inputEl);
  }

  historyDown(inputEl) {
    this.hindex = Math.min(this.history.length, this.hindex + 1);
    inputEl.value = this.history[this.hindex] || '';
    this.caretEnd(inputEl);
  }

  findProject(q) {
    q = (q || '').toLowerCase().replace(/\.(txt|md|json)$/, '').replace(/[\s_]+/g, '-');
    return this.projects.find(p =>
      p.id === q || p.id.includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.name.toLowerCase().replace(/[\s.]+/g, '-').includes(q));
  }

  pad(s, n) { s = String(s); return s.length >= n ? s : s + ' '.repeat(n - s.length); }

  openUrl(url) { try { window.open(url, '_blank', 'noopener'); } catch (e) {} }

  lev(a, b) {
    const m = a.length, n = b.length;
    const d = Array.from({ length: m + 1 }, (_, i) => [i, ...new Array(n).fill(0)]);
    for (let j = 0; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++)
        d[i][j] = Math.min(d[i-1][j]+1, d[i][j-1]+1, d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
    return d[m][n];
  }
}

window.Shell = Shell;
window.Terminal = Shell;
