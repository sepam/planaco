import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const MC = require('../../website/assets/mc.js');
const site = require('../../website/assets/site.js');
const tasks = { design: [5, 7, 14], frontend: [8, 12, 15], backend: [10, 15, 25], testing: [2, 3, 5] };

test('chart reserves more label space when the text scale increases', () => {
  const result = site.compute(MC, tasks);
  const ordinary = site.histMarkup(result, 408, 640, 1);
  const enlarged = site.histMarkup(result, 408, 640, 2);
  const textPositions = markup => [...markup.matchAll(/<text class="ch-label"[^>]* y="([\d.]+)"/g)].map(m => Number(m[1]));
  assert.ok(Math.max(...textPositions(enlarged)) > Math.max(...textPositions(ordinary)));
  assert.match(enlarged, /P50 28.5/);
  assert.match(enlarged, /P85 33/);
  assert.match(enlarged, /P95 36/);
});

test('chart generation keeps valid geometry across small and enlarged layouts', () => {
  const result = site.compute(MC, tasks);
  for (const [width, height, scale] of [[288, 320, 1], [343, 640, 2], [408, 640, 2], [560, 368, 1]]) {
    const chart = site.histMarkup(result, width, height, scale);
    assert.doesNotMatch(chart, /NaN|Infinity|undefined/);
    for (const match of chart.matchAll(/height="([\d.-]+)"/g)) assert.ok(Number(match[1]) >= 0);
    assert.ok(chart.includes('Days to finish'));
  }
});

test('deterministic estimates still render one bar with enlarged text', () => {
  const certain = site.compute(MC, { design: [5, 5, 5], frontend: [8, 8, 8], backend: [10, 10, 10], testing: [2, 2, 2] });
  const chart = site.histMarkup(certain, 408, 640, 2);
  assert.equal((chart.match(/<rect /g) || []).length, 1);
  assert.match(chart, /Every run 17.0/);
  assert.equal(site.texts(certain).half, 'Every run took the same.');
});
