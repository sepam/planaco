"""Native SVG chart rendering for Planaco.

This is the on-brand, web-clean renderer used by ``Project.plot()`` and
``Project.plot_dependency_graph()``. It emits crisp, scalable SVG that matches
``website/index.html`` and the brand system in ``brand/STYLE_GUIDE.md`` — flat
navy/slate bars, a gold modal bar echoing the logo, and percentile markers that
warm from gold to coral.

Charts are returned as :class:`Chart` objects, which can be saved to ``.svg``
(written directly) or ``.png`` (rasterized via ``cairosvg``), rendered inline in
notebooks, or converted to their raw markup with ``str()``.

Public API
----------
Chart
    A rendered SVG chart. ``.save(path)``, ``str(chart)``, notebook display.
histogram(sims, ...)
    Histogram of simulated durations with a gold modal bar and optional
    percentile markers.
cdf(sims, ...)
    Cumulative distribution ("chance of finishing by day X").
dependency_graph(order, labels, durations, deps, ...)
    Task dependency DAG, colored structurally or by critical-path frequency.
"""

import math
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np

from planaco.style import CRITICALITY_STOPS, PALETTE, percentile_color, theme_colors

_FONT = "Inter, 'Helvetica Neue', Arial, sans-serif"
_FONT_DISPLAY = "'Space Grotesk', Inter, sans-serif"
_FONT_MONO = "'JetBrains Mono', ui-monospace, monospace"


# --------------------------------------------------------------------------- #
# Color helpers
# --------------------------------------------------------------------------- #
def _hex_to_rgb(value: str) -> Tuple[int, int, int]:
    value = value.lstrip("#")
    return int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16)


def interpolate_stops(stops: Sequence[str], t: float) -> str:
    """Linearly interpolate a list of hex color stops at position ``t`` in [0, 1]."""
    t = min(1.0, max(0.0, t))
    if t >= 1.0:
        return stops[-1]
    seg = t * (len(stops) - 1)
    i = int(seg)
    frac = seg - i
    a = _hex_to_rgb(stops[i])
    b = _hex_to_rgb(stops[i + 1])
    rgb = tuple(round(a[k] + (b[k] - a[k]) * frac) for k in range(3))
    return "#{:02x}{:02x}{:02x}".format(*rgb)


# --------------------------------------------------------------------------- #
# Chart wrapper
# --------------------------------------------------------------------------- #
class Chart:
    """A rendered SVG chart.

    Parameters
    ----------
    svg : str
        The SVG markup.

    Notes
    -----
    Use :meth:`save` to write a ``.svg`` (directly) or ``.png`` (rasterized via
    ``cairosvg``). In Jupyter the chart renders inline via ``_repr_svg_``.
    ``str(chart)`` returns the raw markup.
    """

    def __init__(self, svg: str) -> None:
        self.svg = svg

    def __str__(self) -> str:
        return self.svg

    def _repr_svg_(self) -> str:
        return self.svg

    def save(self, path: str, scale: float = 2.0) -> None:
        """Save the chart to a file.

        Format is chosen by the extension: ``.png`` is rasterized via
        ``cairosvg`` (at ``scale`` times the design size for crispness); any
        other extension writes the SVG markup directly.

        Parameters
        ----------
        path : str
            Output file path.
        scale : float
            Raster upscaling factor for PNG output (default: 2.0).
        """
        if path.lower().endswith(".png"):
            import cairosvg

            cairosvg.svg2png(
                bytestring=self.svg.encode("utf-8"), write_to=path, scale=scale
            )
        else:
            Path(path).write_text(self.svg, encoding="utf-8")


# --------------------------------------------------------------------------- #
# Low-level SVG helpers
# --------------------------------------------------------------------------- #
def _esc(text: str) -> str:
    return str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _open_svg(width: int, height: int, bg: str) -> List[str]:
    return [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
        f'width="{width}" height="{height}" font-family="{_FONT}">',
        f'<rect width="{width}" height="{height}" fill="{bg}"/>',
    ]


def _text(
    x: float,
    y: float,
    content: str,
    *,
    fill: str,
    size: float = 12,
    anchor: str = "start",
    weight: str = "400",
    font: str = _FONT,
) -> str:
    return (
        f'<text x="{x:.1f}" y="{y:.1f}" fill="{fill}" font-size="{size}" '
        f'text-anchor="{anchor}" font-weight="{weight}" '
        f'font-family="{font}">{_esc(content)}</text>'
    )


