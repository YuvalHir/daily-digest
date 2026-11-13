import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quoteReference } from '../worker/quote-reference.js';
const session = {
  regularMarketTime: new Date('2026-11-13T17:00Z'),
  currentTradingPeriod: {
    regular: {
      start: new Date('2026-11-13T14:30Z'),
      end: new Date('2026-11-13T21:00Z'),
    },
  },
};
test('equity/index/ETF require the explicit source previousClose', () => {
  for (const instrumentType of ['EQUITY', 'INDEX', 'ETF']) {
    const q = quoteReference({
      ...session,
      instrumentType,
      previousClose: 100,
      regularMarketPrice: 110,
      chartPreviousClose: 20,
    });
    assert.equal(q.referencePrice, 100);
    assert.equal(q.basis, 'previousClose');
    assert.ok(Math.abs(q.percent - 10) < 1e-8);
  }
});
test('missing, zero, negative or invalid previousClose fails closed', () => {
  for (const previousClose of [undefined, null, 0, -10, NaN, Infinity])
    assert.equal(
      quoteReference({
        instrumentType: 'INDEX',
        previousClose,
        regularMarketPrice: 110,
        chartPreviousClose: 100,
      }),
      null,
    );
});
test('no crypto or unsupported-instrument daily/24h guess', () => {
  for (const instrumentType of ['CRYPTOCURRENCY', 'FUTURE', undefined])
    assert.equal(
      quoteReference({
        ...session,
        instrumentType,
        previousClose: 100,
        regularMarketPrice: 110,
        regularMarketChangePercent: 10,
      }),
      null,
    );
});
test('missing or invalid current price cannot produce a quote return', () => {
  for (const regularMarketPrice of [undefined, null, 0, -1, NaN, Infinity])
    assert.equal(
      quoteReference({
        instrumentType: 'EQUITY',
        previousClose: 100,
        regularMarketPrice,
      }),
      null,
    );
});

test('missing or outside regular-session bounds cannot mix after-hours with regular close', () => {
  const base = {
    instrumentType: 'EQUITY',
    previousClose: 100,
    regularMarketPrice: 110,
  };
  assert.equal(quoteReference(base), null);
  assert.equal(
    quoteReference({
      ...base,
      ...session,
      regularMarketTime: new Date('2026-11-13T22:00Z'),
    }),
    null,
  );
  assert.equal(
    quoteReference({
      ...base,
      ...session,
      regularMarketTime: new Date('2026-11-13T13:00Z'),
    }),
    null,
  );
  assert.equal(quoteReference({ ...base, ...session }).session, 'regular');
});

const { cryptoQuoteReference } = await import('../worker/quote-reference.js');
const cryptoMeta = {
  instrumentType: 'CRYPTOCURRENCY',
  symbol: 'BTC-USD',
  regularMarketPrice: 110,
  regularMarketTime: new Date('2026-11-13T20:00:00Z'),
  regularMarketChangePercent: -90,
};
const midnight = Date.parse('2026-11-13T00:00:00Z') / 1000;
const daily = {
  meta: {
    symbol: 'BTC-USD',
    instrumentType: 'CRYPTOCURRENCY',
    exchangeTimezoneName: 'UTC',
    gmtoffset: 0,
    dataGranularity: '1d',
  },
  timestamp: [midnight - 86400, midnight],
  indicators: { quote: [{ close: [100, 110], open: [500, 999] }] },
};
test('BTC percent uses previous completed UTC DAILY close, not rolling percent or open', () => {
  const c = cryptoQuoteReference(cryptoMeta, daily);
  assert.ok(Math.abs(c.percent - 10) < 1e-8);
  assert.equal(c.referencePrice, 100);
  assert.equal(c.referenceAsOf, '2026-11-13T00:00:00.000Z');
  assert.equal(c.basis, 'previousDailyCloseUTC');
});
test('BTC reference fails closed for wrong day, timezone, range, symbol, interval or missing close', () => {
  for (const bad of [
    { ...daily, meta: { ...daily.meta, symbol: 'ETH-USD' } },
    {
      ...daily,
      meta: { ...daily.meta, exchangeTimezoneName: 'America/New_York' },
    },
    { ...daily, meta: { ...daily.meta, gmtoffset: 3600 } },
    { ...daily, meta: { ...daily.meta, dataGranularity: '5m' } },
    { ...daily, timestamp: [midnight - 172800, midnight] },
    { ...daily, timestamp: [midnight - 86400 + 300, midnight] },
    { ...daily, indicators: { quote: [{ close: [null, 110] }] } },
    { ...daily, timestamp: [midnight - 86400, midnight - 86400] },
  ])
    assert.equal(cryptoQuoteReference(cryptoMeta, bad), null);
  assert.equal(
    cryptoQuoteReference(
      { ...cryptoMeta, regularMarketTime: new Date('2026-11-14T00:00Z') },
      daily,
    ),
    null,
  );
});
