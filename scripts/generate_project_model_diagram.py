"""Regenerate the README "Build Projects with Dependencies" diagram.

Produces ``example/project_task_model_{light,dark}.svg``, a hand-designed
explainer diagram that mirrors the README's "Web App Development" code block
exactly: five tasks, parallel + sequential dependencies, and each task's
min / most-likely / max duration range drawn as a mini distribution glyph
(gold marks the mode, per ``brand/STYLE_GUIDE.md``).

Unlike the plots from ``generate_example_plots.py`` this is not library
output — it is a brand illustration, kept as a script so it can be edited
and regenerated reproducibly.

Usage (from the repo root)::

    python scripts/generate_project_model_diagram.py
"""

W, H = 1120, 484
CARD_W, CARD_H = 210, 124

DISPLAY = "'Space Grotesk', Inter, 'Helvetica Neue', Arial, sans-serif"
BODY = "Inter, 'Helvetica Neue', Arial, sans-serif"
MONO = "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace"

THEMES = {
    "light": dict(
        bg="#f0f6fc", surface="#ffffff", card_stroke="#d5e1f0",
        fg="#0c2a52", muted="#4f6a8a", axis="#b9c8da",
        glyph_fill="#2a4a7c", glyph_fill_op="0.15", glyph_stroke="#2a4a7c",
        gold="#e6b94d", edge="#4f6a8a",
    ),
    "dark": dict(
        bg="#0a1628", surface="#0f2038", card_stroke="#1b2c49",
        fg="#f0f6fc", muted="#9fb3c8", axis="#33425f",
        glyph_fill="#3a5a8c", glyph_fill_op="0.30", glyph_stroke="#5d82bb",
        gold="#f5d97a", edge="#9fb3c8",
    ),
}

# name, estimator, min, mode (None = uniform), max, (card x, card y)
TASKS = [
    ("Design UI", "triangular", 2, 3, 5, (48, 112)),
    ("Develop Frontend", "triangular", 5, 7, 10, (318, 112)),
    ("Develop Backend", "triangular", 4, 6, 9, (48, 280)),
    ("Testing", "triangular", 2, 3, 5, (588, 196)),
    ("Deploy", "uniform", 1, None, 2, (858, 196)),
]

# (x1, y1, x2, y2, straight?)  — right-edge center -> left-edge center
EDGES = [
    (258, 174, 318, 174, True),    # Design UI -> Develop Frontend
    (528, 174, 588, 258, False),   # Develop Frontend -> Testing
    (258, 342, 588, 258, False),   # Develop Backend -> Testing
    (798, 258, 858, 258, True),    # Testing -> Deploy
]


def fmt(v):
    return f"{v:g}"


def card(t, name, est, lo, mode, hi, x, y):
    s = []
    cx = x + CARD_W / 2
    s.append(
        f'<rect x="{x}" y="{y}" width="{CARD_W}" height="{CARD_H}" rx="14" '
        f'fill="{t["surface"]}" stroke="{t["card_stroke"]}" stroke-width="1.5"/>'
    )
    s.append(
        f'<text x="{cx}" y="{y+32}" fill="{t["fg"]}" font-size="15" font-weight="600" '
        f'text-anchor="middle" font-family="{DISPLAY}">{name}</text>'
    )
    s.append(
        f'<text x="{cx}" y="{y+50}" fill="{t["muted"]}" font-size="10" letter-spacing="2" '
        f'text-anchor="middle" font-family="{MONO}">{est.upper()}</text>'
    )
    # duration-range glyph
    gx0, gx1 = x + 25, x + 185
    base, top = y + 96, y + 68
    s.append(
        f'<line x1="{gx0-5}" y1="{base}" x2="{gx1+5}" y2="{base}" '
        f'stroke="{t["axis"]}" stroke-width="1"/>'
    )
    if mode is not None:
        xm = gx0 + (gx1 - gx0) * (mode - lo) / (hi - lo)
        s.append(
            f'<polygon points="{gx0},{base} {xm:.1f},{top} {gx1},{base}" '
            f'fill="{t["glyph_fill"]}" fill-opacity="{t["glyph_fill_op"]}" '
            f'stroke="{t["glyph_stroke"]}" stroke-width="1.5" stroke-linejoin="round"/>'
        )
        s.append(
            f'<line x1="{xm:.1f}" y1="{base}" x2="{xm:.1f}" y2="{top}" '
            f'stroke="{t["gold"]}" stroke-width="2.5"/>'
        )
        nums = [(gx0, fmt(lo), t["muted"], "400"),
                (xm, fmt(mode), t["fg"], "700"),
                (gx1, fmt(hi), t["muted"], "400")]
    else:
        s.append(
            f'<rect x="{gx0}" y="{base-18}" width="{gx1-gx0}" height="18" '
            f'fill="{t["glyph_fill"]}" fill-opacity="{t["glyph_fill_op"]}" '
            f'stroke="{t["glyph_stroke"]}" stroke-width="1.5" stroke-linejoin="round"/>'
        )
        nums = [(gx0, fmt(lo), t["muted"], "400"), (gx1, fmt(hi), t["muted"], "400")]
    for nx, label, color, weight in nums:
        s.append(
            f'<text x="{nx:.1f}" y="{y+114}" fill="{color}" font-size="12" '
            f'font-weight="{weight}" text-anchor="middle" font-family="{MONO}">{label}</text>'
        )
    return "\n".join(s)


