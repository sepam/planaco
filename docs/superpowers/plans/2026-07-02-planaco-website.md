# Planaco Launch Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the prototype `website/index.html` into a launch-grade single-page landing site with a live in-browser Monte Carlo demo, deployed to GitHub Pages at `https://sepam.github.io/planaco/`.

**Architecture:** Static site, no build step: one HTML file plus `assets/style.css`, `assets/mc.js` (pure simulation engine, unit-tested with `node --test`), and `assets/site.js` (DOM/chart code). Charts read CSS custom properties so the light/dark toggle re-themes them. Deployment is a GitHub Actions Pages workflow uploading `website/` verbatim.

**Tech Stack:** Hand-written HTML/CSS/vanilla JS · self-hosted woff2 fonts · node ≥18 built-in test runner (dev only) · cairosvg CLI from `.venv/bin/cairosvg` (asset generation only) · GitHub Actions Pages deploy.

**Spec:** `docs/superpowers/specs/2026-07-02-planaco-website-design.md` (approved 2026-07-02).

## Global Constraints

- Work on branch `website-launch`; commit at the end of every task.
- No build step. Everything under `website/` is served as-is.
- No runtime third-party requests except `https://api.github.com/repos/sepam/planaco` (star count, fail-silent).
- Canonical URL: `https://sepam.github.io/planaco/`.
- Brand tokens: keep the existing CSS custom-property block exactly as-is (it matches `brand/STYLE_GUIDE.md`). Never hardcode colors in new CSS/JS — use `var(--…)` / `v('--…')`.
- Voice (style guide §5): plain, precise, concrete numbers ("P85 27 days"), never false certainty.
- Percentile colors always: P50 gold, P85 amber, P95 coral.
- All animation must be disabled under `prefers-reduced-motion: reduce`.
- Local preview for every verification step: `python3 -m http.server 8213 -d website` then `http://localhost:8213/`.
- JS unit tests: `node --test 'tests/website/*.mjs'` (node v26 is installed).
- Line numbers referenced for `website/index.html` are for the file as committed at `19523fd` (the prototype). They apply to Task 1 only; later tasks locate content by anchor/id.

---

### Task 1: Split the prototype into index.html + style.css + site.js

Pure refactor — zero visual or behavioral change. This creates the file layout every later task depends on.

**Files:**
- Modify: `website/index.html` (currently 765 lines, self-contained)
- Create: `website/assets/style.css`
- Create: `website/assets/site.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `website/assets/site.js` exposing (file-scope, not module) the helpers later tasks call: `v(name)` (reads a CSS custom property), `el(tag, attrs)` (creates a namespaced SVG element), `drawHistogram(id, opts)`, `drawPointEstimate(id)`, `drawCDF(id)`, `drawDAG(id)`, `renderDists()`, `renderAll()`, and the constants `HEIGHTS`, `X_MIN`, `X_MAX`, `MODE_INDEX`, `percentileIndex(p)`.

- [ ] **Step 1: Create `website/assets/style.css`**

Move the contents of the `<style>` element — lines 12–283 of `website/index.html` (everything between `<style>` on line 11 and `</style>` on line 284) — into `website/assets/style.css` unchanged.

- [ ] **Step 2: Create `website/assets/site.js`**

Move the contents of the `<script>` element — lines 519–762 (everything between `<script>` on line 518 and `</script>` on line 763) — into `website/assets/site.js` unchanged.

- [ ] **Step 3: Rewire `website/index.html`**

Replace lines 11–284 (the whole `<style>…</style>` block) with:

```html
<link rel="stylesheet" href="assets/style.css" />
```

Replace lines 518–763 (the whole `<script>…</script>` block) with:

```html
<script src="assets/site.js" defer></script>
```

- [ ] **Step 4: Verify**

```bash
python3 -m http.server 8213 -d website &
sleep 1
curl -sf -o /dev/null -w "%{http_code}\n" http://localhost:8213/            # expect 200
curl -sf -o /dev/null -w "%{http_code}\n" http://localhost:8213/assets/style.css  # expect 200
curl -sf -o /dev/null -w "%{http_code}\n" http://localhost:8213/assets/site.js    # expect 200
grep -c "<style>" website/index.html    # expect 0
grep -c "const SVGNS" website/index.html  # expect 0 (script moved out)
kill %1
```

Then load `http://localhost:8213/` in a browser: page must look identical to the prototype (dark theme, all charts render, theme toggle works, no console errors).

- [ ] **Step 5: Commit**

```bash
git add website/
git commit -m "Split website prototype into index.html, style.css, site.js"
```

---

### Task 2: Self-hosted fonts

Replace the Google Fonts CDN with self-hosted woff2 files (latin subset, only the used weights).

**Files:**
- Create: `website/assets/fonts/*.woff2` (7 files, downloaded)
- Create: `website/assets/fonts/README.md`
- Modify: `website/index.html` (remove 3 CDN `<link>` tags)
- Modify: `website/assets/style.css` (add `@font-face` rules at the top)

**Interfaces:**
- Consumes: file layout from Task 1.
- Produces: font families `"Space Grotesk"`, `"Inter"`, `"JetBrains Mono"` available offline; all later tasks may assume no external font requests.

- [ ] **Step 1: Download the woff2 files (Fontsource CDN, latin subset)**

```bash
mkdir -p website/assets/fonts && cd website/assets/fonts
curl -fL -o space-grotesk-latin-500.woff2 https://cdn.jsdelivr.net/fontsource/fonts/space-grotesk@latest/latin-500-normal.woff2
curl -fL -o space-grotesk-latin-700.woff2 https://cdn.jsdelivr.net/fontsource/fonts/space-grotesk@latest/latin-700-normal.woff2
curl -fL -o inter-latin-400.woff2 https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.woff2
curl -fL -o inter-latin-500.woff2 https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-500-normal.woff2
curl -fL -o inter-latin-600.woff2 https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-600-normal.woff2
curl -fL -o jetbrains-mono-latin-400.woff2 https://cdn.jsdelivr.net/fontsource/fonts/jetbrains-mono@latest/latin-400-normal.woff2
curl -fL -o jetbrains-mono-latin-500.woff2 https://cdn.jsdelivr.net/fontsource/fonts/jetbrains-mono@latest/latin-500-normal.woff2
cd -
file website/assets/fonts/*.woff2   # every line must say "Web Open Font Format (Version 2)"
```

- [ ] **Step 2: Create `website/assets/fonts/README.md`**

```markdown
# Fonts

Self-hosted latin subsets, downloaded from Fontsource
(https://fontsource.org), which repackages the upstream releases.

| Family | Weights | License |
|---|---|---|
| Space Grotesk | 500, 700 | [OFL 1.1](https://github.com/floriankarsten/space-grotesk/blob/master/OFL.txt) |
| Inter | 400, 500, 600 | [OFL 1.1](https://github.com/rsms/inter/blob/master/LICENSE.txt) |
| JetBrains Mono | 400, 500 | [OFL 1.1](https://github.com/JetBrains/JetBrainsMono/blob/master/OFL.txt) |
```

- [ ] **Step 3: Add `@font-face` rules at the very top of `website/assets/style.css`**

