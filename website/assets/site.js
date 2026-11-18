/* planaco landing page. Vanilla, no dependencies, no build step.
   One simulator drives the headline, the chart, the tiles, the plan odds and the criticality rows.
   The pure helpers (compute, texts, histMarkup) also load under node, which is how the static
   chart in index.html was rendered; in a browser the file boots the page.
   Colours and fonts never appear here: the SVG carries classes and style.css paints them. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else if (root && root.document) api.boot(root.document, root);
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var N = 10000, BINS = 26, SEED = 42, STARS_SHOWN_FROM = 50, ANNOUNCE_AFTER_MS = 500;
  var TASKS = [
    { key: "design",   label: "Design" },
    { key: "frontend", label: "Frontend" },
    { key: "backend",  label: "Backend" },
    { key: "testing",  label: "Testing" }
  ];
  var PARAMS = ["min", "mode", "max"];
  var PARAM_WORDS = ["minimum", "most likely", "maximum"];

  /* ---------- pure: the numbers ---------- */

  /* Same recipe as the static values in the markup: seed 42, re-created for every run. */
  function compute(MC, tasks) {
    var det = MC.simulateDetailed(tasks, N, MC.mulberry32(SEED));
    var s = MC.summarize(det.samples, BINS);
    var naive = MC.naiveEstimate(tasks);
    var longer = tasks.frontend[1] > tasks.backend[1] ? "frontend" : "backend";
    var medianIndex = Math.max(0, Math.min(BINS - 1, Math.floor((s.p50 - s.min) / s.binWidth)));
    return {
      n: N, min: s.min, max: s.max, binWidth: s.binWidth, counts: s.counts, medianIndex: medianIndex,
      p50: s.p50, p85: s.p85, p95: s.p95, certain: s.max - s.min < 1e-9,
      naive: naive, chance: MC.chanceBy(s.sorted, naive), longer: longer,
      critical: det.critical, tasks: tasks
    };
  }

  function pctText(frac) {
    var p = frac * 100;
    if (p > 0 && p < 0.5) return "<1%";
    if (p < 100 && p >= 99.5) return ">99%";
    return Math.round(p) + "%";
  }

  function label(key) {
    for (var i = 0; i < TASKS.length; i++) if (TASKS[i].key === key) return TASKS[i].label;
    return key;
  }

  /* Every string the page shows for a result, keyed by its data-out name.
     The median is exact to one decimal: rounding it up would overstate the coin flip.
     P85 and P95 round up, which only makes a promise more conservative. */
  function texts(r) {
    var t = r.tasks, p50 = r.p50.toFixed(1), p85 = String(Math.ceil(r.p85)), p95 = String(Math.ceil(r.p95));
    return {
      p50: p50, p85: p85, p95: p95, naive: String(r.naive), chance: pctText(r.chance),
      verdict: r.certain ? "is certain." : "is a coin flip.",
      half: r.certain ? "Every run took the same." : "Half the runs took longer.",
      flip: r.certain ? "Certain" : "Coin flip",
      sum: "Design " + t.design[1] + " + " + label(r.longer) + " " + t[r.longer][1] + " + Testing " + t.testing[1],
      chart: "Histogram of " + r.n.toLocaleString("en-US") + " simulated runs of the plan, from " +
        Math.floor(r.min) + " to " + Math.ceil(r.max) + " days. " +
        (r.certain ? "Every run takes " + p50 + " days. " : "The median is " + p50 + " days; 85% finish within " + p85 + " and 95% within " + p95 + ". ") +
        "The plan's " + r.naive + " days is met in " + pctText(r.chance) + " of runs.",
      status: (r.certain ? "Every run takes " + p50 + " days. " : "Median " + p50 + " days. ") +
        "The plan's " + r.naive + " days is met in " + pctText(r.chance) + " of runs. Safe to promise " + p85 + " days, near-certain " + p95 + "."
    };
  }

  /* ---------- pure: the chart ---------- */

  function f(x) { return (Math.round(x * 10) / 10).toString(); }

  function tickStep(span, maxTicks) {
    var steps = [1, 2, 5, 10, 20, 50];
    for (var i = 0; i < steps.length; i++) if (span / steps[i] <= maxTicks) return steps[i];
    return 100;
  }

  /* One lane of labels, sorted by x. Each label must keep its mark under it (minC..maxC is the
     range its centre may take) and stay `gap` clear of its neighbours. Returns the centres
     nearest each mark, or null when the lane cannot hold them. */
  function solveLane(items, lo, hi, gap) {
    var n = items.length, L = [], R = [], c = [], i, v;
    for (i = 0; i < n; i++) {
      v = Math.max(items[i].minC, lo + items[i].w / 2);
      if (i) v = Math.max(v, L[i - 1] + (items[i - 1].w + items[i].w) / 2 + gap);
      L.push(v);
    }
    for (i = n - 1; i >= 0; i--) {
      v = Math.min(items[i].maxC, hi - items[i].w / 2);
      if (i < n - 1) v = Math.min(v, R[i + 1] - (items[i].w + items[i + 1].w) / 2 - gap);
      R[i] = v;
    }
    for (i = 0; i < n; i++) if (L[i] > R[i] + 0.01) return null;
    for (i = 0; i < n; i++) {
      v = Math.max(L[i], Math.min(R[i], items[i].x));
      if (i) v = Math.max(v, c[i - 1] + (items[i - 1].w + items[i].w) / 2 + gap);
      c.push(Math.min(v, R[i]));
    }
    return c;
  }

  /* Direct labels above the plot, each straight over its line.
     Marks nearer than 16px share one label and one line. One lane when it fits;
     otherwise the outer labels take the lane by the plot and the inner ones the lane above,
     so a line never has to bend and never runs through another label. */
  function placeLabels(marks, W, scale) {
    var GAP = 10 * scale, EDGE = 2, INSET = 4, CLEAR = 5;
    var sorted = marks.toSorted(function (a, b) { return a.x - b.x || a.order - b.order; });
    var groups = [];
    sorted.forEach(function (m) {
      var g = groups[groups.length - 1];
      if (g && m.x - g.last < 16 && (g.members.length + 1) * 100 * scale < W) { g.members.push(m); g.last = m.x; }
      else groups.push({ members: [m], last: m.x });
    });
    groups.forEach(function (g) {
      var byOrder = g.members.toSorted(function (a, b) { return a.order - b.order; });
      g.text = byOrder.map(function (m) { return m.text; }).join(", ");
      g.plan = byOrder.some(function (m) { return m.kind === "plan"; });
      g.kind = g.plan ? "plan" : (g.members.length === 1 ? g.members[0].kind : "pct");
      g.x = g.members.reduce(function (a, m) { return a + m.x; }, 0) / g.members.length;
      g.w = g.text.length * 7.7 * scale + (g.plan ? 16 : 2);
      g.minC = g.x - g.w / 2 + INSET; g.maxC = g.x + g.w / 2 - INSET;
      g.lane = 0;
    });
    var c = solveLane(groups, EDGE, W - EDGE, GAP);
    if (c) { groups.forEach(function (g, i) { g.cx = c[i]; }); return { groups: groups, lanes: 1 }; }

    var n = groups.length;
    var low = n >= 3 ? [groups[0], groups[n - 1]] : [groups[0]];
    var high = groups.filter(function (g) { return low.indexOf(g) < 0; });
    var lowItems = low.map(function (g) {
      var i = groups.indexOf(g), o = { x: g.x, w: g.w, minC: g.minC, maxC: g.maxC };
      if (i > 0) o.minC = Math.max(o.minC, groups[i - 1].x + CLEAR + g.w / 2);
      if (i < n - 1) o.maxC = Math.min(o.maxC, groups[i + 1].x - CLEAR - g.w / 2);
      return o;
    });
    var cl = solveLane(lowItems, EDGE, W - EDGE, GAP), ch = solveLane(high, EDGE, W - EDGE, GAP);
    if (cl && ch) {
      low.forEach(function (g, i) { g.cx = cl[i]; g.lane = 0; });
      high.forEach(function (g, i) { g.cx = ch[i]; g.lane = 1; });
      return { groups: groups, lanes: 2 };
    }
    // marks crowded against an edge: a lane each. A line runs down through the lanes below its
    // label, so a label only has to stay clear of the lines that start above it. Try the orders.
    var best = null;
    permutations(n).some(function (laneOf) {
      var cx = [];
      for (var i = 0; i < n; i++) {
        var g = groups[i], left = EDGE, right = W - EDGE;
        for (var j = 0; j < n; j++) {
          if (laneOf[j] <= laneOf[i]) continue;
          if (groups[j].x < g.x) left = Math.max(left, groups[j].x + CLEAR);
          else right = Math.min(right, groups[j].x - CLEAR);
        }
        var loC = Math.max(left + g.w / 2, g.minC), hiC = Math.min(right - g.w / 2, g.maxC);
        if (loC > hiC + 0.01) return false;
        cx.push(Math.max(loC, Math.min(hiC, g.x)));
      }
      best = { laneOf: laneOf, cx: cx };
      return true;
    });
    if (best) groups.forEach(function (g, i) { g.cx = best.cx[i]; g.lane = best.laneOf[i]; });
    else groups.forEach(function (g, i) { g.cx = Math.max(EDGE + g.w / 2, Math.min(W - EDGE - g.w / 2, g.x)); g.lane = i; });  // cannot happen while the chart is wider than a label
    return { groups: groups, lanes: n };
  }

  function permutations(n) {
    var out = [];
    (function walk(rest, acc) {
      if (!rest.length) { out.push(acc); return; }
      rest.forEach(function (v, i) { walk(rest.slice(0, i).concat(rest.slice(i + 1)), acc.concat(v)); });
    })(Array.apply(null, { length: n }).map(function (_, i) { return i; }), []);
    return out;
  }

  /* r: a compute() result. W, H: the drawing size in CSS pixels, so type stays true to size.
     The gold bar is the bin that holds the median, the number the headline states. */
  function histMarkup(r, W, H, scale) {
    scale = scale || 1;
    var padX = 14 * scale, base = H - 48 * scale, plotW = W - padX * 2;
    var n = r.counts.length;
    var lo = Math.min(r.min, r.naive), hi = Math.max(r.min + n * r.binWidth, r.naive);
    if (r.certain) { lo = Math.max(0, r.min - 5); hi = lo + 10; }           // one value: a ten-day window around it
    else if (hi - lo < 4) { var mid = (lo + hi) / 2; lo = Math.max(0, mid - 2); hi = lo + 4; }  // never an axis without ticks
    var span = hi - lo;
    function X(v) { return padX + (v - lo) / span * plotW; }
    var bw = r.certain ? 20 : Math.max(1, Math.min(24, r.binWidth / span * plotW * 0.84));
    function barCentre(i) { return r.certain ? X(r.min) : X(r.min + (i + 0.5) * r.binWidth); }
    var t = texts(r), out = [], i;

    // markers, each labelled with its value: the plan (solid, a diamond), the median (a stem down
    // to the gold bar) and P85, P95 (dashed lines). With no spread there is one fact, so one label.
    var mi = r.medianIndex, stemX = Math.max(barCentre(mi) - bw / 2 + 1, Math.min(barCentre(mi) + bw / 2 - 1, X(r.p50)));
    var marks = r.certain
      ? [{ kind: "median", text: "Every run " + t.p50, x: barCentre(mi), order: 0 }]
      : [
        { kind: "plan", text: "Plan " + t.naive, x: X(r.naive), order: 0 },
        { kind: "median", text: "P50 " + t.p50, x: stemX, order: 1 },
        { kind: "pct", text: "P85 " + t.p85, x: X(r.p85), order: 2 },
        { kind: "pct", text: "P95 " + t.p95, x: X(r.p95), order: 3 }
      ];
    var placed = placeLabels(marks, W, scale);

    // the plot starts under the label lanes: one or two lanes fit the usual headroom, more push it down
    var LANE = 18 * scale, topY = (placed.lanes === 1 ? 15 : 13) * scale;
    var plotTop = Math.max(48 * scale, topY + LANE * (placed.lanes - 1) + 17 * scale), plotH = base - plotTop;
    var peak = Math.max.apply(null, r.counts) || 1;
    function barHeight(k) { return r.counts[k] ? Math.max(1, plotH * r.counts[k] / peak) : 0; }

    // bars: baseline at zero, a hair of gap
    for (i = 0; i < n; i++) {
      var bh = barHeight(i);
      if (!bh) continue;
      out.push('<rect class="ch-bar' + (i === mi ? " ch-bar--median" : "") + '" x="' + f(barCentre(i) - bw / 2) + '" y="' + f(base - bh) +
        '" width="' + f(bw) + '" height="' + f(bh) + '"/>');
    }

    // x axis: the baseline, whole-day ticks, the unit
    out.push('<line class="ch-base" x1="' + padX + '" y1="' + f(base) + '" x2="' + f(W - padX) + '" y2="' + f(base) + '"/>');
    var stepDays = tickStep(span, W / scale < 420 ? 5 : 8);
    for (var d = Math.ceil(lo / stepDays - 1e-9) * stepDays; d <= hi + 1e-9; d += stepDays) {
      var tx = X(d);
      out.push('<line class="ch-base" x1="' + f(tx) + '" y1="' + f(base) + '" x2="' + f(tx) + '" y2="' + f(base + 5) + '"/>');
      out.push('<text class="ch-tick" x="' + f(tx) + '" y="' + f(base + 20 * scale) + '" text-anchor="middle">' + d + "</text>");
    }
    out.push('<text class="ch-axis" x="' + f(W / 2) + '" y="' + f(H - 6) + '" text-anchor="middle">Days to finish</text>');

    // every line drops straight from under its label; the median's stops at the top of the gold bar
    placed.groups.forEach(function (g) {
      var y = topY + LANE * (placed.lanes - 1 - g.lane);
      var end = g.kind === "median" ? base - barHeight(mi) - 3 : base;
      var path = "M" + f(g.x) + " " + (y + 7 * scale) + "V" + f(Math.max(end, y + 9 * scale));
      out.push('<path class="ch-halo" d="' + path + '"/>');
      out.push('<path class="ch-mark ch-mark--' + g.kind + '" d="' + path + '"/>');
      if (g.plan) {
        var left = g.cx - g.w / 2;
        out.push('<path class="ch-diamond" d="M' + f(g.x) + " " + f(base - 6) + 'l6 6l-6 6l-6 -6z"/>');
        out.push('<path class="ch-diamond" d="M' + f(left + 5) + " " + (y - 9.5) + 'l5 5l-5 5l-5 -5z"/>');
        out.push('<text class="ch-label" x="' + f(left + 14) + '" y="' + y + '">' + g.text + "</text>");
      } else {
        out.push('<text class="ch-label" x="' + f(g.cx) + '" y="' + y + '" text-anchor="middle">' + g.text + "</text>");
      }
    });
    return out.join("");
  }

  /* ---------- the page ---------- */

  function boot(doc, win) {
    var html = doc.documentElement;
    var $ = function (id) { return doc.getElementById(id); };
    function setText(el, t) { if (el && el.textContent !== t) el.textContent = t; }

    /* An absent override follows the OS, including changes during the visit. */
    var toggle = $("themeToggle");
    var preference = win.matchMedia("(prefers-color-scheme: dark)");
    var override = html.getAttribute("data-theme");
    function syncToggle() {
      var dark = (override || (preference.matches ? "dark" : "light")) === "dark";
      if (override) html.setAttribute("data-theme", override);
      else html.removeAttribute("data-theme");
      doc.querySelector('meta[name="color-scheme"]').content = override || "light dark";
      Array.prototype.forEach.call(doc.querySelectorAll('meta[name="theme-color"]'), function (meta) {
        meta.content = dark ? "#061325" : "#f0f6fc";
        meta.removeAttribute("media");
      });
      if (toggle) toggle.setAttribute("aria-label", (dark ? "Switch to light theme" : "Switch to dark theme") + (override ? "; returns to system preference when it matches" : "; currently following system"));
    }
    if (toggle) {
      toggle.addEventListener("click", function () {
        var current = override || (preference.matches ? "dark" : "light");
        var next = current === "dark" ? "light" : "dark";
        override = next === (preference.matches ? "dark" : "light") ? null : next;
        try {
          if (override) win.localStorage.setItem("theme", override);
          else win.localStorage.removeItem("theme");
        } catch (e) { /* private mode: the choice lasts the visit */ }
        syncToggle();
      });
    }
    preference.addEventListener("change", syncToggle);
    win.addEventListener("storage", function (e) {
      if (e.key !== "theme" && e.key !== null) return;
      override = e.newValue === "light" || e.newValue === "dark" ? e.newValue : null;
      syncToggle();
    });
    syncToggle();

    /* copy buttons: say "Copied" only when the clipboard took it.
       data-copy holds the text; data-copy-from names the element whose text is copied. */
    function legacyCopy(text) {
      var ta = doc.createElement("textarea");
      var focused = doc.activeElement;
      ta.value = text; ta.setAttribute("readonly", ""); ta.className = "copy__field";
      doc.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = doc.execCommand("copy"); } catch (e) { ok = false; }
      doc.body.removeChild(ta);
      if (focused) focused.focus({ preventScroll: true });
      return ok;
    }
    var lastCopyMessage = "";
    Array.prototype.forEach.call(doc.querySelectorAll(".copy"), function (btn) {
      var lbl = btn.querySelector(".copy__label") || btn;
      var timer = null;
      lbl.removeAttribute("aria-live");
      var feedback = doc.createElement("span");
      feedback.className = "copy__status";
      feedback.setAttribute("role", "status");
      btn.insertAdjacentElement("afterend", feedback);
      function done(ok) {
        var message = ok ? "Copied" : "Copy failed. Select the text and copy it manually.";
        if (message === lastCopyMessage) message += "\u00a0";
        lastCopyMessage = message;
        feedback.textContent = message;
        win.clearTimeout(timer);
        timer = win.setTimeout(function () { feedback.textContent = ""; }, 4000);
      }
      btn.addEventListener("click", function () {
        var from = btn.getAttribute("data-copy-from"), src = from ? $(from) : null;
        var text = src ? src.textContent.trim() : (btn.getAttribute("data-copy") || "");
        var cb = win.navigator && win.navigator.clipboard;
        if (cb && cb.writeText) cb.writeText(text).then(function () { done(true); }, function () { done(legacyCopy(text)); });
        else done(legacyCopy(text));
      });
    });

    /* GitHub stars: fail-silent, shown only once there are enough to be worth a look, and asked
       for at most once a day (the unauthenticated API allows 60 requests an hour per address) */
    (function loadStars() {
      var wrap = $("starWrap"), count = $("starCount"), KEY = "planaco-stars", DAY = 24 * 60 * 60 * 1000;
      if (!wrap || !count) return;
      function show(n) {
        if (typeof n !== "number" || n < STARS_SHOWN_FROM) return;
        count.textContent = n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n);
        wrap.hidden = false;
      }
      function remember(n) {
        try { win.localStorage.setItem(KEY, JSON.stringify({ n: n, t: Date.now() })); } catch (e) { /* no storage: ask again next load */ }
      }
      var saved = null;
      try { saved = JSON.parse(win.localStorage.getItem(KEY)); } catch (e) { saved = null; }
      if (saved && typeof saved.t === "number" && Date.now() - saved.t < DAY && Date.now() >= saved.t) { show(saved.n); return; }
      if (!win.fetch) return;
      win.fetch("https://api.github.com/repos/sepam/planaco").then(function (r) {
        return r.ok ? r.json() : null;
      }).then(function (data) {
        var n = data && typeof data.stargazers_count === "number" ? data.stargazers_count : null;
        remember(n);   // a refusal is remembered too, so a rate-limited visitor is not asked again today
        show(n);
      }).catch(function () { /* offline: the plain link stays */ });
    })();

    /* code tabs: every panel is in the markup and visible without script; here they become tabs */
    (function initTabs() {
      var list = doc.querySelector(".tabs");
      if (!list) return;
      var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
      function select(tab, focus) {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.setAttribute("aria-selected", String(on));
          t.tabIndex = on ? 0 : -1;
          var panel = $(t.getAttribute("aria-controls"));
          if (panel) panel.hidden = !on;
        });
        if (focus) tab.focus();
      }
      list.addEventListener("click", function (e) {
        var tab = e.target.closest('[role="tab"]');
        if (tab) select(tab, true);
      });
      list.addEventListener("keydown", function (e) {
        var i = tabs.indexOf(doc.activeElement), to = -1;
        if (i < 0) return;
        if (e.key === "ArrowRight") to = (i + 1) % tabs.length;
        else if (e.key === "ArrowLeft") to = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === "Home") to = 0;
        else if (e.key === "End") to = tabs.length - 1;
        if (to < 0) return;
        e.preventDefault();
        select(tabs[to], true);
      });
      select(list.querySelector('[aria-selected="true"]') || tabs[0], false);
    })();

    /* the workbench */
    var MC = win.PlanacoMC, host = $("demoControls"), svg = $("demoHist");
    if (!MC || !host || !svg) return;

    var tasks = {}, last = null, ok = true;
    TASKS.forEach(function (t) {
      tasks[t.key] = PARAMS.map(function (p) {
        var input = $(t.key + "-" + p);
        if (!input) { ok = false; return 0; }
        return Number(input.value);
      });
    });
    if (!ok) return;

    /* a number may be shown in more than one place (the headline, a tile, the pinned caption, the phone strip) */
    var outs = {};
    Array.prototype.forEach.call(doc.querySelectorAll("[data-out]"), function (el) {
      var k = el.getAttribute("data-out");
      (outs[k] = outs[k] || []).push(el);
    });

    function syncInputs(key) {
      PARAMS.forEach(function (p, i) {
        var input = $(key + "-" + p), val = tasks[key][i];
        if (Number(input.value) !== val) input.value = String(val);
        input.setAttribute("aria-valuetext", val + (val === 1 ? " day" : " days"));
        setText($(key + "-" + p + "-value"), String(val));
      });
    }

    function draw() {
      if (!last) return;
      var box = svg.getBoundingClientRect();
      var W = Math.round(box.width), H = Math.round(box.height);
      if (W < 40 || H < 40) return;
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      svg.innerHTML = histMarkup(last, W, H, parseFloat(win.getComputedStyle(html).fontSize) / 16);
    }

    /* screen readers hear one sentence once the dragging stops, not every frame of it */
    var status = $("liveStatus"), announce = null;
    function run(quiet) {
      var r = last = compute(MC, tasks), t = texts(r);
      Object.keys(outs).forEach(function (k) { outs[k].forEach(function (el) { setText(el, t[k]); }); });
      TASKS.forEach(function (task) {
        var frac = r.critical[task.key] / r.n;
        setText($("crit-" + task.key), pctText(frac));
        var bar = $("crit-" + task.key + "-bar");
        if (bar) bar.style.setProperty("--share", frac.toFixed(4));
      });
      svg.setAttribute("aria-label", t.chart);
      draw();
      if (quiet || !status) return;
      win.clearTimeout(announce);
      announce = win.setTimeout(function () { setText(status, t.status); }, ANNOUNCE_AFTER_MS);
    }

    var pending = false;
    function schedule() {
      if (pending) return;
      pending = true;
      win.requestAnimationFrame(function () { pending = false; run(false); });
    }

    host.addEventListener("input", function (e) {
      var input = e.target;
      if (!input || input.type !== "range") return;
      var key = input.getAttribute("data-key"), which = Number(input.getAttribute("data-which"));
      if (!tasks[key]) return;
      var triple = tasks[key].slice();
      triple[which] = Number(input.value);
      tasks[key] = MC.clampTriple(triple, which);
      syncInputs(key);
      schedule();
    });

    TASKS.forEach(function (t) {
      PARAMS.forEach(function (p, i) {
        var input = $(t.key + "-" + p);
        input.disabled = false;
        input.setAttribute("aria-label", t.label + " " + PARAM_WORDS[i] + " duration in days");
      });
      syncInputs(t.key);
    });
    run(true);

    /* Where the reader is decides two things, both read from geometry so a jump (an anchor,
       find-in-page, the scrollbar, back and forward) lands in the right state:
       the pinned chart's caption becomes the live headline once the h1 has left the screen,
       and on a narrow screen the strip of numbers shows once the tiles have. Both end with the workbench. */
    var bench = doc.querySelector(".bench"), h1 = doc.querySelector("h1"), tiles = doc.querySelector(".tiles");
    var strip = doc.querySelector(".strip"), readout = doc.querySelector(".readout");
    function place() {
      if (!bench || !h1 || !tiles) return;
      var b = bench.getBoundingClientRect();
      var stripH = strip ? strip.getBoundingClientRect().height : 0;
      if (readout) readout.classList.toggle("is-away", h1.getBoundingClientRect().bottom < 0 && b.bottom > 0);
      if (strip) strip.classList.toggle("is-on", tiles.getBoundingClientRect().bottom < 0 && b.bottom > stripH * 2.5);
    }
    var placing = false;
    function schedulePlace() {
      if (placing) return;
      placing = true;
      win.requestAnimationFrame(function () { placing = false; place(); });
    }
    win.addEventListener("scroll", schedulePlace, { passive: true });
    win.addEventListener("hashchange", schedulePlace);
    win.addEventListener("pageshow", schedulePlace);
    win.addEventListener("resize", function () { schedulePlace(); win.requestAnimationFrame(draw); });
    place();

    if (win.ResizeObserver) {
      var seen = 0;
      new win.ResizeObserver(function (entries) {
        var size = entries[0].contentRect.width + ":" + entries[0].contentRect.height;
        if (size !== seen) { seen = size; win.requestAnimationFrame(draw); }
      }).observe(svg);
    }
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(draw, function () {});
  }

  return { compute: compute, pctText: pctText, texts: texts, histMarkup: histMarkup, boot: boot };
});
