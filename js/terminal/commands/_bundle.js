// AUTO-GENERATED terminal command bundle (F12): concatenation of js/terminal/commands/*.js
// Files are joined in the same order they were previously loaded in index.html.
// To edit a command, edit its source file and regenerate this bundle.


/* ===== commands/help.js ===== */
defineCommand({
  name: 'help', aliases: ['commands', '?'],
  summary: 'list the commands (try `help --all`)',
  run(ctx) {
    const o = ctx.out;
    const all = !!(ctx.flags.all || ctx.flags.a || /^(all|hidden|full|everything)$/.test(ctx.argl.trim()));
    const row = (c, color) => o.line(o.cmd(Output.pad(c.usage || c.name, 14), c.name, color), o.txt(c.summary));

    o.line(o.bold('Available commands '), o.dim('— click any to run')).blank();
    ctx.registry.group('core').forEach(c => row(c));

    if (!all) {
      o.blank().line(o.dim('  psst — run '), o.cmd('help --all', 'help --all'), o.dim(' to reveal the hidden ones.'));
      return o;
    }

    o.blank().line(o.warn('Hidden ', 700), o.dim('— easter eggs & extras')).blank();
    ctx.registry.group('system').forEach(c => row(c, ctx.C.warn));

    o.blank().line(o.error('Root-only ', 700), o.dim('— unlock with '), o.accent('↑↑↓↓←→←→ B A')).blank();
    ctx.registry.group('root').forEach(c => ctx.root
      ? row(c, ctx.C.err)
      : o.line(o.faint(Output.pad(c.usage || c.name, 14), 700), o.faint(c.summary), o.faint('  [locked]')));
    return o;
  },
});

/* ===== commands/whoami.js ===== */
defineCommand({
  name: 'whoami', aliases: ['who'], group: 'core',
  summary: 'who is running this shell',
  run(ctx) {
    const o = ctx.out;
    if (ctx.root) {
      return o
        .line(o.error('root', 700), o.dim('  (uid=0)'))
        .line(o.txt('You escalated. Respect. Underneath the root shell it’s still '), o.bold('Mahfuj Mustafa'), o.txt(' —'))
        .line(o.accent('17 y/o security researcher who left this door unlocked on purpose.', 400));
    }
    return o
      .line(o.bold('Mahfuj Mustafa'))
      .line(o.accent('17 y/o security researcher & full-stack developer — New York City', 400))
      .blank()
      .line(o.txt('"I break things to understand them."'))
      .line(o.bold('78M+ '), o.dim('player visits shipped  ·  '), o.ok('● '), o.txt('available for work'));
  },
});

/* ===== commands/about.js ===== */
defineCommand({
  name: 'about', aliases: ['bio'], group: 'core',
  summary: 'print about.txt — the full bio',
  run(ctx) {
    return ctx.out
      .line(ctx.out.dim('about.txt'))
      .blank()
      .line('I’m a 17-year-old high school student in NYC who breaks things to')
      .line('understand them. I work across security research, reverse engineering,')
      .line('full-stack web, Discord bots, API wrappers and automation — and I ship')
      .line('live games that have reached ', ctx.out.bold('78M+ player visits'), '.')
      .blank()
      .line(ctx.out.dim('Currently: '), ctx.out.accent('Programmer @ Merge Box', 400), ctx.out.dim('  ·  freelancing'));
  },
});

