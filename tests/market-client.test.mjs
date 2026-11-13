import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
const code = stripTypeScriptTypes(
  await readFile('src/lib/market-client.ts', 'utf8'),
);
const m = await import('data:text/javascript,' + encodeURIComponent(code));
test('daily close return stays independent of chart range and requires matching price time', () => {
  const q = {
    price: 110,
    asOf: '2026-11-13T17:00:00Z',
    changePercent: 90,
    quoteChange: {
      percent: 10,
      basis: 'previousClose',
      referencePrice: 100,
      priceType: 'regularMarketPrice',
      session: 'regular',
      priceAsOf: '2026-11-13T17:00:00Z',
    },
  };
  assert.equal(m.dailyChange(q), 10);
  assert.equal(m.dailyChange({ ...q, quoteChange: null }), null);
  assert.equal(
    m.dailyChange({
      ...q,
      quoteChange: { ...q.quoteChange, priceAsOf: '2026-11-12T17:00Z' },
    }),
    null,
  );
});
test('year chart reuses daily price plus percent without another source request', async () => {
  let calls = 0;
  const q = {
    symbol: 'TEST',
    price: 110,
    asOf: '2026-11-13T17:00:00Z',
    range: '1d',
    bars: [
      { time: '2026-11-13T14:30Z', value: 105 },
      { time: '2026-11-13T17:00Z', value: 110 },
    ],
    quoteChange: {
      percent: 10,
      basis: 'previousClose',
      referencePrice: 100,
      priceType: 'regularMarketPrice',
      session: 'regular',
      priceAsOf: '2026-11-13T17:00:00Z',
    },
  };
  const old = globalThis.fetch;
  globalThis.fetch = async () => {
    calls++;
    return { ok: true, json: async () => ({ quotes: { TEST: q } }) };
  };
  try {
    await m.quoteData('TEST', '1d');
    const display = await m.quoteForDisplay('TEST', {
      ...q,
      range: '1y',
      price: 200,
      quoteChange: null,
    });
    assert.equal(display.price, 110);
    assert.equal(m.dailyChange(display), 10);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = old;
  }
});
test('price markers skip initial and unchanged ticks, distinguish rise and fall', () => {
  const classes = new Set(),
    el = {
      offsetWidth: 10,
      classList: {
        remove: (...x) => x.forEach((v) => classes.delete(v)),
        add: (x) => classes.add(x),
      },
    };
  m.flashPrice(el, undefined, 100);
  assert.equal(classes.size, 0);
  m.flashPrice(el, 100, 100);
  assert.equal(classes.size, 0);
  m.flashPrice(el, 100, 101);
  assert.ok(classes.has('price-up'));
  m.flashPrice(el, 101, 100);
  assert.ok(classes.has('price-down'));
  assert.ok(!classes.has('price-up'));
});
test('BTC UTC daily metadata stays separate from regular equities and rolling 24h', () => {
  const q = {
    symbol: 'BTC-USD',
    price: 110,
    asOf: '2026-11-13T23:59:59Z',
    quoteChange: {
      basis: 'previousDailyCloseUTC',
      session: 'utc24h',
      percent: 10,
      referencePrice: 100,
      referenceAsOf: '2026-11-13T00:00Z',
      referenceBarStart: '2026-11-12T00:00Z',
      priceType: 'regularMarketPrice',
      priceAsOf: '2026-11-13T23:59:59Z',
    },
  };
  assert.equal(m.dailyChange(q), 10);
  assert.equal(m.dailyChange({ ...q, symbol: 'MSFT' }), null);
  assert.equal(
    m.dailyChange({
      ...q,
      quoteChange: { ...q.quoteChange, referenceAsOf: '2026-11-12T22:00Z' },
    }),
    null,
  );
  assert.equal(
    m.dailyChange({
      ...q,
      quoteChange: { ...q.quoteChange, basis: 'rolling24h' },
    }),
    null,
  );
  assert.equal(
    m.dailyChange({
      ...q,
      asOf: '2026-11-14T00:00:00Z',
      quoteChange: { ...q.quoteChange, priceAsOf: '2026-11-14T00:00:00Z' },
    }),
    null,
  );
});
