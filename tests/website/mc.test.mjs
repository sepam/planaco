import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const MC = require("../../website/assets/mc.js");

// deterministic "random" stream for reproducible sims
function fakeRand(seed = 1) {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
}

test("sampleTriangular stays within [min, max] and hits mode at the CDF break", () => {
  for (let i = 0; i <= 100; i++) {
    const x = MC.sampleTriangular(5, 7, 14, i / 100);
    assert.ok(x >= 5 && x <= 14, `out of bounds: ${x}`);
  }
  const fc = (7 - 5) / (14 - 5);
  assert.ok(Math.abs(MC.sampleTriangular(5, 7, 14, fc) - 7) < 1e-9);
  assert.equal(MC.sampleTriangular(5, 7, 14, 0), 5);
});

test("sampleTriangular is monotone in u", () => {
  let prev = -Infinity;
  for (let i = 0; i <= 50; i++) {
    const x = MC.sampleTriangular(2, 3, 5, i / 50);
    assert.ok(x >= prev); prev = x;
  }
});

test("sampleTriangular degenerate range returns min", () => {
  assert.equal(MC.sampleTriangular(4, 4, 4, 0.7), 4);
});

const TASKS = { design: [5, 7, 14], frontend: [8, 12, 15], backend: [10, 15, 25], testing: [2, 3, 5] };

test("simulate returns n samples inside theoretical bounds", () => {
  const s = MC.simulate(TASKS, 2000, fakeRand());
  assert.equal(s.length, 2000);
  const lo = 5 + Math.max(8, 10) + 2;    // 17
  const hi = 14 + Math.max(15, 25) + 5;  // 44
  for (const x of s) assert.ok(x >= lo && x <= hi, `sample ${x} outside [${lo}, ${hi}]`);
});

test("simulate is deterministic given the same rand stream", () => {
  const a = MC.simulate(TASKS, 100, fakeRand(7));
  const b = MC.simulate(TASKS, 100, fakeRand(7));
  assert.deepEqual(Array.from(a), Array.from(b));
});

test("percentile interpolates linearly on a sorted array", () => {
  const arr = Array.from({ length: 100 }, (_, i) => i + 1); // 1..100
  assert.equal(MC.percentile(arr, 0), 1);
  assert.equal(MC.percentile(arr, 1), 100);
  assert.ok(Math.abs(MC.percentile(arr, 0.5) - 50.5) < 1e-9);
});

test("summarize: counts sum to n, percentiles ordered, modeIndex is tallest bin", () => {
  const s = MC.simulate(TASKS, 10000, fakeRand(3));
  const sum = MC.summarize(s, 26);
  assert.equal(sum.counts.length, 26);
  assert.equal(sum.counts.reduce((a, b) => a + b, 0), 10000);
  assert.ok(sum.p50 <= sum.p85 && sum.p85 <= sum.p95);
  assert.equal(sum.counts[sum.modeIndex], Math.max(...sum.counts));
  assert.ok(sum.min <= sum.p50 && sum.p95 <= sum.max);
});

test("clampTriple: changed slider wins, neighbors follow", () => {
  assert.deepEqual(MC.clampTriple([10, 7, 14], 0), [10, 10, 14]); // min pushed past mode
  assert.deepEqual(MC.clampTriple([5, 20, 14], 1), [5, 20, 20]);  // mode pushed past max
  assert.deepEqual(MC.clampTriple([5, 2, 14], 1), [2, 2, 14]);    // mode pulled below min
  assert.deepEqual(MC.clampTriple([5, 7, 3], 2), [3, 3, 3]);      // max pulled below both
  assert.deepEqual(MC.clampTriple([5, 7, 14], 1), [5, 7, 14]);    // already valid: unchanged
});

// ---------------------------------------------------------------------------
// Engine extensions: seeded PRNG, criticality, naive plan, chanceBy
// ---------------------------------------------------------------------------

test("mulberry32: same seed gives the same stream", () => {
  const a = MC.mulberry32(42), b = MC.mulberry32(42);
  for (let i = 0; i < 1000; i++) assert.equal(a(), b());
});

test("mulberry32: values in [0, 1)", () => {
  const r = MC.mulberry32(123);
  for (let i = 0; i < 10000; i++) {
    const x = r();
    assert.ok(x >= 0 && x < 1, `out of range: ${x}`);
  }
});

test("mulberry32: different seeds give different streams", () => {
  const a = MC.mulberry32(1), b = MC.mulberry32(2);
  const sa = Array.from({ length: 10 }, a), sb = Array.from({ length: 10 }, b);
  assert.notDeepEqual(sa, sb);
});

