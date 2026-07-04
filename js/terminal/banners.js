const TerminalBanners = {
  asciiName: [
    '███╗   ███╗ █████╗ ██╗  ██╗███████╗██╗   ██╗     ██╗',
    '████╗ ████║██╔══██╗██║  ██║██╔════╝██║   ██║     ██║',
    '██╔████╔██║███████║███████║█████╗  ██║   ██║     ██║',
    '██║╚██╔╝██║██╔══██║██╔══██║██╔══╝  ██║   ██║██   ██║',
    '██║ ╚═╝ ██║██║  ██║██║  ██║██║     ╚██████╔╝╚█████╔╝',
    '╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝      ╚═════╝  ╚════╝ ',
  ],

  asciiRoot: [
    '██████╗  ██████╗  ██████╗ ████████╗',
    '██╔══██╗██╔═══██╗██╔═══██╗╚══██╔══╝',
    '██████╔╝██║   ██║██║   ██║   ██║   ',
    '██╔══██╗██║   ██║██║   ██║   ██║   ',
    '██║  ██║╚██████╔╝╚██████╔╝   ██║   ',
    '╚═╝  ╚═╝ ╚═════╝  ╚═════╝    ╚═╝   ',
  ],

  name(C, animate) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding: 2px 0 2px;';

    const grad = 'linear-gradient(100deg, ' + C.acc + ' 0%, ' + C.p + ' 38%, #efe9ff 54%, ' + C.p + ' 74%, ' + C.acc + ' 100%)';
    const art = document.createElement('div');
    art.style.cssText = [
      'white-space: pre;',
      'font-weight: 700;',
      'font-size: clamp(6px, 1.42vw, 13px);',
      'line-height: 1.05;',
      'letter-spacing: 0;',
      'background: ' + grad + ';',
      '-webkit-background-clip: text;',
      'background-clip: text;',
      'color: transparent;',
      '-webkit-text-fill-color: transparent;',
      'width: fit-content;',
      'max-width: 100%;',
    ].join('');
    // F9: animation lives in CSS classes so `prefers-reduced-motion` media queries apply.
    art.className = animate ? 'term-banner term-banner--wipe' : 'term-banner';
    art.textContent = this.asciiName.join('\n');

    const sub = document.createElement('div');
    sub.style.cssText = 'display: flex; align-items: baseline; gap: 11px; margin: 13px 0 1px; white-space: nowrap;';

    const corner = document.createElement('span');
    corner.style.color = C.acc;
    corner.textContent = '└─';

    const name = document.createElement('span');
    name.style.cssText = 'color: ' + C.w + '; font-weight: 700; letter-spacing: 0.04em;';
    name.textContent = 'MAHFUJ MUSTAFA';

    const tagline = document.createElement('span');
    tagline.style.cssText = 'color: ' + C.dim + '; overflow: hidden; text-overflow: ellipsis;';
    tagline.textContent = 'security researcher · full-stack dev · NYC';

    sub.appendChild(corner);
    sub.appendChild(name);
    sub.appendChild(tagline);
    wrap.appendChild(art);
    wrap.appendChild(sub);
    return wrap;
  },

  root(C) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding: 2px 0 2px;';

    const art = document.createElement('div');
    art.style.cssText = [
      'white-space: pre;',
      'font-weight: 700;',
      'font-size: clamp(6px, 1.4vw, 13px);',
      'line-height: 1.05;',
      'letter-spacing: 0;',
      'background: linear-gradient(100deg, #b5322c 0%, #f0726b 36%, #ffb0a8 52%, #f0726b 70%, #b5322c 100%);',
      '-webkit-background-clip: text;',
      'background-clip: text;',
      'color: transparent;',
      '-webkit-text-fill-color: transparent;',
      'width: fit-content;',
      'max-width: 100%;',
      'filter: drop-shadow(2px 0 0 rgba(86,128,255,0.5)) drop-shadow(-2px 0 0 rgba(240,114,107,0.6)) drop-shadow(0 1px 18px rgba(240,114,107,0.5));',
    ].join('');
    // F9: wipe + glitch moved to a CSS class so reduced-motion can disable them.
    art.className = 'term-banner--root';
    art.textContent = this.asciiRoot.join('\n');

    const sub = document.createElement('div');
    sub.style.cssText = 'display: flex; align-items: baseline; gap: 11px; margin: 12px 0 1px; white-space: nowrap;';

    const corner = document.createElement('span');
    corner.style.color = C.err;
    corner.textContent = '└─';

    const granted = document.createElement('span');
    granted.style.cssText = 'color: ' + C.err + '; font-weight: 700; letter-spacing: 0.16em;';
    granted.textContent = 'ACCESS GRANTED';

    const uid = document.createElement('span');
    uid.style.color = C.warn;
    uid.textContent = 'uid=0(root) gid=0(root)';

    sub.appendChild(corner);
    sub.appendChild(granted);
    sub.appendChild(uid);
    wrap.appendChild(art);
    wrap.appendChild(sub);
    return wrap;
  },

  neofetch(C, root) {
    const uColor = root ? C.err : C.host;

    const artLines = [
      '┌─────────┐',
      '│ ▞▚▞▚▞▚▞ │',
      '│ ▚  ◆  ▞ │',
      '│ ▞▚▞▚▞▚▞ │',
      '└─────────┘',
    ];

    const artCol = document.createElement('div');
    artCol.style.cssText = 'white-space: pre; font-weight: 700; line-height: 1.5; margin-right: 28px; flex-shrink: 0; font-size: 13.5px;';
    artLines.forEach((line, i) => {
      const div = document.createElement('div');
      div.style.color = i === 2 ? C.acc : C.p;
      div.textContent = line;
      artCol.appendChild(div);
    });

    const info = [
      { k: 'host',   v: 'Mahfuj Mustafa' },
      { k: 'role',   v: 'Security Researcher / Full-Stack Dev' },
      { k: 'age',    v: '17 · New York City' },
      { k: 'uptime', v: 'shipping since 2021' },
      { k: 'impact', v: '78M+ player visits' },
      { k: 'shell',  v: root ? 'mahfujOS v4.2.0 (root)' : 'mahfujOS v4.2.0' },
      { k: 'status', v: '● available for work', ok: true },
    ];

    const infoCol = document.createElement('div');
    infoCol.style.cssText = 'display: flex; flex-direction: column;';

    const header = document.createElement('div');
    header.style.cssText = 'display: flex; white-space: pre;';
    const userSpan = document.createElement('span');
    userSpan.style.cssText = 'color: ' + uColor + '; font-weight: 700;';
    userSpan.textContent = root ? 'root' : 'visitor';
    const atSpan = document.createElement('span');
    atSpan.style.color = C.dim;
    atSpan.textContent = '@';
    const hostSpan = document.createElement('span');
    hostSpan.style.cssText = 'color: ' + uColor + '; font-weight: 700;';
    hostSpan.textContent = 'mahfujmustafa.dev';
    header.appendChild(userSpan);
    header.appendChild(atSpan);
    header.appendChild(hostSpan);

    const sep = document.createElement('div');
    sep.style.cssText = 'height: 1px; background: #23242b; margin: 5px 0 9px;';

    infoCol.appendChild(header);
    infoCol.appendChild(sep);

    info.forEach(row => {
      const rowEl = document.createElement('div');
      rowEl.style.cssText = 'display: flex; gap: 16px; line-height: 1.65;';
      const kEl = document.createElement('span');
      kEl.style.cssText = 'color: ' + C.p + '; font-weight: 600; width: 58px; flex-shrink: 0;';
      kEl.textContent = row.k;
      const vEl = document.createElement('span');
      vEl.style.color = row.ok ? C.ok : C.txt;
      vEl.textContent = row.v;
      rowEl.appendChild(kEl);
      rowEl.appendChild(vEl);
      infoCol.appendChild(rowEl);
    });

    const node = document.createElement('div');
    node.style.cssText = 'display: flex; align-items: center; padding: 6px 0;';
    node.appendChild(artCol);
    node.appendChild(infoCol);
    return node;
  },
};