def _line(
    x1: float,
    y1: float,
    x2: float,
    y2: float,
    *,
    stroke: str,
    width: float = 1,
    dash: Optional[str] = None,
) -> str:
    dash_attr = f' stroke-dasharray="{dash}"' if dash else ""
    return (
        f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
        f'stroke="{stroke}" stroke-width="{width}"{dash_attr}/>'
    )


def _fmt(value: float) -> str:
    """Format an axis number: drop the decimal when it's a whole number."""
    return f"{value:.0f}" if abs(value - round(value)) < 1e-9 else f"{value:.1f}"


# --------------------------------------------------------------------------- #
# Histogram
# --------------------------------------------------------------------------- #
def _bin_count(sims: "np.ndarray") -> int:
    span = float(sims.max() - sims.min())
    if span <= 0:
        return 1
    return int(min(40, max(12, math.floor(span))))


def _gaussian_kde(sims: "np.ndarray", grid: "np.ndarray") -> "np.ndarray":
    """Evaluate a simple Gaussian KDE of ``sims`` on ``grid`` points."""
    n = len(sims)
    std = float(np.std(sims))
    # Silverman's rule of thumb for bandwidth.
    bw = 1.06 * std * n ** (-1 / 5)
    diffs = (grid[:, None] - sims[None, :]) / bw
    kernel = np.exp(-0.5 * diffs**2) / math.sqrt(2 * math.pi)
    # numpy's arithmetic is untyped here; the value is a 1-D float array.
    return kernel.sum(axis=1) / (n * bw)  # type: ignore[no-any-return]


def histogram(
    sims: Sequence[float],
    *,
    unit: str = "days",
    n: Optional[int] = None,
    theme: str = "light",
    show_percentiles: bool = False,
    percentiles: Optional[List[int]] = None,
    kde: bool = False,
) -> Chart:
    """Render a histogram of simulated durations as an on-brand SVG chart."""
    if percentiles is None:
        percentiles = [50, 85, 95]
    c = theme_colors(theme)
    data = np.asarray(sims, dtype=float)
    n = n if n is not None else len(data)

    W, H = 900, 540
    pad_l, pad_r, pad_t, pad_b = 64, 28, 64, 56
    plot_w = W - pad_l - pad_r
    plot_h = H - pad_t - pad_b
    base = pad_t + plot_h

    counts, edges = np.histogram(data, bins=_bin_count(data))
    x_min, x_max = float(edges[0]), float(edges[-1])
    x_span = (x_max - x_min) or 1.0
    y_max = float(counts.max()) or 1.0
    mode_idx = int(np.argmax(counts))

    def x_of(value: float) -> float:
        return pad_l + (value - x_min) / x_span * plot_w

    parts = _open_svg(W, H, c["bg"])

    # Title
    title = f"{unit.capitalize()} to project completion · n = {n:,}"
    parts.append(
        _text(pad_l, 34, title, fill=c["fg"], size=20, weight="700", font=_FONT_DISPLAY)
    )

    # Horizontal gridlines + y labels
    for g in range(5):
        y = pad_t + plot_h * g / 4
        parts.append(_line(pad_l, y, pad_l + plot_w, y, stroke=c["grid"]))
        value = y_max * (1 - g / 4)
        parts.append(
            _text(
                pad_l - 10,
                y + 4,
                f"{round(value):,}",
                fill=c["muted"],
                size=12,
                anchor="end",
                font=_FONT_MONO,
            )
        )

    # Bars (modal bar in gold)
    for i, count in enumerate(counts):
        x0 = x_of(float(edges[i]))
        x1 = x_of(float(edges[i + 1]))
        bw = max(1.0, x1 - x0 - 1.5)
        bh = plot_h * count / y_max
        fill = c["gold"] if i == mode_idx else c["bar"]
        parts.append(
            f'<rect x="{x0:.1f}" y="{base - bh:.1f}" width="{bw:.1f}" '
            f'height="{bh:.1f}" rx="1.5" fill="{fill}" stroke="{c["bar_edge"]}" '
            f'stroke-width="1"/>'
        )

    # Optional KDE overlay, scaled to the count axis
    if kde and x_span > 1.0:
        grid = np.linspace(x_min, x_max, 160)
        dens = _gaussian_kde(data, grid)
        bin_w = (x_max - x_min) / len(counts)
        scaled = dens * n * bin_w
        pts = [
            f"{x_of(gx):.1f} {base - plot_h * sy / y_max:.1f}"
            for gx, sy in zip(grid, scaled)
        ]
        parts.append(
            f'<polyline points="{" ".join(pts)}" fill="none" '
            f'stroke="{c["fg"]}" stroke-width="2" opacity="0.55"/>'
        )

    # Axis baseline + x labels
    parts.append(_line(pad_l, base, pad_l + plot_w, base, stroke=c["axis"]))
    for tick in np.linspace(x_min, x_max, 5):
        parts.append(
            _text(
                x_of(float(tick)),
                base + 22,
                _fmt(float(tick)),
                fill=c["muted"],
                size=12,
                anchor="middle",
                font=_FONT_MONO,
            )
        )
    parts.append(
        _text(
            pad_l + plot_w / 2,
            H - 12,
            f"Duration ({unit})",
            fill=c["muted"],
            size=13,
            anchor="middle",
        )
    )

    # Percentile markers (or the median); each line is labeled inline.
    if show_percentiles:
        for p in percentiles:
            value = float(np.percentile(data, p))
            color = percentile_color(p)
            px = x_of(value)
            parts.append(_line(px, pad_t, px, base, stroke=color, width=2, dash="6 4"))
            parts.append(
                _text(
                    px + 5,
                    pad_t + 14,
                    f"P{p}",
                    fill=color,
                    size=12,
                    weight="600",
                    font=_FONT_MONO,
                )
            )
    else:
        median = float(np.median(data))
        px = x_of(median)
        parts.append(_line(px, pad_t, px, base, stroke=c["gold"], width=2))
        parts.append(
            _text(
                px + 5,
                pad_t + 14,
                "P50",
                fill=c["gold"],
                size=12,
                weight="600",
                font=_FONT_MONO,
            )
        )

    # A single "mode" key in the title band (explains the gold bar).
    parts.append(
        f'<rect x="{W - pad_r - 168}" y="22" width="12" height="12" rx="3" '
        f'fill="{c["gold"]}"/>'
    )
    parts.append(
        _text(W - pad_r - 150, 32, "mode (most likely)", fill=c["muted"], size=12)
    )

    parts.append("</svg>")
    return Chart("\n".join(parts))


