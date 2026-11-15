/* Monte Carlo engine for the landing-page demo.
   Fixed DAG mirroring the library semantics:
   design -> (frontend || backend) -> testing.
   UMD-lite: window.PlanacoMC in browsers, module.exports under node. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PlanacoMC = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function sampleTriangular(min, mode, max, u) {
    if (max <= min) return min;
    var fc = (mode - min) / (max - min);
    if (u < fc) return min + Math.sqrt(u * (max - min) * (mode - min));
    return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
  }

  function simulate(tasks, n, rand) {
    rand = rand || Math.random;
    var d = tasks.design, f = tasks.frontend, b = tasks.backend, t = tasks.testing;
    var out = new Float64Array(n);
    for (var i = 0; i < n; i++) {
      var td = sampleTriangular(d[0], d[1], d[2], rand());
      var tf = sampleTriangular(f[0], f[1], f[2], rand());
      var tb = sampleTriangular(b[0], b[1], b[2], rand());
      var tt = sampleTriangular(t[0], t[1], t[2], rand());
      out[i] = td + Math.max(tf, tb) + tt;
    }
    return out;
  }

  /* Seeded PRNG (mulberry32): returns () => number in [0, 1).
     The page uses one fixed seed so dragging a slider morphs the histogram
     smoothly and static fallback numbers match what the script computes. */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Same sampling order and arithmetic as simulate(), plus per-task
     criticality counts (runs in which each task was on the critical path).

     Tie rule mirrors planaco's Project._get_critical_tasks_for_run
     (src/planaco/project.py): CPM forward/backward pass, and a task is
     critical iff abs(slack) < 1e-9. On this DAG, slack(frontend) =
     max(tf, tb) - tf and slack(backend) = max(tf, tb) - tb, so when frontend
     and backend durations are equal (within 1e-9) in a run, BOTH are counted
     critical for that run; frontend + backend counts can therefore exceed n.
     Design and testing have zero slack in every run. */
  var CRIT_TOL = 1e-9;

  function simulateDetailed(tasks, n, rand) {
    rand = rand || Math.random;
    var d = tasks.design, f = tasks.frontend, b = tasks.backend, t = tasks.testing;
    var out = new Float64Array(n);
    var cf = 0, cb = 0;
    for (var i = 0; i < n; i++) {
      var td = sampleTriangular(d[0], d[1], d[2], rand());
      var tf = sampleTriangular(f[0], f[1], f[2], rand());
      var tb = sampleTriangular(b[0], b[1], b[2], rand());
      var tt = sampleTriangular(t[0], t[1], t[2], rand());
      var m = Math.max(tf, tb);
      out[i] = td + m + tt;
      if (Math.abs(m - tf) < CRIT_TOL) cf++;
      if (Math.abs(m - tb) < CRIT_TOL) cb++;
    }
    return { samples: out,
             critical: { design: n, frontend: cf, backend: cb, testing: n } };
  }

  /* The "add up the most-likely numbers" plan along the longest branch. */
  function naiveEstimate(tasks) {
    return tasks.design[1] + Math.max(tasks.frontend[1], tasks.backend[1]) +
           tasks.testing[1];
  }

  /* Fraction (0..1) of an ascending-sorted sample array that is <= x.
     Binary search for the first index whose value exceeds x. */
  function chanceBy(sorted, x) {
    var len = sorted.length;
    if (!len) return 0;
    var lo = 0, hi = len;
    while (lo < hi) {
      var mid = (lo + hi) >>> 1;
      if (sorted[mid] <= x) lo = mid + 1;
      else hi = mid;
    }
    return lo / len;
  }

  function percentile(sorted, p) {
    var idx = (sorted.length - 1) * p;
    var lo = Math.floor(idx), hi = Math.ceil(idx);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  }

  function summarize(samples, bins) {
    var s = Float64Array.from(samples).sort();
    var min = s[0], max = s[s.length - 1];
    var w = (max - min) / bins || 1;
    var counts = new Array(bins).fill(0);
    for (var i = 0; i < s.length; i++) {
      var k = Math.floor((s[i] - min) / w);
      if (k >= bins) k = bins - 1;
      counts[k]++;
    }
    var modeIndex = 0;
    for (var j = 1; j < bins; j++) if (counts[j] > counts[modeIndex]) modeIndex = j;
    return {
      min: min, max: max, binWidth: w, counts: counts, modeIndex: modeIndex,
      p50: percentile(s, 0.50), p85: percentile(s, 0.85), p95: percentile(s, 0.95),
      sorted: s,
    };
  }

  function clampTriple(t, which) {
    var r = t.slice();
    if (which === 0) {
      if (r[1] < r[0]) r[1] = r[0];
      if (r[2] < r[1]) r[2] = r[1];
    } else if (which === 2) {
      if (r[1] > r[2]) r[1] = r[2];
      if (r[0] > r[1]) r[0] = r[1];
    } else {
      if (r[0] > r[1]) r[0] = r[1];
      if (r[2] < r[1]) r[2] = r[1];
    }
    return r;
  }

  return { sampleTriangular: sampleTriangular, simulate: simulate,
           percentile: percentile, summarize: summarize, clampTriple: clampTriple,
           mulberry32: mulberry32, simulateDetailed: simulateDetailed,
           naiveEstimate: naiveEstimate, chanceBy: chanceBy };
});
