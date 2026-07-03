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
