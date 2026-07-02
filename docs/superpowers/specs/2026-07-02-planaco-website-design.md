# Planaco Website — Design Spec

- **Date:** 2026-07-02
- **Status:** Approved (brainstorm session 2026-07-02)
- **Replaces:** the prototype `website/index.html` (single-file mockup with an internal style-guide section)

## Summary

A single-page landing site for planaco that makes a visitor understand the
product in 10 seconds, feel the value in 60 (via a live in-browser Monte Carlo
demo), and install it in one copy-paste. Launch-grade: real links, SEO/social
meta, self-hosted fonts, fast load, deployed to GitHub Pages at
`https://sepam.github.io/planaco/`.

## Decisions (from brainstorm)

| Decision | Choice |
|---|---|
| Scope | Landing page only; docs remain the GitHub README |
| Hosting | GitHub Pages, deployed from this repo via GitHub Actions |
| Tech | Hand-crafted static HTML/CSS/JS, no build step |
| Live demo | Yes — vanilla-JS Monte Carlo simulator |
| Architecture | Narrative arc (problem → solution → proof) with the demo as centerpiece |
| Style section | Removed from the public page; tokens live in `brand/STYLE_GUIDE.md` |

## Page structure (top to bottom)

### 1. Nav (sticky)
- Logo lockup (existing inline SVG histogram mark + wordmark).
- Links: Why · Demo · How · Code · Distributions.
- Theme toggle (see Theme behavior).
- GitHub button showing a live star count: fetch
  `https://api.github.com/repos/sepam/planaco` on load, render `★ N`
  (formatted, e.g. `1.2k`); on any fetch failure render the button without a
  count. No retry, no spinner.

### 2. Hero
- Keep the headline **"Stop guessing dates. Plan with distributions."** and the
  existing subhead voice (honest confidence ranges, not one optimistic number).
- Eyebrow pill: `Monte Carlo project estimation · Python · alpha` (drop or
  update "alpha" when the project status changes).
- **Hero visual: an animated histogram** — the brand chart, building itself on
  load: bars rise with a small stagger, then the gold mode bar emphasizes and
  the dashed P50/P85/P95 markers draw in with their labels. Under
  `prefers-reduced-motion: reduce`, the finished chart renders statically with
  no animation.
- Actions: install pill (`$ pip install planaco` + copy button) and a
  secondary "View on GitHub" button.

### 3. Problem — "A single number hides the risk"
- Keep the existing side-by-side comparison: lone point-estimate bar (coral)
  vs. full distribution with percentile markers. Substance unchanged.

### 4. Interactive demo — "Try it. No install needed." (new centerpiece)
- Four preset tasks in the DAG already used by the prototype's dependency
  chart, defaults matching it:
  - Design (min 5 · mode 7 · max 14) → blocks Frontend and Backend
  - Frontend (8 · 12 · 15), Backend (10 · 15 · 25) — run in parallel
  - Testing (2 · 3 · 5) — waits for both
- Each task has three sliders (min / mode / max), native
  `<input type="range">`, integer steps, range 1–40. Constraint
  `min ≤ mode ≤ max` enforced by clamping the neighbors when a slider crosses
  them (dragging min above mode pushes mode up, etc.).
- Every input event re-runs a **10,000-trial Monte Carlo** and redraws:
  - the histogram (same visual language: navy bars, gold mode bar, dashed
    gold/amber/coral P50/P85/P95 markers),
  - a stat readout of P50 / P85 / P95 in JetBrains Mono (aria-live=polite).
  - Rendering is coalesced via `requestAnimationFrame`; the simulation itself
    is fast enough to run per-event.
- Simulation semantics (mirrors the library): sample each task duration from a
  triangular distribution (inverse-CDF sampling); completion =
  `design + max(frontend, backend) + testing`. Histogram uses ~26 bins over
  the observed range, matching the prototype's aesthetic.
- A hint line teaches the core insight; copy:
  *"Widen Backend's max — watch P95 slip while P50 barely moves."*
- Below the demo, a small code block shows the equivalent planaco Python
  snippet with the caption "This demo is exactly what the library does —
  in Python, with six distributions and export."

### 5. How it works
- Keep the existing three steps (Model each task → Link dependencies →
  Simulate & decide). Unchanged.

### 6. Code — tabbed examples
- One code card with three tabs (replaces the current two-column YAML/output
  grid so the Python API gets equal billing):
  1. **Python** — the Task/Project/statistics example from the README (short
     version).
  2. **YAML + CLI** — the existing `project.yaml` sample with
     `$ planaco stats project.yaml`.
  3. **Output** — the existing stat-line readout (mean/median/std/P85/P95/CI).
- Tabs are buttons with `aria-selected`; content switches without page jump.
  Keep the existing hand-rolled token highlighting (no highlight.js).

### 7. Distributions
- Keep the six sparkline cards (Triangular, PERT, Uniform, Normal, LogNormal,
  Beta) rendered from the existing JS PDF samplers. Unchanged.

### 8. Final CTA
- Large install command with copy button, plus GitHub and PyPI buttons.
- One line of voice-consistent copy: *"Ship a range you can stand behind."*

