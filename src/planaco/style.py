"""On-brand matplotlib/seaborn styling for Planaco plots.

This module is the library-side implementation of the Planaco brand system.
It restyles matplotlib so that plots produced by :class:`planaco.Project`
(histograms, cumulative distributions, dependency graphs) match the logo,
the documentation, and the website.

The brand motif is a histogram whose modal (most likely) bar is gold. Every
chart echoes it: navy/slate distribution bars, a gold mode bar, and percentile
markers that warm from gold to coral as risk climbs.

See ``brand/STYLE_GUIDE.md`` for the full design system and ``website/index.html``
for a live reference.

Quick start
-----------
>>> from planaco.style import apply_planaco_style, mode_bar_colors, percentile_color
>>> apply_planaco_style("light")          # or "dark"
>>> # then draw plots as usual; they pick up the theme via rcParams

Public API
----------
apply_planaco_style(theme)
    Apply the theme to matplotlib's global rcParams. Returns the resolved
    color dict for the chosen theme.
PALETTE
    Brand colors that do not change between themes.
PERCENTILE_COLORS, percentile_color(p)
    Colors for P50 / P85 / P95 markers (gold / amber / coral).
mode_bar_colors(counts, theme)
    Per-bar colors for a histogram, highlighting the tallest (modal) bar in gold.
CRITICALITY_CMAP
    Colormap for critical-path frequency (slate -> gold -> coral).
"""

from typing import Dict, List, Sequence

import matplotlib as mpl
from matplotlib.colors import LinearSegmentedColormap

# ---------------------------------------------------------------------------
# Brand constants (theme-independent)
# ---------------------------------------------------------------------------

#: Theme-independent brand colors. See brand/STYLE_GUIDE.md section 2.
PALETTE: Dict[str, str] = {
    "navy": "#0c2a52",
    "paper": "#f0f6fc",
    "canvas_dark": "#0a1628",
    "gold": "#e6b94d",  # gold on light surfaces
    "gold_bright": "#f5d97a",  # gold on dark surfaces
    "amber": "#d99a2e",
    "coral": "#d96b4f",
    "teal": "#2a9d9d",
}

#: Marker colors for percentiles. Risk warms from gold -> amber -> coral.
PERCENTILE_COLORS: Dict[int, str] = {
    50: "#e6b94d",  # gold
    85: "#f0b44d",  # amber
    95: "#f0846b",  # coral
}

#: Color stops for the critical-path frequency gradient (low -> high):
#: cool slate -> brand gold -> hot coral. Shared by the matplotlib colormap
#: and the SVG renderer so both stay in sync.
CRITICALITY_STOPS: List[str] = ["#3a5a8c", "#e6b94d", "#f0846b"]

#: Critical-path frequency gradient: low (cool slate) -> high (hot coral),
#: with the brand gold in the middle. Replaces the generic green -> red ramp.
CRITICALITY_CMAP: LinearSegmentedColormap = LinearSegmentedColormap.from_list(
    "planaco_criticality", CRITICALITY_STOPS
)

# Per-theme color tokens. Mirrors the CSS custom properties in website/index.html.
_THEMES: Dict[str, Dict[str, str]] = {
    "light": {
        "bg": "#f0f6fc",
        "fg": "#0c2a52",
        "muted": "#4f6a8a",
        "grid": "#d5e1f0",
        "axis": "#b9c8da",
        "bar": "#2a4a7c",
        "bar_edge": "#1c3a66",
        "gold": "#e6b94d",
    },
    "dark": {
        "bg": "#0a1628",
        "fg": "#f0f6fc",
        "muted": "#9fb3c8",
        "grid": "#1b2c49",
        "axis": "#33425f",
        "bar": "#3a5a8c",
        "bar_edge": "#5d82bb",
        "gold": "#f5d97a",
    },
}

#: Font fallback chain. Brand fonts first, DejaVu Sans (always present) last so
#: plots render without warnings on machines lacking Inter / Space Grotesk.
_FONT_STACK: List[str] = [
    "Inter",
    "Space Grotesk",
    "Helvetica Neue",
    "Arial",
    "DejaVu Sans",
]


def theme_colors(theme: str = "light") -> Dict[str, str]:
    """Return the resolved color token dict for a theme.

    Parameters
    ----------
    theme : str
        Either ``"light"`` or ``"dark"``.

    Returns
    -------
    Dict[str, str]
        Color tokens (``bg``, ``fg``, ``muted``, ``grid``, ``bar``,
        ``bar_edge``, ``gold``).

    Raises
    ------
    ValueError
        If ``theme`` is not a known theme name.
    """
    if theme not in _THEMES:
        raise ValueError(
            f"Unknown theme '{theme}'. Valid options: {list(_THEMES.keys())}"
        )
    # Return a copy so callers can't mutate the module-level token table.
    return dict(_THEMES[theme])


