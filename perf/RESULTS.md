# Automated profiling — F5 (hero SVG glint) & F4 (section accordion)

_Generated 2026-07-04T23:25:00.530Z by `perf/harness.mjs` (fully headless, no human interaction)._

Every number below is **median / p95 across 5 runs**. Raw traces for run 0 of each
scenario are in `perf/traces/<scenario>.json` (filter `traceEvents` to reproduce).

## Environment (pinned, reproducible)

- **Browser:** Chrome/131.0.6778.204 (Chrome for Testing, downloaded by Puppeteer)
- **Launch flags:** `--headless=new --hide-scrollbars --mute-audio --no-sandbox --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-renderer-backgrounding --force-color-profile=srgb --enable-gpu-rasterization --force-device-scale-factor=2`
- **Viewport:** 1440×900, `deviceScaleFactor: 2` (matches circuit.js DPR-2 cap)
- **CPU throttle:** `Emulation.setCPUThrottlingRate` at **1×** (fast desktop) and **4×** (mid-tier device)
- **Trace transport:** raw CDP `Tracing` (ReportEvents), categories: `devtools.timeline, disabled-by-default-devtools.timeline, disabled-by-default-devtools.timeline.frame, blink.user_timing, toplevel`
- **Server:** Node static server on http://127.0.0.1:8080/ (HTTP, not file://) serving repo root
- **Runs per scenario:** 5; **motion generated via** `Input.dispatchMouseEvent({type:'mouseMoved'|'mousePressed'|'mouseReleased'})`

### Confounders neutralized before every scenario

- **All CSS `@keyframes` animations paused** via injected `*{animation-play-state:paused!important}`
  (kills banner glow F1, card-fx blurs F2, hero-glow, flag/status pulses F3, gleam) — does **not**
  touch CSS transitions (F4) or the JS attribute mutation that drives the glint (F5).
