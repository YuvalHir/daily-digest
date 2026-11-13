import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chartBars } from '../worker/chart-processing.js';
const make = (times, prices, tz = 'America/New_York') => ({
  meta: { exchangeTimezoneName: tz },
  timestamp: times.map((x) => Date.parse(x) / 1000),
  indicators: { quote: [{ close: prices }] },
});
const old = (r, range) => {
  let b = r.timestamp
    .map((t, i) => ({
      time: new Date(t * 1000).toISOString(),
      value: r.indicators.quote[0].close[i],
    }))
    .filter((x) => Number.isFinite(x.value));
  if (range === '1d') {
    const f = new Intl.DateTimeFormat('en-CA', {
      timeZone: r.meta.exchangeTimezoneName,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const day = f.format(new Date(b.at(-1).time));
    b = b.filter((x) => f.format(new Date(x.time)) === day);
  } else if (range === '1h' || range === '5h') {
    const from = Date.parse(b.at(-1).time) - (range === '1h' ? 1 : 5) * 3600000;
    b = b.filter((x) => Date.parse(x.time) >= from);
  }
  return b;
};
test('optimized selector equals old result over DST, midnight, gaps and missing closes', () => {
  for (const tz of ['America/New_York', 'UTC', 'Asia/Jerusalem'])
    for (const start of [
      '2026-03-06T14:30Z',
      '2026-11-01T00:00Z',
      '2026-11-13T14:30Z',
    ]) {
      const times = Array.from({ length: 1500 }, (_, i) =>
        new Date(Date.parse(start) + i * 300000).toISOString(),
      );
      const prices = times.map((_, i) => (i % 17 === 0 ? null : 100 + i / 100));
      const r = make(times, prices, tz);
      for (const range of ['1h', '5h', '1d', '1mo', '1y'])
        assert.deepEqual(chartBars(r, range), old(r, range));
    }
});
test('optimized selector rejects missing, mismatched and unordered data', () => {
  assert.throws(() =>
    chartBars({ timestamp: [1], indicators: { quote: [{ close: [] }] } }, '1d'),
  );
  assert.throws(() =>
    chartBars(
      { timestamp: [2, 1], indicators: { quote: [{ close: [3, 4] }] } },
      '1h',
    ),
  );
  assert.throws(() =>
    chartBars(
      { timestamp: [1, 2], indicators: { quote: [{ close: [null, null] }] } },
      '1h',
    ),
  );
});
