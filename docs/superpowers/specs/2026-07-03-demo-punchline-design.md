# Demo Punchline — Design Spec

- **Date:** 2026-07-03
- **Status:** Approved (user picked Variant 2 from rendered mockups)
- **Context:** Follow-up to `2026-07-02-planaco-website-design.md`. The live demo's
  P50/P85/P95 stat tiles assume the visitor knows what percentiles are. Non-technical
  visitors need the outcome translated into "how long does this project actually take?"

## Decision

Variant 2 of three rendered drafts: **plain-language tiles**. The human meaning becomes
each tile's headline, the percentile becomes a small tag, and the unit follows the
number. No separate verdict sentence — the tiles are the punchline.

Tile structure (top to bottom), colors unchanged (gold/amber/coral numbers):

| Headline (Inter 600, text color) | Number (mono, big) + unit (small, muted) | Tag (mono, muted) |
|---|---|---|
| A coin flip | ⌈P50⌉ `days` | P50 |
| Safe to promise | ⌈P85⌉ `days` | P85 |
| Near-certain | ⌈P95⌉ `days` | P95 |

- **Whole days** (`Math.ceil`), because each tile reads as a commitment — you can't
  promise 32.7 days. The histogram keeps its continuous axis; only the tiles round.
- Rejected alternatives: a verdict sentence under percentile-first tiles (keeps jargon
  as the headline), and an answer-first headline with percentile chips (biggest layout
  change; hides the three-number comparison).

## Implementation

- `website/index.html`: each `.stat` becomes
  `<span class="k">A coin flip</span><span class="v mono"><span id="statP50">—</span><span class="unit">days</span></span><span class="ptag">P50</span>`
  (same for P85/P95 with their headlines). The `aria-live="polite"` container and
  `.demo-hint` line are unchanged.
- `website/assets/style.css`: `.demo-stats .k` switches from mono-muted to
  Inter 13px/600 in `var(--text)`; new `.demo-stats .unit` (13px/500, muted, 4px gap)
  and `.demo-stats .ptag` (block, mono 11px, muted, 6px top margin). Tokens only.
- `website/assets/site.js` (`runDemo()`): tile values become
  `String(Math.ceil(s.p50))` etc.
- No engine change; no new unit tests. Verify in-browser: tiles show ceiled whole
  days with trailing unit, update on drag, re-theme on toggle, contrast unchanged
  (muted/text tokens only).