/* ===== commands/ls.js ===== */
defineCommand({
  name: 'ls', aliases: ['dir', 'll'], group: 'core',
  summary: 'list the filesystem — try `ls projects`',
  run(ctx) {
    const o = ctx.out;
    const a = ctx.argl.replace(/^-\S+\s*/, '').trim();
    if (/^projects?\/?$/.test(a))  return ctx.runCommand('projects');
    if (/^experien|^jobs/.test(a)) return ctx.runCommand('experience');
    if (/^educa|^school/.test(a))  return ctx.runCommand('education');
    if (/^skills?\/?$/.test(a))    return ctx.runCommand('skills');
    if (a) return o.line(o.error('ls: ', 700), o.txt('cannot access '), o.warn(a), o.txt(': No such directory'));

    return o
      .line(
        o.txt('about.txt   '),
        o.cmd('projects/   ', 'projects'),
        o.cmd('experience/   ', 'experience'),
        o.cmd('education/   ', 'education'),
        o.cmd('skills/   ', 'skills'),
        o.cmd('contact/   ', 'contact'),
        o.faint('.secret'),
      )
      .line(o.dim('drwxr-xr-x  6 dirs   ·  '), o.faint('run `cat <project>` to read one'));
  },
});

/* ===== commands/projects.js ===== */
defineCommand({
  name: 'projects', aliases: ['work'], group: 'core',
  summary: 'list every project',
  run(ctx) {
    const o = ctx.out;
    const projects = ctx.data.projects;

    o.line(o.dim('projects/'), o.faint('  — ' + projects.length + ' entries')).blank();
    o.table(projects.map(p => [
      o.cmd(p.id, 'cat ' + p.id),
      o.txt(p.type),
      o.dim(p.date),
    ]), { gap: 3 });
    o.blank().line(o.color('  → ', ctx.C.acc), o.accent('cat <name>', 600), o.dim(' to read, '), o.accent('open <name>', 600), o.dim(' for GitHub'));
    return o;
  },
});

/* ===== commands/cat.js ===== */
defineCommand({
  name: 'cat', aliases: ['less', 'more', 'read'], group: 'core',
  summary: 'cat <project> — read a project file',
  run(ctx) {
    const o = ctx.out;
    if (!ctx.argl) return o.line(o.dim('usage: '), o.accent('cat <project>', 600), o.dim('   (try '), o.accent('cat about.txt', 600), o.dim(')'));
    if (/^about/.test(ctx.argl)) return ctx.runCommand('about');
    if (/secret/.test(ctx.argl)) return ctx.runCommand('secret');

    const p = ctx.findProject(ctx.argl);
    if (!p) return o.line(o.error('cat: ', 700), o.warn(ctx.arg), o.txt(': No such file. Try '), o.accent('ls projects', 600), o.dim('.'));

    const acc = ctx.C.acc;
    return o
      .line(o.color('┌─ ', acc), o.bold(p.name), o.accent('  ' + p.type, 400))
      .line(o.color('│  ', acc), o.dim(p.stack))
      .line(o.color('│', acc))
      .line(o.color('│  ', acc), o.txt(p.blurb))
      .line(o.color('│', acc))
      .line(o.color('└─ ', acc), o.link(p.url.replace('https://', ''), p.url), o.dim('  ' + p.date + '  ↗'));
  },
});

/* ===== commands/open.js ===== */
defineCommand({
  name: 'open', aliases: ['xdg-open', 'start'], group: 'core',
  summary: 'open <project|github|email> in a new tab',
  run(ctx) {
    const o = ctx.out, argl = ctx.argl;
    if (!argl) return o.line(o.dim('usage: '), o.accent('open <project|github|email>', 600));

    if (/git|^gh$/.test(argl)) {
      ctx.openUrl('https://github.com/stafawashere');
      return o.line(o.dim('opening '), o.accent('github.com/stafawashere ↗', 400));
    }
    if (/mail|email|contact/.test(argl)) {
      ctx.openUrl('mailto:contact@mahfujmustafa.dev');
      return o.line(o.dim('opening '), o.accent('mail composer ↗', 400));
    }
    if (/resume|cv/.test(argl)) {
      return o.line(o.txt('No PDF here — the site '), o.accent('is'), o.txt(' the resume. Try '), o.accent('experience', 600), o.dim(' & '), o.accent('projects', 600), o.dim('.'));
    }

    const p = ctx.findProject(argl);
    if (!p) return o.line(o.error('open: ', 700), o.warn(argl), o.txt(': nothing to open'));
    ctx.openUrl(p.url);
    return o.line(o.dim('opening '), o.accent(p.url.replace('https://', '') + ' ↗', 400));
  },
});

