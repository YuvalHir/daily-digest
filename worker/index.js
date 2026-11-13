const assets = {
  'NASDAQ:NVDA': ['NVDA', 'Nvidia'],
  'NASDAQ:MSFT': ['MSFT', 'Microsoft'],
  'NASDAQ:AMD': ['AMD', 'AMD'],
  'BITSTAMP:BTCUSD': ['BTC-USD', 'Bitcoin'],
};
const ranges = new Set(['1h', '5h', '1d', '1mo', '1y']);
// Opportunistic in-memory request sharing only. No KV, database, files or price history.
const hot = new Map();
async function collect(key, range) {
  const cacheKey = key + range,
    now = Date.now(),
    old = hot.get(cacheKey);
  if (old && old.expires > now) return old.value;
  const pending = (async () => {
    const [symbol, presetName] = assets[key] || [key, key];
    const interval = range === '1y' || range === '1mo' ? '1d' : '5m';
    const sourceRange = range === '1h' || range === '5h' ? '5d' : range;
    const endpoint = new URL(
      'https://query2.finance.yahoo.com/v8/finance/chart/' +
        encodeURIComponent(symbol),
    );
    endpoint.search = new URLSearchParams({
      range: sourceRange,
      interval,
      includePrePost: 'false',
    }).toString();
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw Error('Source unavailable: ' + response.status);
    const payload = await response.json();
    const result = payload.chart?.result?.[0];
    if (!result || payload.chart?.error) throw Error('No source data');
    const meta = result.meta;
    if (meta.symbol?.toUpperCase() !== symbol.toUpperCase())
      throw Error('Source symbol mismatch');
    const name =
      presetName === symbol
        ? meta.shortName || meta.longName || symbol
        : presetName;
    const closes = result.indicators?.quote?.[0]?.close;
    if (!Array.isArray(result.timestamp) || !Array.isArray(closes))
      throw Error('Invalid source series');
    let bars = [];
    for (let i = 0; i < result.timestamp.length; i++)
      if (Number.isFinite(closes[i]) && Number.isFinite(result.timestamp[i]))
        bars.push({
          time: new Date(result.timestamp[i] * 1000).toISOString(),
          value: closes[i],
        });
    if (!bars.length) throw Error('No source bars');
    if (range === '1h' || range === '5h') {
      const end = Date.parse(bars.at(-1).time),
        from = end - (range === '1h' ? 1 : 5) * 3600000;
      bars = bars.filter((b) => Date.parse(b.time) >= from);
    }
    if (bars.length < 2 || !Number.isFinite(meta.regularMarketPrice))
      throw Error('Insufficient source data');
    const value = {
      symbol,
      name,
      price: meta.regularMarketPrice,
      currency: meta.currency,
      changePercent: (bars.at(-1).value / bars[0].value - 1) * 100,
      changeBasis: 'chartRange',
      asOf: new Date(meta.regularMarketTime * 1000).toISOString(),
      sourceName: 'Yahoo Finance',
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
    await Promise.all(
      selected.map(async (key) => {
        try {
          quotes[key] = await collect(key, range);
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