def render(theme):
    t = THEMES[theme]
    s = []
    s.append(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
        f'width="{W}" height="{H}" font-family="{BODY}">'
    )
    s.append(f'<rect width="{W}" height="{H}" fill="{t["bg"]}"/>')
    s.append(
        f'<defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" '
        f'markerHeight="6" orient="auto-start-reverse">'
        f'<path d="M0 0 L10 5 L0 10 z" fill="{t["edge"]}"/></marker></defs>'
    )
    # title + subtitle
    s.append(
        f'<text x="48" y="54" fill="{t["fg"]}" font-size="24" font-weight="700" '
        f'letter-spacing="-0.5" font-family="{DISPLAY}">Web App Development</text>'
    )
    s.append(
        f'<text x="48" y="80" fill="{t["muted"]}" font-size="14">'
        f'Every task is a duration range, not a fixed number. '
        f'Arrows are dependencies &#8212; tasks without one run in parallel.</text>'
    )
    # edges
    for x1, y1, x2, y2, straight in EDGES:
        if straight:
            d = f"M {x1} {y1} L {x2-2} {y2}"
        else:
            mx = (x1 + x2) / 2
            d = f"M {x1} {y1} C {mx} {y1}, {mx} {y2}, {x2-2} {y2}"
        s.append(
            f'<path d="{d}" fill="none" stroke="{t["edge"]}" stroke-width="1.5" '
            f'opacity="0.7" marker-end="url(#arr)"/>'
        )
    # cards
    for name, est, lo, mode, hi, (x, y) in TASKS:
        s.append(card(t, name, est, lo, mode, hi, x, y))
    # annotations
    s.append(
        f'<text x="153" y="272" fill="{t["muted"]}" font-size="12" font-style="italic" '
        f'text-anchor="middle">runs in parallel &#8212; no dependency</text>'
    )
    s.append(
        f'<text x="693" y="188" fill="{t["muted"]}" font-size="12" font-style="italic" '
        f'text-anchor="middle">waits for both tracks</text>'
    )
    # legend
    ly = 448  # text baseline
    # item 1: triangular sample
    s.append(
        f'<polygon points="200,{ly+4} 216,{ly-10} 240,{ly+4}" fill="{t["glyph_fill"]}" '
        f'fill-opacity="{t["glyph_fill_op"]}" stroke="{t["glyph_stroke"]}" '
        f'stroke-width="1.2" stroke-linejoin="round"/>'
    )
    s.append(
        f'<line x1="216" y1="{ly+4}" x2="216" y2="{ly-10}" stroke="{t["gold"]}" '
        f'stroke-width="2"/>'
    )
    s.append(
        f'<text x="252" y="{ly}" fill="{t["muted"]}" font-size="12">'
        f'min &#183; most likely (gold) &#183; max, in days</text>'
    )
    # item 2: uniform sample
    s.append(
        f'<rect x="530" y="{ly-9}" width="40" height="13" fill="{t["glyph_fill"]}" '
        f'fill-opacity="{t["glyph_fill_op"]}" stroke="{t["glyph_stroke"]}" stroke-width="1.2"/>'
    )
    s.append(
        f'<text x="582" y="{ly}" fill="{t["muted"]}" font-size="12">'
        f'flat = uniform (any value equally likely)</text>'
    )
    # item 3: dependency arrow sample
    s.append(
        f'<path d="M 850 {ly-4} L 886 {ly-4}" stroke="{t["edge"]}" stroke-width="1.5" '
        f'opacity="0.7" marker-end="url(#arr)"/>'
    )
    s.append(f'<text x="898" y="{ly}" fill="{t["muted"]}" font-size="12">depends on</text>')
    s.append("</svg>")
    return "\n".join(s) + "\n"


if __name__ == "__main__":
    from pathlib import Path

    out_dir = Path(__file__).resolve().parent.parent / "example"
    for theme in ("light", "dark"):
        path = out_dir / f"project_task_model_{theme}.svg"
        path.write_text(render(theme))
        print("wrote", path)