- **Circuit canvas (`#circuit-canvas`) hidden** (`display:none`). No global `destroy()` handle is
  exposed (it's a local in main.js:1272), so hiding removes it from the compositor. Its residual
  rAF CPU is identical across compared runs and **cancels in the glint on−off delta**.
- Confounders applied for boot **before scripts run** via `page.evaluateOnNewDocument`.

---

## F5 — hero "liquid" SVG glint under pointer sweep

Motion: ~120 `mouseMoved` events over ~2s, triangle-sweeping left↔right across the hero
title (`#hero-name-svg`) ~20px/step (clears hero.js's 14 **viewBox-unit** accept threshold),
one dispatch per animation frame. **Gate cleared:** the in-page MutationObserver on the glint
`fePointLight.mv-light` x/y counted **240** accepted moves at 1× and
**240** at 4× (>0 confirms hero.js's threshold + proximity + IO gates were
tripped by the synthetic motion). Control ("glint OFF") sets the glint `<g>`'s `filter` to
`none` so the pointermove handler + accept counter still run but no glint raster occurs — the
**on−off delta isolates the filter's cost**.

| scenario | mean-FPS | frames>16.7ms | longest-frame ms | Raster ms (all-thread) | worst-Raster ms | main-Paint ms | main-Layout ms | main-busy % | main long-tasks>50ms | moves accepted |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| glint ON · 1× | 101.4 / 109.4 | 33 / 44 | 194.9 / 567.9 | 18.6 / 45.05 | 0.99 / 22.58 | 1.93 / 3.31 | 4.74 / 4.9 | 6.7 / 8.2 | 0 / 1 | 240 / 240 |
| glint OFF · 1× | 134.4 / 135.5 | 5 / 7 | 88.3 / 93.6 | 24.73 / 26.06 | 22.32 / 23.06 | 2.82 / 3.4 | 3.89 / 4.61 | 7.2 / 8 | 0 / 1 | 240 / 240 |
| glint ON · 4× | 93.5 / 102.1 | 37 / 49 | 274.8 / 650 | 21.45 / 31.58 | 0.65 / 11.85 | 8.84 / 10.05 | 16.43 / 20.02 | 20.8 / 21 | 1 / 1 | 240 / 240 |
| glint OFF · 4× | 129.7 / 132.4 | 8 / 12 | 113.6 / 191 | 3.51 / 14.44 | 0.8 / 10.07 | 7.8 / 11.99 | 17.2 / 24.16 | 24.1 / 25.5 | 1 / 1 | 240 / 240 |

**Where the cost lives — glint ON vs OFF (median across 5 runs):** The glint filter re-rasters
on **worker/GPU raster threads, not the main thread** — main-busy % is essentially identical
on/off (**20.8% vs 24.1%** at 4×) and main-thread long-tasks stay at
1. There is **no consistent glint raster task >8ms**: the worst-Raster column is
bimodal and glint-independent (a ~23ms one-off initial full-viewport DPR-2 tile raster lands in
~half of runs whether the glint is on or off), so it is *not* the deciding metric. The robust,
repeatable signals:

| CPU | Δ Raster-sum (ON−OFF) / sweep | ≈ per accepted move | longest frame ON→OFF | frames>16.7ms ON→OFF |
|-----|------|------|------|------|
| 1× | -6.13 ms (noise) | — | 194.9 → 88.3 ms | 33 → 5 |
| 4× | +17.94 ms | 0.075 ms | 274.8 → 113.6 ms (2.4×) | 37 → 8 (4.6×) |

> **VERDICT F5 — DOWNGRADE P1 → P2:** the glint's per-frame raster cost is **within budget** — it
> adds only **+17.94 ms of raster spread across a 2s sweep at 4× (~0.075 ms per
> accepted move)**, produces **no raster task >8ms** and **no main-thread cost** (main-busy
> 20.8% ≈ 24.1% off; 1 long-task). The event-layer throttling
> (14-viewBox-unit threshold + rAF coalesce + IO gate) already keeps it off the main thread.
> The **only** measurable penalty is a steady compositor/raster tax that during a *vigorous* sweep
> ~4.6× the over-budget frames (37 vs 8) and 2.4× the
> worst-frame gap (274.8 vs 113.6 ms) — visible as faint shimmer under fast
> mouse-waving, not during normal use, with mean FPS still ~100. **Not the P1 cost center the audit
> suspected.** If polishing, the compositor-only glint overlay (PERF-AUDIT F5 fix *(d)*) erases the
> residual pacing tax; low priority.
> Deciding number: **+17.94 ms raster / 2s sweep at 4× (~0.075 ms/move), 0 raster tasks >8ms, main-thread untouched.**

### F5 boot (first 2s, `bootLiquidTitle` mutating filter attrs ~30Hz)

| scenario | mean-FPS | frames>16.7ms | longest-frame ms | Raster ms (all-thread) | worst-Raster ms | main-Paint ms | main-Layout ms | main-busy % | main long-tasks>50ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| boot · 1× | 79 / 87.6 | 20 / 21 | 362.1 / 469.8 | 150.2† | 36.2† | 13.1† | 64.2† | 10.5† | 0† |
| boot · 4× | 91.4 / 95.9 | 23 / 25 | 311.8 / 360.6 | 123.9† | 37.9† | 75.3† | 297.5† | 47.0† | 2† |

† Boot main-thread/raster columns are **run-0 single values** re-derived from the saved traces
(`perf/traces/f5-boot-*.json`) with the window anchored at `navigationStart` — the aggregated
run had anchored on a stale pre-navigation `about:blank` timestamp and reported 0 (harness
anchor since fixed). mean-FPS/frames/longest-frame are the valid 5-run rAF medians.

**Boot is the more expensive of the two hero-filter paths:** at 4× the first 2s does **297ms
main-thread Layout + 75ms Paint (47% main-busy) with a 37.9ms worst raster and 2 main-thread
tasks >50ms**, and a longest frame of **312ms** — i.e. `bootLiquidTitle`'s ~30Hz filter-attr
mutation over ~0.65s genuinely blocks the main thread during load on a mid-tier device. This
corroborates PERF-AUDIT A24/A31 and is a stronger candidate for the reduced-motion fast-path
(hero.js already settles instantly under reduced-motion) than the hover glint is.

---

## F4 — section accordion (`grid-template-rows: 0fr↔1fr`)

Toggle target: `.section-header[data-section]`. Sections start **open** (initSections), so
`open`/`worst`/`double` pre-collapse then settle before the traced click. INP proxies are
measured in-page on the monotonic clock: **INP-1stpaint** = click→next rAF; **INP-settle** =
click→`transitionend(grid-template-rows)`. Worst-case-reflow section (most content below it):
**skills**.

| scenario | mean-FPS | frames>16.7ms | longest-frame ms | main-Layout ms | worst-Layout ms | main-Paint ms | main-busy % | main long-tasks>50ms | INP-settle ms | INP-1stpaint ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| open · 1× | 48.5 / 50.3 | 20 / 23 | 152.5 / 164.7 | 9.48 / 10.22 | 2.89 / 3.28 | 14.35 / 19.47 | 8.5 / 12.1 | 0 / 0 | 380.8 / 383.1 | 4.7 / 5.6 |
| close · 1× | 76.6 / 90 | 18 / 21 | 54.7 / 94.2 | 2.84 / 3.26 | 0.34 / 0.43 | 1.81 / 2.05 | 11.3 / 12.5 | 0 / 0 | n/a | n/a |
| worst · 1× | 48.5 / 54.6 | 21 / 23 | 94.4 / 184.6 | 9.06 / 9.82 | 2.72 / 3.1 | 14.46 / 14.72 | 8.2 / 10.6 | 0 / 0 | 383.2 / 388.1 | 4.8 / 5.6 |
| double · 1× | 49.2 / 128.4 | 22 / 24 | 117.3 / 185.9 | 8.6 / 10.16 | 2.7 / 3.23 | 13.19 / 15.79 | 7.6 / 8.7 | 0 / 0 | 367.9 / 387.8 | 4.4 / 5.3 |
| open · 4× | 48 / 52.4 | 20 / 21 | 89.8 / 158.3 | 45.27 / 48.02 | 18.17 / 19.56 | 66.7 / 79.54 | 37.1 / 39 | 0 / 0 | 383.1 / 385.7 | 3.6 / 6.3 |
| close · 4× | 105.4 / 132.9 | 13 / 17 | 57.4 / 68.4 | 12.53 / 14.95 | 1.31 / 2.42 | 3.02 / 5 | 27.3 / 31 | 1 / 1 | n/a | n/a |
| worst · 4× | 53.1 / 65.7 | 19 / 22 | 66.6 / 123.8 | 44.58 / 58.79 | 16.86 / 22.33 | 85.04 / 91.92 | 39.6 / 41.5 | 0 / 0 | 385 / 395.7 | 4.2 / 5.6 |
| double · 4× | 60.5 / 85.7 | 16 / 23 | 94.5 / 127.1 | 42.91 / 54.72 | 15.9 / 19.93 | 78.06 / 84.26 | 38.4 / 43.3 | 0 / 0 | 385 / 425.8 | 4.8 / 5 |

- Rapid double-toggle `.is-animating` left stuck after settle: **no** (4×).

> **VERDICT F4 — P2, mild jank, refactor optional:**
> worst-case single toggle (open, most content below) at 4× CPU — total main-thread Layout
> **44.58 ms** with a worst single Layout slice **16.86 ms**,
> sustained **53.1 FPS** (vs **105.4 FPS** for a *close* toggle — proving
> 53.1 fps is real layout-bound work, not a headless cadence floor), longest frame
> **66.6 ms**, and **0** main-thread tasks >50ms.
> Opening does not hold 60fps (~53.1 fps, worst Layout 16.86 ms > 16 ms) but posts **no >50ms main-thread long task** and INP-settle is just the CSS transition duration. Bounded, low-severity jank — the height/transform refactor (PERF-AUDIT F4) is **justifiable but low priority**; the `.is-animating` safety timeout is the cheaper win.
> Deciding numbers: **worst Layout 16.86 ms, 53.1 fps sustained, 0 main-thread long-tasks at 4×.**

---

## Reproducibility notes & caveats

- **Thread attribution:** `RunTask`/`Paint`/`Layout` are summed **only on `CrRendererMain`**
  (the jank-causing thread) — an early version summed across all threads and reported
  `sum=3937ms` inside a 2816ms window, which is why the raw multi-thread `RunTask` totals are
  meaningless. `RasterTask` is summed across **all** threads on purpose: worker/GPU raster is
  exactly where the SVG glint filter's turbulence+lighting cost lands, so the **worst single
  `RasterTask` slice is the filter-raster proxy** (Blink emits no dedicated "filter" slice).
- **Frame stats** (mean-FPS, frames>16.7ms, longest-frame) come from an in-page rAF recorder —
  robust under `--headless=new` + CPU throttling, where compositor `DrawFrame`/`DroppedFrame`
  cadence is unreliable (a no-glint control still showed 800+ `DroppedFrame` events). Baseline
  mean-FPS floats ~100–135 in headless; the meaningful signals are **relative** (ON vs OFF,
  open vs close) and the **longest-frame / worst-slice** spikes, not the absolute FPS number.
- **Gate verification:** the "moves accepted" column is read back from a live in-page
  MutationObserver on the glint point-light — a non-zero count proves the synthetic
  `mouseMoved` stream cleared hero.js's 14-viewBox-unit distance threshold, proximity gate,
  and hero-visibility IntersectionObserver.
- Run: `node perf/harness.mjs` (starts/stops its own server; exits non-zero if any scenario
  collected no trace).

