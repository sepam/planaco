"""Tests for the planaco.charts SVG renderer."""

import numpy as np
import pytest

from planaco import charts


@pytest.fixture
def sims():
    """A reproducible right-skewed sample spanning ~10 units."""
    rng = np.random.default_rng(42)
    return (rng.gamma(shape=4.0, scale=2.0, size=2000) + 8.0).tolist()


# --------------------------------------------------------------------------- #
# Color helpers
# --------------------------------------------------------------------------- #
def test_interpolate_stops_endpoints():
    stops = ["#000000", "#ffffff"]
    assert charts.interpolate_stops(stops, 0.0) == "#000000"
    assert charts.interpolate_stops(stops, 1.0) == "#ffffff"


def test_interpolate_stops_midpoint():
    # Halfway between black and white is mid-grey.
    assert charts.interpolate_stops(["#000000", "#ffffff"], 0.5) == "#808080"


def test_interpolate_stops_clamps_out_of_range():
    stops = ["#000000", "#ffffff"]
    assert charts.interpolate_stops(stops, -1.0) == "#000000"
    assert charts.interpolate_stops(stops, 5.0) == "#ffffff"


def test_interpolate_stops_three_stops():
    stops = ["#000000", "#ff0000", "#ffffff"]
    # t=0.5 lands exactly on the middle stop.
    assert charts.interpolate_stops(stops, 0.5) == "#ff0000"


# --------------------------------------------------------------------------- #
# Chart wrapper
# --------------------------------------------------------------------------- #
def test_chart_str_and_repr():
    chart = charts.Chart("<svg></svg>")
    assert str(chart) == "<svg></svg>"
    assert chart._repr_svg_() == "<svg></svg>"


def test_chart_save_svg(tmp_path):
    chart = charts.Chart("<svg>hi</svg>")
    out = tmp_path / "c.svg"
    chart.save(str(out))
    assert out.read_text() == "<svg>hi</svg>"


def test_chart_save_other_extension_writes_svg(tmp_path):
    chart = charts.Chart("<svg>hi</svg>")
    out = tmp_path / "c.txt"
    chart.save(str(out))
    assert out.read_text() == "<svg>hi</svg>"


def test_chart_save_png(tmp_path):
    # A minimal valid SVG so cairosvg can rasterize it.
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20">'
        '<rect width="20" height="20" fill="#0c2a52"/></svg>'
    )
    out = tmp_path / "c.png"
    charts.Chart(svg).save(str(out))
    assert out.exists()
    assert out.read_bytes()[:8] == b"\x89PNG\r\n\x1a\n"


def test_esc_escapes_markup():
    assert charts._esc("a & b <c>") == "a &amp; b &lt;c&gt;"


# --------------------------------------------------------------------------- #
# Histogram
# --------------------------------------------------------------------------- #
def test_histogram_basic(sims):
    chart = charts.histogram(sims, unit="days", n=2000)
    svg = str(chart)
    assert svg.startswith("<svg")
    assert svg.rstrip().endswith("</svg>")
    assert "<rect" in svg
    assert "P50" in svg  # default median marker


def test_histogram_with_percentiles(sims):
    svg = str(charts.histogram(sims, show_percentiles=True, percentiles=[50, 85, 95]))
    assert "P50" in svg and "P85" in svg and "P95" in svg


def test_histogram_with_kde(sims):
    svg = str(charts.histogram(sims, kde=True))
    assert "<polyline" in svg  # KDE overlay drawn as a polyline


def test_histogram_dark_theme(sims):
    svg = str(charts.histogram(sims, theme="dark"))
    # Dark canvas background.
    assert "#0a1628" in svg


def test_histogram_default_n_uses_length(sims):
    svg = str(charts.histogram(sims))
    assert f"n = {len(sims):,}" in svg


def test_histogram_custom_title(sims):
    svg = str(charts.histogram(sims, title="Task 1 estimate distribution"))
    assert "Task 1 estimate distribution" in svg
    assert "to project completion" not in svg


def test_histogram_degenerate_single_value():
    # All identical samples -> single bin, no span; must not crash.
    svg = str(charts.histogram([5.0] * 50, kde=True))
    assert "<svg" in svg


# --------------------------------------------------------------------------- #
# CDF
# --------------------------------------------------------------------------- #
def test_cdf_basic(sims):
    svg = str(charts.cdf(sims, unit="weeks", n=2000))
    assert svg.startswith("<svg")
    assert "<polygon" in svg  # filled area
    assert "<polyline" in svg  # the curve
    assert "P85" in svg
    assert "weeks" in svg


def test_cdf_dark_theme(sims):
    assert "#0a1628" in str(charts.cdf(sims, theme="dark"))


# --------------------------------------------------------------------------- #
# Dependency graph
# --------------------------------------------------------------------------- #
def _diamond():
    order = ["a", "b", "c", "d"]
    labels = {"a": "Design", "b": "Frontend", "c": "Backend", "d": "Deploy"}
    durations = {"a": "(1-2-3)", "b": "(2-3-5)", "c": "(2-4-6)", "d": "(1-1-2)"}
    deps = {"a": [], "b": ["a"], "c": ["a"], "d": ["b", "c"]}
    return order, labels, durations, deps


def test_dependency_graph_structural():
    order, labels, durations, deps = _diamond()
    svg = str(charts.dependency_graph(order, labels, durations, deps, title="DAG"))
    assert "<svg" in svg
    assert "Design" in svg and "Deploy" in svg
    assert "DAG" in svg
    assert "<marker" in svg  # arrowheads


def test_dependency_graph_no_title_no_durations():
    order, labels, _, deps = _diamond()
    # Empty durations dict -> single-line labels, no title.
    svg = str(charts.dependency_graph(order, labels, {}, deps))
    assert "<svg" in svg
    assert "Frontend" in svg


def test_dependency_graph_criticality():
    order, labels, durations, deps = _diamond()
    crit = {"a": 1.0, "b": 0.2, "c": 1.0, "d": 1.0}
    svg = str(charts.dependency_graph(order, labels, durations, deps, criticality=crit))
    assert "<svg" in svg
    # A fully-critical chain a->c->d should draw at least one gold critical edge.
    assert "arr-crit" in svg


def test_dependency_graph_dark_theme():
    order, labels, durations, deps = _diamond()
    svg = str(charts.dependency_graph(order, labels, durations, deps, theme="dark"))
    assert "#0a1628" in svg


def test_dependency_graph_single_node():
    svg = str(charts.dependency_graph(["a"], {"a": "Only"}, {}, {"a": []}))
    assert "Only" in svg
