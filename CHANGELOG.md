# Changelog

All notable changes to **planaco** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/). While in
alpha (`0.x`), the public API may change between minor releases.

## [0.3.0] - 2026-06-20

The "SVG-native" release: charts are now rendered as crisp, on-brand SVG, and the
heavy plotting dependencies are gone.

### Changed
- **Charts now render as native SVG** via the new `planaco.charts` module instead
  of matplotlib/seaborn. `Project.plot()` and `Project.plot_dependency_graph()`
  return a `Chart` (save with `chart.save(path)` to `.svg` or `.png`; renders
  inline in notebooks) rather than a matplotlib `Figure`. **Breaking.**
- `Project.plot_dependency_graph()` dropped the matplotlib-only `figsize`,
  `node_size`, and `font_size` parameters. **Breaking.**

### Added
- Brand & style system: `brand/STYLE_GUIDE.md`, shared design tokens in
  `planaco.style` (`PALETTE`, `theme_colors`, `PERCENTILE_COLORS`,
  `percentile_color`, `CRITICALITY_STOPS`), and a landing-page mockup in
  `website/index.html`.
- On-brand visuals: navy distribution bars with a gold modal bar, percentile
  markers warming gold → amber → coral, a gold-filled cumulative curve, and a
  self-laid-out dependency graph (teal start / navy middle / gold end).
- Optional `title` argument on `planaco.charts.histogram()`.
- `scripts/generate_example_plots.py` to regenerate the example images.

### Removed
- Dropped the `matplotlib`, `seaborn`, and `networkx` runtime dependencies. The
  dependency / critical-path engine was always pure Python; rendering is now SVG.
  Runtime dependencies are now just `click`, `numpy`, `PyYAML`, and `cairosvg`.

## [0.2.3] and earlier

Tagged releases (`v0.2.0`–`v0.2.3`) predate this changelog. See the
[git history](https://github.com/sepam/planaco/commits/master) and
[tags](https://github.com/sepam/planaco/tags) for details.

[0.3.0]: https://github.com/sepam/planaco/tree/v0.3.0