# --------------------------------------------------------------------------- #
# Cumulative distribution
# --------------------------------------------------------------------------- #
def cdf(
    sims: Sequence[float],
    *,
    unit: str = "days",
    n: Optional[int] = None,
    theme: str = "light",
) -> Chart:
    """Render the cumulative distribution of simulated durations as SVG."""
    c = theme_colors(theme)
    data = np.asarray(sims, dtype=float)
    n = n if n is not None else len(data)

    W, H = 900, 540
    pad_l, pad_r, pad_t, pad_b = 64, 28, 64, 56
    plot_w = W - pad_l - pad_r
    plot_h = H - pad_t - pad_b
    base = pad_t + plot_h

    qs = np.linspace(0.0, 1.0, 121).tolist()
    xv = np.asarray(np.quantile(data, qs), dtype=float).tolist()
    x_min, x_max = float(xv[0]), float(xv[-1])
    x_span = (x_max - x_min) or 1.0

    def x_of(value: float) -> float:
        return pad_l + (value - x_min) / x_span * plot_w

    def y_of(prob: float) -> float:
        return base - prob * plot_h

    parts = _open_svg(W, H, c["bg"])
    parts.append(
        _text(
            pad_l,
            34,
            f"Cumulative probability · n = {n:,}",
            fill=c["fg"],
            size=20,
            weight="700",
            font=_FONT_DISPLAY,
        )
    )

    # Gridlines + y labels (probability)
    for q in (0.0, 0.25, 0.5, 0.75, 1.0):
        y = y_of(q)
        parts.append(_line(pad_l, y, pad_l + plot_w, y, stroke=c["grid"]))
        parts.append(
            _text(
                pad_l - 10,
                y + 4,
                f"{q:.2f}",
                fill=c["muted"],
                size=12,
                anchor="end",
                font=_FONT_MONO,
            )
        )

    # Filled area under the curve
    area = [f"{pad_l:.1f} {base:.1f}"]
    area += [f"{x_of(float(x)):.1f} {y_of(float(q)):.1f}" for x, q in zip(xv, qs)]
    area.append(f"{pad_l + plot_w:.1f} {base:.1f}")
    parts.append(
        f'<polygon points="{" ".join(area)}" fill="{c["gold"]}" fill-opacity="0.16"/>'
    )

    # The curve itself
    line = [f"{x_of(float(x)):.1f} {y_of(float(q)):.1f}" for x, q in zip(xv, qs)]
    parts.append(
        f'<polyline points="{" ".join(line)}" fill="none" stroke="{c["gold"]}" '
        f'stroke-width="2.5" stroke-linejoin="round"/>'
    )

    # P85 guide lines + dot
    p85 = float(np.percentile(data, 85))
    gx, gy = x_of(p85), y_of(0.85)
    parts.append(
        _line(gx, pad_t, gx, base, stroke=PALETTE["amber"], width=1.5, dash="4 4")
    )
    parts.append(
        _line(pad_l, gy, gx, gy, stroke=PALETTE["amber"], width=1.5, dash="4 4")
    )
    parts.append(
        f'<circle cx="{gx:.1f}" cy="{gy:.1f}" r="4" fill="{PALETTE["amber"]}"/>'
    )
    parts.append(
        _text(
            gx + 6,
            pad_t + 14,
            f"P85 = {_fmt(p85)}",
            fill=PALETTE["amber"],
            size=12,
            weight="600",
            font=_FONT_MONO,
        )
    )

    # Axis baseline + x labels
    parts.append(_line(pad_l, base, pad_l + plot_w, base, stroke=c["axis"]))
    for tick in np.linspace(x_min, x_max, 5):
        parts.append(
            _text(
                x_of(float(tick)),
                base + 22,
                _fmt(float(tick)),
                fill=c["muted"],
                size=12,
                anchor="middle",
                font=_FONT_MONO,
            )
        )
    parts.append(
        _text(
            pad_l + plot_w / 2,
            H - 12,
            f"Duration ({unit})",
            fill=c["muted"],
            size=13,
            anchor="middle",
        )
    )

    parts.append("</svg>")
    return Chart("\n".join(parts))