/* ===== commands/skills.js ===== */
defineCommand({
  name: 'skills', aliases: ['stack'], group: 'core',
  summary: 'domains, languages & tools',
  run(ctx) {
    const o = ctx.out;
    return o
      .line(o.dim('languages   '), o.accent('Python  Lua  JavaScript  TypeScript', 600))
      .line(o.dim('frameworks  '), o.txt('Next.js  React  Node.js  Express  Vite  Tailwind  Prisma'))
      .line(o.dim('tools       '), o.txt('Discord API  discord.py  Roblox Studio  Arcade  PyTorch  Socket.IO  PostgreSQL  SQLite  Git'))
      .blank()
      .line(o.dim('domains     '), o.txt('Reverse Engineering · Security Analysis · Full-Stack'))
      .line(o.dim('            '), o.txt('REST APIs · Realtime Systems · Machine Learning · Bots · Automation · Live-Ops'));
  },
});

/* ===== commands/experience.js ===== */
defineCommand({
  name: 'experience', aliases: ['jobs', 'work-history'], group: 'core',
  summary: 'work history (alias: history)',
  run(ctx) {
    const o = ctx.out, exp = ctx.data.experiences;
    exp.forEach((x, i) => {
      o.line(o.accent('● ', 400), o.bold(Output.pad(x.org, 12)), o.txt(x.role), o.dim('  ' + x.dates));
      o.line(o.dim('  '), o.txt(x.note));
      if (i < exp.length - 1) o.blank();
    });
    return o;
  },
});

/* ===== commands/education.js ===== */
defineCommand({
  name: 'education', aliases: ['edu', 'school'], group: 'core',
  summary: 'where I study',
  run(ctx) {
    const o = ctx.out, edu = ctx.data.education;
    edu.forEach((e, i) => {
      o.line(o.accent('● ', 400), o.bold(e.name), o.accent('  ' + e.kind, 400), o.dim('  ' + e.dates));
      o.line(o.dim('  '), o.txt(e.note));
      if (i < edu.length - 1) o.blank();
    });
    return o;
  },
});

/* ===== commands/contact.js ===== */
defineCommand({
  name: 'contact', aliases: ['reach'], group: 'core',
  summary: 'how to reach me',
  run(ctx) {
    const o = ctx.out;
    return o
      .line(o.ok('● '), o.txt('available for work'), o.dim('  —  freelance & full-time'))
      .blank()
      .line(o.dim('email   '), o.link('contact@mahfujmustafa.dev', 'mailto:contact@mahfujmustafa.dev'), o.color('  ↗', ctx.C.acc))
      .line(o.dim('phone   '), o.txt('(347) 844-4127'))
      .line(o.dim('github  '), o.link('github.com/stafawashere', 'https://github.com/stafawashere'), o.color('  ↗', ctx.C.acc))
      .line(o.dim('where   '), o.txt('New York City, NY'))
      .blank()
      .line(o.color('→ ', ctx.C.acc), o.accent('sudo hire'), o.dim(' if you’re serious.'));
  },
});

