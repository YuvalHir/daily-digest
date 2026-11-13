import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile('worker/index.js', 'utf8');
const day = Math.floor(Date.now() / 86400000) * 86400;
const meta = {
  symbol: 'BTC-USD',
  instrumentType: 'CRYPTOCURRENCY',
  currency: 'USD',
  exchangeTimezoneName: 'UTC',
  gmtoffset: 0,
  dataGranularity: '1d',
  regularMarketTime: new Date((day + 3600) * 1000),
  regularMarketPrice: 110,
};
const daily = {
  meta,
  timestamp: [day - 86400, day],
  indicators: { quote: [{ close: [100, 110] }] },
};
const intraday = {
  meta: { ...meta, dataGranularity: '5m' },
  timestamp: [day + 300, day + 600],
  indicators: { quote: [{ close: [109, 110] }] },
};
async function adapter(chart) {
  const mockKey = '__btcMock' + Math.random().toString().slice(2);
  globalThis[mockKey] = chart;
  const base = new URL('../worker/', import.meta.url);
  const code = source
    .replace(
      "'./chart-processing.js'",
      JSON.stringify(new URL('chart-processing.js', base).href),
    )
    .replace(
      "'./quote-reference.js'",
      JSON.stringify(new URL('quote-reference.js', base).href),
    )
    .replace(
      /import createYahooFinance[^;]+;\nimport chart[^;]+;\nconst YahooFinance[^;]+;/,
      `class YahooFinance { constructor(){this.chart=globalThis.${mockKey};} }`,
    );
  return (await import('data:text/javascript,' + encodeURIComponent(code)))
    .default;
}
test('daily reference shares one additional BTC call across concurrent intraday ranges; daily ranges reuse own bars', async () => {
  let dailyCalls = 0,
    otherCalls = 0;
  const w = await adapter(async (symbol, opts) => {
    assert.equal(symbol, 'BTC-USD');
    if (opts.interval === '1d') {
      dailyCalls++;
      return daily;
    }
    otherCalls++;
    return intraday;
  });
  const env = {};
  const responses = await Promise.all(
    ['1d', '1h', '5h'].map((range) =>
      w.fetch(
        new Request(
          'https://test.invalid/api/market?symbol=BITSTAMP:BTCUSD&range=' +
            range,
        ),
        env,
      ),
    ),
  );
  for (const response of responses) {
    const q = (await response.json()).quotes['BITSTAMP:BTCUSD'];
    assert.ok(Math.abs(q.quoteChange.percent - 10) < 1e-8);
    assert.equal(q.quoteChange.referencePrice, 100);
  }
  assert.equal(dailyCalls, 1);
  assert.equal(otherCalls, 3);
  await w.fetch(
    new Request(
      'https://test.invalid/api/market?symbol=BITSTAMP:BTCUSD&range=1d',
    ),
    env,
  );
  assert.equal(dailyCalls, 1);
  assert.equal(otherCalls, 3);
  await w.fetch(
    new Request(
      'https://test.invalid/api/market?symbol=BITSTAMP:BTCUSD&range=1mo',
    ),
    env,
  );
  assert.equal(dailyCalls, 2);
});
test('failed daily BTC lookup keeps price-only and shares failure instead of retrying', async () => {
  let calls = 0;
  const w = await adapter(async (_symbol, opts) => {
    if (opts.interval === '1d') {
      calls++;
      throw Error('Blocked');
    }
    return intraday;
  });
  for (const range of ['1d', '1h']) {
    const r = await w.fetch(
      new Request(
        'https://test.invalid/api/market?symbol=BITSTAMP:BTCUSD&range=' + range,
      ),
      {},
    );
    assert.equal(r.status, 200);
    const q = (await r.json()).quotes['BITSTAMP:BTCUSD'];
    assert.equal(q.price, 110);
    assert.equal(q.quoteChange, null);
  }
  assert.equal(calls, 1);
});