# --------------------------------------------------------------------------- #
# Dependency graph
# --------------------------------------------------------------------------- #
def _layer_of(order: Sequence[str], deps: Dict[str, List[str]]) -> Dict[str, int]:
    """Longest-path layer index for each node (roots at layer 0)."""
    layer: Dict[str, int] = {}

    def compute(node: str) -> int:
        if node in layer:
            return layer[node]
        node_deps = deps.get(node, [])
        layer[node] = 0 if not node_deps else 1 + max(compute(d) for d in node_deps)
        return layer[node]

    for node in order:
        compute(node)
    return layer


def dependency_graph(
    order: Sequence[str],
    labels: Dict[str, str],
    durations: Dict[str, str],
    deps: Dict[str, List[str]],
    *,
    title: Optional[str] = None,
    theme: str = "light",
    criticality: Optional[Dict[str, float]] = None,
) -> Chart:
    """Render a task dependency DAG as an on-brand SVG chart.

    Nodes are laid out in dependency layers (roots on the left). They are
    colored either structurally (teal start / navy middle / gold end) or, when
    ``criticality`` is given, on the brand slate -> gold -> coral gradient.
    """
    c = theme_colors(theme)
    crit_lookup: Dict[str, float] = criticality or {}
    layer = _layer_of(order, deps)

    # Reverse edges to find leaves (nodes nothing depends on).
    has_dependents = dict.fromkeys(order, False)
    for node in order:
        for dep in deps.get(node, []):
            has_dependents[dep] = True

    # Group nodes into columns by layer.
    columns: Dict[int, List[str]] = {}
    for node in order:
        columns.setdefault(layer[node], []).append(node)
    n_cols = max(columns) + 1 if columns else 1
    max_rows = max((len(col) for col in columns.values()), default=1)

    node_w, node_h = 150, 56
    col_gap, row_gap = 210, 96
    pad_x, pad_t = 40, 60
    W = pad_x * 2 + node_w + (n_cols - 1) * col_gap
    H = pad_t + 40 + max(1, max_rows) * row_gap

    pos: Dict[str, Tuple[float, float]] = {}
    for col_idx in range(n_cols):
        col = columns.get(col_idx, [])
        cx = pad_x + node_w / 2 + col_idx * col_gap
        offset = (max_rows - len(col)) * row_gap / 2
        for row_idx, node in enumerate(col):
            cy = pad_t + 30 + offset + row_idx * row_gap + node_h / 2
            pos[node] = (cx, cy)

    parts = _open_svg(W, H, c["bg"])
    if title:
        parts.append(
            _text(
                pad_x,
                34,
                title,
                fill=c["fg"],
                size=20,
                weight="700",
                font=_FONT_DISPLAY,
            )
        )

    # Arrowhead markers
    parts.append(
        f"<defs>"
        f'<marker id="arr-edge" viewBox="0 0 10 10" refX="9" refY="5" '
        f'markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        f'<path d="M0 0 L10 5 L0 10 z" fill="{c["muted"]}"/></marker>'
        f'<marker id="arr-crit" viewBox="0 0 10 10" refX="9" refY="5" '
        f'markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        f'<path d="M0 0 L10 5 L0 10 z" fill="{c["gold"]}"/></marker>'
        f"</defs>"
    )

    # Edges (dependency -> dependent), curved left to right.
    for node in order:
        for dep in deps.get(node, []):
            x1, y1 = pos[dep]
            x2, y2 = pos[node]
            sx, sy = x1 + node_w / 2, y1
            ex, ey = x2 - node_w / 2, y2
            crit = (
                crit_lookup.get(dep, 0.0) >= 0.999
                and crit_lookup.get(node, 0.0) >= 0.999
            )
            stroke = c["gold"] if crit else c["muted"]
            mid = (sx + ex) / 2
            parts.append(
                f'<path d="M {sx:.1f} {sy:.1f} C {mid:.1f} {sy:.1f}, '
                f'{mid:.1f} {ey:.1f}, {ex:.1f} {ey:.1f}" fill="none" '
                f'stroke="{stroke}" stroke-width="{2.5 if crit else 1.5}" '
                f'opacity="{1.0 if crit else 0.6}" '
                f'marker-end="url(#{"arr-crit" if crit else "arr-edge"})"/>'
            )

    # Nodes
    for node in order:
        cx, cy = pos[node]
        if criticality is not None:
            fill = interpolate_stops(CRITICALITY_STOPS, criticality.get(node, 0.0))
        elif not deps.get(node):
            fill = PALETTE["teal"]  # start node
        elif not has_dependents[node]:
            fill = c["gold"]  # end node
        else:
            fill = c["bar"]  # middle node
        x0, y0 = cx - node_w / 2, cy - node_h / 2
        parts.append(
            f'<rect x="{x0:.1f}" y="{y0:.1f}" width="{node_w}" height="{node_h}" '
            f'rx="12" fill="{fill}" stroke="{c["bar_edge"]}" stroke-width="1.5"/>'
        )
        dur = durations.get(node, "")
        name = labels.get(node, node)
        # Translucent backing keeps labels legible on any node color.
        backing_h = 34 if dur else 20
        parts.append(
            f'<rect x="{x0 + 8:.1f}" y="{cy - backing_h / 2:.1f}" '
            f'width="{node_w - 16}" height="{backing_h}" rx="6" '
            f'fill="{c["bg"]}" opacity="0.72"/>'
        )
        if dur:
            parts.append(
                _text(
                    cx,
                    cy - 2,
                    name,
                    fill=c["fg"],
                    size=13,
                    anchor="middle",
                    weight="600",
                    font=_FONT_DISPLAY,
                )
            )
            parts.append(
                _text(
                    cx,
                    cy + 13,
                    dur,
                    fill=c["muted"],
                    size=11,
                    anchor="middle",
                    font=_FONT_MONO,
                )
            )
        else:
            parts.append(
                _text(
                    cx,
                    cy + 4,
                    name,
                    fill=c["fg"],
                    size=13,
                    anchor="middle",
                    weight="600",
                    font=_FONT_DISPLAY,
                )
            )

    parts.append("</svg>")
    return Chart("\n".join(parts))