/* ===== commands/sudo.js ===== */
defineCommand({
  name: 'sudo', aliases: ['doas'], group: 'core',
  summary: 'escalate privileges — try `sudo hire`',
  run(ctx) {
    const o = ctx.out, argl = ctx.argl;
    if (/^hire/.test(argl) || argl === 'me' || /employ|recruit/.test(argl)) {
      ctx.openUrl('mailto:contact@mahfujmustafa.dev?subject=Let’s%20work%20together');
      return o
        .line(o.dim('[sudo] '), o.txt('password for visitor: '), o.faint('••••••••'))
        .line(o.txt('Privilege escalation '), o.ok('successful', 700), o.txt('. You now have hire access.'))
        .blank()
        .line(o.dim('opening mail composer → '), o.link('contact@mahfujmustafa.dev ↗', 'mailto:contact@mahfujmustafa.dev?subject=Let’s%20work%20together'));
    }
    return o
      .line(o.dim('[sudo] '), o.txt('password for visitor: '), o.faint('••••'))
      .line(o.error('Sorry, try again. '), o.dim('This incident has been reported.'))
      .line(o.dim('(the only command worth '), o.accent('sudo', 400), o.dim(' is '), o.accent('sudo hire'), o.dim(')'));
  },
});

defineCommand({
  name: 'sudo hire', usage: 'sudo hire', group: 'system',
  summary: 'escalate privileges — opens a pre-filled email',
  run(ctx) { return ctx.runCommand('sudo', 'hire'); },
});

defineCommand({
  name: 'hire',
  run(ctx) { return ctx.runCommand('sudo', 'hire'); },
});

/* ===== commands/neofetch.js ===== */
defineCommand({
  name: 'neofetch', aliases: ['fetch', 'screenfetch'], group: 'core',
  summary: 'system info readout',
  run(ctx) { return ctx.out.node(ctx.neofetch()); },
});

/* ===== commands/social.js ===== */
defineCommand({
  name: 'social', aliases: ['links'], group: 'core',
  summary: 'links & handles',
  run(ctx) {
    const o = ctx.out, acc = ctx.C.acc;
    return o
      .line(o.dim('GitHub    '), o.link('github.com/stafawashere', 'https://github.com/stafawashere'), o.color('  ↗', acc))
      .line(o.dim('Email     '), o.link('contact@mahfujmustafa.dev', 'mailto:contact@mahfujmustafa.dev'), o.color('  ↗', acc))
      .line(o.dim('Phone     '), o.txt('(347) 844-4127'));
  },
});

/* ===== commands/date.js ===== */
defineCommand({
  name: 'date', aliases: ['time'], group: 'core',
  summary: 'current date & time',
  run(ctx) { return ctx.out.line(ctx.out.txt(new Date().toString())); },
});

/* ===== commands/echo.js ===== */
defineCommand({
  name: 'echo', group: 'core',
  summary: 'echo <text> back at you',
  run(ctx) { return ctx.out.line(ctx.out.txt(ctx.arg || '')); },
});

/* ===== commands/clear.js ===== */
defineCommand({
  name: 'clear', aliases: ['cls'], group: 'core', clears: true,
  summary: 'wipe the screen',
  run() { return []; },
});

/* ===== commands/vim.js ===== */
defineCommand({
  name: 'vim', aliases: ['vi', 'nano', 'emacs'], usage: 'vim', group: 'system',
  summary: 'enter the inescapable editor (:q to flee)',
  run(ctx) {
    ctx.setVim(true);
    return ctx.out.line(
      ctx.out.txt('Entering '), ctx.out.accent(ctx.name), ctx.out.txt('. Good luck getting out. (hint: '),
      ctx.out.accent(':q', 400), ctx.out.dim(')'),
    );
  },
});

/* ===== commands/rm.js ===== */
defineCommand({
  name: 'rm', usage: 'rm -rf /', group: 'system',
  summary: 'try to delete everything (politely denied)',
  run(ctx) {
    const o = ctx.out, argl = ctx.argl;
    return /(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r)/.test(argl) && /(\/|\*|~)/.test(argl)
      ? o.line(o.error('rm: ', 700), o.txt('refusing to nuke '), o.warn(argl), o.txt(' — this portfolio is immutable. Nice try, though.'))
      : o.line(o.error('rm: ', 700), o.txt('permission denied'));
  },
});

