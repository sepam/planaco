"""Tests for the planaco.style brand theming module."""

import re

import matplotlib as mpl
import pytest
from matplotlib.colors import LinearSegmentedColormap

from planaco import style

HEX_RE = re.compile(r"^#[0-9a-fA-F]{6}$")


@pytest.fixture(autouse=True)
def _restore_rcparams():
    """Snapshot and restore global rcParams so theming doesn't leak."""
    original = mpl.rcParams.copy()
    yield
    mpl.rcParams.update(original)


# --------------------------------------------------------------------------- #
# Constants
# --------------------------------------------------------------------------- #
def test_palette_values_are_hex():
    assert all(HEX_RE.match(v) for v in style.PALETTE.values())


def test_percentile_colors_are_hex():
    assert all(HEX_RE.match(v) for v in style.PERCENTILE_COLORS.values())
    assert set(style.PERCENTILE_COLORS) == {50, 85, 95}


def test_criticality_cmap_is_colormap():
    assert isinstance(style.CRITICALITY_CMAP, LinearSegmentedColormap)
    # Endpoints: cool slate at 0.0, hot coral at 1.0; both opaque.
    low = style.CRITICALITY_CMAP(0.0)
    high = style.CRITICALITY_CMAP(1.0)
    assert low[3] == 1.0 and high[3] == 1.0
    assert low != high


# --------------------------------------------------------------------------- #
# theme_colors
# --------------------------------------------------------------------------- #
def test_theme_colors_light_and_dark():
    light = style.theme_colors("light")
    dark = style.theme_colors("dark")
    expected_keys = {"bg", "fg", "muted", "grid", "axis", "bar", "bar_edge", "gold"}
    assert set(light) == expected_keys
    assert set(dark) == expected_keys
    # Dark canvas vs light paper differ.
    assert light["bg"] != dark["bg"]
    assert dark["gold"] == "#f5d97a"
    assert light["gold"] == "#e6b94d"


def test_theme_colors_default_is_light():
    assert style.theme_colors() == style.theme_colors("light")


def test_theme_colors_invalid_raises():
    with pytest.raises(ValueError, match="Unknown theme"):
        style.theme_colors("solarized")


def test_theme_colors_returns_copy():
    colors = style.theme_colors("light")
    colors["bg"] = "#000000"
    # Mutating the returned dict must not corrupt the module table.
    assert style.theme_colors("light")["bg"] != "#000000"


# --------------------------------------------------------------------------- #
# apply_planaco_style
# --------------------------------------------------------------------------- #
@pytest.mark.parametrize("theme", ["light", "dark"])
def test_apply_planaco_style_sets_rcparams(theme):
    colors = style.apply_planaco_style(theme)
    assert mpl.rcParams["axes.facecolor"] == colors["bg"]
    assert mpl.rcParams["figure.facecolor"] == colors["bg"]
    assert mpl.rcParams["axes.spines.top"] is False
    assert mpl.rcParams["axes.spines.right"] is False
    assert mpl.rcParams["font.family"] == ["sans-serif"]
    assert mpl.rcParams["font.sans-serif"][0] == "Inter"
    # First color in the cycle is the navy/slate bar color.
    cycle_colors = mpl.rcParams["axes.prop_cycle"].by_key()["color"]
    assert cycle_colors[0] == colors["bar"]


def test_apply_planaco_style_returns_colors():
    colors = style.apply_planaco_style("dark")
    assert colors == style.theme_colors("dark")


def test_apply_planaco_style_invalid_raises():
    with pytest.raises(ValueError, match="Unknown theme"):
        style.apply_planaco_style("neon")


# --------------------------------------------------------------------------- #
# percentile_color
# --------------------------------------------------------------------------- #
def test_percentile_color_known():
    assert style.percentile_color(50) == "#e6b94d"
    assert style.percentile_color(85) == "#f0b44d"
    assert style.percentile_color(95) == "#f0846b"


def test_percentile_color_unknown_falls_back_to_coral():
    assert style.percentile_color(99) == style.PALETTE["coral"]


# --------------------------------------------------------------------------- #
# mode_bar_colors
# --------------------------------------------------------------------------- #
def test_mode_bar_colors_highlights_tallest():
    colors = style.mode_bar_colors([1, 5, 2], theme="light")
    light = style.theme_colors("light")
    assert colors == [light["bar"], light["gold"], light["bar"]]


def test_mode_bar_colors_dark_theme():
    colors = style.mode_bar_colors([3, 1], theme="dark")
    dark = style.theme_colors("dark")
    assert colors == [dark["gold"], dark["bar"]]


def test_mode_bar_colors_empty():
    assert style.mode_bar_colors([]) == []


def test_mode_bar_colors_invalid_theme_raises():
    with pytest.raises(ValueError, match="Unknown theme"):
        style.mode_bar_colors([1, 2, 3], theme="nope")
