"""Tests for the planaco.style design tokens."""

import re

import pytest

from planaco import style

HEX_RE = re.compile(r"^#[0-9a-fA-F]{6}$")


# --------------------------------------------------------------------------- #
# Constants
# --------------------------------------------------------------------------- #
def test_palette_values_are_hex():
    assert all(HEX_RE.match(v) for v in style.PALETTE.values())


def test_percentile_colors_are_hex():
    assert all(HEX_RE.match(v) for v in style.PERCENTILE_COLORS.values())
    assert set(style.PERCENTILE_COLORS) == {50, 85, 95}


def test_criticality_stops_are_hex():
    # slate -> gold -> coral, low -> high.
    assert all(HEX_RE.match(v) for v in style.CRITICALITY_STOPS)
    assert len(style.CRITICALITY_STOPS) == 3
    assert style.CRITICALITY_STOPS[0] != style.CRITICALITY_STOPS[-1]


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
# percentile_color
# --------------------------------------------------------------------------- #
def test_percentile_color_known():
    assert style.percentile_color(50) == "#e6b94d"
    assert style.percentile_color(85) == "#f0b44d"
    assert style.percentile_color(95) == "#f0846b"


def test_percentile_color_unknown_falls_back_to_coral():
    assert style.percentile_color(99) == style.PALETTE["coral"]