test("mulberry32: roughly uniform (mean of 10k draws within 0.01 of 0.5)", () => {
  const r = MC.mulberry32(7);
  let sum = 0;
  for (let i = 0; i < 10000; i++) sum += r();
  assert.ok(Math.abs(sum / 10000 - 0.5) < 0.01, `mean ${sum / 10000}`);
});

test("simulateDetailed: samples identical to simulate for the same rand stream", () => {
  const a = MC.simulate(TASKS, 5000, MC.mulberry32(99));
  const d = MC.simulateDetailed(TASKS, 5000, MC.mulberry32(99));
  assert.ok(d.samples instanceof Float64Array);
  assert.equal(d.samples.length, 5000);
  assert.deepEqual(Array.from(d.samples), Array.from(a));
});

test("simulateDetailed: design and testing are critical every run", () => {
  const d = MC.simulateDetailed(TASKS, 3000, MC.mulberry32(5));
  assert.equal(d.critical.design, 3000);
  assert.equal(d.critical.testing, 3000);
});

test("simulateDetailed: backend always longer -> backend n, frontend 0", () => {
  const t = { design: [1, 2, 3], frontend: [2, 3, 4], backend: [10, 12, 15], testing: [1, 1, 2] };
  const d = MC.simulateDetailed(t, 1000, MC.mulberry32(1));
  assert.deepEqual(d.critical, { design: 1000, frontend: 0, backend: 1000, testing: 1000 });
});

test("simulateDetailed: frontend always longer -> frontend n, backend 0", () => {
  const t = { design: [1, 2, 3], frontend: [20, 21, 22], backend: [10, 12, 15], testing: [1, 1, 2] };
  const d = MC.simulateDetailed(t, 1000, MC.mulberry32(1));
  assert.deepEqual(d.critical, { design: 1000, frontend: 1000, backend: 0, testing: 1000 });
});

// Library tie rule (src/planaco/project.py, _get_critical_tasks_for_run):
// a task is critical iff abs(slack) < 1e-9, so when frontend and backend
// durations are equal in a run, BOTH are on the critical path that run.
test("simulateDetailed: exact tie -> both frontend and backend critical (library rule)", () => {
  const t = { design: [5, 5, 5], frontend: [8, 8, 8], backend: [8, 8, 8], testing: [2, 2, 2] };
  const d = MC.simulateDetailed(t, 500, MC.mulberry32(3));
  assert.deepEqual(d.critical, { design: 500, frontend: 500, backend: 500, testing: 500 });
  for (const x of d.samples) assert.equal(x, 15);
});

test("simulateDetailed: frontend + backend >= n (ties count twice), each <= n", () => {
  const d = MC.simulateDetailed(TASKS, 10000, MC.mulberry32(42));
  const { frontend, backend } = d.critical;
  assert.ok(frontend + backend >= 10000);
  assert.ok(frontend <= 10000 && backend <= 10000);
  assert.ok(frontend > 0 && backend > frontend); // backend is the usual bottleneck
});

test("naiveEstimate: sum of modes along the longest branch", () => {
  assert.equal(MC.naiveEstimate(TASKS), 25);
  assert.equal(MC.naiveEstimate({ design: [1, 2, 3], frontend: [5, 9, 10], backend: [1, 4, 6], testing: [1, 1, 1] }), 12);
});

test("chanceBy: fraction of sorted samples <= x, with edges", () => {
  const s = Float64Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(MC.chanceBy(s, 0.5), 0);
  assert.equal(MC.chanceBy(s, 10), 1);
  assert.equal(MC.chanceBy(s, 99), 1);
  assert.equal(MC.chanceBy(s, 5), 0.5);
  assert.equal(MC.chanceBy(s, 5.5), 0.5);
  assert.equal(MC.chanceBy(s, 1), 0.1);
  assert.equal(MC.chanceBy(Float64Array.from([2, 2, 2, 3]), 2), 0.75); // duplicates counted
});

test("chanceBy agrees with a linear scan on simulated data", () => {
  const sum = MC.summarize(MC.simulate(TASKS, 2000, MC.mulberry32(8)), 26);
  for (const x of [17, 20, 25, 28.3, 33, 50]) {
    const expected = Array.from(sum.sorted).filter((v) => v <= x).length / 2000;
    assert.equal(MC.chanceBy(sum.sorted, x), expected);
  }
});

test("summarize also returns the sorted Float64Array", () => {
  const raw = MC.simulate(TASKS, 1000, MC.mulberry32(4));
  const sum = MC.summarize(raw, 26);
  assert.ok(sum.sorted instanceof Float64Array);
  assert.equal(sum.sorted.length, 1000);
  for (let i = 1; i < 1000; i++) assert.ok(sum.sorted[i - 1] <= sum.sorted[i]);
  assert.equal(sum.sorted[0], sum.min);
  assert.equal(sum.sorted[999], sum.max);
});
