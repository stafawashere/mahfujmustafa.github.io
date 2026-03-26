(() => {
    const page = document.querySelector(".page");
    const heroSvg = document.querySelector(".hero-title");
    if (!page || !heroSvg) return;

    const nodeCircles = heroSvg.querySelectorAll("circle.circuit-node");
    if (!nodeCircles.length) return;

    const NS = "http://www.w3.org/2000/svg";
    const LINE_COLOR = "#e88aab";
    const LINE_WIDTH = 1;
    const NODE_R = 3;
    const NODE_FILL = "#1e1e1e";
    const NODE_STROKE = "#e88aab";
    const NODE_STROKE_W = 0.7;
    const FADE_MS = 200;
    const MIN_NODE_DIST = 25;
    const IDLE_OPACITY = 0.14;
    const ACTIVE_OPACITY = 0.5;
    const TRUNK_OPACITY = 0.14;

    const overlay = document.createElementNS(NS, "svg");
    overlay.setAttribute("id", "circuit-overlay");
    Object.assign(overlay.style, {
        position: "absolute", top: "0", left: "0",
        width: "100%", height: "100%",
        pointerEvents: "none", zIndex: "10", overflow: "visible"
    });
    page.appendChild(overlay);

    let trunkGroup = null;
    const allGroups = [];

    function gutterX() {
        const padding = parseFloat(getComputedStyle(page).paddingLeft);
        return Math.max(8, padding * 0.5);
    }

    function startY() {
        const pageRect = page.getBoundingClientRect();
        const contact = page.querySelector(".contact-info");
        if (contact) return contact.getBoundingClientRect().top - pageRect.top + NODE_R;
        const svgRect = heroSvg.getBoundingClientRect();
        const cy = parseFloat(nodeCircles[0].getAttribute("cy"));
        const vb = heroSvg.viewBox.baseVal;
        return svgRect.top - pageRect.top + cy * (svgRect.height / vb.height);
    }

    function targetPos(el) {
        const pageRect = page.getBoundingClientRect();
        const title = el.querySelector(".entry-name, .label");
        if (!title) return null;
        const r = title.getBoundingClientRect();
        return { x: r.left - pageRect.left, y: r.top - pageRect.top + r.height / 2 };
    }

    function makeLine(x1, y1, x2, y2, opacity) {
        const l = document.createElementNS(NS, "line");
        l.setAttribute("x1", x1);
        l.setAttribute("y1", y1);
        l.setAttribute("x2", x2);
        l.setAttribute("y2", y2);
        l.setAttribute("stroke", LINE_COLOR);
        l.setAttribute("stroke-width", LINE_WIDTH);
        l.setAttribute("stroke-opacity", opacity);
        return l;
    }

    function makeNode(cx, cy, opacity) {
        const c = document.createElementNS(NS, "circle");
        c.setAttribute("cx", cx);
        c.setAttribute("cy", cy);
        c.setAttribute("r", NODE_R);
        c.setAttribute("fill", NODE_FILL);
        c.setAttribute("stroke", NODE_STROKE);
        c.setAttribute("stroke-width", NODE_STROKE_W);
        c.setAttribute("stroke-opacity", opacity);
        return c;
    }

    function isRightCol(el) {
        const grid = el.closest(".grid");
        if (!grid) return false;
        const gr = grid.getBoundingClientRect();
        return el.getBoundingClientRect().left > gr.left + gr.width / 3;
    }

    function contentBottom(el) {
        const pageTop = page.getBoundingClientRect().top;
        const last = el.querySelector("ul:last-child, p:last-child, li:last-child");
        return (last || el).getBoundingClientRect().bottom - pageTop;
    }

    function rightColRouting(el) {
        const pageRect = page.getBoundingClientRect();
        const prev = el.previousElementSibling;
        const selfBottom = contentBottom(el);
        const prevBottom = prev ? contentBottom(prev) : selfBottom;
        const bottom = Math.max(selfBottom, prevBottom);

        let gapY;
        const next = el.nextElementSibling;
        if (next && (next.classList.contains("entry") || next.classList.contains("skills-group"))) {
            gapY = (bottom + next.getBoundingClientRect().top - pageRect.top) / 2;
        } else {
            const section = el.closest("section");
            let nextSection = section ? section.nextElementSibling : null;
            while (nextSection && nextSection.tagName !== "SECTION") nextSection = nextSection.nextElementSibling;
            if (nextSection) {
                const nextTop = nextSection.getBoundingClientRect().top - pageRect.top;
                gapY = (bottom + nextTop) / 2;
            } else {
                const sectionBottom = section
                    ? section.getBoundingClientRect().bottom - pageRect.top
                    : bottom + 24;
                gapY = Math.max(bottom + 20, (bottom + sectionBottom) / 2);
            }
        }

        const elLeft = el.getBoundingClientRect().left - pageRect.left;
        const prevRight = prev ? prev.getBoundingClientRect().right - pageRect.left : elLeft;
        return { gapY, colGapX: (prevRight + elLeft) / 2 };
    }

    function buildBranch(el) {
        const target = targetPos(el);
        if (!target) return null;

        const gx = gutterX();
        let branchY;
        const pts = [];

        if (isRightCol(el)) {
            const { gapY, colGapX } = rightColRouting(el);
            branchY = gapY;
            pts.push({ x: gx, y: gapY });
            pts.push({ x: colGapX, y: gapY });
            pts.push({ x: colGapX, y: target.y });
            pts.push({ x: target.x, y: target.y });
        } else {
            branchY = target.y;
            pts.push({ x: gx, y: target.y });
            pts.push({ x: target.x, y: target.y });
        }

        const last = pts[pts.length - 1];
        const prev = pts[pts.length - 2];
        const dx = last.x - prev.x;
        const dy = last.y - prev.y;
        const len = Math.hypot(dx, dy) || 1;
        last.x += (dx / len) * 2;
        last.y += (dy / len) * 2;

        return { branchY, pts };
    }

    function buildBranchGroup(pts) {
        const g = document.createElementNS(NS, "g");
        g.classList.add("circuit-connector");
        g.style.opacity = String(IDLE_OPACITY);
        g.style.transition = "opacity " + FADE_MS + "ms ease";

        for (let i = 0; i < pts.length - 1; i++) {
            g.appendChild(makeLine(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, ACTIVE_OPACITY));
        }

        const terminal = pts[pts.length - 1];
        for (let i = 0; i < pts.length - 1; i++) {
            const prevDist = i > 0 ? Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y) : Infinity;
            const nextDist = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
            const termDist = Math.hypot(terminal.x - pts[i].x, terminal.y - pts[i].y);
            if (prevDist >= MIN_NODE_DIST && nextDist >= MIN_NODE_DIST && termDist >= MIN_NODE_DIST) {
                g.appendChild(makeNode(pts[i].x, pts[i].y, 0.7));
            }
        }

        return g;
    }

    function drawAll() {
        if (trunkGroup && trunkGroup.parentNode) trunkGroup.parentNode.removeChild(trunkGroup);
        trunkGroup = null;
        allGroups.forEach(item => {
            if (item.g.parentNode) item.g.parentNode.removeChild(item.g);
        });
        allGroups.length = 0;

        const gx = gutterX();
        const sy = startY();
        let maxBranchY = sy;

        const entries = [];
        page.querySelectorAll(".entry, .skills-group").forEach(el => {
            const result = buildBranch(el);
            if (!result) return;
            entries.push({ el, ...result });
            if (result.branchY > maxBranchY) maxBranchY = result.branchY;
        });

        trunkGroup = document.createElementNS(NS, "g");
        trunkGroup.classList.add("circuit-trunk");
        trunkGroup.style.opacity = String(TRUNK_OPACITY);
        trunkGroup.style.transition = "opacity " + FADE_MS + "ms ease";
        trunkGroup.appendChild(makeLine(gx, sy, gx, maxBranchY, ACTIVE_OPACITY));
        entries.forEach(entry => {
            trunkGroup.appendChild(makeNode(gx, entry.branchY, 0.7));
        });
        overlay.appendChild(trunkGroup);

        entries.forEach(entry => {
            const g = buildBranchGroup(entry.pts);
            overlay.appendChild(g);
            allGroups.push({ el: entry.el, g, branchY: entry.branchY });
        });
    }

    function highlight(el) {
        if (trunkGroup) trunkGroup.style.opacity = String(TRUNK_OPACITY * 2);
        allGroups.forEach(item => {
            item.g.style.opacity = item.el === el ? String(ACTIVE_OPACITY) : String(IDLE_OPACITY);
        });
    }

    function unhighlight() {
        if (trunkGroup) trunkGroup.style.opacity = String(TRUNK_OPACITY);
        allGroups.forEach(item => {
            item.g.style.opacity = String(IDLE_OPACITY);
        });
    }

    drawAll();

    page.querySelectorAll(".entry, .skills-group").forEach(el => {
        el.addEventListener("mouseenter", () => highlight(el));
        el.addEventListener("mouseleave", () => unhighlight());
    });

    let resizeTimer;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(drawAll, 150);
    });
})();
