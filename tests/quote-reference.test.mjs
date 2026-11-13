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