def apply_planaco_style(theme: str = "light") -> Dict[str, str]:
    """Apply the Planaco theme to matplotlib's global rcParams.

    Call this once before drawing plots. It restyles backgrounds, spines, grid,
    fonts, and the default color cycle to match the brand.

    Parameters
    ----------
    theme : str
        Either ``"light"`` (default) or ``"dark"``.

    Returns
    -------
    Dict[str, str]
        The resolved color tokens for the chosen theme, so callers can reuse
        them (e.g. to color a mode bar or a percentile line).

    Raises
    ------
    ValueError
        If ``theme`` is not a known theme name.

    Examples
    --------
    >>> from planaco.style import apply_planaco_style
    >>> colors = apply_planaco_style("dark")
    >>> colors["gold"]
    '#f5d97a'
    """
    c = theme_colors(theme)

    mpl.rcParams.update(
        {
            # Surfaces
            "figure.facecolor": c["bg"],
            "axes.facecolor": c["bg"],
            "savefig.facecolor": c["bg"],
            "savefig.edgecolor": c["bg"],
            # Spines / frame
            "axes.edgecolor": c["grid"],
            "axes.linewidth": 1.0,
            "axes.spines.top": False,
            "axes.spines.right": False,
            # Text
            "text.color": c["fg"],
            "axes.labelcolor": c["fg"],
            "axes.titlecolor": c["fg"],
            "axes.titlesize": 14,
            "axes.titleweight": "bold",
            "axes.labelsize": 12,
            "xtick.color": c["muted"],
            "ytick.color": c["muted"],
            "xtick.labelcolor": c["muted"],
            "ytick.labelcolor": c["muted"],
            # Grid: horizontal only, low contrast
            "axes.grid": True,
            "axes.grid.axis": "y",
            "grid.color": c["grid"],
            "grid.linewidth": 0.8,
            "grid.alpha": 1.0,
            # Bars / patches
            "patch.edgecolor": c["bar_edge"],
            "patch.force_edgecolor": True,
            # Fonts
            "font.family": "sans-serif",
            "font.sans-serif": _FONT_STACK,
            "font.size": 11,
            # Figure
            "figure.figsize": (10, 6),
            "figure.dpi": 110,
            # Default categorical cycle: bar, teal, amber, coral, gold
            # mpl.cycler is re-exported at runtime but absent from the stubs.
            "axes.prop_cycle": mpl.cycler(  # type: ignore[attr-defined]
                color=[
                    c["bar"],
                    PALETTE["teal"],
                    PALETTE["amber"],
                    PALETTE["coral"],
                    c["gold"],
                ]
            ),
        }
    )
    return c


def percentile_color(p: int) -> str:
    """Return the marker color for a percentile.

    Known percentiles (50, 85, 95) get their semantic color; anything else
    falls back to coral, treating it as a high-risk marker.

    Parameters
    ----------
    p : int
        Percentile value, e.g. ``85``.

    Returns
    -------
    str
        Hex color string.

    Examples
    --------
    >>> percentile_color(50)
    '#e6b94d'
    >>> percentile_color(99)  # unknown -> risk color
    '#f0846b'
    """
    return PERCENTILE_COLORS.get(p, PALETTE["coral"])


def mode_bar_colors(counts: Sequence[float], theme: str = "light") -> List[str]:
    """Return per-bar colors for a histogram, highlighting the modal bar.

    The single tallest bar (the mode) is colored gold to echo the logo; all
    other bars use the theme's navy/slate bar color.

    Parameters
    ----------
    counts : Sequence[float]
        Bar heights, e.g. the counts returned by ``numpy.histogram`` or
        matplotlib's ``hist``.
    theme : str
        Either ``"light"`` (default) or ``"dark"``.

    Returns
    -------
    List[str]
        One hex color per bar.

    Raises
    ------
    ValueError
        If ``theme`` is not a known theme name.

    Examples
    --------
    >>> mode_bar_colors([1, 5, 2], theme="light")
    ['#2a4a7c', '#e6b94d', '#2a4a7c']
    """
    c = theme_colors(theme)
    counts = list(counts)
    if not counts:
        return []
    peak = max(range(len(counts)), key=lambda i: counts[i])
    return [c["gold"] if i == peak else c["bar"] for i in range(len(counts))]