```css
/* ---------- self-hosted fonts (latin subset) ---------- */
@font-face { font-family: "Space Grotesk"; font-style: normal; font-weight: 500; font-display: swap; src: url("fonts/space-grotesk-latin-500.woff2") format("woff2"); }
@font-face { font-family: "Space Grotesk"; font-style: normal; font-weight: 700; font-display: swap; src: url("fonts/space-grotesk-latin-700.woff2") format("woff2"); }
@font-face { font-family: "Inter"; font-style: normal; font-weight: 400; font-display: swap; src: url("fonts/inter-latin-400.woff2") format("woff2"); }
@font-face { font-family: "Inter"; font-style: normal; font-weight: 500; font-display: swap; src: url("fonts/inter-latin-500.woff2") format("woff2"); }
@font-face { font-family: "Inter"; font-style: normal; font-weight: 600; font-display: swap; src: url("fonts/inter-latin-600.woff2") format("woff2"); }
@font-face { font-family: "JetBrains Mono"; font-style: normal; font-weight: 400; font-display: swap; src: url("fonts/jetbrains-mono-latin-400.woff2") format("woff2"); }
@font-face { font-family: "JetBrains Mono"; font-style: normal; font-weight: 500; font-display: swap; src: url("fonts/jetbrains-mono-latin-500.woff2") format("woff2"); }
```

- [ ] **Step 4: Remove the three Google Fonts lines from `website/index.html`**

Delete these three lines from `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
```

- [ ] **Step 5: Verify**

```bash
grep -c "fonts.googleapis\|fonts.gstatic" website/index.html   # expect 0
ls website/assets/fonts/*.woff2 | wc -l                        # expect 7
```

Browser check: open the page with the network tab; zero requests to any `google*` domain; headings still render in Space Grotesk (compare a heading's computed font-family in devtools).

- [ ] **Step 6: Commit**

```bash
git add website/
git commit -m "Self-host woff2 fonts, drop Google Fonts CDN"
```

---

### Task 3: Theme behavior — system preference, persistence, no flash

**Files:**
- Modify: `website/index.html` (inline pre-paint script + theme-color metas)
- Modify: `website/assets/site.js` (toggle persists; icon initialized)

**Interfaces:**
- Consumes: Task 1 layout; the existing `#themeToggle` button and `renderAll()`.
- Produces: theme contract for all later tasks — `document.documentElement.dataset.theme` is `"dark"` or `"light"`, set before first paint; `localStorage.theme` persists the user's explicit choice.

- [ ] **Step 1: Add the pre-paint script to `<head>` of `website/index.html`**

Insert **before** the stylesheet `<link>`:

```html
<script>
  (function () {
    var t;
    try { t = localStorage.getItem("theme"); } catch (e) {}
    if (t !== "light" && t !== "dark") {
      t = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
    document.documentElement.setAttribute("data-theme", t);
  })();
</script>
<meta name="theme-color" content="#0a1628" media="(prefers-color-scheme: dark)" />
<meta name="theme-color" content="#f0f6fc" media="(prefers-color-scheme: light)" />
```

Keep `data-theme="dark"` on the `<html>` tag as the no-JS fallback.

- [ ] **Step 2: Persist the toggle and initialize its icon in `website/assets/site.js`**

Replace the existing theme-toggle block:

```js
const toggle = document.getElementById('themeToggle');
toggle.addEventListener('click', ()=>{
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  toggle.textContent = next === 'dark' ? '🌙' : '☀️';
  renderAll();
});
```

with:

```js
const toggle = document.getElementById('themeToggle');
function syncToggleIcon(){
  toggle.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '🌙' : '☀️';
}
toggle.addEventListener('click', ()=>{
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('theme', next); } catch (e) {}
  syncToggleIcon();
  renderAll();
});
syncToggleIcon();
```

- [ ] **Step 3: Verify in a browser**

1. DevTools → Rendering → emulate `prefers-color-scheme: light`, hard-reload with `localStorage.clear()` run first → page loads light, toggle shows ☀️.
2. Click toggle → dark; reload → still dark (persisted); `localStorage.theme === "dark"`.
3. No flash of the wrong theme on reload.

- [ ] **Step 4: Commit**

```bash
git add website/
git commit -m "Theme follows system preference and persists via localStorage"
```

---

### Task 4: Head metadata, favicons, social card

**Files:**
- Create: `website/assets/favicon.svg`
- Create: `website/assets/favicon-96.png`, `website/assets/apple-touch-icon.png` (generated)
- Create: `website/assets/og-card.png` (copy of `brand/planaco-social-preview.png`, 1280×640)
- Modify: `website/index.html` (`<head>`)

**Interfaces:**
- Consumes: Task 1 layout.
- Produces: final `<head>` metadata; later tasks don't touch `<head>` except Task 7/9 script tags.

- [ ] **Step 1: Create `website/assets/favicon.svg`**

Brand rule: on imagery the icon sits on a solid navy chip — this also makes the favicon legible on both light and dark tab bars. Artwork is the dark-variant icon (paper bars, gold mode bar):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#0c2a52"/>
  <g transform="translate(6.4,6.4) scale(0.8)">
    <rect x="4" y="44" width="6" height="14" fill="#f0f6fc" rx="1"/>
    <rect x="12" y="38" width="6" height="20" fill="#f0f6fc" rx="1"/>
    <rect x="20" y="28" width="6" height="30" fill="#f0f6fc" rx="1"/>
    <rect x="28" y="18" width="6" height="40" fill="#f5d97a" rx="1"/>
    <rect x="36" y="28" width="6" height="30" fill="#f0f6fc" rx="1"/>
    <rect x="44" y="38" width="6" height="20" fill="#f0f6fc" rx="1"/>
    <rect x="52" y="44" width="6" height="14" fill="#f0f6fc" rx="1"/>
  </g>
</svg>
```

- [ ] **Step 2: Generate raster icons and copy the OG card**

```bash
.venv/bin/cairosvg website/assets/favicon.svg -o website/assets/favicon-96.png --output-width 96 --output-height 96
.venv/bin/cairosvg website/assets/favicon.svg -o website/assets/apple-touch-icon.png --output-width 180 --output-height 180
cp brand/planaco-social-preview.png website/assets/og-card.png
sips -g pixelWidth -g pixelHeight website/assets/favicon-96.png website/assets/apple-touch-icon.png
# expect 96×96 and 180×180
```

- [ ] **Step 3: Replace the `<head>` metadata in `website/index.html`**

Replace the existing `<title>` and `<meta name="description">` lines with:

```html
<title>planaco — Probabilistic Project Planning for Python</title>
<meta name="description" content="Model tasks as probability distributions and run 10,000 Monte Carlo simulations. Ship honest P50/P85/P95 confidence ranges instead of one optimistic date." />
<link rel="canonical" href="https://sepam.github.io/planaco/" />

<meta property="og:type" content="website" />
<meta property="og:site_name" content="planaco" />
<meta property="og:title" content="planaco — Probabilistic Project Planning for Python" />
<meta property="og:description" content="Model tasks as probability distributions and run 10,000 Monte Carlo simulations. Ship honest P50/P85/P95 confidence ranges instead of one optimistic date." />
<meta property="og:url" content="https://sepam.github.io/planaco/" />
<meta property="og:image" content="https://sepam.github.io/planaco/assets/og-card.png" />
<meta property="og:image:width" content="1280" />
<meta property="og:image:height" content="640" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="planaco — Probabilistic Project Planning for Python" />
<meta name="twitter:description" content="Model tasks as probability distributions and run 10,000 Monte Carlo simulations. Ship honest P50/P85/P95 confidence ranges instead of one optimistic date." />
<meta name="twitter:image" content="https://sepam.github.io/planaco/assets/og-card.png" />

<link rel="icon" href="assets/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="assets/favicon-96.png" type="image/png" sizes="96x96" />
<link rel="apple-touch-icon" href="assets/apple-touch-icon.png" />

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "planaco",
  "description": "Probabilistic project planning for Python: model tasks as distributions and estimate completion with Monte Carlo simulation.",
  "url": "https://sepam.github.io/planaco/",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "OS Independent",
  "programmingLanguage": "Python",
  "license": "https://github.com/sepam/planaco/blob/master/LICENSE.md",
  "sameAs": ["https://github.com/sepam/planaco", "https://pypi.org/project/planaco/"]
}
</script>
```

- [ ] **Step 4: Verify**

```bash
python3 -m http.server 8213 -d website &
sleep 1
curl -sf -o /dev/null -w "%{http_code}\n" http://localhost:8213/assets/favicon.svg http://localhost:8213/assets/favicon-96.png http://localhost:8213/assets/apple-touch-icon.png http://localhost:8213/assets/og-card.png   # four 200s
kill %1
python3 - <<'EOF'
import json, re
html = open("website/index.html").read()
m = re.search(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)
json.loads(m.group(1)); print("JSON-LD parses")
EOF
```

Browser check: favicon visible in the tab on both light and dark browser chrome.

- [ ] **Step 5: Commit**

```bash
git add website/
git commit -m "Add SEO/OG metadata, favicons, and social card"
```

---

### Task 5: Remove the style-system section; update the style guide pointer

**Files:**
- Modify: `website/index.html` (delete `<section id="style">`)
- Modify: `website/assets/style.css` (delete now-unused rules)
- Modify: `brand/STYLE_GUIDE.md` (one line)

**Interfaces:**
- Consumes: Task 1 layout.
- Produces: nothing later tasks depend on (nav link cleanup happens in Task 6).

- [ ] **Step 1: Delete the section**

In `website/index.html`, delete the entire block from `<!-- ===================== STYLE SYSTEM ===================== -->` through the matching `</section>` (the `<section id="style">` element containing the swatch grid and typography rows).

- [ ] **Step 2: Delete the orphaned CSS**

In `website/assets/style.css`, delete the `/* style system */` block: the rules for `.swatches`, `.swatch`, `.swatch .chip`, `.swatch .meta`, `.swatch .name`, `.swatch .hex`, `.type-rows`, `.type-row`, and `.type-row .tag` (including the `@media` line for `.swatches`).

- [ ] **Step 3: Update `brand/STYLE_GUIDE.md`**

Replace the line:

```markdown
A live, interactive version of this system is in [`website/index.html`](../website/index.html).
```

with:

```markdown
The web token block lives in [`website/assets/style.css`](../website/assets/style.css) (`:root` / `[data-theme="light"]`).
```

Also in §6 "Applying the system", replace `from [`website/index.html`](../website/index.html)` with `from [`website/assets/style.css`](../website/assets/style.css)` in the **Web / CSS** paragraph.

- [ ] **Step 4: Verify**

```bash
grep -c 'id="style"' website/index.html        # expect 0
grep -c "swatch\|type-row" website/assets/style.css  # expect 0
grep -c "website/index.html" brand/STYLE_GUIDE.md    # expect 0
```

Browser check: page flows from Distributions straight to the code section; footer "Style guide" link is now dead (fixed in Task 6); no layout breakage.

- [ ] **Step 5: Commit**

```bash
git add website/ brand/STYLE_GUIDE.md
git commit -m "Remove style-system section from public page"
```

---

### Task 6: Real links, final nav, GitHub star count

**Files:**
- Modify: `website/index.html` (nav, footer, hero CTA links)
- Modify: `website/assets/site.js` (star fetch)
- Modify: `website/assets/style.css` (star chip style)

**Interfaces:**
- Consumes: Task 1 layout.
- Produces: final nav anchor set `#problem #demo #how #code #distributions` (the `#demo` anchor becomes live in Task 8; a dead anchor until then is acceptable mid-branch).