/* ===== commands/hack.js ===== */
defineCommand({
  name: 'hack', aliases: ['matrix'], group: 'system',
  summary: 'definitely "hack the mainframe" (matrix too)',
  async run(ctx) {
    await ctx.type('01001101 01000001 01001000 01000110 01010101 01001010', { color: ctx.C.ok, speed: 22 });
    await ctx.sleep(120);
    return ctx.out.line(ctx.out.ok('[ access granted ] ', 700), ctx.out.txt('jk — there’s nothing to hack. It’s a portfolio.'));
  },
});

/* ===== commands/ping.js ===== */
defineCommand({
  name: 'ping', group: 'system',
  summary: 'ping the box — all replies alive',
  run(ctx) {
    const o = ctx.out;
    return o
      .line(o.txt('PING ' + (ctx.arg || 'mahfujmustafa.dev') + ' — 56 bytes'))
      .line(o.txt('64 bytes from core: icmp_seq=1 ttl=64 '), o.ok('time=0.042 ms'))
      .line(o.txt('64 bytes from core: icmp_seq=2 ttl=64 '), o.ok('time=0.038 ms'))
      .line(o.dim('--- alive and well ---'));
  },
});

/* ===== commands/coffee.js ===== */
defineCommand({
  name: 'coffee', aliases: ['brew'], group: 'system',
  summary: 'HTTP 418 — I\'m a teapot',
  run(ctx) {
    return ctx.out.line(ctx.out.error('418 ', 700), ctx.out.txt("I'm a teapot. Can't brew coffee over HTTP (RFC 2324)."));
  },
});

/* ===== commands/sl.js ===== */
defineCommand({
  name: 'sl', group: 'system',
  summary: 'for when you fat-finger `ls`',
  run(ctx) { return ctx.out.line(ctx.out.warn('🚂 woo woo — you meant `ls`. (we don’t do emoji here)')); },
});

/* ===== commands/theme.js ===== */
defineCommand({
  name: 'theme', aliases: ['color'], group: 'system',
  summary: 'change the color theme (good luck)',
  run(ctx) { return ctx.out.line(ctx.out.txt('The only theme is '), ctx.out.accent('purple'), ctx.out.txt('. Cope.')); },
});

/* ===== commands/man.js ===== */
defineCommand({
  name: 'man', group: 'system',
  summary: 'man <cmd> — manual pages',
  run(ctx) {
    const o = ctx.out;
    if (!ctx.argl) return o.line(o.txt('What manual page do you want? Try '), o.accent('man whoami', 600), o.dim('.'));
    const cmd = ctx.registry.group('core').find(c => c.name === ctx.argl);
    if (!cmd) return o.line(o.txt('No manual entry for '), o.warn(ctx.argl));
    return o
      .line(o.accent('NAME'))
      .line(o.txt('    ' + cmd.name + ' — ' + cmd.summary));
  },
});

/* ===== commands/history.js ===== */
defineCommand({
  name: 'history', group: 'system',
  summary: 'your command history',
  run(ctx) {
    if (ctx.arg) return ctx.runCommand('experience');
    const o = ctx.out;

    const h = ctx.shell.history.slice(0, -1).slice(-20);
    if (!h.length) return o.line(o.dim('(no history yet)'));
    h.forEach((c, i) => o.line(o.faint(Output.pad(String(i + 1), 4)), o.txt(c)));
    return o;
  },
});

/* ===== commands/pwd.js ===== */
defineCommand({
  name: 'pwd', group: 'system',
  summary: 'print working directory',
  run(ctx) { return ctx.out.line(ctx.out.txt('/home/visitor')); },
});

/* ===== commands/secret.js ===== */
defineCommand({
  name: 'secret', aliases: ['.secret'], group: 'system',
  summary: 'decrypt .secret … if there is one',
  run(ctx) {
    const o = ctx.out;
    return o
      .line(o.dim('decrypting .secret ...'))
      .line(o.txt('There is no secret. Curiosity '), o.accent('is'), o.txt(' the brand. '), o.faint('psst — '), o.accent('↑↑↓↓←→←→ B A'), o.faint('.'));
  },
});

