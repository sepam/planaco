"""On-brand design tokens for Planaco's SVG charts.

This module holds the Planaco brand system as plain data: the color palette,
per-theme tokens, percentile marker colors, and the critical-path gradient
stops. The SVG renderer in :mod:`planaco.charts` consumes these so the charts,
the documentation, and ``website/index.html`` all stay in sync.

The brand motif is a histogram whose modal (most likely) bar is gold. Every
chart echoes it: navy/slate distribution bars, a gold mode bar, and percentile
markers that warm from gold to coral as risk climbs.

See ``brand/STYLE_GUIDE.md`` for the full design system and ``website/index.html``
for a live reference.

Public API
----------
PALETTE
    Brand colors that do not change between themes.
theme_colors(theme)
    Resolved per-theme color tokens (``"light"`` / ``"dark"``).
PERCENTILE_COLORS, percentile_color(p)
    Colors for P50 / P85 / P95 markers (gold / amber / coral).
CRITICALITY_STOPS
    Color stops for the critical-path frequency gradient (slate -> gold -> coral).
"""

from typing import Dict, List

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
#: cool slate -> brand gold -> hot coral. Consumed by the SVG renderer.
CRITICALITY_STOPS: List[str] = ["#3a5a8c", "#e6b94d", "#f0846b"]

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


def theme_colors(theme: str = "light") -> Dict[str, str]:
    """Return the resolved color token dict for a theme.

    Parameters
    ----------
    theme : str
        Either ``"light"`` or ``"dark"``.

    Returns
    -------
    Dict[str, str]
        Color tokens (``bg``, ``fg``, ``muted``, ``grid``, ``axis``, ``bar``,
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