- [ ] **Step 1: Final nav links in `website/index.html`**

Replace the `.nav-links` contents with:

```html
<div class="nav-links">
  <a href="#problem">Why</a>
  <a href="#demo">Demo</a>
  <a href="#how">How it works</a>
  <a href="#code">Code</a>
  <a href="#distributions">Distributions</a>
  <button class="toggle" id="themeToggle" aria-label="Toggle theme">🌙</button>
  <a class="nav-cta" href="https://github.com/sepam/planaco">GitHub<span id="starWrap" hidden> · ★ <span id="starCount"></span></span></a>
</div>
```

- [ ] **Step 2: Real footer links**

Replace the `.foot-links` contents with:

```html
<div class="foot-links">
  <a href="https://github.com/sepam/planaco">GitHub</a>
  <a href="https://pypi.org/project/planaco/">PyPI</a>
  <a href="https://github.com/sepam/planaco/blob/master/CHANGELOG.md">Changelog</a>
  <a href="https://github.com/sepam/planaco/blob/master/LICENSE.md">License</a>
</div>
```

- [ ] **Step 3: Star fetch in `website/assets/site.js`** (append near the copy-button handler)

```js
/* ---- GitHub stars (fail-silent) ---- */
(async function loadStars(){
  try {
    const r = await fetch('https://api.github.com/repos/sepam/planaco');
    if (!r.ok) return;
    const data = await r.json();
    const n = data.stargazers_count;
    if (typeof n !== 'number') return;
    document.getElementById('starCount').textContent =
      n >= 1000 ? (n/1000).toFixed(1).replace(/\.0$/,'') + 'k' : String(n);
    document.getElementById('starWrap').hidden = false;
  } catch (e) { /* leave the plain GitHub button */ }
})();
```

- [ ] **Step 4: Verify**

```bash
grep -c 'href="#"' website/index.html   # expect 0 — no placeholder links anywhere
```

Browser check: star count appears in the nav button after load (rate-limited API may 403 — then the button must simply read "GitHub" with no error in console beyond the failed request). All nav links scroll to their sections (`#demo` is dead until Task 8 — expected).

- [ ] **Step 5: Commit**

```bash
git add website/
git commit -m "Wire real links and live GitHub star count"
```

---

### Task 7: Monte Carlo engine (`mc.js`) with unit tests — TDD

Pure, DOM-free simulation engine. UMD-lite so the browser gets `window.PlanacoMC` and node tests can `require()` it.

**Files:**
- Create: `website/assets/mc.js`
- Create: `tests/website/mc.test.mjs`
- Modify: `website/index.html` (script tag)

**Interfaces:**
- Consumes: nothing (pure JS, no DOM).
- Produces: `PlanacoMC` with exactly:
  - `sampleTriangular(min, mode, max, u)` → number in `[min, max]` (inverse-CDF; `u` ∈ [0,1))
  - `simulate(tasks, n, rand?)` → `Float64Array` of `n` completion times, where `tasks = {design:[min,mode,max], frontend:[…], backend:[…], testing:[…]}` and completion = `design + max(frontend, backend) + testing`
  - `percentile(sortedArray, p)` → linearly interpolated percentile (`p` ∈ [0,1])
  - `summarize(samples, bins)` → `{min, max, binWidth, counts, modeIndex, p50, p85, p95}` (`counts.length === bins`, `modeIndex` = index of the tallest bin)
  - `clampTriple(triple, which)` → new `[min, mode, max]` with `min ≤ mode ≤ max`; the slider at index `which` (0=min, 1=mode, 2=max) wins and pushes its neighbors

- [ ] **Step 1: Write the failing tests — `tests/website/mc.test.mjs`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const MC = require("../../website/assets/mc.js");

// deterministic "random" stream for reproducible sims
function fakeRand(seed = 1) {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
}

test("sampleTriangular stays within [min, max] and hits mode at the CDF break", () => {
  for (let i = 0; i <= 100; i++) {
    const x = MC.sampleTriangular(5, 7, 14, i / 100);
    assert.ok(x >= 5 && x <= 14, `out of bounds: ${x}`);
  }
  const fc = (7 - 5) / (14 - 5);
  assert.ok(Math.abs(MC.sampleTriangular(5, 7, 14, fc) - 7) < 1e-9);
  assert.equal(MC.sampleTriangular(5, 7, 14, 0), 5);
});