/* ===== commands/exit.js ===== */
defineCommand({
  name: 'exit', aliases: ['logout', 'quit', ':q'], usage: 'exit', group: 'system',
  summary: 'log out (there is no logging out)',
  run(ctx) {
    const o = ctx.out;
    return o
      .line(o.dim('Connection to mahfujmustafa.dev closed.'))
      .line(o.txt('...just kidding. There is no escape — this is the whole site. Scroll on.'));
  },
});

/* ===== commands/flag.js ===== */
defineCommand({
  name: 'flag', group: 'root', root: true,
  summary: 'cat the CTF flag',
  run(ctx) {
    const o = ctx.out, err = ctx.C.err;
    return o
      .line(o.dim('cat /root/flag.txt'))
      .blank()
      .line(o.color('  ┌────────────────────────────────────────────────┐', err))
      .line(o.color('  │  ', err), o.ok('flag{', 700), o.warn('you_read_the_source_you_beautiful_nerd', 700), o.ok('}', 700), o.color('  │', err))
      .line(o.color('  └────────────────────────────────────────────────┘', err))
      .blank()
      .line(o.txt('  if you got here, we should talk. '), o.cmd('sudo hire', 'sudo hire', err), o.dim('.'));
  },
});

/* ===== commands/rootkit.js ===== */
defineCommand({
  name: 'rootkit', aliases: ['persist'], group: 'root', root: true,
  summary: 'install a (fake) rootkit',
  run(ctx) {
    const o = ctx.out;
    return o
      .line(o.txt('installing rootkit '), o.dim('(jk)'), o.txt(' ...'))
      .line(o.dim('  → hooking syscalls ........ '), o.ok('nope', 700))
      .line(o.dim('  → hiding from '), o.accent('ps aux', 400), o.dim(' ....... '), o.ok('also nope', 700))
      .line(o.txt('  the only thing persisting here is my interest in shipping good software.'));
  },
});

/* ===== commands/extras.js ===== */
defineCommand({
  name: 'github', aliases: ['gh'],
  run(ctx) {
    ctx.openUrl('https://github.com/stafawashere');
    return ctx.out.line(ctx.out.dim('opening '), ctx.out.accent('github.com/stafawashere', 400), ctx.out.color('  ↗', ctx.C.acc));
  },
});

defineCommand({
  name: 'whoareyou',
  run(ctx) { return ctx.runCommand('whoami'); },
});

defineCommand({
  name: 'banner',
  run(ctx) { return ctx.out.node(ctx.banners.name(ctx.C, true)); },
});

defineCommand({
  name: 'cd',
  run(ctx) {
    const o = ctx.out;
    return o.line(o.txt('cd: this isn’t that kind of shell. Try '), o.accent('ls', 600), o.dim(' or '), o.accent('open <project>', 600), o.dim('.'));
  },
});

/* ===== commands/settings.js ===== */
defineCommand({
  name: 'settings', aliases: ['gear', 'tweaks'], group: 'system',
  summary: 'show / hide the animation settings button',
  run(ctx) {
    const o = ctx.out;
    if (typeof window.curieToggleSettingsButton !== 'function') {
      return o.line(o.warn('Settings panel is still loading — try again in a second.'));
    }
    const shown = window.curieToggleSettingsButton();
    if (shown) {
      o.line(o.ok('✓ '), o.txt('Settings button '), o.accent('shown'), o.txt(' — top-right of the nav bar, next to search.'));
      o.line(o.dim('Run '), o.cmd('settings', 'settings'), o.dim(' again to hide it. Your choice is saved.'));
    } else {
      o.line(o.txt('Settings button '), o.accent('hidden'), o.txt('.'));
      o.line(o.dim('Run '), o.cmd('settings', 'settings'), o.dim(' to bring it back.'));
    }
    return o;
  },
});
