<div align="center">
  <img src="planaco-lockup-light.svg" alt="planaco" width="280" />

  # Planaco Brand &amp; Style Guide
</div>

---

This is the single source of truth for how Planaco looks — across the README, the
documentation site, the landing page, and the data visualizations the library
itself produces. The goal is simple: **every surface should feel like the same
product.** A chart rendered by `project.plot()` should be unmistakably the same
brand as the logo and the website.

The web token block lives in [`website/assets/style.css`](../website/assets/style.css) (`:root` / `[data-theme="light"]`).
The library-side implementation lives in [`src/planaco/style.py`](../src/planaco/style.py).

---

## 1. Brand essence

Planaco turns uncertain estimates into honest probability distributions. The
brand should feel **analytical, confident, and calm** — the opposite of a
single optimistic deadline.

The logo encodes the whole idea: it's a histogram, and the tallest bar — the
**mode**, the most likely outcome — is gold. That one gold bar is the brand's
core motif and reappears in every chart we draw.

| Mark | Use |
|------|-----|
| `planaco-lockup-{light,dark}.svg` | Primary lockup (icon + wordmark). Default choice. |
| `planaco-icon-{light,dark}.svg` | Square icon only. Avatars, favicons, tight spaces. |
| `planaco-icon-{light,dark}-{256,512}.png` | Raster icon for non-SVG contexts. |
| `planaco-social-preview.png` | 1280×640 social/OpenGraph card. |

**Logo rules**

- Use the **light** variants on dark backgrounds, **dark** variants on light. (The
  file name refers to the artwork color, matching the brand convention in
  `README.md`.)
- Keep clear space around the lockup equal to the height of one logo bar.
- The mode bar is **always gold**. Never recolor it, and never make all bars one color.
- Don't stretch, rotate, add shadows/gradients, or place the lockup on a busy
  photo. On imagery, use the icon on a solid navy chip.

---

## 2. Color

The palette is built from the brand assets: navy ink, a gold accent, and paper
white. Everything else is a supporting tint. Gold has two tones — a brighter one
for dark surfaces, a deeper one for light — so the accent reads with equal
weight in either mode.

### Core

| Token | Light | Dark | Role |
|-------|-------|------|------|
| Ink / Navy | `#0c2a52` | `#0c2a52` | Primary brand color, text on light |
| Canvas | `#f0f6fc` | `#0a1628` | Page background |
| Surface | `#ffffff` | `#0f2038` | Cards, panels |
| Text | `#0c2a52` | `#f0f6fc` | Body text |
| Text muted | `#4f6a8a` | `#9fb3c8` | Secondary text, axis labels |
| **Gold (accent)** | `#e6b94d` | `#f5d97a` | The accent. Mode bar, CTAs, links, P50 |

### Chart semantics

These carry meaning in data viz — use them only for what they mean.

| Token | Light | Dark | Meaning |
|-------|-------|------|---------|
| Gold | `#e6b94d` | `#f5d97a` | Mode / most-likely · P50 · critical path |
| Amber | `#d99a2e` | `#f0b44d` | P85 — caution |
| Coral | `#d96b4f` | `#f0846b` | P95 · risk · deadline-miss |
| Teal | `#2a9d9d` | `#5ec8c8` | Secondary categorical series |
| Bar | `#2a4a7c` | `#3a5a8c` | Distribution / simulated outcomes |
| Bar stroke | `#1c3a66` | `#5d82bb` | Bar outline |

**Percentiles warm as risk climbs:** gold → amber → coral. This is intentional and
consistent everywhere — a reader learns it once.

**Don't** reintroduce generic charting-library defaults (grey background, purple
bars), or the old green/red min–max coloring. Green/red clashes with navy+gold
and carries the wrong (pass/fail) connotation for a probabilistic tool.

---

## 3. Typography

Three typefaces, each with one job.

| Typeface | Role | Weights |
|----------|------|---------|
| **Space Grotesk** | Display, headings, the wordmark | 500, 700 |
| **Inter** | Body, UI, axis labels | 400, 500, 600 |
| **JetBrains Mono** | Code, CLI, numeric data, metric values | 400, 500 |

**Scale** (web): hero `clamp(42–72px)/700` · h2 `28–40px/700` · h3 `18–20px/700` ·
body `16–18px/400` · small/label `13–14px` · code `13–15px`.

Headings use tight tracking (`-0.02em`). Numbers in tables and stat readouts are
set in JetBrains Mono so they align.

In the SVG charts the font stack falls back gracefully:
`Inter → Space Grotesk → Helvetica Neue → Arial → sans-serif`, so charts still
render cleanly where the brand fonts aren't installed.

---

## 4. Data visualization

This is where the brand earns its keep. Planaco renders charts as native SVG
(`planaco.charts`), so the on-brand look is built in — no theming call needed:

```python
chart = project.plot(n=10000, show_percentiles=True)
chart.save("estimate.svg")   # or .png (rasterized via cairosvg)
```

**Rules for every chart**

- **Background:** canvas/paper, never grey. Top and right spines removed.
- **Grid:** horizontal only, very low contrast. The data is the hero.
- **Distribution bars:** navy/slate fill with a subtle stroke.
- **The mode bar is gold** — the single tallest bar, echoing the logo.
- **Percentile markers:** dashed vertical lines, labeled, colored gold/amber/coral
  for P50/P85/P95 via `planaco.style.percentile_color(p)`.
- **CDF:** gold line over a translucent gold fill; a single guide line for the
  percentile you're highlighting.
- **Dependency graph:** navy nodes; nodes on the critical path are gold. The
  criticality gradient interpolates `planaco.style.CRITICALITY_STOPS`
  (slate → gold → coral, low → high), replacing the old green→red ramp.
- **Titles** in Space Grotesk weight; axis labels in Inter; numeric ticks in mono.

---

## 5. Voice

Plain, precise, a little opinionated. We say *"honest confidence ranges,"* not
*"powerful analytics."* Prefer concrete numbers (`P85 27 days`) over adjectives.
Never imply false certainty — the whole point is the range.

---

## 6. Applying the system

**Python** — tokens in `src/planaco/style.py` (`PALETTE`, `theme_colors(theme)`,
`PERCENTILE_COLORS`, `percentile_color(p)`, `CRITICALITY_STOPS`), consumed by the
SVG renderer in `src/planaco/charts.py`.

**Web / CSS** — copy the `:root` and `[data-theme="light"]` custom properties from
[`website/assets/style.css`](../website/assets/style.css). They are the same tokens listed
above, named identically (`--gold`, `--canvas`, `--chart-bar`, …).

**Docs / README** — use the lockup at the top, light/dark via the GitHub
`prefers-color-scheme` picture trick already in `README.md`, and regenerate the
example plots with the theme applied so they match this guide.