test("sampleTriangular is monotone in u", () => {
  let prev = -Infinity;
  for (let i = 0; i <= 50; i++) {
    const x = MC.sampleTriangular(2, 3, 5, i / 50);
    assert.ok(x >= prev); prev = x;
  }
});

test("sampleTriangular degenerate range returns min", () => {
  assert.equal(MC.sampleTriangular(4, 4, 4, 0.7), 4);
});

const TASKS = { design: [5, 7, 14], frontend: [8, 12, 15], backend: [10, 15, 25], testing: [2, 3, 5] };

test("simulate returns n samples inside theoretical bounds", () => {
  const s = MC.simulate(TASKS, 2000, fakeRand());
  assert.equal(s.length, 2000);
  const lo = 5 + Math.max(8, 10) + 2;    // 17
  const hi = 14 + Math.max(15, 25) + 5;  // 44
  for (const x of s) assert.ok(x >= lo && x <= hi, `sample ${x} outside [${lo}, ${hi}]`);
});

test("simulate is deterministic given the same rand stream", () => {
  const a = MC.simulate(TASKS, 100, fakeRand(7));
  const b = MC.simulate(TASKS, 100, fakeRand(7));
  assert.deepEqual(Array.from(a), Array.from(b));
});

test("percentile interpolates linearly on a sorted array", () => {
  const arr = Array.from({ length: 100 }, (_, i) => i + 1); // 1..100
  assert.equal(MC.percentile(arr, 0), 1);
  assert.equal(MC.percentile(arr, 1), 100);
  assert.ok(Math.abs(MC.percentile(arr, 0.5) - 50.5) < 1e-9);
});

test("summarize: counts sum to n, percentiles ordered, modeIndex is tallest bin", () => {
  const s = MC.simulate(TASKS, 10000, fakeRand(3));
  const sum = MC.summarize(s, 26);
  assert.equal(sum.counts.length, 26);
  assert.equal(sum.counts.reduce((a, b) => a + b, 0), 10000);
  assert.ok(sum.p50 <= sum.p85 && sum.p85 <= sum.p95);
  assert.equal(sum.counts[sum.modeIndex], Math.max(...sum.counts));
  assert.ok(sum.min <= sum.p50 && sum.p95 <= sum.max);
});

test("clampTriple: changed slider wins, neighbors follow", () => {
  assert.deepEqual(MC.clampTriple([10, 7, 14], 0), [10, 10, 14]); // min pushed past mode
  assert.deepEqual(MC.clampTriple([5, 20, 14], 1), [5, 20, 20]);  // mode pushed past max
  assert.deepEqual(MC.clampTriple([5, 2, 14], 1), [2, 2, 14]);    // mode pulled below min
  assert.deepEqual(MC.clampTriple([5, 7, 3], 2), [3, 3, 3]);      // max pulled below both
  assert.deepEqual(MC.clampTriple([5, 7, 14], 1), [5, 7, 14]);    // already valid: unchanged
});
```

- [ ] **Step 2: Run the tests — they must fail**

```bash
node --test 'tests/website/*.mjs'
```

Expected: FAIL — `Cannot find module '…/website/assets/mc.js'`.

- [ ] **Step 3: Implement `website/assets/mc.js`**

```js
/* Monte Carlo engine for the landing-page demo.
   Fixed DAG mirroring the library semantics:
   design -> (frontend || backend) -> testing.
   UMD-lite: window.PlanacoMC in browsers, module.exports under node. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PlanacoMC = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function sampleTriangular(min, mode, max, u) {
    if (max <= min) return min;
    var fc = (mode - min) / (max - min);
    if (u < fc) return min + Math.sqrt(u * (max - min) * (mode - min));
    return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
  }

  function simulate(tasks, n, rand) {
    rand = rand || Math.random;
    var d = tasks.design, f = tasks.frontend, b = tasks.backend, t = tasks.testing;
    var out = new Float64Array(n);
    for (var i = 0; i < n; i++) {
      var td = sampleTriangular(d[0], d[1], d[2], rand());
      var tf = sampleTriangular(f[0], f[1], f[2], rand());
      var tb = sampleTriangular(b[0], b[1], b[2], rand());
      var tt = sampleTriangular(t[0], t[1], t[2], rand());
      out[i] = td + Math.max(tf, tb) + tt;
    }
    return out;
  }

  function percentile(sorted, p) {
    var idx = (sorted.length - 1) * p;
    var lo = Math.floor(idx), hi = Math.ceil(idx);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  }

  function summarize(samples, bins) {
    var s = Float64Array.from(samples).sort();
    var min = s[0], max = s[s.length - 1];
    var w = (max - min) / bins || 1;
    var counts = new Array(bins).fill(0);
    for (var i = 0; i < s.length; i++) {
      var k = Math.floor((s[i] - min) / w);
      if (k >= bins) k = bins - 1;
      counts[k]++;
    }
    var modeIndex = 0;
    for (var j = 1; j < bins; j++) if (counts[j] > counts[modeIndex]) modeIndex = j;
    return {
      min: min, max: max, binWidth: w, counts: counts, modeIndex: modeIndex,
      p50: percentile(s, 0.50), p85: percentile(s, 0.85), p95: percentile(s, 0.95),
    };
  }

  function clampTriple(t, which) {
    var r = t.slice();
    if (which === 0) {
      if (r[1] < r[0]) r[1] = r[0];
      if (r[2] < r[1]) r[2] = r[1];
    } else if (which === 2) {
      if (r[1] > r[2]) r[1] = r[2];
      if (r[0] > r[1]) r[0] = r[1];
    } else {
      if (r[0] > r[1]) r[0] = r[1];
      if (r[2] < r[1]) r[2] = r[1];
    }
    return r;
  }

  return { sampleTriangular: sampleTriangular, simulate: simulate,
           percentile: percentile, summarize: summarize, clampTriple: clampTriple };
});
```

- [ ] **Step 4: Run the tests — they must pass**

```bash
node --test 'tests/website/*.mjs'
```

Expected: all 9 tests PASS.

- [ ] **Step 5: Load it in the page**

In `website/index.html`, add **before** the `site.js` script tag:

```html
<script src="assets/mc.js" defer></script>
```

- [ ] **Step 6: Commit**

```bash
git add website/ tests/website/
git commit -m "Add unit-tested Monte Carlo engine for the live demo"
```

---

### Task 8: Interactive demo section (replaces the charts showcase)

The centerpiece. Also introduces the data-driven histogram renderer (`renderHist`) that Task 9's hero reuses, and deletes the now-redundant "On-brand visuals" showcase section (the spec's approved page structure has no such section — the live demo is the proof).

**Files:**
- Modify: `website/index.html` (delete `<section id="charts">`, insert `<section id="demo">` between the problem and how sections)
- Modify: `website/assets/site.js` (renderHist refactor, demo controller; delete `drawCDF`, `drawDAG`)
- Modify: `website/assets/style.css` (demo styles)

**Interfaces:**
- Consumes: `PlanacoMC` from Task 7; `v()`, `el()`, `HEIGHTS`, `X_MIN`, `X_MAX`, `MODE_INDEX`, `percentileIndex()` from Task 1.
- Produces:
  - `renderHist(svg, model, opts)` where `model = {values:number[], xMin:number, xMax:number, modeIndex:number, marks:[{value,color,label}]}` and `opts = {compact?:boolean, animate?:boolean, xTicks?:number[]}` — Task 9 calls this for the hero.
  - `runDemo()` and `scheduleDemo()`; `renderAll()` now calls `runDemo()` so theme toggles re-render the demo.

- [ ] **Step 1: Delete the charts showcase**

In `website/index.html`, delete the block from `<!-- ===================== CHARTS ===================== -->` through the matching `</section>` (the `<section id="charts">` element).

In `website/assets/site.js`, delete the functions `drawCDF` and `drawDAG` entirely, and remove their calls from `renderAll()`.

- [ ] **Step 2: Insert the demo section HTML**

In `website/index.html`, insert between the problem section (`</section>` closing `#problem`) and the how section (`<section id="how" …>`):

```html
<!-- ===================== DEMO ===================== -->
<section id="demo" style="background: var(--surface);">
  <div class="wrap">
    <div class="section-head">
      <div class="section-tag">Live demo</div>
      <h2>Try it. No install needed.</h2>
      <p>Four tasks, real dependencies. Every drag runs a fresh 10,000-trial Monte Carlo — this is exactly what planaco does.</p>
    </div>
    <div class="demo-grid">
      <div class="card demo-controls" id="demoControls">
        <!-- fieldsets generated by site.js from the TASKS config -->
      </div>
      <div class="demo-output">
        <div class="chart-card">
          <h3>Project completion</h3>
          <div class="desc">10,000 simulations · days to completion</div>
          <svg id="demoHist" viewBox="0 0 520 300" aria-label="Live histogram of simulated completion times"></svg>
        </div>
        <div class="demo-stats" aria-live="polite">
          <div class="stat p50"><span class="k">P50 · days</span><span class="v mono" id="statP50">—</span></div>
          <div class="stat p85"><span class="k">P85 · days</span><span class="v mono" id="statP85">—</span></div>
          <div class="stat p95"><span class="k">P95 · days</span><span class="v mono" id="statP95">—</span></div>
        </div>
        <p class="demo-hint">Widen Backend&rsquo;s max — watch P95 slip while P50 barely moves.</p>
      </div>
    </div>
    <div class="code-block demo-code">
      <div class="bar"><span class="dotr" style="background:var(--coral)"></span><span class="dotr" style="background:var(--amber)"></span><span class="dotr" style="background:var(--teal)"></span> &nbsp;the same model, in planaco</div>
<pre><span class="tok-key">project</span> = Project(name=<span class="tok-str">"Web App"</span>, unit=<span class="tok-str">"days"</span>)
project.add_task(design)                              <span class="tok-com"># 5 · 7 · 14</span>
project.add_task(frontend, depends_on=[design])       <span class="tok-com"># 8 · 12 · 15</span>
project.add_task(backend,  depends_on=[design])       <span class="tok-com"># 10 · 15 · 25</span>
project.add_task(testing,  depends_on=[frontend, backend])
project.statistics(n=<span class="tok-num">10_000</span>)   <span class="tok-com"># → P50, P85, P95</span></pre>
    </div>
  </div>
</section>
```

- [ ] **Step 3: Add demo styles to `website/assets/style.css`** (after the `/* chart showcase */` block)

```css
/* demo */
.demo-grid { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 24px; align-items: start; margin-bottom: 24px; }
@media (max-width: 880px) { .demo-grid { grid-template-columns: 1fr; } }
.demo-task { border: none; border-top: 1px solid var(--border); padding: 16px 0 6px; margin: 0; }
.demo-task:first-of-type { border-top: none; padding-top: 0; }
.demo-task .task-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
.demo-task .task-name { font-family: "Space Grotesk", sans-serif; font-weight: 700; font-size: 16px; }
.demo-task .task-note { font-family: "JetBrains Mono", monospace; font-size: 11px; color: var(--text-faint); text-align: right; }
.demo-row { display: grid; grid-template-columns: 44px 1fr 30px; gap: 10px; align-items: center; margin: 5px 0; }
.demo-row .p-label { font-family: "JetBrains Mono", monospace; font-size: 12px; color: var(--text-muted); }
.demo-row .p-value { font-family: "JetBrains Mono", monospace; font-size: 12px; text-align: right; }
.demo-row input[type="range"] { width: 100%; accent-color: var(--gold-strong); }
.demo-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 18px; }
.demo-stats .stat { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 12px 16px; }
.demo-stats .k { display: block; font-family: "JetBrains Mono", monospace; font-size: 11px; color: var(--text-muted); margin-bottom: 2px; }
.demo-stats .v { font-size: 22px; font-weight: 600; }
.demo-stats .p50 .v { color: var(--gold); }
.demo-stats .p85 .v { color: var(--amber); }
.demo-stats .p95 .v { color: var(--coral); }
.demo-hint { color: var(--text-muted); font-size: 14px; margin-top: 14px; }
.demo-code { margin-top: 8px; }
```

- [ ] **Step 4: Refactor the histogram renderer in `website/assets/site.js`**

Replace `drawHistogram(id, opts)` with a data-driven `renderHist` plus a thin wrapper so the existing problem-section call sites keep working:

```js
/* Data-driven histogram renderer.
   model: {values:number[], xMin, xMax, modeIndex, marks:[{value,color,label}]}
   opts:  {compact?:bool, animate?:bool, xTicks?:number[]} */
