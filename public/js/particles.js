(() => {
    const canvas = document.getElementById('mesh-bg');
    const ctx = canvas.getContext('2d');

    const PARTICLE_COUNT = 100;
    const CONNECT_DIST = 160;
    const MOUSE_RADIUS = 200;
    const BASE_COLOR = { r: 255, g: 255, b: 255 };
    const ACCENT_COLOR = { r: 232, g: 138, b: 171 };
    const BASE_SPEED = 0.4;
    
    let width, height, particles;
    let mouse = { x: -9999, y: -9999 };

    function resize() {
        const oldW = width || window.innerWidth;
        const oldH = height || window.innerHeight;
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;

        if (particles) {
            const sx = width / oldW;
            const sy = height / oldH;
            for (const p of particles) {
                p.x *= sx;
                p.y *= sy;
            }
        }
    }

    function createParticles() {
        particles = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * BASE_SPEED,
                vy: (Math.random() - 0.5) * BASE_SPEED,
                radius: Math.random() * 1.5 + 0.5,
            });
        }
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function getColorData(x, y, alpha) {
        const dx = x - mouse.x;
        const dy = y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const t = Math.max(0, 1 - dist / MOUSE_RADIUS);
        const ease = t * t;

        const r = Math.round(lerp(BASE_COLOR.r, ACCENT_COLOR.r, ease));
        const g = Math.round(lerp(BASE_COLOR.g, ACCENT_COLOR.g, ease));
        const b = Math.round(lerp(BASE_COLOR.b, ACCENT_COLOR.b, ease));

        return { color: `rgba(${r},${g},${b},${alpha})`, glow: ease };
    }

    function update() {
        for (const p of particles) {
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0) { p.x = 0; p.vx *= -1; }
            if (p.x > width) { p.x = width; p.vx *= -1; }
            if (p.y < 0) { p.y = 0; p.vy *= -1; }
            if (p.y > height) { p.y = height; p.vy *= -1; }
        }
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const a = particles[i];
                const b = particles[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < CONNECT_DIST) {
                    const midX = (a.x + b.x) / 2;
                    const midY = (a.y + b.y) / 2;
                    const alpha = (1 - dist / CONNECT_DIST) * 0.35;
                    const data = getColorData(midX, midY, alpha);

                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.strokeStyle = data.color;
                    ctx.lineWidth = 0.6 + data.glow * 1.2;
                    if (data.glow > 0.05) {
                        ctx.shadowColor = 'rgba(232,138,171,0.6)';
                        ctx.shadowBlur = data.glow * 12;
                    } else {
                        ctx.shadowBlur = 0;
                    }
                    ctx.stroke();
                }
            }
        }

        for (const p of particles) {
            const data = getColorData(p.x, p.y, 0.7);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius + data.glow * 1.5, 0, Math.PI * 2);
            ctx.fillStyle = data.color;
            if (data.glow > 0.05) {
                ctx.shadowColor = 'rgba(232,138,171,0.7)';
                ctx.shadowBlur = data.glow * 16;
            } else {
                ctx.shadowBlur = 0;
            }
            ctx.fill();
        }
        ctx.shadowBlur = 0;
    }

    function loop() {
        update();
        draw();
        requestAnimationFrame(loop);
    }

    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    window.addEventListener('mouseleave', () => {
        mouse.x = -9999;
        mouse.y = -9999;
    });

    window.addEventListener('resize', resize);

    resize();
    createParticles();
    loop();
})();