### 9. Footer
- Links: GitHub · PyPI · Changelog (`CHANGELOG.md` on GitHub) · License
  (`LICENSE.md` on GitHub).
- © line + MIT notice. Small logo mark.

### Removed
- The entire **"Brand & style system"** section (color swatches + typography
  specimen rows). It reads as internal documentation, not marketing content.

## Visual & brand treatment

- Reuse the existing CSS custom-property token system verbatim (it matches
  `brand/STYLE_GUIDE.md`): navy/canvas/surface, gold accent, amber/coral/teal
  chart semantics, dark and light themes.
- Charts keep the established pattern: drawing code reads token values via
  `getComputedStyle`, so a theme toggle re-renders all charts correctly.
- Typography unchanged: Space Grotesk (display), Inter (body), JetBrains Mono
  (code/numerics).

## Technical architecture

**No build step.** Files served as-is by GitHub Pages:

```
website/
  index.html            # markup only; no inline mega-<style>/<script>
  assets/
    style.css           # all styles incl. token system
    site.js             # charts, demo engine, theme, tabs, stars, copy
    fonts/              # self-hosted woff2, latin subset only:
                        #   SpaceGrotesk 500/700, Inter 400/500/600,
                        #   JetBrainsMono 400/500
    favicon.svg         # from brand/planaco-icon-*.svg
    favicon-96.png      # raster fallback (from brand PNG icons)
    apple-touch-icon.png  # 180×180
    og-card.png         # copy of brand/planaco-social-preview.png
```

- **Fonts:** self-hosted woff2 with `font-display: swap`, replacing the Google
  Fonts CDN links (faster, zero third-party requests, no consent concerns).
  Obtain via google-webfonts-helper/Fontsource; latin subset only.
- **Demo engine (~100 lines vanilla JS):** triangular inverse-CDF sampler,
  fixed 4-node DAG evaluation, percentile computation, histogram binning.
- **JS loading:** single `site.js` with `defer`. No frameworks, no
  dependencies, no analytics.

## Theme behavior

- Initial theme: `localStorage.theme` if set, else `prefers-color-scheme`.
  (The prototype hardcodes dark — this changes.)
- Toggle persists to `localStorage` and re-renders charts.
- A tiny inline `<head>` script sets `data-theme` before first paint to avoid
  a flash of wrong theme.
- `<meta name="theme-color">` provided for both schemes.

## Metadata / SEO

- `<title>`: `planaco — Probabilistic Project Planning for Python`.
- Meta description (~150 chars) in style-guide voice.
- Canonical: `https://sepam.github.io/planaco/`.
- OpenGraph + Twitter (`summary_large_image`) pointing at
  `assets/og-card.png`.
- Favicon set: SVG primary, PNG fallback, apple-touch-icon.
- JSON-LD `SoftwareApplication` block (name, description, license, URL,
  programming language).

## Accessibility & performance

- Semantic landmarks (`nav`, `main`, `section` with headings, `footer`).
- Demo sliders: visible task/parameter labels, `aria-label` per slider,
  current values shown next to each; stat readout is `aria-live="polite"`.
- All animation gated on `prefers-reduced-motion`.
- Existing palette already meets contrast on both themes; verify muted text.
- Budget: no external requests except the GitHub stars API; Lighthouse ≥ 95
  on all four categories.

## Related repo updates

- `brand/STYLE_GUIDE.md`: replace "A live, interactive version of this system
  is in `website/index.html`" with a pointer to the token block in
  `website/assets/style.css`.
- `pyproject.toml` `[project.urls]`: `Homepage = "https://sepam.github.io/planaco/"`,
  keep `Repository`.
- README: add the site link under the badges (small, one line).

## Deployment

- New workflow `.github/workflows/pages.yml`:
  - Triggers: push to `master` with paths `website/**`, plus
    `workflow_dispatch`.
  - Permissions `pages: write`, `id-token: write`; concurrency group `pages`.
  - Steps: checkout → `actions/upload-pages-artifact` with `path: website` →
    `actions/deploy-pages`.
- **Manual step (owner):** enable Pages in repo settings with Source =
  "GitHub Actions" (one time).

## Testing / acceptance

Drive the real page in a browser (Playwright) and verify:

1. Loads with correct theme per `prefers-color-scheme`; toggle switches and
   persists across reload; charts re-theme.
2. Demo: dragging any slider updates histogram and stats; min/mode/max
   clamping holds; keyboard arrows work on sliders; stats change plausibly
   (widening max raises P95).
3. Tabs switch content and are keyboard-operable.
4. Copy buttons copy the install command.
5. Mobile viewport (375px): no horizontal scroll, nav collapses as today,
   demo usable by touch.
6. Reduced motion: no hero animation.
7. All links resolve (GitHub, PyPI, CHANGELOG, LICENSE); no `#` placeholders.
8. Lighthouse ≥ 95 across categories.
9. After deploy: site reachable at the canonical URL, OG card renders in a
   share-preview checker.

## Out of scope

- Docs site, custom domain, Pyodide/WebAssembly, analytics, blog, i18n.
- Any change to the library's Python code or chart output.
- README restructuring beyond adding the site link.
