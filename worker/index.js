import { chartBars } from './chart-processing.js';
import createYahooFinance from 'yahoo-finance2/createYahooFinance';
import chart from 'yahoo-finance2/modules/chart';
const YahooFinance = createYahooFinance({ modules: { chart } });
const assets = {
  'NASDAQ:NVDA': ['NVDA', 'Nvidia'],
  'NASDAQ:MSFT': ['MSFT', 'Microsoft'],
  'NASDAQ:AMD': ['AMD', 'AMD'],
  'BITSTAMP:BTCUSD': ['BTC-USD', 'Bitcoin'],
};
const ranges = new Set(['1h', '5h', '1d', '1mo', '1y']);
// Opportunistic in-memory request sharing only. No KV, database, files or price history.
const hot = new Map();
async function collect(key, range, yahoo) {
  const cacheKey = key + range,
    now = Date.now(),
    old = hot.get(cacheKey);
  if (old && old.expires > now) return old.value;
  const pending = (async () => {
    const [symbol, presetName] = assets[key] || [key, key];
    const start = new Date(now);
    if (range === '1y') start.setFullYear(start.getFullYear() - 1);
    else if (range === '1mo') start.setMonth(start.getMonth() - 1);
    else start.setDate(start.getDate() - 5);
    const interval = range === '1y' || range === '1mo' ? '1d' : '5m';
    const result = await yahoo.chart(symbol, {
      period1: start,
      interval,
      includePrePost: false,
      return: 'object',
    });
    const meta = result.meta;
    if (meta.symbol?.toUpperCase() !== symbol.toUpperCase())
      throw Error('Source symbol mismatch');
    const name =
      presetName === symbol
        ? meta.shortName || meta.longName || symbol
        : presetName;
    const bars = chartBars(result, range);
    if (bars.length < 2 || !Number.isFinite(meta.regularMarketPrice))
      throw Error('Insufficient source data');
    const value = {
      symbol,
      name,
      price: meta.regularMarketPrice,
      currency: meta.currency,
      changePercent: (bars.at(-1).value / bars[0].value - 1) * 100,
      changeBasis: 'chartRange',
      asOf: meta.regularMarketTime.toISOString(),
      sourceName: 'Yahoo Finance · yahoo-finance2',
      sourceUrl: `https://finance.yahoo.com/quote/${symbol}/`,
      range,
      interval,
      bars,
      points: bars.map((b) => b.value),
      seriesStart: bars[0].time,
      seriesAsOf: bars.at(-1).time,
    };
    if (hot.size >= 64) hot.delete(hot.keys().next().value);
    hot.set(cacheKey, { value, expires: Date.now() + 60000 });
    return value;
  })();
  return pending;
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/market') return env.ASSETS.fetch(request);
    if (request.method !== 'GET')
      return new Response('Method not allowed', { status: 405 });
    for (const [key, entry] of hot)
      if (entry.expires <= Date.now()) hot.delete(key);
    const range = url.searchParams.get('range') || '1d',
      symbol = url.searchParams.get('symbol');
    if (
      !ranges.has(range) ||
      (symbol &&
        !assets[symbol] &&
        !/^[A-Z0-9^][A-Z0-9.^=-]{0,19}$/.test(symbol))
    )
      return Response.json(
        { error: 'Unknown asset or range' },
        { status: 400 },
      );
    const selected = symbol ? [symbol] : Object.keys(assets);
    const quotes = {};
    const yahoo = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
    await Promise.all(
      selected.map(async (key) => {
        try {
          quotes[key] = await collect(key, range, yahoo);
        } catch {
          quotes[key] = { unavailable: true };
        }
      }),
    );
    const ok = Object.values(quotes).some((q) => !q.unavailable);
    return Response.json(
      { schemaVersion: 2, quotes },
      {
        status: ok ? 200 : 503,
        headers: {
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      },
    );
  },
};
