import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('quote cache has real provider timestamps and finite price series', async () => {
  const d = JSON.parse(await readFile('public/market.json', 'utf8'));
  assert.equal(d.schemaVersion, 1);
  assert.equal(d.refreshMinutes, 15);
  for (const q of Object.values(d.quotes)) {
    if (q.unavailable) continue;
    assert.ok(Number.isFinite(q.price));
    assert.ok(Number.isFinite(q.changePercent));
    assert.ok(q.points.length >= 2);
    assert.ok(q.points.every(Number.isFinite));
    assert.ok(Number.isFinite(Date.parse(q.asOf)));
    assert.ok(Number.isFinite(Date.parse(q.seriesAsOf)));
    assert.match(q.sourceUrl, /^https:\/\/finance.yahoo.com\/quote\//);
    assert.ok(['delayed', 'closed'].includes(q.status));
  }
});
test('production routes do not import mini widget or synthetic fixtures', async () => {
  const s = await readFile('src/components/NewsCard.astro', 'utf8');
  assert.ok(s.includes('NativeQuote'));
  assert.ok(!s.includes('MiniMarketChart'));
  const data = await readFile('public/market.json', 'utf8');
  assert.ok(!data.includes('DMOA'));
});