function renderHist(svg, model, opts = {}){
  svg.innerHTML = "";
  const W = svg.viewBox.baseVal.width, H = svg.viewBox.baseVal.height;
  const padL = opts.compact ? 8 : 48, padR = opts.compact ? 8 : 20;
  const padT = 18, padB = opts.compact ? 14 : 38;
  const plotW = W - padL - padR, plotH = H - padT - padB, base = padT + plotH;
  const n = model.values.length;
  const step = plotW / n, bw = step * 0.78;
  const peak = Math.max(...model.values) || 1;

  const bar = v('--chart-bar'), barStroke = v('--chart-bar-stroke'), gold = v('--gold');
  const grid = v('--chart-grid'), axis = v('--chart-axis'), muted = v('--text-muted');

  if(!opts.compact){
    for(let g = 0; g <= 4; g++){
      const y = padT + plotH * (g / 4);
      svg.appendChild(el('line', {x1: padL, y1: y, x2: padL + plotW, y2: y, stroke: grid, 'stroke-width': 1}));
    }
  }
  model.values.forEach((hv, i) => {
    const x = padL + i * step + (step - bw) / 2;
    const bh = plotH * hv / peak;
    const isMode = i === model.modeIndex;
    const r = el('rect', {x: x, y: base - bh, width: bw, height: bh, rx: 1.5,
      fill: isMode ? gold : bar, stroke: isMode ? gold : barStroke, 'stroke-width': 1});
    if(opts.animate){ r.classList.add('bar-rise'); r.style.setProperty('--i', i); }
    svg.appendChild(r);
  });
  svg.appendChild(el('line', {x1: padL, y1: base, x2: padL + plotW, y2: base, stroke: axis, 'stroke-width': 1}));

  const span = (model.xMax - model.xMin) || 1;  // degenerate case: all sliders equal
  const xPos = val => padL + (val - model.xMin) / span * plotW;
  (opts.xTicks || []).forEach(val => {
    const t = el('text', {x: xPos(val), y: base + 22, fill: muted, 'font-size': 12,
      'text-anchor': 'middle', 'font-family': 'JetBrains Mono, monospace'});
    t.textContent = Math.round(val); svg.appendChild(t);
  });
  (model.marks || []).forEach(m => {
    const x = xPos(m.value);
    const line = el('line', {x1: x, y1: padT, x2: x, y2: base, stroke: m.color, 'stroke-width': 2, 'stroke-dasharray': '5 4'});
    const lbl = el('text', {x: x + 6, y: padT + 13, fill: m.color, 'font-size': 12, 'font-weight': 600,
      'font-family': 'JetBrains Mono, monospace'});
    lbl.textContent = m.label;
    if(opts.animate){ line.classList.add('mark-in'); lbl.classList.add('mark-in'); }
    svg.appendChild(line); svg.appendChild(lbl);
  });
}

