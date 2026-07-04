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
