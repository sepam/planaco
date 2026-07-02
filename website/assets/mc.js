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
           percentile: percentile, summarize: summarize, clampTriple: clampTriple };
});