/* Static illustrative model built from the prototype HEIGHTS data. */
function staticModel(withMarks){
  const idxVal = i => X_MIN + (i + 0.5) / HEIGHTS.length * (X_MAX - X_MIN);
  return {
    values: HEIGHTS, xMin: X_MIN, xMax: X_MAX, modeIndex: MODE_INDEX,
    marks: withMarks ? [
      {value: idxVal(percentileIndex(0.50)), color: v('--gold'),  label: 'P50'},
      {value: idxVal(percentileIndex(0.85)), color: v('--amber'), label: 'P85'},
      {value: idxVal(percentileIndex(0.95)), color: v('--coral'), label: 'P95'},
    ] : [],
  };
}

function drawHistogram(id, opts){
  const svg = document.getElementById(id);
  if(!svg) return;
  renderHist(svg, staticModel(!opts.compact), {compact: opts.compact, xTicks: opts.compact ? [] : [14, 18, 22, 26, 30]});
}
```

Note: `staticModel` must be called at draw time (not cached) because the mark colors come from `v('--…')` and change with the theme.

- [ ] **Step 5: Add the demo controller to `website/assets/site.js`**

```js
/* ---- live demo ---- */
const DEMO_TASKS = [
  { key: 'design',   label: 'Design',   note: 'blocks Frontend & Backend',   triple: [5, 7, 14] },
  { key: 'frontend', label: 'Frontend', note: 'after Design ∥ Backend',      triple: [8, 12, 15] },
  { key: 'backend',  label: 'Backend',  note: 'after Design ∥ Frontend',     triple: [10, 15, 25] },
  { key: 'testing',  label: 'Testing',  note: 'waits for both tracks',       triple: [2, 3, 5] },
];
const PARAMS = ['min', 'mode', 'max'];

function buildDemoControls(){
  const host = document.getElementById('demoControls');
  if(!host) return;
  host.innerHTML = DEMO_TASKS.map(t => `
    <fieldset class="demo-task" data-key="${t.key}">
      <div class="task-head"><span class="task-name">${t.label}</span><span class="task-note">${t.note}</span></div>
      ${PARAMS.map((p, i) => `
        <div class="demo-row">
          <label class="p-label" for="${t.key}-${p}">${p}</label>
          <input type="range" id="${t.key}-${p}" min="1" max="40" step="1"
                 value="${t.triple[i]}" data-key="${t.key}" data-which="${i}"
                 aria-label="${t.label} ${p} duration in days" />
          <span class="p-value" id="${t.key}-${p}-value">${t.triple[i]}</span>
        </div>`).join('')}
    </fieldset>`).join('');
  host.addEventListener('input', onDemoInput);
}

function onDemoInput(e){
  const input = e.target;
  if(input.type !== 'range') return;
  const key = input.dataset.key, which = Number(input.dataset.which);
  const task = DEMO_TASKS.find(t => t.key === key);
  const triple = task.triple.slice();
  triple[which] = Number(input.value);
  task.triple = PlanacoMC.clampTriple(triple, which);
  PARAMS.forEach((p, i) => {
    document.getElementById(`${key}-${p}`).value = task.triple[i];
    document.getElementById(`${key}-${p}-value`).textContent = task.triple[i];
  });
  scheduleDemo();
}

let demoPending = false;
function scheduleDemo(){
  if(demoPending) return;
  demoPending = true;
  requestAnimationFrame(() => { demoPending = false; runDemo(); });
}

function runDemo(){
  const svg = document.getElementById('demoHist');
  if(!svg) return;
  const tasks = {};
  DEMO_TASKS.forEach(t => { tasks[t.key] = t.triple; });
  const samples = PlanacoMC.simulate(tasks, 10000);
  const s = PlanacoMC.summarize(samples, 26);
  renderHist(svg, {
    values: s.counts, xMin: s.min, xMax: s.max, modeIndex: s.modeIndex,
    marks: [
      {value: s.p50, color: v('--gold'),  label: 'P50'},
      {value: s.p85, color: v('--amber'), label: 'P85'},
      {value: s.p95, color: v('--coral'), label: 'P95'},
    ],
  }, {xTicks: [0, 0.25, 0.5, 0.75, 1].map(f => s.min + f * (s.max - s.min))});
  document.getElementById('statP50').textContent = s.p50.toFixed(1);
  document.getElementById('statP85').textContent = s.p85.toFixed(1);
  document.getElementById('statP95').textContent = s.p95.toFixed(1);
}
```

Update `renderAll()` to (the `'hist'` call is gone — that svg was deleted with the charts section):

```js
function renderAll(){
  drawHistogram('probHist', {compact:true});
  drawPointEstimate('ptEstimate');
  renderDists();
  runDemo();
}
```

And call `buildDemoControls()` once, immediately before the final `renderAll()` line.

- [ ] **Step 6: Verify**

```bash
node --test 'tests/website/*.mjs'    # engine still green
grep -c 'id="charts"' website/index.html   # expect 0
grep -c "drawCDF\|drawDAG" website/assets/site.js  # expect 0
```

Browser check: demo renders on load with plausible stats (P50 ≈ 25, P95 ≈ 31 for the defaults); dragging Backend max to 40 raises P95 visibly more than P50; dragging Design min above its mode drags mode/max along; keyboard arrows on a focused slider update the chart; theme toggle re-renders the demo histogram in the new palette.

- [ ] **Step 7: Commit**

```bash
git add website/
git commit -m "Add live Monte Carlo demo section, drop static charts showcase"
```

---

### Task 9: Hero — two-column layout, animated histogram, GitHub CTA

**Files:**
- Modify: `website/index.html` (hero markup)
- Modify: `website/assets/site.js` (hero render call)
- Modify: `website/assets/style.css` (hero layout + animations)

**Interfaces:**
- Consumes: `renderHist` + `staticModel` from Task 8.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Hero markup**

Replace the `.hero-inner` div contents in `website/index.html` with:

```html
<div class="wrap hero-inner">
  <div class="hero-copy">
    <span class="eyebrow"><span class="dot"></span> Monte Carlo project estimation · Python · alpha</span>
    <h1>Stop guessing dates.<br/>Plan with <span class="accent">distributions</span>.</h1>
    <p class="sub">Planaco models every task as a probability distribution and runs thousands of Monte Carlo simulations — so you ship honest confidence ranges instead of a single optimistic number.</p>
    <div class="hero-actions">
      <div class="install">
        <span class="prompt">$</span>
        <span>pip install planaco</span>
        <span class="copy" data-copy="pip install planaco">copy</span>
      </div>
      <a class="btn-primary" href="https://github.com/sepam/planaco">View on GitHub</a>
    </div>
  </div>
  <div class="hero-chart" aria-hidden="true">
    <svg id="heroHist" viewBox="0 0 560 320"></svg>
  </div>
