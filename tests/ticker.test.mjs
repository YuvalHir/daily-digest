import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('context ticker stores symbols only and shares source client, never fetches for animation', async () => {
  const d = JSON.parse(await readFile('public/data/2026-11-13/1715-open.json'));
  assert.ok(d.contextSymbols.includes('^NDX'));
  assert.equal(d.marketRibbon.length, 0);
  const code = await readFile('src/components/TickerRibbon.astro', 'utf8');
  assert.ok(code.includes("quoteData(s, '1d')"));
  assert.ok(code.includes('prefers-reduced-motion'));
  assert.ok(code.includes('q.asOf'));
  assert.ok(code.includes('Older data'));
  assert.ok(!code.includes('Date.now().toISOString'));
  assert.ok(code.includes('aria-hidden'));
  assert.ok(!code.includes('q.changePercent'));
  assert.ok(code.includes("change?.basis === 'previousClose'"));
  assert.ok(code.includes('מול סגירה'));
  assert.ok(code.includes("change.session === 'regular'"));
});