</div>
```

(The old "See how it works" primary button is replaced by the GitHub CTA; the install pill stays first.)

- [ ] **Step 2: Hero styles + animation keyframes in `website/assets/style.css`**

Replace `.hero-inner { position: relative; z-index: 1; max-width: 760px; }` with:

```css
.hero-inner {
  position: relative; z-index: 1;
  display: grid; grid-template-columns: 1.05fr 0.95fr;
  gap: 48px; align-items: center;
}
@media (max-width: 880px) { .hero-inner { grid-template-columns: 1fr; } }
.hero-chart svg { width: 100%; height: auto; display: block; }
```

Append the animation rules:

```css
/* hero histogram build-in */
.bar-rise {
  transform-box: fill-box; transform-origin: 50% 100%;
  animation: bar-rise 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--i, 0) * 28ms);
}
@keyframes bar-rise { from { transform: scaleY(0); } to { transform: scaleY(1); } }
.mark-in { animation: mark-in 0.4s ease-out both; animation-delay: 1s; }
@keyframes mark-in { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .bar-rise, .mark-in { animation: none; }
}
```

- [ ] **Step 3: Render the hero chart in `website/assets/site.js`**

Add:

```js
function drawHero(animate){
  const svg = document.getElementById('heroHist');
  if(!svg) return;
  renderHist(svg, staticModel(true), {animate: animate, xTicks: [14, 18, 22, 26, 30]});
}
```

Change `renderAll()` to take a flag so the hero animates only on first paint (the theme-toggle handler keeps calling plain `renderAll()`, so re-themes don't re-animate):

```js
function renderAll(opts = {}){
  drawHero(!!opts.animateHero);
  drawHistogram('probHist', {compact:true});
  drawPointEstimate('ptEstimate');
  renderDists();
  runDemo();
}
```

Change the initial call at the bottom of the file to `renderAll({animateHero: true});`.

- [ ] **Step 4: Verify in a browser**

1. Reload: hero bars rise left-to-right with stagger; gold mode bar included; P50/P85/P95 markers fade in after ~1s.
2. DevTools → Rendering → emulate `prefers-reduced-motion: reduce` → reload: chart appears fully drawn, no animation.
3. Theme toggle: hero redraws instantly (no re-animation), correct colors.
4. 375px viewport: hero stacks, chart below copy, no horizontal scroll.

- [ ] **Step 5: Commit**

```bash
git add website/
git commit -m "Animated hero histogram with two-column hero layout"
```

---

### Task 10: Code section tabs (Python | YAML + CLI | Output)

**Files:**
- Modify: `website/index.html` (`#code` section)
- Modify: `website/assets/site.js` (tab controller)
- Modify: `website/assets/style.css` (tab styles)

**Interfaces:**
- Consumes: existing `.code-block` / token-highlight CSS.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Move the `#code` section and normalize section backgrounds**

The spec's page order is … How → **Code** → Distributions → CTA, but the prototype DOM has Distributions before Code. In `website/index.html`:

1. Move the entire `<section id="code" …>…</section>` block so it sits **between** `</section>` of `#how` and `<section id="distributions" …>`.
2. Remove `style="background: var(--surface);"` from `#how` and from `#distributions`.
3. Keep the surface background on `#code`.

Final background rhythm down the page: problem (plain) → demo (surface) → how (plain) → code (surface) → distributions (plain) → get-started (surface, Task 11).

- [ ] **Step 2: Replace the `#code` section body**

Keep the section tag/head, replace the `.code-grid` div with:

```html
<div class="tabs-card">
  <div class="tabs" role="tablist" aria-label="Code examples">
    <button class="tab" role="tab" id="tab-python" aria-controls="panel-python" aria-selected="true">Python</button>
    <button class="tab" role="tab" id="tab-yaml" aria-controls="panel-yaml" aria-selected="false" tabindex="-1">YAML + CLI</button>
    <button class="tab" role="tab" id="tab-output" aria-controls="panel-output" aria-selected="false" tabindex="-1">Output</button>
  </div>

  <div class="tab-panel" role="tabpanel" id="panel-python" aria-labelledby="tab-python">
<pre><span class="tok-key">from</span> planaco <span class="tok-key">import</span> Task, Project

project = Project(name=<span class="tok-str">"Web App"</span>, unit=<span class="tok-str">"days"</span>)

design   = Task(name=<span class="tok-str">"Design"</span>,   min_duration=<span class="tok-num">5</span>,  mode_duration=<span class="tok-num">7</span>,  max_duration=<span class="tok-num">14</span>)
frontend = Task(name=<span class="tok-str">"Frontend"</span>, min_duration=<span class="tok-num">8</span>,  mode_duration=<span class="tok-num">12</span>, max_duration=<span class="tok-num">15</span>)
backend  = Task(name=<span class="tok-str">"Backend"</span>,  min_duration=<span class="tok-num">10</span>, mode_duration=<span class="tok-num">15</span>, max_duration=<span class="tok-num">25</span>)
testing  = Task(name=<span class="tok-str">"Testing"</span>,  min_duration=<span class="tok-num">2</span>,  mode_duration=<span class="tok-num">3</span>,  max_duration=<span class="tok-num">5</span>)

project.add_task(design)
project.add_task(frontend, depends_on=[design])
project.add_task(backend,  depends_on=[design])
project.add_task(testing,  depends_on=[frontend, backend])

stats = project.statistics(n=<span class="tok-num">10_000</span>)
<span class="tok-key">print</span>(stats[<span class="tok-str">"percentiles"</span>][<span class="tok-str">"p85"</span>])</pre>
  </div>

  <div class="tab-panel" role="tabpanel" id="panel-yaml" aria-labelledby="tab-yaml" hidden>
<pre><span class="tok-com"># project.yaml — then: planaco stats project.yaml</span>
<span class="tok-key">project:</span>
  <span class="tok-key">name:</span> <span class="tok-str">"Web App"</span>
  <span class="tok-key">unit:</span> <span class="tok-str">days</span>
  <span class="tok-key">seed:</span> <span class="tok-num">42</span>

<span class="tok-key">tasks:</span>
  <span class="tok-key">design:</span>
    <span class="tok-key">estimator:</span> <span class="tok-str">pert</span>
    <span class="tok-key">min_duration:</span> <span class="tok-num">5</span>
    <span class="tok-key">mode_duration:</span> <span class="tok-num">7</span>
    <span class="tok-key">max_duration:</span> <span class="tok-num">14</span>
  <span class="tok-key">build:</span>
    <span class="tok-key">estimator:</span> <span class="tok-str">triangular</span>
    <span class="tok-key">min_duration:</span> <span class="tok-num">10</span>
    <span class="tok-key">mode_duration:</span> <span class="tok-num">15</span>
    <span class="tok-key">max_duration:</span> <span class="tok-num">25</span>
    <span class="tok-key">depends_on:</span> [<span class="tok-str">design</span>]</pre>
  </div>

  <div class="tab-panel" role="tabpanel" id="panel-output" aria-labelledby="tab-output" hidden>
    <pre><span class="tok-com"># Web App — 10,000 sims</span>

<div class="stat-line"><span>Mean</span><span class="v">24.3 days</span></div><div class="stat-line"><span>Median (P50)</span><span class="v">24.0 days</span></div><div class="stat-line"><span>Std dev</span><span class="v">3.1 days</span></div><div class="stat-line"><span>P85</span><span class="v">27.4 days</span></div><div class="stat-line"><span>P95</span><span class="v">29.8 days</span></div><div class="stat-line" style="border:none"><span>95% CI</span><span class="v">[18.2, 30.4]</span></div></pre>
  </div>
</div>
```

Delete the old two-column `.code-grid` markup this replaces.

- [ ] **Step 3: Tab styles in `website/assets/style.css`** (replace the `.code-grid` rule and its `@media (max-width: 820px)` companion; keep `.code-block`, `.tok-*`, `.stat-line` rules — the demo section uses them)

```css
/* code tabs */
.tabs-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
.tabs { display: flex; gap: 4px; padding: 10px 12px 0; border-bottom: 1px solid var(--border); }
.tab {
  appearance: none; background: none; border: none; cursor: pointer;
  font-family: "JetBrains Mono", monospace; font-size: 13px; color: var(--text-muted);
  padding: 8px 14px; border-radius: 8px 8px 0 0; border-bottom: 2px solid transparent;
}
.tab:hover { color: var(--text); }
.tab[aria-selected="true"] { color: var(--gold-strong); border-bottom-color: var(--gold-strong); }
.tab-panel pre { padding: 20px; overflow-x: auto; font-family: "JetBrains Mono", monospace; font-size: 13px; line-height: 1.7; }
```

- [ ] **Step 4: Tab controller in `website/assets/site.js`**

```js
/* ---- code tabs ---- */
(function initTabs(){
  const list = document.querySelector('.tabs');
  if(!list) return;
  const tabs = Array.from(list.querySelectorAll('[role="tab"]'));
  function select(tab){
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    tab.focus();
  }
  list.addEventListener('click', e => {
    const tab = e.target.closest('[role="tab"]');
    if(tab) select(tab);
  });
  list.addEventListener('keydown', e => {
    const i = tabs.indexOf(document.activeElement);
    if(i < 0) return;
    if(e.key === 'ArrowRight') select(tabs[(i + 1) % tabs.length]);
    if(e.key === 'ArrowLeft')  select(tabs[(i - 1 + tabs.length) % tabs.length]);
  });
})();
```

- [ ] **Step 5: Verify in a browser**

Clicking each tab swaps the panel without page jump; Left/Right arrows move between tabs when one is focused; only the active panel is visible; token colors render in all three panels. Section order on the page is now How → Code → Distributions, with backgrounds alternating plain/surface.

- [ ] **Step 6: Commit**

```bash
git add website/
git commit -m "Tabbed code examples: Python, YAML+CLI, output"
```

---

### Task 11: Final CTA section + footer polish

**Files:**
- Modify: `website/index.html` (new section before footer; footer tagline)
- Modify: `website/assets/style.css` (CTA styles, ghost button)

**Interfaces:**
- Consumes: existing `.install`/`.copy` pattern (the copy handler binds all `.copy` elements).
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Insert the CTA section immediately before `<footer>`**

```html
<!-- ===================== GET STARTED ===================== -->
<section id="get-started" style="background: var(--surface);">
  <div class="wrap cta-inner">
    <h2>Ship a range you can stand behind.</h2>
    <div class="install big">
      <span class="prompt">$</span>
      <span>pip install planaco</span>
      <span class="copy" data-copy="pip install planaco">copy</span>
    </div>
    <div class="cta-links">
      <a class="btn-primary" href="https://github.com/sepam/planaco">GitHub</a>
      <a class="btn-ghost" href="https://pypi.org/project/planaco/">PyPI</a>
    </div>
  </div>
</section>
```

- [ ] **Step 2: CTA styles in `website/assets/style.css`**

```css
/* final CTA */
.cta-inner { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 26px; }
.cta-inner h2 { font-size: clamp(28px, 4vw, 40px); }
.install.big { font-size: 17px; padding: 16px 24px; }
.cta-links { display: flex; gap: 14px; }
.btn-ghost {
  border: 1px solid var(--border-strong); color: var(--text);
  padding: 14px 24px; border-radius: 10px; font-weight: 600; font-size: 15px;
  transition: background .2s, border-color .2s;
}
.btn-ghost:hover { background: var(--surface-2); }
```

- [ ] **Step 3: Verify in a browser**

CTA section renders centered above the footer; both copy buttons on the page work (hero + CTA); PyPI/GitHub buttons navigate correctly; backgrounds alternate down the page per the Task 10 scheme, ending distributions (plain) → get-started (surface) → footer.

- [ ] **Step 4: Commit**

```bash
git add website/
git commit -m "Add final call-to-action section"
```

---

### Task 12: Repo metadata — pyproject Homepage, README website link

**Files:**
- Modify: `pyproject.toml` (`[project.urls]`)
- Modify: `README.md` (nav row)

**Interfaces:** none.

- [ ] **Step 1: `pyproject.toml`**

Replace:

```toml
[project.urls]
Homepage = "https://github.com/sepam/planaco"
Repository = "https://github.com/sepam/planaco"
```

with:

```toml
[project.urls]
Homepage = "https://sepam.github.io/planaco/"
Repository = "https://github.com/sepam/planaco"
```

- [ ] **Step 2: README nav row**

In the centered `<p align="center">` nav block near the top, add a Website link as the first entry. Replace:

```html
    <a href="#why-planaco">Why Planaco?</a> •
```

with:

```html
    <a href="https://sepam.github.io/planaco/"><b>Website</b></a> •
    <a href="#why-planaco">Why Planaco?</a> •
```

- [ ] **Step 3: Verify**

```bash
python3 -c "import tomllib; d = tomllib.load(open('pyproject.toml','rb')); print(d['project']['urls'])"
# expect Homepage = https://sepam.github.io/planaco/
```

- [ ] **Step 4: Commit**

```bash
git add pyproject.toml README.md
git commit -m "Point Homepage at the website; add README website link"
```

---

### Task 13: GitHub Pages deploy workflow

**Files:**
- Create: `.github/workflows/pages.yml`

**Interfaces:** none.

- [ ] **Step 1: Create `.github/workflows/pages.yml`**

```yaml
name: Deploy website

on:
  push:
    branches: [master]
    paths: ["website/**"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: website
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Validate YAML**

```bash
python3 -c "import yaml, sys; yaml.safe_load(open('.github/workflows/pages.yml')); print('valid yaml')"
```

(If PyYAML isn't importable with system python3, use `.venv/bin/python` — the venv has dev deps.)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/pages.yml
git commit -m "Add GitHub Pages deploy workflow"
```

**Owner follow-up after merge (cannot be automated from here):** repo Settings → Pages → Source = "GitHub Actions". First deploy runs on merge to master (or via workflow_dispatch).

---

### Task 14: Full browser acceptance pass

Run the spec's acceptance checklist against the finished site. Do this in the main session with real browser tooling (Playwright MCP), not a subagent.

**Files:**
- Modify: whatever the checks flag (fixes only, no new features).

- [ ] **Step 1: Serve and run the checklist**

```bash
python3 -m http.server 8213 -d website
```

Verify each item from the spec:

1. First load honors `prefers-color-scheme` (emulate both); toggle switches theme, persists across reload, re-themes every chart.
2. Demo: dragging sliders updates histogram + stats; clamping holds (min can't exceed mode without dragging it along); keyboard arrows work; widening Backend max raises P95 more than P50.
3. Tabs switch content, keyboard-operable (Left/Right arrows).
4. Both copy buttons put `pip install planaco` on the clipboard.
5. 375px viewport: no horizontal scroll anywhere; nav collapses to CTA + toggle; demo usable via touch-sized targets.
6. `prefers-reduced-motion: reduce`: no hero animation.
7. Zero `href="#"` placeholders; every external link resolves (`curl -sfI` each URL: GitHub repo, PyPI, CHANGELOG, LICENSE).
8. Console: no errors on load or interaction (a 403 on the GitHub API is acceptable — button must degrade gracefully).
9. Lighthouse (Chrome devtools, mobile) ≥ 95 on Performance, Accessibility, Best Practices, SEO. Fix regressions until green.

- [ ] **Step 2: Run the JS unit tests one final time**

```bash
node --test 'tests/website/*.mjs'
```

Expected: all PASS.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "Acceptance-pass fixes for website launch"
```

---

## Post-plan (not tasks): open a PR from `website-launch` to `master`, merge, enable Pages (owner), then verify `https://sepam.github.io/planaco/` and check the OG card in a share-preview tool.
